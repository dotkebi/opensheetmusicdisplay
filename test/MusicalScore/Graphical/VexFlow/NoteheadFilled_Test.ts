import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { TestUtils } from "../../../Util/TestUtils";

/**
 * <notehead filled="no|yes">normal</notehead> is ignored: the head of the duration is drawn. An open head on a quarter
 * note or shorter, or a black head on a half note, isn't a head of common notation. Exporters write it for a unison of
 * two voices sharing one head (Dichterliebe01 m26, left hand: a 16th C#3 filled="no" on a half note C#3), but a white
 * and a black head aren't merged into one: each note keeps its own head, side by side as for any unison of a half note
 * and a shorter note (decision 2026-11-11). Same as osmd-dart test/notehead_filled_test.dart.
 */
describe("Notehead filled attribute", () => {
    async function render(file: string): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore(file));
        osmd.render();
        return osmd;
    }
    function voiceEntry(osmd: OpenSheetMusicDisplay, m: number, e: number, v: number = 0): VexFlowVoiceEntry {
        return osmd.GraphicSheet.MeasureList[m][0].staffEntries[e].graphicalVoiceEntries[v] as VexFlowVoiceEntry;
    }
    function glyph(gve: VexFlowVoiceEntry): string {
        return (gve.vfStaveNote as any).note_heads[0].glyph_code;
    }
    function headX(gve: VexFlowVoiceEntry): number {
        return (gve.vfStaveNote as any).note_heads[0].getAbsoluteX();
    }

    it("draws the head of the duration", async () => {
        const osmd: OpenSheetMusicDisplay = await render("test_notehead_filled.musicxml");
        const head: (m: number, e: number) => string = (m: number, e: number): string => glyph(voiceEntry(osmd, m, e));
        const openHead: string = head(1, 0); // plain half
        const blackHead: string = head(1, 1); // plain quarter
        expect(openHead).to.not.equal(blackHead);
        expect(head(0, 0), "eighth with filled=\"no\"").to.equal(blackHead);
        expect(head(0, 1), "plain eighth").to.equal(blackHead);
        expect(head(0, 2), "half with filled=\"yes\"").to.equal(openHead);
        expect(head(0, 3), "quarter with filled=\"yes\"").to.equal(blackHead);
        expect(head(1, 2), "quarter with filled=\"no\"").to.equal(blackHead);
    });

    it("keeps a white and a black head of a unison apart", async () => {
        const osmd: OpenSheetMusicDisplay = await render("test_notehead_filled_shared_unison.musicxml");
        // m1: 16th C#3 filled="no" (voice 1) and half note C#3 (voice 2)
        const sixteenth: VexFlowVoiceEntry = voiceEntry(osmd, 0, 0, 0);
        const half: VexFlowVoiceEntry = voiceEntry(osmd, 0, 0, 1);
        expect(glyph(sixteenth), "the 16th draws its own black head").to.not.equal(glyph(half));
        expect(Math.abs(headX(sixteenth) - headX(half)), "beside the half note's head").to.be.greaterThan(1);
        // m2: half note G3 filled="yes" (voice 1) and quarter G3 (voice 2)
        const blackHalf: VexFlowVoiceEntry = voiceEntry(osmd, 1, 0, 0);
        const quarter: VexFlowVoiceEntry = voiceEntry(osmd, 1, 0, 1);
        expect(glyph(blackHalf), "the half note draws its own open head").to.not.equal(glyph(quarter));
        expect(Math.abs(headX(blackHalf) - headX(quarter))).to.be.greaterThan(1);
    });
});
