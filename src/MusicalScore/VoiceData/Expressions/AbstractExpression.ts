import { Fraction } from "../../../Common/DataObjects/Fraction";
import { SourceMeasure } from "../SourceMeasure";

export class AbstractExpression {
    protected placement: PlacementEnum;
    public parentMeasure: SourceMeasure; // could be undefined
    public ColorXML: string;
    /** Measure in which a dashed line (MusicXML <dashes>) after the expression's text ends, if it has one. */
    public DashesEndMeasure: SourceMeasure;
    /** Timestamp within DashesEndMeasure where the dashed line ends. */
    public DashesEndTimestamp: Fraction;
    /** A <bracket> line after the text instead of <dashes> (e.g. "8" with a dashed bracket in a piano part, Nielsen, Clarinet
     *  Concerto Op.57 m265-284): its line-type "solid" or "dotted" (undefined: dashed) and the hooks of its line-end at the
     *  start and at the stop, "up" or "down" (undefined: none). */
    public DashesLineType: string;
    public DashesStartHook: string;
    public DashesEndHook: string;
    /** The xml:lang of the expression's words, see Label.language. */
    public language: string;
    /** The vertical position the file gives the words or dynamic, in tenths of a staff space, up from the top line of the
     *  staff: MusicXML default-y plus relative-y. Undefined without a default-y (see ExpressionReader.readYPositionXml()). */
    public YPositionXml: number;

    constructor(placement: PlacementEnum) {
        this.placement = placement;
    }

    protected static isStringInStringList(stringList: Array<string>, inputString: string): boolean {
        for (let idx: number = 0, len: number = stringList.length; idx < len; ++idx) {
            const s: string = stringList[idx];
            if (inputString.toLowerCase() === s.toLowerCase().trim()) {
                return true;
            }
        }
        return false;
    }

    /** Placement of the expression */
    public get Placement(): PlacementEnum { return this.placement; }

    public static PlacementEnumFromString(placementString: string): PlacementEnum {
        switch (placementString.toLowerCase()) {
            case "above":
                return PlacementEnum.Above;
            case "below":
                return PlacementEnum.Below;
            case "aboveorbelow":
            case "abovebelow":
                return PlacementEnum.AboveOrBelow;
            case "left":
                return PlacementEnum.Left;
            case "right":
                return PlacementEnum.Right;
            case "auto":
            default:
                return PlacementEnum.NotYetDefined;
        }
    }
}

export enum PlacementEnum {
    Above = 0,
    Below = 1,
    Left = 2,
    Right = 3,
    NotYetDefined = 4,
    AboveOrBelow = 5, // for piano scores, above for right hand, below for left hand
}
