import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";

/**
 * Two voices on one pitch share a notehead, and the other voice's up stem ran through an ornament written over the
 * down-stem voice: a tremblement with a stroke through it reads as a pincé (Couperin, Concerts royaux III Prelude
 * m8). The ornament goes over that stem, as in the 1722 print; with no other voice it stays where it was.
 */
describe("Ornament over another voice's stem", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_ornament_over_other_voice_stem.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    function ornamentInk(measureIndex: number): any {
        const measure: VexFlowMeasure = osmd.GraphicSheet.MeasureList[measureIndex][0] as VexFlowMeasure;
        const inks: any[] = measure.OrnamentInk;
        expect(inks.length).to.equal(1);
        return inks[0];
    }

    it("puts the ornament over the other voice's up stem on the shared notehead", () => {
        const ink: any = ornamentInk(0);
        const note: any = ink.ornament.getNote();
        const stave: any = note.getStave();
        const others: any[] = note.getTickContext().getTickables().filter((t: any) => t !== note && t.getStave() === stave);
        expect(others.length).to.equal(1);
        const stemTip: number = others[0].getStem().getExtents().topY - stave.getYForLine(0);
        expect(ink.ornament.layoutInk.bottom).to.be.lessThan(stemTip - 2);
    });

    it("leaves an ornament with no other voice where it was", () => {
        // just over the staff, not raised by a stem
        expect(ornamentInk(1).ornament.layoutInk.bottom).to.be.greaterThan(-15);
    });
});
