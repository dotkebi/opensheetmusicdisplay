import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { PointF2D } from "../../../src/Common/DataObjects/PointF2D";

/**
 * A tuplet number and a slur on the same side of the notes (Bellini, Per pietà, bell'idol mio, voice m58, report
 * B14-F01): the number was drawn by VF.Tuplet where the slur passed, which didn't clear it. An unbracketed number goes
 * inside the slur, under its arc (the slur is lifted over it); a bracketed tuplet goes outside the slur, bracket and
 * number (raised over it), as in the Ricordi editions. Same as the osmd-dart test/tuplet_number_slur_test.dart.
 */
describe("Tuplet number and slur", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_tuplet_number_slur.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    /** The slur's inner edge over the ink's columns: its lowest and highest point. */
    function curveOver(slur: GraphicalSlur, left: number, right: number): { lowest: number, highest: number } {
        let lowest: number = -Infinity, highest: number = Infinity;
        for (let i: number = 0; i <= 128; i++) {
            const point: PointF2D = slur.calculateCurvePointAtIndex(i / 128);
            if (point.x < left || point.x > right) {
                continue;
            }
            lowest = Math.max(lowest, point.y);
            highest = Math.min(highest, point.y);
        }
        return { lowest, highest };
    }

    it("puts an unbracketed number under the slur and a bracketed tuplet over it", () => {
        for (const index of [0, 1]) {
            const measure: VexFlowMeasure = osmd.GraphicSheet.MeasureList[index][0] as VexFlowMeasure;
            const inks: any[] = measure.TupletNumberInk;
            expect(inks.length, `m${index + 1} numbers`).to.equal(1);
            const ink: any = inks[0];
            expect(ink.above).to.equal(true);
            expect(ink.bracketed).to.equal(index === 1);
            const slur: GraphicalSlur = measure.ParentStaffLine.GraphicalSlurs.find(
                s => s.staffEntries[0].parentMeasure === measure);
            const curve: { lowest: number, highest: number } = curveOver(slur, ink.left, ink.right);
            expect(curve.lowest, `m${index + 1}: the slur passes over the number`).to.be.greaterThan(-Infinity);
            if (index === 0) {
                expect(curve.lowest, `m1: slur ${curve.lowest} under the number top ${ink.top}`).to.be.lessThan(ink.top);
            } else {
                expect(ink.bottom, `m2: bracket bottom ${ink.bottom} on the slur ${curve.highest}`)
                    .to.be.lessThan(curve.highest - GraphicalSlur.thickness);
            }
        }
    });
});
