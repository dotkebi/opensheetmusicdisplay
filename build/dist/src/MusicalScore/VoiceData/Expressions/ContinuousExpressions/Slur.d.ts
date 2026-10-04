import { Note } from "../../Note";
import { PlacementEnum } from "../AbstractExpression";
export declare class Slur {
    constructor();
    private startNote;
    private endNote;
    PlacementXml: PlacementEnum;
    /** Whether the slur's end isn't attached to a note: its start note also has a stop of its number that ended no earlier
     *  slur, which Dolet for Sibelius writes e.g. for a slur running into a repeat barline (#1516). While it has no end note,
     *  it's drawn to the barline if its start note is the last note of its measure, and not at all otherwise.
     *  A later stop of its number still ends it at that note (e.g. if the stop on the start note was an orphan instead).
     */
    HasUnattachedEnd: boolean;
    get StartNote(): Note;
    set StartNote(value: Note);
    get EndNote(): Note;
    set EndNote(value: Note);
    startNoteHasMoreStartingSlurs(): boolean;
    endNoteHasMoreEndingSlurs(): boolean;
    isCrossed(): boolean;
    isSlurLonger(): boolean;
}
