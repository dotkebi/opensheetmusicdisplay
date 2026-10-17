import {Note} from "../../Note";
import { Fraction } from "../../../../Common/DataObjects/Fraction";
import { PlacementEnum } from "../AbstractExpression";
import { VoiceEntry } from "../../VoiceEntry";
import { SourceStaffEntry } from "../../SourceStaffEntry";

export class Slur {
    constructor() {
        // ?
    }

    private startNote: Note;
    private endNote: Note;
    public PlacementXml: PlacementEnum; // how the slur is placed in the XML
    /** Whether the slur's end isn't attached to a note: its start note also has a stop of its number that ended no earlier
     *  slur, which Dolet for Sibelius writes e.g. for a slur running into a repeat barline (#1516). While it has no end note,
     *  it's drawn to the barline if its start note is the last note of its measure, and not at all otherwise.
     *  A later stop of its number still ends it at that note (e.g. if the stop on the start note was an orphan instead).
     */
    public HasUnattachedEnd: boolean = false;

    public get StartNote(): Note {
        return this.startNote;
    }
    public set StartNote(value: Note) {
        this.startNote = value;
    }
    public get EndNote(): Note {
        return this.endNote;
    }
    public set EndNote(value: Note) {
        this.endNote = value;
    }
    /* The next three leave out a grace note group's arc to its main note (isGraceGroupSlur()): drawn by the group, not as a
     * GraphicalSlur, it doesn't take a note's slur end (Bowen, Viola Sonata No. 2 I m221: the slur below from D5 to D6 keeps
     * its end at D6, under the grace notes' arc above). */
    public startNoteHasMoreStartingSlurs(): boolean {
        if (!this.startNote) { return false; }
        for (let idx: number = 0, len: number = this.startNote.NoteSlurs.length; idx < len; ++idx) {
            const slur: Slur = this.startNote.NoteSlurs[idx];
            if (slur !== this && slur.StartNote === this.startNote && !slur.isGraceGroupSlur()) {
                return true;
            }
        }
        return false;
    }
    public endNoteHasMoreEndingSlurs(): boolean {
        if (!this.endNote) { return false; }
        for (let idx: number = 0, len: number = this.endNote.NoteSlurs.length; idx < len; ++idx) {
            const slur: Slur = this.endNote.NoteSlurs[idx];
            if (slur !== this && slur.EndNote === this.endNote && !slur.isGraceGroupSlur()) {
                return true;
            }
        }
        return false;
    }
    /** Whether this slur runs from a grace note to the main note its grace note group is attached to: the group draws that
     *  arc itself (see VoiceEntry.DrawsGraceGroupSlur), so it must not also become a GraphicalSlur. A slur from a grace note
     *  to a later note (Bowen, Viola Sonata No. 2 I m221: from the first grace note over the main note to the next note) is
     *  drawn like any other slur. As osmd_dart Slur.isGraceGroupSlur. */
    public isGraceGroupSlur(): boolean {
        const start: VoiceEntry = this.startNote?.ParentVoiceEntry;
        const end: VoiceEntry = this.endNote?.ParentVoiceEntry;
        if (!start?.IsGrace || !end || end.IsGrace) {
            return false;
        }
        const staffEntry: SourceStaffEntry = start.ParentSourceStaffEntry;
        if (!staffEntry || staffEntry !== end.ParentSourceStaffEntry || start.ParentVoice !== end.ParentVoice) {
            return false;
        }
        const entries: VoiceEntry[] = staffEntry.VoiceEntries;
        return entries.indexOf(start) < entries.indexOf(end);
    }
    public isCrossed(): boolean {
        if (!this.endNote) {
            return false; // no end note (yet), see HasUnattachedEnd
        }
        return (this.startNote.ParentStaffEntry.ParentStaff !== this.endNote.ParentStaffEntry.ParentStaff);
    }
    public isSlurLonger(): boolean {
        if (!this.endNote || !this.startNote) {
            return false;
        }
        const length: Fraction = Fraction.minus(this.endNote.getAbsoluteTimestamp(), this.startNote.getAbsoluteTimestamp());
        for (let idx: number = 0, len: number = this.startNote.NoteSlurs.length; idx < len; ++idx) {
            const slur: Slur = this.startNote.NoteSlurs[idx];
            if (
                slur !== this
                && !slur.isGraceGroupSlur()
                && slur.EndNote !== undefined
                && slur.StartNote !== undefined
                && Fraction.minus(slur.EndNote.getAbsoluteTimestamp(), slur.StartNote.getAbsoluteTimestamp()).CompareTo(length) === -1
            ) {
                return true;
            }
        }
        for (let idx: number = 0, len: number = this.endNote.NoteSlurs.length; idx < len; ++idx) {
            const slur: Slur = this.endNote.NoteSlurs[idx];
            if (
                slur !== this
                && !slur.isGraceGroupSlur()
                && slur.EndNote !== undefined
                && slur.StartNote !== undefined
                && Fraction.minus(slur.EndNote.getAbsoluteTimestamp(), slur.StartNote.getAbsoluteTimestamp()).CompareTo(length)
            ) {
                return true;
            }
        }
        return false;
    }
}
