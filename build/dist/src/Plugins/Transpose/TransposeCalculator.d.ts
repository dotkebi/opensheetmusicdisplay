import { ITransposeCalculator } from "../../MusicalScore/Interfaces";
import { Pitch } from "../../Common/DataObjects";
import { KeyInstruction } from "../../MusicalScore/VoiceData/Instructions";
/** Calculates transposition of individual notes and keys,
 * which is used by multiple OSMD classes to transpose the whole sheet.
 * Note: This class may not look like much, but a lot of thought has gone into the algorithms,
 * and the exact usage within OSMD classes. */
export declare class TransposeCalculator implements ITransposeCalculator {
    private static keyMapping;
    private static noteEnums;
    transposePitch(pitch: Pitch, currentKeyInstruction: KeyInstruction, halftones: number): Pitch;
    /** The key signature's spelling of a white key (its halftone, 0 = C to 11 = B) with the neighboring letter, if it has one:
     * E# for F with 6 or 7 sharps, B# for C with 7 sharps, Cb for B with 6 or 7 flats, Fb for E with 7 flats.
     * The octave is the white key's: B# is in the octave below its C, Cb in the octave above its B. */
    private static keySignatureSpelling;
    /** Whether the pitch is altered as the key signature (in fifths) alters its letter, e.g. B in C major and Bb in Cb major, not Cb in C major. */
    private static isSpelledLikeKeySignature;
    transposeKey(keyInstruction: KeyInstruction, transpose: number): void;
}
