import {PlacementEnum, AbstractExpression} from "./AbstractExpression";
import {MultiTempoExpression} from "./MultiTempoExpression";
import {FontStyles} from "../../../Common/Enums/FontStyles";

export abstract class AbstractTempoExpression extends AbstractExpression {

    constructor(label: string, placement: PlacementEnum, staffNumber: number, parentMultiTempoExpression: MultiTempoExpression) {
        super(placement);
        this.label = label;
        this.staffNumber = staffNumber;
        this.parentMultiTempoExpression = parentMultiTempoExpression;
    }

    protected label: string;
    protected staffNumber: number;
    protected parentMultiTempoExpression: MultiTempoExpression;
    /** Font style given by the MusicXML <words> (font-style, font-weight). Undefined: the tempo default is used. */
    public fontStyle: FontStyles;
    /** Index (over all staves of the sheet) of the staff the expression was read for, if its direction gives a
     *  placement (placement attribute or default-y) relative to that staff. Undefined otherwise. */
    public placementStaffIndex: number;

    public get Label(): string {
        return this.label;
    }
    public set Label(value: string) {
        this.label = value;
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
    public get ParentMultiTempoExpression(): MultiTempoExpression {
        return this.parentMultiTempoExpression;
    }

    protected static isStringInStringList(wordsToFind: string[], inputString: string): boolean {
        for (const wordToFind of wordsToFind) {
            if (AbstractTempoExpression.stringContainsSeparatedWord(inputString.toLowerCase().trim(), wordToFind.toLowerCase().trim())) {
                return true;
            }
        }
        return false;
    }
    private static stringContainsSeparatedWord(str: string, word: string): boolean {
        return (str === word || str.indexOf(" " + word) !== -1 || str.indexOf(word + " ") !== -1);
    }

}
