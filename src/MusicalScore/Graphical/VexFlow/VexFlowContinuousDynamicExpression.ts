import { GraphicalContinuousDynamicExpression } from "../GraphicalContinuousDynamicExpression";
import { ContinuousDynamicExpression } from "../../VoiceData/Expressions/ContinuousExpressions/ContinuousDynamicExpression";
import { StaffLine } from "../StaffLine";
import { GraphicalLabel } from "../GraphicalLabel";
import { Label } from "../../Label";
import { TextAlignmentEnum } from "../../../Common/Enums/TextAlignment";
import { FontStyles } from "../../../Common/Enums/FontStyles";
import { SourceMeasure } from "../../VoiceData/SourceMeasure";
import { BoundingBox } from "../BoundingBox";
import { EngravingRules } from "../EngravingRules";

/**
 * This class extends the GraphicalContinuousDynamicExpression and creates all necessary methods for drawing
 */
export class VexFlowContinuousDynamicExpression extends GraphicalContinuousDynamicExpression {
    constructor(continuousDynamic: ContinuousDynamicExpression, staffLine: StaffLine,
                measure: SourceMeasure, textHeight?: number) {
        super(continuousDynamic, staffLine, measure);
        if (this.IsVerbal) {
            this.label = VexFlowContinuousDynamicExpression.createVerbalLabel(continuousDynamic, this.rules, textHeight, this.PositionAndShape);
            this.PositionAndShape.calculateBoundingBox();

            if (continuousDynamic.ColorXML && this.rules.ExpressionsUseXMLColor) {
                this.label.ColorXML = continuousDynamic.ColorXML;
            }
        }
    }

    /** The label of a verbal continuous dynamic ("cresc.", "dim."), starting at its note. Also used to reserve its width
     *  before the expression itself exists (see VexFlowMusicSheetCalculator.fitExpressionsToFormattedEntries()). */
    public static createVerbalLabel(continuousDynamic: ContinuousDynamicExpression, rules: EngravingRules,
                                    textHeight?: number, parent: BoundingBox = undefined): GraphicalLabel {
        const sourceLabel: Label = new Label(continuousDynamic.Label);
        const label: GraphicalLabel = new GraphicalLabel(sourceLabel,
                                                         textHeight ? textHeight : rules.ContinuousDynamicTextHeight,
                                                         TextAlignmentEnum.LeftCenter,
                                                         rules,
                                                         parent);

        label.Label.fontStyle = FontStyles.Italic;
        label.setLabelPositionAndShapeBorders();
        return label;
    }
}
