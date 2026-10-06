import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";

/**
 * Rests next to other voices' notes (Couperin, Concerts royaux, 1722 review N-R9, N-R10):
 * - III Prelude m5: voice 6's 8th rest, which OSMD put above voice 5's G#3, was moved down onto it by VexFlow's collisions
 *   (with voice 7's hidden half rest taking part). It clears the head now, as in osmd-dart.
 * - IV Courante françoise m15, m16, m21: voice 5's rest over voice 6's note with an upward stem was put seven lines over that
 *   note, between the staves, where it read as a rest of the upper staff. It is at most two lines out of the staff now.
 * - IV Courante françoise m17, m18 (osmd-dart): a rest drawn over the head of another voice's note that is still sounding
 *   moves right, clear of it. The spacing here doesn't bring them that close: the test puts the rest there.
 * Same as osmd-dart's test/rest_near_other_voices_test.dart.
 */
describe("Rests near other voices' notes", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    const render: (fixture: string) => Promise<void> = async (fixture: string) => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore(fixture));
        osmd.render();
    };
    afterEach(() => {
        osmd.clear();
        container.remove();
    });
    /** The VexFlow note of the voice entry at time (in whole notes) of the voice. */
    const note: (measure: GraphicalMeasure, time: number, voice: number) => any = (measure, time, voice) => {
        for (const entry of measure.staffEntries) {
            for (const gve of entry.graphicalVoiceEntries) {
                if (gve.parentVoiceEntry.ParentVoice.VoiceId === voice && gve.parentVoiceEntry.Timestamp.RealValue === time) {
                    return (gve as VexFlowVoiceEntry).vfStaveNote;
                }
            }
        }
        throw new Error(`no note of voice ${voice} at ${time}`);
    };

    it("moves a rest that VexFlow moved onto another voice's head clear of it", async () => {
        await render("test_rest_clear_of_other_voice_head.musicxml");
        const measure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[0][0];
        const rest: any = note(measure, 0, 6);
        const head: any = note(measure, 0, 5);
        expect(rest.isRest()).to.equal(true);
        const restLine: number = rest.getKeyLine(0);
        const headLine: number = head.getKeyLine(0);
        // the rest's bottom above the G#3 head, a quarter of a space away
        expect(restLine - rest.glyph.line_below, `rest line ${restLine}, head line ${headLine}`)
            .to.be.at.least(headLine + 0.5 + 0.25);
    });

    it("keeps a rest above another voice's note with an upward stem near the staff", async () => {
        await render("test_rest_near_staff_over_up_stem.musicxml");
        const measure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[0][0];
        const rest: any = note(measure, 0, 5);
        const head: any = note(measure, 0, 6);
        const restLine: number = rest.getKeyLine(0);
        const headLine: number = head.getKeyLine(0);
        expect(restLine, `rest line ${restLine}`).to.be.at.most(7);
        expect(restLine - rest.glyph.line_below, `rest line ${restLine}, head line ${headLine}`)
            .to.be.at.least(headLine + 0.5 + 0.25);
    });

    it("moves a rest drawn over the head of another voice's note still sounding right of it", async () => {
        await render("test_rest_after_held_note_of_other_voice.musicxml");
        const measure: any = osmd.GraphicSheet.MeasureList[0][1];
        const half: any = note(measure, 0.25, 6);
        const rest: any = note(measure, 0.5, 5);
        const restLeft: () => number = () => rest.getBoundingBox().getX() + rest.getXShift();
        // put the rest where VexFlow 5's spacing has it in osmd-dart: on the half note's head
        rest.setXShift(rest.getXShift() + half.getNoteHeadBeginX() + 3 - restLeft());
        expect(restLeft()).to.be.lessThan(half.getNoteHeadEndX());
        measure.clearRestsOfHeldNotes();
        expect(restLeft(), `rest from ${restLeft()}, half note head to ${half.getNoteHeadEndX()}`)
            .to.be.greaterThan(half.getNoteHeadEndX());
        expect(rest.getKeyLine(0)).to.equal(3);
    });
});
