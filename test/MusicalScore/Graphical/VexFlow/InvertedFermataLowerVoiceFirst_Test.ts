import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalStaffEntry } from "../../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { TestUtils } from "../../../Util/TestUtils";

/**
 * Brahms, Erinnerung Op. 63 No. 2, Piano m102: the bass voice's inverted fermata, then a tenor voice above it at the same
 * time. The fermata was moved to the tenor voice (the staff entry's last), which then left it to the bass voice, still
 * holding it and further down: no fermata at all. It stays under the bass voice. Same place as osmd-dart.
 */
describe("Inverted fermata of a voice below the last voice", () => {
    it("draws the inverted fermata once, under the bass voice", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "800px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore("test_inverted_fermata_lower_voice_first.musicxml"));
        osmd.render();
        const measure: any = osmd.GraphicSheet.MeasureList[0][1]; // the lower staff
        const entry: GraphicalStaffEntry = measure.staffEntries[0];
        expect(entry.graphicalVoiceEntries.length, "two voices").to.equal(2);
        const withFermata: VexFlowVoiceEntry[] = entry.graphicalVoiceEntries.filter(gve =>
            ((gve as VexFlowVoiceEntry).vfStaveNote as any)?.getModifiers?.().some((m: any) => m.getCategory() === "articulations" && m.type === "a@u")
        ) as VexFlowVoiceEntry[];
        expect(withFermata.length, "one inverted fermata").to.equal(1);
        expect(withFermata[0].parentVoiceEntry.ParentVoice.VoiceId, "the bass voice").to.equal(3);
    });
});
