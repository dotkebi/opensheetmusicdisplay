import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { RepetitionInstruction, RepetitionInstructionEnum } from "../../../src/MusicalScore/VoiceData/Instructions/RepetitionInstruction";
import { MusicPartManagerIterator } from "../../../src/MusicalScore/MusicParts/MusicPartManagerIterator";

/**
 * Schirmer, Twenty-Four Italian Songs and Arias, Pur dicesti m111: one <direction> with the words "D.S. al Fine", a <segno/>
 * direction-type and <sound dalsegno>. The print has the sign above the staves at the end of the measure, with the words.
 * Only the first direction-type was read, so the sign was left out.
 *
 * Samples: measures 1-4, the segno of the D.S. in measure 2, "Fine" in 3, the direction above in 4. The first one names the
 * segno (<sound segno="S"> and <sound dalsegno="S">), the second one has no <sound> at all, the third one the sign before the words.
 */
for (const sample of ["test_segno_with_ds_same_direction.musicxml", "test_segno_with_ds_same_direction_unnamed.musicxml",
                       "test_segno_with_ds_same_direction_sign_first.musicxml"]) {
    describe("Segno sign with the D.S. in one direction (" + sample + ")", () => {
        let container: HTMLElement;
        let osmd: OpenSheetMusicDisplay;
        beforeEach(async () => {
            container = TestUtils.getDivElement(document);
            osmd = TestUtils.createOpenSheetMusicDisplay(container);
            await osmd.load(TestUtils.getScore(sample));
            osmd.render();
        });
        afterEach(() => {
            osmd.clear();
            container.remove();
        });

        /** The repetition instructions of a measure, with the segno signs (the ones with a placement). */
        function segnos(measureIndex: number): RepetitionInstruction[] {
            const measure: any = osmd.Sheet.SourceMeasures[measureIndex];
            return [...measure.FirstRepetitionInstructions, ...measure.LastRepetitionInstructions]
                .filter((instruction: RepetitionInstruction) => instruction.type === RepetitionInstructionEnum.Segno);
        }

        it("reads the sign next to the D.S., at the end of the measure", () => {
            const signs: RepetitionInstruction[] = segnos(3);
            expect(signs, "the sign of the D.S. measure").to.have.length(1);
            expect(signs[0].SymbolPlacements.map(p => `${p.staff.idInMusicSheet}@${p.timestamp.RealValue}`)).to.deep.equal(["0@1"]);
            expect(osmd.Sheet.SourceMeasures[3].LastRepetitionInstructions.map(i => i.type))
                .to.include(RepetitionInstructionEnum.DalSegnoAlFine);
            expect(segnos(1), "the segno the D.S. goes back to").to.have.length(1);
        });

        it("draws the D.S. al Fine and the sign in the D.S. measure, and the segno in measure 2", () => {
            const drawn: any[] = (osmd.GraphicSheet.MeasureList[3][0] as any).vfRepetitionWords;
            expect(drawn.filter(repetition => repetition.symbol_type === 4), "segno signs of the D.S. measure").to.have.length(1);
            expect(drawn.filter(repetition => repetition.symbol_type === 11), "the D.S. al Fine").to.have.length(1); // DS_AL_FINE
            const first: any[] = (osmd.GraphicSheet.MeasureList[1][0] as any).vfRepetitionWords;
            expect(first.filter(repetition => repetition.symbol_type === 4)).to.have.length(1);
        });

        it("plays the D.S. back to the segno of measure 2, not to its own sign", () => {
            const measures: number[] = [];
            const iterator: MusicPartManagerIterator = osmd.Sheet.MusicPartManager.getIterator();
            while (!iterator.EndReached) {
                if (iterator.CurrentMeasureIndex !== measures[measures.length - 1] || iterator.JumpOccurred) {
                    measures.push(iterator.CurrentMeasureIndex);
                }
                iterator.moveToNext();
            }
            expect(measures).to.deep.equal([0, 1, 2, 3, 1, 2]);
        });
    });
}
