import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { PointF2D } from "../../../src/Common/DataObjects/PointF2D";
import { unitInPixels } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";

/**
 * An unbracketed tuplet number on the noteheads' side of all its notes (under up-stems, over down-stems) goes just outside
 * the staff, 0.2 space from its last (first) line, or 0.4 from the noteheads over (under) it where they go beyond the staff
 * — measured on the number's ink, so that Vexflow 1.2.93 (here) and VexFlow 5 (osmd-dart, whose glyph stands lower on its y)
 * put it at the same place (Leo, Dal tuo soglio luminoso, piano m7, m78, m81, Ricordi edition: the 3 just under the staff,
 * under the noteheads on ledger lines; Schumann, Myrthen 25 m38, Breitkopf: 0.5 under the noteheads). Vexflow put it 2
 * spaces under the staff or under the lowest notehead, the app 0.8 space lower than the web, and its own slur went deep
 * round it. A staccato on the number's side keeps Vexflow's place. Same expectations as the osmd-dart
 * test/tuplet_number_notehead_side_y_test.dart.
 */
describe("Tuplet number height on the noteheads' side", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        container.style.width = "1024px";
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_tuplet_number_notehead_side_y.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    const number: (index: number) => { measure: VexFlowMeasure, ink: any } = (index: number) => {
        const measure: VexFlowMeasure = osmd.GraphicSheet.MeasureList[index][0] as VexFlowMeasure;
        const inks: any[] = measure.TupletNumberInk;
        expect(inks.length, `m${index + 1} numbers`).to.equal(1);
        return { measure, ink: inks[0] };
    };

    it("puts the number just under the staff, its own slur shallow under it (m1)", () => {
        const { measure, ink } = number(0);
        expect(ink.above).to.equal(false);
        expect(ink.top, "m1: the number just under the staff").to.be.closeTo(4.2, 0.02);
        const slurs: GraphicalSlur[] = measure.ParentStaffLine.GraphicalSlurs.filter(s => s.staffEntries[0].parentMeasure === measure);
        expect(slurs.length).to.equal(1);
        let lowest: number = -Infinity;
        for (let i: number = 0; i <= 128; i++) {
            const point: PointF2D = slurs[0].calculateCurvePointAtIndex(i / 128);
            lowest = Math.max(lowest, point.y);
            if (point.x < ink.left || point.x > ink.right) {
                continue;
            }
            expect(point.y - GraphicalSlur.thickness, `m1: the slur under the number at ${point.x}`).to.be.greaterThan(ink.bottom);
        }
        expect(lowest, "m1: the slur close under the number").to.be.lessThan(6.2);
    });

    it("puts the number by the noteheads on ledger lines under the staff (m2)", () => {
        const { ink } = number(1);
        expect(ink.above).to.equal(false);
        // 0.4 under the notehead over the number (B3, y 5.5, its bottom 6)
        expect(ink.top, "m2: the number by the noteheads under the staff").to.be.closeTo(6.4, 0.02);
    });

    it("keeps Vexflow's place under staccatos (m3)", () => {
        const { ink } = number(2);
        expect(ink.above).to.equal(false);
        expect(ink.tuplet.options.y_offset || 0, "m3: a staccato under the notes keeps Vexflow's place").to.equal(0);
        const notes: any[] = ink.tuplet.getNotes();
        const stave: any = notes[0].getStave();
        let staccatos: number = 0;
        for (const note of notes) {
            for (const modifier of note.getModifiers()) {
                if (modifier.getCategory() !== "articulations" || !modifier.drawnInk) {
                    continue;
                }
                staccatos++;
                const bottom: number = (modifier.drawnInk.bottom - stave.getYForLine(0)) / unitInPixels;
                expect(ink.top, "m3: the number under the staccato").to.be.greaterThan(bottom + 0.1);
            }
        }
        expect(staccatos).to.equal(3);
    });

    it("puts the number just over the staff over down-stems (m4)", () => {
        const { ink } = number(3);
        expect(ink.above).to.equal(true);
        expect(ink.bottom, "m4: the number just over the staff").to.be.closeTo(-0.2, 0.02);
    });
});
