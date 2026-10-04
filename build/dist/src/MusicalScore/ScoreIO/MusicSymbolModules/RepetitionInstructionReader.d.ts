import { MusicSheet } from "../../MusicSheet";
import { IXmlElement } from "../../../Common/FileIO/Xml";
import { SourceMeasure } from "../../VoiceData/SourceMeasure";
import { RepetitionInstruction } from "../../VoiceData/Instructions/RepetitionInstruction";
export declare class RepetitionInstructionReader {
    /**
     * A global list of all repetition instructions in the musicsheet.
     */
    repetitionInstructions: RepetitionInstruction[];
    xmlMeasureList: IXmlElement[][];
    private musicSheet;
    private currentMeasureIndex;
    set MusicSheet(value: MusicSheet);
    /**
     * is called when starting reading an xml measure
     * @param measure
     * @param currentMeasureIndex
     */
    prepareReadingMeasure(measure: SourceMeasure, currentMeasureIndex: number): void;
    handleLineRepetitionInstructions(barlineNode: IXmlElement): boolean;
    /**
     * Reads a repetition instruction (e.g. D.S., Fine, a segno sign) from a direction.
     * @param directionTypeNode the direction-type element (words, segno or coda)
     * @param relativeMeasurePosition the position of the direction in the measure (not used)
     * @param soundNode the direction's sound element, if any: <sound segno="..."> marks a segno as the target of a D.S.
     *   Its dacapo, dalsegno, fine, tocoda, segno and coda attributes say which instruction the direction is when its words
     *   don't name one themselves, e.g. "Fin", "Da Capo bis Ende" or "D.C. senza replica".
     * @returns true if the direction is a repetition instruction, false if it is drawn as text
     */
    handleRepetitionInstructionsFromWordsOrSymbols(directionTypeNode: IXmlElement, relativeMeasurePosition: number, soundNode?: IXmlElement): boolean;
    /**
     * Returns the repetition instruction that the words are, or undefined if they are a general text,
     * which may mention an instruction, e.g. "voice tacet on D.S." (see #1687).
     * @param text the words, trimmed and in lower case
     */
    private static repetitionInstructionFromWords;
    /**
     * Returns the repetition instruction that the sound element's attributes mark, whatever the language of the words,
     * or undefined if they mark none.
     * @param soundNode the direction's sound element, if any
     */
    private static repetitionInstructionFromSound;
    /** Whether the instruction type is a D.C. or D.S. (with or without al Fine / al Coda). */
    private static isJumpFromWords;
    removeRedundantInstructions(): void;
    private findInstructionInPreviousMeasure;
    private backwardSearchForPreviousIdenticalInstruction;
    private addInstruction;
}
