import { GraphicalInstantaneousDynamicExpression } from "../GraphicalInstantaneousDynamicExpression";
import { InstantaneousDynamicExpression, DynamicEnum } from "../../VoiceData/Expressions/InstantaneousDynamicExpression";
import { GraphicalLabel } from "../GraphicalLabel";
import { Label } from "../../Label";
import { TextAlignmentEnum } from "../../../Common/Enums/TextAlignment";
import { FontStyles } from "../../../Common/Enums/FontStyles";
import { StaffLine } from "../StaffLine";
import { GraphicalMeasure } from "../GraphicalMeasure";
import { BoundingBox } from "../BoundingBox";
import { EngravingRules } from "../EngravingRules";

export class VexFlowInstantaneousDynamicExpression extends GraphicalInstantaneousDynamicExpression {
    constructor(instantaneousDynamicExpression: InstantaneousDynamicExpression, staffLine: StaffLine, measure: GraphicalMeasure) {
        super(instantaneousDynamicExpression, staffLine, measure);

        this.label = VexFlowInstantaneousDynamicExpression.createLabel(instantaneousDynamicExpression, this.rules, this.PositionAndShape);
        this.PositionAndShape.calculateBoundingBox();
    }

    /** The dynamic's label, centered on its note. Also used to reserve its width before the expression itself exists
     *  (see VexFlowMusicSheetCalculator.fitExpressionsToFormattedEntries()). */
    public static createLabel(instantaneousDynamicExpression: InstantaneousDynamicExpression, rules: EngravingRules,
                              parent: BoundingBox = undefined): GraphicalLabel {
        const sourceLabel: Label = new Label(DynamicEnum[instantaneousDynamicExpression.DynEnum]);
        const label: GraphicalLabel = new GraphicalLabel(sourceLabel,
                                                         rules.ContinuousDynamicTextHeight,
                                                         TextAlignmentEnum.CenterCenter,
                                                         rules,
                                                         parent);

        label.Label.fontStyle = FontStyles.BoldItalic;
        label.setLabelPositionAndShapeBorders();
        return label;
    }

    get InstantaneousDynamic(): InstantaneousDynamicExpression {
        return this.mInstantaneousDynamicExpression;
    }

    get Expression(): string {
        return DynamicEnum[this.mInstantaneousDynamicExpression.DynEnum];
    }
}
