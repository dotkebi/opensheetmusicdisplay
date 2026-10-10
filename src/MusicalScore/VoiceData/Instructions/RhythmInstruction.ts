import {AbstractNotationInstruction} from "./AbstractNotationInstruction";
import {Fraction} from "../../../Common/DataObjects/Fraction";

/**
 * A [[RhythmInstruction]] is the time signature which specifies the number of beats in each bar, and the value of one beat.
 */
export class RhythmInstruction extends AbstractNotationInstruction {
    constructor(rhythm: Fraction, rhythmSymbolEnum: RhythmSymbolEnum) {
        super(undefined); // FIXME no parent SourceStaffEntry
        this.rhythm = rhythm;
        this.numerator = rhythm.Numerator;
        this.denominator = rhythm.Denominator;
        this.symbolEnum = rhythmSymbolEnum;
    }

    private numerator: number;
    private denominator: number;
    private rhythm: Fraction;
    private symbolEnum: RhythmSymbolEnum;
    /** Whether this time signature was not given in the source (e.g. MusicXML), but synthesized by default,
     * e.g. a default 4/4 for a sample without a time signature like Satie's Gnossiennes.
     * Such a time signature is not rendered by default (see EngravingRules.RenderTimeSignaturesForSamplesWithoutTimeSignature). */
    public SynthesizedFromNoTimeSignature: boolean = false;
    /** The time signature printed next to it (MusicXML `<interchangeable>`), e.g. 3/4 to the right of 9/8
     * (Wagner, Siegmunds Liebeslied m1: "9/8 3/4" above the violin, the cello and the right hand).
     * It is drawn only; the measure is as long as [[Rhythm]]. Undefined: none. */
    public Interchangeable: Fraction;
    /** Reader only: read from the staff's own `<time number="N">` (or kept on a staff without one, see
     * InstrumentReader.pendingStaffRhythm) —
     * kept on its staff when the reader evens out the staves' time signatures
     * (MusicSheetReader.checkIfRhythmInstructionsAreSetAndEqual). */
    public ReadForItsStaff: boolean = false;

    public get Rhythm(): Fraction {
        return this.rhythm;
    }

    public set Rhythm(value: Fraction) {
        this.rhythm = value;
    }

    public get SymbolEnum(): RhythmSymbolEnum {
        return this.symbolEnum;
    }

    public set SymbolEnum(value: RhythmSymbolEnum) {
        this.symbolEnum = value;
    }

    public clone(): RhythmInstruction {
        const clone: RhythmInstruction = new RhythmInstruction(this.rhythm.clone(), this.symbolEnum);
        clone.SynthesizedFromNoTimeSignature = this.SynthesizedFromNoTimeSignature;
        // the reader clones the rhythm onto staves without one; a <time print-object="no"> stays hidden on each
        clone.PrintObject = this.PrintObject;
        clone.Interchangeable = this.Interchangeable?.clone();
        clone.ReadForItsStaff = this.ReadForItsStaff;
        return clone;
    }

    public OperatorEquals(rhythm2: RhythmInstruction): boolean {
        const rhythm1: RhythmInstruction = this;
        if (rhythm1 === rhythm2) {
            return true;
        }
        if (!rhythm1 || !rhythm2) {
            return false;
        }
        return (rhythm1.numerator === rhythm2.numerator && rhythm1.denominator === rhythm2.denominator);
    }

    /** Whether it is drawn as rhythm2: the same signature, symbol and interchangeable signature (see [[Interchangeable]]). */
    public drawnAs(rhythm2: RhythmInstruction): boolean {
        const i1: Fraction = this.Interchangeable;
        const i2: Fraction = rhythm2.Interchangeable;
        return this.OperatorEquals(rhythm2) &&
            this.symbolEnum === rhythm2.symbolEnum &&
            ((!i1 && !i2) || (i1 && i2 && i1.Numerator === i2.Numerator && i1.Denominator === i2.Denominator));
    }

    public OperatorNotEqual(rhythm2: RhythmInstruction): boolean {
        const rhythm1: RhythmInstruction = this;
        return !(rhythm1 === rhythm2);
    }

    public ToString(): string {
        return "Rhythm: " + this.rhythm.toString();
    }
}

export enum RhythmSymbolEnum {
    NONE = 0,
    COMMON = 1,
    CUT = 2,
}
