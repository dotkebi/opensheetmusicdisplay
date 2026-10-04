import { GraphicalInstantaneousDynamicExpression } from "../GraphicalInstantaneousDynamicExpression";
import { InstantaneousDynamicExpression } from "../../VoiceData/Expressions/InstantaneousDynamicExpression";
import { GraphicalLabel } from "../GraphicalLabel";
import { StaffLine } from "../StaffLine";
import { GraphicalMeasure } from "../GraphicalMeasure";
import { BoundingBox } from "../BoundingBox";
import { EngravingRules } from "../EngravingRules";
export declare class VexFlowInstantaneousDynamicExpression extends GraphicalInstantaneousDynamicExpression {
    constructor(instantaneousDynamicExpression: InstantaneousDynamicExpression, staffLine: StaffLine, measure: GraphicalMeasure);
    /** The dynamic's label, centered on its note. Also used to reserve its width before the expression itself exists
     *  (see VexFlowMusicSheetCalculator.fitExpressionsToFormattedEntries()). */
    static createLabel(instantaneousDynamicExpression: InstantaneousDynamicExpression, rules: EngravingRules, parent?: BoundingBox): GraphicalLabel;
    get InstantaneousDynamic(): InstantaneousDynamicExpression;
    get Expression(): string;
}
