import Vex from "vexflow";
import VF = Vex.Flow;
import { EngravingRules } from "../EngravingRules";
import { VoiceEntry } from "../../VoiceData/VoiceEntry";
import { Note } from "../../VoiceData/Note";

/**
 * The staccato of a note with a single-note tremolo, drawn as one dot per repetition the strokes stand for, in a row
 * centred on the note where the staccato goes (a half note with one stroke: four dots, four detached eighths), as
 * engravers write detached repetitions (Mozart, Bassoon Concerto K.191, Richault 17178R, I piano m45, m65).
 * VexFlow formats it as the one staccato it replaces, so the row takes the staccato's text line and the note's spacing
 * is unchanged. As in osmd_dart (VexFlowTremoloStaccato).
 */
export class VexFlowTremoloStaccato extends VF.Articulation {
    /** The number of dots. */
    public readonly dotCount: number;
    /** Distance between the centres of neighbouring dots, in px. */
    public readonly dotSpacing: number;

    constructor(dotCount: number, dotSpacing: number) {
        super("a.");
        this.dotCount = dotCount;
        this.dotSpacing = dotSpacing;
    }

    /** The number of dots of the staccato of voiceEntry (EngravingRules.RenderTremoloStaccatoDots): the written value of
     *  a note without a flag (a quarter or longer) with a single-note tremolo divided by the value of its strokes (one
     *  stroke: an eighth), or 1. */
    public static dotCount(voiceEntry: VoiceEntry, rules: EngravingRules): number {
        if (!rules.RenderTremoloStaccatoDots) {
            return 1;
        }
        for (const note of voiceEntry?.Notes ?? []) {
            const count: number = VexFlowTremoloStaccato.repetitions(note);
            if (count > 1) {
                return count <= rules.TremoloStaccatoDotsMaxCount ? count : 1;
            }
        }
        return 1;
    }

    /** How many times note's single-note tremolo repeats it, or 0 for a note without one. */
    private static repetitions(note: Note): number {
        const tremolo: any = note.TremoloInfo;
        if (!tremolo || !(tremolo.tremoloStrokes > 0) || tremolo.tremoloUnmeasured ||
            tremolo.tremoloBetweenNotesStart || tremolo.tremoloBetweenNotesStop || !note.TypeLength ||
            note.TypeLength.RealValue < 0.25) {
            // (a note with a flag or a beam keeps its staccato: its strokes add to its own beams, and the row of dots
            //   is written under notes without, Enescu, Cantabile et Presto, eighths with a stroke and a staccato)
            return 0;
        }
        const dots: number = note.DotsXml ?? 0;
        const written: number = note.TypeLength.RealValue * (2 - Math.pow(0.5, dots));
        const strokeValue: number = 1 / (4 * Math.pow(2, tremolo.tremoloStrokes));
        return Math.round(written / strokeValue);
    }

    public draw(): void {
        const xShift: number = (this as any).x_shift ?? 0;
        let ink: {left: number, top: number, right: number, bottom: number} = undefined;
        try {
            for (let index: number = 0; index < this.dotCount; index++) {
                (this as any).x_shift = xShift + (index - (this.dotCount - 1) / 2) * this.dotSpacing;
                super.draw();
                const dot: {left: number, top: number, right: number, bottom: number} = (this as any).drawnInk;
                if (dot) {
                    ink = ink ? {left: Math.min(ink.left, dot.left), top: Math.min(ink.top, dot.top),
                                 right: Math.max(ink.right, dot.right), bottom: Math.max(ink.bottom, dot.bottom)} : {...dot};
                }
            }
        } finally {
            (this as any).x_shift = xShift;
        }
        (this as any).drawnInk = ink;
    }
}
