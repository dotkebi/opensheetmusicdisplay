import { Repetition } from "../../MusicSource/Repetition";
export declare class RepetitionInstructionComparer {
    static Compare(x: RepetitionInstruction, y: RepetitionInstruction): number;
}
export declare class RepetitionInstruction {
    constructor(measureIndex: number, type: RepetitionInstructionEnum, alignment?: AlignmentType, parentRepetition?: Repetition, endingIndices?: number[]);
    measureIndex: number;
    endingIndices: number[];
    type: RepetitionInstructionEnum;
    alignment: AlignmentType;
    parentRepetition: Repetition;
    /** How many times this should be repeated */
    Times: number;
    /**
     * The words of the score, drawn instead of the instruction's label (e.g. "D.C."), where the label goes,
     * as they say more than the label or say it in another language, e.g. "D.C. senza replica", "Menuetto D.C. al Fine" or "Fin".
     * Undefined for words that only name the instruction (e.g. "Da Capo", drawn as "D.C."), and for a segno or coda sign.
     */
    Words: string;
    /** Whether the MusicXML marks this segno as the target of a D.S. (<sound segno="...">): it is never taken for a D.S. itself. */
    MarkedAsTarget: boolean;
    CompareTo(obj: Object): number;
    equals(other: RepetitionInstruction): boolean;
}
export declare enum RepetitionInstructionEnum {
    StartLine = 0,
    ForwardJump = 1,
    BackJumpLine = 2,
    Ending = 3,
    DaCapo = 4,
    DalSegno = 5,
    Fine = 6,
    ToCoda = 7,
    DalSegnoAlFine = 8,
    DaCapoAlFine = 9,
    DalSegnoAlCoda = 10,
    DaCapoAlCoda = 11,
    Coda = 12,
    Segno = 13,
    None = 14
}
export declare enum AlignmentType {
    Begin = 0,
    End = 1,
    Mid = 2,
    Discontinue = 3
}
