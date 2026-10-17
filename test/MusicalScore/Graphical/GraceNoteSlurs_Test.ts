import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { Note } from "../../../src/MusicalScore/VoiceData/Note";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A slur on a grace note is read as a slur, not only as VoiceEntry.GraceSlur: a slur from a grace note to a later note
 * keeps its far end (Couperin, Concerts royaux II Air tendre m34), and the notes of a slur from a grace note to its own
 * main note know it (Bowen, Viola Sonata No. 2 I m221: the first grace note is played legato). Only a slur to the
 * group's main note is drawn by the grace note group; the others are GraphicalSlurs. As osmd-dart
 * test/grace_slur_beam_single_number_time_test.dart. See test_grace_note_slurs_read.musicxml for the measures.
 */
describe("Grace note slurs", () => {
    let osmd: OpenSheetMusicDisplay;

    before(async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1200px";
        osmd = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore("test_grace_note_slurs_read.musicxml"));
        osmd.render();
    });

    const notes: (measureIndex: number) => Note[] = (measureIndex: number): Note[] =>
        osmd.Sheet.SourceMeasures[measureIndex].VerticalSourceStaffEntryContainers
            .flatMap(container => container.StaffEntries.filter(entry => entry))
            .flatMap(entry => entry.VoiceEntries)
            .flatMap(entry => entry.Notes);

    /** The GraphicalSlurs, by their start note's measure (a staff line keeps them sorted otherwise). */
    const graphicalSlurs: () => GraphicalSlur[] = (): GraphicalSlur[] =>
        osmd.GraphicSheet.MusicPages.flatMap(page => page.MusicSystems).flatMap(system => system.StaffLines)
            .flatMap(staffLine => staffLine.GraphicalSlurs)
            .sort((a, b) => a.slur.StartNote.SourceMeasure.MeasureNumber - b.slur.StartNote.SourceMeasure.MeasureNumber);

    /** [measure number, grace notes, shows its arc] of each grace note group. */
    const graceNoteGroups: () => [number, number, boolean][] = (): [number, number, boolean][] => {
        const groups: [number, number, boolean][] = [];
        for (const measure of osmd.GraphicSheet.MeasureList.map(measures => measures[0])) {
            for (const staffEntry of measure.staffEntries) {
                for (const gve of staffEntry.graphicalVoiceEntries as VexFlowVoiceEntry[]) {
                    for (const modifier of (gve.vfStaveNote as any)?.getModifiers() ?? []) {
                        if (modifier.getCategory() === "gracenotegroups") {
                            groups.push([measure.MeasureNumber, modifier.getGraceNotes().length, modifier.show_slur === true]);
                        }
                    }
                }
            }
        }
        return groups;
    };

    /** "measure.index" of a note in [[notes]] (assertions on short strings, not on the notes' object graphs). */
    const name: (note: Note) => string = (note: Note): string =>
        note ? `${note.SourceMeasure.MeasureNumber}.${notes(note.SourceMeasure.measureListIndex).indexOf(note)}` : "none";
    /** "start-end" of each slur of the note. */
    const slursOf: (note: Note) => string[] = (note: Note): string[] =>
        note.NoteSlurs.map(slur => `${name(slur.StartNote)}-${name(slur.EndNote)}`);

    // notes of m1: D5, grace D5, grace E5, F5, E5, D5
    it("reads a slur from a grace note to a later note with its far end", () => {
        const grace: Note = notes(0)[1];
        expect(slursOf(grace)).to.deep.equal(["1.1-1.5"]);
        expect(slursOf(notes(0)[5])).to.deep.equal(["1.1-1.5"]);
        expect(grace.NoteSlurs[0].isGraceGroupSlur()).to.equal(false);
        expect(grace.ParentVoiceEntry.GraceSlur).to.equal(true); // the XML mark is kept
        expect(grace.ParentVoiceEntry.DrawsGraceGroupSlur).to.equal(false);
    });

    // notes of m2: grace F5, G5, grace G5, grace A5, B4, grace C5, D5
    it("reads a slur from a grace note to its own main note as the group's arc", () => {
        expect(notes(1).map(slursOf)).to.deep.equal([["2.0-2.1"], ["2.0-2.1"], ["2.2-2.4"], [], ["2.2-2.4"], [], []]);
        expect([0, 2, 5].map(index => notes(1)[index].NoteSlurs[0]?.isGraceGroupSlur())).to.deep.equal([true, true, undefined]);
        expect([0, 2, 5].map(index => notes(1)[index].ParentVoiceEntry.DrawsGraceGroupSlur)).to.deep.equal([true, true, false]);
    });

    // notes of m3: D5, F#5 (chord), grace E#5, grace F#5, D6, rest
    it("links a grace note slur to the main note that also ends a slur from the note before (Bowen m221)", () => {
        const m3: Note[] = notes(2);
        expect(m3.map(slursOf)).to.deep.equal([["3.0-3.4"], [], ["3.2-3.4"], [], ["3.0-3.4", "3.2-3.4"], []]);
        expect(m3[2].NoteSlurs[0].isGraceGroupSlur()).to.equal(true);
        expect(m3[2].ParentVoiceEntry.DrawsGraceGroupSlur).to.equal(true);
        // the grace notes' arc (drawn by their group) doesn't take D6's slur end from the slur from D5
        const fromD5: Note["NoteSlurs"][0] = m3[0].NoteSlurs[0];
        expect(fromD5.endNoteHasMoreEndingSlurs()).to.equal(false);
        expect(fromD5.isSlurLonger()).to.equal(false);
    });

    // notes of m4: E5, F5, G5, after-grace F5
    it("ends a slur to an after-grace note at that grace note", () => {
        const m4: Note[] = notes(3);
        expect(m4[3].ParentVoiceEntry.GraceAfterMainNote).to.equal(true);
        expect(m4.map(slursOf)).to.deep.equal([[], [], ["4.2-4.3"], ["4.2-4.3"]]);
        expect(m4[3].NoteSlurs[0].isGraceGroupSlur()).to.equal(false);
    });

    // notes of m5: C5, D5, grace E5, F5; m6: G5, grace A5, B5, C6; m7: grace C5, D5
    it("pairs slurs reusing a grace note slur's number with their own notes", () => {
        expect(notes(4).map(slursOf)).to.deep.equal([["5.0-5.1"], ["5.0-5.1"], ["5.2-5.3"], ["5.2-5.3"]]);
        expect(notes(5).map(slursOf)).to.deep.equal([["6.0-6.3"], [], [], ["6.0-6.3"]]);
        // an unmatched grace slur start keeps the group's arc
        expect(notes(6).map(slursOf)).to.deep.equal([[], []]);
        expect(notes(6)[0].ParentVoiceEntry.DrawsGraceGroupSlur).to.equal(true);
    });

    it("draws the slurs to the group's main note once, as the group's arc, and the others as GraphicalSlurs", () => {
        const slurs: GraphicalSlur[] = graphicalSlurs();
        expect(slurs.map(slur => slur.slur.StartNote.SourceMeasure.MeasureNumber)).to.deep.equal([1, 3, 4, 5, 6]);
        expect(slurs.some(slur => slur.slur.isGraceGroupSlur())).to.equal(false);
        expect(graceNoteGroups()).to.deep.equal([
            [1, 2, false],
            [2, 1, true], [2, 2, true], [2, 1, false],
            [3, 2, true],
            [5, 1, true],
            [6, 1, false],
            [7, 1, true],
        ]);
    });

    it("starts the slur from a grace note at the grace note, left of its main note", () => {
        const slur: GraphicalSlur = graphicalSlurs()[0];
        const x: (entry: GraphicalStaffEntry) => number = (entry: GraphicalStaffEntry): number =>
            entry.parentMeasure.PositionAndShape.RelativePosition.x + entry.PositionAndShape.RelativePosition.x;
        const hostEntry: GraphicalStaffEntry = slur.staffEntries[0];
        expect(slur.bezierStartPt.x).to.be.lessThan(x(hostEntry) - 1);
        expect(slur.bezierStartPt.x).to.be.greaterThan(x(hostEntry) - 6);
        expect(slur.bezierEndPt.x).to.be.greaterThan(x(slur.staffEntries[slur.staffEntries.length - 1]) - 1);
    });

    it("ends the slur to an after-grace note right of its main note", () => {
        const slur: GraphicalSlur = graphicalSlurs()[2];
        const entry: GraphicalStaffEntry = slur.staffEntries[slur.staffEntries.length - 1];
        const mainX: number = entry.parentMeasure.PositionAndShape.RelativePosition.x + entry.PositionAndShape.RelativePosition.x;
        expect(slur.bezierEndPt.x - mainX).to.be.greaterThan(1.5);
    });
});
