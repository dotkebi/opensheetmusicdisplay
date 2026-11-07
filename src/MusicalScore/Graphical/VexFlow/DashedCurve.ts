import { PointF2D } from "../../../Common/DataObjects/PointF2D";
import { CurveLineType } from "../../VoiceData/CurveLineType";

/**
 * A dashed or dotted slur or tie (CurveLineType) is one stroked cubic Bézier curve between the filled curve's inner and
 * outer edge, instead of the filled curve: dots of 0.17 staff space, 0.42 apart (round caps), or dashes of 0.55 with gaps
 * of 0.35 (0.12 thick). Lengths in staff spaces times `pxPerUnit` (the drawing's pixels per staff space). As in osmd_dart
 * (DashedCurve).
 */
export class DashedCurve {
    /** Stroke width, dash pattern and cap of the line type, in pixels. */
    public static style(lineType: string, pxPerUnit: number): { width: number, dash: number[], cap: string } {
        if (lineType === CurveLineType.Dotted) {
            return { width: 0.17 * pxPerUnit, dash: [0.001 * pxPerUnit, 0.42 * pxPerUnit], cap: "round" };
        }
        return { width: 0.12 * pxPerUnit, dash: [0.55 * pxPerUnit, 0.35 * pxPerUnit], cap: "butt" };
    }

    /** Strokes the curve p0 p1 p2 p3 (pixels) in the line type on the VexFlow context (SVG or canvas). */
    public static stroke(ctx: any, points: PointF2D[], lineType: string, pxPerUnit: number): void {
        const style: { width: number, dash: number[], cap: string } = DashedCurve.style(lineType, pxPerUnit);
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.bezierCurveTo(points[1].x, points[1].y, points[2].x, points[2].y, points[3].x, points[3].y);
        const lineWidth: number = ctx.lineWidth;
        ctx.setLineWidth(style.width);
        if (typeof ctx.create === "function") { // VexFlow SVGContext: the dash as the path's own attributes
            ctx.stroke({ "stroke-dasharray": style.dash.join(" "), "stroke-linecap": style.cap });
        } else {
            ctx.setLineDash(style.dash);
            ctx.setLineCap(style.cap);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.setLineCap("butt");
        }
        ctx.setLineWidth(lineWidth ?? 1);
    }

    /** The curve between the inner and outer edge (points 0-3 and 4-7 of a filled curve, as renderCurve() takes them). */
    public static middle(points: PointF2D[]): PointF2D[] {
        return [0, 1, 2, 3].map(i => new PointF2D((points[i].x + points[i + 4].x) / 2, (points[i].y + points[i + 4].y) / 2));
    }
}
