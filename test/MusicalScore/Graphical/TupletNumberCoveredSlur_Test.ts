import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { PointF2D } from "../../../src/Common/DataObjects/PointF2D";

/**
 * A slur from the first note of a tuplet over more notes keeps the tuplet's unbracketed number inside, under its arc
 * and clear of it, also where the number is not in the slur's middle half (Lotti, Pur dicesti, bocca bella, Medium High
 * voice m70, Schirmer edition: the slur from the first triplet's first note to m71 has both 3s under it; the first went
 * over the slur's start). A number at the end of a slur over the tuplet's first notes only stays over the slur
 * (Schumann, Jemand m43). Same as the osmd-dart test/tuplet_number_covered_slur_test.dart.
 */
describe("Tuplet number under a slur over the whole tuplet", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        // the first number sits at 0.18 of the slur, off its middle half (as in osmd-dart)
        container.style.width = "400px";
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_tuplet_number_covered_slur.musicxml"));
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

    it("puts the numbers of a tuplet under a longer slur inside it and a number at a slur's end over it", () => {
        for (const index of [0, 2]) {
            const measure: VexFlowMeasure = osmd.GraphicSheet.MeasureList[index][0] as VexFlowMeasure;
            const inks: any[] = measure.TupletNumberInk;
            expect(inks.length, `m${index + 1} numbers`).to.equal(index === 0 ? 2 : 1);
            for (const ink of inks) {
                expect(ink.above).to.equal(true);
                expect(ink.bracketed).to.equal(false);
                const curves: { lowest: number, highest: number }[] = measure.ParentStaffLine.GraphicalSlurs
                    .filter(s => s.staffEntries[0].parentMeasure === measure)
                    .map(s => curveOver(s, ink.left, ink.right))
                    .filter(c => c !== undefined);
                if (index === 0) {
                    expect(curves.length, `m1: one slur passes over the number at ${ink.left}`).to.equal(1);
                    // inside, clear of the curve (the clearance an ornament under a slur gets, less the 0.1 sampling
                    //   slack layoutFermatasOverSlurs() allows a number inside)
                    expect(ink.top - curves[0].lowest, `m1: slur ${curves[0].lowest} over the number top ${ink.top} at ${ink.left}`)
                        .to.be.greaterThan(GraphicalSlur.ornamentClearance - 0.1);
                } else {
                    // over the slur's end, or (centred on the noteheads, TupletNumberNoteheadSideSlur_Test) just right of it
                    expect(curves.length, `m3: slurs at the number at ${ink.left}`).to.be.at.most(1);
                    for (const curve of curves) {
                        expect(ink.bottom, `m3: number bottom ${ink.bottom} on the slur ${curve.highest}`)
                            .to.be.lessThan(curve.highest - GraphicalSlur.thickness);
                    }
                }
            }
        }
    });
});
