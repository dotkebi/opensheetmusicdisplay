import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { MusicSheet } from "../../../src/MusicalScore/MusicSheet";
import { Tuplet } from "../../../src/MusicalScore/VoiceData/Tuplet";

/**
 * `<tuplet show-number="actual">` written explicitly (music21 writes it when the engraver asks for the number on every
 * group, as Breitkopf prints the Schumann Myrthen triplets — 81sabo review rows M01-D04, M04-D04): the number must stay
 * where EngravingRules.TupletNumberLimitConsecutiveRepetitions (max 2, then disabled for the voice) would hide it.
 * Without the attribute the rule applies as before, and show-number="none" still hides the number.
 * All four fixtures are one voice with four consecutive eighth-note triplets.
 */
describe("Tuplet numbers: explicit show-number=\"actual\" is kept", () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1000px";
        document.body.appendChild(container);
    });
    afterEach(() => {
        container.remove();
    });

    async function load(sample: string, useShowActual: boolean = true): Promise<OpenSheetMusicDisplay> {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.EngravingRules.TupletNumberUseShowActualXMLValue = useShowActual;
        await osmd.load(TestUtils.getScore(sample));
        osmd.render();
        return osmd;
    }

    /** The tuplets of the first voice, in reading order, each once. */
    function tuplets(sheet: MusicSheet): Tuplet[] {
        const result: Tuplet[] = [];
        for (const entry of sheet.Instruments[0].Voices[0].VoiceEntries) {
            const tuplet: Tuplet = entry.Notes[0]?.NoteTuplet;
            if (tuplet && !result.includes(tuplet)) {
                result.push(tuplet);
            }
        }
        return result;
    }

    function rendered(sheet: MusicSheet): boolean[] {
        return tuplets(sheet).map(t => t.RenderTupletNumber);
    }

    it("(a) no show-number: the 3rd and 4th consecutive triplets lose their number", async () => {
        const osmd: OpenSheetMusicDisplay = await load("test_tuplet_show_number_none_given.musicxml");
        expect(tuplets(osmd.Sheet).length).to.equal(4);
        expect(tuplets(osmd.Sheet).map(t => t.ShowNumberActualGivenInXml)).to.deep.equal([false, false, false, false]);
        expect(rendered(osmd.Sheet)).to.deep.equal([true, true, false, false]);
    });

    it("(b) every group show-number=\"actual\": all four numbers are drawn", async () => {
        const osmd: OpenSheetMusicDisplay = await load("test_tuplet_show_number_all_actual.musicxml");
        expect(tuplets(osmd.Sheet).map(t => t.ShowNumberActualGivenInXml)).to.deep.equal([true, true, true, true]);
        expect(rendered(osmd.Sheet)).to.deep.equal([true, true, true, true]);
    });

    it("(c) only the 2nd and 4th group say \"actual\": those two are drawn, the rest follow the rule", async () => {
        const osmd: OpenSheetMusicDisplay = await load("test_tuplet_show_number_two_actual.musicxml");
        expect(tuplets(osmd.Sheet).map(t => t.ShowNumberActualGivenInXml)).to.deep.equal([false, true, false, true]);
        // the explicit groups still count as repetitions: the 3rd is the third consecutive triplet and is hidden
        // as before, the 4th is kept by its attribute
        expect(rendered(osmd.Sheet)).to.deep.equal([true, true, false, true]);
    });

    it("(d) show-number=\"none\" hides the number as before", async () => {
        const osmd: OpenSheetMusicDisplay = await load("test_tuplet_show_number_show_none.musicxml");
        const all: Tuplet[] = tuplets(osmd.Sheet);
        expect(all.map(t => t.ShowNumberNoneGivenInXml)).to.deep.equal([true, true, true, true]);
        expect(all.map(t => t.ShowNumberActualGivenInXml)).to.deep.equal([false, false, false, false]);
        // the draw step (VexFlowMeasure) combines the calculator's decision with the "none" value
        expect(all.map(t => t.RenderTupletNumber && !(t.ShowNumberNoneGivenInXml && osmd.EngravingRules.TupletNumberUseShowNoneXMLValue)))
            .to.deep.equal([false, false, false, false]);
    });

    it("(e) TupletNumberUseShowActualXMLValue=false: (b) behaves like (a)", async () => {
        const osmd: OpenSheetMusicDisplay = await load("test_tuplet_show_number_all_actual.musicxml", false);
        expect(tuplets(osmd.Sheet).map(t => t.ShowNumberActualGivenInXml)).to.deep.equal([true, true, true, true]);
        expect(rendered(osmd.Sheet)).to.deep.equal([true, true, false, false]);
    });
});
