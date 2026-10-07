import { Voice } from "../VoiceData/Voice";
import { StemDirectionType } from "../VoiceData/VoiceEntry";
import { Note, TremoloInfo } from "../VoiceData/Note";
import { SourceMeasure } from "../VoiceData/SourceMeasure";
import { SourceStaffEntry } from "../VoiceData/SourceStaffEntry";
import { Tie } from "../VoiceData/Tie";
import { Fraction } from "../../Common/DataObjects/Fraction";
import { IXmlElement } from "../../Common/FileIO/Xml";
import { Staff } from "../VoiceData/Staff";
import { SlurReader } from "./MusicSymbolModules/SlurReader";
import { VoiceLeadingGuideReader } from "./MusicSymbolModules/VoiceLeadingGuideReader";
import { NoteType } from "../VoiceData/NoteType";
import { ReaderPluginManager } from "./ReaderPluginManager";
import { Instrument } from "../Instrument";
/** An open tie found by VoiceGenerator.findOpenTie(): the dictionary it is in (this or another staff's), its key there, and the tie. */
export interface OpenTie {
    dict: {
        [_: number]: Tie;
    };
    key: number;
    tie: Tie;
}
export declare class VoiceGenerator {
    constructor(pluginManager: ReaderPluginManager, staff: Staff, voiceId: number, slurReader: SlurReader, mainVoice?: Voice);
    pluginManager: ReaderPluginManager;
    private slurReader;
    /** Shared by all voices of the instrument, set by InstrumentReader. */
    voiceLeadingGuideReader: VoiceLeadingGuideReader;
    /** The tie stops of the measure being read that wait for another voice's tie, shared by all voices of the
     *  instrument, set by InstrumentReader. */
    pendingTieStops: PendingTieStops;
    private lyricsReader;
    private articulationReader;
    private musicSheet;
    private voice;
    private currentVoiceEntry;
    private currentNote;
    private currentMeasure;
    private currentStaffEntry;
    private staff;
    private instrument;
    private openBeams;
    private beamNumberOffset;
    private get openTieDict();
    private currentOctaveShift;
    private tupletDict;
    private openTupletNumber;
    /** The last tremolo between (two) notes started in this voice, awaiting its stop note. */
    private openTremoloBetweenNotes;
    get GetVoice(): Voice;
    get OctaveShift(): number;
    set OctaveShift(value: number);
    /**
     * Create new [[VoiceEntry]], add it to given [[SourceStaffEntry]] and if given so, to [[Voice]].
     * @param musicTimestamp
     * @param parentStaffEntry
     * @param addToVoice
     * @param isGrace States whether the new VoiceEntry (only) has grace notes
     */
    createVoiceEntry(musicTimestamp: Fraction, parentStaffEntry: SourceStaffEntry, addToVoice: boolean, isGrace?: boolean, graceNoteSlash?: boolean, graceSlur?: boolean): void;
    /**
     * Create [[Note]]s and handle Lyrics, Articulations, Beams, Ties, Slurs, Tuplets.
     * @param noteNode
     * @param noteDuration
     * @param divisions
     * @param restNote
     * @param parentStaffEntry
     * @param parentMeasure
     * @param measureStartAbsoluteTimestamp
     * @param maxTieNoteFraction
     * @param chord
     * @param octavePlusOne Software like Guitar Pro gives one octave too low, so we need to add one
     * @param printObject whether the note should be rendered (true) or invisible (false)
     * @returns {Note}
     */
    read(noteNode: IXmlElement, noteDuration: Fraction, typeDuration: Fraction, noteTypeXml: NoteType, normalNotes: number, restNote: boolean, parentStaffEntry: SourceStaffEntry, parentMeasure: SourceMeasure, measureStartAbsoluteTimestamp: Fraction, maxTieNoteFraction: Fraction, chord: boolean, octavePlusOne: boolean, printObject: boolean, isCueNote: boolean, isGraceNote: boolean, stemDirectionXml: StemDirectionType, tremoloInfo: TremoloInfo, stemColorXml: string, noteheadColorXml: string, dotsXml: number): Note;
    /**
     * Create a new [[StaffEntryLink]] and sets the currenstStaffEntry accordingly.
     * @param index
     * @param currentStaff
     * @param currentStaffEntry
     * @param currentMeasure
     * @returns {SourceStaffEntry}
     */
    checkForStaffEntryLink(index: number, currentStaff: Staff, currentStaffEntry: SourceStaffEntry, currentMeasure: SourceMeasure): SourceStaffEntry;
    checkForOpenBeam(): void;
    /** Check/delete open ties that don't exceed measure duration. Currently unused as it's incorrect, see below. */
    checkOpenTies(): void;
    hasVoiceEntry(): boolean;
    private readArticulations;
    /**
     * Create a new [[Note]] and adds it to the currentVoiceEntry
     * @param node
     * @param noteDuration
     * @param divisions
     * @param chord
     * @param octavePlusOne Software like Guitar Pro gives one octave too low, so we need to add one
     * @returns {Note}
     */
    private addSingleNote;
    /**
     * Create a new rest note and add it to the currentVoiceEntry.
     * @param noteDuration
     * @param divisions
     * @returns {Note}
     */
    private addRestNote;
    private addNoteInfo;
    /**
     * Links the start and stop note of a tremolo between (two) notes (XML tremolo type="start"/"stop")
     * via a shared TremoloBetweenNotes object (note.TremoloInfo.tremoloBetweenNotes).
     */
    private handleTremoloBetweenNotes;
    /**
     * Handle the currentVoiceBeam.
     * @param node
     * @param note
     */
    private createBeam;
    private endBeam;
    /**
     * Check for open [[Beam]]s at end of [[SourceMeasure]] and closes them explicity.
     */
    private handleOpenBeam;
    /**
     * Create a [[Tuplet]].
     * @param node
     * @param tupletNodeList
     * @returns {number}
     */
    private addTuplet;
    private readShowNumberNoneGiven;
    /** `show-number="actual"` or `"both"` written explicitly (the attribute's default is also "actual",
     * but an absent attribute leaves the decision to the layout rules). */
    private readShowNumberActualGiven;
    /**
     * This method handles the time-modification IXmlElement for the Tuplet case (tupletNotes not at begin/end of Tuplet).
     * @param noteNode
     */
    private handleTimeModificationNode;
    /** Record that the given note is part of the tuplet. Sets NoteTuplet (the innermost/primary tuplet) and adds
     *  the tuplet to the note's NoteTuplets list (which holds all tuplets a note belongs to, for nested tuplets). */
    private linkNoteToTuplet;
    /** Add the current note to the given tuplet's note list (reusing the last sub-list for chords at the same
     *  timestamp, otherwise starting a new one) and add the tuplet to the note's NoteTuplets, without changing
     *  NoteTuplet. Used to add a note to enclosing/continuing tuplets when nesting. */
    private addCurrentNoteToTuplet;
    /** Add the current note to every still-open tuplet it isn't part of yet. For nested tuplets this adds a note
     *  to the enclosing (outer) tuplet(s) that are still open while it also starts/continues an inner tuplet. */
    private addCurrentNoteToOpenTuplets;
    /** Read an explicit tuplet display number from <tuplet-actual><tuplet-number> if given (used for nested tuplets,
     *  where the cumulative time-modification actual-notes - e.g. 9 - differs from the number to show - e.g. 3). */
    private readTupletActualNumber;
    private addTie;
    /**
     * A tie stop that found no open tie of its own voice is matched with another voice's tie only after the whole
     * measure is read (PendingTieStops.resolve()): voices are read one after the other, so a note of an earlier-read
     * voice must not take the tie of a voice whose own stop comes later in the file (Schumann, Myrthen,
     * Die Hochländer-Wittwe m72-73). Without a queue (a generator outside an InstrumentReader) the stop is matched now.
     */
    private deferTieStop;
    private getTieDirection;
    /**
     * Find the next free int (starting from 0) to use as key in TieDict.
     * @returns {number}
     */
    private getNextAvailableNumberForTie;
    /**
     * The open tie that note (a tie stop) ends, among the open ties of all staves of the instrument (a tie can start in
     * one staff and end in the other: Schumann, Myrthen, Aus den hebräischen Gesängen m79-80, right-hand C4 half tied
     * to the left-hand C4 whole, different voices; each staff keeps its own openTieDict). A candidate has the note's
     * pitch (letter and octave, or tab string, else sounding pitch) and its last note is earlier than the note, or a
     * grace note at its time (a tie never joins two notes of one chord: Basie, Straight Ahead m87, a cluster of B2 and
     * Bb2 tied on chord by chord). Among candidates: the same voice, then the same staff, then the same pitch (letter,
     * alteration and octave) before the same letter and octave before the same sounding pitch, then the nearest last
     * note (one tie per held note: a stop does not skip a later tie of its voice), then ownDict first and the lowest
     * key (upstream's order). sameVoiceOnly keeps the ties whose last note is in the note's voice only. measureStart is the absolute
     * timestamp of the measure being read, whose SourceMeasure.AbsoluteTimestamp is set only after it is read.
     *
     * Upstream (and the fork before 10-07) took the first open tie of the pitch, the lowest key of the voice's own
     * staff: in Die Hochländer-Wittwe m73 right-hand voice 1's G3 eighth (stop+start), read before voice 2, continued
     * voice 2's G3 tie from m72 instead of its own G3 sixteenth's, and voice 2's G3 stop at the measure's start then
     * ended that tie too.
     */
    static findOpenTie(instrument: Instrument, ownDict: {
        [_: number]: Tie;
    }, note: Note, measureStart: Fraction, sameVoiceOnly?: boolean): OpenTie;
    private static rankAbove;
    /** 3: the tie's pitch spelled as the note's (or the same tab string), 2: the same letter and octave (upstream's
     *  match, the alteration aside), 1: the same sounding pitch, 0: another pitch. */
    private static tiePitchMatch;
    /** The note's absolute timestamp; measureStart for the measure being read (its AbsoluteTimestamp isn't set yet). */
    static absoluteTimestamp(note: Note, measureStart: Fraction): Fraction;
    /**
     * Calculate the normal duration of a [[Tuplet]] note.
     * @param xmlNode
     * @returns {any}
     */
    private getTupletNoteDurationFromType;
}
/**
 * The tie stops read in a measure that found no open tie of their own voice (VoiceGenerator.deferTieStop()), matched
 * with the other voices' open ties by resolve() after the whole measure is read, earliest stop first.
 */
export declare class PendingTieStops {
    private stops;
    add(note: Note, ownDict: {
        [_: number]: Tie;
    }, started: Tie, measureStart: Fraction): void;
    resolve(instrument: Instrument): void;
    /** Ends the open tie the note stops (any voice). started is the tie the note started (a stop+start that found no
     *  tie of its voice): the tie found continues through it. */
    static stopTie(instrument: Instrument, ownDict: {
        [_: number]: Tie;
    }, note: Note, started: Tie, measureStart: Fraction): void;
}
