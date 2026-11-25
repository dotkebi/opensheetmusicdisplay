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
    /** Hooks of a <bracket> line at its Start and End (the line's ends in the whole score, not at a system break), as a vertical
     *  offset in units (positive: down); undefined: none. */
    public StartHook: number;
    public EndHook: number;
    /** Length of a bracket line's hook, in units. */
    public static readonly HookLength: number = 1.0;

    /** The dash segments from Start to End (one segment for a solid bracket line, short ones for a dotted one) and the hooks.
     *  The line ends with a whole dash, the gaps absorb the rest. */
    public calculateStrokes(rules: EngravingRules): [PointF2D, PointF2D][] {
        const strokes: [PointF2D, PointF2D][] = this.lineStrokes(rules);
        if (strokes.length === 0) {
            return strokes;
        }
        if (this.StartHook !== undefined) {
            strokes.unshift([new PointF2D(this.Start.x, this.Start.y + this.StartHook), this.Start]);
        }
        if (this.EndHook !== undefined) {
            strokes.push([this.End, new PointF2D(this.End.x, this.End.y + this.EndHook)]);
        }
        return strokes;
    }

    private lineStrokes(rules: EngravingRules): [PointF2D, PointF2D][] {
        const length: number = this.End.x - this.Start.x;
        const lineType: string = this.Expression.DashesLineType;
        const dashLength: number = lineType === "dotted" ? this.Width : rules.ExpressionDashesDashLength;
        const dashGap: number = lineType === "dotted" ? 0.4 : rules.ExpressionDashesDashGap;
        if (!(length > 0)) {
            return [];
        }
        if (length <= dashLength || lineType === "solid") {
            return [[this.Start, this.End]];
        }
        const dashCount: number = Math.max(1, Math.floor((length + dashGap) / (dashLength + dashGap)));
        const gap: number = dashCount > 1 ? (length - dashCount * dashLength) / (dashCount - 1) : 0;
        const strokes: [PointF2D, PointF2D][] = [];
        for (let i: number = 0; i < dashCount; i++) {
            const from: number = this.Start.x + i * (dashLength + gap);
            strokes.push([new PointF2D(from, this.Start.y), new PointF2D(from + dashLength, this.Start.y)]);
        }
        return strokes;
    }
}
