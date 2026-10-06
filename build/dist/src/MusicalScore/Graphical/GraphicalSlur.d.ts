import { GraphicalCurve } from "./GraphicalCurve";
import { Slur } from "../VoiceData/Expressions/ContinuousExpressions/Slur";
import { PlacementEnum } from "../VoiceData/Expressions/AbstractExpression";
import { EngravingRules } from "./EngravingRules";
import { GraphicalStaffEntry } from "./GraphicalStaffEntry";
export declare class GraphicalSlur extends GraphicalCurve {
    constructor(slur: Slur, rules: EngravingRules);
    slur: Slur;
    staffEntries: GraphicalStaffEntry[];
    placement: PlacementEnum;
    graceStart: boolean;
    graceEnd: boolean;
    /** A piece of a slur between the two staves of an instrument that is drawn as two pieces, one on each staff
     *  (see VexFlowMusicSheetCalculator.crossStaffSlurIsSplit()): its start piece ends at the end of the start note's
     *  measure, its end piece starts at the start of the following measure, instead of at the staff line's ends. */
    isCrossStaffPiece: boolean;
    /** A piece of a slur into a second ending, split where the endings part (see
     *  VexFlowMusicSheetCalculator.splitSlursIntoVoltas()): the end without its note is at its measure's barline. */
    isVoltaPiece: boolean;
    private rules;
    SVGElement: Node;
    /**
     * Compares the timespan of two Graphical Slurs
     * @param x
     * @param y
     */
    static Compare(x: GraphicalSlur, y: GraphicalSlur): number;
    /**
     *
     * @param rules
     */
    calculateCurve(rules: EngravingRules): void;
    /**
     * Calculates the bezier curve for a slur that crosses between two staves (e.g. left hand to right hand),
     * where the start and end notes lie on different stafflines that are stacked vertically within the same
     * MusicSystem. Unlike [[calculateCurve]], this runs at draw time, because it needs the final vertical
     * positions of both stafflines, which aren't fixed until the system Y-layout (after calculateSlurs()).
     *
     * The resulting bezier points are stored relative to the start note's staffline, so the regular drawSlur()
     * (which adds that staffline's absolute position) renders them at the correct absolute location.
     * @returns true if the curve was calculated and can be drawn, false otherwise (e.g. missing notes, or the
     * two staves are not in the same MusicSystem - a cross-staff plus cross-system slur is not supported).
     */
    calculateCurveCrossStaff(rules: EngravingRules): boolean;
    /**
     * Sums the relative positions from box up to (but not including) the given ancestor box, giving box's
     * position in the ancestor's coordinate system.
     */
    private positionRelativeToBox;
    /**
     * This method calculates the Start and End Positions of the Slur Curve.
     * @param slurStartNote
     * @param slurEndNote
     * @param staffLine
     * @param startX
     * @param startY
     * @param endX
     * @param endY
     * @param rules
     * @param skyBottomLineCalculator
     */
    /** Space (in units) a slur keeps from an ornament under or over it. */
    static readonly ornamentClearance: number;
    /** How far (in units) the slur's drawing reaches out from its curve in the middle: VexFlowMusicSheetDrawer.drawSlur
     *  draws an outer curve with control points 0.3 out. */
    static readonly thickness: number;
    /**
     * The curve above follows the sky line only roughly: it can pass through an ornament under the slur. Raise
     * both control points until the curve clears by [[ornamentClearance]] every ornament above the notes in the
     * middle of the slur's sky line range (rangeStartX to rangeEndX, see [[isInMiddleOfSlur]]), when that takes a
     * modest raise: up to 1.5 units and 0.35 of the slur's width. A steeper raise makes a loop over a short slur;
     * such an ornament, as one over the slur's first or last note, stays outside the slur and is raised over it
     * instead (VexFlowMusicSheetCalculator.layoutOrnament()). Raising both control points by d raises the curve
     * at t by 3·t·(1−t)·d.
     */
    private liftOverOrnaments;
    /**
     * [[liftOverOrnaments]] for a slur below the notes and the ornaments below them (a lower voice, Couperin,
     * Concerts royaux I Menuet en trio): lower both control points until the curve passes under every ornament in
     * the middle of the slur's bottom line range by ornamentClearance.
     */
    private lowerUnderOrnaments;
    /**
     * A slur's sky/bottom line range runs from the right edge of its start staff entry to the left edge of its
     * end staff entry. A grace note shares its main note's staff entry, so a slur from a grace note before its
     * main note, or to a grace note after it, left out the main note under the slur and the ornament over it
     * (Couperin, Concerts royaux I Prelude m7). Start (end) the range at the grace note itself instead, when the
     * main note has an ornament near the middle of the slur (within a fifth of its width, see [[isInMiddleOfSlur]]).
     * Off the middle, the slur's tangents would see the ornament near one end and throw a steep, lopsided arch over
     * it; the ornament goes over the slur instead (VexFlowMusicSheetCalculator.layoutOrnament()).
     */
    private static readonly graceRangeMargin;
    private static readonly graceRangeMiddle;
    /**
     * Whether x is in the middle of the slur from startX to endX: at least margin of its width from either end. A
     * slur keeps an ornament in its middle half inside it; it can't clear one near its start or end without a steep
     * arch, so such an ornament goes over the slur (VexFlowMusicSheetCalculator.layoutOrnament()).
     */
    private static isInMiddleOfSlur;
    /** Whether a note of the entry has an ornament on the slur's side near the middle of the slur from startX to endX. */
    private hasOrnamentInMiddle;
    private graceRangeStartX;
    private graceRangeEndX;
    private calculateStartAndEnd;
    /** Y of a slur-above end point: no lower than 1.5 while the point is within the staff. */
    private static clampEndPointAbove;
    /** Y of a slur-below end point: no higher than StaffHeight - 1.5 while the point is within the staff. */
    private static clampEndPointBelow;
    /** Where a slur without end note ends (see Slur.HasUnattachedEnd), relative to the staffline: at the barline of its
     *  measure, before the end instructions like a repeat sign or a clef change at the measure end.
     *  If that's too close to the start note to look like a slur (e.g. before a repeat sign), it reaches a bit past the note,
     *  over the repeat dots, but not up to the barline.
     */
    /** Start x (relative to the staff line) of a cross-staff piece without its start note: after the begin
     *  instructions of its first measure (also a volta piece, see isVoltaPiece). Undefined for other slurs (the staff
     *  line's start). */
    private pieceStartX;
    /** End x of a cross-staff piece without its end note: the end of its last measure (see [[pieceStartX]]). */
    private pieceEndX;
    private getUnattachedEndX;
    /**
     * This method calculates the placement of the Curve.
     * @param skyBottomLineCalculator
     * @param staffLine
     */
    private calculatePlacement;
    /**
     * This method calculates the Points between Start- and EndPoint (case above).
     * @param start
     * @param end
     * @param staffLine
     * @param skyBottomLineCalculator
     */
    private calculateTopPoints;
    /**
     * This method calculates the Points between Start- and EndPoint (case below).
     * @param start
     * @param end
     * @param staffLine
     * @param skyBottomLineCalculator
     */
    private calculateBottomPoints;
    /**
     * This method calculates the maximum slope between StartPoint and BetweenPoints.
     * @param points
     * @param start
     * @param end
     */
    private calculateMaxLeftSlope;
    /**
     * This method calculates the maximum slope between EndPoint and BetweenPoints.
     * @param points
     * @param start
     * @param end
     */
    private calculateMaxRightSlope;
    /**
     * This method returns the maximum (meaningful) points.Y.
     * @param points
     */
    private getPointListMaxY;
    /**
     * This method calculates the translated and rotated PointsList (case above).
     * @param points
     * @param startX
     * @param startY
     * @param rotationMatrix
     */
    private calculateTranslatedAndRotatedPointListAbove;
    /**
     * This method calculates the translated and rotated PointsList (case below).
     * @param points
     * @param startX
     * @param startY
     * @param rotationMatrix
     */
    private calculateTranslatedAndRotatedPointListBelow;
    /**
     * This method calculates the HeightWidthRatio between the MaxYpoint (from the points between StartPoint and EndPoint)
     * and the X-distance from StartPoint to EndPoint.
     * @param endX
     * @param points
     */
    private calculateHeightWidthRatio;
    /**
     * This method calculates the 2 ControlPoints of the SlurCurve.
     * @param endX
     * @param startAngle
     * @param endAngle
     * @param points
     */
    private calculateControlPoints;
    /**
     * This method calculates the angles for the Curve's Tangent Lines.
     * @param leftAngle
     * @param rightAngle
     * @param startLineSlope
     * @param endLineSlope
     * @param maxAngle
     */
    private calculateAngles;
    private static degreesToRadiansFactor;
}
