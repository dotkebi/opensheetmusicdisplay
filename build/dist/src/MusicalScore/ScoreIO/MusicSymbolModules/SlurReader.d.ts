import { MusicSheet } from "../../MusicSheet";
import { IXmlElement } from "../../../Common/FileIO/Xml";
import { Note } from "../../VoiceData/Note";
export declare class SlurReader {
    private musicSheet;
    private openSlurDict;
    /** Slur stops that were read before their matching start, kept separate from openSlurDict so they don't
     * interfere with normal start-before-stop slurs that reuse the same slur number. See addSlur(). */
    private openStopBeforeStartDict;
    /** Open glissandi and slides by staff and number: separate from openSlurDict, so they don't end a slur with the same
     * number, and per staff, because e.g. the standard and the tab staff of a guitar part both write a slide with number 1. */
    private openGlissDicts;
    constructor(musicSheet: MusicSheet);
    addSlur(slurNodes: IXmlElement[], currentNote: Note): void;
    /** The number attribute of a slur, slide or glissando node, 1 if it has none. */
    private readSlurNumber;
    /** The open glissandi and slides of the note's staff, by number (see openGlissDicts). */
    private openGlissDictOfStaff;
    /** Links a fully-defined slur (both StartNote and EndNote set) to its two notes, unless it duplicates an existing one
     *  (then it's also unlinked from its start note, which a slur that had an unattached end so far is linked to already).
     */
    private linkSlurToNotes;
    /** Whether a slur stop that was read before its start (endNote) and a later start note (startNote) form a
     * genuine cross-staff slur. A cross-staff slur written end-staff-first has its start and stop on different
     * staves but in the SAME measure (the <backup> that reorders them is within a measure), and runs forward in
     * time (start no later than stop). Requiring all of this rejects orphan stops - e.g. from grace-note slurs
     * whose start is skipped by the reader - which would otherwise be wrongly paired with an unrelated later
     * start that reuses the same slur number (across a barline and/or backwards in time). */
    private isCrossStaffSlurMatch;
}
