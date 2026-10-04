import { PointF2D } from "../../Common/DataObjects/PointF2D";
import { AbstractExpression } from "../VoiceData/Expressions/AbstractExpression";
import { EngravingRules } from "./EngravingRules";

/**
 * One drawn part of the dashed line that follows a text expression (MusicXML <dashes>, e.g. "rit. - - - -").
 * A line interrupted by a system break has one of these per staffline it crosses.
 */
export class GraphicalExpressionDashes {
    constructor(expression: AbstractExpression, start: PointF2D, end: PointF2D, width: number) {
        this.Expression = expression;
        this.Start = start;
        this.End = end;
        this.Width = width;
    }

    public Expression: AbstractExpression;
    /** In units, relative to the parent staffline. */
    public Start: PointF2D;
    /** In units, relative to the parent staffline. */
    public End: PointF2D;
    public Width: number;
    public Color: string;
    public SVGElement: Node;

    /** The dash segments from Start to End. The line ends with a whole dash, the gaps absorb the rest. */
    public calculateStrokes(rules: EngravingRules): [PointF2D, PointF2D][] {
        const length: number = this.End.x - this.Start.x;
        const dashLength: number = rules.ExpressionDashesDashLength;
        if (!(length > 0)) {
            return [];
        }
        if (length <= dashLength) {
            return [[this.Start, this.End]];
        }
        const dashCount: number = Math.max(1, Math.floor((length + rules.ExpressionDashesDashGap) / (dashLength + rules.ExpressionDashesDashGap)));
        const gap: number = dashCount > 1 ? (length - dashCount * dashLength) / (dashCount - 1) : 0;
        const strokes: [PointF2D, PointF2D][] = [];
        for (let i: number = 0; i < dashCount; i++) {
            const from: number = this.Start.x + i * (dashLength + gap);
            strokes.push([new PointF2D(from, this.Start.y), new PointF2D(from + dashLength, this.Start.y)]);
        }
        return strokes;
    }
}
