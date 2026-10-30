
import { PointF2D } from "../../Common/DataObjects/PointF2D";
import { GraphicalNote } from "./GraphicalNote";
import { GraphicalCurve } from "./GraphicalCurve";
import { Slur } from "../VoiceData/Expressions/ContinuousExpressions/Slur";
import { PlacementEnum } from "../VoiceData/Expressions/AbstractExpression";
import { Articulation } from "../VoiceData/Articulation";
import { EngravingRules } from "./EngravingRules";
import { StaffLine } from "./StaffLine";
import { SkyBottomLineCalculator } from "./SkyBottomLineCalculator";
import { Matrix2D } from "../../Common/DataObjects/Matrix2D";
import { LinkedVoice } from "../VoiceData/LinkedVoice";
import { GraphicalVoiceEntry } from "./GraphicalVoiceEntry";
import { GraphicalStaffEntry } from "./GraphicalStaffEntry";
import { GraphicalMeasure } from "./GraphicalMeasure";
import { BoundingBox } from "./BoundingBox";
import { Fraction } from "../../Common/DataObjects/Fraction";
import { ArticulationEnum, StemDirectionType, VoiceEntry } from "../VoiceData/VoiceEntry";
import { VexFlowGraphicalNote, VexFlowMeasure, VexFlowVoiceEntry } from "./VexFlow";
import { CrossStaffCurve } from "./VexFlow/CrossStaffCurve";
import { GraphicalLabel } from "./GraphicalLabel";
import { MusicSystem } from "./MusicSystem";
import { unitInPixels } from "./VexFlow/VexFlowMusicSheetDrawer";
import { Note } from "../VoiceData/Note";
import { Tie } from "../VoiceData/Tie";
import Vex from "vexflow";
import VF = Vex.Flow;

/** A voice entry's box relative to the staff line (see GraphicalSlur.betweenVoices()). */
type VoiceEntryBox = { left: number, right: number, top: number, bottom: number, first: boolean, last: boolean, rest: boolean };
/** The slur's own voice's entries and the other voices' entries on the staff under a slur between voices. */
type BetweenVoices = { own: VoiceEntryBox[], others: VoiceEntryBox[] };
/** An articulation or an ornament of a slur's start or end note, relative to the staff line: its left and right, and its near and
 *  far edges as distances outward from the staff on the slur's side (see GraphicalSlur.getOutwardExtent()). */
interface ArticulationExtent {
    left: number;
    right: number;
    near: number;
    far: number;
    /** Whether it goes inside the slur also at the slur's start or end note (see GraphicalSlur.getYPastArticulations()). */
    inside: boolean;
}

/** An articulation or an ornament that GraphicalSlur.getYPastArticulations() left outside the slur, at its start or end note. */
interface ArticulationOutside extends ArticulationExtent {
    isStart: boolean;
    /** The Vexflow articulation or ornament, moved beyond the slur by GraphicalSlur.placeArticulationsOutside(). */
    articulation: any;
    /** Its extent as Vexflow draws it now, e.g. after moving it. */
    measure: () => ArticulationExtent;
}

/** While GraphicalSlur.calculateCurve() calculates the curve again past the fingerings of its start and end notes it ran into
 *  (see GraphicalSlur.retryPastEndFingerings()): those fingerings, how far out the curve got before (see
 *  GraphicalSlur.placePastEndFingerings()), and whether it then went beside them (see GraphicalSlur.retryPastBesideFingerings()):
 *  notBeside is undefined while it may, true while the curve is calculated past them after it ran into what is at its ends beside
 *  them (besideDepth: how far), and false when it went beside them again, as it ran in about as deep past them. */
interface FingeringsRunInto {
    start: BoundingBox[];
    end: BoundingBox[];
    furthestOut: number;
    besideDepth?: number;
    notBeside?: boolean;
}

/** A label stacked on the articulations left outside a slur at its start or end note, a fingering or a measure number, which
 *  moves along with them (see GraphicalSlur.placeArticulationsOutside()). */
interface LabelOutside {
    box: BoundingBox;
    isStart: boolean;
    /** Its left and right, relative to the staffline (the box of a measure number is relative to the music system in x, see
     *  MusicSheetCalculator.calculateSingleMeasureNumberPlacement()). */
    left: number;
    right: number;
    /** Whether it is a fingering, not a measure number. */
    isFingering: boolean;
}

export class GraphicalSlur extends GraphicalCurve {
    // private intersection: PointF2D;

    constructor(slur: Slur, rules: EngravingRules) {
        super();
        this.slur = slur;
        this.rules = rules;
    }

    public slur: Slur;
    public staffEntries: GraphicalStaffEntry[] = [];
    public placement: PlacementEnum;
    public graceStart: boolean;
    public graceEnd: boolean;
    /** A piece of a slur between the two staves of an instrument that is drawn as two pieces, one on each staff
     *  (see VexFlowMusicSheetCalculator.crossStaffSlurIsSplit()): its start piece ends at the end of the start note's
     *  measure, its end piece starts at the start of the following measure, instead of at the staff line's ends. */
    public isCrossStaffPiece: boolean = false;
    /** The side of a cross-staff piece (isCrossStaffPiece) on the end note's staff of a slur that runs between the
     *  staves (the side facing the start staff: CrossStaffCurve.runsBetweenStaves(), Bellini Torna vezzosa Fillide
     *  m2-5 on the web), before the XML's placement. Undefined otherwise. */
    public pieceSide: PlacementEnum | undefined;
    /** The one curve of a slur between two staves of one system (drawn by the drawer with its measures, not with this
     *  slur's staff line). */
    public crossStaffCurve: CrossStaffCurve;
    /** A piece of a slur into a second ending, split where the endings part (see
     *  VexFlowMusicSheetCalculator.splitSlursIntoVoltas()): the end without its note is at its measure's barline. */
    public isVoltaPiece: boolean = false;
    private rules: EngravingRules;
    public SVGElement: Node;
    /** While calculateCurve() calculates the curve again past the fingerings of its start and end notes it ran into, see
     *  FingeringsRunInto. */
    private fingeringsRunInto: FingeringsRunInto;
    /** The far corners of the articulations of the start and end notes the slur clears, for clearObstacles(), see getYPastArticulations(). */
    private articulationCorners: PointF2D[] = [];
    /** The articulations of the start and end notes that getYPastArticulations() left outside the slur, from the note outward,
     *  see placeArticulationsOutside(). */
    private articulationsOutside: ArticulationOutside[] = [];
    /** The fingerings and measure numbers stacked on the articulations left outside the slur, see placeArticulationsOutside(). */
    private labelsOutside: LabelOutside[] = [];
    /** While calculateCurve() calculates the curve again with the slur past every articulation of its start or end note (or both),
     *  see retryPastArticulationsOutside(). */
    private clearingEveryArticulationAt: {start: boolean, end: boolean};

    /**
     * Compares the timespan of two Graphical Slurs
     * @param x
     * @param y
     */
    public static Compare (x: GraphicalSlur, y: GraphicalSlur ): number {
        if (x.staffEntries.length < 1) { // x.staffEntries[i] can return undefined in Beethoven Moonlight Sonata sample
            return -1;
        } else if (y.staffEntries.length < 1) {
            return 1;
        }
        const xTimestampSpan: Fraction = Fraction.minus(x.staffEntries[x.staffEntries.length - 1].getAbsoluteTimestamp(),
                                                        x.staffEntries[0].getAbsoluteTimestamp());
        const yTimestampSpan: Fraction = Fraction.minus(y.staffEntries[y.staffEntries.length - 1].getAbsoluteTimestamp(),
                                                        y.staffEntries[0].getAbsoluteTimestamp());

        if (xTimestampSpan.RealValue > yTimestampSpan.RealValue) {
            return 1;
        }

        if (yTimestampSpan.RealValue > xTimestampSpan.RealValue) {
            return -1;
        }

        // Pieces over the same time: the slur that is longer as a whole is the outer one and is placed after the inner one, as
        // without a system break (Alma del core, piano m89-90: the piece of the slur from m89 continued on the next system and
        // the slur from that system's first note to the same end note - placed first, the continued piece pushed the inner slur
        // up into a high arch over it, crossing it).
        const xSlurSpan: number = GraphicalSlur.slurTimeSpan(x.slur);
        const ySlurSpan: number = GraphicalSlur.slurTimeSpan(y.slur);
        if (xSlurSpan !== undefined && ySlurSpan !== undefined) {
            if (xSlurSpan > ySlurSpan) {
                return 1;
            }
            if (ySlurSpan > xSlurSpan) {
                return -1;
            }
        }

        return 0;
    }

    /** The time from the start note to the end note of the slur (undefined without both notes). */
    private static slurTimeSpan(slur: Slur): number {
        if (!slur.StartNote || !slur.EndNote) {
            return undefined;
        }
        return Fraction.minus(slur.EndNote.getAbsoluteTimestamp(), slur.StartNote.getAbsoluteTimestamp()).RealValue;
    }

    /** The height of this piece at a system edge where it is continued from another system (start) or to the next one (end),
     *  from its last calculateCurve(); undefined with its note there. See outsideContinuedPieces(). */
    private continuedStartY: number;
    private continuedEndY: number;

    /** y (with SlurNoteHeadYOffset) at the system edge at x where this piece is continued from another system (start) or to
     *  the next one, out of every piece placed before it on the staff line (Compare: covering less time - a slur inside it)
     *  continued at the same edge on the same side, by SlursStartingAtSameStaffEntryYOffset as for slurs from the same note.
     *  Such a piece took its height at the edge from its other end only (1 unit out), so the outer piece, ending at a note lower
     *  than the inner one's, started inside it and crossed it (Alma del core, piano m50-51 on the web: the slur from the m49 chord
     *  to the m52 chord over the slur from the m50 E5 to the m51 D5, 1.7 units inside it at m51, and 0.5 at the end of the
     *  system before); in the print the outer one goes over the inner one. */
    private outsideContinuedPieces(staffLine: StaffLine, x: number, y: number, rules: EngravingRules, start: boolean): number {
        const offset: number = rules.SlursStartingAtSameStaffEntryYOffset;
        for (const other of staffLine.GraphicalSlurs) {
            if (other === this || other.placement !== this.placement) {
                continue;
            }
            const otherY: number = start ? other.continuedStartY : other.continuedEndY;
            if (otherY === undefined || GraphicalSlur.Compare(other, this) >= 0) {
                continue;
            }
            const otherX: number = start ? other.bezierStartPt.x : other.bezierEndPt.x;
            if (Math.abs(otherX - x) > 0.5) {
                continue;
            }
            y = this.placement === PlacementEnum.Below ? Math.max(y, otherY + offset) : Math.min(y, otherY - offset);
        }
        return y;
    }

    /**
     *
     * @param rules
     */
    public calculateCurve(rules: EngravingRules): void {
        this.continuedStartY = this.continuedEndY = undefined;

        // single GraphicalSlur means a single Curve, eg each GraphicalSlurObject is meant to be on the same StaffLine
        // a Slur can span more than one GraphicalSlurObjects
        const startStaffEntry: GraphicalStaffEntry = this.staffEntries[0];
        const endStaffEntry: GraphicalStaffEntry = this.staffEntries[this.staffEntries.length - 1];

        // where the Slur (not the graphicalObject) starts and ends (could belong to another StaffLine)
        let slurStartNote: GraphicalNote = startStaffEntry.findGraphicalNoteFromNote(this.slur.StartNote);
        if (!slurStartNote && this.graceStart) {
            slurStartNote = startStaffEntry.findGraphicalNoteFromGraceNote(this.slur.StartNote);
        }
        if (!slurStartNote) {
            slurStartNote = startStaffEntry.findEndTieGraphicalNoteFromNoteWithStartingSlur(this.slur.StartNote, this.slur);
        }
        let slurEndNote: GraphicalNote = endStaffEntry.findGraphicalNoteFromNote(this.slur.EndNote);
        if (!slurEndNote && this.graceEnd) {
            slurEndNote = endStaffEntry.findGraphicalNoteFromGraceNote(this.slur.EndNote);
        }

        const staffLine: StaffLine = startStaffEntry.parentMeasure.ParentStaffLine;
        const skyBottomLineCalculator: SkyBottomLineCalculator = staffLine.SkyBottomLineCalculator;

        this.calculatePlacement(skyBottomLineCalculator, staffLine);

        if (this.calculateInnerChordCurve(slurStartNote, slurEndNote)) {
            return;
        }
        const outsideShift: number = this.innerChordCurveOutside ?
            (this.placement === PlacementEnum.Below ? 1 : -1) * GraphicalSlur.innerSlurOutsideShift : 0;

        // the Start- and End Reference Points for the Sky-BottomLine
        const headToHead: boolean = this.isHeadToHeadBetweenVoices(slurStartNote, slurEndNote);
        const between: BetweenVoices = headToHead || this.betweenVoicesFallback ? undefined : this.betweenVoices(slurStartNote, slurEndNote);
        this.IsBetweenVoices = false;
        const startEndPoints: {startX: number, startY: number, endX: number, endY: number} = headToHead ?
            this.calculateHeadToHeadStartAndEnd(slurStartNote, slurEndNote) :
            this.calculateStartAndEnd(slurStartNote, slurEndNote, staffLine, rules, skyBottomLineCalculator, between !== undefined);

        let startX: number = startEndPoints.startX;
        let endX: number = startEndPoints.endX;
        let startY: number = startEndPoints.startY + outsideShift;
        let endY: number = startEndPoints.endY + outsideShift;
        // from a note to the next one, in this staffline: nothing between them for the curve to clear (see placePastEndFingerings())
        const toNextNote: boolean = this.staffEntries.length === 2 && slurStartNote !== undefined && slurEndNote !== undefined;

        // Degenerate case: start and end point (nearly) coincide, e.g. for a zero-length slur from a malformed
        // file. The curve calculation below would divide 0 by 0 (start-end angle, tangent slopes) and produce
        // NaN control points, ending up as an invalid SVG path - use a collapsed (invisible) curve instead.
        if (Math.abs(endX - startX) < 0.0001 && Math.abs(endY - startY) < 0.0001) {
            this.bezierStartPt = new PointF2D(startX, startY);
            this.bezierStartControlPt = new PointF2D(startX, startY);
            this.bezierEndControlPt = new PointF2D(endX, endY);
            this.bezierEndPt = new PointF2D(endX, endY);
            return;
        }

        const minAngle: number = rules.SlurTangentMinAngle;
        const maxAngle: number = rules.SlurTangentMaxAngle;
        let points: PointF2D[];

        if (this.placement === PlacementEnum.Above) {
            startY -= rules.SlurNoteHeadYOffset;
            endY -= rules.SlurNoteHeadYOffset;
            if (!slurStartNote) {
                startY = this.outsideContinuedPieces(staffLine, startX, startY, rules, true);
            }
            if (!slurEndNote && this.slur.EndNote) {
                endY = this.outsideContinuedPieces(staffLine, endX, endY, rules, false);
            }
            const startUpperRight: PointF2D = new PointF2D(this.staffEntries[0].parentMeasure.PositionAndShape.RelativePosition.x
                                                           + this.staffEntries[0].PositionAndShape.RelativePosition.x,
                                                           startY);
            if (slurStartNote) {
                    startUpperRight.x += this.staffEntries[0].PositionAndShape.BorderRight;
            } else  {
                    // continuing Slur from previous StaffLine - must start after last Instruction of first Measure
                    startUpperRight.x = this.pieceStartX() ?? this.staffEntries[0].parentMeasure.beginInstructionsWidth;
            }

            // must also add the GraceStaffEntry's ParentStaffEntry Position
            if (this.graceStart) {
                startUpperRight.x += endStaffEntry.PositionAndShape.RelativePosition.x;
            }

            const endUpperLeft: PointF2D = new PointF2D(this.staffEntries[this.staffEntries.length - 1].parentMeasure.PositionAndShape.RelativePosition.x
                                                        + this.staffEntries[this.staffEntries.length - 1].PositionAndShape.RelativePosition.x,
                                                        endY);
            if (slurEndNote) {
                    endUpperLeft.x += this.staffEntries[this.staffEntries.length - 1].PositionAndShape.BorderLeft;
            } else if (!this.slur.EndNote) {
                    endUpperLeft.x = this.getUnattachedEndX();
            } else {
                    // Slur continues to next StaffLine - must reach the end of current StaffLine
                    endUpperLeft.x = this.staffEntries[this.staffEntries.length - 1].parentMeasure.PositionAndShape.RelativePosition.x
                    + this.staffEntries[this.staffEntries.length - 1].parentMeasure.PositionAndShape.Size.width;
            }

            // must also add the GraceStaffEntry's ParentStaffEntry Position
            if (this.graceEnd) {
                endUpperLeft.x += endStaffEntry.staffEntryParent.PositionAndShape.RelativePosition.x;
            }

            startUpperRight.x = this.graceRangeStartX(startUpperRight.x, slurStartNote, startX, endX);
            endUpperLeft.x = this.graceRangeEndX(endUpperLeft.x, slurEndNote, startX, endX);

            // above or beside the fingerings of the start and end notes the curve ran into, see retryPastEndFingerings()
            const start: PointF2D = this.placePastEndFingerings(slurStartNote, true, startX, startY, startUpperRight.x, endX,
                                                                this.fingeringsRunInto?.start, toNextNote);
            const end: PointF2D = this.placePastEndFingerings(slurEndNote, false, endX, endY, endUpperLeft.x, startX,
                                                              this.fingeringsRunInto?.end, toNextNote);
            const beside: boolean = start.x !== startX || end.x !== endX;
            if (beside) { // the sky line points stay between the start and the end
                startUpperRight.x = Math.max(startUpperRight.x, start.x);
                endUpperLeft.x = Math.min(endUpperLeft.x, end.x);
            }
            [startX, startY, endX, endY] = [start.x, start.y, end.x, end.y];
            startUpperRight.y = startY;
            endUpperLeft.y = endY;

            // SkyLinePointsList between firstStaffEntry startUpperRightPoint and lastStaffentry endUpperLeftPoint
            points = headToHead ? [] : this.calculateTopPoints(startUpperRight, endUpperLeft, staffLine, skyBottomLineCalculator);
            const obstacles: PointF2D[] = this.getObstacles(points, skyBottomLineCalculator) // without the point added if there is none
                .concat(this.articulationCorners);

            if (points.length === 0) {
                const pointF: PointF2D = new PointF2D((endUpperLeft.x - startUpperRight.x) / 2 + startUpperRight.x,
                                                      (endUpperLeft.y - startUpperRight.y) / 2 + startUpperRight.y);
                points.push(pointF);
            }

            // Angle between original x-Axis and Line from Start-Point to End-Point
            const startEndLineAngleRadians: number = (Math.atan((endY - startY) / (endX - startX)));

            // translate origin at Start (positiveY from Bottom to Top => change sign for Y)
            const start2: PointF2D = new PointF2D(0, 0);
            let end2: PointF2D = new PointF2D(endX - startX, -(endY - startY));

            // and Rotate at new Origin startEndLineAngle degrees
                // clockwise/counterclockwise Rotation
                // after Rotation end2.Y must be 0
                // Inverse of RotationMatrix = TransposeMatrix of RotationMatrix
            const rotationMatrix: Matrix2D = Matrix2D.getRotationMatrix(startEndLineAngleRadians);
            const transposeMatrix: Matrix2D = rotationMatrix.getTransposeMatrix();
            end2 = rotationMatrix.vectorMultiplication(end2);
            const transformedPoints: PointF2D[] = this.calculateTranslatedAndRotatedPointListAbove(points, startX, startY, rotationMatrix);

            // calculate tangent Lines maximum Slopes between StartPoint and EndPoint to all Points in SkyLine
                // and tangent Lines characteristica
            const startLineSlope: number = this.calculateMaxLeftSlope(transformedPoints, start2, end2);
            const endLineSlope: number = this.calculateMaxRightSlope(transformedPoints, start2, end2);
            const startLineD: number = start2.y - start2.x * startLineSlope;
            const endLineD: number = end2.y - end2.x * endLineSlope;

            // calculate IntersectionPoint of the 2 Lines
                // if same Slope, then Point.X between Start and End and Point.Y fixed
            const intersectionPoint: PointF2D = new PointF2D();
            let sameSlope: boolean = false;
            if (Math.abs(Math.abs(startLineSlope) - Math.abs(endLineSlope)) < 0.0001) {
                intersectionPoint.x = end2.x / 2;
                intersectionPoint.y = 0;
                sameSlope = true;
            } else {
                intersectionPoint.x = (endLineD - startLineD) / (startLineSlope - endLineSlope);
                intersectionPoint.y = startLineSlope * intersectionPoint.x + startLineD;
            }

            // calculate HeightWidthRatio between the MaxYpoint (from the points between StartPoint and EndPoint)
            // and the X-distance from StartPoint to EndPoint
            const heightWidthRatio: number = this.calculateHeightWidthRatio(end2.x, transformedPoints);

            // Shift start- or endPoint and corresponding controlPoint away from note, if needed:
            // e.g. if there is a close object creating a high slope, better shift it away to reduce the slope:
            // idea is to compare the half heightWidthRatio of the bounding box of the skyline points with the slope (which is also a ratio: k/1)
            // if the slope is greater than the half heightWidthRatio (which will 99% be the case),
            // then add a y-offset to reduce the slope to the same value as the half heightWidthRatio of the bounding box
            const startYOffset: number = 0;
            const endYOffset: number = 0;
            /*if (Math.abs(heightWidthRatio) > 0.001) {
                // 1. start side:
                const startSlopeRatio: number = Math.abs(startLineSlope / (heightWidthRatio * 2));
                const maxLeftYOffset: number = Math.abs(startLineSlope);
                startYOffset = Math.max(0, maxLeftYOffset * (Math.min(10, startSlopeRatio - 1) / 10));
                // slope has to be adapted now due to the y-offset:
                startLineSlope -= startYOffset;

                // 2. end side:
                const endSlopeRatio: number = Math.abs(endLineSlope / (heightWidthRatio * 2));
                const maxRightYOffset: number = Math.abs(endLineSlope);
                endYOffset = Math.max(0, maxRightYOffset * (Math.min(10, endSlopeRatio - 1) / 10));
                // slope has to be adapted now due to the y-offset:
                endLineSlope += endYOffset;
            }*/



            // calculate tangent Lines Angles
                // (using the calculated Slopes and the Ratio from the IntersectionPoint's distance to the MaxPoint in the SkyLine)
            let startAngle: number = minAngle;
            let endAngle: number = -minAngle;
            // if the calculated Slopes (start and end) are equal, then Angles have fixed values
            if (!sameSlope) {
                const result: {startAngle: number, endAngle: number} =
                    this.calculateAngles(minAngle, startLineSlope, endLineSlope, maxAngle);
                startAngle = result.startAngle;
                endAngle = result.endAngle;
            }

            // calculate Curve's Control Points
            const controlPoints: {startControlPoint: PointF2D, endControlPoint: PointF2D} =
                this.calculateControlPoints(end2.x, startAngle, endAngle, transformedPoints, heightWidthRatio, startY, endY);
            this.clearObstacles(controlPoints.startControlPoint, controlPoints.endControlPoint, end2.x,
                                this.calculateTranslatedAndRotatedPointListAbove(obstacles, startX, startY, rotationMatrix),
                                this.getFingeringCorners().map(corners =>
                                    this.calculateTranslatedAndRotatedPointListAbove(corners, startX, startY, rotationMatrix)));

            let startControlPoint: PointF2D = controlPoints.startControlPoint;
            let endControlPoint: PointF2D = controlPoints.endControlPoint;

            // transform ControlPoints to original Coordinate System
                // (rotate back and translate back)
            startControlPoint = transposeMatrix.vectorMultiplication(startControlPoint);
            startControlPoint.x += startX;
            startControlPoint.y = -startControlPoint.y + startY;
            endControlPoint = transposeMatrix.vectorMultiplication(endControlPoint);
            endControlPoint.x += startX;
            endControlPoint.y = -endControlPoint.y + startY;
            // middleControlPoint.x = (startControlPoint.x + endControlPoint.x) / 2;
            // middleControlPoint.y = (startControlPoint.y + endControlPoint.y) / 2 + 1.0;

            /* for DEBUG only */
            // this.intersection = transposeMatrix.vectorMultiplication(intersectionPoint);
            // this.intersection.x += startX;
            // this.intersection.y = -this.intersection.y + startY;
            /* for DEBUG only */

            // set private members
            this.bezierStartPt = new PointF2D(startX, startY - startYOffset);
            this.bezierStartControlPt = new PointF2D(startControlPoint.x, startControlPoint.y - startYOffset);
            this.bezierEndControlPt = new PointF2D(endControlPoint.x, endControlPoint.y - endYOffset);
            this.bezierEndPt = new PointF2D(endX, endY - endYOffset);
            this.keepTangentsInside();
            if (!slurStartNote) {
                this.continuedStartY = this.bezierStartPt.y;
            }
            if (!slurEndNote && this.slur.EndNote) {
                this.continuedEndY = this.bezierEndPt.y;
            }
            this.liftOverOrnaments(staffLine, startUpperRight.x, endUpperLeft.x, slurStartNote, slurEndNote);

            const passedClose: {start: boolean, end: boolean} = this.keepPassedArticulationsInside();
            if (this.retryPastArticulationsOutside(rules, passedClose) ||
                this.retryPastEndFingerings(rules, slurStartNote, slurEndNote, startUpperRight.x, endUpperLeft.x) ||
                this.retryPastBesideFingerings(rules, staffLine, beside, startUpperRight.x, endUpperLeft.x)) {
                return;
            }
            if (rules.SlurPlacesArticulationsOutside) {
                this.placeArticulationsOutside(staffLine);
            }

            // calculate slur Curvepoints and update Skyline
            const length: number = staffLine.SkyLine.length;
            const startIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(this.bezierStartPt.x, length);
            const endIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(this.bezierEndPt.x, length);
            const distance: number = this.bezierEndPt.x - this.bezierStartPt.x;
            const samplingUnit: number = skyBottomLineCalculator.SamplingUnit;
            for (let i: number = startIndex; i < endIndex; i++) {
                // get the right distance ratio and index on the curve
                const diff: number = i / samplingUnit - this.bezierStartPt.x;
                const curvePoint: PointF2D = this.calculateCurvePointAtIndex(Math.abs(diff) / distance);

                // update left- and rightIndex for better accuracy
                let index: number = skyBottomLineCalculator.getLeftIndexForPointX(curvePoint.x, length);
                // update SkyLine with final slur curve:
                if (index >= startIndex) {
                    staffLine.SkyLine[index] = Math.min(staffLine.SkyLine[index], curvePoint.y);
                }
                index++;
                if (index < length) {
                    staffLine.SkyLine[index] = Math.min(staffLine.SkyLine[index], curvePoint.y);
                }
            }
        } else {
            startY += rules.SlurNoteHeadYOffset;
            endY += rules.SlurNoteHeadYOffset;
            if (!slurStartNote) {
                startY = this.outsideContinuedPieces(staffLine, startX, startY, rules, true);
            }
            if (!slurEndNote && this.slur.EndNote) {
                endY = this.outsideContinuedPieces(staffLine, endX, endY, rules, false);
            }

            // firstStaffEntry startLowerRightPoint and lastStaffentry endLowerLeftPoint
            const startLowerRight: PointF2D = new PointF2D(this.staffEntries[0].parentMeasure.PositionAndShape.RelativePosition.x
                                                           + this.staffEntries[0].PositionAndShape.RelativePosition.x,
                                                           startY);
            if (slurStartNote) {
                startLowerRight.x += this.staffEntries[0].PositionAndShape.BorderRight;
            } else {
                // continuing Slur from previous StaffLine - must start after last Instruction of first Measure
                startLowerRight.x = this.pieceStartX() ?? this.staffEntries[0].parentMeasure.beginInstructionsWidth;
            }

            // must also add the GraceStaffEntry's ParentStaffEntry Position
            if (this.graceStart) {
                startLowerRight.x += endStaffEntry.PositionAndShape.RelativePosition.x;
            }
            const endLowerLeft: PointF2D = new PointF2D(this.staffEntries[this.staffEntries.length - 1].parentMeasure.PositionAndShape.RelativePosition.x
                                                        + this.staffEntries[this.staffEntries.length - 1].PositionAndShape.RelativePosition.x,
                                                        endY);
            if (slurEndNote) {
                endLowerLeft.x += this.staffEntries[this.staffEntries.length - 1].PositionAndShape.BorderLeft;
            } else if (!this.slur.EndNote) {
                endLowerLeft.x = this.getUnattachedEndX();
            } else {
                // Slur continues to next StaffLine - must reach the end of current StaffLine
                endLowerLeft.x = this.staffEntries[this.staffEntries.length - 1].parentMeasure.PositionAndShape.RelativePosition.x
                    + this.staffEntries[this.staffEntries.length - 1].parentMeasure.PositionAndShape.Size.width;
            }

            // must also add the GraceStaffEntry's ParentStaffEntry Position
            if (this.graceEnd) {
                endLowerLeft.x += endStaffEntry.staffEntryParent.PositionAndShape.RelativePosition.x;
            }

            startLowerRight.x = this.graceRangeStartX(startLowerRight.x, slurStartNote, startX, endX);
            endLowerLeft.x = this.graceRangeEndX(endLowerLeft.x, slurEndNote, startX, endX);

            // below or beside the fingerings of the start and end notes the curve ran into, see retryPastEndFingerings()
            const start: PointF2D = this.placePastEndFingerings(slurStartNote, true, startX, startY, startLowerRight.x, endX,
                                                                this.fingeringsRunInto?.start, toNextNote);
            const end: PointF2D = this.placePastEndFingerings(slurEndNote, false, endX, endY, endLowerLeft.x, startX,
                                                              this.fingeringsRunInto?.end, toNextNote);
            const beside: boolean = start.x !== startX || end.x !== endX;
            if (beside) { // the sky line points stay between the start and the end
                startLowerRight.x = Math.max(startLowerRight.x, start.x);
                endLowerLeft.x = Math.min(endLowerLeft.x, end.x);
            }
            [startX, startY, endX, endY] = [start.x, start.y, end.x, end.y];
            startLowerRight.y = startY;
            endLowerLeft.y = endY;

            // BottomLinePointsList between firstStaffEntry startLowerRightPoint and lastStaffentry endLowerLeftPoint
            points = headToHead ? [] : between ? GraphicalSlur.betweenVoicesPoints(between, startLowerRight.x, endLowerLeft.x) :
                this.calculateBottomPoints(startLowerRight, endLowerLeft, staffLine, skyBottomLineCalculator);
            // without the point added if there is none, nor the bare staff, which calculateBottomPoints() keeps
            const obstacles: PointF2D[] = this.getObstacles(points.filter(point => point.y !== staffLine.BottomLineOffset),
                                                            skyBottomLineCalculator).concat(this.articulationCorners);

            if (points.length === 0) {
                const pointF: PointF2D = new PointF2D((endLowerLeft.x - startLowerRight.x) / 2 + startLowerRight.x,
                                                      (endLowerLeft.y - startLowerRight.y) / 2 + startLowerRight.y);
                points.push(pointF);
            }

            // Angle between original x-Axis and Line from Start-Point to End-Point
            const startEndLineAngleRadians: number = Math.atan((endY - startY) / (endX - startX));
            // translate origin at Start
            const start2: PointF2D = new PointF2D(0, 0);
            let end2: PointF2D = new PointF2D(endX - startX, endY - startY);

            // and Rotate at new Origin startEndLineAngle degrees
            // clockwise/counterclockwise Rotation
            // after Rotation end2.Y must be 0
            // Inverse of RotationMatrix = TransposeMatrix of RotationMatrix
            const rotationMatrix: Matrix2D = Matrix2D.getRotationMatrix(-startEndLineAngleRadians);
            const transposeMatrix: Matrix2D = rotationMatrix.getTransposeMatrix();
            end2 = rotationMatrix.vectorMultiplication(end2);
            const transformedPoints: PointF2D[] = this.calculateTranslatedAndRotatedPointListBelow(points, startX, startY, rotationMatrix);

            // calculate tangent Lines maximum Slopes between StartPoint and EndPoint to all Points in BottomLine
            // and tangent Lines characteristica
            const startLineSlope: number = this.calculateMaxLeftSlope(transformedPoints, start2, end2);
            const endLineSlope: number = this.calculateMaxRightSlope(transformedPoints, start2, end2);
            const startLineD: number = start2.y - start2.x * startLineSlope;
            const endLineD: number = end2.y - end2.x * endLineSlope;

            // calculate IntersectionPoint of the 2 Lines
            // if same Slope, then Point.X between Start and End and Point.Y fixed
            const intersectionPoint: PointF2D = new PointF2D();
            let sameSlope: boolean = false;
            if (Math.abs(Math.abs(startLineSlope) - Math.abs(endLineSlope)) < 0.0001) {
                intersectionPoint.x = end2.x / 2;
                intersectionPoint.y = 0;
                sameSlope = true;
            } else {
                intersectionPoint.x = (endLineD - startLineD) / (startLineSlope - endLineSlope);
                intersectionPoint.y = startLineSlope * intersectionPoint.x + startLineD;
            }

            // calculate HeightWidthRatio between the MaxYpoint (from the points between StartPoint and EndPoint)
            // and the X-distance from StartPoint to EndPoint
            const heightWidthRatio: number = this.calculateHeightWidthRatio(end2.x, transformedPoints);

            // Shift start- or endPoint and corresponding controlPoint away from note, if needed:
            // e.g. if there is a close object creating a high slope, better shift it away to reduce the slope:
            // idea is to compare the half heightWidthRatio of the bounding box of the skyline points with the slope (which is also a ratio: k/1)
            // if the slope is greater than the half heightWidthRatio (which will 99% be the case),
            // then add a y-offset to reduce the slope to the same value as the half heightWidthRatio of the bounding box
            const startYOffset: number = 0;
            const endYOffset: number = 0;
            /*if (Math.abs(heightWidthRatio) > 0.001) {
                // 1. start side:
                const startSlopeRatio: number = Math.abs(startLineSlope / (heightWidthRatio * 2));
                const maxLeftYOffset: number = Math.abs(startLineSlope);
                startYOffset = Math.max(0, maxLeftYOffset * (Math.min(10, startSlopeRatio - 1) / 10));
                // slope has to be adapted now due to the y-offset:
                startLineSlope -= startYOffset;
                // 2. end side:
                const endSlopeRatio: number = Math.abs(endLineSlope / (heightWidthRatio * 2));
                const maxRightYOffset: number = Math.abs(endLineSlope);
                endYOffset = Math.max(0, maxRightYOffset * (Math.min(10, endSlopeRatio - 1) / 10));
                // slope has to be adapted now due to the y-offset:
                endLineSlope += endYOffset;
            } */

            // calculate tangent Lines Angles
            // (using the calculated Slopes and the Ratio from the IntersectionPoint's distance to the MaxPoint in the SkyLine)
            let startAngle: number = minAngle;
            let endAngle: number = -minAngle;
            // if the calculated Slopes (start and end) are equal, then Angles have fixed values
            if (!sameSlope) {
                const result: {startAngle: number, endAngle: number} =
                    this.calculateAngles(minAngle, startLineSlope, endLineSlope, maxAngle);
                startAngle = result.startAngle;
                endAngle = result.endAngle;
            }

            // calculate Curve's Control Points
            const controlPoints: {startControlPoint: PointF2D, endControlPoint: PointF2D} =
                this.calculateControlPoints(end2.x, startAngle, endAngle, transformedPoints, heightWidthRatio, startY, endY);
            this.clearObstacles(controlPoints.startControlPoint, controlPoints.endControlPoint, end2.x,
                                this.calculateTranslatedAndRotatedPointListBelow(obstacles, startX, startY, rotationMatrix),
                                this.getFingeringCorners().map(corners =>
                                    this.calculateTranslatedAndRotatedPointListBelow(corners, startX, startY, rotationMatrix)));
            let startControlPoint: PointF2D = controlPoints.startControlPoint;
            let endControlPoint: PointF2D = controlPoints.endControlPoint;

            // transform ControlPoints to original Coordinate System
            // (rotate back and translate back)
            startControlPoint = transposeMatrix.vectorMultiplication(startControlPoint);
            startControlPoint.x += startX;
            startControlPoint.y += startY;
            endControlPoint = transposeMatrix.vectorMultiplication(endControlPoint);
            endControlPoint.x += startX;
            endControlPoint.y += startY;

            // set private members
            this.bezierStartPt = new PointF2D(startX, startY + startYOffset);
            this.bezierStartControlPt = new PointF2D(startControlPoint.x, startControlPoint.y + startYOffset);
            this.bezierEndControlPt = new PointF2D(endControlPoint.x, endControlPoint.y + endYOffset);
            this.bezierEndPt = new PointF2D(endX, endY + endYOffset);
            this.keepTangentsInside();
            if (!slurStartNote) {
                this.continuedStartY = this.bezierStartPt.y;
            }
            if (!slurEndNote && this.slur.EndNote) {
                this.continuedEndY = this.bezierEndPt.y;
            }
            this.lowerUnderOrnaments(staffLine, startLowerRight.x, endLowerLeft.x, slurStartNote, slurEndNote);
            if (between) {
                if (!this.fitBetweenVoices(between)) {
                    // no room between the voices: around the other voice's notes as before
                    this.betweenVoicesFallback = true;
                    try {
                        this.calculateCurve(rules);
                    } finally {
                        this.betweenVoicesFallback = false;
                    }
                    return;
                }
                this.IsBetweenVoices = true;
            }

            /* for DEBUG only */
            // this.intersection = transposeMatrix.vectorMultiplication(intersectionPoint);
            // this.intersection.x += startX;
            // this.intersection.y += startY;
            /* for DEBUG only */

            const passedClose: {start: boolean, end: boolean} = this.keepPassedArticulationsInside();
            if (this.retryPastArticulationsOutside(rules, passedClose) ||
                this.retryPastEndFingerings(rules, slurStartNote, slurEndNote, startLowerRight.x, endLowerLeft.x) ||
                this.retryPastBesideFingerings(rules, staffLine, beside, startLowerRight.x, endLowerLeft.x)) {
                return;
            }
            if (rules.SlurPlacesArticulationsOutside) {
                this.placeArticulationsOutside(staffLine);
            }

            // calculate CurvePoints
            const length: number = staffLine.BottomLine.length;
            const startIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(this.bezierStartPt.x, length);
            const endIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(this.bezierEndPt.x, length);
            const distance: number = this.bezierEndPt.x - this.bezierStartPt.x;
            const samplingUnit: number = skyBottomLineCalculator.SamplingUnit;
            for (let i: number = startIndex; i < endIndex; i++) {
                // get the right distance ratio and index on the curve
                const diff: number = i / samplingUnit - this.bezierStartPt.x;
                const curvePoint: PointF2D = this.calculateCurvePointAtIndex(Math.abs(diff) / distance);

                // update start- and endIndex for better accuracy
                let index: number = skyBottomLineCalculator.getLeftIndexForPointX(curvePoint.x, length);
                // update BottomLine with final slur curve:
                if (index >= startIndex) {
                    staffLine.BottomLine[index] = Math.max(staffLine.BottomLine[index], curvePoint.y);
                }
                index++;
                if (index < length) {
                    staffLine.BottomLine[index] = Math.max(staffLine.BottomLine[index], curvePoint.y);
                }
            }
        }
    }



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
    public static readonly ornamentClearance: number = 0.3;
    /** How far (in units) the slur's drawing reaches out from its curve in the middle: VexFlowMusicSheetDrawer.drawSlur
     *  draws an outer curve with control points 0.3 out. */
    public static readonly thickness: number = 0.25;

    /**
     * The curve above follows the sky line only roughly: it can pass through an ornament under the slur. Raise
     * both control points until the curve clears by [[ornamentClearance]] every ornament above the notes in the
     * middle of the slur's sky line range (rangeStartX to rangeEndX, see [[isInMiddleOfSlur]]), when that takes a
     * modest raise: up to 1.5 units and 0.35 of the slur's width. A steeper raise makes a loop over a short slur;
     * such an ornament, as one over the slur's first or last note, stays outside the slur and is raised over it
     * instead (VexFlowMusicSheetCalculator.layoutOrnament()). Raising both control points by d raises the curve
     * at t by 3·t·(1−t)·d.
     */
    private liftOverOrnaments(staffLine: StaffLine, rangeStartX: number, rangeEndX: number,
                              startNote: GraphicalNote, endNote: GraphicalNote): void {
        this.liftStartNote = startNote;
        this.liftEndNote = endNote;
        let lift: number = 0;
        let numberLift: number = 0;
        let ownNumberLift: number = 0;
        this.TupletNumberLiftTrace = [];
        for (const measure of staffLine.Measures) {
            if (!(measure instanceof VexFlowMeasure)) {
                continue;
            }
            const inks: { left: number, right: number, top: number, number: boolean, own: boolean, covered: boolean }[] = [
                ...measure.OrnamentInk.map(ink => ({ left: ink.left, right: ink.right, top: ink.top, number: false, own: false, covered: false })),
                ...GraphicalSlur.tupletNumbersInside(measure, true).map(ink => ({
                    left: ink.left, right: ink.right, top: ink.top, number: true,
                    own: GraphicalSlur.isOwnTuplet(ink.tuplet, startNote, endNote),
                    covered: this.coversTuplet(ink.tuplet),
                })),
            ];
            for (const ink of inks) {
                const centre: number = (ink.left + ink.right) / 2;
                const middle: boolean = GraphicalSlur.isInMiddleOfSlur(centre, this.bezierStartPt.x, this.bezierEndPt.x);
                const overlap: (y: number) => number = y => y - (ink.top - GraphicalSlur.ornamentClearance);
                if (ink.number) {
                    // (a tuplet number by the curve alone: the staff entries' boxes that bound the sky line range take in
                    //   their lyrics)
                    const need: number = this.liftToClear(ink.left, ink.right, overlap);
                    this.traceNumber(ink.left, ink.right, centre, middle, need, ink.own);
                    const inside: boolean = middle || ink.covered;
                    if (inside && ink.own) {
                        ownNumberLift = Math.max(ownNumberLift, need);
                    } else if (inside) {
                        numberLift = Math.max(numberLift, need);
                    }
                } else if (centre >= rangeStartX && centre <= rangeEndX && middle) {
                    lift = Math.max(lift, this.liftToClear(ink.left, ink.right, overlap));
                }
            }
        }
        lift = this.allowedLift(lift, numberLift, ownNumberLift);
        this.TupletNumberLiftApplied = lift;
        if (lift === 0) {
            return;
        }
        this.bezierStartControlPt = new PointF2D(this.bezierStartControlPt.x, this.bezierStartControlPt.y - lift);
        this.bezierEndControlPt = new PointF2D(this.bezierEndControlPt.x, this.bezierEndControlPt.y - lift);
    }

    /** How far both control points move for the curve to clear ink from left to right: the most overlap (how far the
     *  curve point at y reaches into the ink and its clearance) over 3·t·(1−t); 0 when the curve clears it. */
    private liftToClear(left: number, right: number, overlap: (y: number) => number): number {
        let lift: number = 0;
        for (let i: number = 1; i < 64; i++) {
            const t: number = i / 64;
            const point: PointF2D = this.calculateCurvePointAtIndex(t);
            if (point.x < left || point.x > right) {
                continue;
            }
            const over: number = overlap(point.y);
            if (over <= 0) {
                continue;
            }
            lift = Math.max(lift, over / (3 * t * (1 - t)));
        }
        return lift;
    }

    /**
     * For diagnostics only (the layout never reads them): the unbracketed tuplet numbers on the slur's side that
     * liftOverOrnaments() (lowerUnderOrnaments()) looked at in its last calculation - where the number's centre is
     * along the curve (0 at its start, 1 at its end), whether that is the slur's middle half, the move of the control
     * points it needs to go inside, and whether the slur is its tuplet's own (isOwnTuplet()) - and the move made. As in
     * osmd-dart.
     */
    public TupletNumberLiftTrace: { left: number, right: number, fraction: number, middle: boolean, lift: number, own: boolean }[] = [];
    public TupletNumberLiftApplied: number = 0;

    /** The most another tuplet's number may move the control points, see allowedLift() (for diagnostics;
     *  OwnTupletNumberLiftLimit for the slur's own tuplet). */
    public get TupletNumberLiftLimit(): number {
        return Math.min(3, 0.75 * (this.bezierEndPt.x - this.bezierStartPt.x));
    }

    private traceNumber(left: number, right: number, centre: number, middle: boolean, lift: number, own: boolean): void {
        this.TupletNumberLiftTrace.push({
            left, right, middle, lift, own,
            fraction: (centre - this.bezierStartPt.x) / (this.bezierEndPt.x - this.bezierStartPt.x),
        });
    }

    /**
     * How far liftOverOrnaments() (lowerUnderOrnaments()) moves the control points: the larger of the moves the
     * ornaments and the tuplet numbers need, each when it is modest. An ornament takes up to 1.5 units and 0.35 of the
     * slur's width; a tuplet number in the slur's middle goes inside it even under a short slur over three notes, so it
     * takes up to 3 units and 0.75 of the width (a higher, still smooth arch; Vivaldi, Un certo non so che m24: four
     * slurred sixteenth triplets, each number under its slur), and the number of the slur's own tuplet (see
     * isOwnTuplet()) up to ownTupletNumberLiftMax and ownTupletNumberWidthRatio of the width. Beyond that the ornament
     * or number goes over the slur instead. As in osmd-dart.
     */
    private allowedLift(ornamentLift: number, numberLift: number, ownNumberLift: number): number {
        const width: number = this.bezierEndPt.x - this.bezierStartPt.x;
        const ornament: number = ornamentLift <= Math.min(1.5, 0.35 * width) ? ornamentLift : 0;
        const number: number = numberLift <= Math.min(3, 0.75 * width) ? numberLift : 0;
        const own: number = ownNumberLift <= this.OwnTupletNumberLiftLimit ? ownNumberLift : 0;
        return Math.max(ornament, number, own);
    }

    /**
     * The most (in units, and of the slur's width) the slur's own tuplet's number may move the control points, see
     * allowedLift(). A slur from the first note of a tuplet to its last keeps its unbracketed number inside, under its
     * arc, in the Ricordi editions also over three close notes, where the arch is about as high as it is wide
     * (Paisiello, Il mio ben quando verrà, voice m22 and m87; Leo, Dal tuo soglio luminoso, piano m59; Vivaldi, Un certo
     * non so che m24 and m70); with the 3 units and 0.75 of the width for any number it went over the slur's end on the
     * web (its number is drawn 0.35 higher) or under a short slur in the app (m87: 3.2 over a slur 2.8 wide). The
     * tuplets of the solo vocal editions need up to 3.8 and 1.2 of the width. As in osmd-dart.
     */
    public static readonly ownTupletNumberLiftMax: number = 4;
    public static readonly ownTupletNumberWidthRatio: number = 1.25;

    public get OwnTupletNumberLiftLimit(): number {
        return Math.min(GraphicalSlur.ownTupletNumberLiftMax,
                        GraphicalSlur.ownTupletNumberWidthRatio * (this.bezierEndPt.x - this.bezierStartPt.x));
    }

    /** Whether the slur from startNote to endNote is the tuplet's own: it starts at the tuplet's first note and ends at
     *  its last (a tuplet that starts with a rest has no own slur: Piccinni, Notte dea del mistero, piano m36, whose
     *  number the print puts in a curved bracket from the rest). */
    private static isOwnTuplet(tuplet: any, startNote: GraphicalNote, endNote: GraphicalNote): boolean {
        const notes: any[] = tuplet.getNotes();
        const start: any = (startNote as VexFlowGraphicalNote)?.vfnote?.[0];
        const end: any = (endNote as VexFlowGraphicalNote)?.vfnote?.[0];
        return notes.length > 0 && start !== undefined && end !== undefined && notes[0] === start && notes[notes.length - 1] === end;
    }

    /** Whether the whole tuplet is under the slur: each of its notes is a note of one of the slur's staff entries on
     *  this staff line. Its number may then go inside off the slur's middle half, over the slur's first or last note,
     *  within the lift a number may take: a slur from the tuplet's first note on over more notes (Lotti, Pur dicesti,
     *  bocca bella, Medium High voice m70: the slur from the first triplet's first note to m71 has both 3s under its
     *  arc in the Schirmer print, the first 0.11 along the curve on the web; it went over the slur). A slur over part
     *  of the tuplet leaves it out as before (Jemand m43, m45). As in osmd-dart. */
    public coversTuplet(tuplet: any): boolean {
        const notes: any[] = tuplet.getNotes();
        if (notes.length === 0) {
            return false;
        }
        const under: Set<any> = new Set();
        for (const staffEntry of this.staffEntries) {
            for (const voiceEntry of staffEntry.graphicalVoiceEntries) {
                for (const note of voiceEntry.notes) {
                    const staveNote: any = (note as VexFlowGraphicalNote)?.vfnote?.[0];
                    if (staveNote !== undefined) {
                        under.add(staveNote);
                    }
                }
            }
        }
        return notes.every(note => under.has(note));
    }

    private liftStartNote: GraphicalNote;
    private liftEndNote: GraphicalNote;

    /**
     * After the number of a tuplet this slur covers (coversTuplet()) went over a shorter slur in it
     * (VexFlowMusicSheetCalculator.layoutFermatasOverSlurs()), lift this slur on over the number's new place (left to
     * right, top) by ornamentClearance, within the lift its numbers may take (TupletNumberLiftLimit,
     * OwnTupletNumberLiftLimit for its own tuplet) with what liftOverOrnaments() took already, and raise the sky line to
     * the new curve (Lotti, Pur dicesti, o bocca bella, Ricordi edition, voice m69 and m163: the first 3 over the slur
     * on its first two notes, under the slur over both triplets). False, and no move, when that takes more; the number
     * then goes over this slur too. Above the notes only. As in osmd-dart.
     */
    public liftOverRaisedNumber(staffLine: StaffLine, tuplet: any, left: number, top: number, right: number): boolean {
        if (this.placement !== PlacementEnum.Above) {
            return false;
        }
        const need: number = this.liftToClear(left, right, y => y - (top - GraphicalSlur.ornamentClearance));
        if (need <= 0) {
            return true;
        }
        const limit: number = GraphicalSlur.isOwnTuplet(tuplet, this.liftStartNote, this.liftEndNote)
            ? this.OwnTupletNumberLiftLimit : this.TupletNumberLiftLimit;
        if (this.TupletNumberLiftApplied + need > limit) {
            return false;
        }
        this.TupletNumberLiftApplied += need;
        this.bezierStartControlPt = new PointF2D(this.bezierStartControlPt.x, this.bezierStartControlPt.y - need);
        this.bezierEndControlPt = new PointF2D(this.bezierEndControlPt.x, this.bezierEndControlPt.y - need);
        const skyBottomLineCalculator: SkyBottomLineCalculator = staffLine.SkyBottomLineCalculator;
        const length: number = staffLine.SkyLine.length;
        const startIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(this.bezierStartPt.x, length);
        const endIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(this.bezierEndPt.x, length);
        const distance: number = this.bezierEndPt.x - this.bezierStartPt.x;
        const samplingUnit: number = skyBottomLineCalculator.SamplingUnit;
        for (let i: number = startIndex; i < endIndex; i++) {
            const diff: number = i / samplingUnit - this.bezierStartPt.x;
            const curvePoint: PointF2D = this.calculateCurvePointAtIndex(Math.abs(diff) / distance);
            let index: number = skyBottomLineCalculator.getLeftIndexForPointX(curvePoint.x, length);
            if (index >= startIndex) {
                staffLine.SkyLine[index] = Math.min(staffLine.SkyLine[index], curvePoint.y);
            }
            index++;
            if (index < length) {
                staffLine.SkyLine[index] = Math.min(staffLine.SkyLine[index], curvePoint.y);
            }
        }
        return true;
    }

    /**
     * [[liftOverOrnaments]] for a slur below the notes and the ornaments below them (a lower voice, Couperin,
     * Concerts royaux I Menuet en trio): lower both control points until the curve passes under every ornament in
     * the middle of the slur's bottom line range by ornamentClearance.
     */
    private lowerUnderOrnaments(staffLine: StaffLine, rangeStartX: number, rangeEndX: number,
                                startNote: GraphicalNote, endNote: GraphicalNote): void {
        let drop: number = 0;
        let numberDrop: number = 0;
        let ownNumberDrop: number = 0;
        this.TupletNumberLiftTrace = [];
        for (const measure of staffLine.Measures) {
            if (!(measure instanceof VexFlowMeasure)) {
                continue;
            }
            const inks: { left: number, right: number, bottom: number, number: boolean, own: boolean, covered: boolean }[] = [
                ...measure.BelowOrnamentInk.map(ink => ({ left: ink.left, right: ink.right, bottom: ink.bottom, number: false, own: false, covered: false })),
                ...GraphicalSlur.tupletNumbersInside(measure, false).map(ink => ({
                    left: ink.left, right: ink.right, bottom: ink.bottom, number: true,
                    own: GraphicalSlur.isOwnTuplet(ink.tuplet, startNote, endNote),
                    covered: this.coversTuplet(ink.tuplet),
                })),
            ];
            for (const ink of inks) {
                const centre: number = (ink.left + ink.right) / 2;
                const middle: boolean = GraphicalSlur.isInMiddleOfSlur(centre, this.bezierStartPt.x, this.bezierEndPt.x);
                const overlap: (y: number) => number = y => ink.bottom + GraphicalSlur.ornamentClearance - y;
                if (ink.number) {
                    // (a tuplet number by the curve alone: the staff entries' boxes that bound the sky line range take in
                    //   their lyrics)
                    const need: number = this.liftToClear(ink.left, ink.right, overlap);
                    this.traceNumber(ink.left, ink.right, centre, middle, need, ink.own);
                    const inside: boolean = middle || ink.covered;
                    if (inside && ink.own) {
                        ownNumberDrop = Math.max(ownNumberDrop, need);
                    } else if (inside) {
                        numberDrop = Math.max(numberDrop, need);
                    }
                } else if (centre >= rangeStartX && centre <= rangeEndX && middle) {
                    drop = Math.max(drop, this.liftToClear(ink.left, ink.right, overlap));
                }
            }
        }
        drop = this.allowedLift(drop, numberDrop, ownNumberDrop);
        this.TupletNumberLiftApplied = drop;
        if (drop === 0) {
            return;
        }
        this.bezierStartControlPt = new PointF2D(this.bezierStartControlPt.x, this.bezierStartControlPt.y + drop);
        this.bezierEndControlPt = new PointF2D(this.bezierEndControlPt.x, this.bezierEndControlPt.y + drop);
    }

    /**
     * The numbers of the unbracketed tuplets of the measure on the slur's side (above), which a slur over them clears
     * like an ornament: the number goes inside the slur, under its arc (Bellini, Per pietà, bell'idol mio m58, Torna,
     * vezzosa Fillide m102–105; Leo, Dal tuo soglio luminoso m1–7). A bracketed tuplet goes outside the slur, bracket
     * and number (Torna m104, L'allegro marinaro m37; VexFlowMusicSheetCalculator.layoutFermatasOverSlurs()), as does a
     * number the slur can't clear. As in osmd-dart.
     */
    private static tupletNumbersInside(measure: VexFlowMeasure, above: boolean):
        { tuplet: any, left: number, right: number, top: number, bottom: number }[] {
        return measure.TupletNumberInk.filter(ink => ink.above === above && !ink.bracketed);
    }

    /**
     * A slur's sky/bottom line range runs from the right edge of its start staff entry to the left edge of its
     * end staff entry. A grace note shares its main note's staff entry, so a slur from a grace note before its
     * main note, or to a grace note after it, left out the main note under the slur and the ornament over it
     * (Couperin, Concerts royaux I Prelude m7). Start (end) the range at the grace note itself instead, when the
     * main note has an ornament near the middle of the slur (within a fifth of its width, see [[isInMiddleOfSlur]]).
     * Off the middle, the slur's tangents would see the ornament near one end and throw a steep, lopsided arch over
     * it; the ornament goes over the slur instead (VexFlowMusicSheetCalculator.layoutOrnament()).
     */
    private static readonly graceRangeMargin: number = 0.5;
    private static readonly graceRangeMiddle: number = 0.4;

    /**
     * Whether x is in the middle of the slur from startX to endX: at least margin of its width from either end. A
     * slur keeps an ornament in its middle half inside it; it can't clear one near its start or end without a steep
     * arch, so such an ornament goes over the slur (VexFlowMusicSheetCalculator.layoutOrnament()).
     */
    private static isInMiddleOfSlur(x: number, startX: number, endX: number, margin: number = 0.25): boolean {
        const fraction: number = (x - startX) / (endX - startX);
        return fraction >= margin && fraction <= 1 - margin;
    }

    /** Whether a note of the entry has an ornament on the slur's side near the middle of the slur from startX to endX. */
    private hasOrnamentInMiddle(entry: GraphicalStaffEntry, startX: number, endX: number): boolean {
        const measure: VexFlowMeasure = entry.parentMeasure as VexFlowMeasure;
        const inks: { ornament: any, left: number, right: number }[] =
            this.placement === PlacementEnum.Below ? measure?.BelowOrnamentInk : measure?.OrnamentInk;
        if (!inks) {
            return false;
        }
        const notes: any[] = entry.graphicalVoiceEntries.map(gve => (gve as any).vfStaveNote).filter(note => note);
        return inks.some(ink => notes.indexOf(ink.ornament.getNote()) >= 0 &&
            GraphicalSlur.isInMiddleOfSlur((ink.left + ink.right) / 2, startX, endX, GraphicalSlur.graceRangeMiddle));
    }

    private graceRangeStartX(rangeStartX: number, startNote: GraphicalNote, startX: number, endX: number): number {
        const entry: GraphicalStaffEntry = this.staffEntries[0];
        if (this.graceStart || entry === this.staffEntries[this.staffEntries.length - 1] ||
            !startNote?.sourceNote.ParentVoiceEntry?.IsGrace || !this.hasOrnamentInMiddle(entry, startX, endX)) {
            return rangeStartX;
        }
        return Math.min(rangeStartX, startX + GraphicalSlur.graceRangeMargin);
    }

    private graceRangeEndX(rangeEndX: number, endNote: GraphicalNote, startX: number, endX: number): number {
        const entry: GraphicalStaffEntry = this.staffEntries[this.staffEntries.length - 1];
        if (this.graceEnd || entry === this.staffEntries[0] ||
            !endNote?.sourceNote.ParentVoiceEntry?.IsGrace || !this.hasOrnamentInMiddle(entry, startX, endX)) {
            return rangeEndX;
        }
        return Math.max(rangeEndX, endX - GraphicalSlur.graceRangeMargin);
    }

    /** Space (in units) an [[calculateInnerChordCurve]] slur keeps from the ink of its chords (dots, accidentals): innerSlurGap,
     *  less between close chords, down to innerSlurMinGap for a curve innerSlurMinWidth wide. */
    private static readonly innerSlurGap: number = 0.3;
    private static readonly innerSlurMinGap: number = 0.1;
    private static readonly innerSlurMinWidth: number = 0.5;
    /** How far (in units) a slur from an inner note of a chord whose outer note on its side has a curve to the same chord goes
     *  beyond the chord's curve when there is no room between the chords (see [[calculateInnerChordCurve]]). */
    private static readonly innerSlurOutsideShift: number = 1.0;
    /** Set by [[calculateInnerChordCurve]] for a slur that belongs between the chords but has no room there: calculateCurve()
     *  places it innerSlurOutsideShift beyond the chord's outer curve. */
    private innerChordCurveOutside: boolean = false;
    /** Distance (in units) of an [[calculateInnerChordCurve]] slur's end point from the centre line of its notehead. */
    private static readonly innerSlurYOffset: number = 0.3;
    /** Height (in units) of an [[calculateInnerChordCurve]] slur: 0.12 of its width, between these. */
    private static readonly innerSlurMinHeight: number = 0.4;
    private static readonly innerSlurMaxHeight: number = 0.8;

    /**
     * A slur from an inner note of a chord to the next chord of its voice, when a note of the chord further on the
     * slur's side has its own slur (or tie) on that side to the same chord: it goes between the two chords, from the
     * notehead of its start note to the notehead of its end note, like a tie, inside the outer curve. Both slurs had
     * the end points of the chord's outer note, the inner slur lying on the outer one (Bononcini, Deh piu a me, piano
     * m8: slurs below from Eb4 and Ab4, m12 and m19: slurs above from Bb4 and Db5; m2: a slur below from Bb4 under the
     * tie of Eb4; solo vocal verification 2, X5). The print draws the inner slur between the chords; so does Gould
     * (Behind Bars, slurs for two parts in chords) - the outer slur keeps its place outside the chord. Only between
     * neighbouring staff entries, with room between the chords. Same as osmd-dart.
     */
    private calculateInnerChordCurve(slurStartNote: GraphicalNote, slurEndNote: GraphicalNote): boolean {
        this.innerChordCurveOutside = false;
        if (!slurStartNote || !slurEndNote || this.graceStart || this.graceEnd || this.isCrossStaffPiece ||
            this.isVoltaPiece || this.staffEntries.length !== 2 || this.slur.isCrossed() ||
            !this.hasOuterCurveInChord(slurStartNote, slurEndNote)) {
            return false;
        }
        const startVf: any = (slurStartNote as VexFlowGraphicalNote).vfnote?.[0];
        const endVf: any = (slurEndNote as VexFlowGraphicalNote).vfnote?.[0];
        if (!startVf?.preFormatted || !endVf?.preFormatted) {
            return false;
        }
        const width: number = GraphicalSlur.headToHeadNoteheadWidth;
        const startHeadLeft: number = GraphicalSlur.noteheadLeftInStaffLine(slurStartNote);
        const endHeadLeft: number = GraphicalSlur.noteheadLeftInStaffLine(slurEndNote);
        // after the dots of the start chord, before the accidentals of the end chord; closer to them between close chords: the
        //   app's first screen has the eighth chords of Bononcini m2, m12, m19 1.1 apart, and the inner slurs (with the gap and
        //   a width of at least 1 before) lay on the outer ones (Parisotti, P04-X3b). Same as osmd-dart.
        const inkRight: number = startHeadLeft + width + startVf.getMetrics().modRightPx / unitInPixels;
        const inkLeft: number = endHeadLeft - endVf.getMetrics().modLeftPx / unitInPixels;
        const gap: number = Math.max(GraphicalSlur.innerSlurMinGap,
                                     Math.min(GraphicalSlur.innerSlurGap, (inkLeft - inkRight - GraphicalSlur.innerSlurMinWidth) / 2));
        const startX: number = inkRight + gap;
        const endX: number = inkLeft - gap;
        const curveWidth: number = endX - startX;
        if (curveWidth < GraphicalSlur.innerSlurMinWidth - 1e-9) {
            // no room between the chords: beyond the chord's outer curve, not on it
            this.innerChordCurveOutside = true;
            return false;
        }
        const side: number = this.placement === PlacementEnum.Below ? 1 : -1;
        const startY: number = GraphicalSlur.noteYInStaffLine(slurStartNote) + side * GraphicalSlur.innerSlurYOffset;
        const endY: number = GraphicalSlur.noteYInStaffLine(slurEndNote) + side * GraphicalSlur.innerSlurYOffset;
        const height: number = Math.min(GraphicalSlur.innerSlurMaxHeight,
                                        Math.max(Math.min(GraphicalSlur.innerSlurMinHeight, 0.5 * curveWidth), 0.12 * curveWidth));
        // a cubic curve with both control points d beyond the chord reaches 0.75·d beyond it in the middle
        const controlOffset: number = side * height / 0.75;
        this.bezierStartPt = new PointF2D(startX, startY);
        this.bezierStartControlPt = new PointF2D(startX + curveWidth / 4, startY + (endY - startY) / 4 + controlOffset);
        this.bezierEndControlPt = new PointF2D(endX - curveWidth / 4, endY - (endY - startY) / 4 + controlOffset);
        this.bezierEndPt = new PointF2D(endX, endY);
        return true;
    }

    /** Whether the slur starts at an inner note of its chord and the chord's outer note on the slur's side starts a slur
     *  placed on that side in the XML, or a tie curved to that side, ending in the slur's end chord. A slur on the chord's
     *  bottom note placed above, the usual MusicXML for a slur over the chord, stays over the chord, also over a tie of its
     *  top note (Torelli, Tu lo sai, piano m36) or of a middle note (Pergolesi/Ciampi, Nina, piano m12). */
    private hasOuterCurveInChord(slurStartNote: GraphicalNote, slurEndNote: GraphicalNote): boolean {
        const above: boolean = this.placement === PlacementEnum.Above;
        const endChord: GraphicalVoiceEntry = slurEndNote.parentVoiceEntry;
        const inEndChord: (note: Note) => boolean = (note: Note): boolean => endChord.notes.some(n => n.sourceNote === note);
        let outer: GraphicalNote;
        let outerY: number;
        let innerY: number; // the other side's outer note
        for (const note of slurStartNote.parentVoiceEntry.notes) {
            const y: number = GraphicalSlur.noteYInStaffLine(note);
            if (note.sourceNote.isRest()) {
                continue;
            }
            if (outer === undefined || (above ? y < outerY : y > outerY)) {
                outer = note;
                outerY = y;
            }
            if (innerY === undefined || (above ? y > innerY : y < innerY)) {
                innerY = y;
            }
        }
        const startY: number = GraphicalSlur.noteYInStaffLine(slurStartNote);
        if (outer === undefined || outer === slurStartNote || startY === outerY || startY === innerY) {
            return false; // not an inner note
        }
        for (const slur of outer.sourceNote.NoteSlurs) {
            if (slur !== this.slur && slur.StartNote === outer.sourceNote && slur.EndNote && inEndChord(slur.EndNote) &&
                slur.PlacementXml === this.placement && !slur.isGraceGroupSlur()) { // (a grace group's arc: no GraphicalSlur)
                return true;
            }
        }
        const tie: Tie = outer.sourceNote.NoteTie;
        const tieIndex: number = tie ? tie.Notes.indexOf(outer.sourceNote) : -1;
        if (tieIndex >= 0 && tieIndex + 1 < tie.Notes.length && inEndChord(tie.Notes[tieIndex + 1])) {
            let direction: PlacementEnum = tie.getTieDirection(outer.sourceNote);
            if (direction !== PlacementEnum.Above && direction !== PlacementEnum.Below) {
                // without one, Vexflow curves the tie away from the stem
                const stem: StemDirectionType = slurStartNote.parentVoiceEntry.parentVoiceEntry.StemDirection;
                direction = stem === StemDirectionType.Up ? PlacementEnum.Below :
                    stem === StemDirectionType.Down ? PlacementEnum.Above : PlacementEnum.NotYetDefined;
            }
            if (direction === this.placement) {
                return true;
            }
        }
        return false;
    }

    /** The x of the note (the left of its notehead) relative to its staffline. */
    private static noteXInStaffLine(note: GraphicalNote): number {
        const staffEntry: GraphicalStaffEntry = note.parentVoiceEntry.parentStaffEntry;
        return note.PositionAndShape.RelativePosition.x + staffEntry.PositionAndShape.RelativePosition.x +
            staffEntry.parentMeasure.PositionAndShape.RelativePosition.x;
    }

    /** The left of the note's notehead relative to its staffline. The note's x ([[noteXInStaffLine]]) is its voice entry's,
     *  half the Vexflow note's width right of the noteheads (VexFlowVoiceEntry.applyBordersFromVexflow()): taken for the left,
     *  an inner chord slur began 0.9 after the start chord's noteheads and ended inside the end chord's (Parisotti, Bononcini
     *  Deh piu a me, piano m12: in the gap between the noteheads of C5 and Ab4; P04-X3b). osmd-dart's note x is the left. */
    private static noteheadLeftInStaffLine(note: GraphicalNote): number {
        const vfNote: any = (note as VexFlowGraphicalNote).vfnote?.[0];
        const head: any = vfNote?.note_heads?.[(note as VexFlowGraphicalNote).vfnoteIndex];
        if (!vfNote?.getNoteHeadBeginX || !head?.getAbsoluteX) {
            return GraphicalSlur.noteXInStaffLine(note);
        }
        const halfNoteWidth: number = (vfNote.width - (vfNote.paddingRight ?? 0)) / 2;
        return GraphicalSlur.noteXInStaffLine(note) + (head.getAbsoluteX() - vfNote.getNoteHeadBeginX() - halfNoteWidth) / unitInPixels;
    }

    /** The y of the note (its notehead's centre line) relative to its staffline, from the line of its Vexflow notehead (the
     *  notes of a chord are placed at their heads only at the end of drawing, VexFlowMeasure.correctNotePositions()). */
    private static noteYInStaffLine(note: GraphicalNote): number {
        const measure: GraphicalMeasure = note.parentVoiceEntry.parentStaffEntry.parentMeasure;
        const vfNote: any = (note as VexFlowGraphicalNote).vfnote?.[0];
        const head: any = vfNote?.note_heads?.[(note as VexFlowGraphicalNote).vfnoteIndex];
        if (head && measure instanceof VexFlowMeasure) {
            const stave: VF.Stave = measure.getVFStave();
            return measure.PositionAndShape.RelativePosition.y + (stave.getYForNote(head.getLine()) - stave.getYForLine(0)) / unitInPixels;
        }
        return note.parentVoiceEntry.PositionAndShape.RelativePosition.y + note.PositionAndShape.RelativePosition.y;
    }

    /** Whether the last calculateCurve() drew the slur between the voices (see [[betweenVoices]]). For diagnostics and tests. */
    public IsBetweenVoices: boolean = false;
    /** Set while calculateCurve() runs again without [[betweenVoices]] after the curve didn't fit between the voices. */
    private betweenVoicesFallback: boolean = false;
    /** Space (in units) a slur between voices keeps from the other voice's notes, beyond its half thickness. */
    private static readonly betweenVoicesClearance: number = 0.2;
    /** The least depth (in units, under the line from its start to its end) of a slur between voices; a flatter curve
     *  doesn't read as a slur, and the slur goes around the other voice's notes instead. */
    private static readonly betweenVoicesMinDepth: number = 0.4;

    /**
     * A slur below in a voice with its stems up, over a staff shared with another voice that sounds lower meanwhile: it
     * goes between the voices, right under its own noteheads, and only its own voice's notes bend it (Scarlatti, Se
     * Florindo è fedele, piano m61: the slur under the upper voice's sixteenths went under the lower voice's D4 and its
     * tie to m62; Ricordi's Parisotti draws it between the voices, the tie under the D4). The curve is flattened to clear
     * the other voices' notes and rests (fitBetweenVoices()); without room for it, the slur goes around them as before.
     * Not for slurs over grace notes, between staves, over a system break, or with an articulation under a note of the
     * voice (staccatos sit in that space). Returns the voice entries' boxes, or undefined when the slur isn't one.
     * Same as osmd-dart.
     */
    private betweenVoices(slurStartNote: GraphicalNote, slurEndNote: GraphicalNote): BetweenVoices {
        if (this.placement !== PlacementEnum.Below || !slurStartNote || !slurEndNote || this.graceStart || this.graceEnd ||
            this.isCrossStaffPiece || this.isVoltaPiece || this.crossStaffCurve || this.pieceSide !== undefined || this.slur.isCrossed()) {
            return undefined;
        }
        const startEntry: VoiceEntry = slurStartNote.parentVoiceEntry.parentVoiceEntry;
        const endEntry: VoiceEntry = slurEndNote.parentVoiceEntry.parentVoiceEntry;
        if (startEntry.IsGrace || endEntry.IsGrace || startEntry.ParentVoice !== endEntry.ParentVoice ||
            startEntry.StemDirection !== StemDirectionType.Up || endEntry.StemDirection !== StemDirectionType.Up) {
            return undefined;
        }
        const own: VoiceEntryBox[] = [];
        const others: VoiceEntryBox[] = [];
        for (let index: number = 0; index < this.staffEntries.length; index++) {
            const staffEntry: GraphicalStaffEntry = this.staffEntries[index];
            const x: number = staffEntry.parentMeasure.PositionAndShape.RelativePosition.x + staffEntry.PositionAndShape.RelativePosition.x;
            for (const voiceEntry of staffEntry.graphicalVoiceEntries) {
                if (voiceEntry.parentVoiceEntry.IsGrace || voiceEntry.notes.length === 0) {
                    continue;
                }
                const shape: BoundingBox = voiceEntry.PositionAndShape;
                const box: VoiceEntryBox = {
                    left: x + shape.RelativePosition.x + shape.BorderLeft, right: x + shape.RelativePosition.x + shape.BorderRight,
                    top: shape.RelativePosition.y + shape.BorderTop, bottom: shape.RelativePosition.y + shape.BorderBottom,
                    first: index === 0, last: index === this.staffEntries.length - 1, rest: voiceEntry.notes[0].sourceNote.isRest(),
                };
                if (voiceEntry.parentVoiceEntry.ParentVoice === startEntry.ParentVoice) {
                    if (voiceEntry.notes.some(note => GraphicalSlur.hasArticulationOnSide(note, PlacementEnum.Below))) {
                        return undefined;
                    }
                    own.push(box);
                } else if (voiceEntry.notes.some(note => note.sourceNote.PrintObject)) {
                    others.push(box);
                }
            }
        }
        const lowestEnd: number = Math.max(own[0]?.bottom ?? -Infinity, own[own.length - 1]?.bottom ?? -Infinity);
        if (!others.some(other => !other.rest && other.top > lowestEnd)) {
            return undefined;
        }
        return { own, others };
    }

    /** The bottom line points of a [[betweenVoices]] slur: the bottoms of its own voice's notes after the first and before
     *  the last, from startX to endX. */
    private static betweenVoicesPoints(between: BetweenVoices, startX: number, endX: number): PointF2D[] {
        const points: PointF2D[] = [];
        for (const box of between.own) {
            if (box.first || box.last || box.rest) {
                continue;
            }
            for (const x of [box.left, box.right]) {
                if (x > startX && x < endX) {
                    points.push(new PointF2D(x, box.bottom));
                }
            }
        }
        return points;
    }

    /**
     * Whether the curve of a [[betweenVoices]] slur fits between the voices: raise an end over the other voices' notes
     * and rests under it, no higher than its own notehead, and both control points (flatten the curve) until it clears
     * them by betweenVoicesClearance; it fits if it keeps betweenVoicesMinDepth and doesn't run into its own voice's
     * noteheads.
     */
    private fitBetweenVoices(between: BetweenVoices): boolean {
        const clearance: number = GraphicalSlur.betweenVoicesClearance + GraphicalSlur.thickness / 2;
        // (an end may sit lower than usual, e.g. under the second of two slurs starting at the note: Schumann, Widmung,
        //   piano m1 on the web, at the lower voice's whole note's top)
        const ends: { point: PointF2D, control: PointF2D, box: VoiceEntryBox, start: boolean }[] = [
            { point: this.bezierStartPt, control: this.bezierStartControlPt, box: between.own.find(box => box.first), start: true },
            { point: this.bezierEndPt, control: this.bezierEndControlPt, box: between.own.find(box => box.last), start: false },
        ];
        for (const end of ends) {
            let y: number = end.point.y;
            for (const other of between.others) {
                if (end.point.x >= other.left && end.point.x <= other.right) {
                    y = Math.min(y, other.top - clearance);
                }
            }
            if (y === end.point.y) {
                continue;
            }
            if (!end.box || y < end.box.bottom) {
                return false; // no room under its notehead
            }
            const raised: number = end.point.y - y;
            const point: PointF2D = new PointF2D(end.point.x, y);
            const control: PointF2D = new PointF2D(end.control.x, end.control.y - raised);
            if (end.start) {
                this.bezierStartPt = point;
                this.bezierStartControlPt = control;
            } else {
                this.bezierEndPt = point;
                this.bezierEndControlPt = control;
            }
        }
        let lift: number = 0;
        for (const other of between.others) {
            lift = Math.max(lift, this.liftToClear(other.left, other.right, y => y - (other.top - clearance)));
        }
        if (lift > 0) {
            this.bezierStartControlPt = new PointF2D(this.bezierStartControlPt.x, this.bezierStartControlPt.y - lift);
            this.bezierEndControlPt = new PointF2D(this.bezierEndControlPt.x, this.bezierEndControlPt.y - lift);
            for (const box of between.own) {
                if (box.first || box.last || box.rest) {
                    continue;
                }
                if (this.liftToClear(box.left, box.right, y => box.bottom + GraphicalSlur.thickness / 2 - y) > 0) {
                    return false;
                }
            }
        }
        let depth: number = 0;
        for (let i: number = 1; i < 64; i++) {
            const point: PointF2D = this.calculateCurvePointAtIndex(i / 64);
            const ratio: number = (point.x - this.bezierStartPt.x) / (this.bezierEndPt.x - this.bezierStartPt.x);
            depth = Math.max(depth, point.y - (this.bezierStartPt.y + ratio * (this.bezierEndPt.y - this.bezierStartPt.y)));
        }
        return depth >= GraphicalSlur.betweenVoicesMinDepth;
    }

    /** Width of a black notehead, for the end points of a [[isHeadToHeadBetweenVoices]] slur. */
    private static readonly headToHeadNoteheadWidth: number = 1.2;
    /** Distance of a [[isHeadToHeadBetweenVoices]] slur's end point from the notehead's centre line, besides the
     *  usual SlurNoteHeadYOffset. */
    private static readonly headToHeadYOffset: number = 0.25;

    /** Whether the note's stem points to the slur's side. */
    private stemTowardSlur(note: GraphicalNote): boolean {
        return note.parentVoiceEntry.parentVoiceEntry.StemDirection ===
            (this.placement === PlacementEnum.Below ? StemDirectionType.Down : StemDirectionType.Up);
    }

    /**
     * A slur from a note of one voice to the next note of another voice on the staff, when a stem of either note
     * points to the slur's side: it goes from notehead to notehead, inside the stems, not around the stem ends
     * (Couperin, Concerts royaux III Courante m5: slurs below from an upper-voice quarter to the next eighth of
     * the lower voice, whose down stems are beamed under the noteheads; they hung under the beam). The 1722 print
     * draws a short arc between the noteheads. The notes in between, such as the beam, don't bend it.
     */
    private isHeadToHeadBetweenVoices(slurStartNote: GraphicalNote, slurEndNote: GraphicalNote): boolean {
        if (!slurStartNote || !slurEndNote || this.graceStart || this.graceEnd || this.staffEntries.length !== 2 ||
            this.slur.isCrossed()) {
            return false;
        }
        const startEntry: VoiceEntry = slurStartNote.sourceNote.ParentVoiceEntry;
        const endEntry: VoiceEntry = slurEndNote.sourceNote.ParentVoiceEntry;
        if (startEntry.IsGrace || endEntry.IsGrace || startEntry.ParentVoice === endEntry.ParentVoice) {
            return false;
        }
        return this.stemTowardSlur(slurStartNote) || this.stemTowardSlur(slurEndNote);
    }

    /**
     * End points of a [[isHeadToHeadBetweenVoices]] slur, relative to the staffline: next to the noteheads on the
     * slur's side, and beside a stem on that side - the start right of an up stem (slur above), the end left of a
     * down stem (slur below); otherwise under (over) the notehead's centre.
     */
    private calculateHeadToHeadStartAndEnd(slurStartNote: GraphicalNote, slurEndNote: GraphicalNote):
        {startX: number, startY: number, endX: number, endY: number} {
        const side: number = this.placement === PlacementEnum.Below ? 1 : -1;
        const width: number = GraphicalSlur.headToHeadNoteheadWidth;
        const point: (note: GraphicalNote, isStart: boolean) => PointF2D = (note, isStart) => {
            const voiceEntry: GraphicalVoiceEntry = note.parentVoiceEntry;
            const staffEntry: GraphicalStaffEntry = voiceEntry.parentStaffEntry;
            let x: number = note.PositionAndShape.RelativePosition.x + staffEntry.PositionAndShape.RelativePosition.x +
                staffEntry.parentMeasure.PositionAndShape.RelativePosition.x + width / 2;
            if (this.stemTowardSlur(note)) {
                if (isStart && side < 0) {
                    x = x + width / 2 + 0.2; // right of the up stem
                } else if (!isStart && side > 0) {
                    x = x - width / 2 - 0.2; // left of the down stem
                }
            }
            const y: number = voiceEntry.PositionAndShape.RelativePosition.y + note.PositionAndShape.RelativePosition.y +
                side * GraphicalSlur.headToHeadYOffset;
            return new PointF2D(x, y);
        };
        const start: PointF2D = point(slurStartNote, true);
        const end: PointF2D = point(slurEndNote, false);
        return {startX: start.x, startY: start.y, endX: end.x, endY: end.y};
    }

    /** Whether the note's voice entry has an articulation other than a fermata or a breath mark on `side`: as the XML
     *  places it, else as VexFlow positioned it (the modifiers of the note). */
    private static hasArticulationOnSide(note: GraphicalNote, side: PlacementEnum): boolean {
        // (accents and marcatos go outside the slur instead, see goesOutsideSlurs())
        const ownPlace: (a: Articulation) => boolean = (a: Articulation): boolean =>
            a.articulationEnum === ArticulationEnum.fermata || a.articulationEnum === ArticulationEnum.invertedfermata ||
            a.articulationEnum === ArticulationEnum.breathmark || GraphicalSlur.goesOutsideSlurs(a.articulationEnum);
        const articulations: Articulation[] = note.parentVoiceEntry?.parentVoiceEntry?.Articulations?.filter(a => !ownPlace(a)) ?? [];
        if (articulations.length === 0) {
            return false;
        }
        if (articulations.some(a => a.placement === side)) {
            return true;
        }
        if (!articulations.some(a => a.placement === PlacementEnum.NotYetDefined)) {
            return false;
        }
        const vfNotes: any[] = (note as VexFlowGraphicalNote).vfnote;
        const modifiers: any[] = vfNotes && vfNotes.length > 0 && vfNotes[0] ? (vfNotes[0] as any).modifiers : undefined;
        const vfSide: number = side === PlacementEnum.Above ? VF.Modifier.Position.ABOVE : VF.Modifier.Position.BELOW;
        for (const modifier of modifiers || []) {
            if (modifier.getCategory?.() === VF.Articulation.CATEGORY && modifier.position === vfSide &&
                !modifier.isBreathMark?.() && modifier.type !== "a@a" && modifier.type !== "a@u" && !modifier.goesOutsideSlurs) {
                return true;
            }
        }
        return false;
    }

    /**
     * Whether an articulation goes outside a slur on its side instead of the slur going over it: accents and marcatos
     * (LilyPond's avoid-slur 'around'; staccatos and tenutos stay inside, the slur clears them). The slur starts and ends
     * at their notes, without SlurEndArticulationYOffset or the clearance over the articulation (upstream: "for accents
     * (>) it's even counter productive"); VexFlowMusicSheetCalculator.layoutFermatasOverSlurs() moves the accent beyond
     * the slur. Taking the slur over the accent bent it into a steep stroke from beyond the accent (Bononcini, Deh piu a
     * me, piano m1, m5, m28; Cesti, Intorno all'idol mio, voice m5; solo vocal verification 2, 10-08). Same as osmd-dart
     * (VexFlowMeasure.goesOutsideSlurs).
     */
    public static goesOutsideSlurs(articulation: ArticulationEnum): boolean {
        return articulation === ArticulationEnum.accent || articulation === ArticulationEnum.strongaccent ||
            articulation === ArticulationEnum.marcatoup || articulation === ArticulationEnum.marcatodown ||
            articulation === ArticulationEnum.invertedstrongaccent;
    }

    private calculateStartAndEnd(   slurStartNote: GraphicalNote,
                                    slurEndNote: GraphicalNote,
                                    staffLine: StaffLine,
                                    rules: EngravingRules,
                                    skyBottomLineCalculator: SkyBottomLineCalculator,
                                    ownVoiceOnly: boolean = false): {startX: number, startY: number, endX: number, endY: number} {
        let startX: number = 0;
        let startY: number = 0;
        let endX: number = 0;
        let endY: number = 0;
        this.articulationCorners = [];
        this.articulationsOutside = [];
        this.labelsOutside = [];

        if (slurStartNote) {
            // must be relative to StaffLine
            startX = slurStartNote.PositionAndShape.RelativePosition.x + slurStartNote.parentVoiceEntry.parentStaffEntry.PositionAndShape.RelativePosition.x
                                            + slurStartNote.parentVoiceEntry.parentStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x;

            // If Slur starts on a Gracenote
            if (this.graceStart) {
                startX += slurStartNote.parentVoiceEntry.parentStaffEntry.staffEntryParent.PositionAndShape.RelativePosition.x;
            }

            //const first: GraphicalNote = slurStartNote.parentVoiceEntry.notes[0];

            // Determine Start/End Point coordinates with the VoiceEntry of the Start/EndNote of the slur
            const slurStartVE: GraphicalVoiceEntry = slurStartNote.parentVoiceEntry;

            if (this.placement === PlacementEnum.Above) {
                startY = slurStartVE.PositionAndShape.RelativePosition.y + slurStartVE.PositionAndShape.BorderTop;
                if (this.rules.SlurPlacementUseSkyBottomLine) {
                    startY = Math.min(endY, slurStartVE.parentStaffEntry.getSkylineMin());
                }
            } else {
                startY = slurStartVE.PositionAndShape.RelativePosition.y + slurStartVE.PositionAndShape.BorderBottom;
                if (this.rules.SlurPlacementUseSkyBottomLine && !ownVoiceOnly) {
                    startY = Math.max(endY, slurStartVE.parentStaffEntry.getBottomlineMax());
                }
            }
            startY = this.getYPastArticulations(slurStartNote, true, startX, startY);

            // If the stem points towards the starting point of the slur, shift the slur by a small amount to start (approximately) at the x-position
            // of the notehead. Note: an exact calculation using the position of the note is too complicate for the payoff
            if ( slurStartVE.parentVoiceEntry.StemDirection === StemDirectionType.Down && this.placement === PlacementEnum.Below ) {
                startX -= 0.5;
            }
            if (slurStartVE.parentVoiceEntry.StemDirection === StemDirectionType.Up && this.placement === PlacementEnum.Above) {
                startX += 0.5;
            }
            // if (first.NoteStem && first.NoteStem.Direction === StemEnum.StemUp && this.placement === PlacementEnum.Above) {
            //     startX += first.NoteStem.PositionAndShape.RelativePosition.x;
            //     startY = skyBottomLineCalculator.getSkyLineMinAtPoint(staffLine, startX);
            // } else {
            //     const last: GraphicalNote = <GraphicalNote>slurStartNote[slurEndNote.parentVoiceEntry.notes.length - 1];
            //     if (last.NoteStem && last.NoteStem.Direction === StemEnum.StemDown && this.placement === PlacementEnum.Below) {
            //         startX += last.NoteStem.PositionAndShape.RelativePosition.x;
            //         startY = skyBottomLineCalculator.getBottomLineMaxAtPoint(staffLine, startX);
            //     } else {
            //     }
            // }
        } else {
            startX = this.pieceStartX() ?? 0;
        }

        if (slurEndNote) {
            endX = slurEndNote.PositionAndShape.RelativePosition.x + slurEndNote.parentVoiceEntry.parentStaffEntry.PositionAndShape.RelativePosition.x
                + slurEndNote.parentVoiceEntry.parentStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x;

            // If Slur ends in a Gracenote
            if (this.graceEnd) {
                endX += slurEndNote.parentVoiceEntry.parentStaffEntry.staffEntryParent.PositionAndShape.RelativePosition.x;
            }

            const slurEndVE: GraphicalVoiceEntry = slurEndNote.parentVoiceEntry;

            if (this.placement === PlacementEnum.Above) {
                endY = slurEndVE.PositionAndShape.RelativePosition.y + slurEndVE.PositionAndShape.BorderTop;
                if (this.rules.SlurPlacementUseSkyBottomLine) {
                    endY = Math.min(endY, slurEndVE.parentStaffEntry.getSkylineMin());
                }
            } else {
                endY = slurEndVE.PositionAndShape.RelativePosition.y + slurEndVE.PositionAndShape.BorderBottom;
                if (this.rules.SlurPlacementUseSkyBottomLine && !ownVoiceOnly) {
                    endY = Math.max(endY, slurEndVE.parentStaffEntry.getBottomlineMax());
                }
            }
            endY = this.getYPastArticulations(slurEndNote, false, endX, endY);

            // If the stem points towards the endpoint of the slur, shift the slur by a small amount to start (approximately) at the x-position
            // of the notehead. Note: an exact calculation using the position of the note is too complicate for the payoff
            if ( slurEndVE.parentVoiceEntry.StemDirection === StemDirectionType.Down && this.placement === PlacementEnum.Below ) {
                endX -= 0.5;
            }
            if (slurEndVE.parentVoiceEntry.StemDirection === StemDirectionType.Up && this.placement === PlacementEnum.Above) {
                endX += 0.5;
            }
            // const first: GraphicalNote = <GraphicalNote>slurEndNote.parentVoiceEntry.notes[0];
            // if (first.NoteStem && first.NoteStem.Direction === StemEnum.StemUp && this.placement === PlacementEnum.Above) {
            //     endX += first.NoteStem.PositionAndShape.RelativePosition.x;
            //     endY = skyBottomLineCalculator.getSkyLineMinAtPoint(staffLine, endX);
            // } else {
            //     const last: GraphicalNote = <GraphicalNote>slurEndNote.parentVoiceEntry.notes[slurEndNote.parentVoiceEntry.notes.length - 1];
            //     if (last.NoteStem && last.NoteStem.Direction === StemEnum.StemDown && this.placement === PlacementEnum.Below) {
            //         endX += last.NoteStem.PositionAndShape.RelativePosition.x;
            //         endY = skyBottomLineCalculator.getBottomLineMaxAtPoint(staffLine, endX);
            //     } else {
            //         if (this.placement === PlacementEnum.Above) {
            //             const highestNote: GraphicalNote = last;
            //             endY = highestNote.PositionAndShape.RelativePosition.y;
            //             if (highestNote.NoteHead) {
            //                 endY += highestNote.NoteHead.PositionAndShape.BorderMarginTop;
            //             } else { endY += highestNote.PositionAndShape.BorderTop; }
            //         } else {
            //             const lowestNote: GraphicalNote = first;
            //             endY = lowestNote.parentVoiceEntry
            //             lowestNote.PositionAndShape.RelativePosition.y;
            //             if (lowestNote.NoteHead) {
            //                 endY += lowestNote.NoteHead.PositionAndShape.BorderMarginBottom;
            //             } else { endY += lowestNote.PositionAndShape.BorderBottom; }
            //         }
            //     }
            // }
        } else if (!this.slur.EndNote) {
            endX = this.getUnattachedEndX();
        } else {
            endX = this.pieceEndX() ?? staffLine.PositionAndShape.Size.width;
        }

        // if GraphicalSlur breaks over System, then the end/start of the curve is at the corresponding height with the known start/end
        //   (a middle piece, with neither note in this staff line, on the slur's side of the staff: a slur below at -1.5
        //   started in the staff lines at the clef and crossed the staff, Schumann, Myrthen 11 m36)
        if (!slurStartNote && !slurEndNote) {
            startY = this.placement === PlacementEnum.Below ? staffLine.StaffHeight + 1.5 : -1.5;
            endY = startY;
        }
        if (!slurStartNote) {
            if (this.placement === PlacementEnum.Above) {
                startY = endY - 1;
            } else {
                startY = endY + 1;
            }
        }
        if (!slurEndNote) {
            if (!this.slur.EndNote) {
                endY = startY; // a short slur to the barline, like Sibelius draws one without end note (see Slur.HasUnattachedEnd)
            } else if (this.placement === PlacementEnum.Above) {
                endY = startY - 1;
            } else {
                endY = startY + 1;
            }
        }

        // if two slurs start/end at the same GraphicalNote, then the second gets an offset
        if (this.slur.startNoteHasMoreStartingSlurs() && this.slur.isSlurLonger()) {
            if (this.placement === PlacementEnum.Above) {
                startY -= rules.SlursStartingAtSameStaffEntryYOffset;
            } else { startY += rules.SlursStartingAtSameStaffEntryYOffset; }
        }
        if (this.slur.endNoteHasMoreEndingSlurs() && this.slur.isSlurLonger()) {
            if (this.placement === PlacementEnum.Above) {
                endY -= rules.SlursStartingAtSameStaffEntryYOffset;
            } else { endY += rules.SlursStartingAtSameStaffEntryYOffset; }
        }

        // Keep the curve's end points out of the middle of the staff, but only when they
        // actually fall inside it. A point that already lies entirely beyond the staff on the
        // slur's side (e.g. a slur below grace notes that sit above the staff) must stay at the
        // note; pulling it to the staff would draw the slur across the staff lines, far from the notes.
        // A slur between voices (betweenVoices()) stays inside the staff, at its notes (as in osmd-dart, which has no such
        // clamp: the end at a note on the middle line went half a space lower on the web, and the slur under Widmung's
        // arpeggio had no room left over the lower voice).
        // Nor a slur on the noteheads' side of its voice among other voices (below an up-stemmed voice, above a
        //   down-stemmed one): it lies towards the other voice, and pulled to the far half of the staff it ran into it
        //   (Mozart, K.191 II m195, left hand: voice 3's slurs under its A3 sixteenths dived to voice 2's heads, voice 2's
        //   slur over its A2 rose through voice 3's). osmd-dart has no clamp at all.
        if (this.onHeadSideAmongVoices(slurStartNote, slurEndNote)) {
            // (stays at its notes)
        } else if (this.placement === PlacementEnum.Above) {
            startY = GraphicalSlur.clampEndPointAbove(startY, staffLine.StaffHeight);
            endY = GraphicalSlur.clampEndPointAbove(endY, staffLine.StaffHeight);
        } else if (!ownVoiceOnly) {
            startY = GraphicalSlur.clampEndPointBelow(startY, staffLine.StaffHeight);
            endY = GraphicalSlur.clampEndPointBelow(endY, staffLine.StaffHeight);
        }

        // a grace note shares its main note's staff entry position (see VoiceGenerator: a slur can start or end on one)
        startX += GraphicalSlur.graceNoteXOffset(slurStartNote);
        endX += GraphicalSlur.graceNoteXOffset(slurEndNote);

        return {startX, startY, endX, endY};
    }

    /** Whether this slur, from and to notes of one voice in a measure with several voices, lies on the noteheads' side
     *  of that voice: below up stems or above down stems (see calculateStartAndEnd()). */
    private onHeadSideAmongVoices(slurStartNote: GraphicalNote, slurEndNote: GraphicalNote): boolean {
        const startEntry: VoiceEntry = slurStartNote?.parentVoiceEntry?.parentVoiceEntry;
        const endEntry: VoiceEntry = slurEndNote?.parentVoiceEntry?.parentVoiceEntry;
        if (!startEntry || !endEntry || startEntry.ParentVoice !== endEntry.ParentVoice || startEntry.IsGrace || endEntry.IsGrace ||
            !this.staffEntries.some(entry => entry.parentMeasure.hasMultipleVoices())) {
            return false;
        }
        const stem: StemDirectionType = startEntry.StemDirection;
        if (endEntry.StemDirection !== stem) {
            return false;
        }
        return this.placement === PlacementEnum.Below && stem === StemDirectionType.Up ||
            this.placement === PlacementEnum.Above && stem === StemDirectionType.Down;
    }

    /** Distance in units from the staff entry position a grace note shares with its main note to the grace note's
     *  notehead (0 for other notes). As osmd_dart GraphicalSlur._graceNoteXOffset.
     */
    private static graceNoteXOffset(graphicalNote: GraphicalNote): number {
        if (!graphicalNote?.sourceNote?.ParentVoiceEntry?.IsGrace) {
            return 0;
        }
        const graceNote: any = (graphicalNote.parentVoiceEntry as VexFlowVoiceEntry).vfStaveNote;
        const staffEntry: GraphicalStaffEntry = graphicalNote.parentVoiceEntry.parentStaffEntry;
        if (!graceNote || !staffEntry) {
            return 0;
        }
        for (const gve of staffEntry.graphicalVoiceEntries as VexFlowVoiceEntry[]) {
            const mainNote: any = gve.vfStaveNote;
            const group: any = mainNote?.getModifiers?.().find((modifier: any) =>
                modifier.getCategory() === "gracenotegroups" && modifier.getGraceNotes().includes(graceNote));
            if (!group) {
                continue;
            }
            // The group positions its notes only while drawing. Its alignment is idempotent (it sets the tick contexts'
            //   x offset), so apply it early.
            group.alignSubNotesWithNote(group.getGraceNotes(), mainNote);
            return (graceNote.getNoteHeadBeginX() - mainNote.getNoteHeadBeginX()) / unitInPixels;
        }
        // A grace note after its main note (a Nachschlag) is no group member but a stand-alone tickable right of its main
        //   note, already formatted (see VexFlowMeasure). A slur to it ended at the main note (Couperin, Concerts royaux IV
        //   Forlane m25: from the note before the main note; IV Rigaudon m22: from the main note itself, a dash).
        const voiceEntry: VoiceEntry = graphicalNote.parentVoiceEntry.parentVoiceEntry;
        if (voiceEntry.GraceAfterMainNote && graceNote.getTickContext?.()) {
            const main: any = (staffEntry.graphicalVoiceEntries as VexFlowVoiceEntry[]).find(gve =>
                !gve.parentVoiceEntry.IsGrace && gve.parentVoiceEntry.ParentVoice === voiceEntry.ParentVoice)?.vfStaveNote;
            if (main?.getTickContext?.()) {
                return (graceNote.getNoteHeadBeginX() - main.getNoteHeadBeginX()) / unitInPixels;
            }
        }
        return 0;
    }

    /** Y of a slur-above end point: no lower than 1.5 while the point is within the staff. A point on the bottom line
     *  is at a note below the staff, as one under it. */
    private static clampEndPointAbove(y: number, staffHeight: number): number {
        if (y >= staffHeight) {
            return y; // completely below the staff: stay at the note
        }
        return Math.min(y, 1.5);
    }

    /** Y of a slur-below end point: no higher than StaffHeight - 1.5 while the point is within the staff. A point on the
     *  top line is at a note above the staff, as one over it: pulled into the staff, the slur below a pair of grace notes
     *  over the staff dived from the first one to the fourth line (Mozart, K.191 III bassoon m270 and m338: B-flat3 and
     *  C4 after the trill, the B-flat3's ink ending on the top line, the C4's half a space above it). */
    private static clampEndPointBelow(y: number, staffHeight: number): number {
        if (y <= 0) {
            return y; // completely above the staff: stay at the note
        }
        return Math.max(y, staffHeight - 1.5);
    }

    /** Start x (relative to the staff line) of a cross-staff piece without its start note: after the begin
     *  instructions of its first measure (also a volta piece, see isVoltaPiece). Undefined for other slurs (the staff
     *  line's start). */
    private pieceStartX(): number | undefined {
        if (!this.isCrossStaffPiece && !this.isVoltaPiece) {
            return undefined;
        }
        const measure: GraphicalMeasure = this.staffEntries[0].parentMeasure;
        return measure.PositionAndShape.RelativePosition.x + measure.beginInstructionsWidth;
    }

    /** End x of a cross-staff piece without its end note: the end of its last measure (see [[pieceStartX]]). */
    private pieceEndX(): number | undefined {
        if (!this.isCrossStaffPiece && !this.isVoltaPiece) {
            return undefined;
        }
        const measure: GraphicalMeasure = this.staffEntries[this.staffEntries.length - 1].parentMeasure;
        return measure.PositionAndShape.RelativePosition.x + measure.PositionAndShape.Size.width;
    }

    /**
     * The y that the slur keeps its distance (SlurNoteHeadYOffset) from at its start or end note: beyond the note's articulations
     * on the slur's side that go between the note and the slur. Only staccato dots and wedges and tenuto lines do (Behind Bars
     * p. 121): another mark, e.g. an accent or a fermata, and the ones beyond it go outside the slur, which stays closer to the
     * note (p. 122), and placeArticulationsOutside() moves them beyond it, with the fingerings stacked on them. Unless that takes
     * them too far from the note: then the slur goes past them too (see retryPastArticulationsOutside()).
     * So does an ornament, e.g. a trill or a mordent, which wasn't taken into account: the slur started at the note under it and
     * could run through it (isc's comment on PR #1830: Bach, Invention No. 1, m. 14, rising steeply to the next notes; Mozart,
     * Sonata K. 545, m. 15 and 17, under the trill). The marks under it stay inside, see below.
     * The marks are taken where Vexflow draws them, e.g. the staccato of a note on a line in the next stave space.
     * The corners of the marks the slur clears go to articulationCorners, for clearObstacles() to keep the curve that far from them
     * over their width too: e.g. the end of a slur above a stem-up note is at the stem, right of a staccato at the stem end, and a
     * short slur rising to it ran over the dot lower than its end.
     * @param note the slur's start or end note
     * @param isStart whether it is the start note
     * @param headX the x of the center of the note head, relative to the staff line
     * @param y the border of the note's voice entry on the slur's side, relative to the staff line
     * @returns y, or the outer edge of the outermost of the marks inside the slur
     */
    private getYPastArticulations(note: GraphicalNote, isStart: boolean, headX: number, y: number): number {
        const vfnote: any = (note as VexFlowGraphicalNote).vfnote?.[0];
        const stave: any = vfnote?.getStave?.();
        if (!stave) {
            return y;
        }
        const above: boolean = this.placement === PlacementEnum.Above;
        const outward: number = above ? -1 : 1;
        const position: number = above ? VF.Modifier.Position.ABOVE : VF.Modifier.Position.BELOW;
        const staveTopY: number = stave.getYForLine(0); // relative to the staff line, like the notes (see VexFlowMeasure.correctNotePositions())
        const marks: ArticulationOutside[] = vfnote.getModifiers()
            // (a breath mark is after the note)
            .filter((modifier: any) => (modifier.getCategory() === VF.Articulation.CATEGORY && modifier.type !== "abr" ||
                modifier.getCategory() === VF.Ornament.CATEGORY) && modifier.getPosition() === position)
            .map((articulation: any): ArticulationOutside => {
                const measure: () => ArticulationExtent = () => {
                    const extent: {left: number, right: number, top: number, bottom: number} = articulation.getExtent();
                    const [top, bottom] = [(extent.top - staveTopY) / unitInPixels, (extent.bottom - staveTopY) / unitInPixels];
                    return {
                        left: headX + extent.left / unitInPixels,
                        right: headX + extent.right / unitInPixels,
                        near: above ? -bottom : top, // as distances outward, see getOutwardExtent()
                        far: above ? -top : bottom,
                        // (fork: every mark goes inside but the ones layoutFermatasOverSlurs() moves beyond the slur, see
                        //   goesOutsideSlurs(): e.g. a bowing stays between the note and the slur, as before)
                        inside: GraphicalSlur.articulationsInsideSlur.includes(articulation.type) ||
                            !(articulation.goesOutsideSlurs || articulation.getCategory() === VF.Ornament.CATEGORY ||
                              GraphicalSlur.isFermata({articulation} as ArticulationOutside)),
                    };
                };
                return {...measure(), isStart, articulation, measure};
            });
        marks.sort((a: ArticulationExtent, b: ArticulationExtent): number => a.near - b.near); // from the note outward
        // a fermata goes outside even when the other marks don't (Behind Bars pp. 188-189, see retryPastArticulationsOutside()), but
        //   none of a grace note's do, which VexFlowMusicSheetCalculator.calculateMeasureXLayout() doesn't reset for each render,
        //   nor the articulations under an ornament, which Vexflow stacks on them and doesn't move along (see Ornament.format())
        const clearEvery: boolean = isStart ? this.clearingEveryArticulationAt?.start : this.clearingEveryArticulationAt?.end;
        const ornamentIndex: number = marks.findIndex((mark: ArticulationOutside) => mark.articulation.getCategory() === VF.Ornament.CATEGORY);
        let distance: number = y * outward; // how far out the start or end is
        let passed: number = 0; // the marks the start or end goes past
        for (const [index, mark] of marks.entries()) {
            // (fork: an accent under an ornament goes beyond the slur with the ornament over it, see
            //   VexFlowMusicSheetCalculator.layoutOrnament(), user decision 10-28)
            const keepInside: boolean = note.sourceNote.IsGraceNote || index < ornamentIndex && !mark.articulation.goesOutsideSlurs;
            // (fork: an ornament at the start or end note goes over the slur also where the slur leaves the note steeply, user
            //   decision 10-24, Couperin Concerts royaux I Prelude m7, see VexFlowMusicSheetCalculator.layoutOrnament(); upstream
            //   takes the slur past it then, like an accent)
            const staysOutside: boolean = GraphicalSlur.isFermata(mark) || mark.articulation.getCategory() === VF.Ornament.CATEGORY;
            if (!mark.inside && !keepInside && (!clearEvery || staysOutside)) {
                const outside: ArticulationOutside[] = marks.slice(index);
                this.articulationsOutside.push(...outside);
                this.addLabelsOutside(note, isStart, outside);
                break;
            }
            distance = Math.max(distance, mark.far);
            this.articulationCorners.push(new PointF2D(mark.left, mark.far * outward), new PointF2D(mark.right, mark.far * outward));
            passed++;
        }
        // (fork: past the number or bracket of the note's tuplet over the marks it went past as well, as the sky line raise over
        //   the marks did before 2.2.1: the 3 over the up-bow of Prokofiev Op.19 I violin m58 G3, where the slur from the G3 starts,
        //   stays inside the slur - a slur through it moved it beyond the slur, see
        //   VexFlowMusicSheetCalculator.layoutFermatasOverSlurs())
        if (passed > 0) {
            const measure: VexFlowMeasure = note.parentVoiceEntry.parentStaffEntry.parentMeasure as VexFlowMeasure;
            for (const ink of measure.TupletNumberInk ?? []) {
                if (ink.above === above && ink.left <= headX && headX <= ink.right && ink.tuplet.getNotes().includes(vfnote)) {
                    distance = Math.max(distance, above ? -ink.top : ink.bottom);
                }
            }
        }
        return distance * outward;
    }

    /**
     * Adds the labels stacked on the articulations left outside the slur at its start or end note to labelsOutside, to move along
     * with them: over them and beyond them, the fingerings of the note's staff entry (MusicSheetCalculator.calculateFingerings()
     * places them after the articulations) and, above the first staffline of the system, a measure number
     * (MusicSheetCalculator.calculateMeasureNumberPlacement(), before the fingerings).
     * @param outside the articulations left outside the slur, from the note outward
     */
    private addLabelsOutside(note: GraphicalNote, isStart: boolean, outside: ArticulationOutside[]): void {
        const staffLine: StaffLine = note.parentVoiceEntry.parentStaffEntry.parentMeasure.ParentStaffLine;
        const labels: LabelOutside[] = (note.parentVoiceEntry.parentStaffEntry.FingeringEntries ?? []).map((fingering: GraphicalLabel) => {
            const box: BoundingBox = fingering.PositionAndShape; // relative to the staffline
            return {box, isStart, left: box.RelativePosition.x + box.BorderLeft, right: box.RelativePosition.x + box.BorderRight,
                    isFingering: true};
        });
        const system: MusicSystem = staffLine?.ParentMusicSystem;
        if (this.placement === PlacementEnum.Above && staffLine === system?.StaffLines[0]) {
            for (const measureNumber of system.MeasureNumberLabels) {
                const box: BoundingBox = measureNumber.PositionAndShape;
                const x: number = box.RelativePosition.x - staffLine.PositionAndShape.RelativePosition.x;
                labels.push({box, isStart, left: x + box.BorderLeft, right: x + box.BorderRight, isFingering: false});
            }
        }
        const left: number = Math.min(...outside.map((mark: ArticulationOutside) => mark.left));
        const right: number = Math.max(...outside.map((mark: ArticulationOutside) => mark.right));
        for (const label of labels) {
            if (label.right > left && label.left < right && this.getOutwardExtent(label.box)[0] >= outside[0].near) {
                this.labelsOutside.push(label);
            }
        }
    }

    /** Whether the articulation is a fermata, which goes outside a slur at its start or end also when the other marks don't
     *  (see getYPastArticulations()). */
    private static isFermata(mark: ArticulationOutside): boolean {
        return mark.articulation.type.startsWith("a@"); // above or below
    }

    /**
     * Keeps the articulations left outside the slur at its start or end (see getYPastArticulations()) that the curve passes
     * beyond inside it after all, as they are not in its way: e.g. a slur below a note high above the staff starts below the
     * staff (calculateStartAndEnd()), and an accent under the note is between them. From the note outward, up to the first one
     * the curve runs into or passes under. The labels stacked on them then don't move either (see placeArticulationsOutside()).
     * @returns For the start and the end, whether the curve passes one of those closer than SlurNoteHeadYOffset, the distance it
     *          keeps from the marks inside it, less a little (see retryPastArticulationsOutside()).
     */
    private keepPassedArticulationsInside(): {start: boolean, end: boolean} {
        const passedClose: {start: boolean, end: boolean} = {start: false, end: false};
        for (const isStart of [true, false]) {
            const marks: ArticulationOutside[] = this.articulationsOutside.filter((mark: ArticulationOutside) => mark.isStart === isStart);
            let passed: number = 0;
            for (const mark of marks) {
                const beyond: number = this.getDistanceBeyond(mark.left, mark.right, mark.far);
                if (beyond < 0) {
                    break;
                }
                if (beyond < this.rules.SlurNoteHeadYOffset - 0.1) {
                    passedClose[isStart ? "start" : "end"] = true;
                }
                passed++;
            }
            if (passed === 0) {
                continue;
            }
            this.articulationsOutside = this.articulationsOutside.filter((mark: ArticulationOutside) => !marks.slice(0, passed).includes(mark));
            if (passed === marks.length) {
                this.labelsOutside = this.labelsOutside.filter((label: LabelOutside) => label.isStart !== isStart);
            }
        }
        return passedClose;
    }

    /** How far the curve passes beyond a box from left to right (relative to the staffline) whose far edge is far out (see
     *  getOutwardExtent()), at the closest over its width: negative if it runs into it or passes under it, Infinity if it doesn't
     *  reach over it. */
    private getDistanceBeyond(left: number, right: number, far: number): number {
        const outward: number = this.placement === PlacementEnum.Above ? -1 : 1;
        let beyond: number = Number.POSITIVE_INFINITY;
        for (let i: number = 0; i <= 200; i++) {
            // (calculateCurvePointAtIndex(1) is not the end point, but (0, 0))
            const point: PointF2D = i < 200 ? this.calculateCurvePointAtIndex(i / 200) : this.bezierEndPt;
            if (point.x >= left && point.x <= right) {
                beyond = Math.min(beyond, point.y * outward - far);
            }
        }
        return beyond;
    }

    /**
     * Calculates the curve again if placeArticulationsOutside() would move the articulations left outside the slur at its start
     * or end too far from their note, this time with the slur past every articulation of that note but a fermata: if the slur
     * leaves the note so steeply that it gets more than articulationOutsideSlurMaxRise further out over them than at its tip, e.g.
     * a short slur rising to a high note (Behind Bars p. 122: accents at the ends of a slur go inside it when they would otherwise
     * be too far from the note to be immediately apparent; a pause goes outside, pp. 188-189). Or if the curve passes too close
     * beyond one it keeps inside (see keepPassedArticulationsInside()). Before retryPastEndFingerings(), whose fingerings are then
     * those of the new curve.
     * @param passedClose For the start and the end, whether the curve passes too close beyond an articulation it keeps inside.
     * @returns Whether the curve was calculated again (and added to the sky or bottom line), so there is nothing left to do.
     */
    private retryPastArticulationsOutside(rules: EngravingRules, passedClose: {start: boolean, end: boolean}): boolean {
        if (this.clearingEveryArticulationAt || this.fingeringsRunInto) {
            return false; // this is a later calculation
        }
        // (fork: the marks left outside go beyond the slur however steeply it leaves the note - an accent at the first note of a
        //   tuplet with a slur from it over the slur, Lalo Op.21 III violin m44; over an accent, the slur bent into a steep stroke,
        //   see goesOutsideSlurs(), user decision 10-08. VexFlowMusicSheetCalculator.layoutFermatasOverSlurs() moves them, see
        //   EngravingRules.SlurPlacesArticulationsOutside)
        const tooFar: (isStart: boolean) => boolean = (isStart: boolean) => rules.SlurPlacesArticulationsOutside &&
            this.getShiftOutside(isStart) > 0 && this.getRiseOutside(isStart) > GraphicalSlur.articulationOutsideSlurMaxRise;
        const retry: {start: boolean, end: boolean} = {start: passedClose.start || tooFar(true), end: passedClose.end || tooFar(false)};
        if (!retry.start && !retry.end) {
            return false;
        }
        this.clearingEveryArticulationAt = retry;
        try {
            this.calculateCurve(rules);
        } finally {
            this.clearingEveryArticulationAt = undefined;
        }
        return true;
    }

    /**
     * Moves the articulations of the start and end notes that getYPastArticulations() left outside the slur beyond it, where it
     * would run into them or pass closer to them than articulationOutsideSlurDistance, with the labels stacked on them, and adds
     * them to the sky or bottom line. Behind Bars p. 122: accents at the beginning and end of a slur go outside it, so that the
     * slur can remain closer to the note heads; pp. 188-189: so does a pause. Each mark stays at least as far from the one under
     * it as Vexflow put it.
     * The marks move by their y_shift, which VexFlowMusicSheetCalculator.calculateMeasureXLayout() resets for every render.
     * A measure number is added to the sky line after the slurs (MusicSheetCalculator.calculateMeasureNumberSkyline()).
     */
    private placeArticulationsOutside(staffLine: StaffLine): void {
        const outward: number = this.placement === PlacementEnum.Above ? -1 : 1;
        for (const isStart of [true, false]) {
            const shift: number = this.getShiftOutside(isStart);
            if (shift <= 0) {
                continue;
            }
            let moved: number = 0; // the most a mark moved
            let under: {far: number, newFar: number}; // the far edge of the mark under the next one, before and after moving it
            for (const mark of this.articulationsOutside.filter((outside: ArticulationOutside) => outside.isStart === isStart)) {
                const near: number = under ? Math.max(mark.near + shift, under.newFar + mark.near - under.far) : mark.near + shift;
                let extent: ArticulationExtent = mark.measure();
                // Vexflow snaps it to a half stave space, never back, but up to half a space out: a smaller shift can leave it where it
                //   is, e.g. 0.15 for an accent just above the staff
                for (let i: number = 0; i < 8 && extent.near < near - 0.001; i++) {
                    const step: number = Math.max(near - extent.near, 0.1);
                    mark.articulation.setYShift((mark.articulation.y_shift ?? 0) + step * outward * unitInPixels);
                    extent = mark.measure();
                }
                moved = Math.max(moved, extent.near - mark.near);
                under = {far: mark.far, newFar: extent.far};
                this.addToSkyBottomLine(staffLine, extent.left, extent.right, extent.far);
            }
            for (const label of this.labelsOutside.filter((outside: LabelOutside) => outside.isStart === isStart)) {
                label.box.RelativePosition.y += moved * outward;
                if (label.isFingering) {
                    this.addToSkyBottomLine(staffLine, label.left, label.right, this.getOutwardExtent(label.box)[1]);
                }
            }
        }
    }

    /** How far the articulations left outside the slur at its start or end (see getYPastArticulations()), and the labels stacked
     *  on them, have to move out to keep articulationOutsideSlurDistance from the slur as drawn, over their width (0 if they do). */
    private getShiftOutside(isStart: boolean): number {
        const boxes: {left: number, right: number, near: number}[] =
            this.articulationsOutside.filter((mark: ArticulationOutside) => mark.isStart === isStart);
        for (const label of this.labelsOutside.filter((outside: LabelOutside) => outside.isStart === isStart)) {
            boxes.push({left: label.left, right: label.right, near: this.getOutwardExtent(label.box)[0]});
        }
        let shift: number = 0;
        if (boxes.length > 0) {
            for (const point of this.getOuterEdge()) {
                for (const box of boxes) {
                    if (point.x >= box.left && point.x <= box.right) {
                        shift = Math.max(shift, point.distance + GraphicalSlur.articulationOutsideSlurDistance - box.near);
                    }
                }
            }
        }
        return shift;
    }

    /** How much further out the slur's outer edge gets over the articulations left outside it at its start or end, but fermatas,
     *  than at its tip (0 if there are none): see retryPastArticulationsOutside(). */
    private getRiseOutside(isStart: boolean): number {
        const marks: ArticulationOutside[] = this.articulationsOutside.filter((mark: ArticulationOutside) =>
            mark.isStart === isStart && !GraphicalSlur.isFermata(mark));
        const edge: {x: number, distance: number}[] = this.getOuterEdge();
        const tip: {x: number, distance: number} = isStart ? edge[0] : edge[edge.length - 1];
        let rise: number = 0;
        for (const point of edge) {
            if (marks.some((mark: ArticulationOutside) => point.x >= mark.left && point.x <= mark.right)) {
                rise = Math.max(rise, point.distance - tip.distance);
            }
        }
        return rise;
    }

    /** Points along the outer edge of the slur as VexFlowMusicSheetDrawer.drawSlur() draws it, the curve with its ends 0.05 and its
     *  control points 0.3 further out: their x, relative to the staffline, and how far out they are (see getOutwardExtent()). */
    private getOuterEdge(): {x: number, distance: number}[] {
        const outward: number = this.placement === PlacementEnum.Above ? -1 : 1;
        const [p0, p1, p2, p3] = [this.bezierStartPt, this.bezierStartControlPt, this.bezierEndControlPt, this.bezierEndPt];
        const points: {x: number, distance: number}[] = [];
        for (let i: number = 0; i <= 200; i++) {
            const t: number = i / 200;
            const [b0, b1, b2, b3] = [(1 - t) * (1 - t) * (1 - t), 3 * (1 - t) * (1 - t) * t, 3 * (1 - t) * t * t, t * t * t];
            points.push({
                x: b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x,
                distance: (b0 * p0.y + b1 * p1.y + b2 * p2.y + b3 * p3.y) * outward + 0.05 * (b0 + b3) + 0.3 * (b1 + b2),
            });
        }
        return points;
    }

    /** Adds a box from left to right (relative to the staffline) whose far edge is far out (see getOutwardExtent()) to the sky or
     *  bottom line, like calculateCurve() the curve. */
    private addToSkyBottomLine(staffLine: StaffLine, left: number, right: number, far: number): void {
        const above: boolean = this.placement === PlacementEnum.Above;
        const line: number[] = above ? staffLine.SkyLine : staffLine.BottomLine;
        const samplingUnit: number = staffLine.SkyBottomLineCalculator.SamplingUnit;
        for (let i: number = Math.max(0, Math.floor(left * samplingUnit)); i < Math.min(line.length, Math.ceil(right * samplingUnit)); i++) {
            line[i] = above ? Math.min(line[i], -far) : Math.max(line[i], far);
        }
    }

    /** Vexflow's types of the articulations that go inside a slur also at its start and end note (see getYPastArticulations()):
     *  staccato, staccatissimo (wedge), tenuto. */
    private static readonly articulationsInsideSlur: string[] = ["a.", "av", "a-"];
    /** How far an articulation outside a slur at its start or end stays from it (see placeArticulationsOutside()). */
    private static readonly articulationOutsideSlurDistance: number = 0.3;
    /** How much further out than at its tip a slur may get over the articulations outside it at its start or end: if it leaves the
     *  note more steeply, they go inside it (see retryPastArticulationsOutside()). Over an accent, a slur leaving the note gently
     *  rises up to about 0.45. */
    private static readonly articulationOutsideSlurMaxRise: number = 0.6;

    /** Where a slur without end note ends (see Slur.HasUnattachedEnd), relative to the staffline: at the barline of its
     *  measure, before the end instructions like a repeat sign or a clef change at the measure end.
     *  If that's too close to the start note to look like a slur (e.g. before a repeat sign), it reaches a bit past the note,
     *  over the repeat dots, but not up to the barline.
     */
    private getUnattachedEndX(): number {
        const endMeasure: GraphicalMeasure = this.staffEntries[this.staffEntries.length - 1].parentMeasure;
        const measureEndX: number = endMeasure.PositionAndShape.RelativePosition.x + endMeasure.PositionAndShape.Size.width;
        const startStaffEntry: GraphicalStaffEntry = this.staffEntries[0];
        const minEndX: number = startStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x +
            startStaffEntry.PositionAndShape.RelativePosition.x + startStaffEntry.PositionAndShape.BorderRight + 0.8;
        return Math.max(measureEndX - (endMeasure.endInstructionsWidth ?? 0), Math.min(minEndX, measureEndX - 0.5));
    }

    /**
     * This method calculates the placement of the Curve.
     * @param skyBottomLineCalculator
     * @param staffLine
     */
    private calculatePlacement(skyBottomLineCalculator: SkyBottomLineCalculator, staffLine: StaffLine): void {
        // old version: when lyrics are given place above:
        // if ( !this.slur.StartNote.ParentVoiceEntry.LyricsEntries.isEmpty || (this.slur.EndNote
        //                                     && !this.slur.EndNote.ParentVoiceEntry.LyricsEntries.isEmpty) ) {
        //     this.placement = PlacementEnum.Above;
        //     return;
        // }

        if (this.pieceSide !== undefined) {
            this.placement = this.pieceSide;
            return;
        }
        if (this.rules.SlurPlacementFromXML && this.slur.PlacementXml !== PlacementEnum.NotYetDefined) {
            this.placement = this.slur.PlacementXml;
            return;
        }

        // if any StaffEntry belongs to a Measure with multiple Voices, than
        // if Slur's Start- or End-Note belongs to a LinkedVoice Below else Above
        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            const graphicalStaffEntry: GraphicalStaffEntry = this.staffEntries[idx];
            if (graphicalStaffEntry.parentMeasure.hasMultipleVoices()) {
                const crossVoiceSide: PlacementEnum = this.crossVoiceMixedStemsSide();
                if (crossVoiceSide !== undefined) {
                    this.placement = crossVoiceSide;
                    return;
                }
                if (this.slur.StartNote.ParentVoiceEntry.ParentVoice instanceof LinkedVoice ||
                    this.slur.EndNote?.ParentVoiceEntry.ParentVoice instanceof LinkedVoice) {
                    this.placement = PlacementEnum.Below;
                } else { this.placement = PlacementEnum.Above; }
                return;
            }
        }

        // when lyrics are given place above:
        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            const graphicalStaffEntry: GraphicalStaffEntry = this.staffEntries[idx];
            if (graphicalStaffEntry.LyricsEntries.length > 0) {
                this.placement = PlacementEnum.Above;
                return;
            }
        }
        const startStaffEntry: GraphicalStaffEntry = this.staffEntries[0];
        const endStaffEntry: GraphicalStaffEntry = this.staffEntries[this.staffEntries.length - 1];

        // single Voice, opposite to StemDirection
        // here should only be one voiceEntry, so we can take graphicalVoiceEntries[0]:
        const startStemDirection: StemDirectionType = startStaffEntry.graphicalVoiceEntries[0].parentVoiceEntry.StemDirection;
        const endStemDirection: StemDirectionType = endStaffEntry.graphicalVoiceEntries[0].parentVoiceEntry.StemDirection;
        if (startStemDirection  ===
            endStemDirection) {
            this.placement = (startStemDirection === StemDirectionType.Up) ? PlacementEnum.Below : PlacementEnum.Above;
            if (this.rules.SlurPlacementAtStems) {
                this.placement = (startStemDirection === StemDirectionType.Up) ? PlacementEnum.Above : PlacementEnum.Below;
            }
        } else {
            // Placement at the side with the minimum border
            let sX: number = startStaffEntry.PositionAndShape.BorderLeft + startStaffEntry.PositionAndShape.RelativePosition.x
                        + startStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x;
            let eX: number = endStaffEntry.PositionAndShape.BorderRight + endStaffEntry.PositionAndShape.RelativePosition.x
                        + endStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x;

            if (this.graceStart) {
                sX += endStaffEntry.PositionAndShape.RelativePosition.x;
            }
            if (this.graceEnd) {
                eX += endStaffEntry.staffEntryParent.PositionAndShape.RelativePosition.x;
            }

            // get SkyBottomLine borders
            const minAbove: number = skyBottomLineCalculator.getSkyLineMinInRange(sX, eX) * -1;
            const maxBelow: number = skyBottomLineCalculator.getBottomLineMaxInRange(sX, eX) - staffLine.StaffHeight;

            if (maxBelow > minAbove - GraphicalSlur.mixedStemsAboveMargin) {
                this.placement = PlacementEnum.Above;
            } else { this.placement = PlacementEnum.Below; }
        }
    }

    /** The angle (from the horizontal) a tangent past the vertical at an end of the curve is turned back to. */
    private static readonly maxEndTangentDegrees: number = 80;

    /**
     * Turns a control point whose tangent stands past the vertical (the control point behind its end) back to
     * maxEndTangentDegrees, at the same distance from its end. The control points come from angles to the line from start
     * to end: with the ends far apart in height that line is steep, and the end's tangent went past the vertical, the curve
     * hooking back like ")" (Mozart, K.191 III piano RH m248: the slur under the stems from the B-flat3/F4 chord to the
     * F4, two units higher). Steep tangents short of the vertical stay. Same as osmd-dart.
     */
    private keepTangentsInside(): void {
        const limit: number = GraphicalSlur.maxEndTangentDegrees * Math.PI / 180;
        const turn: (end: PointF2D, control: PointF2D, inward: number) => PointF2D = (end, control, inward) => {
            const dx: number = (control.x - end.x) * inward;
            const dy: number = control.y - end.y;
            const length: number = Math.sqrt(dx * dx + dy * dy);
            if (length === 0 || dx >= 0) {
                return control;
            }
            return new PointF2D(end.x + inward * length * Math.cos(limit), end.y + Math.sign(dy) * length * Math.sin(limit));
        };
        this.bezierStartControlPt = turn(this.bezierStartPt, this.bezierStartControlPt, 1);
        this.bezierEndControlPt = turn(this.bezierEndPt, this.bezierEndControlPt, -1);
    }

    /**
     * The side of a slur from a note of one voice to a note of another whose stems point different ways:
     * the stem side of its start note. By the voices (a second voice's slur below) it went to the other
     * side and ran from the start note's head to the end of the other note's stem (Mozart K.191 III m309
     * and m323, left hand: voice 3's A3 half note, its stem up once the crossed voices are re-stemmed, to
     * the G3 of voice 2's chord with a down stem; the print slurs it above). Not a slur between neighbouring
     * notes: it joins the noteheads between the voices (isHeadToHeadBetweenVoices(), Boccherini, Cello Concerto
     * No. 2, cello m504: E4 up to A3 down in bariolage). Undefined for any other slur. Same rule as osmd-dart.
     */
    private crossVoiceMixedStemsSide(): PlacementEnum {
        const startEntry: VoiceEntry = this.slur.StartNote?.ParentVoiceEntry;
        const endEntry: VoiceEntry = this.slur.EndNote?.ParentVoiceEntry;
        if (!startEntry || !endEntry || startEntry.ParentVoice === endEntry.ParentVoice || this.staffEntries.length <= 2 ||
            startEntry.IsGrace || endEntry.IsGrace) {
            return undefined;
        }
        const start: StemDirectionType = startEntry.StemDirection;
        const end: StemDirectionType = endEntry.StemDirection;
        if (start === StemDirectionType.Up && end === StemDirectionType.Down) {
            return PlacementEnum.Above;
        }
        if (start === StemDirectionType.Down && end === StemDirectionType.Up) {
            return PlacementEnum.Below;
        }
        return undefined;
    }

    /**
     * How much further (in units) the ink may reach above the staff than below it
     * before a slur between notes with stems in different directions goes below;
     * slurs over mixed stems go above by convention. The two sides are often within
     * a few hundredths of a unit (Davydov Op. 11 m257 in osmd-dart: 1.564 above,
     * 1.556 below, the slur hung below a long beam). Same rule as osmd-dart.
     */
    private static readonly mixedStemsAboveMargin: number = 0.25;

    /**
     * Calculates the curve again if it runs into a fingering of its start or end note, with its start or end past those or beside them
     * (see placePastEndFingerings()), e.g. one right above the last note. calculateTopPoints() and calculateBottomPoints() leave
     * the start and end staff entries out: the tangents to something right above the start or end would be vertical.
     * Only the part of those staff entries the curve passes over counts, from the start or end to the entry's edge
     * towards the other end: not e.g. the fingering left of the stem a slur above a note with its stem up starts at.
     * @param startEntryX The edge of the start note's staff entry towards the end, relative to the staffline.
     * @param endEntryX The edge of the end note's staff entry towards the start.
     * @returns Whether the curve was calculated again (and added to the sky or bottom line), so there is nothing left to do.
     */
    private retryPastEndFingerings(rules: EngravingRules, startNote: GraphicalNote, endNote: GraphicalNote,
                                   startEntryX: number, endEntryX: number): boolean {
        if (this.fingeringsRunInto) {
            return false; // this is a later calculation, past or beside them
        }
        const start: BoundingBox[] = this.getFingeringsRunInto(startNote, this.bezierStartPt.x, startEntryX);
        const end: BoundingBox[] = this.getFingeringsRunInto(endNote, endEntryX, this.bezierEndPt.x);
        if (start.length === 0 && end.length === 0) {
            return false;
        }
        this.fingeringsRunInto = {start, end, furthestOut: this.getFurthestOut()};
        try {
            this.calculateCurve(rules);
        } finally {
            this.fingeringsRunInto = undefined;
        }
        return true;
    }

    /**
     * Calculates the curve again with its start and end past the fingerings of their notes if it starts or ends beside them
     * (see placePastEndFingerings()), low, and then runs into what the sky or bottom line holds where the curve isn't kept clear of
     * it (see getDepthIntoEnds()): e.g. the sharp of its end note, left of the fingering it ends beside, or the flat of the next
     * note, which it ran through from beside the fingering of its start note, or, for a slur from the previous staffline, the key
     * signature. Past the fingerings, the curve stays further out, as before PR #1830 (isc's comment on PR #1830: Chopin, Ballade
     * No. 1, m. 83, m. 108 and m. 111, Nocturne op. 9 no. 2, m. 27). Unless it runs in about as deep from there: then it was something
     * else, e.g. a slur ending above the start note, and the curve goes beside them again.
     * @param beside Whether the curve starts or ends beside the fingerings.
     * @param startEntryX The x where the sky or bottom line points of calculateTopPoints() or calculateBottomPoints() start.
     * @param endEntryX The x where they end.
     * @returns Whether the curve was calculated again (and added to the sky or bottom line), so there is nothing left to do.
     */
    private retryPastBesideFingerings(rules: EngravingRules, staffLine: StaffLine, beside: boolean, startEntryX: number,
                                      endEntryX: number): boolean {
        const fingerings: FingeringsRunInto = this.fingeringsRunInto;
        const tryingPast: boolean = fingerings?.notBeside === undefined; // beside them, not tried past them yet
        if (!fingerings || fingerings.notBeside === false || tryingPast && !beside) {
            return false; // the first calculation, nothing beside them, or beside them after all
        }
        const depth: number = this.getDepthIntoEnds(staffLine, startEntryX, endEntryX);
        if (tryingPast ? depth <= 0 : depth <= fingerings.besideDepth - 0.1) {
            return false;
        }
        fingerings.besideDepth ??= depth;
        fingerings.notBeside = tryingPast;
        this.calculateCurve(rules);
        return true;
    }

    /**
     * How far the curve runs into what the sky or bottom line holds where it isn't kept clear of it (calculateTopPoints() and
     * calculateBottomPoints() leave it out), or passes closer than half SlurNoteHeadYOffset to it (0 if it doesn't): over the
     * start and end staff entries, between its start and startEntryX and between endEntryX and its end, and, for a slur from the
     * previous staffline, over the clef and the key signature it starts at (see calculateStartAndEnd()). Not over the fingerings
     * of those staff entries, nor the articulations left outside the slur, which move out of its way (see
     * placeArticulationsOutside()).
     * @param startEntryX The x where the sky or bottom line points of calculateTopPoints() or calculateBottomPoints() start.
     * @param endEntryX The x where they end.
     */
    private getDepthIntoEnds(staffLine: StaffLine, startEntryX: number, endEntryX: number): number {
        const above: boolean = this.placement === PlacementEnum.Above;
        const outward: number = above ? -1 : 1;
        const line: number[] = above ? staffLine.SkyLine : staffLine.BottomLine;
        const samplingUnit: number = staffLine.SkyBottomLineCalculator.SamplingUnit;
        // the edge of the staff on the slur's side, as a distance outward: nothing in the line beyond it there
        const staffEdge: number = above ? 0 : staffLine.StaffHeight;
        const margin: number = this.rules.SlurNoteHeadYOffset / 2;
        // the samples of the fingerings of the start and end staff entries, which the start or end can be beside, and of the
        //   articulations left outside the slur: they fill every sample they touch (see MusicSheetCalculator.calculateFingerings()),
        //   e.g. the one the start or end is in
        const skippedSamples: number[][] = [this.staffEntries[0], this.staffEntries[this.staffEntries.length - 1]]
            .flatMap((staffEntry: GraphicalStaffEntry) => staffEntry.FingeringEntries ?? [])
            .map(({PositionAndShape: box}: GraphicalLabel) => [box.RelativePosition.x + box.BorderLeft, box.RelativePosition.x + box.BorderRight])
            .concat(this.articulationsOutside.map((mark: ArticulationOutside) => [mark.left, mark.right]))
            .map(([left, right]: number[]) => [Math.floor(left * samplingUnit), Math.ceil(right * samplingUnit)]);
        let depth: number = 0;
        for (let i: number = 0; i <= 100; i++) {
            // (calculateCurvePointAtIndex(1) is not the end point, but (0, 0))
            const point: PointF2D = i < 100 ? this.calculateCurvePointAtIndex(i / 100) : this.bezierEndPt;
            const index: number = Math.floor(point.x * samplingUnit);
            if (point.x > startEntryX && point.x < endEntryX || index < 0 || index >= line.length ||
                skippedSamples.some(([first, end]: number[]) => index >= first && index < end)) {
                continue;
            }
            const value: number = line[index] * outward;
            if (value > staffEdge) {
                depth = Math.max(depth, value + margin - point.y * outward);
            }
        }
        return depth;
    }

    /** The fingerings of the note's staff entry that the curve passes closer than SlurNoteHeadYOffset to, or through, from fromX
     *  to toX (relative to the staffline). */
    private getFingeringsRunInto(note: GraphicalNote, fromX: number, toX: number): BoundingBox[] {
        const runInto: BoundingBox[] = [];
        for (const fingering of note?.parentVoiceEntry.parentStaffEntry.FingeringEntries ?? []) {
            const box: BoundingBox = fingering.PositionAndShape; // relative to the staffline, see calculateFingerings()
            if (this.isFingeringOutside(box)) {
                continue;
            }
            const [near, far] = this.getOutwardExtent(box);
            if (this.runsInto(box.RelativePosition.x + box.BorderLeft, box.RelativePosition.x + box.BorderRight, near, far, fromX, toX,
                              this.rules.SlurNoteHeadYOffset)) {
                runInto.push(box);
            }
        }
        return runInto;
    }

    /** Whether the fingering is stacked on articulations left outside the slur, which it moves along with, beyond the slur (see
     *  placeArticulationsOutside()): the slur doesn't go past it. */
    private isFingeringOutside(box: BoundingBox): boolean {
        return this.labelsOutside.some((outside: LabelOutside) => outside.box === box);
    }

    /** Whether the curve passes closer than margin to, or through, a box from left to right whose outward extent (see
     *  getOutwardExtent()) is near to far, from fromX to toX (relative to the staffline). */
    private runsInto(left: number, right: number, near: number, far: number, fromX: number, toX: number, margin: number): boolean {
        const outward: number = this.placement === PlacementEnum.Above ? -1 : 1;
        for (let i: number = 0; i <= 100; i++) {
            // (calculateCurvePointAtIndex(1) is not the end point, but (0, 0))
            const point: PointF2D = i < 100 ? this.calculateCurvePointAtIndex(i / 100) : this.bezierEndPt;
            if (point.x >= Math.max(fromX, left) && point.x <= Math.min(toX, right) &&
                point.y * outward > near - margin && point.y * outward < far + margin) {
                return true;
            }
        }
        return false;
    }

    /** How far out the curve gets (see getOutwardExtent()), at its furthest point. */
    private getFurthestOut(): number {
        const outward: number = this.placement === PlacementEnum.Above ? -1 : 1;
        let furthest: number = Number.NEGATIVE_INFINITY;
        for (let i: number = 0; i <= 100; i++) {
            // (calculateCurvePointAtIndex(1) is not the end point, but (0, 0))
            const point: PointF2D = i < 100 ? this.calculateCurvePointAtIndex(i / 100) : this.bezierEndPt;
            furthest = Math.max(furthest, point.y * outward);
        }
        return furthest;
    }

    /** The near and far edges of the box from the staff on the slur's side, as distances outward (up for a slur above). */
    private getOutwardExtent(box: BoundingBox): number[] {
        const top: number = box.RelativePosition.y + box.BorderTop;
        const bottom: number = box.RelativePosition.y + box.BorderBottom;
        return this.placement === PlacementEnum.Above ? [-bottom, -top] : [top, bottom];
    }

    /**
     * Where the start or end goes if the curve ran into fingerings of its note (see retryPastEndFingerings()): past them
     * (clearEndFingerings()), or beside them, on the note head's side (on the stem's side, it starts at the stem's tip, where a beam
     * can be): left of their column at the end, right of it at the start. Beside them for a slur from a note to the next one that
     * would then climb by more than half its width, which keeps such a short slur close to its notes, below the fingerings, e.g. from
     * one chord of 16ths to the next. And for a slur whose start or end would be further out past them than the curve got without
     * them, unless it passes over fingerings of the notes between anyway: the slur would only fall from there, lopsided, e.g. from
     * the fingering on the staccato of the first of four chords with staccatos (isc's comment on PR #1828). Unless beside them, the
     * curve ran into what is at its ends (see retryPastBesideFingerings()).
     * @param x The start's or end's x.
     * @param y The start's or end's y.
     * @param entryX The edge of the note's staff entry towards the other end, relative to the staffline.
     * @param otherX The other end's x.
     * @param runInto The fingerings of the note's staff entry the curve ran into, see retryPastEndFingerings().
     * @param toNextNote Whether the slur goes from a note to the next one, both in this staffline.
     */
    private placePastEndFingerings(note: GraphicalNote, isStart: boolean, x: number, y: number, entryX: number, otherX: number,
                                   runInto: BoundingBox[], toNextNote: boolean): PointF2D {
        if (!runInto?.length) {
            return new PointF2D(x, y);
        }
        const pastY: number = isStart ? this.clearEndFingerings(note, x, entryX, y, runInto) :
            this.clearEndFingerings(note, entryX, x, y, runInto);
        const stem: StemDirectionType = note.parentVoiceEntry.parentVoiceEntry.StemDirection;
        const headSide: boolean = this.placement === PlacementEnum.Above ? stem !== StemDirectionType.Up : stem !== StemDirectionType.Down;
        const outward: number = this.placement === PlacementEnum.Above ? -1 : 1;
        // the edge of the staff on the slur's side, as a distance outward
        const staffEdge: number = this.placement === PlacementEnum.Above ? 0 : note.parentVoiceEntry.parentStaffEntry.parentMeasure.ParentStaffLine.StaffHeight;
        const overMiddleFingerings: boolean = this.staffEntries.slice(1, -1).some((staffEntry: GraphicalStaffEntry) =>
            (staffEntry.FingeringEntries ?? []).some((fingering: GraphicalLabel) => this.getOutwardExtent(fingering.PositionAndShape)[1] > staffEdge));
        const lopsided: boolean = pastY * outward > this.fingeringsRunInto.furthestOut && !overMiddleFingerings;
        if (headSide && !this.fingeringsRunInto.notBeside && (toNextNote && Math.abs(pastY - y) > Math.abs(otherX - x) / 2 || lopsided)) {
            const gap: number = 0.3; // from the fingerings, a little less than the distance from the notes, as there is space in a text box
            const besideX: number = isStart ? Math.max(...runInto.map(box => box.RelativePosition.x + box.BorderRight)) + gap :
                Math.min(...runInto.map(box => box.RelativePosition.x + box.BorderLeft)) - gap;
            // not far from the note, and still a slur
            if (Math.abs(besideX - x) <= 1.2 && (isStart ? otherX - besideX : besideX - otherX) >= 1.5) {
                return new PointF2D(besideX, y);
            }
        }
        return new PointF2D(x, pastY);
    }

    /**
     * Moves the start or the end of the slur away from the staff (up for a slur above, down for one below) past the given
     * fingerings of its note, which the curve ran into, and any stacked on them, keeping the distance from them it keeps from
     * its note (SlurNoteHeadYOffset).
     * @param note The slur's start or end note, if it is in this staffline.
     * @param fromX The left end of the part of the note's staff entry the curve passes over, relative to the staffline.
     * @param toX Its right end.
     * @param y The start's or end's y.
     * @param runInto The fingerings of the note's staff entry the curve ran into, see retryPastEndFingerings().
     * @returns The y of the start or end past the fingerings.
     */
    private clearEndFingerings(note: GraphicalNote, fromX: number, toX: number, y: number, runInto: BoundingBox[]): number {
        if (!runInto?.length) {
            return y;
        }
        const outward: number = this.placement === PlacementEnum.Above ? -1 : 1;
        const margin: number = this.rules.SlurNoteHeadYOffset;
        // the fingerings over that part, nearest to the note first
        const boxes: BoundingBox[] = (note.parentVoiceEntry.parentStaffEntry.FingeringEntries ?? [])
            .map(fingering => fingering.PositionAndShape)
            .filter(box => box.RelativePosition.x + box.BorderRight > fromX && box.RelativePosition.x + box.BorderLeft < toX &&
                !this.isFingeringOutside(box))
            .sort((a, b) => this.getOutwardExtent(a)[0] - this.getOutwardExtent(b)[0]);
        let distance: number = y * outward; // how far out the start or end is
        for (const box of boxes) {
            const [near, far] = this.getOutwardExtent(box);
            if (runInto.includes(box) || near < distance + margin && far > distance - margin) {
                distance = Math.max(distance, far + margin);
            }
        }
        return distance * outward;
    }

    /** The points of the sky or bottom line for clearObstacles(): each sample at both its edges, since what it holds can be
     *  anywhere along it, e.g. the edge of a fingering under a slur rising steeply from its start. */
    private getObstacles(points: PointF2D[], skyBottomLineCalculator: SkyBottomLineCalculator): PointF2D[] {
        const halfSample: number = 0.5 / skyBottomLineCalculator.SamplingUnit;
        const obstacles: PointF2D[] = [];
        for (const point of points) {
            obstacles.push(new PointF2D(point.x - halfSample, point.y), new PointF2D(point.x + halfSample, point.y));
        }
        return obstacles;
    }

    /**
     * Raises the control points where the curve passes closer than SlurNoteHeadYOffset to an obstacle, e.g. the fingering of
     * the note next to the start. The tangents only keep the lines from the start and end through the control points above the
     * obstacles, and the curve runs below those lines, the more so near the start and end.
     * Coordinates as in calculateControlPoints(): the start at the origin, the end on the x-axis, the obstacles above it.
     * Raising a control point doesn't move the curve sideways: the curve's height at an x grows linearly with the control
     * points' heights. But it raises the whole curve, by much for an obstacle next to the start or end, where the control point
     * has only a small share in the curve. So if that would make the curve more than 0.5 higher, the tangents get steeper first
     * (steepenTangents()), which brings the curve up near its ends without raising its top.
     * Only the obstacles under the tangents count: the curve can reach them, running between them and its tangents.
     * The sky or bottom line doesn't say what is under its points: if the curve, raised, runs further into a fingering it passed
     * under or beside, it stays as it was (e.g. under a fingering on the stem of another voice, in the middle of a short slur).
     * The fingerings of the start and end notes are retryPastEndFingerings()'s.
     * @param endX The end point's x.
     * @param obstacles The sky- or bottom line points between the start and end staff entries.
     * @param fingerings The corners of the fingerings of the notes between the start and end, see getFingeringCorners().
     */
    private clearObstacles(startControlPoint: PointF2D, endControlPoint: PointF2D, endX: number, obstacles: PointF2D[],
                           fingerings: PointF2D[][]): void {
        const [startControlX, endControlX, startControlY, endControlY] = [startControlPoint.x, endControlPoint.x, startControlPoint.y,
                                                                          endControlPoint.y];
        const depths: number[] = fingerings.map(corners => this.getDepthIn(startControlPoint, endControlPoint, endX, corners));
        // the tangents' slopes: calculateAngles() puts them above the obstacles, except where it limits them to SlurTangentMaxAngle
        const startSlope: number = startControlPoint.y / startControlPoint.x;
        const endSlope: number = endControlPoint.y / (endX - endControlPoint.x);
        // out of the curve's reach, e.g. stems hanging over the slur from a beam above
        const reachable: PointF2D[] = obstacles.filter(obstacle => obstacle.x > 0 && obstacle.x < endX &&
            obstacle.y <= obstacle.x * startSlope && obstacle.y <= (endX - obstacle.x) * endSlope);
        let misses: {t: number, height: number, obstacle: PointF2D}[] = this.getMisses(startControlPoint, endControlPoint, endX, reachable);
        let raised: {startY: number, endY: number} = this.getRaisedControlPoints(startControlPoint, endControlPoint, endX, misses);
        const raise: number = this.getCurveTop(raised.startY, raised.endY).height -
            this.getCurveTop(startControlPoint.y, endControlPoint.y).height;
        if (raise > 0.5) {
            this.steepenTangents(startControlPoint, endControlPoint, endX, misses);
            misses = this.getMisses(startControlPoint, endControlPoint, endX, reachable);
            raised = this.getRaisedControlPoints(startControlPoint, endControlPoint, endX, misses);
        }
        startControlPoint.y = raised.startY;
        endControlPoint.y = raised.endY;
        // (give or take the sampling of getDepthIn())
        if (fingerings.some((corners, i) => this.getDepthIn(startControlPoint, endControlPoint, endX, corners) > depths[i] + 0.05)) {
            [startControlPoint.x, endControlPoint.x, startControlPoint.y, endControlPoint.y] = [startControlX, endControlX, startControlY,
                                                                                                endControlY];
        }
    }

    /** The corners of the fingerings of the notes between the start and end, relative to the staffline (see calculateFingerings()). */
    private getFingeringCorners(): PointF2D[][] {
        const fingerings: PointF2D[][] = [];
        for (const staffEntry of this.staffEntries.slice(1, -1)) {
            for (const fingering of staffEntry.FingeringEntries ?? []) {
                const box: BoundingBox = fingering.PositionAndShape;
                const [left, right] = [box.RelativePosition.x + box.BorderLeft, box.RelativePosition.x + box.BorderRight];
                const [top, bottom] = [box.RelativePosition.y + box.BorderTop, box.RelativePosition.y + box.BorderBottom];
                fingerings.push([new PointF2D(left, top), new PointF2D(right, top), new PointF2D(left, bottom), new PointF2D(right, bottom)]);
            }
        }
        return fingerings;
    }

    /** How far the curve runs into the box with these corners, from its nearest edge (0 if it doesn't; coordinates as in clearObstacles()). */
    private getDepthIn(startControlPoint: PointF2D, endControlPoint: PointF2D, endX: number, corners: PointF2D[]): number {
        const xs: number[] = corners.map(corner => corner.x);
        const ys: number[] = corners.map(corner => corner.y);
        const [left, right, low, high] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
        let depth: number = 0;
        for (let i: number = 1; i < 100; i++) {
            const t: number = i / 100;
            const x: number = 3 * (1 - t) * (1 - t) * t * startControlPoint.x + 3 * (1 - t) * t * t * endControlPoint.x + t * t * t * endX;
            const y: number = 3 * (1 - t) * (1 - t) * t * startControlPoint.y + 3 * (1 - t) * t * t * endControlPoint.y;
            if (x > left && x < right) {
                depth = Math.max(depth, Math.min(y - low, high - y));
            }
        }
        return depth;
    }

    /** Where the curve passes closer than SlurNoteHeadYOffset to the obstacles, and by how much (coordinates as in clearObstacles()). */
    private getMisses(startControlPoint: PointF2D, endControlPoint: PointF2D, endX: number,
                      obstacles: PointF2D[]): {t: number, height: number, obstacle: PointF2D}[] {
        const misses: {t: number, height: number, obstacle: PointF2D}[] = [];
        for (const obstacle of obstacles) {
            // the curve's x grows with t, since 0 <= startControlPoint.x <= endControlPoint.x <= endX: bisect
            let tMin: number = 0;
            let tMax: number = 1;
            for (let i: number = 0; i < 30; i++) {
                const tMid: number = (tMin + tMax) / 2;
                const x: number = 3 * (1 - tMid) * (1 - tMid) * tMid * startControlPoint.x + 3 * (1 - tMid) * tMid * tMid * endControlPoint.x
                    + tMid * tMid * tMid * endX;
                if (x < obstacle.x) {
                    tMin = tMid;
                } else {
                    tMax = tMid;
                }
            }
            const t: number = (tMin + tMax) / 2;
            const curveY: number = 3 * (1 - t) * (1 - t) * t * startControlPoint.y + 3 * (1 - t) * t * t * endControlPoint.y;
            const miss: number = obstacle.y + this.rules.SlurNoteHeadYOffset - curveY;
            if (miss > 0) {
                misses.push({t, height: miss, obstacle});
            }
        }
        return misses;
    }

    /**
     * The heights of the control points at which the curve clears the misses, as low as possible: a miss in the first half of
     * the curve raises the start control point, one in the second half the end one, by as much as the miss that needs the most,
     * after what the start control point already gave. Not past the steepest tangent allowed (calculateAngles()): what is right
     * next to an end is out of the curve's reach. Coordinates as in clearObstacles().
     */
    private getRaisedControlPoints(startControlPoint: PointF2D, endControlPoint: PointF2D, endX: number,
                                   misses: {t: number, height: number}[]): {startY: number, endY: number} {
        let startRaise: number = 0;
        for (const miss of misses) {
            if (miss.t <= 0.5) {
                startRaise = Math.max(startRaise, miss.height / (3 * (1 - miss.t) * (1 - miss.t) * miss.t));
            }
        }
        let endRaise: number = 0;
        for (const miss of misses) {
            if (miss.t > 0.5) {
                const remaining: number = miss.height - 3 * (1 - miss.t) * (1 - miss.t) * miss.t * startRaise;
                endRaise = Math.max(endRaise, remaining / (3 * (1 - miss.t) * miss.t * miss.t));
            }
        }
        const maxSlope: number = Math.tan(this.rules.SlurTangentMaxAngle * GraphicalSlur.degreesToRadiansFactor);
        return {
            startY: Math.max(startControlPoint.y, Math.min(startControlPoint.y + startRaise, startControlPoint.x * maxSlope)),
            endY: Math.max(endControlPoint.y, Math.min(endControlPoint.y + endRaise, (endX - endControlPoint.x) * maxSlope)),
        };
    }

    /**
     * Moves the start control point towards the start and the end one towards the end, as far as the curve needs to clear the
     * misses before and after its top, but to no steeper tangents than SlurTangentMaxAngle - 10, leaving room to raise them.
     * The curve's height at t only depends on the control points' heights, so the curve then reaches the height it needs sooner
     * after the start (or later before the end), without its top getting higher. Coordinates as in clearObstacles().
     */
    private steepenTangents(startControlPoint: PointF2D, endControlPoint: PointF2D, endX: number,
                            misses: {t: number, height: number, obstacle: PointF2D}[]): void {
        const b1: (t: number) => number = t => 3 * (1 - t) * (1 - t) * t; // the control points' weights in the curve
        const b2: (t: number) => number = t => 3 * (1 - t) * t * t;
        const heightAt: (t: number) => number = t => b1(t) * startControlPoint.y + b2(t) * endControlPoint.y;
        const top: {t: number, height: number} = this.getCurveTop(startControlPoint.y, endControlPoint.y);
        let startControlX: number = startControlPoint.x;
        let endControlX: number = endControlPoint.x;
        for (const miss of misses) {
            const height: number = miss.obstacle.y + this.rules.SlurNoteHeadYOffset;
            if (height >= top.height) {
                continue; // only raising the curve clears it
            }
            // where the curve reaches that height on the obstacle's side of the top: the curve rises from t = from to t = to
            let from: number = miss.t <= top.t ? 0 : 1;
            let to: number = top.t;
            for (let i: number = 0; i < 30; i++) {
                const mid: number = (from + to) / 2;
                if (heightAt(mid) < height) {
                    from = mid;
                } else {
                    to = mid;
                }
            }
            const t: number = to;
            // there, the curve's x must not be past the obstacle's (before the top) or before it (after the top)
            if (miss.t <= top.t) {
                startControlX = Math.min(startControlX, (miss.obstacle.x - b2(t) * endControlPoint.x - t * t * t * endX) / b1(t));
            } else {
                endControlX = Math.max(endControlX, (miss.obstacle.x - b1(t) * startControlPoint.x - t * t * t * endX) / b2(t));
            }
        }
        const steepestSlope: number = Math.tan((this.rules.SlurTangentMaxAngle - 10) * GraphicalSlur.degreesToRadiansFactor);
        startControlPoint.x = Math.min(startControlPoint.x, Math.max(startControlX, startControlPoint.y / steepestSlope, 0));
        endControlPoint.x = Math.max(endControlPoint.x, Math.min(endControlX, endX - endControlPoint.y / steepestSlope, endX));
    }

    /** The highest point of the curve (its t and its height), with the control points at the heights startY and endY
     *  (coordinates as in clearObstacles()). */
    private getCurveTop(startY: number, endY: number): {t: number, height: number} {
        const top: {t: number, height: number} = {t: 0.5, height: 0};
        for (let i: number = 1; i < 100; i++) {
            const t: number = i / 100;
            const height: number = 3 * (1 - t) * (1 - t) * t * startY + 3 * (1 - t) * t * t * endY;
            if (height > top.height) {
                top.t = t;
                top.height = height;
            }
        }
        return top;
    }

    /**
     * This method calculates the Points between Start- and EndPoint (case above).
     * @param start
     * @param end
     * @param staffLine
     * @param skyBottomLineCalculator
     */
    private calculateTopPoints(start: PointF2D, end: PointF2D, staffLine: StaffLine, skyBottomLineCalculator: SkyBottomLineCalculator): PointF2D[] {
        const points: PointF2D[] = [];
        let startIndex: number = skyBottomLineCalculator.getRightIndexForPointX(start.x, staffLine.SkyLine.length);
        let endIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(end.x, staffLine.SkyLine.length);

        if (startIndex < 0) {
            startIndex = 0;
        }
        if (endIndex >= staffLine.SkyLine.length) {
            endIndex = staffLine.SkyLine.length - 1;
        }

        for (let i: number = startIndex; i < endIndex; i++) {
            const skylineValue: number = staffLine.SkyLine[i];
            // ignore default value (= 0) which is upper border of staffline
            if (skylineValue !== 0) {
                const point: PointF2D = new PointF2D((0.5 + i) / skyBottomLineCalculator.SamplingUnit, skylineValue);
                points.push(point);
            }
        }

        return points;
    }

    /**
     * This method calculates the Points between Start- and EndPoint (case below).
     * @param start
     * @param end
     * @param staffLine
     * @param skyBottomLineCalculator
     */
    private calculateBottomPoints(start: PointF2D, end: PointF2D, staffLine: StaffLine, skyBottomLineCalculator: SkyBottomLineCalculator): PointF2D[] {
        const points: PointF2D[] = [];

        // get BottomLine indices
        let startIndex: number = skyBottomLineCalculator.getRightIndexForPointX(start.x, staffLine.BottomLine.length);
        let endIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(end.x, staffLine.BottomLine.length);
        if (startIndex < 0) {
            startIndex = 0;
        }
        if (endIndex >= staffLine.BottomLine.length) {
            endIndex = staffLine.BottomLine.length - 1;
        }

        for (let i: number = startIndex; i < endIndex; i++) {
            const bottomLineValue: number = staffLine.BottomLine[i];

            // ignore default value (= 4) which is lower border of staffline
            if (bottomLineValue !== 0) {
                const point: PointF2D = new PointF2D((0.5 + i) / skyBottomLineCalculator.SamplingUnit, bottomLineValue);
                points.push(point);
            }
        }

        return points;
    }

    /**
     * This method calculates the maximum slope between StartPoint and BetweenPoints.
     * @param points
     * @param start
     * @param end
     */
    private calculateMaxLeftSlope(points: PointF2D[], start: PointF2D, end: PointF2D): number {
        let slope: number = -Number.MAX_VALUE;
        const x: number = start.x;
        const y: number = start.y;

        for (let i: number = 0; i < points.length; i++) {
            if (Math.abs(points[i].y - Number.MAX_VALUE) < 0.0001 || Math.abs(points[i].y - (-Number.MAX_VALUE)) < 0.0001) {
                continue;
            }
            const pointSlope: number = (points[i].y - y) / (points[i].x - x);
            if (!Number.isNaN(pointSlope)) { // NaN if a point coincides with the start point (0/0)
                slope = Math.max(slope, pointSlope);
            }
        }

        // in case all Points don't have a meaningful value or the slope between Start- and EndPoint is just bigger
        const startEndSlope: number = Math.abs(end.y - y) / (end.x - x);
        if (!Number.isNaN(startEndSlope)) { // NaN if start and end point coincide (0/0)
            slope = Math.max(slope, startEndSlope);
        }
        //limit to 80 degrees
        slope = Math.min(slope, 5.6713);

        return slope;
    }

    /**
     * This method calculates the maximum slope between EndPoint and BetweenPoints.
     * @param points
     * @param start
     * @param end
     */
    private calculateMaxRightSlope(points: PointF2D[], start: PointF2D, end: PointF2D): number {
        let slope: number = Number.MAX_VALUE;
        const x: number = end.x;
        const y: number = end.y;

        for (let i: number = 0; i < points.length; i++) {
            if (Math.abs(points[i].y - Number.MAX_VALUE) < 0.0001 || Math.abs(points[i].y - (-Number.MAX_VALUE)) < 0.0001) {
                continue;
            }
            const pointSlope: number = (y - points[i].y) / (x - points[i].x);
            if (!Number.isNaN(pointSlope)) { // NaN if a point coincides with the end point (0/0)
                slope = Math.min(slope, pointSlope);
            }
        }

        // in case no Point has a meaningful value or the slope between Start- and EndPoint is just smaller
        const startEndSlope: number = (y - start.y) / (x - start.x);
        if (!Number.isNaN(startEndSlope)) { // NaN if start and end point coincide (0/0)
            slope = Math.min(slope, startEndSlope);
        }
        //limit to 80 degrees
        slope = Math.max(slope, -5.6713);

        return slope;
    }

    /**
     * This method returns the maximum (meaningful) points.Y.
     * @param points
     */
    private getPointListMaxY(points: PointF2D[]): number {
        let max: number = -Number.MAX_VALUE;

        for (let idx: number = 0, len: number = points.length; idx < len; ++idx) {
            const point: PointF2D = points[idx];
            if (Math.abs(point.y - (-Number.MAX_VALUE)) < 0.0001 || Math.abs(point.y - Number.MAX_VALUE) < 0.0001) {
                continue;
            }
            max = Math.max(max, point.y);
        }

        return max;
    }

    /**
     * This method calculates the translated and rotated PointsList (case above).
     * @param points
     * @param startX
     * @param startY
     * @param rotationMatrix
     */
    private calculateTranslatedAndRotatedPointListAbove(points: PointF2D[], startX: number, startY: number, rotationMatrix: Matrix2D): PointF2D[] {
        const transformedPoints: PointF2D[] = [];
        for (let i: number = 0; i < points.length; i++) {
            if (Math.abs(points[i].y - Number.MAX_VALUE) < 0.0001 || Math.abs(points[i].y - (-Number.MAX_VALUE)) < 0.0001) {
                continue;
            }

            let point: PointF2D = new PointF2D(points[i].x - startX, -(points[i].y - startY));
            point = rotationMatrix.vectorMultiplication(point);
            transformedPoints.push(point);
        }

        return transformedPoints;
    }

    /**
     * This method calculates the translated and rotated PointsList (case below).
     * @param points
     * @param startX
     * @param startY
     * @param rotationMatrix
     */
    private calculateTranslatedAndRotatedPointListBelow(points: PointF2D[], startX: number, startY: number, rotationMatrix: Matrix2D): PointF2D[] {
        const transformedPoints: PointF2D[] = [];
        for (let i: number = 0; i < points.length; i++) {
            if (Math.abs(points[i].y - Number.MAX_VALUE) < 0.0001 || Math.abs(points[i].y - (-Number.MAX_VALUE)) < 0.0001) {
                continue;
            }
            let point: PointF2D = new PointF2D(points[i].x - startX, points[i].y - startY);
            point = rotationMatrix.vectorMultiplication(point);
            transformedPoints.push(point);
        }

        return transformedPoints;
    }

    /**
     * This method calculates the HeightWidthRatio between the MaxYpoint (from the points between StartPoint and EndPoint)
     * and the X-distance from StartPoint to EndPoint.
     * @param endX
     * @param points
     */
    private calculateHeightWidthRatio(endX: number, points: PointF2D[]): number {
        if (points.length === 0) {
            return 0;
        }

        // in case of negative points
        const max: number = Math.max(0, this.getPointListMaxY(points));

        return max / endX;
    }

    /**
     * This method calculates the 2 ControlPoints of the SlurCurve.
     * @param endX
     * @param startAngle
     * @param endAngle
     * @param points
     */
    private calculateControlPoints(endX: number, startAngle: number, endAngle: number,
                                   points: PointF2D[], heightWidthRatio: number,
                                   startY: number, endY: number
    ): { startControlPoint: PointF2D, endControlPoint: PointF2D } {
        let heightFactor: number = this.rules.SlurHeightFactor;
        let widthFlattenFactor: number = 1;
        const cutoffAngle: number = this.rules.SlurHeightFlattenLongSlursCutoffAngle;
        const cutoffWidth: number = this.rules.SlurHeightFlattenLongSlursCutoffWidth;
        // console.log("width: " + endX);
        if (startAngle > cutoffAngle && endX > cutoffWidth) { // steep and wide slurs
            // console.log("steep angle: " + startAngle);
            widthFlattenFactor += endX / 70 * this.rules.SlurHeightFlattenLongSlursFactorByWidth; // double flattening for width = 70, factorByWidth = 1
            widthFlattenFactor *= 1 + (startAngle / 30 * this.rules.SlurHeightFlattenLongSlursFactorByAngle); // flatten more for higher angles.
            // TODO use sin or cos instead of startAngle directly
            heightFactor /= widthFlattenFactor; // flatten long slurs more
        }
        // TODO also offer a widthFlattenFactor for smaller slurs?

        // debug:
        // const measureNumber: number = this.staffEntries[0].parentMeasure.MeasureNumber; // debug
        // if (measureNumber === 10) {
        //     console.log("endX: " + endX);
        //     console.log("widthFlattenFactor: " + widthFlattenFactor);
        //     console.log("heightFactor: " + heightFactor);
        //     console.log("startAngle: " + startAngle);
        //     console.log("heightWidthRatio: " + heightWidthRatio);
        // }

        // calculate HeightWidthRatio between the MaxYpoint (from the points between StartPoint and EndPoint)
        // and the X-distance from StartPoint to EndPoint
        // use this HeightWidthRatio to get a "normalized" Factor (based on tested parameters)
        // this Factor denotes the Length of the TangentLine of the Curve (a proportion of the X-distance from StartPoint to EndPoint)
        // finally from this Length and the calculated Angles we get the coordinates of the Control Points
        const factorStart: number = Math.min(0.5, Math.max(0.1, 1.7 * startAngle / 80 * heightFactor * Math.pow(Math.max(heightWidthRatio, 0.05), 0.4)));
        const factorEnd: number = Math.min(0.5, Math.max(0.1, 1.7 * (-endAngle) / 80 * heightFactor * Math.pow(Math.max(heightWidthRatio, 0.05), 0.4)));

        const startControlPoint: PointF2D = new PointF2D();
        startControlPoint.x = endX * factorStart * Math.cos(startAngle * GraphicalSlur.degreesToRadiansFactor);
        startControlPoint.y = endX * factorStart * Math.sin(startAngle * GraphicalSlur.degreesToRadiansFactor);

        const endControlPoint: PointF2D = new PointF2D();
        endControlPoint.x = endX - (endX * factorEnd * Math.cos(endAngle * GraphicalSlur.degreesToRadiansFactor));
        endControlPoint.y = -(endX * factorEnd * Math.sin(endAngle * GraphicalSlur.degreesToRadiansFactor));
        // Flatten long/steep slurs so they don't arc far higher than the notes/objects they actually span
        // (issue #1466). The cubic bezier's apex (its highest point above the start-end line) is determined by the
        // control point heights; cap it to a small margin above the highest spanned object, keeping the start/end
        // angles (so the slur still leaves the notes at the same steep angle, but flattens quickly after).
        if (this.rules.SlurFlattenToObstacle) {
            const requiredHeight: number = Math.max(0, this.getPointListMaxY(points)); // highest object above the start-end line
            // graceful minimum arc so slurs over flat passages aren't flattened into near-straight lines.
            // Grows with sqrt(width) (not linearly) so that WIDE slurs stay proportionally flat instead of
            // ballooning: a linear floor let e.g. a system-spanning slur over flat notes arc ~8 units high.
            const minArc: number = Math.min(this.rules.SlurFlattenMaxMinArcHeight, this.rules.SlurFlattenMinArcWidthFactor * Math.sqrt(endX));
            const targetApex: number = Math.max(requiredHeight + this.rules.SlurFlattenToObstacleMargin, minArc);
            let apex: number = 0;
            // the bezier's y at parameter t only depends on the control points' y (start/end points are on the x-axis here)
            for (let t: number = 0.1; t <= 0.9; t += 0.1) {
                const mt: number = 1 - t;
                apex = Math.max(apex, 3 * mt * mt * t * startControlPoint.y + 3 * mt * t * t * endControlPoint.y);
            }
            if (apex > targetApex && apex > 0.0001) {
                const scale: number = targetApex / apex; // apex scales linearly with the control point heights
                startControlPoint.x *= scale;
                startControlPoint.y *= scale;
                endControlPoint.x = endX - (endX - endControlPoint.x) * scale;
                endControlPoint.y *= scale;
            }
        }
        //Soften the slur in a "brute-force" way
        let controlPointYDiff: number = startControlPoint.y - endControlPoint.y;
        while (this.rules.SlurMaximumYControlPointDistance &&
               Math.abs(controlPointYDiff) > this.rules.SlurMaximumYControlPointDistance) {
            if (controlPointYDiff < 0) {
                startControlPoint.y += 1;
                endControlPoint.y -= 1;
            } else {
                startControlPoint.y -= 1;
                endControlPoint.y += 1;
            }
            controlPointYDiff = startControlPoint.y - endControlPoint.y;
        }
        return {startControlPoint: startControlPoint, endControlPoint: endControlPoint};
    }

    /**
     * This method calculates the angles for the Curve's Tangent Lines.
     * @param leftAngle
     * @param rightAngle
     * @param startLineSlope
     * @param endLineSlope
     * @param maxAngle
     */
    private calculateAngles(minAngle: number, startLineSlope: number, endLineSlope: number, maxAngle: number):
    {startAngle: number, endAngle: number} {
        // calculate Angles from the calculated Slopes, adding also a given angle
        const angle: number = 20;

        let calculatedStartAngle: number = Math.atan(startLineSlope) / GraphicalSlur.degreesToRadiansFactor;
        if (startLineSlope > 0) {
            calculatedStartAngle += angle;
        } else {
            calculatedStartAngle -= angle;
        }

        let calculatedEndAngle: number = Math.atan(endLineSlope) / GraphicalSlur.degreesToRadiansFactor;
        if (endLineSlope < 0) {
            calculatedEndAngle -= angle;
        } else {
            calculatedEndAngle += angle;
        }

        // +/- 80 is the max/min allowed Angle
        const leftAngle: number = Math.min(Math.max(minAngle, calculatedStartAngle), maxAngle);
        const rightAngle: number = Math.max(Math.min(-minAngle, calculatedEndAngle), -maxAngle);
        return {"startAngle": leftAngle, "endAngle": rightAngle};
    }

    private static degreesToRadiansFactor: number = Math.PI / 180;
}
