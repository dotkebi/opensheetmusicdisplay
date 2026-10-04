/** A measure-repeat declaration state. Invalid declarations end any inherited repeat run. */
export declare enum MeasureRepeatType {
    Start = 0,
    Stop = 1,
    Invalid = 2
}
/** A MusicXML measure-repeat declaration for one staff. */
export declare class MeasureRepeatInstruction {
    constructor(type: MeasureRepeatType, measures?: number, slashes?: number);
    /** Declaration state. */
    type: MeasureRepeatType;
    /** Pattern length; zero for stop and invalid declarations. */
    measures: number;
    /** Slash count from MusicXML, defaulting to one. */
    slashes: number;
}
