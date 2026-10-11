import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";

/**
 * A delayed turn (printed between two notes) goes halfway from its note to the next note of the same voice
 * (Bellini, Vanne o rosa fortunata m10 and m48, as in the 1831 and 1935 Ricordi prints). VexFlow measured from the
 * ornament's x, which is off the tick contexts' x by the stave's note start: in a system's first measure the clef, key
 * and time put the turn left of its note (Vanne m10). Inside a system and past another voice's note it was already
 * halfway, and stays so. As in osmd_dart (vexflow_dart Ornament.draw).
 */
describe("Delayed turn position", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_delayed_turn_between_notes.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    /** Where the turn's centre is between its note (0) and the next note of the voice (1). */
    function fraction(measureIndex: number): number {
        const measure: VexFlowMeasure = osmd.GraphicSheet.MeasureList[measureIndex][0] as VexFlowMeasure;
        const inks: any[] = measure.OrnamentInk;
        expect(inks.length).to.equal(1);
        const ornament: any = inks[0].ornament;
        const note: any = ornament.getNote();
        const tickables: any[] = note.getVoice().getTickables();
        const next: any = tickables[tickables.indexOf(note) + 1];
        const stave: any = note.getStave();
        const centre: number = (ornament.layoutInk.left + ornament.layoutInk.right) / 2 + stave.getX();
        const from: number = note.getAbsoluteX() + note.getGlyphWidth() / 2;
        const to: number = next.getAbsoluteX() + next.getGlyphWidth() / 2;
        return (centre - from) / (to - from);
    }

    it("goes halfway to the next note in a system's first measure", () => {
        expect(fraction(0)).to.be.within(0.45, 0.55);
    });

    it("goes halfway to the next note inside the system", () => {
        expect(fraction(1)).to.be.within(0.45, 0.55);
    });

    it("goes halfway to the next note of its own voice, past another voice's note", () => {
        expect(fraction(2)).to.be.within(0.45, 0.55);
    });
});
