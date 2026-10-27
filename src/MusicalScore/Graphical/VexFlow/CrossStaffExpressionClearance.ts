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

    public shifted(dy: number, dx: number = 0): ClearanceBox {
        return new ClearanceBox(this.left + dx, this.top + dy, this.right + dx, this.bottom + dy);
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
 * staves' distance, the systems) is not changed: only where the text is drawn. A text with no free place up or down is
 * moved sideways (2026-10-27, user decision "LW", 81sabo Sibelius Op.47 III piano, where the stems of the cross-staff
 * sixteenths cross the whole room between the staves): to the nearest free place within MaxShift staff spaces to the
 * right, or to the left within MaxShift or its own width and one space, whichever is more (S.9336 prints m1 "poco f"
 * and m36 "mp" before the first beam, m31 "p" between the stems), each with the vertical moves within reach; a text moved
 * sideways keeps TextGap from the other texts (Parisotti, Sebben crudele: "a tempo" moved onto "rit." read "rit.a tempo")
 * and does not go more than MaxOverStart left of the staves' start (Enescu, Concertstück m51: "Harmonieux et fondu" went
 * 4.5 spaces out over the brace; Sibelius m1 "poco f" goes a quarter space over it, before the first beam). A dynamic
 * keeps clear of the barlines drawn across the room between the staves of an instrument as of the beams (not other
 * texts: their boxes reach beyond their letters, "R. H." of the fixture ends half its box short of the barline the box
 * crosses, and the texts moved sideways in 81sabo would lose their places), and the samples of the staves' sky and bottom lines within
 * StemReach of a cross-staff beam's stem are left to the stem's ink (2026-10-28, Sibelius m36 "mp" lay on the barline;
 * m155 "mp" was kept off the room between two beams by the next stem, which the bottom line holds a sample to its
 * right). A dynamic's box is its glyphs' (f, p and the x-height of the others, dynamicBox()), and a moved text keeps
 * NoteGap beside it of the staves' notes (2026-10-28, Sibelius m36 "mp" at 820 wide, Myrthen 9 "sf" at 834 wide on a
 * beam's stem). A text with no free place up, down or sideways is moved away from its staff up to MaxMoveAway staff spaces,
 * not into the neighbouring systems (Enescu m51: "Harmonieux et fondu" lies under the slur from the first note, which
 * the source prints it above). A text with no free place within reach stays. Wedges are not moved (a hairpin row is
 * aligned with its dynamics). Same as osmd-dart cross_staff_expression_clearance.dart.
 */
export class CrossStaffExpressionClearance {
    /** the farthest move up or down, in staff spaces */
    public static readonly MaxMove: number = 1.5;
    /** the farthest move away from the text's staff when no move up, down or sideways clears it, in staff spaces */
    public static readonly MaxMoveAway: number = 3;
    /** the farthest sideways move to the right, in staff spaces (to the left: this or the text's width and one space,
     *  whichever is more) */
    public static readonly MaxShift: number = 3;
    /** the least horizontal room between a text moved sideways and the other texts, in staff spaces */
    public static readonly TextGap: number = 0.5;
    /** how far a text moved sideways may reach left of the staves' start (over the brace), in staff spaces */
    public static readonly MaxOverStart: number = 1;
    /** how far a dynamic's glyphs (the tails of p and f) reach below its label's box, in staff spaces: its box for the
     *  clearance is this much deeper (a dynamic not drawn in the dynamic glyphs p, m, f, r, s, z) */
    public static readonly DynamicDescent: number = 0.3;
    /** how far the glyphs of a dynamic with an f reach beyond its label's box, in staff spaces (the f glyph's box, 81sabo
     *  captures 2026-10-28): a first f's tail to the left, a last f's hook to the right, the tail below (Myrthen 6 "f"
     *  and Sibelius Op.47 I piano "mf" moved off a barline still touched it, Myrthen 9 "sf" moved onto a slur; the hook
     *  0.53 by the 81sabo app captures' sf, ff, f: Myrthen 9 "sf" moved up went 0.11 from a beam's stem with 0.5). */
    public static readonly ForteReachLeft: number = 0.35;
    public static readonly ForteReachRight: number = 0.53;
    public static readonly ForteDescent: number = 0.44;
    /** how far the p glyph reaches beyond its label's box, in staff spaces (81sabo app captures 2026-10-28, 883 "p" and
     *  130 "mp"): a first p's tail to the left, a last p's bowl to the right, the tail below */
    public static readonly PianoReachLeft: number = 0.18;
    public static readonly PianoReachRight: number = 0.08;
    public static readonly PianoDescent: number = 0.43;
    /** how far below its label's top a dynamic's glyphs begin, in staff spaces (the label's box is a line high; the
     *  same captures): with an f, the f's top; else the x-height of p, m, s, z, r. Sibelius m36 "mp" at 820 wide had no
     *  room before the barline but under the upper staff after it, where S.9336 prints it, before the first beam. */
    public static readonly ForteTop: number = 0.47;
    public static readonly GlyphTop: number = 0.99;
    private static readonly dynamicGlyphs: RegExp = /^[pmfrsz]+$/;

    /** The box of a dynamic's glyphs from its label's box and text. */
    public static dynamicBox(box: ClearanceBox, text: string): ClearanceBox {
        const t: string = text.trim();
        const c: typeof CrossStaffExpressionClearance = CrossStaffExpressionClearance;
        if (!c.dynamicGlyphs.test(t)) {
            return new ClearanceBox(box.left, box.top, box.right, box.bottom + c.DynamicDescent);
        }
        const forte: boolean = t.includes("f");
        return new ClearanceBox(box.left - (t.startsWith("f") ? c.ForteReachLeft : t.startsWith("p") ? c.PianoReachLeft : 0),
                                box.top + (forte ? c.ForteTop : c.GlyphTop),
                                box.right + (t.endsWith("f") ? c.ForteReachRight : t.endsWith("p") ? c.PianoReachRight : 0),
                                box.bottom + (forte ? c.ForteDescent : t.includes("p") ? c.PianoDescent : c.DynamicDescent));
    }
    public static readonly Step: number = 0.1;
    /** the least distance of a moved text from a beam's or curve's ink */
    public static readonly Clearance: number = 0.1;
    /** how far from a cross-staff beam's stem the staves' sky and bottom lines are not read (the stem's ink is), in
     *  staff spaces */
    public static readonly StemReach: number = 0.5;
    /** how far beside a moved text the staves' sky and bottom lines are read, in staff spaces: the lines are sampled
     *  every third of a space, and a stem a hair right of the text lies in the next sample (Myrthen 9 "sf" moved up went
     *  0.11 from a beam's stem, its f's hook joined to it) */
    public static readonly NoteGap: number = 0.2;

    private readonly ink: Ink[];
    private readonly barlines: Ink[];
    private readonly stems: number[];
    private readonly lines: StaffLine[];
    private readonly sampling: number;

    private constructor(ink: Ink[], barlines: Ink[], stems: number[], lines: StaffLine[], sampling: number) {
        this.ink = ink;
        this.barlines = barlines;
        this.stems = stems;
        this.lines = lines;
        this.sampling = sampling;
    }

    public get isEmpty(): boolean {
        return this.ink.length === 0;
    }

    /** The ink of the curves (calculated for drawing: their segments in absolute units) and the beams (post-formatted at
     *  the staves' final positions, VexFlow pixels over unitInPixels) of the system of the lines, and its barlines across
     *  the room between staves ([x, top, bottom]). */
    public static build(curves: Iterable<CrossStaffCurve>, beams: Iterable<CrossStaffBeam>, lines: StaffLine[],
                        sampling: number, unitInPixels: number,
                        barlines: [number, number, number][] = []): CrossStaffExpressionClearance {
        const ink: Ink[] = [];
        const stems: number[] = [];
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
                stems.push(x);
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
        // VexFlow's single barline: one pixel right of its x
        const barlineInk: Ink[] = barlines.map(([x, top, bottom]) =>
            new Ink([new PointF2D(x - 0.05, top), new PointF2D(x + 0.1, top),
                     new PointF2D(x + 0.1, bottom), new PointF2D(x - 0.05, bottom)]));
        return new CrossStaffExpressionClearance(ink, barlineInk, stems, lines, sampling);
    }

    /** Whether the box touches the beams' and curves' ink. */
    public touchesInk(box: ClearanceBox): boolean {
        return this.ink.some(ink => ink.intersects(box));
    }

    /** Whether the box touches the barlines between the staves. */
    public touchesBarline(box: ClearanceBox): boolean {
        return this.barlines.some(ink => ink.intersects(box));
    }

    /** Whether the box lies clear of the notes of every staff of the system: wholly above a staff's sky line or wholly
     *  below its bottom line (both before the expressions) over its width and NoteGap beside it, but for the samples
     *  near the cross-staff beams' stems (StemReach). */
    private clearOfStaves(box: ClearanceBox): boolean {
        for (const line of this.lines) {
            const sky: number[] = line.NotesSkyLine;
            const bottom: number[] = line.NotesBottomLine;
            if (!sky || !bottom || sky.length === 0) {
                continue;
            }
            const origin: PointF2D = line.PositionAndShape.AbsolutePosition;
            const i0: number = Math.floor((box.left - CrossStaffExpressionClearance.NoteGap - origin.x) * this.sampling);
            const i1: number = Math.floor((box.right + CrossStaffExpressionClearance.NoteGap - origin.x) * this.sampling);
            if (i1 < 0 || i0 >= sky.length) {
                continue;
            }
            let top: number = Number.POSITIVE_INFINITY;
            let low: number = Number.NEGATIVE_INFINITY;
            for (let i: number = Math.max(0, i0); i <= Math.min(sky.length - 1, i1); i++) {
                const x: number = origin.x + (i + 0.5) / this.sampling;
                if (this.stems.some(stem => Math.abs(x - stem) <= CrossStaffExpressionClearance.StemReach)) {
                    continue;
                }
                top = Math.min(top, sky[i]);
                low = Math.max(low, bottom[i]);
            }
            if (!(box.bottom <= origin.y + top + 1e-6 || box.top >= origin.y + low - 1e-6)) {
                return false;
            }
        }
        return true;
    }

    /** The move of the box (a text expression's, absolute units): none when it does not touch the beams' and curves'
     *  ink (and the barlines', for offBarlines: a dynamic's box, kept clear of them too) or when no free place is in reach. Up or down first, the
     *  nearest; else sideways, the nearest column (to the left first) with its nearest vertical move; else farther away
     *  from its staff, the nearest, its top not above ceiling (a text above its staff) or its bottom not below floor
     *  (below). below: the text lies below its staff (tried downwards first, away from its staff), else above (tried
     *  upwards first). others: the boxes of the system's other expressions, lyrics, pedals and octave shifts, as
     *  drawn. */
    public offset(box: ClearanceBox, below: boolean, others: ClearanceBox[], offBarlines: boolean = false,
                  ceiling: number = Number.NEGATIVE_INFINITY,
                  floor: number = Number.POSITIVE_INFINITY): { dx: number, dy: number } {
        const none: { dx: number, dy: number } = { dx: 0, dy: 0 };
        if (this.ink.length === 0 || !(this.touchesInk(box) || offBarlines && this.touchesBarline(box))) {
            return none;
        }
        const free: (moved: ClearanceBox) => boolean = (moved: ClearanceBox): boolean =>
            !this.touchesInk(moved.inflated(CrossStaffExpressionClearance.Clearance)) &&
            !(offBarlines && this.touchesBarline(moved.inflated(CrossStaffExpressionClearance.Clearance))) &&
            !others.some(other => other.overlaps(moved)) && this.clearOfStaves(moved);
        const step: number = CrossStaffExpressionClearance.Step;
        const away: number = below ? 1 : -1;
        const steps: number = Math.round(CrossStaffExpressionClearance.MaxMove / step);
        for (let k: number = 1; k <= steps; k++) {
            for (const direction of [away, -away]) {
                const dy: number = direction * k * step;
                if (free(box.shifted(dy))) {
                    return { dx: 0, dy: dy };
                }
            }
        }
        const staffStart: number = Math.min(...this.lines.map(line => line.PositionAndShape.AbsolutePosition.x));
        const freeSideways: (moved: ClearanceBox) => boolean = (moved: ClearanceBox): boolean =>
            moved.left >= staffStart - CrossStaffExpressionClearance.MaxOverStart - 1e-6 && free(moved) &&
            !others.some(other => other.overlaps(new ClearanceBox(moved.left - CrossStaffExpressionClearance.TextGap, moved.top,
                                                                  moved.right + CrossStaffExpressionClearance.TextGap, moved.bottom)));
        const right: number = Math.round(CrossStaffExpressionClearance.MaxShift / step);
        const left: number = Math.max(right, Math.round((box.right - box.left + 1) / step));
        for (let i: number = 1; i <= left; i++) {
            for (const side of [-1, 1]) {
                if (i > (side < 0 ? left : right)) {
                    continue;
                }
                const dx: number = side * i * step;
                if (freeSideways(box.shifted(0, dx))) {
                    return { dx: dx, dy: 0 };
                }
                for (let k: number = 1; k <= steps; k++) {
                    for (const direction of [away, -away]) {
                        const dy: number = direction * k * step;
                        if (freeSideways(box.shifted(dy, dx))) {
                            return { dx: dx, dy: dy };
                        }
                    }
                }
            }
        }
        for (let k: number = steps + 1; k <= Math.round(CrossStaffExpressionClearance.MaxMoveAway / step); k++) {
            const moved: ClearanceBox = box.shifted(away * k * step);
            if (moved.top < ceiling - 1e-6 || moved.bottom > floor + 1e-6) {
                break;
            }
            if (free(moved)) {
                return { dx: 0, dy: away * k * step };
            }
        }
        return none;
    }
}
