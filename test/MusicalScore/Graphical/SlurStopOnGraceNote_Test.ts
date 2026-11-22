import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { GraphicalNote } from "../../../src/MusicalScore/Graphical/GraphicalNote";
import { GraphicalVoiceEntry } from "../../../src/MusicalScore/Graphical/GraphicalVoiceEntry";
import { Note } from "../../../src/MusicalScore/VoiceData/Note";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";

/**
 * A slur that starts on a main note and stops on a grace note, e.g. from a trilled note to its termination. It was dropped, and
 * Vexflow drew a slur from the grace notes to their main note instead, which isn't in the file.
 * test_slur_stop_on_grace_note.musicxml has one case per measure, see the comment in each measure.
 *
 * Fork: the slurs of grace notes are read like any other slur (see VoiceGenerator, as osmd-dart), so a slur from a grace note
 * to its main note is in the model too and VoiceEntry.DrawsGraceGroupSlur says that the grace note group draws it; and a slur
 * to a grace note keeps the fork's end points, placed by its start note's stem as upstream 3.0.0 does. The checks below that
 * differ from upstream's test for that are marked "fork".
 */
describe("Slur that stops on a grace note", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "1300px";
        document.body.appendChild(container);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_slur_stop_on_grace_note.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        container.remove();
    });

    /** The notes of a measure in the order they're drawn: per staff entry, grace notes before the main note, the main note,
     *  grace notes after it. */
    function graphicalNotes(measureNumber: number): GraphicalNote[] {
        const drawingOrder: (gve: GraphicalVoiceEntry) => number = (gve: GraphicalVoiceEntry): number =>
            !gve.parentVoiceEntry.IsGrace ? 1 : gve.parentVoiceEntry.GraceAfterMainNote ? 2 : 0;
        return osmd.GraphicSheet.MeasureList[measureNumber - 1][0].staffEntries.flatMap(staffEntry =>
            staffEntry.graphicalVoiceEntries.map((gve, index) => ({ gve, index }))
                .sort((a, b) => drawingOrder(a.gve) - drawingOrder(b.gve) || a.index - b.index)
                .map(({ gve }) => gve.notes[0]));
    }

    function graphicalSlursStartingAt(note: Note): GraphicalSlur[] {
        return osmd.GraphicSheet.MusicPages.flatMap(page => page.MusicSystems).flatMap(system => system.StaffLines)
            .flatMap(staffLine => staffLine.GraphicalSlurs).filter((gSlur: GraphicalSlur) => gSlur.slur.StartNote === note);
    }

    /** The x of the note's head in its staff line, where a slur to it ends (like GraphicalSlur coordinates). */
    function noteX(note: GraphicalNote): number {
        const gve: GraphicalVoiceEntry = note.parentVoiceEntry;
        return gve.parentStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x + gve.parentStaffEntry.PositionAndShape.RelativePosition.x +
            gve.PositionAndShape.RelativePosition.x + note.PositionAndShape.RelativePosition.x;
    }

    function expectSlurToGraceNote(start: GraphicalNote, graceEnd: GraphicalNote, placement: PlacementEnum): void {
        expect(graceEnd.sourceNote.ParentVoiceEntry.IsGrace, "the end note is a grace note").to.equal(true);
        expect(graceEnd.sourceNote.ParentVoiceEntry.GraceSlur, "Vexflow draws no slur from the grace notes to a main note").to.equal(false);
        const gSlurs: GraphicalSlur[] = graphicalSlursStartingAt(start.sourceNote);
        expect(gSlurs.length).to.equal(1);
        const gSlur: GraphicalSlur = gSlurs[0];
        expect(gSlur.slur.EndNote === graceEnd.sourceNote, "ends at the grace note").to.equal(true);
        expect(gSlur.placement).to.equal(placement);
        expect(gSlur.bezierEndPt.x, "drawn to the grace note").to.be.closeTo(noteX(graceEnd), 1);
        expect(gSlur.bezierEndPt.x - gSlur.bezierStartPt.x, "from the main note").to.be.greaterThan(2);
    }

    it("draws a slur from a main note to the grace note before the next main note, above from a note with its stem down", () => {
        const [main, , graceEnd, nextMain] = graphicalNotes(1); // D5, grace C#5, grace D5, E5
        // above, by the start note's stem down (not the side with less in the way, as for other mixed stems)
        expectSlurToGraceNote(main, graceEnd, PlacementEnum.Above);
        expect(nextMain.sourceNote.NoteSlurs.length, "no slur to the next main note or beyond").to.equal(0);
    });

    it("draws a slur from a main note to the grace note after it, at the end of the measure", () => {
        const [main, , graceEnd] = graphicalNotes(3); // G4, grace F#4, grace G4
        expectSlurToGraceNote(main, graceEnd, PlacementEnum.Below);
    });

    it("draws a slur to a grace note that also starts one, which Vexflow draws to the main note", () => {
        const [main, grace, nextMain] = graphicalNotes(4); // C5, grace B4, C5
        const gSlurs: GraphicalSlur[] = graphicalSlursStartingAt(main.sourceNote);
        expect(gSlurs.length).to.equal(1);
        expect(gSlurs[0].slur.EndNote === grace.sourceNote, "ends at the grace note").to.equal(true);
        expect(gSlurs[0].bezierEndPt.x).to.be.closeTo(noteX(grace), 1);
        expect(grace.sourceNote.ParentVoiceEntry.GraceSlur, "the slur from the grace note to the main note").to.equal(true);
        // fork: the slur from the grace note to the main note is in the model, drawn by the grace note group
        expect(grace.sourceNote.ParentVoiceEntry.DrawsGraceGroupSlur).to.equal(true);
        expect(nextMain.sourceNote.NoteSlurs.length, "only the grace note's slur ends at the main note").to.equal(1);
        expect(graphicalSlursStartingAt(grace.sourceNote).length, "not drawn twice").to.equal(0);
    });

    it("leaves a slur from a grace note to its main note to Vexflow, as before", () => {
        const [grace, main] = graphicalNotes(2); // grace F5, E5
        expect(grace.sourceNote.ParentVoiceEntry.GraceSlur).to.equal(true);
        // fork: in the model, drawn by the grace note group, not as a GraphicalSlur too
        expect(grace.sourceNote.ParentVoiceEntry.DrawsGraceGroupSlur).to.equal(true);
        expect(grace.sourceNote.NoteSlurs.length).to.equal(1);
        expect(main.sourceNote.NoteSlurs.length).to.equal(1);
        expect(graphicalSlursStartingAt(grace.sourceNote).length).to.equal(0);
    });
});
