import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowPedal } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowPedal";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { TestUtils } from "../../Util/TestUtils";

/**
 * The measure keeps room for the Ped. and * marks of its symbol pedals, and a mark at a time only the other hand plays is
 * drawn at that hand's note (Schumann, Myrthen 24 m14-15, R-24-1). m14: Ped. on the second chord, * at the barline; m15:
 * Ped. on the first chord, * at the right hand's second eighth (q0.5), Ped. at its sixteenth (q0.75), * at the barline.
 * The left hand only plays on the beats. Before, in measures near their minimum width, the * of m14 was moved over the
 * barline, and pushed m15's Ped., whose * went past the q0.5 note and pushed the next Ped. past the q0.75 note.
 * Same as osmd-dart test/pedal_mark_spacing_test.dart.
 */
describe("Pedal mark spacing", () => {
    function rh(step: string, octave: number, duration: number, type: string, chord: boolean = false): string {
        return `<note>${chord ? "<chord/>" : ""}<pitch><step>${step}</step><octave>${octave}</octave></pitch>` +
            `<duration>${duration}</duration><voice>1</voice><type>${type}</type><staff>1</staff></note>`;
    }
    function lh(step: string, octave: number, chord: boolean = false): string {
        return `<note>${chord ? "<chord/>" : ""}<pitch><step>${step}</step><octave>${octave}</octave></pitch>` +
            "<duration>8</duration><voice>5</voice><type>quarter</type><staff>2</staff></note>";
    }
    function pedal(type: string): string {
        return `<direction placement="below"><direction-type><pedal type="${type}" line="no" sign="yes"/></direction-type>` +
            "<staff>2</staff></direction>";
    }
    const backup: string = "<backup><duration>16</duration></backup>";
    // m14: two quarter chords, Ped. on the second, * at the barline
    const m14: string = rh("C", 5, 8, "quarter") + rh("E", 5, 8, "quarter", true) + pedal("start") +
        rh("C", 5, 8, "quarter") + rh("E", 5, 8, "quarter", true) + pedal("stop") + backup +
        lh("A", 2) + lh("E", 3, true) + lh("F", 2) + lh("C", 3, true);
    // m15: Ped. on the eighth chord, * at q0.5, Ped. at q0.75, * at the barline
    const m15: string = pedal("start") + rh("D", 4, 4, "eighth") + rh("D", 5, 4, "eighth", true) + pedal("stop") +
        rh("D", 4, 2, "16th") + pedal("start") + rh("D", 4, 2, "16th") + rh("A", 4, 6, "eighth") + rh("E", 4, 2, "16th") +
        pedal("stop") + backup + lh("B", 2) + lh("F", 3, true) + lh("C", 3) + lh("A", 3, true);
    const pairs: number = 8;
    const measures: string[] = [];
    for (let i: number = 0; i < pairs; i++) {
        measures.push(m14, m15);
    }
    const xml: string = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list>" +
        "<score-part id=\"P1\"><part-name>Piano</part-name></score-part></part-list><part id=\"P1\">" +
        measures.map((m, i) => `<measure number="${i + 1}">` + (i === 0 ?
            "<attributes><divisions>8</divisions><key><fifths>-4</fifths></key><time><beats>2</beats><beat-type>4</beat-type></time>" +
            "<staves>2</staves><clef number=\"1\"><sign>G</sign><line>2</line></clef>" +
            "<clef number=\"2\"><sign>F</sign><line>4</line></clef></attributes>" : "") + m + "</measure>").join("") +
        "</part></score-partwise>";

    async function render(): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        const rules: any = osmd.EngravingRules;
        // 02front / 03app density rules
        rules.VoiceSpacingMultiplierVexflow = 0.85;
        rules.VoiceSpacingAddendVexflow = 3.0;
        await osmd.load(xml);
        osmd.render();
        return osmd;
    }
    function rightHandNoteX(measure: GraphicalMeasure, time: number): number {
        const entry: any = measure.staffEntries.find(se => Math.abs(se.relInMeasureTimestamp.RealValue - time) < 1e-9);
        const gve: VexFlowVoiceEntry = entry?.graphicalVoiceEntries.find((v: any) => v.vfStaveNote) as VexFlowVoiceEntry;
        return gve.vfStaveNote.getAbsoluteX();
    }
    /** the Ped. and * glyphs of the staff line's pedals, [left, right] in VexFlow px, in drawing order */
    function marks(line: StaffLine): [number, number, string][] {
        const result: [number, number, string][] = [];
        for (const p of line.Pedals as VexFlowPedal[]) {
            const marking: any = p.getPedalMarking();
            const point: number = marking.render_options.glyph_point_size;
            const margin: number = marking.render_options.text_margin_right;
            const depressLeft: number = (marking.DepressX ?? p.startNote.getAbsoluteX()) - 10;
            result.push([depressLeft, depressLeft + marking.constructor.depressGlyphWidth(point), `Ped. m${p.startVfVoiceEntry
                .parentStaffEntry.parentMeasure.MeasureNumber}`]);
            const releaseWidth: number = marking.constructor.releaseGlyphWidth(point);
            const releaseLeft: number = marking.EndsStave ?
                (p.endNote.getStave() as any).getNoteEndX() + (marking.endStaveAddedWidth || 0) - margin - releaseWidth :
                (marking.ReleaseX ?? p.endNote.getAbsoluteX()) - 2;
            result.push([releaseLeft, releaseLeft + releaseWidth, `* m${p.endVfVoiceEntry.parentStaffEntry.parentMeasure.MeasureNumber}`]);
        }
        return result.sort((a, b) => a[0] - b[0]);
    }

    it("keeps the * of m14 before its barline and the marks of m15 at the right hand's notes", async () => {
        const osmd: OpenSheetMusicDisplay = await render();
        const systems: any[] = osmd.GraphicSheet.MusicPages.flatMap(page => page.MusicSystems);
        expect(systems.length, "the pairs fill several systems").to.be.greaterThan(1);
        const problems: string[] = [];
        for (const system of systems) {
            const lower: StaffLine = system.StaffLines[1];
            const upper: StaffLine = system.StaffLines[0];
            for (const p of lower.Pedals as VexFlowPedal[]) {
                const measure: GraphicalMeasure = p.startVfVoiceEntry.parentStaffEntry.parentMeasure;
                const number: number = measure.MeasureNumber;
                const upperMeasure: GraphicalMeasure = upper.Measures.find(m => m.MeasureNumber === number);
                if (number % 2 === 1) {
                    if (p.ReleaseAfterDepress) {
                        problems.push(`m${number}: * moved over the barline`);
                    }
                } else if (!p.getPedal.EndsStave) {
                    // the first pedal of m15: Ped. at its note, * at the right hand's q0.5
                    if (p.DepressXOffset) {
                        problems.push(`m${number}: Ped. pushed by ${p.DepressXOffset}`);
                    }
                    const releaseX: number = p.endNote.getAbsoluteX() + (p.ReleaseXOffset ?? 0);
                    if (Math.abs(releaseX - rightHandNoteX(upperMeasure, 1 / 8)) > 0.5) {
                        problems.push(`m${number}: * at ${releaseX}, the q0.5 note at ${rightHandNoteX(upperMeasure, 1 / 8)}`);
                    }
                } else {
                    // the second pedal of m15: Ped. at the right hand's q0.75
                    const depressX: number = p.startNote.getAbsoluteX() + (p.DepressXOffset ?? 0);
                    if (Math.abs(depressX - rightHandNoteX(upperMeasure, 3 / 16)) > 0.5) {
                        problems.push(`m${number}: Ped. at ${depressX}, the q0.75 note at ${rightHandNoteX(upperMeasure, 3 / 16)}`);
                    }
                }
            }
            const drawn: [number, number, string][] = marks(lower);
            for (let i: number = 1; i < drawn.length; i++) {
                if (drawn[i][0] < drawn[i - 1][1] + 6 - 0.01) {
                    problems.push(`${drawn[i - 1][2]} ends at ${drawn[i - 1][1]}, ${drawn[i][2]} starts at ${drawn[i][0]}`);
                }
            }
        }
        expect(problems, problems.join("; ")).to.deep.equal([]);
    });
});
