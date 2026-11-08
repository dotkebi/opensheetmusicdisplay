import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { TestUtils } from "../../../Util/TestUtils";

/**
 * <notehead filled="no|yes">normal</notehead> (Schubert/Reger Gretchen am Spinnrade m114: an open eighth head; Bassi
 * Rigoletto fantasia clarinet m36: a black half head). VexFlow chooses the head from the duration, so the converter asks
 * for the fill-specific head (VexFlowPatch tables.js N1 open, N2 black) only when the XML fill differs from the
 * duration's head. Same as osmd-dart test/notehead_filled_test.dart.
 */
describe("Notehead filled attribute", () => {
    it("draws the XML fill of a normal notehead", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "800px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore("test_notehead_filled.musicxml"));
        osmd.render();
        const head: (m: number, e: number) => string = (m: number, e: number): string =>
            ((osmd.GraphicSheet.MeasureList[m][0].staffEntries[e].graphicalVoiceEntries[0] as VexFlowVoiceEntry).vfStaveNote as any)
                .note_heads[0].glyph_code;
        const openHead: string = head(1, 0); // plain half
        const blackHead: string = head(1, 1); // plain quarter
        expect(openHead).to.not.equal(blackHead);
        expect(head(0, 0), "eighth with filled=\"no\"").to.equal(openHead);
        expect(head(0, 1), "plain eighth").to.equal(blackHead);
        expect(head(0, 2), "half with filled=\"yes\"").to.equal(blackHead);
        expect(head(0, 3), "quarter with filled=\"yes\"").to.equal(blackHead);
        expect(head(1, 2), "quarter with filled=\"no\"").to.equal(openHead);
    });
});
