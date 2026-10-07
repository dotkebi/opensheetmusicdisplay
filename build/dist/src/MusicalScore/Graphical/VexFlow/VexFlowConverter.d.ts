import Vex from "vexflow";
import VF = Vex.Flow;
import { ClefEnum } from "../../VoiceData/Instructions/ClefInstruction";
import { ClefInstruction } from "../../VoiceData/Instructions/ClefInstruction";
import { Pitch } from "../../../Common/DataObjects/Pitch";
import { Fraction } from "../../../Common/DataObjects/Fraction";
import { RhythmInstruction } from "../../VoiceData/Instructions/RhythmInstruction";
import { KeyInstruction } from "../../VoiceData/Instructions/KeyInstruction";
import { AccidentalEnum } from "../../../Common/DataObjects/Pitch";
import { GraphicalNote } from "../GraphicalNote";
import { SystemLinesEnum } from "../SystemLinesEnum";
import { FontStyles } from "../../../Common/Enums/FontStyles";
import { Fonts } from "../../../Common/Enums/Fonts";
import { OutlineAndFillStyleEnum } from "../DrawingEnums";
import { ArticulationEnum, VoiceEntry } from "../../VoiceData/VoiceEntry";
import { SystemLinePosition } from "../SystemLinePosition";
import { GraphicalVoiceEntry } from "../GraphicalVoiceEntry";
import { OrnamentContainer } from "../../VoiceData/OrnamentContainer";
import { Notehead } from "../../VoiceData/Notehead";
import { EngravingRules } from "../EngravingRules";
import { ArpeggioType } from "../../VoiceData/Arpeggio";
/**
 * Helper class, which contains static methods which actually convert
 * from OSMD objects to VexFlow objects.
 */
export declare class VexFlowConverter {
    /** XML accidental parentheses/brackets are handled before formatting, at normal accidental scale. */
    static readonly HasXmlAccidentalParentheses: boolean;
    /**
     * Mapping from numbers of alterations on the key signature to major keys
     * @type {[alterationsNo: number]: string; }
     */
    private static majorMap;
    /**
     * Mapping from numbers of alterations on the key signature to minor keys
     * @type {[alterationsNo: number]: string; }
     */
    private static minorMap;
    /**
     * Convert a fraction to Vexflow string durations.
     * A duration like 5/16 (5 16th notes) can't be represented by a single (dotted) note,
     *   so we need to return multiple durations (e.g. for 5/16th ghost notes).
     * Currently, for a dotted quarter ghost note, we return a quarter and an eighth ghost note.
     *   We could return a dotted quarter instead, but then the code would need to distinguish between
     *   notes that can be represented as dotted notes and notes that can't, which would complicate things.
     *   We could e.g. add a parameter "allowSingleDottedNote" which makes it possible to return single dotted notes instead.
     * But currently, this is only really used for Ghost notes, so it doesn't make a difference visually.
     *   (for other uses like StaveNotes, we calculate the dots separately)
     * @param fraction a fraction representing the duration of a note
     * @returns {string[]} Vexflow note type strings (e.g. "h" = half note)
     */
    static durations(fraction: Fraction, isTuplet: boolean): string[];
    /**
     * Takes a Pitch and returns a string representing a VexFlow pitch,
     * which has the form "b/4", plus its alteration (accidental)
     * @param pitch
     * @returns {string[]}
     */
    static pitch(pitch: Pitch, isRest: boolean, clef: ClefInstruction, notehead?: Notehead, octaveOffsetGiven?: number): [string, string, ClefInstruction];
    static restToNotePitch(pitch: Pitch, clefType: ClefEnum): Pitch;
    /** returns the Vexflow code for a note head. Some are still unsupported, see Vexflow/tables.js */
    static NoteHeadCode(notehead: Notehead): string;
    static GhostNotes(frac: Fraction): VF.GhostNote[];
    /**
     * Adds an accidental to the key (note) of the given index of a VexFlow note.
     * @param inParentheses Draw the accidental in parentheses (a cautionary accidental).
     *   For an accidental made of two signs, only the one next to the notehead gets them,
     *   as VexFlow draws parentheses around a single accidental sign.
     */
    private static addAccidental;
    /**
     * Convert a GraphicalVoiceEntry to a VexFlow StaveNote
     * @param gve the GraphicalVoiceEntry which can hold a note or a chord on the staff belonging to one voice
     * @returns {VF.StaveNote}
     */
    /**
     * The side of a rest in a staff with several voices, if both its voice's notes say so: above (1) the other voices' notes
     * at its time if the nearest note of its voice in the measure is higher than them and the MusicXML gives the voice's notes
     * upward stems, below (-1) if it's lower and they have downward stems, else undefined (the side by the voice number).
     * The rests were put above for voice 1 (or 5) only, so the rest of another voice that is the upper one by its stems
     * and its notes was put below, under the other voice's stems (Couperin, Concerts royaux II, Prelude m1-2: the quarter rest
     * of voice 6, far below the left hand's D3). Both are required: voices cross, and stems can be the other way round
     * (e.g. Concerts royaux IV, Courante françoise m6: a rest of the voice with downward stems above the other voice).
     * A voice without any stems in the measure goes by its notes alone.
     * @param rest the rest's voice entry
     * @param highestOther the highest halftone of the other voices' notes at the rest's time
     * @param lowestOther the lowest halftone of the other voices' notes at the rest's time
     */
    static restSideFromVoice(rest: VoiceEntry, highestOther: number, lowestOther: number): number;
    static StaveNote(gve: GraphicalVoiceEntry): VF.StaveNote;
    /** Whether another voice has a visible note (or rest) on the note's staff sounding at the same time as it (Schumann,
     *  Myrthen 2 m19: the left hand's chords after the first beat are alone, their staccatos stay above). */
    static hasOtherVoiceAtTime(gNote: GraphicalNote): boolean;
    static generateArticulations(vfnote: VF.StemmableNote, gNote: GraphicalNote, rules: EngravingRules): void;
    /**
     * A fermata or an aspiration on the side of its note where the note has an ornament goes beyond the ornament, not
     * between it and the note (Couperin, Concerts royaux I Menuet en trio m8-9, IV Rigaudon m22, as in the 1722 print).
     * VexFlow formats the articulations before the ornaments, so an articulation is always next to its note. This one
     * takes no text line: the ornament keeps the place it has alone (clear of the staff, the other voices' stems and a
     * slur) and draws the articulation over its ink, which then covers both (VexFlowPatch articulation.js, ornament.js).
     * Other articulations (a staccato, an accent) stay next to the note. The aspiration is a host's custom articulation
     * (Opusis 02front), which calls this for it. As in osmd_dart (VexFlowStackedArticulation).
     */
    static stackOutsideOrnament(vfArt: VF.Articulation, gNote: GraphicalNote): void;
    /**
     * One fermata at one place: another voice of the note's staff entry (same staff, same time) has the same fermata on
     * the same side, and its note is further out on that side (or as far, and it comes first). Couperin I Menuet en trio
     * m8-9: the two upper voices, each with a fermata over it, were drawn as two arcs; the one over the upper voice (beyond
     * its tremblement) stands for both, as each part's single fermata in the 1722 print. A fermata is always above here
     * (an inverted one below). As in osmd_dart (VexFlowMeasure._fermataDrawnByOtherVoice).
     */
    static fermataDrawnByOtherVoice(gNote: GraphicalNote, fermata: ArticulationEnum, position: number): boolean;
    /**
     * An articulation on the notehead side of its note goes beyond the notes (and stems) of the other voices of the staff
     * at the same time that are on that side: else it is drawn between them (Schumann, Myrthen 11 m12: the accent of the
     * left hand's lower voice, F#3 with a down stem, inside the upper voice's chord A3-F#4 above it; the engraving puts it
     * above that chord's stem). The other voices' notes are formatted only when the measure is drawn, so the shift is
     * computed then (also for the skyline). It is added to the articulation's own y shift (e.g. at a slur start).
     */
    static keepArticulationClearOfOtherVoices(vfArt: VF.Articulation, gNote: GraphicalNote): void;
    /** The y shift (px) that puts the articulation beyond the other voices' notes on its side, see keepArticulationClearOfOtherVoices(). */
    private static otherVoicesArticulationShift;
    static generateOrnaments(vfnote: VF.StemmableNote, oContainer: OrnamentContainer): void;
    /** The VexFlow accidentals of an ornament's accidental mark, from left to right. As for notes in StaveNote(),
     *  marks without a glyph of their own are drawn as two accidentals, e.g. sharp-sharp as two sharps. */
    static ornamentAccidentals(accidental: AccidentalEnum, accidentalXml: string): string[];
    static StrokeTypeFromArpeggioType(arpeggioType: ArpeggioType): VF.Stroke.Type;
    /**
     * Convert a set of GraphicalNotes to a VexFlow StaveNote
     * @param notes form a chord on the staff
     * @returns {VF.StaveNote}
     */
    static CreateTabNote(gve: GraphicalVoiceEntry): VF.TabNote;
    /**
     * Convert a ClefInstruction to a string represention of a clef type in VexFlow.
     *
     * @param clef The OSMD object to be converted representing the clef
     * @param size The VexFlow size to be used. Can be `default` or `small`.
     * As soon as #118 is done, this parameter will be dispensable.
     * @returns    A string representation of a VexFlow clef
     * @see        https://github.com/0xfe/vexflow/blob/master/src/clef.js
     * @see        https://github.com/0xfe/vexflow/blob/master/tests/clef_tests.js
     */
    static Clef(clef: ClefInstruction, size?: string): {
        type: string;
        size: string;
        annotation: string;
    };
    /**
     * Convert a RhythmInstruction to a VexFlow TimeSignature object
     * @param rhythm
     * @returns {VF.TimeSignature}
     * @constructor
     */
    static TimeSignature(rhythm: RhythmInstruction): VF.TimeSignature;
    /**
     * Convert a KeyInstruction to a string representing in VexFlow a key
     * @param key
     * @returns {string}
     */
    static keySignature(key: KeyInstruction): string;
    /**
     * Converts a lineType to a VexFlow StaveConnector type
     * @param lineType
     * @returns {any}
     */
    static line(lineType: SystemLinesEnum, linePosition: SystemLinePosition): any;
    /**
     * Construct a string which can be used in a CSS font property
     * @param fontSize
     * @param fontStyle
     * @param font
     * @returns {string}
     */
    static font(fontSize: number, fontStyle: FontStyles, font: Fonts, rules: EngravingRules, fontFamily?: string): string;
    /**
     * Converts the style into a string that VexFlow RenderContext can understand
     * as the weight of the font
     */
    static fontStyle(style: FontStyles): string;
    /**
     * Convert OutlineAndFillStyle to CSS properties
     * @param styleId
     * @returns {string}
     */
    static style(styleId: OutlineAndFillStyleEnum): string;
}
