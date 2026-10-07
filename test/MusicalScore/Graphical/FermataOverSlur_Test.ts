import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { PointF2D } from "../../../src/Common/DataObjects/PointF2D";

/**
 * A fermata over the last note of a slur above goes over the slur (Torelli, Tu lo sai, piano m38 and m44, solo vocal
 * review E08-F04; Giordani, Caro mio ben m29, E04-F03): the slur ends at the note's stem tip, where the fermata was
 * drawn, so their arcs touched or crossed. A fermata without a slur stays where it was.
 * Same as the osmd-dart test/fermata_over_slur_test.dart.
 */
describe("Fermata over a slur", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_fermata_slur_end.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    it("raises the fermata at the slur's end over the slur, not the one without a slur", () => {
        const m1: VexFlowMeasure = osmd.GraphicSheet.MeasureList[0][0] as VexFlowMeasure;
        const m2: VexFlowMeasure = osmd.GraphicSheet.MeasureList[1][0] as VexFlowMeasure;
        const [ink1] = m1.FermataInk;
        const [ink2] = m2.FermataInk;
        expect(ink1.fermata.slurClearanceYShift, "m1 fermata raise").to.be.lessThan(0);
        expect(ink2.fermata.slurClearanceYShift, "m2 fermata raise").to.equal(0);
        // the raised fermata's bottom is above the slur's curve under it
        const staffLine: StaffLine = m1.ParentStaffLine;
        const slur: any = staffLine.GraphicalSlurs[0];
        const bottom: number = ink1.bottom + ink1.fermata.slurClearanceYShift / 10;
        let curveTop: number = Infinity;
        for (let i: number = 0; i <= 128; i++) {
            const point: PointF2D = slur.calculateCurvePointAtIndex(i / 128);
            if (point.x >= ink1.left && point.x <= ink1.right) {
                curveTop = Math.min(curveTop, point.y);
            }
        }
        expect(bottom, `fermata bottom ${bottom}, slur top ${curveTop}`).to.be.lessThan(curveTop);
    });
});
