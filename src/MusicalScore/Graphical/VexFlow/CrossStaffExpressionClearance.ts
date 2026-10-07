import Vex from "vexflow";
import VF = Vex.Flow;
import { PointF2D } from "../../../Common/DataObjects/PointF2D";
import { StaffLine } from "../StaffLine";
import { CrossStaffBeam } from "./CrossStaffBeam";
import { CrossStaffCurve } from "./CrossStaffCurve";

/** A rectangle in absolute units (staff space = 1). */
export class ClearanceBox {
    public readonly left: number;
    public readonly top: number;
    public readonly right: number;
    public readonly bottom: number;

    constructor(left: number, top: number, right: number, bottom: number) {
        this.left = left;
        this.top = top;
        this.right = right;
        this.bottom = bottom;
    }

    public shifted(dy: number): ClearanceBox {
        return new ClearanceBox(this.left, this.top + dy, this.right, this.bottom + dy);
    }

    public inflated(d: number): ClearanceBox {
        return new ClearanceBox(this.left - d, this.top - d, this.right + d, this.bottom + d);
    }

    public overlaps(other: ClearanceBox): boolean {
        return this.left < other.right && other.left < this.right && this.top < other.bottom && other.top < this.bottom;
    }

    public contains(p: PointF2D): boolean {
        return p.x >= this.left && p.x <= this.right && p.y >= this.top && p.y <= this.bottom;
    }
}

/** The ink of a cross-staff beam or curve as drawn: a closed polygon. */
class Ink {
    public readonly points: PointF2D[];
    public readonly bounds: ClearanceBox;

    constructor(points: PointF2D[]) {
        this.points = points;
        this.bounds = new ClearanceBox(Math.min(...points.map(p => p.x)), Math.min(...points.map(p => p.y)),
                                       Math.max(...points.map(p => p.x)), Math.max(...points.map(p => p.y)));
    }

    public intersects(box: ClearanceBox): boolean {
        if (!this.bounds.overlaps(box)) {
            return false;
        }
        if (this.points.some(p => box.contains(p))) {
            return true;
        }
        const corners: PointF2D[] = [new PointF2D(box.left, box.top), new PointF2D(box.right, box.top),
                                     new PointF2D(box.left, box.bottom), new PointF2D(box.right, box.bottom)];
        if (corners.some(c => this.inside(c))) {
            return true;
        }
        const edges: PointF2D[][] = [[corners[0], corners[1]], [corners[1], corners[3]], [corners[3], corners[2]], [corners[2], corners[0]]];
        for (let i: number = 0; i < this.points.length; i++) {
            const a: PointF2D = this.points[i];
            const b: PointF2D = this.points[(i + 1) % this.points.length];
            if (edges.some(e => Ink.segmentsCross(a, b, e[0], e[1]))) {
                return true;
            }
        }
        return false;
    }

    private inside(p: PointF2D): boolean {
        let inside: boolean = false;
        for (let i: number = 0, j: number = this.points.length - 1; i < this.points.length; j = i++) {
            const a: PointF2D = this.points[i];
            const b: PointF2D = this.points[j];
            if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) {
                inside = !inside;
            }
        }
        return inside;
    }

    private static cross(o: PointF2D, a: PointF2D, b: PointF2D): number {
        return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    }

    private static segmentsCross(a: PointF2D, b: PointF2D, c: PointF2D, d: PointF2D): boolean {
        return (Ink.cross(c, d, a) > 0) !== (Ink.cross(c, d, b) > 0) && (Ink.cross(a, b, c) > 0) !== (Ink.cross(a, b, d) > 0);
    }
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
export class CrossStaffExpressionClearance {
    /** the farthest move, in staff spaces */
    public static readonly MaxMove: number = 1.5;
    public static readonly Step: number = 0.1;
    /** the least distance of a moved text from a beam's or curve's ink */
    public static readonly Clearance: number = 0.1;

    private readonly ink: Ink[];
    private readonly lines: StaffLine[];
    private readonly sampling: number;

    private constructor(ink: Ink[], lines: StaffLine[], sampling: number) {
        this.ink = ink;
        this.lines = lines;
        this.sampling = sampling;
    }

    public get isEmpty(): boolean {
        return this.ink.length === 0;
    }

    /** The ink of the curves (calculated for drawing: their segments in absolute units) and the beams (post-formatted at
     *  the staves' final positions, VexFlow pixels over unitInPixels) of the system of the lines. */
    public static build(curves: Iterable<CrossStaffCurve>, beams: Iterable<CrossStaffBeam>, lines: StaffLine[],
                        sampling: number, unitInPixels: number): CrossStaffExpressionClearance {
        const ink: Ink[] = [];
        for (const curve of curves) {
            if (curve.segments.length === 0) {
                continue;
            }
            ink.push(new Ink(curve.outline(curve.isTie ? 0.27 : 0.3)));
        }
        for (const beam of beams) {
            const tips: number[][] = [];
            for (const note of (beam as any).notes as any[]) {
                if (!(note instanceof VF.StaveNote) || !(note as any).getStem?.()) {
                    continue;
                }
                const n: any = note;
                const x: number = n.getStemX() / unitInPixels;
                const extents: any = n.getStemExtents();
                const tip: number = extents.topY / unitInPixels;
                const base: number = extents.baseY / unitInPixels;
                const up: boolean = n.getStemDirection() === VF.Stem.UP;
                const count: number = Math.max(1, n.getBeamCount());
                // the beam lines stack from the stem's end towards the notehead
                const thickness: number = 0.5 + (count - 1) * 0.75;
                tips.push([x, tip, up ? tip + thickness : tip - thickness]);
                const top: number = Math.min(tip, base);
                const bottom: number = Math.max(tip, base);
                ink.push(new Ink([new PointF2D(x - 0.07, top), new PointF2D(x + 0.07, top),
                                  new PointF2D(x + 0.07, bottom), new PointF2D(x - 0.07, bottom)]));
            }
            for (let i: number = 0; i + 1 < tips.length; i++) {
                const a: number[] = tips[i];
                const b: number[] = tips[i + 1];
                ink.push(new Ink([new PointF2D(a[0], a[1]), new PointF2D(b[0], b[1]),
                                  new PointF2D(b[0], b[2]), new PointF2D(a[0], a[2])]));
            }
        }
        return new CrossStaffExpressionClearance(ink, lines, sampling);
    }

    /** Whether the box touches the beams' and curves' ink. */
    public touchesInk(box: ClearanceBox): boolean {
        return this.ink.some(ink => ink.intersects(box));
    }

    /** Whether the box lies clear of the notes of every staff of the system: wholly above a staff's sky line or wholly
     *  below its bottom line (both before the expressions) over its width. */
    private clearOfStaves(box: ClearanceBox): boolean {
        for (const line of this.lines) {
            const sky: number[] = line.NotesSkyLine;
            const bottom: number[] = line.NotesBottomLine;
            if (!sky || !bottom || sky.length === 0) {
                continue;
            }
            const origin: PointF2D = line.PositionAndShape.AbsolutePosition;
            const i0: number = Math.floor((box.left - origin.x) * this.sampling);
            const i1: number = Math.floor((box.right - origin.x) * this.sampling);
            if (i1 < 0 || i0 >= sky.length) {
                continue;
            }
            let top: number = Number.POSITIVE_INFINITY;
            let low: number = Number.NEGATIVE_INFINITY;
            for (let i: number = Math.max(0, i0); i <= Math.min(sky.length - 1, i1); i++) {
                top = Math.min(top, sky[i]);
                low = Math.max(low, bottom[i]);
            }
            if (!(box.bottom <= origin.y + top + 1e-6 || box.top >= origin.y + low - 1e-6)) {
                return false;
            }
        }
        return true;
    }

    /** The vertical move of the box (a text expression's, absolute units): 0 when it does not touch the beams' and
     *  curves' ink or when no free place is in reach. below: the text lies below its staff (tried downwards first, away
     *  from its staff), else above (tried upwards first). others: the boxes of the system's other expressions, lyrics,
     *  pedals and octave shifts, as drawn. */
    public offset(box: ClearanceBox, below: boolean, others: ClearanceBox[]): number {
        if (this.ink.length === 0 || !this.touchesInk(box)) {
            return 0;
        }
        const away: number = below ? 1 : -1;
        const steps: number = Math.round(CrossStaffExpressionClearance.MaxMove / CrossStaffExpressionClearance.Step);
        for (let k: number = 1; k <= steps; k++) {
            for (const direction of [away, -away]) {
                const dy: number = direction * k * CrossStaffExpressionClearance.Step;
                const moved: ClearanceBox = box.shifted(dy);
                if (this.touchesInk(moved.inflated(CrossStaffExpressionClearance.Clearance)) ||
                    others.some(other => other.overlaps(moved)) || !this.clearOfStaves(moved)) {
                    continue;
                }
                return dy;
            }
        }
        return 0;
    }
}
