import { PlacementEnum, AbstractExpression } from "../AbstractExpression";
import { MultiExpression } from "../MultiExpression";
import { Fraction } from "../../../../Common/DataObjects/Fraction";
import { SourceMeasure } from "../../SourceMeasure";
export declare class ContinuousDynamicExpression extends AbstractExpression {
    constructor(dynamicType: ContDynamicEnum, placement: PlacementEnum, staffNumber: number, measure: SourceMeasure, numberXml: number, label?: string);
    private static listContinuousDynamicIncreasing;
    private static listContinuousDynamicDecreasing;
    private dynamicType;
    NumberXml: number;
    private startMultiExpression;
    private endMultiExpression;
    /** The <offset> of the wedge's stop (in whole notes): the drawn end is moved by it from the note after EndMultiExpression.
     *  Kept on the wedge, not on the end MultiExpression, which a stop shares with the start of the next wedge at the same time
     *  and with other stops ending there (Schumann, Myrthen 18 m31: the second crescendo's stop offset lengthened the first). */
    EndOffsetFraction: Fraction;
    /** Where the wedge's stop was written (before its <offset>), in the measure of EndMultiExpression; undefined if the wedge
     *  was closed otherwise. EndMultiExpression is the last note the wedge ends under; the drawn end goes towards this time.
     *  Without it the drawing took the end note's start plus the longest note of its staff there, which is the stop only while
     *  one voice sounds: over a dotted half rest in a second voice a crescendo stopping on the third beat ran to the end of the
     *  measure, under the diminuendo starting there (Bononcini, Deh più a me non v'ascondete, piano m4). */
    StopTimestamp: Fraction;
    private startVolume;
    private endVolume;
    private staffNumber;
    private label;
    IsStartOfSoftAccent: boolean;
    YPosXml: number;
    get DynamicType(): ContDynamicEnum;
    set DynamicType(value: ContDynamicEnum);
    get StartMultiExpression(): MultiExpression;
    set StartMultiExpression(value: MultiExpression);
    get EndMultiExpression(): MultiExpression;
    set EndMultiExpression(value: MultiExpression);
    get Placement(): PlacementEnum;
    set Placement(value: PlacementEnum);
    get StartVolume(): number;
    set StartVolume(value: number);
    get EndVolume(): number;
    set EndVolume(value: number);
    get StaffNumber(): number;
    set StaffNumber(value: number);
    get Label(): string;
    set Label(value: string);
    static isInputStringContinuousDynamic(inputString: string): boolean;
    getInterpolatedDynamic(currentAbsoluteTimestamp: Fraction): number;
    isWedge(): boolean;
    private setType;
}
export declare enum ContDynamicEnum {
    crescendo = 0,
    /** Diminuendo/Decrescendo. These terms are apparently sometimes synonyms, and a falling wedge is given in MusicXML as type="diminuendo". */
    diminuendo = 1
}
