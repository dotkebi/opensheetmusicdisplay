import Vex from "vexflow";
import VF = Vex.Flow;
import { ColoringOptions, GraphicalNote, VisibilityOptions } from "../GraphicalNote";
import { Note } from "../../VoiceData/Note";
import { ClefInstruction } from "../../VoiceData/Instructions/ClefInstruction";
import { Pitch } from "../../../Common/DataObjects/Pitch";
import { Fraction } from "../../../Common/DataObjects/Fraction";
import { OctaveEnum } from "../../VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import { GraphicalVoiceEntry } from "../GraphicalVoiceEntry";
import { KeyInstruction } from "../../VoiceData/Instructions/KeyInstruction";
import { EngravingRules } from "../EngravingRules";
/**
 * The VexFlow version of a [[GraphicalNote]].
 */
export declare class VexFlowGraphicalNote extends GraphicalNote {
    constructor(note: Note, parent: GraphicalVoiceEntry, activeClef: ClefInstruction, octaveShift: OctaveEnum, rules: EngravingRules, graphicalNoteLength?: Fraction);
    octaveShift: OctaveEnum;
    vfpitch: [string, string, ClefInstruction];
    vfnote: [VF.StemmableNote, number];
    vfnoteIndex: number;
    private clef;
    /**
     * Update the pitch of this note. Necessary in order to display accidentals correctly.
     * This is called by VexFlowGraphicalSymbolFactory.addGraphicalAccidental.
     * @param pitch
     */
    setAccidental(pitch: Pitch): void;
    drawPitch(pitch: Pitch): Pitch;
    Transpose(keyInstruction: KeyInstruction, activeClef: ClefInstruction, halfTones: number, octaveEnum: OctaveEnum): Pitch;
    /**
     * Set the VexFlow StaveNote corresponding to this GraphicalNote, together with its index in the chord.
     * @param note
     * @param index
     */
    setIndex(note: VF.StemmableNote, index: number): void;
    notehead(vfNote?: VF.StemmableNote): {
        line: number;
    };
    /**
     * Gets the clef for this note
     */
    Clef(): ClefInstruction;
    /**
     * Gets the id of the SVGGElement containing this note, given the SVGRenderer is used.
     * This is for low-level rendering hacks and should be used with caution.
     */
    getSVGId(): string;
    /** Toggle visibility of the note, making it and its stem and beams invisible for `false`.
     * By default, this will also hide the note's slurs and ties (see visibilityOptions).
     * (This only works with the default SVG backend, not with the Canvas backend/renderer)
     * To get a GraphicalNote from a Note, use osmd.EngravingRules.GNote(note).
     */
    setVisible(visible: boolean, visibilityOptions?: VisibilityOptions): void;
    /**
     * Gets the SVGGElement containing this note, given the SVGRenderer is used.
     * This is for low-level rendering hacks and should be used with caution.
     */
    getSVGGElement(): SVGGElement;
    /** Gets the SVG path element of the note's stem. */
    getStemSVG(): HTMLElement;
    /** Gets the SVG path elements of the beams starting on this note. */
    getBeamSVGs(): HTMLElement[];
    /** Gets the SVG path elements of the note's ledger lines. */
    getLedgerLineSVGs(): HTMLElement[];
    /** Gets the SVG path elements of the note's tie curves. */
    getTieSVGs(): HTMLElement[];
    /** Gets the SVG path elements of the note's slur curve. */
    getSlurSVGs(): HTMLElement[];
    /** Gets the SVG elements of the note heads, e.g. the paths of a chord's heads, or the fret numbers of a TAB note (and its chord). */
    getNoteheadSVGs(): HTMLElement[];
    getFlagSVG(): HTMLElement;
    getVFNoteSVG(): HTMLElement;
    /** Gets the SVG elements of the note's modifiers: the groups of a stave note's modifiers (e.g. accidentals),
     *  or the shapes of a TAB note's modifiers (e.g. a bend's curve, arrow and label). */
    getModifierSVGs(): HTMLElement[];
    /** Whether the note is drawn in a TAB staff, as a fret number (a Vexflow TabNote, or a GraceTabNote for a grace note). */
    private get isTabNote();
    /**
     * Gets the SVG elements a TAB note is drawn with (see TabNote.draw() in the VexFlowPatch): first a background rect and a
     * fret number (a text, or a path for an x notehead) for each position of its chord, then its modifiers, e.g. a bend.
     * A grace note is drawn with its main note, in its own group, which is skipped.
     */
    private getTabNoteSVGs;
    /** Colors the paths of a group, e.g. of a note head, or a single shape of a TAB note: its fill,
     *  or its stroke if it's only a line, like the curve of a bend. */
    private static colorShapes;
    /** Change the color of a note (without re-rendering). See ColoringOptions for options like applyToBeams etc.
     * For a TAB note, the note heads are its fret numbers, and its modifiers e.g. bends.
     * This requires the SVG backend (default, instead of canvas backend).
     */
    setColor(color: string, coloringOptions?: ColoringOptions): void;
}
