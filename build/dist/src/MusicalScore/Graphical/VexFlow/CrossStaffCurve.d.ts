import { PointF2D } from "../../../Common/DataObjects/PointF2D";
import { PlacementEnum } from "../../VoiceData/Expressions/AbstractExpression";
import { BoundingBox } from "../BoundingBox";
import { EngravingRules } from "../EngravingRules";
import { GraphicalMeasure } from "../GraphicalMeasure";
import { GraphicalNote } from "../GraphicalNote";
import { GraphicalSlur } from "../GraphicalSlur";
import { StaffLine } from "../StaffLine";
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
export declare class CrossStaffCurveDrawGeometry implements CrossStaffCurveGeometry {
    readonly hasBeams: boolean;
    readonly unitInPixels: number;
    constructor(unitInPixels: number);
    origin(staffLine: StaffLine): PointF2D;
    note(note: GraphicalNote): CrossStaffCurveNote | undefined;
}
/** The layout's boxes in units relative to the system, before the staves of the system are placed (for the curve's
 *  first, approximate reservation in the staves' sky and bottom lines). */
export declare class CrossStaffCurveLayoutGeometry implements CrossStaffCurveGeometry {
    readonly hasBeams: boolean;
    readonly unitInPixels: number;
    private readonly system;
    constructor(system: BoundingBox);
    private position;
    origin(staffLine: StaffLine): PointF2D;
    note(note: GraphicalNote): CrossStaffCurveNote | undefined;
}
/** A cubic Bézier segment: [start, control, control, end]. */
type Segment = PointF2D[];
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
export declare class CrossStaffCurve {
    /** clearance of a slur over (under) its obstacles */
    private static readonly ObstacleClearance;
    private static readonly MinClearance;
    /** The places of an arch's control points tried along the line between its ends, as fractions of it from their
     *  ends: near an end, the arch turns steeply into it. */
    private static readonly ControlFractions;
    /** The calculated curve, in the frame of the last calculate(): cubic Bézier segments, end to end. */
    segments: Segment[];
    placement: PlacementEnum;
    /** whether the last slur calculate() followed its obstacles' hull instead of one arch */
    followsHull: boolean;
    /** obstacles the last calculate() left closer than MinClearance to (or past) the curve */
    unclearedObstacles: number;
    /** set by the drawer when it draws the curve (cleared by its caller) */
    rendered: boolean;
    /** the slur, undefined for a tie */
    readonly graphicalSlur: GraphicalSlur | undefined;
    readonly startNote: GraphicalNote;
    readonly endNote: GraphicalNote;
    /** for a tie: its direction in the XML (Tie.getTieDirection()), else not yet defined (tieBelow()) */
    readonly tieDirection: PlacementEnum | undefined;
    /** the measures from the start note's to the end note's, on both staves */
    readonly participants: GraphicalMeasure[];
    private constructor();
    static slur(graphicalSlur: GraphicalSlur, startNote: GraphicalNote, endNote: GraphicalNote, participants: GraphicalMeasure[]): CrossStaffCurve;
    static tie(startNote: GraphicalNote, endNote: GraphicalNote, direction: PlacementEnum, participants: GraphicalMeasure[]): CrossStaffCurve;
    get isTie(): boolean;
    get startPoint(): PointF2D;
    get endPoint(): PointF2D;
    private get startLine();
    private get endLine();
    /** Calculates the curve in the geometry's frame. False when its notes are not both placed in one system. */
    calculate(rules: EngravingRules, geometry: CrossStaffCurveGeometry): boolean;
    /** A tie between two staves: from beside the start notehead to beside the end notehead, arched to its side by a
     *  tie's height for its length (as VexFlowPatch's StaveTie with curve_by_length: h = 0.36 + 0.082 × length in staff
     *  spaces, 0.4 to 1.5). */
    private calculateTie;
    /** The XML direction, else away from the start note's stem (a tie's usual side), else from the end note's; up for
     *  two stemless notes. */
    private tieBelow;
    /** The unit normal of the line from a to b on the curve's side (y grows downwards: below = pointing down). */
    private static normal;
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
    private calculateSlur;
    /** The ends tried at the note: the notehead, and its stem's end when the stem points to the slur's side (usual
     *  first). */
    private static endChoices;
    /** The XML placement, else away from the slur's own notes between its ends (most of them above the line from end
     *  to end: below), else as upstream (a slur up to the upper staff above, down to the lower one below). */
    private placementOf;
    /** The slur's end at the note: at its stem's end (atStem) or beside its notehead on the slur's side. */
    private static endPointOf;
    /** The notes of the slur's voices (its start note's and end note's) strictly between its two notes. */
    private voiceNotesBetween;
    /** A note's ink on the slur's side: its notehead, and its stem's end when the stem points that way. */
    private static noteObstacles;
    /** The sky line (a slur above) or bottom line (below) of the staff line between fromX and toX, in the frame of
     *  origin: its notes' lines before the expressions were placed (StaffLine.NotesSkyLine). */
    private static lineObstacles;
    /** The cross-staff beams held by the participants, from their notes' stem ends: the beam's lines at each stem and
     *  between two stems. */
    private beamObstacles;
    /**
     * One arch from p0 to p3 over (under, below) the obstacle points. Its control points lie at ControlFractions of the
     * line from either end, moved off it (vertically, or square to it: both are tried — a steep slur from the left hand
     * up into the right, Myrthen 3 m1, bows sideways) by the least amounts that clear every obstacle by
     * ObstacleClearance and give the slur its bow (EngravingRules.SlurCrossStaff*: 0.12 of its length, 0.8 to 2.5). The
     * curve's distance beyond the line is linear in the two amounts, and its place along the line doesn't depend on
     * them, so each obstacle is a linear constraint; the least sum is searched along 11 directions. Of the arches, the
     * one reaching least far from the line wins.
     */
    private fitArch;
    /** The curve over (under) the convex hull of the ends and the obstacles (each ObstacleClearance out), with the
     *  slur's least bow: a Catmull-Rom spline through the hull's corners. It follows obstacles that one arch can't
     *  clear without rising far past them. */
    private hullCurve;
    /** The line without the corners closer than tolerance to the line between their neighbours (Douglas-Peucker). */
    private static simplify;
    private static bow;
    private static distance;
    /** How far the curve reaches from the line between p0 and p3. */
    private static reach;
    /** The obstacles closer than MinClearance to the curve or past it (on its side of the line from its start to its
     *  end, outside the curve), away from its ends (an obstacle next to an end, its own notehead or stem, is reached). */
    private static uncleared;
    /** Whether the point is inside the polygon (closed by its ends). */
    private static inside;
    private static distanceToPolyline;
    private static cubic;
    private static sampleOf;
    /** The unit normal of the line from end to end towards the curve's arch. */
    outerNormal(): PointF2D;
    /** Points along the curve, perSegment steps on each segment. */
    sample(perSegment?: number): PointF2D[];
    /** The curve's outline to fill, in its frame: out by up to thickness on its outer side (a slur's 0.3 at its
     *  control points, as VexFlowMusicSheetDrawer.drawSlur(); a tie's 0.27, VexFlow's StaveTie), tapering to 0.05 at
     *  its ends. */
    outline(thickness: number): PointF2D[];
    /** Reserves the curve, calculated in the layout frame, in the sky line of its upper staff where it runs over that
     *  staff and in the bottom line of its lower staff where it runs under it: a curve between the staves is left out
     *  (the staves' distance is not known yet, and the beams between them reserve their place,
     *  CrossStaffBeam.reservedStemLength()). */
    reserveOuterSides(rules: EngravingRules, geometry: CrossStaffCurveLayoutGeometry): void;
}
export {};
