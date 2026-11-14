import { PlacementEnum, AbstractExpression } from "./AbstractExpression";
import { TextAlignmentEnum } from "../../../Common/Enums/TextAlignment";
import { FontStyles } from "../../../Common/Enums/FontStyles";

export class UnknownExpression extends AbstractExpression {
    constructor(label: string, placement: PlacementEnum, textAlignment: TextAlignmentEnum, staffNumber: number) {
        super(placement);
        this.label = label;
        this.staffNumber = staffNumber;
        if (textAlignment === undefined) { // don't replace undefined check
            textAlignment = TextAlignmentEnum.LeftBottom;
        }
        this.textAlignment = textAlignment;
    }
    private label: string;
    private textAlignment: TextAlignmentEnum;
    private staffNumber: number;
    public fontStyle: FontStyles;
    public defaultYXml: number;
    /** The font-size of its <words> in points, if given. Drawn relative to the score's usual words size
     *  (MusicSheetCalculator.wordsFontScale()). */
    public fontSizeXml: number;
    /** The default-x (tenths) and justify of its <words>, if given: words right-justified left of the measure at the start
     *  of a system are a heading in the system's left margin (MusicSystem.marginTitles). */
    public defaultXXml: number;
    public justifyXml: string;
    /** The default-y (tenths) of its <words>, read whatever PlaceWordsInsideStafflineFromXml (defaultYXml is only read
     *  with it): for the labels of words of another height (MusicSheetCalculator.wordsGroupsByFont()) and the height of a
     *  margin title. osmd-dart reads defaultYXml always. */
    public wordsDefaultY: number;

    /** Whether the words are written left of their measure, right-justified (Vieuxtemps Op.31 "INTRODUZIONE." default-x
     *  -220, "SCHERZO." -90). */
    public get isMarginTitle(): boolean {
        return (this.defaultXXml ?? 0) < 0 && this.justifyXml === "right";
    }
    /** The `enclosure` of the `<words>` ("rectangle": drawn in a box, Dittersdorf, Double Bass Concerto "CADENZA"). */
    public enclosure: string;

    public get Label(): string {
        return this.label;
    }
    public get Placement(): PlacementEnum {
        return this.placement;
    }
    public set Placement(value: PlacementEnum) {
        this.placement = value;
    }
    public get StaffNumber(): number {
        return this.staffNumber;
    }
    public set StaffNumber(value: number) {
        this.staffNumber = value;
    }
    public get TextAlignment(): TextAlignmentEnum {
        return this.textAlignment;
    }
}
