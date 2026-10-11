import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { PointF2D } from "../../../src/Common/DataObjects/PointF2D";

/**
 * A slur from the first note of a tuplet to its last keeps the tuplet's unbracketed number inside, under its arc, also
 * when the notes are close (Paisiello, Il mio ben quando verrà, voice m22 and m87; Leo, Dal tuo soglio luminoso, piano
 * m59; Vivaldi, Un certo non so che m24 and m70, Ricordi edition): the number went over the slur's end where it needed
 * a higher arch than a number under another slur may take. A number at the end of a slur over the tuplet's first notes
 * only stays over the slur (Schumann, Jemand m43). Same as the osmd-dart test/tuplet_number_own_slur_test.dart.
 */
describe("Tuplet number under its own slur", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        // narrow: the four slurs of m1 are under 4 units wide (osmd-dart takes 400 px, where its slurs are as wide; its
        //   number is drawn 0.35 lower and in the middle of its slur)
        container.style.width = "500px";
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_tuplet_number_own_slur.musicxml"));
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

    it("puts the number of a slur's own tuplet under it and a number at a slur's end over it", () => {
        for (const index of [0, 1]) {
            const measure: VexFlowMeasure = osmd.GraphicSheet.MeasureList[index][0] as VexFlowMeasure;
            const inks: any[] = measure.TupletNumberInk;
            expect(inks.length, `m${index + 1} numbers`).to.equal(index === 0 ? 4 : 1);
            for (const ink of inks) {
                expect(ink.above).to.equal(true);
                expect(ink.bracketed).to.equal(false);
                const curves: { lowest: number, highest: number }[] = measure.ParentStaffLine.GraphicalSlurs
                    .filter(s => s.staffEntries[0].parentMeasure === measure)
                    .map(s => curveOver(s, ink.left, ink.right))
                    .filter(c => c !== undefined);
                expect(curves.length, `m${index + 1}: one slur passes over the number at ${ink.left}`).to.equal(1);
                const curve: { lowest: number, highest: number } = curves[0];
                if (index === 0) {
                    expect(curve.lowest, `m1: slur ${curve.lowest} under the number top ${ink.top} at ${ink.left}`)
                        .to.be.lessThan(ink.top);
                } else {
                    expect(ink.bottom, `m2: number bottom ${ink.bottom} on the slur ${curve.highest}`)
                        .to.be.lessThan(curve.highest - GraphicalSlur.thickness);
                }
            }
        }
    });
});
