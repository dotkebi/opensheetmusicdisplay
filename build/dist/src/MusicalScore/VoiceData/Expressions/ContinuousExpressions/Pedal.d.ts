import { MultiExpression } from "../MultiExpression";
export declare class Pedal {
    constructor(line?: boolean, sign?: boolean);
    private line;
    private sign;
    StaffNumber: number;
    ParentStartMultiExpression: MultiExpression;
    ParentEndMultiExpression: MultiExpression;
    ChangeEnd: boolean;
    ChangeBegin: boolean;
    /** Whether the stop has sign="no": the pedal is released without a release sign (*), e.g. retaken by the next Ped.
     *  alone */
    ReleaseHidden: boolean;
    /** Whether the pedal ends at the stave end (and not before the endNote) */
    EndsStave: boolean;
    /** Whether the pedal begins at the stave beginning (and not before the startNote - e.g. for whole measure rest) */
    BeginsStave: boolean;
    get IsLine(): boolean;
    get IsSign(): boolean;
}
