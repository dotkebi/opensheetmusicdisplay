import { PlacementEnum, AbstractExpression } from "./AbstractExpression";
import { MultiTempoExpression } from "./MultiTempoExpression";
import { FontStyles } from "../../../Common/Enums/FontStyles";
export declare abstract class AbstractTempoExpression extends AbstractExpression {
    constructor(label: string, placement: PlacementEnum, staffNumber: number, parentMultiTempoExpression: MultiTempoExpression);
    protected label: string;
    protected staffNumber: number;
    protected parentMultiTempoExpression: MultiTempoExpression;
    /** Font style given by the MusicXML <words> (font-style, font-weight). Undefined: the tempo default is used. */
    fontStyle: FontStyles;
    /** Index (over all staves of the sheet) of the staff the expression was read for, if its direction gives a
     *  placement (placement attribute or default-y) relative to that staff. Undefined otherwise. */
    placementStaffIndex: number;
    get Label(): string;
    set Label(value: string);
    get Placement(): PlacementEnum;
    set Placement(value: PlacementEnum);
    get StaffNumber(): number;
    set StaffNumber(value: number);
    get ParentMultiTempoExpression(): MultiTempoExpression;
    protected static isStringInStringList(wordsToFind: string[], inputString: string): boolean;
    private static stringContainsSeparatedWord;
}
