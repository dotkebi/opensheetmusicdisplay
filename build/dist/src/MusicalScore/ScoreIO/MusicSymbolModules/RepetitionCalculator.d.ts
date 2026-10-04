import { RepetitionInstruction } from "../../VoiceData/Instructions/RepetitionInstruction";
import { MusicSheet } from "../../MusicSheet";
import { Repetition } from "../../MusicSource";
export declare class RepetitionCalculator {
    private musicSheet;
    private repetitionInstructions;
    private openRepetitions;
    /** The Fine, To Coda and coda signs that no repetition takes: they are added to their measures after the sorting. */
    private drawnOnlyInstructions;
    /** Where a repetition without a start line (forward repeat or segno) starts:
     *  after the last backward jump or ending, or at the start of the movement. */
    private lastRepetitionCommonPartStartIndex;
    /** The first measure of the current movement, where a D.C. jumps to. */
    private movementStartIndex;
    /** The first measures of the movements after the first one (where the measure numbers restart). */
    private movementStartIndices;
    private currentMeasure;
    private currentMeasureIndex;
    /**
     * Is called when all repetition symbols have been read from xml.
     * Creates the repetition instructions and adds them to the corresponding measure.
     * Creates the logical repetition objects for iteration and playback.
     * @param musicSheet
     * @param repetitionInstructions
     */
    calculateRepetitions(musicSheet: MusicSheet, repetitionInstructions: RepetitionInstruction[]): void;
    /**
     * How an instruction is played: as written, except for a D.C. or D.S. with a Fine or a To Coda before it in its movement
     * (for a D.S., after its segno), which goes back and ends at that Fine or jumps at that To Coda, as the D.C. / D.S. al Fine
     * or al Coda it is (<sound dacapo="yes"/> can't say which). The instruction keeps its type, so its label reads as written.
     */
    private typePlayedAs;
    private handleRepetitionInstructions;
    /**
     * Returns the measure index of the last instruction of the given type at or before startMeasureIndex, or -1.
     * @param minMeasureIndex the first measure to search, by default the start of the current movement
     */
    private findInstructionInMainListBackwards;
    /**
     * Adds a Fine, To Coda or coda sign that no repetition takes to the current measure, e.g. a Fine without a D.C. al Fine,
     * so that it is drawn as written. It has no parent repetition: the iterator doesn't jump there.
     * @param readInstruction the instruction as read, whose words are drawn for it (see RepetitionInstruction.Words)
     */
    private addDrawnOnlyInstruction;
    /**
     * Creates the instruction for a Fine or To Coda that a D.C. or D.S. found backwards, where the iterator ends or jumps,
     * with the words drawn for the one read there (see RepetitionInstruction.Words).
     */
    private createFoundInstruction;
    /**
     * Puts a D.C. or D.S. al Coda repetition, which waits for its coda sign, below the open repeats that start within it,
     * e.g. one whose backward repeat is at the D.C.'s barline: they lie within it, and their backward repeat doesn't close it
     * before its coda sign is read (see getOrCreateCurrentRepetition2()).
     */
    private moveBelowOpenRepeats;
    /** Removes the drawn-only coda sign of a measure, whose coda sign a D.C. or D.S. al Coda takes as its To Coda. */
    private removeDrawnOnlyCoda;
    /**
     * Starts a D.S. repetition at the last segno before the D.S. in the movement, if the segno's own repetition wasn't found
     * (e.g. a repeat sign after the segno closed it, see getOrCreateCurrentRepetition2()).
     * The segno's instruction is reused, so that the segno isn't drawn twice.
     */
    private startAtSegnoBackwards;
    /**
     * Returns where a D.C. or D.S. al Fine goes on at its Fine: the start of the next movement, or -2 (the end of the piece)
     * in the last movement.
     */
    private getFineTarget;
    /** Whether the instruction type jumps back: a backward repeat, D.C. or D.S. */
    private static isBackwardJump;
    /**
     * Whether two repetitions that cover the same measures are two jumps: a D.C. or D.S. from the same barline as a repeat sign,
     * or from a later measure (e.g. in its last ending). The repeat is played first (see RepetitionInstructionEnum.BackJumpLine
     * above), then the D.C. or D.S., after which the iterator doesn't take the repeat again, so neither restarts the other.
     * (The backward repeat that is added at the end of the piece for a forward repeat without one isn't written: it is merged
     * with a D.C. or D.S. there, as before.)
     */
    private isJumpAfterRepeat;
    private finalizeRepetition;
    /**
     * Returns the innermost open repetition from words (or from repeat signs), after finalizing the finished repetitions within it.
     * A repeat within it that has no backward jump yet stays open, e.g. one with a To Coda or Fine before its backward repeat.
     */
    private getCurrentRepetition;
    /**
     * Returns the innermost open repetition, or a new one starting at startIndex (without a start line) if none is open.
     */
    private getOrCreateCurrentRepetition;
    private getOrCreateCurrentRepetition2;
    private createNewRepetition;
    private getLastFinalizedRepetition;
}
export declare class RepetitionBuildingContainer {
    RepetitonUnderConstruction: Repetition;
    WaitingForCoda: boolean;
    SegnoFound: boolean;
    FineFound: boolean;
    ToCodaFound: boolean;
    CodaFound: boolean;
    constructor(musicSheet: MusicSheet);
}
