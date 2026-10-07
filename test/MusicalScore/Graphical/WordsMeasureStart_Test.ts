import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";

/**
 * Words above, centered on their note, don't start left of their measure (Monteverdi, Lasciatemi morire!, piano m17
 * "cresc. assai", solo vocal review E06-F01): at the start of a narrow measure the label's left half ran over the
 * barline before it. Same as the osmd-dart test/words_measure_start_test.dart.
 */
describe("Words at the start of a measure", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_words_measure_start.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    it("starts the label right of the measure's barline", () => {
        const m2: GraphicalMeasure = osmd.GraphicSheet.MeasureList[1][0];
        const label: any = m2.ParentStaffLine.AbstractExpressions[0];
        const box: any = label.Label.PositionAndShape;
        const left: number = box.AbsolutePosition.x + box.BorderLeft;
        // clear of the barline (the measure's left edge) by half a unit
        const barline: number = m2.PositionAndShape.AbsolutePosition.x;
        expect(left, `label left ${left}, barline ${barline}`).to.be.at.least(barline + 0.5);
    });
});
