import { MusicSheet } from "../../MusicSheet";
import { Fraction } from "../../../Common/DataObjects/Fraction";
import { Instrument } from "../../Instrument";
import { MultiExpression } from "../../VoiceData/Expressions/MultiExpression";
import { IXmlElement } from "../../../Common/FileIO/Xml";
import { SourceMeasure } from "../../VoiceData/SourceMeasure";
export declare class ExpressionReader {
    private musicSheet;
    private placement;
    /** Whether the current direction gives its placement (placement attribute or default-y). */
    private placementFromXml;
    private soundTempo;
    private soundDynamic;
    private divisions;
    private offsetDivisions;
    private staffNumber;
    private globalStaffIndex;
    private directionTimestamp;
    private currentMultiTempoExpression;
    private openContinuousDynamicExpressions;
    private openContinuousTempoExpression;
    private activeInstantaneousDynamic;
    private openOctaveShifts;
    private pendingOctaveShiftStops;
    private lastWedge;
    private WedgeYPosXml;
    private openPedal;
    private openWavyLine;
    private openDashes;
    /** Word expressions of dashesMeasure, the last measure a direction was read in. */
    private wordExpressionsOfMeasure;
    private dashesMeasure;
    constructor(musicSheet: MusicSheet, instrument: Instrument, staffNumber: number);
    getMultiExpression: MultiExpression;
    readExpressionParameters(xmlNode: IXmlElement, currentInstrument: Instrument, divisions: number, inSourceMeasureCurrentFraction: Fraction, inSourceMeasureFormerFraction: Fraction, currentMeasureIndex: number, ignoreDivisionsOffset: boolean): void;
    read(directionNode: IXmlElement, currentMeasure: SourceMeasure, inSourceMeasureCurrentFraction: Fraction, inSourceMeasurePreviousFraction?: Fraction): void;
    /** Usually called at end of last measure. */
    closeOpenExpressions(sourceMeasure: SourceMeasure, timestamp: Fraction): void;
    addOctaveShift(directionNode: IXmlElement, currentMeasure: SourceMeasure, endTimestamp: Fraction, endVoiceEntryCount?: number): void;
    addPedalMarking(directionNode: IXmlElement, currentMeasure: SourceMeasure, endTimestamp: Fraction): void;
    private endOpenPedal;
    addWavyLine(wavyLineNode: IXmlElement, currentMeasure: SourceMeasure, currentTimestamp: Fraction, previousTimestamp: Fraction): void;
    private initialize;
    private readPlacement;
    private readExpressionPlacement;
    private readPosition;
    /** Parse a complex metronome mark with metronome-note elements and a metronome-relation (e.g. swing notation). */
    private parseComplexMetronomeMark;
    private interpretInstantaneousDynamics;
    private interpretWords;
    /** The staff a tempo expression is placed at: its own staff if the direction gives a placement, else undefined. */
    private placementStaffIndex;
    /** The font style a <words> node specifies with font-style and font-weight, or undefined if it specifies neither. */
    private static readWordsFontStyle;
    /** The first line of a (possibly multi-line) <words> text, trimmed. */
    private static firstTextLine;
    private readNumber;
    private interpretWedge;
    private interpretRehearsalMark;
    private createNewMultiExpressionIfNeeded;
    private createNewTempoExpressionIfNeeded;
    private addWedge;
    private fillMultiOrTempoExpression;
    private createExpressionFromString;
    /**
     * Reads <dashes>: the dashed line that follows a text expression (e.g. "rit. - - -").
     * Exporters write the dashes either in the same <direction> as the <words> or in a separate <direction>,
     * possibly before the words. A start is attached to the word expression of the same staff and placement
     * at the same timestamp, or else to the last such word before it in the same measure.
     */
    private interpretDashes;
    private addWordExpressionForDashes;
    /** Called for each direction: when a new measure begins, dashes of the previous measure that found no word
     *  at their own timestamp are attached to the last word before them, or dropped. */
    private startMeasureForDashes;
    private finishDashesIfComplete;
    private closeOpenContinuousDynamic;
    private closeOpenContinuousTempo;
    private checkIfWordsNodeIsRepetitionInstruction;
    private hasDigit;
}
