import {Repetition} from "../../MusicSource/Repetition";
import {Fraction} from "../../../Common/DataObjects/Fraction";
import {Staff} from "../Staff";

export class RepetitionInstructionComparer /*implements IComparer<RepetitionInstruction>*/ {
    public static Compare(x: RepetitionInstruction, y: RepetitionInstruction): number {
        if (x.parentRepetition !== undefined && y.parentRepetition) {
            if (x.alignment === AlignmentType.End && y.alignment === AlignmentType.End) {
                // An instruction before the start of its repetition, e.g. the jump to a first ending that starts the repetition,
                //   comes after the instructions of the repetitions that end here, e.g. a D.C. and a backward repeat.
                const xBeforeItsStart: boolean = x.measureIndex < x.parentRepetition.StartIndex;
                if (xBeforeItsStart !== y.measureIndex < y.parentRepetition.StartIndex) {
                    return xBeforeItsStart ? 1 : -1;
                }
                if (x.parentRepetition.StartIndex < y.parentRepetition.StartIndex) {
                    return 1;
                }
                if (x.parentRepetition.StartIndex > y.parentRepetition.StartIndex) {
                    return -1;
                }
            }
            if (x.alignment === AlignmentType.Begin && y.alignment === AlignmentType.Begin) {
                if (x.parentRepetition.EndIndex < y.parentRepetition.EndIndex) {
                    return 1;
                }
                if (x.parentRepetition.EndIndex > y.parentRepetition.EndIndex) {
                    return -1;
                }
            }
        }
        return 0;
    }
}

export class RepetitionInstruction /*implements IComparable*/ {
    /* FIXME: Check constructor calling from other classes
     constructor(measureIndex: number, type: RepetitionInstructionEnum) {
     this(measureIndex, [], type, AlignmentType.End, undefined);
     if (type === RepetitionInstructionEnum.StartLine || type === RepetitionInstructionEnum.Segno || type === RepetitionInstructionEnum.Coda) {
     this.alignment = AlignmentType.Begin;
     }
     }
     constructor(measureIndex: number, type: RepetitionInstructionEnum, alignment: AlignmentType, parentRepetition: Repetition) {
     this(measureIndex, [], type, alignment, parentRepetition);

     }
     constructor(measureIndex: number, endingIndex: number, type: RepetitionInstructionEnum, alignment: AlignmentType, parentRepetition: Repetition) {
     this(measureIndex, [endingIndex], type, alignment, parentRepetition);

     }
     */
    constructor(measureIndex: number, type: RepetitionInstructionEnum, alignment: AlignmentType = AlignmentType.End,
                parentRepetition: Repetition = undefined, endingIndices: number[] = undefined) {
        this.measureIndex = measureIndex;
        if (endingIndices) {
            this.endingIndices = endingIndices.slice(); // slice=arrayCopy
        }
        this.type = type;
        this.alignment = alignment;
        this.parentRepetition = parentRepetition;
    }

    public measureIndex: number;
    public endingIndices: number[] = undefined;
    public type: RepetitionInstructionEnum;
    public alignment: AlignmentType;
    public parentRepetition: Repetition;
    /** How many times this should be repeated */
    public Times: number;
    /**
     * The words of the score, drawn instead of the instruction's label (e.g. "D.C."), where the label goes,
     * as they say more than the label or say it in another language, e.g. "D.C. senza replica", "Menuetto D.C. al Fine" or "Fin".
     * Undefined for words that only name the instruction (e.g. "Da Capo", drawn as "D.C."), and for a segno or coda sign.
     */
    public Words: string;
    /** Whether the MusicXML marks this segno as the target of a D.S. (<sound segno="...">): it is never taken for a D.S. itself. */
    public MarkedAsTarget: boolean = false;
    /**
     * Whether the RepetitionCalculator added this instruction for playback, without a sign for it in the MusicXML:
     * the backward jump that closes a forward repeat without a backward repeat at the end of the piece.
     * It is played, but not drawn (no backward repeat barline that the score doesn't have).
     */
    public Implicit: boolean = false;
    /**
     * Where the MusicXML puts the signs of a segno: the staff and the timestamp in the measure,
     * one per <direction> with the sign, e.g. one above each hand of a piano part at different notes
     * (Couperin, Concerts royaux III, Allemande m17). Only the ones of the first part with the segno in the measure.
     * Empty for a segno from words: drawn at the start of the measure, above the top staff.
     */
    public SymbolPlacements: RepetitionSymbolPlacement[] = [];

    public CompareTo(obj: Object): number {
        const other: RepetitionInstruction = <RepetitionInstruction>obj;
        if (this.measureIndex > other.measureIndex) {
            return 1;
        } else if (this.measureIndex < other.measureIndex) {
            return -1;
        }
        if (this.alignment === AlignmentType.Begin) {
            if (other.alignment === AlignmentType.End) {
                return -1;
            }
            switch (this.type) {
                case RepetitionInstructionEnum.Ending:
                    return 1;
                case RepetitionInstructionEnum.StartLine:
                    if (other.type === RepetitionInstructionEnum.Ending) {
                        return -1;
                    }
                    return 1;
                case RepetitionInstructionEnum.Coda:
                case RepetitionInstructionEnum.Segno:
                    if (other.type === RepetitionInstructionEnum.Coda) {
                        return 1;
                    }
                    return -1;
                default:
            }
        } else {
            if (other.alignment === AlignmentType.Begin) {
                return 1;
            }
            switch (this.type) {
                case RepetitionInstructionEnum.Ending:
                    return -1;
                case RepetitionInstructionEnum.Fine:
                case RepetitionInstructionEnum.ToCoda:
                    if (other.type === RepetitionInstructionEnum.Ending) {
                        return 1;
                    }
                    return -1;
                case RepetitionInstructionEnum.ForwardJump:
                    switch (other.type) {
                        case RepetitionInstructionEnum.Ending:
                        case RepetitionInstructionEnum.Fine:
                        case RepetitionInstructionEnum.ToCoda:
                            return 1;
                        default:
                    }
                    return -1;
                case RepetitionInstructionEnum.DalSegnoAlFine:
                case RepetitionInstructionEnum.DaCapoAlFine:
                case RepetitionInstructionEnum.DalSegnoAlCoda:
                case RepetitionInstructionEnum.DaCapoAlCoda:
                case RepetitionInstructionEnum.DaCapo:
                case RepetitionInstructionEnum.DalSegno:
                case RepetitionInstructionEnum.BackJumpLine:
                    return 1;
                default:
            }
        }
        return 0;
    }

    public equals(other: RepetitionInstruction): boolean {
        if (
            this.measureIndex !== other.measureIndex
            || this.type !== other.type
            || this.alignment !== other.alignment
        ) {
            return false;
        }
        if (this.endingIndices === other.endingIndices) {
            return true;
        }
        if (!this.endingIndices || !other.endingIndices ||
            this.endingIndices.length !== other.endingIndices.length) {
            return false;
        }
        for (let i: number = 0; i < this.endingIndices.length; i++) {
            if (this.endingIndices[i] !== other.endingIndices[i]) {
                return false;
            }
        }
        return true;
    }
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

export enum RepetitionInstructionEnum {
    StartLine,
    ForwardJump,
    BackJumpLine,
    Ending,
    DaCapo,
    DalSegno,
    Fine,
    ToCoda,
    DalSegnoAlFine,
    DaCapoAlFine,
    DalSegnoAlCoda,
    DaCapoAlCoda,
    Coda,
    Segno,
    None,
}

export enum AlignmentType {
    Begin,
    End,
    Mid,
    Discontinue
}
