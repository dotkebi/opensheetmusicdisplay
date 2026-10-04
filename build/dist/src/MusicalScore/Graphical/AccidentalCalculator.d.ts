import { KeyInstruction } from "../VoiceData/Instructions/KeyInstruction";
import { GraphicalNote } from "./GraphicalNote";
import { Pitch } from "../../Common/DataObjects/Pitch";
/**
 * Compute the accidentals for notes according to the current key instruction
 */
export declare class AccidentalCalculator {
    private keySignatureNoteAlterationsDict;
    private currentInMeasureNoteAlterationsDict;
    /** The last note of each pitch in the current measure that got an accidental, except grace notes (see isAccidentalDrawnAtSameTime()) */
    private lastNoteWithAccidentalDict;
    private activeKeyInstruction;
    Transpose: number;
    get ActiveKeyInstruction(): KeyInstruction;
    set ActiveKeyInstruction(value: KeyInstruction);
    /**
     * This method is called after each Measure
     * It clears the in-measure alterations dict for the next measure
     * and pre-loads with the alterations of the key signature
     */
    doCalculationsAtEndOfMeasure(): void;
    checkAccidental(graphicalNote: GraphicalNote, pitch: Pitch): void;
    /** Adds the accidental of the pitch to the note, and remembers the note for isAccidentalDrawnAtSameTime(). */
    private addAccidental;
    /**
     * Whether a note of the same pitch at the same time, in another voice or in the same chord, already got this accidental.
     * One accidental serves all these notes, e.g. in Dichterliebe measure 9, where two voices start with G natural,
     * both with a natural given in the XML: drawing both would put two naturals in front of the note.
     * Grace notes are drawn at their own position, so they are not counted.
     */
    private isAccidentalDrawnAtSameTime;
    private isAlterAmbiguousAccidental;
    private reactOnKeyInstructionChange;
}
