import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { PointF2D } from "../../../src/Common/DataObjects/PointF2D";

/**
 * A tuplet number that goes over a slur on the tuplet's first two notes stays under a slur over the whole tuplet, which
 * lifts on over it (Lotti, Pur dicesti, o bocca bella, voice m69 and m163, Ricordi edition: the first 3 between the slur
 * on C sharp–D and the slur over both triplets); it went over both slurs. A number at the end of a slur over the
 * tuplet's first notes only stays over the slur (Schumann, Jemand m43). Same as the osmd-dart
 * test/tuplet_number_between_slurs_test.dart.
 */
describe("Tuplet number between a short slur and a slur over its tuplet", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        container.style.width = "600px";
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_tuplet_number_between_slurs.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    /** The slur's inner edge over the ink's columns: its lowest and highest point (undefined when it doesn't reach). */
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
        return lowest === -Infinity ? undefined : { lowest, highest };
    }

    it("puts the first number over the short slur and under the slur over the tuplet", () => {
        const m1: VexFlowMeasure = osmd.GraphicSheet.MeasureList[0][0] as VexFlowMeasure;
        const slurs: GraphicalSlur[] = m1.ParentStaffLine.GraphicalSlurs.filter(s => s.staffEntries[0].parentMeasure === m1);
        const long: GraphicalSlur = slurs.find(s => s.staffEntries.length === 6);
        const short: GraphicalSlur = slurs.find(s => s.staffEntries.length === 2);
        const inks: any[] = m1.TupletNumberInk;
        expect(inks.length).to.equal(2);
        inks.forEach((ink, index) => {
            const under: { lowest: number, highest: number } = curveOver(long, ink.left, ink.right);
            expect(ink.top - under.lowest, `m1 number ${index + 1}: the long slur ${under.lowest} over the number top ${ink.top}`)
                .to.be.greaterThan(GraphicalSlur.ornamentClearance - 0.05);
        });
        const below: { lowest: number, highest: number } = curveOver(short, inks[0].left, inks[0].right);
        expect(inks[0].bottom, `m1: the first number ${inks[0].bottom} over the short slur ${below.highest}`)
            .to.be.lessThan(below.highest - GraphicalSlur.thickness);
        // m2: a slur over the first two notes only: the number over its end
        const m2: VexFlowMeasure = osmd.GraphicSheet.MeasureList[1][0] as VexFlowMeasure;
        const m2Ink: any = m2.TupletNumberInk[0];
        const curves: { lowest: number, highest: number }[] = m2.ParentStaffLine.GraphicalSlurs
            .filter(s => s.staffEntries[0].parentMeasure === m2)
            .map(s => curveOver(s, m2Ink.left, m2Ink.right))
            .filter(c => c !== undefined);
        expect(curves.length).to.equal(1);
        expect(m2Ink.bottom, `m2: number bottom ${m2Ink.bottom} on the slur ${curves[0].highest}`)
            .to.be.lessThan(curves[0].highest - GraphicalSlur.thickness);
    });
});
