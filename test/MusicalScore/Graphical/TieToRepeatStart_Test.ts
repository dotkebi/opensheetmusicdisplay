import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { GraphicalTie } from "../../../src/MusicalScore/Graphical/GraphicalTie";
import { Note } from "../../../src/MusicalScore/VoiceData/Note";

/**
 * A tie from the last note before a backward repeat to the note the repeat goes back to (Couperin, Concerts royaux I,
 * Sarabande m29 to m10): the note has <tied type="start"/><tied type="stop"/>, with no tie to stop.
 * The tie used to be dropped, since a stop+start pair only continued an open tie. It is drawn from its note to the repeat barline.
 *
 * Sample: measure 2 (first ending, backward repeat) ends with C4 tied start+stop in the left hand.
 */
describe("Tie to the start of a repeat", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_tie_regression_to_repeat_start.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    function lastLeftHandEntry(measureIndex: number): GraphicalStaffEntry {
        const entries: GraphicalStaffEntry[] = osmd.GraphicSheet.MeasureList[measureIndex][1].staffEntries;
        return entries[entries.length - 1];
    }

    it("reads the tie of the note before the backward repeat", () => {
        const note: Note = lastLeftHandEntry(1).graphicalVoiceEntries[0].notes[0].sourceNote;
        expect(note.NoteTie, "tie of LH C4 in measure 2").to.not.equal(undefined);
        expect(note.NoteTie.StartNote).to.equal(note);
    });

    it("draws it from the note to the end of the staff", () => {
        const entry: GraphicalStaffEntry = lastLeftHandEntry(1);
        expect(entry.GraphicalTies.length).to.equal(1);
        const tie: GraphicalTie = entry.GraphicalTies[0];
        expect(tie.EndNote).to.equal(undefined);
        expect(tie.vfTie, "VexFlow tie").to.not.equal(undefined);
        expect(tie.SVGElement, "drawn tie").to.not.equal(undefined);
    });
});
