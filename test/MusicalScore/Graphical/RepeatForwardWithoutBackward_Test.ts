import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { MusicPartManagerIterator } from "../../../src/MusicalScore/MusicParts/MusicPartManagerIterator";
import { SourceMeasure } from "../../../src/MusicalScore/VoiceData/SourceMeasure";

/**
 * A forward repeat without a backward repeat is repeated until the end of the piece (RepetitionCalculator),
 * with a backward jump the calculator adds at the last measure. That jump used to be drawn as a backward repeat barline
 * the score doesn't have (Couperin, Concerts royaux I, Gavotte: the forward repeat of the second ending in measure 5).
 *
 * Sample: measure 1 ends with a backward repeat, measure 2 begins with a forward repeat that no backward repeat closes,
 * measure 3 ends with a light-heavy barline.
 */
describe("Forward repeat without a backward repeat", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_repeat_forward_without_backward_final_barline.musicxml"));
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    it("draws no backward repeat barline at the end of the piece", () => {
        osmd.render();
        const last: SourceMeasure = osmd.Sheet.SourceMeasures[2];
        expect(last.endsWithLineRepetition()).to.equal(false);
        expect(osmd.GraphicSheet.MeasureList[2][0].endsWithLineRepetition()).to.equal(false);
        // the forward repeat that is in the score is still drawn
        expect(osmd.Sheet.SourceMeasures[1].beginsWithLineRepetition()).to.equal(true);
    });

    it("still plays the repeat until the end of the piece", () => {
        const measures: number[] = [];
        const iterator: MusicPartManagerIterator = osmd.Sheet.MusicPartManager.getIterator();
        while (!iterator.EndReached) {
            if (iterator.CurrentMeasureIndex !== measures[measures.length - 1] || iterator.JumpOccurred) {
                measures.push(iterator.CurrentMeasureIndex);
            }
            iterator.moveToNext();
        }
        expect(measures).to.deep.equal([0, 0, 1, 2, 1, 2]);
    });
});
