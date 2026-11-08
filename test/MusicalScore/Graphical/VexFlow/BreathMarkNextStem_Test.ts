import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { TestUtils } from "../../../Util/TestUtils";

/**
 * Berwald, Konzertstück Op.2 m92: a breath mark after E3, 80 % of the way to the next note, a high G4 with its stem down,
 * was drawn on that stem, where it read as a dot (VexFlowPatch articulation.js keeps it left of the next notes' stems).
 */
describe("Breath mark before a stem-down note", () => {
    it("stays off the next note's stem", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "600px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore("test_breath_mark_next_stem.musicxml"));
        osmd.render();
        const measure: any = osmd.GraphicSheet.MeasureList[0][0];
        const note: (i: number) => any = (i: number): any => (measure.staffEntries[i].graphicalVoiceEntries[0] as VexFlowVoiceEntry).vfStaveNote;
        const breath: any = note(1).getModifiers().find((m: any) => m.isBreathMark && m.isBreathMark());
        expect(breath, "breath mark").to.not.equal(undefined);
        const ink: any = breath.drawnInk;
        const next: any = note(2);
        const stemX: number = next.getStemX();
        expect(ink.right <= stemX || ink.left >= stemX, `breath mark ${ink.left}..${ink.right}, next stem at ${stemX}`).to.equal(true);
    });
});
