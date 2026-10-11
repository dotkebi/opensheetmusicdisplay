import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";

/**
 * test_repeat_sound_jump_sections.musicxml: "FIN." with <sound tocoda>, "D.C." with <sound dalsegno> back to the segno of its
 * section, a segno with a name no D.S. gives at the D.C. barline of measure 4, and a <sound coda> of measures 5 and 9
 * (Arban, Fantaisie brillante, cornet). The words are drawn as written, the segnos where they are, the codas not at all.
 */
describe("Jump words with a <sound> that names another instruction", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_repeat_sound_jump_sections.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    /** The texts of the repetition instructions drawn in a measure (a segno as its glyph's text). */
    function repetitionTexts(measureIndex: number): string[] {
        return ((osmd.GraphicSheet.MeasureList[measureIndex][0] as any).vfRepetitionWords as any[]).map(repetition => repetition.text);
    }

    it("draws the words as written, and no D.S. or To Coda label", () => {
        const texts: string[] = Array.from(container.querySelectorAll("text")).map(element => element.textContent);
        expect(texts.filter(text => text === "D.C.").length, "the D.C. words").to.equal(2);
        expect(texts.filter(text => text === "FIN.").length, "the FIN. words").to.equal(2);
        expect(texts.filter(text => text === "D.S." || text.startsWith("To ")).length, "no label").to.equal(0);
        expect(repetitionTexts(2)).to.deep.equal(["FIN."]);
    });

    it("draws the segno of the D.C. barline and nothing for a <sound coda>", () => {
        expect(repetitionTexts(3).length, "the segno and the D.C.").to.equal(2);
        expect(repetitionTexts(3)).to.contain("D.C.");
        expect(repetitionTexts(4), "the coda of the measure prints nothing").to.deep.equal([]);
        expect(repetitionTexts(8)).to.deep.equal([]);
        expect(osmd.Sheet.SourceMeasures[4].printNewSystemXml, "starts no new system").to.not.equal(true);
    });
});
