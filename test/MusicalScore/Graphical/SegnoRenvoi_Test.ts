import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { RepetitionInstruction, RepetitionInstructionEnum } from "../../../src/MusicalScore/VoiceData/Instructions/RepetitionInstruction";
import { MusicPartManagerIterator } from "../../../src/MusicalScore/MusicParts/MusicPartManagerIterator";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";

/**
 * Couperin, Concerts royaux I Gigue m31 (1722 source): a segno below each staff at the end of the first ending
 * (an <offset> of a whole measure) sends back to the segno of the Reprise, which is also where the backward repeat
 * goes. The second segno was made a D.S. at the end of the measure before: drawn as "D.S." above m30, and the
 * playback left out the repeat of the Reprise.
 */
describe("Renvoi segno at the end of a first ending", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_segno_renvoi_first_ending.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    it("is the sign of the repeat, below each staff at the end of the measure", () => {
        const instructions: RepetitionInstruction[] = osmd.Sheet.SourceMeasures.flatMap(m =>
            [...m.FirstRepetitionInstructions, ...m.LastRepetitionInstructions]);
        expect(instructions.filter(i => i.type === RepetitionInstructionEnum.DalSegno)).to.have.length(0);
        const repeat: RepetitionInstruction = osmd.Sheet.SourceMeasures[2].LastRepetitionInstructions
            .find(i => i.type === RepetitionInstructionEnum.BackJumpLine);
        expect(repeat.SymbolPlacements.map(p => `${p.staff.idInMusicSheet}@${p.timestamp.toString()}/${p.below}`))
            .to.deep.equal(["0@3/4/true", "1@3/4/true"]);
    });

    it("plays the repeat once, then the second ending", () => {
        const measures: number[] = [];
        const iterator: MusicPartManagerIterator = osmd.Sheet.MusicPartManager.getIterator();
        while (!iterator.EndReached) {
            if (iterator.CurrentMeasureIndex !== measures[measures.length - 1] || iterator.JumpOccurred) {
                measures.push(iterator.CurrentMeasureIndex);
            }
            iterator.moveToNext();
        }
        expect(measures).to.deep.equal([0, 1, 2, 1, 3]);
    });

    it("draws a segno below each staff before the end barline, and no D.S.", () => {
        const measures: GraphicalMeasure[] = osmd.GraphicSheet.MeasureList[2];
        for (const measure of measures) {
            const repetitions: any[] = (measure as any).vfRepetitionWords;
            expect(repetitions, `staff ${measure.ParentStaff.idInMusicSheet}`).to.have.length(1);
            expect(repetitions[0].anchorX).to.be.lessThan(measure.PositionAndShape.Size.width - 1.6);
        }
        for (const column of osmd.GraphicSheet.MeasureList) {
            for (const measure of column) {
                for (const repetition of (measure as any).vfRepetitionWords) {
                    expect(repetition.symbol_type, `m${measure.MeasureNumber}`).to.equal(4); // SEGNO_LEFT
                }
            }
        }
    });
});
