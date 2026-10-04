import Vex from "vexflow";
import VF = Vex.Flow;

/**
 * Parentheses around one notehead of a StaveNote, for MusicXML <notehead parentheses="yes">
 * (an editorial or optional note, e.g. Bellini, Il fervido desiderio m.10).
 * VexFlow 1.2.93 has no Parenthesis modifier (VexFlow 4 added one), so this draws the glyphs
 * VexFlow uses around cautionary accidentals, left and right of the notehead at the modifier's index.
 * Horizontal space is reserved in ModifierContext.preFormat() through the VexFlowPatch hook
 * ModifierContext.PREFORMAT_CUSTOM, after accidentals and dots, so the parentheses enclose them.
 */
export class VexFlowNoteheadParenthesis extends (VF.Modifier as any) {
    /** A getter like VF.Modifier.CATEGORY: assigning a static property over the base class getter throws. */
    public static get CATEGORY(): string {
        return "osmdnoteheadparenthesis";
    }
    /** Horizontal padding between the glyph and the notehead or its other modifiers, in px. */
    public static Padding: number = 1;
    /** Same as VF.Accidental.render_options.font_scale, so the parentheses match cautionary accidentals. */
    private static readonly FontScale: number = 38;

    /** Called by the patched ModifierContext.preFormat() with all parentheses of one note. */
    public static format(parentheses: VexFlowNoteheadParenthesis[], state: any): boolean {
        if (!parentheses || parentheses.length === 0) {
            return false;
        }
        let leftWidth: number = 0;
        let rightWidth: number = 0;
        for (const parenthesis of parentheses) {
            const width: number = parenthesis.getWidth() + VexFlowNoteheadParenthesis.Padding;
            if (parenthesis.getPosition() === VF.Modifier.Position.LEFT) {
                parenthesis.setXShift(state.left_shift + VexFlowNoteheadParenthesis.Padding); // setXShift shifts left for LEFT
                leftWidth = Math.max(leftWidth, width);
            } else {
                parenthesis.setXShift(state.right_shift + VexFlowNoteheadParenthesis.Padding);
                rightWidth = Math.max(rightWidth, width);
            }
        }
        state.left_shift += leftWidth;
        state.right_shift += rightWidth;
        return true;
    }

    private glyph: any;

    constructor(position: number) {
        super();
        this.position = position;
        const left: boolean = position === VF.Modifier.Position.LEFT;
        this.glyph = new VF.Glyph((VF as any).accidentalCodes(left ? "{" : "}").code, VexFlowNoteheadParenthesis.FontScale);
        // left parenthesis: the render x is its right edge (like VF.Accidental's parentheses). right: its left edge.
        this.glyph.setOriginX(left ? 1.0 : 0.0);
        this.setWidth(this.glyph.getMetrics().width);
    }

    public getCategory(): string {
        return VexFlowNoteheadParenthesis.CATEGORY;
    }

    public draw(): void {
        this.checkContext();
        if (!this.note || this.index === null || this.index === undefined) {
            throw new Vex.RERR("NoAttachedNote", "Can't draw notehead parenthesis without a note and index.");
        }
        const start: {x: number, y: number} = this.note.getModifierStartXY(this.position, this.index);
        this.glyph.render(this.context, start.x + this.x_shift, start.y + this.y_shift);
        this.setRendered();
    }
}

// Register with the VexFlowPatch hook (modifiercontext.js), so ModifierContext reserves space for the parentheses.
const modifierContextClass: any = VF.ModifierContext;
if (!modifierContextClass.PREFORMAT_CUSTOM) {
    modifierContextClass.PREFORMAT_CUSTOM = [];
}
if (modifierContextClass.PREFORMAT_CUSTOM.indexOf(VexFlowNoteheadParenthesis) < 0) {
    modifierContextClass.PREFORMAT_CUSTOM.push(VexFlowNoteheadParenthesis);
}
