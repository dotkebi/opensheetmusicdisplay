import Vex from "vexflow";
import VF = Vex.Flow;

/**
 * An <accidental-mark> of a note outside <ornaments> (VoiceEntry.AccidentalMarks): an editorial accidental printed
 * above the note, or below it (Saint-Saëns, Bassoon Sonata Op. 168: a natural over the note).
 * It is placed like an articulation (VexFlow formats it with them, next to the note and outside the staff, under an
 * ornament of the note), and drawn at the size of an ornament's accidental mark (ornament.js: font scale / 1.3).
 * As in osmd_dart (VexFlowAccidentalMark).
 */
export class VexFlowAccidentalMark extends VF.Articulation {
    /** The VexFlow accidental code, e.g. "n". */
    public readonly accidental: string;

    constructor(accidental: string, position: number) {
        super("a."); // replaced by the accidental's glyph
        this.accidental = accidental;
        const self: any = this;
        const code: string = (VF as any).accidentalCodes(accidental).code;
        self.articulation = { code, between_lines: false };
        self.glyph = new VF.Glyph(code, self.render_options.font_scale / 1.3);
        this.setWidth(self.glyph.getMetrics().width);
        this.setPosition(position);
    }
}
