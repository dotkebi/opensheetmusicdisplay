import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";

/**
 * An eighth rest right after a slashed grace run, in a staff with a second voice, stays on its line: the grace notes (a
 * GraceNoteGroup of the rest) are not another voice's notes to clear (VexFlowConverter rest shift) — counted as notes with up
 * stems they put the rest seven lines over the staff (Bellini, Torna vezzosa Fillide, voice m91, review B06-F11).
 * Same as osmd-dart's test/rest_after_grace_run_test.dart.
 */
describe("Rest after a grace run", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        container.style.width = "1000px";
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_rest_after_grace_run.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    function restY(measureNumber: number): number {
        const measure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[measureNumber - 1][0];
        const staffY: number = measure.ParentStaffLine.PositionAndShape.AbsolutePosition.y;
        for (const entry of measure.staffEntries) {
            for (const gve of entry.graphicalVoiceEntries) {
                const note: any = gve.notes[0].sourceNote;
                if (note.isRest() && note.Length.RealValue === 0.125) {
                    return (gve as VexFlowVoiceEntry).vfStaveNote.getYs()[0] / 10 - staffY;
                }
            }
        }
        throw new Error(`no eighth rest in m${measureNumber}`);
    }

    it("the rest after a grace run stays where a plain rest is", () => {
        expect(osmd.Sheet.Instruments[0].Staves[0].Voices.length, "the staff has a second voice").to.be.greaterThan(1);
        expect(restY(2), `the rest after the grace run at ${restY(2)}, the plain one at ${restY(3)}`).to.be.closeTo(restY(3), 0.05);
    });
});
