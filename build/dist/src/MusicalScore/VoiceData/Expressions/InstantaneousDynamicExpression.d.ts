import { PlacementEnum, AbstractExpression } from "./AbstractExpression";
import { MultiExpression } from "./MultiExpression";
import { DynamicExpressionSymbolEnum } from "./DynamicExpressionSymbolEnum";
import { SourceMeasure } from "../SourceMeasure";
import { Dictionary } from "typescript-collections";
import { Fraction } from "../../../Common/DataObjects/Fraction";
export declare class InstantaneousDynamicExpression extends AbstractExpression {
    static staticConstructor(): void;
    constructor(dynamicExpression: string, soundDynamics: number, placement: PlacementEnum, staffNumber: number, measure: SourceMeasure, dynamicEnum?: DynamicEnum);
    static dynamicToRelativeVolumeDict: Dictionary<DynamicEnum, number>;
    private multiExpression;
    private dynamicExpression;
    private dynamicEnum;
    private soundDynamic;
    private staffNumber;
    private length;
    InMeasureTimestamp: Fraction;
    get ParentMultiExpression(): MultiExpression;
    set ParentMultiExpression(value: MultiExpression);
    /** The marking as written, e.g. "sfmp" for <sf/><mp/>, "ffz" or "cresc." from <other-dynamics>. This is what gets rendered. */
    get DynamicExpression(): string;
    set DynamicExpression(value: string);
    get DynEnum(): DynamicEnum;
    set DynEnum(value: DynamicEnum);
    get SoundDynamic(): number;
    set SoundDynamic(value: number);
    get Placement(): PlacementEnum;
    set Placement(value: PlacementEnum);
    get StaffNumber(): number;
    set StaffNumber(value: number);
    get Length(): number;
    get MidiVolume(): number;
    get Volume(): number;
    static isInputStringInstantaneousDynamic(inputString: string): boolean;
    /**
     * The playback dynamic (DynEnum) for the text of a marking, or undefined if the text doesn't denote one:
     * - the whole text, if it is a known dynamic: "sfz", "MF", "pf"
     * - for a plain sequence of dynamics letters, the longest known dynamic it starts with, i.e. the first symbol of a
     *   combined marking: "sfmp" -> sf, "ffz" -> ff (also how Finale, Sibelius and MuseScore write these in <other-dynamics>)
     * - for a text, its leading dynamic word: "f con fuoco" -> f, "p dolce" -> p. A dynamic letter that merely starts a
     *   longer word doesn't count ("fine", "forte", "pesante"), nor does a text not starting with a dynamic ("cresc.", "più f").
     */
    static dynamicEnumFromText(text: string): DynamicEnum;
    /** All known dynamics (the DynamicEnum names except "other"), longest first. See dynamicEnumFromText(). */
    private static knownDynamicNames;
    private static listInstantaneousDynamics;
    getDynamicExpressionSymbol(c: string): DynamicExpressionSymbolEnum;
    private calculateLength;
}
export declare enum DynamicEnum {
    pppppp = 0,
    ppppp = 1,
    pppp = 2,
    ppp = 3,
    pp = 4,
    p = 5,
    mp = 6,
    mf = 7,
    f = 8,
    ff = 9,
    fff = 10,
    ffff = 11,
    fffff = 12,
    ffffff = 13,
    sf = 14,
    sff = 15,
    sfp = 16,
    sfpp = 17,
    fp = 18,
    rf = 19,
    rfz = 20,
    sfz = 21,
    sffz = 22,
    fz = 23,
    other = 24,
    /** poco forte */
    pf = 25,
    /** sforzando-piano */
    sfzp = 26,
    /** niente */
    n = 27
}
