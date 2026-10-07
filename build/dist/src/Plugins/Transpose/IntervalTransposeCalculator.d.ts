import { ITransposeCalculator } from "../../MusicalScore/Interfaces/ITransposeCalculator";
import { Pitch } from "../../Common/DataObjects/Pitch";
import { KeyInstruction } from "../../MusicalScore/VoiceData/Instructions/KeyInstruction";
/** Transposes notes and chord symbols by interval, so that their spelling stays consistent with the key signature.
 *
 * The default TransposeCalculator only counts halftones and chooses each note's enharmonic spelling
 * (sharp or flat) by the transposed key signature. Notes that aren't in the key then change their function:
 * in C major, transposing the leading tone A# (to B) down a whole tone to Bb major gives Ab instead of G#,
 * because Bb major prefers flats. The result sounds the same, but it isn't what an engraver (or MuseScore, Sibelius,
 * Finale...) would write.
 *
 * This calculator moves every note by the same interval instead: a number of letter steps
 * (MusicXML's <transpose><diatonic>) plus the number of halftones (<chromatic>), like MuseScore's "transpose chromatically".
 * The letter steps follow from the original and transposed key signatures, e.g. C major -> Bb major is one letter down,
 * so A# -> G#, D# -> C#, and C -> Bb.
 *
 * Key signatures are still transposed by the default TransposeCalculator (keyMapping), so the choice of Db vs C#
 * etc. is unchanged. If the interval would need more than a double sharp/flat, or the pitch has a microtonal
 * accidental, the default calculator is used for that note.
 *
 * Chord symbols are spelled more simply by default (SimpleChordSymbolSpelling): a root or bass that the interval
 * would spell with a double sharp/flat or as Fb, Cb, E# or B# is spelled like the default calculator does,
 * e.g. Ebmaj7 in D major transposed by +1 (Eb major) is Emaj7, not Fbmaj7, as lead sheet readers expect.
 *
 * Opt-in, like the default calculator:
 *   osmd.TransposeCalculator = new IntervalTransposeCalculator();
 *   osmd.Sheet.Transpose = -2;
 */
export declare class IntervalTransposeCalculator implements ITransposeCalculator {
    /** Spell a chord symbol root or bass that the interval would spell with a double sharp/flat or as Fb, Cb, E# or B#
     * like the default calculator does, e.g. Ebmaj7 in D major transposed by +1 as Emaj7 instead of Fbmaj7.
     * The notes keep their interval spelling. Default: true. */
    SimpleChordSymbolSpelling: boolean;
    /** Spell a note or chord symbol that the interval would spell with a double sharp/flat like the default calculator does instead,
     * e.g. Ab in C major transposed by +1 (Db major) as A instead of Bbb.
     * Default: false, i.e. double sharps/flats are used (like MuseScore with "Use double sharps and flats"). */
    AvoidDoubleAccidentals: boolean;
    /** Letters C D E F G A B by letter index. */
    private static readonly letters;
    /** Letter index of the major tonic for key signatures -7..7: Cb Gb Db Ab Eb Bb F C G D A E B F# C#. */
    private static readonly tonicLetterByFifths;
    private readonly fallback;
    /** @param fallback transposes the key signatures, and the notes this calculator can't spell (default: TransposeCalculator) */
    constructor(fallback?: ITransposeCalculator);
    transposeKey(keyInstruction: KeyInstruction, transpose: number): void;
    /** @param chordSymbol true for the root or bass of a chord symbol, which is spelled simply if SimpleChordSymbolSpelling is set */
    transposePitch(pitch: Pitch, currentKeyInstruction: KeyInstruction, halftones: number, chordSymbol?: boolean): Pitch;
    /** Transposes by interval, or like the default calculator if the interval spelling isn't wanted:
     * a double sharp/flat (avoidDoubleAccidentals), or a sharp/flat that sounds like a natural (avoidWhiteKeyAccidentals: Fb, Cb, E#, B#). */
    private transposeByInterval;
    /** Whether the spelled pitch sounds like a natural, e.g. Fb (E), Cb (B), E# (F), B# (C). */
    private static isWhiteKey;
    /** The number of letter steps to move every note by, for a transposition by the given halftones
     * from the original key signature (fifths, -7..7) to the transposed one.
     * The step count is congruent (mod 7) to the letter distance between the two major tonics,
     * and closest to the proportional letter distance of the halftones (7 letters per 12 halftones),
     * e.g. -2 halftones from C to Bb -> -1, +12 -> 7. */
    private static letterSteps;
    /** Moves a spelled pitch by the given letter steps and halftones.
     * Returns undefined if the result would need more than a double sharp/flat, or the alteration is microtonal. */
    private static spell;
    private static normalizeFifths;
}
