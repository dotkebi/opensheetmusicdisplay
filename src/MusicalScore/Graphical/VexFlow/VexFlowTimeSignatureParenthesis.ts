import Vex from "vexflow";
import VF = Vex.Flow;

/**
 * A parenthesis around an interchangeable time signature at the begin of a stave, for MusicXML
 * <interchangeable><time-relation>parentheses</time-relation> (Bowen, Viola Sonata No. 2 m477: "(12/8) 4/4").
 * VexFlow 1.2.93's TimeSignature has no parenthesis glyph, so this draws the glyph VexFlow uses around cautionary
 * accidentals, scaled to the height of a time signature and centered on the middle line.
 * Its category is the time signature's, so that Stave.format() keeps it in order with the time signatures and
 * Stave.formatBegModifiers() aligns it with them (same as osmd-dart, which uses VexFlow 5's timeSigParens glyphs).
 */
export class VexFlowTimeSignatureParenthesis extends (VF.StaveModifier as any) {
    /** The font scale of the glyph: about the height of a time signature (four staff spaces). */
    public static FontScale: number = 96;

    private glyph: any;
    public hidden: boolean = false;

    constructor(left: boolean, padding: number) {
        super();
        this.setAttribute("type", "TimeSignatureParenthesis");
        this.setPosition(VF.StaveModifier.Position.BEGIN);
        this.glyph = new VF.Glyph((VF as any).accidentalCodes(left ? "{" : "}").code, VexFlowTimeSignatureParenthesis.FontScale);
        this.setWidth(this.glyph.getMetrics().width);
        this.setPadding(padding);
    }

    public getCategory(): string {
        return (VF.TimeSignature as any).CATEGORY;
    }

    public draw(): void {
        const stave: any = this.stave;
        if (!stave) {
            throw new Vex.RERR("TimeSignatureParenthesisError", "Can't draw a time signature parenthesis without a stave.");
        }
        this.setRendered();
        const group: any = stave.context.openGroup("timesignature");
        if (!this.hidden) {
            this.glyph.render(stave.context, this.x, stave.getYForLine(2));
        }
        if (this.hidden && group) {
            group.setAttribute("visibility", "hidden");
        }
        stave.context.closeGroup("timesignature");
    }
}
