import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";

// A solo voice holding four times the 3/8 of the orchestra's rest in the same
// measure (Weber, Bassoon Concerto Op. 75 II m60 full score: a cadenza of 5.6
// measures' worth). The formatter shared the leftover width out per tick of the
// first voice only, so the solo's later notes got four times their share and
// ran far beyond the barline.
describe("Justification of a measure whose later voice uses more ticks", () => {
    it("keeps the solo's notes within the measure", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        container.style.width = "1024px";
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        try {
            await osmd.load(TestUtils.getScore("test_justify_by_longest_voice.musicxml"));
            osmd.render();
            const solo: GraphicalMeasure = osmd.GraphicSheet.MeasureList[0][1];
            const notes: Vex.Flow.StaveNote[] = (solo as VexFlowMeasure).vfVoices["1"].getTickables() as Vex.Flow.StaveNote[];
            expect(notes).to.have.length(24);
            const stave: Vex.Flow.Stave = (solo as VexFlowMeasure).getVFStave();
            const lastRight: number = notes[notes.length - 1].getAbsoluteX() + notes[notes.length - 1].getWidth();
            expect(lastRight).to.be.lessThanOrEqual(stave.getX() + stave.getWidth() + 1);
        } finally {
            osmd.clear();
            container.remove();
        }
    });
});
