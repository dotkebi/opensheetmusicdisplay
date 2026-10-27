import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { GraphicalInstantaneousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalInstantaneousDynamicExpression";

/**
 * A dynamic beside a tuplet's number keeps clear of it as of what is under it: the bottom line takes the number with
 * VexFlowMeasure.TupletNumberSideClearance on its left and right (VexFlowMusicSheetCalculator.reserveTupletNumberSides()).
 * Stamitz, Flute Concerto Op. 29 m73 (mm. 73–76 of the flute part): the mf at the first note of a triplet whose 3 is under
 * the beam ended just short of the 3 and was placed by the beam, at the 3's height, touching it; it goes under the 3, as in
 * the app (whose mf glyph box reached the 3). Same as the osmd-dart test/tuplet_number_beside_dynamic_test.dart.
 */
describe("Dynamic beside a tuplet number", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    it("puts the mf left of the 3 under the 3 (Stamitz Op. 29 m73)", async () => {
        container = TestUtils.getDivElement(document);
        // before: the mf's box 0.47 short of the 3, beside it at its height
        container.style.width = "1024px";
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_tuplet_number_beside_dynamic.musicxml"));
        osmd.render();
        const measure: VexFlowMeasure = osmd.GraphicSheet.MeasureList[0][0] as VexFlowMeasure;
        const ink: any = measure.TupletNumberInk[0];
        expect(ink.above).to.equal(false);
        const mf: GraphicalInstantaneousDynamicExpression = measure.ParentStaffLine.AbstractExpressions.find(
            expression => expression instanceof GraphicalInstantaneousDynamicExpression) as GraphicalInstantaneousDynamicExpression;
        const box: any = mf.PositionAndShape;
        const right: number = box.RelativePosition.x + box.BorderMarginRight;
        const top: number = box.RelativePosition.y + box.BorderMarginTop;
        expect(right, "the mf left of the 3").to.be.lessThan(ink.left);
        expect(ink.left - right, "the mf beside the 3").to.be.lessThan(VexFlowMeasure.TupletNumberSideClearance + 0.5);
        expect(top, `mf top ${top} under the 3's bottom ${ink.bottom}`).to.be.at.least(ink.bottom - 0.01);
    });
});
