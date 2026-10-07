import Vex from "vexflow";
import VF = Vex.Flow;
import { PointF2D } from "../../../Common/DataObjects/PointF2D";
import { PlacementEnum } from "../../VoiceData/Expressions/AbstractExpression";
import { Note } from "../../VoiceData/Note";
import { StemDirectionType, VoiceEntry } from "../../VoiceData/VoiceEntry";
import { Voice } from "../../VoiceData/Voice";
import { BoundingBox } from "../BoundingBox";
import { EngravingRules } from "../EngravingRules";
import { GraphicalMeasure } from "../GraphicalMeasure";
import { GraphicalNote } from "../GraphicalNote";
import { GraphicalSlur } from "../GraphicalSlur";
import { StaffLine } from "../StaffLine";
import { CrossStaffBeam } from "./CrossStaffBeam";
import { VexFlowGraphicalNote } from "./VexFlowGraphicalNote";
import { VexFlowMeasure } from "./VexFlowMeasure";

/** A note of a [[CrossStaffCurve]]: its notehead box and stem, in units. */
export interface CrossStaffCurveNote {
    headLeft: number;
    headRight: number;
    /** the notehead's centre line */
    headY: number;
    /** 1 = up, -1 = down, 0 = no stem */
    stem: number;
    stemX: number;
    /** the stem's end (at the beam for a beamed note) */
    stemTip: number;
    /** the beam lines at the stem's end (0: no beam) */
    beamCount: number;
}

/** Where a [[CrossStaffCurve]] reads its notes and staves: the drawn VexFlow notes on the placed staves
 *  ([[CrossStaffCurveDrawGeometry]], absolute units), or the layout's boxes before the staves of the system are placed
 *  ([[CrossStaffCurveLayoutGeometry]], units relative to the system). */
export interface CrossStaffCurveGeometry {
    /** the origin of the staff line (its top line's left end) in this frame */
    origin(staffLine: StaffLine): PointF2D;
    /** the notehead and stem of the note in this frame, undefined when unknown */
    note(note: GraphicalNote): CrossStaffCurveNote | undefined;
    /** whether the cross-staff beams are placed (their ink is an obstacle) */
    readonly hasBeams: boolean;
    readonly unitInPixels: number;
}

/** The drawn notes on the placed staves, in absolute units: VexFlow's pixels over unitInPixels (the staves are at
 *  their absolute positions when a measure is drawn, VexFlowMeasure.setAbsoluteCoordinates). */
export class CrossStaffCurveDrawGeometry implements CrossStaffCurveGeometry {
    public readonly hasBeams: boolean = true;
    public readonly unitInPixels: number;
    constructor(unitInPixels: number) {
        this.unitInPixels = unitInPixels;
    }

    public origin(staffLine: StaffLine): PointF2D {
        return staffLine.PositionAndShape.AbsolutePosition;
    }

    public note(note: GraphicalNote): CrossStaffCurveNote | undefined {
        const tuple: any[] = (note as VexFlowGraphicalNote).vfnote;
        if (!tuple || !(tuple[0] instanceof VF.StaveNote)) {
            return undefined;
        }
        const vfNote: any = tuple[0];
        const index: number = tuple.length > 1 ? (tuple[1] ?? 0) : 0;
        if (!vfNote.getTickContext?.() && !vfNote.tickContext) {
            return undefined;
        }
        const stave: any = vfNote.getStave();
        if (stave) {
            vfNote.setStave(stave); // the stave moved since
        }
        const ys: number[] = vfNote.getYs();
        if (!ys?.length) {
            return undefined;
        }
        const u: number = this.unitInPixels;
        const result: CrossStaffCurveNote = {
            headLeft: vfNote.getNoteHeadBeginX() / u,
            headRight: vfNote.getNoteHeadEndX() / u,
            headY: ys[Math.min(Math.max(index, 0), ys.length - 1)] / u,
            stem: 0, stemX: 0, stemTip: 0, beamCount: 0,
        };
        if (vfNote.hasStem() && vfNote.getStem?.()) {
            result.stem = vfNote.getStemDirection() === VF.Stem.UP ? 1 : -1;
            result.stemX = vfNote.getStemX() / u;
            result.stemTip = vfNote.getStemExtents().topY / u;
            if (vfNote.beam) {
                result.beamCount = vfNote.getBeamCount();
            }
        }
        return result;
    }
}

/** The layout's boxes in units relative to the system, before the staves of the system are placed (for the curve's
 *  first, approximate reservation in the staves' sky and bottom lines). */
export class CrossStaffCurveLayoutGeometry implements CrossStaffCurveGeometry {
    public readonly hasBeams: boolean = false;
    public readonly unitInPixels: number = 10;
    private readonly system: BoundingBox;
    constructor(system: BoundingBox) {
        this.system = system;
    }

    private position(box: BoundingBox): PointF2D {
        let x: number = 0;
        let y: number = 0;
        let current: BoundingBox = box;
        while (current && current !== this.system) {
            x += current.RelativePosition.x;
            y += current.RelativePosition.y;
            current = current.Parent;
        }
        return new PointF2D(x, y);
    }

    public origin(staffLine: StaffLine): PointF2D {
        return this.position(staffLine.PositionAndShape);
    }

    public note(note: GraphicalNote): CrossStaffCurveNote | undefined {
        const position: PointF2D = this.position(note.PositionAndShape);
        const entryBox: BoundingBox = note.parentVoiceEntry.PositionAndShape;
        const entryY: number = this.position(entryBox).y;
        const direction: StemDirectionType = note.parentVoiceEntry.parentVoiceEntry.StemDirection;
        const stem: number = direction === StemDirectionType.Up ? 1 : direction === StemDirectionType.Down ? -1 : 0;
        return {
            headLeft: position.x,
            headRight: position.x + 1.2,
            headY: position.y,
            stem,
            stemX: stem > 0 ? position.x + 1.2 : position.x,
            stemTip: stem > 0 ? entryY + entryBox.BorderTop : entryY + entryBox.BorderBottom,
            beamCount: 0,
        };
    }
}

const headTop: (note: CrossStaffCurveNote) => number = (note: CrossStaffCurveNote): number => note.headY - 0.5;
const headBottom: (note: CrossStaffCurveNote) => number = (note: CrossStaffCurveNote): number => note.headY + 0.5;
const headCenterX: (note: CrossStaffCurveNote) => number =
    (note: CrossStaffCurveNote): number => (note.headLeft + note.headRight) / 2;

/** A cubic Bézier segment: [start, control, control, end]. */
type Segment = PointF2D[];

/** A slur's curve on one side (CrossStaffCurve.fitSlur()). */
interface SlurFit {
    segments: Segment[];
    hull: boolean;
    uncleared: number;
    startAtStem: boolean;
    endAtStem: boolean;
}

/**
 * A slur or tie from a note on one staff of an instrument to a note on another staff of it in the same system
 * (Schumann, Myrthen 1 m4–5: slurs from the left hand into the right hand across the cross-staff beams; 14 m12–14: a
 * slur from the right hand under the left hand; 10 m72–73: ties from the right hand into the left), drawn as one curve.
 *
 * Its two staves are only placed after the layout, so the curve is calculated by the drawer, in absolute units, after
 * its measures and the cross-staff beams between them are formatted at their final positions, and drawn once per
 * drawing with the first of its measures drawn (as a [[CrossStaffBeam]]: VexFlowMusicSheetDrawer.drawCrossStaffCurves).
 * A tie is built by the tie layout for its end note's measure, a slur by the slur layout; all participants hold it.
 * The layout calculates it first with the staves' preliminary distance and reserves its outer sides
 * (reserveOuterSides()).
 *
 * A slur goes over (under) its obstacles from both staves (calculateSlur()); a tie is an arch of a tie's height. The
 * curve is one or more cubic Bézier segments. Same structure and numbers as osmd-dart
 * lib/musical_score/graphical/vex_flow/cross_staff_curve.dart.
 */
export class CrossStaffCurve {
    /** clearance of a slur over (under) its obstacles */
    private static readonly ObstacleClearance: number = 0.3;
    private static readonly MinClearance: number = 0.1;
    /** The places of an arch's control points tried along the line between its ends, as fractions of it from their
     *  ends: near an end, the arch turns steeply into it. */
    private static readonly ControlFractions: number[] = [0.02, 0.1, 0.2, 0.3, 0.4];

    /** The calculated curve, in the frame of the last calculate(): cubic Bézier segments, end to end. */
    public segments: Segment[] = [];
    public placement: PlacementEnum = PlacementEnum.NotYetDefined;
    /** whether the last slur calculate() followed its obstacles' hull instead of one arch */
    public followsHull: boolean = false;
    /** obstacles the last calculate() left closer than MinClearance to (or past) the curve */
    public unclearedObstacles: number = 0;
    /** set by the drawer when it draws the curve (cleared by its caller) */
    public rendered: boolean = false;

    /** the slur, undefined for a tie */
    public readonly graphicalSlur: GraphicalSlur | undefined;
    public readonly startNote: GraphicalNote;
    public readonly endNote: GraphicalNote;
    /** for a tie: its direction in the XML (Tie.getTieDirection()), else not yet defined (tieBelow()) */
    public readonly tieDirection: PlacementEnum | undefined;
    /** the measures from the start note's to the end note's, on both staves */
    public readonly participants: GraphicalMeasure[];

    private constructor(graphicalSlur: GraphicalSlur | undefined, startNote: GraphicalNote, endNote: GraphicalNote,
                        tieDirection: PlacementEnum | undefined, participants: GraphicalMeasure[]) {
        this.graphicalSlur = graphicalSlur;
        this.startNote = startNote;
        this.endNote = endNote;
        this.tieDirection = tieDirection;
        this.participants = participants;
    }

    public static slur(graphicalSlur: GraphicalSlur, startNote: GraphicalNote, endNote: GraphicalNote,
                       participants: GraphicalMeasure[]): CrossStaffCurve {
        return new CrossStaffCurve(graphicalSlur, startNote, endNote, undefined, participants);
    }

    public static tie(startNote: GraphicalNote, endNote: GraphicalNote, direction: PlacementEnum,
                      participants: GraphicalMeasure[]): CrossStaffCurve {
        return new CrossStaffCurve(undefined, startNote, endNote, direction, participants);
    }

    public get isTie(): boolean {
        return this.graphicalSlur === undefined;
    }

    public get startPoint(): PointF2D {
        return this.segments[0][0];
    }

    public get endPoint(): PointF2D {
        const last: Segment = this.segments[this.segments.length - 1];
        return last[3];
    }

    private get startLine(): StaffLine {
        return this.startNote.parentVoiceEntry?.parentStaffEntry?.parentMeasure?.ParentStaffLine;
    }

    private get endLine(): StaffLine {
        return this.endNote.parentVoiceEntry?.parentStaffEntry?.parentMeasure?.ParentStaffLine;
    }

    /** Calculates the curve in the geometry's frame. False when its notes are not both placed in one system. */
    public calculate(rules: EngravingRules, geometry: CrossStaffCurveGeometry): boolean {
        const startLine: StaffLine = this.startLine;
        const endLine: StaffLine = this.endLine;
        if (!startLine || !endLine || startLine.ParentMusicSystem !== endLine.ParentMusicSystem) {
            return false;
        }
        const start: CrossStaffCurveNote = geometry.note(this.startNote);
        const end: CrossStaffCurveNote = geometry.note(this.endNote);
        if (!start || !end) {
            return false;
        }
        return this.isTie
            ? this.calculateTie(start, end)
            : this.calculateSlur(rules, geometry, startLine, endLine, start, end);
    }

    // ------------------------------------------------------------------------------------------------------- ties

    /** A tie between two staves: from beside the start notehead to beside the end notehead, arched to its side by a
     *  tie's height for its length (as VexFlowPatch's StaveTie with curve_by_length: h = 0.36 + 0.082 × length in staff
     *  spaces, 0.4 to 1.5). */
    private calculateTie(start: CrossStaffCurveNote, end: CrossStaffCurveNote): boolean {
        const below: boolean = this.tieBelow(start, end);
        this.placement = below ? PlacementEnum.Below : PlacementEnum.Above;
        const side: number = below ? 1 : -1;
        const p0: PointF2D = new PointF2D(start.headRight + 0.2, start.headY + side * 0.5);
        const p3: PointF2D = new PointF2D(end.headLeft - 0.2, end.headY + side * 0.5);
        const dx: number = p3.x - p0.x;
        const dy: number = p3.y - p0.y;
        const length: number = Math.sqrt(dx * dx + dy * dy);
        if (length < 0.01) {
            return false;
        }
        const height: number = Math.min(1.5, Math.max(0.4, 0.36 + 0.082 * length));
        const n: PointF2D = CrossStaffCurve.normal(p0, p3, below);
        // a cubic's control points offset by d bulge it by 0.75 d
        const d: number = height / 0.75;
        this.segments = [[
            p0,
            new PointF2D(p0.x + dx / 3 + n.x * d, p0.y + dy / 3 + n.y * d),
            new PointF2D(p0.x + 2 * dx / 3 + n.x * d, p0.y + 2 * dy / 3 + n.y * d),
            p3,
        ]];
        this.followsHull = false;
        this.unclearedObstacles = 0;
        return true;
    }

    /** The XML direction, else away from the start note's stem (a tie's usual side), else from the end note's; up for
     *  two stemless notes. */
    private tieBelow(start: CrossStaffCurveNote, end: CrossStaffCurveNote): boolean {
        if (this.tieDirection === PlacementEnum.Below || this.tieDirection === PlacementEnum.Above) {
            return this.tieDirection === PlacementEnum.Below;
        }
        const stem: number = start.stem !== 0 ? start.stem : end.stem;
        return stem > 0;
    }

    /** The unit normal of the line from a to b on the curve's side (y grows downwards: below = pointing down). */
    private static normal(a: PointF2D, b: PointF2D, below: boolean): PointF2D {
        const dx: number = b.x - a.x;
        const dy: number = b.y - a.y;
        const length: number = Math.max(1e-9, Math.sqrt(dx * dx + dy * dy));
        let nx: number = -dy / length;
        let ny: number = dx / length;
        if ((ny > 0) !== below) {
            nx = -nx;
            ny = -ny;
        }
        return new PointF2D(nx, ny);
    }

    // ------------------------------------------------------------------------------------------------------ slurs

    /**
     * A slur between two staves. Its side: the XML placement, else away from its own notes between its ends
     * (placementOf()). Its obstacles: the far staff (above a slur below, the upper staff; below a slur above, the lower),
     * all of whose notes are on its inner side; on the near staff only the slur's own voices (it may run under or over
     * the near staff's other voices: Myrthen 3 m1, from the left hand up past the right hand's held note to its
     * arpeggio); its voices' notes between its ends; the cross-staff beams of its measures. Its ends: at each note the
     * notehead or, when the stem points to the slur's side, the stem's end (as on one staff) — each of the four pairs is
     * tried, the curve clearing all obstacles with one arch wins, the usual ends first (Myrthen 1 m4: the slur under the
     * beam ends at the right-hand note's stem; 3 m3: the slur over the arpeggio starts at the left-hand notehead,
     * beside its stem).
     */
    private calculateSlur(rules: EngravingRules, geometry: CrossStaffCurveGeometry, startLine: StaffLine,
                          endLine: StaffLine, start: CrossStaffCurveNote, end: CrossStaffCurveNote): boolean {
        const gSlur: GraphicalSlur = this.graphicalSlur;
        const startOrigin: PointF2D = geometry.origin(startLine);
        const endOrigin: PointF2D = geometry.origin(endLine);
        const startIsUpper: boolean = startOrigin.y < endOrigin.y;
        const upper: StaffLine = startIsUpper ? startLine : endLine;
        const lower: StaffLine = startIsUpper ? endLine : startLine;
        const upperOrigin: PointF2D = startIsUpper ? startOrigin : endOrigin;
        const lowerOrigin: PointF2D = startIsUpper ? endOrigin : startOrigin;

        const inner: CrossStaffCurveNote[] = this.voiceNotesBetween(geometry);
        let below: boolean = this.placementOf(rules, start, end, inner) === PlacementEnum.Below;
        const fit: (below: boolean, steep: boolean) => SlurFit = (side: boolean, steep: boolean) =>
            this.fitSlur(rules, geometry, upper, lower, upperOrigin, lowerOrigin, start, end, inner, side, steep);
        let best: SlurFit = fit(below, false);
        // a steep slur — or, its side not given by the XML, one from beside its start's stem, however wide
        //   (isSteep()) — whose curve climbs past one of its notes: through its notehead, along a stem pointing away
        //   from the other note to its end, or beside the notehead to its far side (Myrthen 17: from the left hand's
        //   last sixteenth up past the right hand's next note; m3: up along the down stem of the right hand's lower
        //   voice over its notehead): from the notes' facing sides, bowing away from the start's stem beside it (there
        //   right, as in the source — to the left it would run back through the left hand's beam), when no other note
        //   stands between its ends and it is clear of the notes across it on both staves, their stems and beams
        //   (Myrthen 3, 15 m16: from the first of the left hand's beamed notes it would bend under the others; 15 m57:
        //   cross the left hand's other voice)
        if (best && (CrossStaffCurve.isSteep(start, end) ||
                     CrossStaffCurve.besideStem(start, end, true) && !this.placedByXml(rules)) &&
            CrossStaffCurve.climbsPast(best, start, end)) {
            const steepBelow: boolean = CrossStaffCurve.besideStem(start, end, true) ? end.headY < start.headY : below;
            const steep: SlurFit = fit(steepBelow, true);
            const others: CrossStaffCurveNote[] = steep ? this.notesUnder(geometry, steep.segments) : [];
            // (not a note of either end's chord)
            const between: CrossStaffCurveNote[] = others.filter(note =>
                Math.abs(headCenterX(note) - headCenterX(start)) > 0.5 && Math.abs(headCenterX(note) - headCenterX(end)) > 0.5);
            if (steep && !CrossStaffCurve.alongNotes(steep.segments, [start, end, ...others]) &&
                !CrossStaffCurve.headsBetween(steep.segments, between) &&
                !CrossStaffCurve.crossesStemsAndBeams(steep.segments, [start, ...others, end])) {
                best = steep;
                below = steepBelow;
            }
        }
        if (!best) {
            return false;
        }
        this.placement = below ? PlacementEnum.Below : PlacementEnum.Above;
        gSlur.placement = this.placement;
        this.segments = best.segments;
        this.followsHull = best.hull;
        this.unclearedObstacles = best.uncleared;
        gSlur.bezierStartPt = this.segments[0][0];
        gSlur.bezierStartControlPt = this.segments[0][1];
        gSlur.bezierEndControlPt = this.segments[this.segments.length - 1][2];
        gSlur.bezierEndPt = this.segments[this.segments.length - 1][3];
        return true;
    }

    /** The slur's curve on one side: the best of its end pairs (calculateSlur()), or for a steep one from its notes'
     *  facing sides (facingEnd()). */
    private fitSlur(rules: EngravingRules, geometry: CrossStaffCurveGeometry, upper: StaffLine, lower: StaffLine,
                    upperOrigin: PointF2D, lowerOrigin: PointF2D, start: CrossStaffCurveNote, end: CrossStaffCurveNote,
                    inner: CrossStaffCurveNote[], below: boolean, steep: boolean): SlurFit {
        const gap: number = rules.SlurNoteHeadYOffset;
        const far: StaffLine = below ? upper : lower;
        const farOrigin: PointF2D = below ? upperOrigin : lowerOrigin;
        const fromX: number = Math.min(start.headLeft, start.stemX);
        const toX: number = Math.max(end.headRight, end.stemX);
        const candidates: PointF2D[] = [
            ...CrossStaffCurve.lineObstacles(rules, far, farOrigin, below, fromX, toX),
            ...inner.flatMap(note => CrossStaffCurve.noteObstacles(note, below)),
            ...(geometry.hasBeams ? this.beamObstacles(geometry, below) : []),
        ];
        // the two notes themselves: a stem to the slur's side is an obstacle of a slur from the notehead
        const ownStems: PointF2D[] = [start, end]
            .filter(note => note.stem === (below ? -1 : 1))
            .map(note => new PointF2D(note.stemX, note.stemTip));

        let best: number = Number.POSITIVE_INFINITY;
        let bestFit: SlurFit = undefined;
        // the end pairs to try (the usual ends first: one clean arch there can't be beaten)
        const usualStart: boolean = start.stem === (below ? -1 : 1);
        const usualEnd: boolean = end.stem === (below ? -1 : 1);
        const pairs: [PointF2D, PointF2D, boolean, boolean, boolean][] = [];
        if (steep) {
            pairs.push([CrossStaffCurve.facingEnd(start, end, gap, true), CrossStaffCurve.facingEnd(end, start, gap, false), true,
                        false, false]);
        } else {
            for (const startAtStem of CrossStaffCurve.endChoices(start, below)) {
                for (const endAtStem of CrossStaffCurve.endChoices(end, below)) {
                    pairs.push([CrossStaffCurve.endPointOf(start, below, gap, true, startAtStem),
                                CrossStaffCurve.endPointOf(end, below, gap, false, endAtStem),
                                startAtStem === usualStart && endAtStem === usualEnd, startAtStem, endAtStem]);
                }
            }
        }
        for (const [p0, p3, usual, startAtStem, endAtStem] of pairs) {
            // (a slur between two notes at one time is nearly upright: Myrthen has none, a test of measure repeats does)
            if (CrossStaffCurve.distance(p0, p3) < 0.5) {
                continue;
            }
            const points: PointF2D[] = [...candidates, ...ownStems].filter(point => point.x > p0.x + 0.1 && point.x < p3.x - 0.1);
            const arch: Segment[] = this.fitArch(rules, p0, p3, points, below);
            const archReach: number = CrossStaffCurve.reach(arch, p0, p3, below);
            // (the hull reaches as far as its highest corner: an obstacle, or the least bow)
            const hullReach: number = CrossStaffCurve.hullHeight(rules, p0, p3, points, below);
            const useArch: boolean = archReach <= hullReach * 1.25 + 0.5 && CrossStaffCurve.uncleared(arch, points, below) === 0;
            const hull: Segment[] = useArch ? arch : this.hullCurve(rules, p0, p3, points, below);
            // one clean arch first, then the usual ends, then the lower curve
            const cost: number = (useArch ? 0 : 1000) + (usual ? 0 : 100) + (useArch ? archReach : hullReach);
            if (cost < best) {
                best = cost;
                bestFit = {
                    segments: useArch ? arch : hull,
                    hull: !useArch,
                    uncleared: useArch ? 0 : CrossStaffCurve.uncleared(hull, points, below),
                    startAtStem: startAtStem,
                    endAtStem: endAtStem,
                };
            }
            if (best < 100) {
                break;
            }
        }
        return bestFit;
    }

    /** Whether the fit climbs past one of its notes: ends at the end of a stem pointing away from the other note (an
     *  upper note's up stem, a lower note's down stem), runs through its notehead (a tenth of a space in), or ends
     *  beyond its notehead's centre line, away from the other note, after passing beside the notehead (within
     *  ObstacleClearance of it) on the other note's side (Myrthen 17 m3: up along the down stem of the right hand's
     *  lower voice to the top of its notehead). */
    private static climbsPast(fit: SlurFit, start: CrossStaffCurveNote, end: CrossStaffCurveNote): boolean {
        const away: (note: CrossStaffCurveNote, other: CrossStaffCurveNote) => boolean =
            (note: CrossStaffCurveNote, other: CrossStaffCurveNote) => note.stem === (note.headY < other.headY ? 1 : -1);
        if (fit.startAtStem && away(start, end) || fit.endAtStem && away(end, start)) {
            return true;
        }
        const samples: PointF2D[] = CrossStaffCurve.sampleOf(fit.segments, 32);
        for (const p of samples) {
            for (const note of [start, end]) {
                if (p.x > note.headLeft + 0.1 && p.x < note.headRight - 0.1 &&
                    p.y > headTop(note) + 0.1 && p.y < headBottom(note) - 0.1) {
                    return true;
                }
            }
        }
        const ends: [CrossStaffCurveNote, CrossStaffCurveNote, PointF2D][] =
            [[start, end, samples[0]], [end, start, samples[samples.length - 1]]];
        for (const [note, other, p] of ends) {
            const upper: boolean = note.headY < other.headY;
            if (upper ? p.y >= note.headY : p.y <= note.headY) {
                continue;
            }
            const clearance: number = CrossStaffCurve.ObstacleClearance;
            if (samples.some(q => (upper ? q.y > note.headY : q.y < note.headY) &&
                                  q.x > note.headLeft - clearance && q.x < note.headRight + clearance)) {
                return true;
            }
        }
        return false;
    }

    /** Whether the curve runs through or along one of the notes — through its notehead (a tenth of a space in) or
     *  within 0.2 of its stem — away from the curve's own ends (0.6). */
    private static alongNotes(curve: Segment[], notes: CrossStaffCurveNote[]): boolean {
        const p0: PointF2D = curve[0][0];
        const p3: PointF2D = curve[curve.length - 1][3];
        for (const p of CrossStaffCurve.sampleOf(curve, 32)) {
            if (CrossStaffCurve.distance(p, p0) < 0.6 || CrossStaffCurve.distance(p, p3) < 0.6) {
                continue;
            }
            for (const note of notes) {
                if (p.x > note.headLeft + 0.1 && p.x < note.headRight - 0.1 &&
                    p.y > headTop(note) + 0.1 && p.y < headBottom(note) - 0.1) {
                    return true;
                }
                if (note.stem !== 0 && Math.abs(p.x - note.stemX) < 0.2 &&
                    p.y > Math.min(note.headY, note.stemTip) && p.y < Math.max(note.headY, note.stemTip)) {
                    return true;
                }
            }
        }
        return false;
    }

    /** Whether the curve crosses a stem of the notes or a beam between two of them (neighbours with beams and stems the
     *  same way), away from the curve's own ends (0.6). */
    private static crossesStemsAndBeams(curve: Segment[], notes: CrossStaffCurveNote[]): boolean {
        const lines: [PointF2D, PointF2D][] = notes
            .filter(note => note.stem !== 0)
            .map(note => [new PointF2D(note.stemX, note.headY), new PointF2D(note.stemX, note.stemTip)]);
        const byX: CrossStaffCurveNote[] = [...notes].sort((a, b) => a.stemX - b.stemX);
        for (let i: number = 0; i + 1 < byX.length; i++) {
            const a: CrossStaffCurveNote = byX[i];
            const b: CrossStaffCurveNote = byX[i + 1];
            if (a.beamCount > 0 && b.beamCount > 0 && a.stem !== 0 && a.stem === b.stem && b.stemX - a.stemX < 8) {
                lines.push([new PointF2D(a.stemX, a.stemTip), new PointF2D(b.stemX, b.stemTip)]);
            }
        }
        const p0: PointF2D = curve[0][0];
        const p3: PointF2D = curve[curve.length - 1][3];
        const samples: PointF2D[] = CrossStaffCurve.sampleOf(curve, 32)
            .filter(p => CrossStaffCurve.distance(p, p0) >= 0.6 && CrossStaffCurve.distance(p, p3) >= 0.6);
        for (let i: number = 0; i + 1 < samples.length; i++) {
            for (const [a, b] of lines) {
                if (CrossStaffCurve.segmentsCross(samples[i], samples[i + 1], a, b)) {
                    return true;
                }
            }
        }
        return false;
    }

    private static segmentsCross(p: PointF2D, q: PointF2D, a: PointF2D, b: PointF2D): boolean {
        const side: (o: PointF2D, u: PointF2D, v: PointF2D) => number =
            (o: PointF2D, u: PointF2D, v: PointF2D) => (u.x - o.x) * (v.y - o.y) - (u.y - o.y) * (v.x - o.x);
        return side(a, b, p) * side(a, b, q) < 0 && side(p, q, a) * side(p, q, b) < 0;
    }

    /** Whether a slur's notes are nearly one above the other: across less than half the way up (Myrthen 17: from the
     *  left hand's last sixteenth up to the right hand's next note, 0.16 to 0.26 in the app). Its ends on its notes'
     *  usual sides — both above or both below — may make the curve climb past one of them to its far side
     *  (climbsPast()); the source joins the sides the notes face each other with. So it does from beside the start's
     *  stem pointing to the other note (besideStem()) at any width: the usual curve starts at that stem's end, already
     *  up by its length, and climbs on along the other note's stem whether the notes stand one above the other or not
     *  (Myrthen 17 in wider measures: 0.52 to 1.31 on the web) — whereas a slur between notes whose stems point away
     *  from each other keeps its usual ends (from a chord's notehead down to the end of the next note's down stem two
     *  beats later, 4 to 6 across). A side the XML gives is kept there but for the steep: a pair of slurs between the
     *  same notes, placed above and below, would run as one. */
    private static isSteep(start: CrossStaffCurveNote, end: CrossStaffCurveNote): boolean {
        return Math.abs(headCenterX(end) - headCenterX(start)) < 0.5 * Math.abs(end.headY - start.headY);
    }

    /** A steep slur's end at the note: on the side facing the other note — above the lower note, below the upper — or,
     *  when the note's stem points that way on the side towards the other note, beside the stem at the notehead at
     *  the start (Myrthen 17: right of the left hand's sixteenth's stem) and at the stem's end at the end. */
    private static facingEnd(note: CrossStaffCurveNote, other: CrossStaffCurveNote, gap: number, isStart: boolean): PointF2D {
        const isUpper: boolean = note.headY < other.headY;
        const toward: number = isStart ? 1 : -1;
        if (CrossStaffCurve.besideStem(note, other, isStart)) {
            // (at the end: its stem's end — the start's side would bring the curve back across the stem to its notehead)
            return isStart
                ? new PointF2D(note.stemX + toward * 0.3, note.headY + (isUpper ? 0.25 : -0.25))
                : new PointF2D(note.stemX, note.stemTip + (isUpper ? gap : -gap));
        }
        return new PointF2D(headCenterX(note) + toward * 0.2, isUpper ? headBottom(note) + gap : headTop(note) - gap);
    }

    /** Whether a steep slur's end at the note is beside its stem: the stem points towards the other note and stands on
     *  its side (an up stem is right of its notehead, a down stem left). */
    private static besideStem(note: CrossStaffCurveNote, other: CrossStaffCurveNote, isStart: boolean): boolean {
        return note.stem === (note.headY < other.headY ? -1 : 1) && (note.stem > 0) === isStart;
    }

    /** The ends tried at the note: the notehead, and its stem's end when the stem points to the slur's side (usual
     *  first). */
    private static endChoices(note: CrossStaffCurveNote, below: boolean): boolean[] {
        return note.stem === (below ? -1 : 1) ? [true, false] : [false];
    }

    /** Whether the XML gives the slur's side (followed by placementOf()). */
    private placedByXml(rules: EngravingRules): boolean {
        const xml: PlacementEnum = this.graphicalSlur.slur.PlacementXml;
        return rules.SlurPlacementFromXML && (xml === PlacementEnum.Above || xml === PlacementEnum.Below);
    }

    /** The XML placement, else away from the slur's own notes between its ends (most of them above the line from end
     *  to end: below), else as upstream (a slur up to the upper staff above, down to the lower one below). */
    private placementOf(rules: EngravingRules, start: CrossStaffCurveNote, end: CrossStaffCurveNote,
                        inner: CrossStaffCurveNote[]): PlacementEnum {
        if (this.placedByXml(rules)) {
            return this.graphicalSlur.slur.PlacementXml;
        }
        let above: number = 0;
        let underneath: number = 0;
        const dx: number = headCenterX(end) - headCenterX(start);
        for (const note of inner) {
            if (Math.abs(dx) < 0.01) {
                break;
            }
            const t: number = (headCenterX(note) - headCenterX(start)) / dx;
            const lineY: number = start.headY + t * (end.headY - start.headY);
            if (note.headY < lineY - 0.25) {
                above++;
            } else if (note.headY > lineY + 0.25) {
                underneath++;
            }
        }
        if (above !== underneath) {
            return above > underneath ? PlacementEnum.Below : PlacementEnum.Above;
        }
        return end.headY < start.headY ? PlacementEnum.Above : PlacementEnum.Below;
    }

    /** The slur's end at the note: at its stem's end (atStem) or beside its notehead on the slur's side. */
    private static endPointOf(note: CrossStaffCurveNote, below: boolean, gap: number, isStart: boolean,
                              atStem: boolean): PointF2D {
        const side: number = below ? 1 : -1;
        if (atStem) {
            return new PointF2D(note.stemX, note.stemTip + side * gap);
        }
        return new PointF2D(headCenterX(note) + (isStart ? 0.2 : -0.2), (below ? headBottom(note) : headTop(note)) + side * gap);
    }

    /** The notes of the curve's measures on both staves, any voice, across its width — but its own two. */
    private notesUnder(geometry: CrossStaffCurveGeometry, curve: Segment[]): CrossStaffCurveNote[] {
        const xs: number[] = CrossStaffCurve.sampleOf(curve, 16).map(p => p.x);
        const fromX: number = Math.min(...xs) - 1;
        const toX: number = Math.max(...xs) + 1;
        const result: CrossStaffCurveNote[] = [];
        for (const measure of this.participants) {
            for (const staffEntry of measure.staffEntries) {
                for (const voiceEntry of staffEntry.graphicalVoiceEntries) {
                    for (const gNote of voiceEntry.notes) {
                        if (gNote === this.startNote || gNote === this.endNote) {
                            continue;
                        }
                        const note: Note = gNote.sourceNote;
                        if (note.isRest() || !note.PrintObject) {
                            continue;
                        }
                        const noteGeometry: CrossStaffCurveNote = geometry.note(gNote);
                        if (noteGeometry && noteGeometry.headRight > fromX && noteGeometry.headLeft < toX) {
                            result.push(noteGeometry);
                        }
                    }
                }
            }
        }
        return result;
    }

    /** Whether one of the notes has its notehead between the curve's two ends (across, a third of a space in). */
    private static headsBetween(curve: Segment[], notes: CrossStaffCurveNote[]): boolean {
        const a: number = curve[0][0].x;
        const b: number = curve[curve.length - 1][3].x;
        const fromX: number = Math.min(a, b) + 0.3;
        const toX: number = Math.max(a, b) - 0.3;
        return notes.some(note => note.headRight > fromX && note.headLeft < toX);
    }

    /** The notes of the slur's voices (its start note's and end note's) strictly between its two notes: in its measures
     *  on both staves. */
    private voiceNotesBetween(geometry: CrossStaffCurveGeometry): CrossStaffCurveNote[] {
        const slur: GraphicalSlur["slur"] = this.graphicalSlur.slur;
        const from: number = slur.StartNote.getAbsoluteTimestamp().RealValue;
        const to: number = slur.EndNote.getAbsoluteTimestamp().RealValue;
        const voices: Voice[] = [slur.StartNote.ParentVoiceEntry.ParentVoice, slur.EndNote.ParentVoiceEntry.ParentVoice];
        const result: CrossStaffCurveNote[] = [];
        for (const measure of this.participants) {
            for (const staffEntry of measure.staffEntries) {
                for (const voiceEntry of staffEntry.graphicalVoiceEntries) {
                    const entry: VoiceEntry = voiceEntry.parentVoiceEntry;
                    if (entry.IsGrace || voices.indexOf(entry.ParentVoice) < 0) {
                        continue;
                    }
                    for (const gNote of voiceEntry.notes) {
                        const note: Note = gNote.sourceNote;
                        if (note.isRest() || !note.PrintObject) {
                            continue;
                        }
                        const time: number = note.getAbsoluteTimestamp().RealValue;
                        if (time <= from || time >= to) {
                            continue;
                        }
                        const noteGeometry: CrossStaffCurveNote = geometry.note(gNote);
                        if (noteGeometry) {
                            result.push(noteGeometry);
                        }
                    }
                }
            }
        }
        return result;
    }

    /** A note's ink on the slur's side: its notehead, and its stem's end when the stem points that way. */
    private static noteObstacles(note: CrossStaffCurveNote, below: boolean): PointF2D[] {
        const y: number = below ? headBottom(note) : headTop(note);
        const result: PointF2D[] = [new PointF2D(note.headLeft, y), new PointF2D(note.headRight, y)];
        if (note.stem === (below ? -1 : 1)) {
            result.push(new PointF2D(note.stemX, note.stemTip));
        }
        return result;
    }

    /** The sky line (a slur above) or bottom line (below) of the staff line between fromX and toX, in the frame of
     *  origin: its notes' lines before the expressions were placed (StaffLine.NotesSkyLine). */
    private static lineObstacles(rules: EngravingRules, line: StaffLine, origin: PointF2D, below: boolean,
                                 fromX: number, toX: number): PointF2D[] {
        const values: number[] = (below ? line.NotesBottomLine : line.NotesSkyLine) ?? (below ? line.BottomLine : line.SkyLine);
        const sampling: number = rules.SamplingUnit;
        const result: PointF2D[] = [];
        if (!values?.length || !(sampling > 0)) {
            return result;
        }
        const first: number = Math.max(0, Math.floor((fromX - origin.x) * sampling));
        const last: number = Math.min(values.length - 1, Math.ceil((toX - origin.x) * sampling));
        for (let i: number = first; i <= last; i++) {
            const value: number = values[i];
            if (value === 0 || !isFinite(value)) {
                continue;
            }
            result.push(new PointF2D(origin.x + (i + 0.5) / sampling, origin.y + value));
        }
        return result;
    }

    /** The cross-staff beams held by the participants, from their notes' stem ends: the beam's lines at each stem and
     *  between two stems. */
    private beamObstacles(geometry: CrossStaffCurveGeometry, below: boolean): PointF2D[] {
        const unit: number = geometry.unitInPixels;
        const beams: CrossStaffBeam[] = [];
        for (const measure of this.participants) {
            for (const beam of (measure as VexFlowMeasure).crossStaffBeams ?? []) {
                if (beams.indexOf(beam) < 0) {
                    beams.push(beam);
                }
            }
        }
        const result: PointF2D[] = [];
        for (const beam of beams) {
            let previous: PointF2D = undefined;
            for (const vfNote of (beam as any).notes as any[]) {
                if (!(vfNote instanceof VF.StaveNote) || !(vfNote as any).getStem?.()) {
                    continue;
                }
                const note: any = vfNote;
                const x: number = note.getStemX() / unit;
                const tip: number = note.getStemExtents().topY / unit;
                const count: number = Math.max(1, note.getBeamCount());
                const thickness: number = 0.5 + (count - 1) * 0.75;
                const up: boolean = note.getStemDirection() === VF.Stem.UP;
                // the lines stack from the stem's end towards the notehead
                const y: number = below ? (up ? tip + thickness : tip) : (up ? tip : tip - thickness);
                const point: PointF2D = new PointF2D(x, y);
                if (previous) {
                    const steps: number = Math.ceil(Math.abs(x - previous.x) / 0.5);
                    for (let i: number = 1; i < steps; i++) {
                        const t: number = i / steps;
                        result.push(new PointF2D(previous.x + t * (x - previous.x), previous.y + t * (y - previous.y)));
                    }
                }
                result.push(point);
                previous = point;
            }
        }
        return result;
    }

    /**
     * One arch from p0 to p3 over (under, below) the obstacle points. Its control points lie at ControlFractions of the
     * line from either end, moved off it (vertically, or square to it: both are tried — a steep slur from the left hand
     * up into the right, Myrthen 3 m1, bows sideways) by the least amounts that clear every obstacle by
     * ObstacleClearance and give the slur its bow (EngravingRules.SlurCrossStaff*: 0.12 of its length, 0.8 to 2.5). The
     * curve's distance beyond the line is linear in the two amounts, and its place along the line doesn't depend on
     * them, so each obstacle is a linear constraint; the least sum is searched along 11 directions. Of the arches, the
     * one reaching least far from the line wins.
     */
    private fitArch(rules: EngravingRules, p0: PointF2D, p3: PointF2D, points: PointF2D[], below: boolean): Segment[] {
        const side: number = below ? 1 : -1;
        const dx: number = p3.x - p0.x;
        const dy: number = p3.y - p0.y;
        const length: number = CrossStaffCurve.distance(p0, p3);
        const ex: PointF2D = new PointF2D(dx / length, dy / length);
        const n: PointF2D = CrossStaffCurve.normal(p0, p3, below);
        const bow: number = CrossStaffCurve.bow(rules, p0, p3);
        // (sweep: the direction along which the curve's place doesn't depend on the offsets; offset: the direction the
        //   control points move, one unit of it one unit beyond the line)
        const families: [PointF2D, PointF2D][] = [
            ...(dx > 0.5 ? [[new PointF2D(1, 0), new PointF2D(0, side)] as [PointF2D, PointF2D]] : []),
            [ex, n],
        ];
        let result: Segment[] = undefined;
        let bestReach: number = undefined;
        for (const [sweep, offset] of families) {
            const along: (p: PointF2D) => number = (p: PointF2D): number => (p.x - p0.x) * sweep.x + (p.y - p0.y) * sweep.y;
            // beyond the line, measured along offset (zero on the line)
            const beyond: (p: PointF2D) => number = (p: PointF2D): number => offset.x === 0
                ? side * (p.y - p0.y - dy / dx * (p.x - p0.x))
                : (p.x - p0.x) * n.x + (p.y - p0.y) * n.y;
            // (the highest need in each quarter staff space along the sweep)
            const envelope: Map<number, [number, number]> = new Map<number, [number, number]>();
            for (const point of points) {
                const need: number = beyond(point) + CrossStaffCurve.ObstacleClearance;
                if (need <= 0) {
                    continue;
                }
                const w: number = along(point);
                const bin: number = Math.floor(w * 4);
                const kept: [number, number] = envelope.get(bin);
                if (!kept || need > kept[1]) {
                    envelope.set(bin, [w, need]);
                }
            }
            const needs: [number, number][] = Array.from(envelope.values());
            const end: number = along(p3);
            for (const a of CrossStaffCurve.ControlFractions) {
                for (const b of CrossStaffCurve.ControlFractions) {
                    const q1: PointF2D = new PointF2D(p0.x + a * dx, p0.y + a * dy);
                    const q2: PointF2D = new PointF2D(p3.x - b * dx, p3.y - b * dy);
                    const w1: number = along(q1);
                    const w2: number = along(q2);
                    const wAt: (t: number) => number = (t: number): number => {
                        const mt: number = 1 - t;
                        return 3 * mt * mt * t * w1 + 3 * mt * t * t * w2 + t * t * t * end;
                    };
                    // the sweep place of t is increasing: invert it from a table
                    const table: number[] = [];
                    for (let k: number = 0; k <= 64; k++) {
                        table.push(wAt(k / 64));
                    }
                    const tAt: (w: number) => number = (w: number): number => {
                        let lo: number = 0;
                        let hi: number = 64;
                        while (hi - lo > 1) {
                            const mid: number = Math.floor((lo + hi) / 2);
                            if (table[mid] < w) {
                                lo = mid;
                            } else {
                                hi = mid;
                            }
                        }
                        const span: number = table[hi] - table[lo];
                        const f: number = span <= 1e-12 ? 0 : (w - table[lo]) / span;
                        return (lo + Math.min(1, Math.max(0, f))) / 64;
                    };
                    // B1(t)·hA + B2(t)·hB >= need
                    const constraints: number[][] = [];
                    for (const [w, need] of needs) {
                        if (w > 0 && w < end) {
                            const t: number = tAt(w);
                            const mt: number = 1 - t;
                            constraints.push([3 * mt * mt * t, 3 * mt * t * t, need]);
                        }
                    }
                    constraints.push([0.375, 0.375, 0.75 * bow]);
                    let bestSum: number = Number.POSITIVE_INFINITY;
                    let hA: number = 0;
                    let hB: number = 0;
                    for (let i: number = 0; i <= 10; i++) {
                        const r: number = i / 10;
                        let raise: number = 0;
                        for (const c of constraints) {
                            const denominator: number = c[0] * r + c[1] * (1 - r);
                            raise = denominator <= 1e-9 ? Number.POSITIVE_INFINITY : Math.max(raise, c[2] / denominator);
                        }
                        if (raise < bestSum) {
                            bestSum = raise;
                            hA = r * raise;
                            hB = (1 - r) * raise;
                        }
                    }
                    if (bestSum > 20 * length) {
                        continue;
                    }
                    const segment: Segment = [
                        p0,
                        new PointF2D(q1.x + offset.x * hA, q1.y + offset.y * hA),
                        new PointF2D(q2.x + offset.x * hB, q2.y + offset.y * hB),
                        p3,
                    ];
                    // (between equal reaches, the more even places)
                    const reach: number = CrossStaffCurve.reach([segment], p0, p3, below) + 0.01 * Math.abs(a - b);
                    if (bestReach === undefined || reach < bestReach) {
                        bestReach = reach;
                        result = [segment];
                    }
                }
            }
        }
        return result ?? [[
            p0,
            new PointF2D(p0.x + dx / 3 + n.x * bow, p0.y + dy / 3 + n.y * bow),
            new PointF2D(p0.x + 2 * dx / 3 + n.x * bow, p0.y + 2 * dy / 3 + n.y * bow),
            p3,
        ]];
    }

    /** The curve over (under) the convex hull of the ends and the obstacles (each ObstacleClearance out), with the
     *  slur's least bow: a Catmull-Rom spline through the hull's corners. It follows obstacles that one arch can't
     *  clear without rising far past them. */
    private hullCurve(rules: EngravingRules, p0: PointF2D, p3: PointF2D, points: PointF2D[], below: boolean): Segment[] {
        const length: number = CrossStaffCurve.distance(p0, p3);
        const ex: PointF2D = new PointF2D((p3.x - p0.x) / length, (p3.y - p0.y) / length);
        const n: PointF2D = CrossStaffCurve.normal(p0, p3, below);
        const bow: number = 0.75 * CrossStaffCurve.bow(rules, p0, p3);
        // (u along the line from p0, v away from it on the slur's side)
        const frame: PointF2D[] = [
            new PointF2D(0, 0),
            ...[0.25, 0.5, 0.75].map(k => new PointF2D(k * length, 4 * k * (1 - k) * bow)),
            ...points.map(point => {
                const dx: number = point.x - p0.x;
                const dy: number = point.y - p0.y;
                return new PointF2D(dx * ex.x + dy * ex.y, dx * n.x + dy * n.y + CrossStaffCurve.ObstacleClearance);
            }),
            new PointF2D(length, 0),
        ].filter(point => point.x >= 0 && point.x <= length && point.y >= 0)
            .sort((a, b) => a.x - b.x);
        // the upper hull (largest v), left to right
        const hull: PointF2D[] = [];
        for (const point of frame) {
            while (hull.length >= 2) {
                const a: PointF2D = hull[hull.length - 2];
                const b: PointF2D = hull[hull.length - 1];
                const cross: number = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
                if (cross >= 0) {
                    hull.pop();
                } else {
                    break;
                }
            }
            hull.push(point);
        }
        const corners: PointF2D[] = CrossStaffCurve.simplify(hull, 0.25)
            .map(p => new PointF2D(p0.x + p.x * ex.x + p.y * n.x, p0.y + p.x * ex.y + p.y * n.y));
        corners[0] = p0;
        corners[corners.length - 1] = p3;
        const result: Segment[] = [];
        for (let i: number = 0; i + 1 < corners.length; i++) {
            const before: PointF2D = corners[Math.max(0, i - 1)];
            const a: PointF2D = corners[i];
            const b: PointF2D = corners[i + 1];
            const after: PointF2D = corners[Math.min(corners.length - 1, i + 2)];
            result.push([
                a,
                new PointF2D(a.x + (b.x - before.x) / 6, a.y + (b.y - before.y) / 6),
                new PointF2D(b.x - (after.x - a.x) / 6, b.y - (after.y - a.y) / 6),
                b,
            ]);
        }
        return result;
    }

    /** The line without the corners closer than tolerance to the line between their neighbours (Douglas-Peucker). */
    private static simplify(line: PointF2D[], tolerance: number): PointF2D[] {
        if (line.length <= 2) {
            return line;
        }
        const a: PointF2D = line[0];
        const b: PointF2D = line[line.length - 1];
        const length: number = Math.max(1e-9, CrossStaffCurve.distance(a, b));
        let farthest: number = 0;
        let distance: number = 0;
        for (let i: number = 1; i + 1 < line.length; i++) {
            const p: PointF2D = line[i];
            const d: number = Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / length;
            if (d > distance) {
                distance = d;
                farthest = i;
            }
        }
        if (distance <= tolerance) {
            return [a, b];
        }
        const left: PointF2D[] = CrossStaffCurve.simplify(line.slice(0, farthest + 1), tolerance);
        const right: PointF2D[] = CrossStaffCurve.simplify(line.slice(farthest), tolerance);
        return [...left, ...right.slice(1)];
    }

    /** The height of hullCurve()'s highest corner over the line from p0 to p3: the highest obstacle (with its
     *  clearance), or the least bow. */
    private static hullHeight(rules: EngravingRules, p0: PointF2D, p3: PointF2D, points: PointF2D[], below: boolean): number {
        const n: PointF2D = CrossStaffCurve.normal(p0, p3, below);
        let height: number = 0.75 * CrossStaffCurve.bow(rules, p0, p3);
        for (const point of points) {
            height = Math.max(height, (point.x - p0.x) * n.x + (point.y - p0.y) * n.y + CrossStaffCurve.ObstacleClearance);
        }
        return height;
    }

    private static bow(rules: EngravingRules, p0: PointF2D, p3: PointF2D): number {
        return Math.min(rules.SlurCrossStaffMaxBow,
                        Math.max(rules.SlurCrossStaffMinBow, CrossStaffCurve.distance(p0, p3) * rules.SlurCrossStaffBowFactor));
    }

    private static distance(a: PointF2D, b: PointF2D): number {
        return Math.sqrt((b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y));
    }

    /** How far the curve reaches from the line between p0 and p3. */
    private static reach(curve: Segment[], p0: PointF2D, p3: PointF2D, below: boolean): number {
        const n: PointF2D = CrossStaffCurve.normal(p0, p3, below);
        let reach: number = 0;
        for (const point of CrossStaffCurve.sampleOf(curve, 16)) {
            reach = Math.max(reach, (point.x - p0.x) * n.x + (point.y - p0.y) * n.y);
        }
        return reach;
    }

    /** The obstacles closer than MinClearance to the curve or past it (on its side of the line from its start to its
     *  end, outside the curve), away from its ends (an obstacle next to an end, its own notehead or stem, is reached). */
    private static uncleared(curve: Segment[], points: PointF2D[], below: boolean): number {
        const samples: PointF2D[] = CrossStaffCurve.sampleOf(curve, 32);
        const p0: PointF2D = samples[0];
        const p3: PointF2D = samples[samples.length - 1];
        const length: number = CrossStaffCurve.distance(p0, p3);
        const n: PointF2D = CrossStaffCurve.normal(p0, p3, below);
        let count: number = 0;
        for (const point of points) {
            const along: number = ((point.x - p0.x) * (p3.x - p0.x) + (point.y - p0.y) * (p3.y - p0.y)) / Math.max(1e-9, length);
            if (along < 0.75 || along > length - 0.75) {
                continue;
            }
            const beyondLine: boolean = (point.x - p0.x) * n.x + (point.y - p0.y) * n.y > 0;
            if (beyondLine && !CrossStaffCurve.inside(samples, point) ||
                CrossStaffCurve.distanceToPolyline(samples, point) < CrossStaffCurve.MinClearance) {
                count++;
            }
        }
        return count;
    }

    /** Whether the point is inside the polygon (closed by its ends). */
    private static inside(polygon: PointF2D[], point: PointF2D): boolean {
        let inside: boolean = false;
        for (let i: number = 0, j: number = polygon.length - 1; i < polygon.length; j = i++) {
            const a: PointF2D = polygon[i];
            const b: PointF2D = polygon[j];
            if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) {
                inside = !inside;
            }
        }
        return inside;
    }

    private static distanceToPolyline(line: PointF2D[], point: PointF2D): number {
        let best: number = Number.POSITIVE_INFINITY;
        for (let i: number = 0; i + 1 < line.length; i++) {
            const a: PointF2D = line[i];
            const b: PointF2D = line[i + 1];
            const dx: number = b.x - a.x;
            const dy: number = b.y - a.y;
            const squared: number = dx * dx + dy * dy;
            const t: number = squared < 1e-12 ? 0 : Math.min(1, Math.max(0, ((point.x - a.x) * dx + (point.y - a.y) * dy) / squared));
            best = Math.min(best, CrossStaffCurve.distance(point, new PointF2D(a.x + t * dx, a.y + t * dy)));
        }
        return best;
    }

    private static cubic(s: Segment, t: number): PointF2D {
        const mt: number = 1 - t;
        const a: number = mt * mt * mt;
        const b: number = 3 * mt * mt * t;
        const c: number = 3 * mt * t * t;
        const d: number = t * t * t;
        return new PointF2D(a * s[0].x + b * s[1].x + c * s[2].x + d * s[3].x, a * s[0].y + b * s[1].y + c * s[2].y + d * s[3].y);
    }

    private static sampleOf(curve: Segment[], perSegment: number): PointF2D[] {
        const result: PointF2D[] = [];
        for (let i: number = 0; i < curve.length; i++) {
            for (let k: number = i === 0 ? 0 : 1; k <= perSegment; k++) {
                result.push(CrossStaffCurve.cubic(curve[i], k / perSegment));
            }
        }
        return result;
    }

    /** The unit normal of the line from end to end towards the curve's arch. */
    public outerNormal(): PointF2D {
        return CrossStaffCurve.normal(this.startPoint, this.endPoint, this.placement === PlacementEnum.Below);
    }

    /** Points along the curve, perSegment steps on each segment. */
    public sample(perSegment: number = 24): PointF2D[] {
        return CrossStaffCurve.sampleOf(this.segments, perSegment);
    }

    /** The curve's outline to fill, in its frame: out by up to thickness on its outer side (a slur's 0.3 at its
     *  control points, as VexFlowMusicSheetDrawer.drawSlur(); a tie's 0.27, VexFlow's StaveTie), tapering to 0.05 at
     *  its ends. */
    public outline(thickness: number): PointF2D[] {
        const centre: PointF2D[] = this.sample(Math.max(8, Math.floor(48 / this.segments.length)));
        const total: number[] = [0];
        for (let i: number = 1; i < centre.length; i++) {
            total.push(total[total.length - 1] + CrossStaffCurve.distance(centre[i - 1], centre[i]));
        }
        const length: number = Math.max(1e-9, total[total.length - 1]);
        const n: PointF2D = this.outerNormal();
        const outer: PointF2D[] = [];
        for (let i: number = 0; i < centre.length; i++) {
            const a: PointF2D = centre[Math.max(0, i - 1)];
            const b: PointF2D = centre[Math.min(centre.length - 1, i + 1)];
            const dx: number = b.x - a.x;
            const dy: number = b.y - a.y;
            const d: number = Math.max(1e-9, Math.sqrt(dx * dx + dy * dy));
            let nx: number = -dy / d;
            let ny: number = dx / d;
            if (nx * n.x + ny * n.y < 0) {
                nx = -nx;
                ny = -ny;
            }
            const s: number = total[i] / length;
            const w: number = 0.05 + (0.75 * thickness - 0.05) * Math.sin(Math.PI * s);
            outer.push(new PointF2D(centre[i].x + nx * w, centre[i].y + ny * w));
        }
        return [...centre, ...outer.reverse()];
    }

    /** Reserves the curve, calculated in the layout frame, in the sky line of its upper staff where it runs over that
     *  staff and in the bottom line of its lower staff where it runs under it: a curve between the staves is left out
     *  (the staves' distance is not known yet, and the beams between them reserve their place,
     *  CrossStaffBeam.reservedStemLength()). */
    public reserveOuterSides(rules: EngravingRules, geometry: CrossStaffCurveLayoutGeometry): void {
        const startLine: StaffLine = this.startLine;
        const endLine: StaffLine = this.endLine;
        if (!startLine || !endLine || this.segments.length === 0) {
            return;
        }
        const upper: StaffLine = geometry.origin(startLine).y < geometry.origin(endLine).y ? startLine : endLine;
        const lower: StaffLine = upper === startLine ? endLine : startLine;
        const upperOrigin: PointF2D = geometry.origin(upper);
        const lowerOrigin: PointF2D = geometry.origin(lower);
        const sampling: number = rules.SamplingUnit;
        const width: number = Math.abs(this.endPoint.x - this.startPoint.x);
        const steps: number = Math.max(16, Math.ceil(width * sampling * 2 / this.segments.length));
        const skyLine: number[] = upper.SkyLine;
        const bottomLine: number[] = lower.BottomLine;
        for (const point of this.sample(steps)) {
            const ui: number = Math.floor((point.x - upperOrigin.x) * sampling);
            if (ui >= 0 && ui < skyLine.length) {
                skyLine[ui] = Math.min(skyLine[ui], point.y - upperOrigin.y);
            }
            const li: number = Math.floor((point.x - lowerOrigin.x) * sampling);
            if (li >= 0 && li < bottomLine.length) {
                bottomLine[li] = Math.max(bottomLine[li], point.y - lowerOrigin.y);
            }
        }
    }
}
