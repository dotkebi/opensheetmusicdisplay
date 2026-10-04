import { GraphicalContinuousDynamicExpression } from "../GraphicalContinuousDynamicExpression";
import { ContinuousDynamicExpression } from "../../VoiceData/Expressions/ContinuousExpressions/ContinuousDynamicExpression";
import { StaffLine } from "../StaffLine";
import { GraphicalLabel } from "../GraphicalLabel";
import { SourceMeasure } from "../../VoiceData/SourceMeasure";
import { BoundingBox } from "../BoundingBox";
import { EngravingRules } from "../EngravingRules";
/**
 * This class extends the GraphicalContinuousDynamicExpression and creates all necessary methods for drawing
 */
export declare class VexFlowContinuousDynamicExpression extends GraphicalContinuousDynamicExpression {
    constructor(continuousDynamic: ContinuousDynamicExpression, staffLine: StaffLine, measure: SourceMeasure, textHeight?: number);
    /** The label of a verbal continuous dynamic ("cresc.", "dim."), starting at its note. Also used to reserve its width
     *  before the expression itself exists (see VexFlowMusicSheetCalculator.fitExpressionsToFormattedEntries()). */
    static createVerbalLabel(continuousDynamic: ContinuousDynamicExpression, rules: EngravingRules, textHeight?: number, parent?: BoundingBox): GraphicalLabel;
}
