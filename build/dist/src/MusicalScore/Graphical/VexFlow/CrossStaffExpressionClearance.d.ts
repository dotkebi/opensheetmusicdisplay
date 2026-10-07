import { PointF2D } from "../../../Common/DataObjects/PointF2D";
import { StaffLine } from "../StaffLine";
import { CrossStaffBeam } from "./CrossStaffBeam";
import { CrossStaffCurve } from "./CrossStaffCurve";
/** A rectangle in absolute units (staff space = 1). */
export declare class ClearanceBox {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    constructor(left: number, top: number, right: number, bottom: number);
    shifted(dy: number): ClearanceBox;
    inflated(d: number): ClearanceBox;
    overlaps(other: ClearanceBox): boolean;
    contains(p: PointF2D): boolean;
}
/**
 * Moves a text expression between or beside the staves of a system (a dynamic, a verbal dynamic, words, a tempo text)
 * off the cross-staff beams and curves as they are drawn (PROMPT-myrthen-cross-staff-skyline-two-pass, design (B)).
 *
 * The layout places the expressions before the staves' distance is known, so a cross-staff beam (its reservation is
 * the anchor stems and two spaces) and a curve between the staves (only reserved on its outer sides,
 * CrossStaffCurve.reserveOuterSides()) can come to lie over one (Myrthen 9 m2 sf at the end of a slur from the left
 * hand, 15 m16 ritard. under the top of a slur; corpus 0015 m15 "R. H.", 0064 m1 f under a beam). The drawer moves such
 * a text up or down to the nearest free place within MaxMove staff spaces: clear of the beams' and curves' ink by
 * Clearance, of the other expressions, lyrics, pedals and octave shifts of the system, and of the staves' notes (their
 * sky and bottom lines before the expressions, StaffLine.NotesSkyLine/NotesBottomLine). The layout (sky lines, the
 * staves' distance, the systems) is not changed: only where the text is drawn. A text with no free place within reach
 * stays (a stem or curve crossing the whole room between the staves cannot be cleared by any move). Wedges are not
 * moved (a hairpin row is aligned with its dynamics). Same as osmd-dart cross_staff_expression_clearance.dart.
 */
export declare class CrossStaffExpressionClearance {
    /** the farthest move, in staff spaces */
    static readonly MaxMove: number;
    static readonly Step: number;
    /** the least distance of a moved text from a beam's or curve's ink */
    static readonly Clearance: number;
    private readonly ink;
    private readonly lines;
    private readonly sampling;
    private constructor();
    get isEmpty(): boolean;
    /** The ink of the curves (calculated for drawing: their segments in absolute units) and the beams (post-formatted at
     *  the staves' final positions, VexFlow pixels over unitInPixels) of the system of the lines. */
    static build(curves: Iterable<CrossStaffCurve>, beams: Iterable<CrossStaffBeam>, lines: StaffLine[], sampling: number, unitInPixels: number): CrossStaffExpressionClearance;
    /** Whether the box touches the beams' and curves' ink. */
    touchesInk(box: ClearanceBox): boolean;
    /** Whether the box lies clear of the notes of every staff of the system: wholly above a staff's sky line or wholly
     *  below its bottom line (both before the expressions) over its width. */
    private clearOfStaves;
    /** The vertical move of the box (a text expression's, absolute units): 0 when it does not touch the beams' and
     *  curves' ink or when no free place is in reach. below: the text lies below its staff (tried downwards first, away
     *  from its staff), else above (tried upwards first). others: the boxes of the system's other expressions, lyrics,
     *  pedals and octave shifts, as drawn. */
    offset(box: ClearanceBox, below: boolean, others: ClearanceBox[]): number;
}
