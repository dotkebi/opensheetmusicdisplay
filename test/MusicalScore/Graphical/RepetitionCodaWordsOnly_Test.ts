import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";

/**
 * test_repeat_coda_words_only.musicxml has the section heading "CODA." as words above measure 2, and no coda sign
 * (Schumann, Romance Op. 94 III m69, integrated review R163-U07). It is drawn as written: the words, without a coda sign.
 */
describe("A coda written only as words", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_repeat_coda_words_only.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    it("is drawn as its words, without the label \"Coda\" and the coda sign", () => {
        const texts: string[] = Array.from(container.querySelectorAll("text")).map(element => element.textContent);
        expect(texts.filter(text => text === "CODA.").length, "the words").to.equal(1);
        expect(texts.filter(text => text === "Coda").length, "the label").to.equal(0);
        const repetitionWords: any[] = (osmd.GraphicSheet.MeasureList[1][0] as any).vfRepetitionWords;
        expect(repetitionWords.length).to.equal(1);
        expect(repetitionWords[0].text, "drawn instead of the label and the coda sign").to.equal("CODA.");
    });
});
