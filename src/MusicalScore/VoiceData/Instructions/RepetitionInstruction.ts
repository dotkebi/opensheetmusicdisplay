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
     * The name of a segno (<sound segno="...">), or for a D.S. the name of the segno it goes back to (<sound dalsegno="...">).
     * When D.S. name their segno, a D.S. goes back to the segno of its name, and a named segno that no D.S. names is drawn only
     * (it is no repetition's start): e.g. the segno that the Arban edition prints above each D.C. barline next to the segno of
     * the variation the D.C. goes back to (Arban, Fantaisie brillante). Undefined: the last segno before the D.S.
     */
    public SegnoLabel: string;
    /**
     * Whether the RepetitionCalculator added this instruction for playback, without a sign for it in the MusicXML:
     * the backward jump that closes a forward repeat without a backward repeat at the end of the piece.
     * It is played, but not drawn (no backward repeat barline that the score doesn't have).
     * Also an instruction read from a <sound> of the measure (not of a direction), which prints nothing.
     */
    public Implicit: boolean = false;
    /**
     * Where the MusicXML puts the signs of a segno: the staff and the timestamp in the measure,
     * one per <direction> with the sign, e.g. one above each hand of a piano part at different notes
     * (Couperin, Concerts royaux III, Allemande m17). Only the ones of the first part with the segno in the measure.
     * Empty for a segno from words: drawn at the start of the measure, above the top staff.
     * For the words of an instruction (e.g. "D.S. al Fine", "Fine"), the staff and placement of their directions: the words are drawn
     * once, at the first of them (Schirmer, Twenty-Four Italian Songs and Arias, Pur dicesti m111: below the left hand).
     * Empty: above the top staff.
     */
    public SymbolPlacements: RepetitionSymbolPlacement[] = [];

    /**
     * Whether the instruction is the segno sign that is printed with the D.C. or D.S. of its measure, at the end of the measure
     * (Schirmer, Twenty-Four Italian Songs and Arias, Pur dicesti m111: the sign above "D.S. al Fine", in the same <direction>):
     * the sign shows where the D.S. goes back to. It is drawn where it is, but is neither the start of a repetition nor a segno that a
     * D.S. goes back to (it would go back to itself).
     * @param instructions the instructions read, among them the D.C. or D.S. of the measure
     * @param measure the measure of the instruction, whose end is where the sign has to be
     */
    public static IsSignOfJump(instruction: RepetitionInstruction, instructions: RepetitionInstruction[], measure: { Duration: Fraction }): boolean {
        if (instruction.type !== RepetitionInstructionEnum.Segno || !measure || instruction.SymbolPlacements.length === 0 ||
            !instruction.SymbolPlacements.every(placement => placement.timestamp.gte(measure.Duration))) {
            return false;
        }
        return instructions.some(other => other.measureIndex === instruction.measureIndex && RepetitionInstruction.IsJumpBack(other.type));
    }

    /** Whether the type is a D.C. or D.S. (with or without al Fine / al Coda). */
    public static IsJumpBack(type: RepetitionInstructionEnum): boolean {
        switch (type) {
            case RepetitionInstructionEnum.DaCapo:
            case RepetitionInstructionEnum.DaCapoAlFine:
            case RepetitionInstructionEnum.DaCapoAlCoda:
            case RepetitionInstructionEnum.DalSegno:
            case RepetitionInstructionEnum.DalSegnoAlFine:
            case RepetitionInstructionEnum.DalSegnoAlCoda:
                return true;
            default:
                return false;
        }
    }

    public CompareTo(obj: object): number {
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

/** Where a sign of a repetition instruction (a segno) or its words are drawn, see RepetitionInstruction.SymbolPlacements. */
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
