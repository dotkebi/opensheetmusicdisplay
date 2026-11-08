import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { RepetitionInstructionEnum } from "../../../src/MusicalScore/VoiceData/Instructions/RepetitionInstruction";

/**
 * A segno that only a <sound segno> of the measure marks, the D.S. of each trio of a minuet back to it, and a Fine and a D.C.
 * that one part writes only as a <sound> of the measure and another as words (as osmd-dart).
 */
describe("Jumps of a <sound> of the measure", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    async function render(file: string): Promise<void> {
        await osmd.load(TestUtils.getScore(file));
        osmd.render();
    }
    beforeEach(() => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    function playedMeasures(): number[] {
        const iterator: any = osmd.cursor.Iterator;
        const measures: number[] = [];
        let steps: number = 0;
        while (!iterator.EndReached && steps++ < 10000) {
            const index: number = iterator.CurrentMeasureIndex;
            if (measures.length === 0 || measures[measures.length - 1] !== index || iterator.BackJumpOccurred || iterator.ForwardJumpOccurred) {
                measures.push(index);
            }
            iterator.moveToNext();
        }
        return measures;
    }

    /** The texts of the repetition instructions drawn in each measure, on all staves. */
    function drawn(): Map<number, string[]> {
        const result: Map<number, string[]> = new Map();
        osmd.GraphicSheet.MeasureList.forEach((measures, index) => {
            for (const measure of measures) {
                for (const repetition of ((measure as any)?.vfRepetitionWords ?? [])) {
                    result.set(index, [...(result.get(index) ?? []), repetition.text ?? String(repetition.symbol_type)]);
                }
            }
        });
        return result;
    }

    /**
     * test_repeat_minuet_two_trios_sound_segno.musicxml: Menuetto (pickup bar "1" with <sound segno="menuetto"/>, 2, 3),
     * Trio 1 (1, 2: "Menuet Da Capo." with <sound dalsegno="menuetto"/>), Trio 2 (pickup bar "1", 2: "Menuetto. Da Capo." with
     * the same sound) — Sperger, Sonata for Violone and Basso III.
     */
    it("goes back to the minuet from each trio and draws no segno", async () => {
        await render("test_repeat_minuet_two_trios_sound_segno.musicxml");
        expect(playedMeasures()).to.deep.equal([0, 1, 2, 3, 4, 0, 1, 2, 5, 6, 0, 1, 2]);
        const texts: string[] = Array.from(drawn().values()).flat();
        expect(texts.filter(text => !text.includes("Capo")), "only the words of the score").to.deep.equal([]);
        const segnos: any[] = osmd.Sheet.SourceMeasures.flatMap(measure =>
            measure.FirstRepetitionInstructions.filter(instruction => instruction.type === RepetitionInstructionEnum.Segno));
        expect(segnos.length).to.be.greaterThan(0);
        expect(segnos.every(segno => segno.Implicit), "not drawn").to.equal(true);
    });

    /**
     * test_repeat_fine_sound_words_two_parts.musicxml: Canto with <sound fine> at the start of bar 2 and <sound dacapo> in bar
     * 4, both of the measure; Continuo with "(Fine.)" and "Da Capo." and the same sounds — Handel, Care selve, full score.
     */
    it("draws the Fine and the D.C. once, as written", async () => {
        await render("test_repeat_fine_sound_words_two_parts.musicxml");
        const texts: Map<number, string[]> = drawn();
        expect(texts.get(1)).to.deep.equal(["(Fine.)"]);
        expect(texts.get(3)).to.deep.equal(["Da Capo."]);
        expect(Array.from(texts.keys()).sort()).to.deep.equal([1, 3]);
        const fonts: string[] = osmd.GraphicSheet.MeasureList.flat().flatMap(measure =>
            ((measure as any)?.vfRepetitionWords ?? []).map(repetition => repetition.font.weight));
        expect(fonts, "in the weight and style the score writes them").to.deep.equal(["normal", "normal"]);
        expect(playedMeasures()).to.deep.equal([0, 1, 2, 3, 0, 1]);
    });
});
