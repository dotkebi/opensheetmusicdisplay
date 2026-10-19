import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { VexFlowVibratoBracket } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVibratoBracket";

// Haydn Hob.VIIg:C1 I, m315–317. The cadenza needs more than one system's
// width. Negative justification used to move its Nachschlag before the trill,
// reversing the wavy line's skyline interval and aborting the whole score.
describe("Cadenza trill in an overfull measure", () => {
    it("keeps the ending grace note after the trill and renders its wavy line", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        container.style.width = "1024px";
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        try {
            await osmd.load(TestUtils.getScore("test_cadenza_wavy_overflow.musicxml"));
            osmd.render();
            const brackets: VexFlowVibratoBracket[] = osmd.GraphicSheet.MusicPages.flatMap(page =>
                page.MusicSystems.flatMap(system => system.StaffLines.flatMap(staff => staff.WavyLines as VexFlowVibratoBracket[])));
            expect(brackets).to.have.length(1);
            const bracket: VexFlowVibratoBracket = brackets[0];
            expect(bracket.EndsAtGraceNote).to.equal(true);
            expect(bracket.endNote.getAbsoluteX()).to.be.greaterThan(bracket.startNote.getAbsoluteX());
            expect(Number.isFinite(bracket.line)).to.equal(true);
        } finally {
            osmd.clear();
            container.remove();
        }
    });
});
