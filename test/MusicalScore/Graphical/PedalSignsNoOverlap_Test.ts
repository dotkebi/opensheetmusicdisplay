import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowPedal } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowPedal";
import { TestUtils } from "../../Util/TestUtils";

/**
 * The * of a short pedal is drawn a text margin right of its own Ped., not over it (a release one eighth after the
 * Ped.; a Ped. on the last note released at the barline, Schumann, Myrthen 24 m14). The Ped. is drawn at the start note
 * and the * at the end note, or right-aligned before the barline. Same as osmd-dart test/pedal_signs_no_overlap_test.dart.
 */
describe("Pedal signs of a short pedal", () => {
    const note: (step: string, duration: number, type: string) => string = (step: string, duration: number, type: string): string =>
        `<note><pitch><step>${step}</step><octave>3</octave></pitch><duration>${duration}</duration><voice>1</voice>` +
        `<type>${type}</type></note>`;
    const pedal: (type: string) => string = (type: string): string =>
        `<direction placement="below"><direction-type><pedal type="${type}" line="no" sign="yes"/></direction-type></direction>`;
    const xml: string = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list>" +
        "<score-part id=\"P1\"><part-name>Piano</part-name></score-part></part-list><part id=\"P1\">" +
        // released one eighth after the Ped.
        "<measure number=\"1\"><attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time>" +
        "<clef><sign>F</sign><line>4</line></clef></attributes>" + pedal("start") + note("C", 1, "eighth") + pedal("stop") +
        note("D", 1, "eighth") + note("E", 2, "quarter") + note("F", 2, "quarter") + note("G", 2, "quarter") + "</measure>" +
        // Ped. on the last eighth, released at the barline
        "<measure number=\"2\">" + note("C", 2, "quarter") + note("D", 2, "quarter") + note("E", 2, "quarter") +
        note("F", 1, "eighth") + pedal("start") + note("G", 1, "eighth") + pedal("stop") + "</measure>" +
        "<measure number=\"3\">" + note("C", 8, "whole") + "</measure></part></score-partwise>";

    it("keeps each * a text margin right of its own Ped.", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1400px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(xml);
        osmd.render();
        const pedals: VexFlowPedal[] = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0].Pedals as VexFlowPedal[];
        expect(pedals.length).to.equal(2);
        expect(pedals[1].getPedal.EndsStave, "the second pedal is released at the barline").to.equal(true);
        const gaps: string[] = [];
        for (const p of pedals) {
            const marking: any = p.getPedalMarking();
            const margin: number = marking.render_options.text_margin_right;
            const depressRight: number = (marking.DepressX ?? p.startNote.getAbsoluteX()) - 10 +
                marking.constructor.depressGlyphWidth(marking.render_options.glyph_point_size);
            const releaseWidth: number = marking.constructor.releaseGlyphWidth(marking.render_options.glyph_point_size);
            const releaseLeft: number = marking.EndsStave ?
                (p.endNote.getStave() as any).getNoteEndX() + (marking.endStaveAddedWidth || 0) - margin - releaseWidth :
                (marking.ReleaseX ?? p.endNote.getAbsoluteX()) - 2;
            if (releaseLeft - depressRight < margin - 0.01) {
                gaps.push(`measure ${p.startVfVoiceEntry.parentStaffEntry.parentMeasure.MeasureNumber}: Ped. ends at ${depressRight}, ` +
                    `* starts at ${releaseLeft}`);
            }
        }
        expect(gaps, gaps.join("; ")).to.deep.equal([]);
    });
});
