import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import Vex from "vexflow";

/**
 * A grace note group's arc to its main note keeps clear of the main note's accidental (81sabo glyph contact, 10-28
 * decision R1). The arc is drawn from the two noteheads alone; the accidental between them reaches toward the arc and ran
 * into it:
 * - Goltermann, Cello Concerto No. 3 III m187 (RENDER-0002): three grace notes A3 B3 A3 slurred below to G#3 — the
 *   sharp's lower end crossed the arc.
 * - Sibelius, Violin Concerto III m93 (SIB3C-VIS-pages33_36-014): a stem-down grace A5 slurred (above) to Gb5 — the
 *   flat's stem went through the arc.
 * R1: the ends stay at the noteheads; only the arc's bulge grows, by as much as the arc's inner edge needs to pass the
 * accidental's end on its side by GraceNoteGroup.ACCIDENTAL_CLEARANCE, at most MAX_ACCIDENTAL_LIFT. An arc with no
 * accidental in its way keeps its shape. Same as osmd-dart test/grace_slur_main_note_accidental_test.dart.
 */
describe("Grace note arc over the main note's accidental", () => {
    const score: (clef: string, notes: string) => string = (clef: string, notes: string): string =>
        `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Solo</part-name></score-part></part-list>
<part id="P1"><measure number="1">
<attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>2</beats><beat-type>4</beat-type></time>${clef}</attributes>
${notes}
</measure></part></score-partwise>`;
    const bass: string = "<clef><sign>F</sign><line>4</line></clef>";
    const treble: string = "<clef><sign>G</sign><line>2</line></clef>";
    const graces: string = `
<note><grace slash="yes"/><pitch><step>A</step><octave>3</octave></pitch><voice>1</voice><type>16th</type><stem>down</stem>
<beam number="1">begin</beam><beam number="2">begin</beam><notations><slur type="start" number="2" placement="below"/></notations></note>
<note><grace slash="yes"/><pitch><step>B</step><octave>3</octave></pitch><voice>1</voice><type>16th</type><stem>down</stem>
<beam number="1">continue</beam><beam number="2">continue</beam></note>
<note><grace slash="yes"/><pitch><step>A</step><octave>3</octave></pitch><voice>1</voice><type>16th</type><stem>down</stem>
<beam number="1">end</beam><beam number="2">end</beam></note>`;
    const mainNote: (step: string, alter: number, accidental: string) => string = (step: string, alter: number, accidental: string): string => `
<note><pitch><step>${step}</step>${alter === 0 ? "" : `<alter>${alter}</alter>`}<octave>3</octave></pitch><duration>4</duration><voice>1</voice>
<type>quarter</type>${accidental}<stem>down</stem><notations><slur type="stop" number="2"/></notations></note>
<note><pitch><step>A</step><octave>3</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type><stem>down</stem></note>`;

    /** Goltermann No. 3 III m187: G#3 after the graces A3 B3 A3, slurred below. */
    const goltermann: string = score(bass, graces + mainNote("G", 1, "<accidental>sharp</accidental>"));
    /** Sibelius III m93: the stem-down grace A5 slurred (no placement: above, opposite its stem) to Gb5. */
    const sibelius: string = score(treble, `
<note><grace slash="yes"/><pitch><step>A</step><octave>5</octave></pitch><voice>1</voice><type>16th</type><stem>down</stem>
<notations><slur number="3" type="start"/></notations></note>
<note><pitch><step>G</step><alter>-1</alter><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type>
<accidental>flat</accidental><stem>down</stem><notations><slur number="3" type="stop"/></notations></note>
<note><pitch><step>A</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type><stem>down</stem></note>`);
    /** No accidental: the arc as before. */
    const natural: string = score(bass, graces + mainNote("G", 0, ""));
    /** A flat under an arc below reaches only half a space down: clear already. */
    const flatBelow: string = score(bass, graces + mainNote("G", -1, "<accidental>flat</accidental>"));

    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    async function render(xml: string): Promise<{ main: any, group: any }> {
        container = TestUtils.getDivElement(document);
        container.style.width = "1000px";
        osmd = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
        await osmd.load(xml);
        osmd.render();
        for (const entry of osmd.GraphicSheet.MeasureList[0][0].staffEntries) {
            for (const gve of entry.graphicalVoiceEntries as VexFlowVoiceEntry[]) {
                const note: any = gve.vfStaveNote;
                const group: any = note?.getModifiers().find((m: any) => m.getCategory() === "gracenotegroups");
                if (group) {
                    return { main: note, group };
                }
            }
        }
        throw new Error("no grace note group");
    }

    /** The smallest distance (staff spaces) from the drawn accidental's box end on the arc's side to the drawn arc's
     *  outline, over the accidental's columns; negative when the arc runs through the box. */
    function gap(main: any, direction: number): number {
        const noteGroup: SVGGElement = document.getElementById("vf-" + main.getAttribute("id")) as any;
        const modifiers: Element = Array.from(noteGroup.querySelectorAll("g.vf-modifiers"))[0];
        // the modifiers' own paths (the grace notes, their beams and the arc have their groups): the accidental is the
        //   one next to the notehead (a grace note's slash is farther left)
        const paths: SVGPathElement[] = Array.from(modifiers.children).filter(e => e.tagName === "path") as any;
        const head: number = main.getNoteHeadBeginX();
        const boxes: DOMRect[] = paths.map(path => path.getBBox()).filter(b => b.x + b.width <= head + 0.5);
        expect(boxes.length).to.be.greaterThan(0, "the accidental's path");
        const box: DOMRect = boxes.reduce((a, b) => (a.x + a.width >= b.x + b.width ? a : b));
        const end: number = direction > 0 ? box.y + box.height : box.y;
        const arcGroup: Element = document.getElementById("vf-" + main.getAttribute("id") + "-tie");
        const arc: SVGPathElement = arcGroup.querySelector("path");
        const length: number = arc.getTotalLength();
        let closest: number = Infinity;
        for (let i: number = 0; i <= 2000; i++) {
            const point: DOMPoint = arc.getPointAtLength(length * i / 2000);
            if (point.x < box.x || point.x > box.x + box.width) {
                continue;
            }
            closest = Math.min(closest, direction * (point.y - end));
        }
        expect(closest).to.not.equal(Infinity, "the arc passes the accidental");
        return closest / 10;
    }

    for (const [name, xml, direction] of [
        ["Goltermann III m187: G#3, arc below", goltermann, 1],
        ["Sibelius III m93: Gb5, arc above", sibelius, -1],
    ] as [string, string, number][]) {
        it(`${name} — the arc clears the accidental`, async () => {
            const { main, group } = await render(xml);
            expect(group.slur.direction ?? group.slur.last_note.getStemDirection()).to.equal(direction);
            const clearance: number = (Vex.Flow as any).GraceNoteGroup.ACCIDENTAL_CLEARANCE;
            // the outline's inner edge, sampled along the path
            expect(gap(main, direction)).to.be.greaterThan(clearance - 0.05, `lift ${group.arcLift}`);
            expect(group.arcLift).to.be.greaterThan(0);
            expect(group.arcLift).to.be.at.most(2 * (Vex.Flow as any).GraceNoteGroup.MAX_ACCIDENTAL_LIFT * 10);
        });
    }

    for (const [name, xml] of [
        ["no accidental", natural],
        ["a flat under an arc below", flatBelow],
    ]) {
        it(`${name} — the arc keeps its shape`, async () => {
            const { group } = await render(xml);
            expect(group.slur.direction).to.equal(1);
            expect(group.arcLift).to.equal(0);
        });
    }
});
