import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { CrossStaffCurve } from "../../../src/MusicalScore/Graphical/VexFlow/CrossStaffCurve";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { PointF2D } from "../../../src/Common/DataObjects/PointF2D";

/**
 * Slurs and ties between the two staves of a piano part in one system, one curve each between the placed staves
 * (CrossStaffCurve, PLAN-cross-staff-beam (4)). Same fixture and checks as osmd-dart test/cross_staff_curve_test.dart.
 *
 * Fixture test_cross_staff_curves.musicxml (synthetic, piano, 4/4): m1 a cross-staff beam (LH A3 up, RH D4 F4 A4 down)
 * under a slur from the A3 to the A4, placed below, over a whole note of another voice on the left hand (Myrthen 1
 * m4); m2->m3 a tie from the right hand's B3 to the left hand's (one voice); m4 a slur without placement from the right
 * hand's E5 down to the left hand's C3, its notes between (A2, G2) below the line from end to end.
 */
describe("Curves between staves", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    const load: () => Promise<void> = async () => {
        container = TestUtils.getDivElement(document);
        container.style.width = "1400px";
        osmd = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore("test_cross_staff_curves.musicxml"));
    };
    beforeEach(async () => {
        await load();
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });
    const measureAt: (index: number, staff: number) => VexFlowMeasure =
        (index: number, staff: number) => osmd.GraphicSheet.MeasureList[index][staff] as VexFlowMeasure;
    const curvesStartingIn: (index: number) => CrossStaffCurve[] = (index: number) => {
        const curves: CrossStaffCurve[] = [];
        for (const curve of [...measureAt(index, 0).crossStaffCurves, ...measureAt(index, 1).crossStaffCurves]) {
            if (curves.indexOf(curve) < 0 && curve.startNote.sourceNote.SourceMeasure.measureListIndex === index) {
                curves.push(curve);
            }
        }
        return curves;
    };
    /** the curve's y at x (the sample nearest to it) */
    const yAt: (curve: CrossStaffCurve, x: number) => number = (curve: CrossStaffCurve, x: number) => {
        let best: PointF2D = curve.sample()[0];
        for (const point of curve.sample(64)) {
            if (Math.abs(point.x - x) < Math.abs(best.x - x)) {
                best = point;
            }
        }
        return best.y;
    };

    it("is one system, a curve per slur", () => {
        expect(osmd.GraphicSheet.MusicPages[0].MusicSystems.length).to.equal(1);
        expect(curvesStartingIn(0).length).to.equal(1);
        expect(curvesStartingIn(3).length).to.equal(1);
        // held by both staves' measures it spans
        const slur: CrossStaffCurve = curvesStartingIn(0)[0];
        expect(measureAt(0, 0).crossStaffCurves).to.include(slur);
        expect(measureAt(0, 1).crossStaffCurves).to.include(slur);
    });

    it("a slur under a cross-staff beam: from the left-hand notehead to the right-hand stem, under the beam", () => {
        const curve: CrossStaffCurve = curvesStartingIn(0)[0];
        expect(curve.placement).to.equal(PlacementEnum.Below);
        expect(curve.unclearedObstacles).to.equal(0);
        const beam: any = measureAt(0, 1).crossStaffBeams[0];
        const notes: any[] = beam.notes;
        // the end: the right hand's A4, its down stem reaching the beam
        const a4: any = notes[notes.length - 1];
        expect(curve.endPoint.x).to.be.closeTo(a4.getStemX() / 10, 0.01);
        expect(curve.endPoint.y).to.be.closeTo(a4.getStemExtents().topY / 10 + 0.5, 0.01);
        // the start: under the left hand's A3 notehead
        expect(curve.startPoint.y).to.be.closeTo(notes[0].getYs()[0] / 10 + 1, 0.01);
        // under the beam between them: each stem's end, beam lines under it
        for (const note of notes.slice(1, notes.length - 1)) {
            const x: number = note.getStemX() / 10;
            expect(yAt(curve, x), `under the beam at ${x}`).to.be.greaterThan(note.getStemExtents().topY / 10);
        }
        // not pushed under the left hand's whole note (another voice)
        const lowerTop: number = measureAt(0, 1).ParentStaffLine.PositionAndShape.AbsolutePosition.y;
        const maxY: number = Math.max(...curve.sample().map(p => p.y));
        expect(maxY, "over the D3 whole note (head top 1.5 under the top line)").to.be.lessThan(lowerTop + 1.5);
    });

    it("a slur without placement bows away from its notes between", () => {
        const curve: CrossStaffCurve = curvesStartingIn(3)[0];
        expect(curve.placement).to.equal(PlacementEnum.Above);
        expect(curve.unclearedObstacles).to.equal(0);
    });

    it("draws each curve once per drawing, the same by renderAsync", async () => {
        const curvePaths: (div: HTMLElement) => string[] = (div: HTMLElement) =>
            Array.from(div.querySelectorAll("g.vf-curve path")).map(path => path.getAttribute("d"));
        const sync: string[] = curvePaths(container);
        expect(sync.length, "two slurs").to.equal(2);
        osmd.clear();
        container.remove();
        await load();
        await osmd.renderAsync();
        expect(curvePaths(container)).to.deep.equal(sync);
    });
});
