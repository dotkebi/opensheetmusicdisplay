import { Repetition } from "../../MusicSource/Repetition";
import { Fraction } from "../../../Common/DataObjects/Fraction";
import { Staff } from "../Staff";
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
    /**
     * Whether the RepetitionCalculator added this instruction for playback, without a sign for it in the MusicXML:
     * the backward jump that closes a forward repeat without a backward repeat at the end of the piece.
     * It is played, but not drawn (no backward repeat barline that the score doesn't have).
     */
    Implicit: boolean;
    /**
     * Where the MusicXML puts the signs of a segno: the staff and the timestamp in the measure,
     * one per <direction> with the sign, e.g. one above each hand of a piano part at different notes
     * (Couperin, Concerts royaux III, Allemande m17). Only the ones of the first part with the segno in the measure.
     * Empty for a segno from words: drawn at the start of the measure, above the top staff.
     */
    SymbolPlacements: RepetitionSymbolPlacement[];
    CompareTo(obj: Object): number;
    equals(other: RepetitionInstruction): boolean;
}
/** Where a sign of a repetition instruction (a segno) is drawn, see RepetitionInstruction.SymbolPlacements. */
export interface RepetitionSymbolPlacement {
    /** the staff of the <direction> */
    staff: Staff;
    /** the timestamp in the measure, with the direction's <offset> */
    timestamp: Fraction;
    /** drawn below the staff (placement="below") */
    below?: boolean;
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
