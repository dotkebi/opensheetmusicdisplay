import { PointF2D } from "../../Common/DataObjects/PointF2D";
import { AbstractExpression } from "../VoiceData/Expressions/AbstractExpression";
import { EngravingRules } from "./EngravingRules";
/**
 * One drawn part of the dashed line that follows a text expression (MusicXML <dashes>, e.g. "rit. - - - -").
 * A line interrupted by a system break has one of these per staffline it crosses.
 */
export declare class GraphicalExpressionDashes {
    constructor(expression: AbstractExpression, start: PointF2D, end: PointF2D, width: number);
    Expression: AbstractExpression;
    /** In units, relative to the parent staffline. */
    Start: PointF2D;
    /** In units, relative to the parent staffline. */
    End: PointF2D;
    Width: number;
    Color: string;
    SVGElement: Node;
    /** The dash segments from Start to End. The line ends with a whole dash, the gaps absorb the rest. */
    calculateStrokes(rules: EngravingRules): [PointF2D, PointF2D][];
}
