import { PointF2D } from "../../Common/DataObjects/PointF2D";
export declare class GraphicalCurve {
    private static readonly bezierCurveStepSize;
    private static readonly tPow3;
    private static readonly oneMinusTPow3;
    private static readonly bezierFactorOne;
    private static readonly bezierFactorTwo;
    /**
     * Calculates a curve-independent factor for each step t = i / bezierCurveStepSize of a Bezier curve.
     * @param factorAt the factor at t
     * @returns the factors of all steps
     */
    private static calculateBezierFactors;
    bezierStartPt: PointF2D;
    bezierStartControlPt: PointF2D;
    bezierEndControlPt: PointF2D;
    bezierEndPt: PointF2D;
    /**
     *
     * @param relativePosition
     */
    calculateCurvePointAtIndex(relativePosition: number): PointF2D;
}
