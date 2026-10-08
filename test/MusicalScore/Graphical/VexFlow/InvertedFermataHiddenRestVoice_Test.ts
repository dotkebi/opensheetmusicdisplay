import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalStaffEntry } from "../../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { TestUtils } from "../../../Util/TestUtils";

/**
 * Parisotti, Traetta Ombra cara amorosa Piano m11 (renderer leftovers 2, 2-2 P25-S1): the upper voice's chord has an
 * inverted fermata and the lower voice's entry at that time is a hidden rest. The fermata was pushed to the staff entry's
 * last voice entry (the hidden rest) and never drawn. It stays with a printed note.
 * Same as osmd-dart test/inverted_fermata_hidden_rest_voice_test.dart.
 */
describe("Inverted fermata with a hidden rest in the other voice", () => {
    it("draws the inverted fermata under the chord, not on the hidden rest", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "800px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore("test_inverted_fermata_hidden_rest_voice.musicxml"));
        osmd.render();
        const measure: any = osmd.GraphicSheet.MeasureList[0][0];
        const entry: GraphicalStaffEntry = measure.staffEntries[1]; // the half-note chord at the second beat
        expect(entry.graphicalVoiceEntries.length, "two voices at the chord").to.equal(2);
        const withFermata: VexFlowVoiceEntry[] = entry.graphicalVoiceEntries.filter(gve =>
            ((gve as VexFlowVoiceEntry).vfStaveNote as any)?.getModifiers?.().some((m: any) => m.getCategory() === "articulations" && m.type === "a@u")
        ) as VexFlowVoiceEntry[];
        expect(withFermata.length, "one inverted fermata").to.equal(1);
        const note: any = withFermata[0].vfStaveNote;
        // (VexFlow 1.2.93 isRest() is the glyph's rest flag: undefined for a note)
        expect(!!note.isRest(), "on the chord, not on the hidden rest").to.equal(false);
        expect(withFermata[0].notes.every(n => n.sourceNote.PrintObject), "on a printed note").to.equal(true);
    });
});
