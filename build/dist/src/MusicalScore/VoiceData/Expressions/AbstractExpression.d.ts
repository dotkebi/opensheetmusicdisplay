import { Fraction } from "../../../Common/DataObjects/Fraction";
import { SourceMeasure } from "../SourceMeasure";
export declare class AbstractExpression {
    protected placement: PlacementEnum;
    parentMeasure: SourceMeasure;
    ColorXML: string;
    /** Measure in which a dashed line (MusicXML <dashes>) after the expression's text ends, if it has one. */
    DashesEndMeasure: SourceMeasure;
    /** Timestamp within DashesEndMeasure where the dashed line ends. */
    DashesEndTimestamp: Fraction;
    /** The xml:lang of the expression's words, see Label.language. */
    language: string;
    constructor(placement: PlacementEnum);
    protected static isStringInStringList(stringList: Array<string>, inputString: string): boolean;
    /** Placement of the expression */
    get Placement(): PlacementEnum;
    static PlacementEnumFromString(placementString: string): PlacementEnum;
}
export declare enum PlacementEnum {
    Above = 0,
    Below = 1,
    Left = 2,
    Right = 3,
    NotYetDefined = 4,
    AboveOrBelow = 5
}
