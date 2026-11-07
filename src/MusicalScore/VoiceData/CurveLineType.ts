import { IXmlElement } from "../../Common/FileIO/Xml";

/**
 * The line of a slur or a tie (MusicXML line-type): "dashed" or "dotted", or undefined for the solid line, also for
 * "wavy", which a curve can't have (Vivaldi, Concerto Op. 44 No. 11 (Eulenburg): the editor's dotted slurs and ties).
 * Drawn as one stroked curve instead of the filled one (DashedCurve). As in osmd_dart (CurveLineType).
 */
export class CurveLineType {
    public static readonly Dashed: string = "dashed";
    public static readonly Dotted: string = "dotted";

    /** The line-type of the <slur> or <tied> element, if dashed or dotted. */
    public static read(node: IXmlElement): string {
        const value: string = node?.attribute("line-type")?.value;
        return value === CurveLineType.Dashed || value === CurveLineType.Dotted ? value : undefined;
    }
}
