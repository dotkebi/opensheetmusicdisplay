declare const VexFlowNoteheadParenthesis_base: any;
/**
 * Parentheses around one notehead of a StaveNote, for MusicXML <notehead parentheses="yes">
 * (an editorial or optional note, e.g. Bellini, Il fervido desiderio m.10).
 * VexFlow 1.2.93 has no Parenthesis modifier (VexFlow 4 added one), so this draws the glyphs
 * VexFlow uses around cautionary accidentals, left and right of the notehead at the modifier's index.
 * Horizontal space is reserved in ModifierContext.preFormat() through the VexFlowPatch hook
 * ModifierContext.PREFORMAT_CUSTOM, after accidentals and dots, so the parentheses enclose them.
 */
export declare class VexFlowNoteheadParenthesis extends VexFlowNoteheadParenthesis_base {
    /** A getter like VF.Modifier.CATEGORY: assigning a static property over the base class getter throws. */
    static get CATEGORY(): string;
    /** Horizontal padding between the glyph and the notehead or its other modifiers, in px. */
    static Padding: number;
    /** Same as VF.Accidental.render_options.font_scale, so the parentheses match cautionary accidentals. */
    private static readonly FontScale;
    /** Called by the patched ModifierContext.preFormat() with all parentheses of one note. */
    static format(parentheses: VexFlowNoteheadParenthesis[], state: any): boolean;
    private glyph;
    constructor(position: number);
    getCategory(): string;
    draw(): void;
}
export {};
