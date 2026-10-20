import { PointF2D } from "../../Common/DataObjects/PointF2D";
import { KeyboardHand } from "../VoiceData/OtherTechnical";
import { Note } from "../VoiceData/Note";

/**
 * A keyboard hand bracket (SMuFL keyboardPlayWithLH / keyboardPlayWithRH, a MusicXML other-technical of a note):
 * left of the note, a short horizontal hook at the height of the notehead pointing at it, and a vertical line from the hook
 * towards the hand that plays the note: down for the left hand (hook at the top), up for the right hand (hook at the bottom).
 * The line reaches the text of the hand (l.h., r.h., m.s., m.d.) at the note's time on its side, if there is one,
 * otherwise it is EngravingRules.KeyboardHandBracketLength long (MusicXML has no attribute for its length).
 * The fonts have no glyph for it, it is drawn as a path.
 * All coordinates are in units relative to the staffline, like its sky and bottom line.
 */
export class GraphicalKeyboardHandBracket {
    constructor(note: Note, hand: KeyboardHand) {
        this.Note = note;
        this.Hand = hand;
    }

    public Note: Note;
    public Hand: KeyboardHand;
    /** Center of the vertical line. */
    public LineX: number;
    /** Right end of the hook. */
    public HookEndX: number;
    /** Center of the hook. */
    public HookY: number;
    /** Far end of the vertical line (below the hook for the left hand, above it for the right hand). */
    public EndY: number;
    public LineWidth: number;
    public SVGElement: Node;

    /** 1 if the vertical line goes down from the hook (left hand), -1 if it goes up (right hand). */
    public get Direction(): number {
        return this.Hand === KeyboardHand.Left ? 1 : -1;
    }

    /** The outline of the bracket (hook and line as one filled shape), relative to the staffline. */
    public outline(): PointF2D[] {
        const halfWidth: number = this.LineWidth / 2;
        const outerY: number = this.HookY - this.Direction * halfWidth; // the hook's edge away from the line
        const innerY: number = this.HookY + this.Direction * halfWidth;
        const left: number = this.LineX - halfWidth;
        const right: number = this.LineX + halfWidth;
        return [
            new PointF2D(left, outerY),
            new PointF2D(this.HookEndX, outerY),
            new PointF2D(this.HookEndX, innerY),
            new PointF2D(right, innerY),
            new PointF2D(right, this.EndY),
            new PointF2D(left, this.EndY),
        ];
    }
}
