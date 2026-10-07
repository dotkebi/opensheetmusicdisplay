import { MusicSheet } from "../../MusicSheet";
import { Fraction } from "../../../Common/DataObjects/Fraction";
import { Instrument } from "../../Instrument";
import { MultiExpression } from "../../VoiceData/Expressions/MultiExpression";
import { IXmlElement } from "../../../Common/FileIO/Xml";
import { SourceMeasure } from "../../VoiceData/SourceMeasure";
import { WavyLine } from "../../VoiceData/Expressions/ContinuousExpressions/WavyLine";
export declare class ExpressionReader {
    private musicSheet;
    private placement;
    /** Whether the current direction gives its placement (placement attribute or default-y). */
    private placementFromXml;
    private soundTempo;
    private soundTimestamp;
    private explicitSoundTempo;
    private soundDynamic;
    private soundDynamicTimestamp;
    private divisions;
    private offsetDivisions;
    private staffNumber;
    private globalStaffIndex;
    private directionTimestamp;
    private currentMultiTempoExpression;
    /** The last simple metronome mark read, to attach further marks at the same time to it. */
    private lastMetronomeMark;
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
    /** The last pedal closed by an explicit stop, and where it stopped: a start of a sign pedal at the same place
     *  turns the pair into a change (`* Ped.` side by side instead of one glyph over the other). */
    private lastPedalStop;
    /** A stop read while no pedal was open. A voice written earlier in the measure can carry the stop of a pedal whose
     *  start is written later (at an earlier time); that start then ends at this stop. */
    private pendingPedalStop;
    addPedalMarking(directionNode: IXmlElement, currentMeasure: SourceMeasure, endTimestamp: Fraction): void;
    /** Where a pedal stop releases: the direction's position plus its <offset> (in divisions). Pedals are read with the
     *  division offset of readExpressionParameters ignored, but an engraver places the release glyph by this offset
     *  (e.g. after the last note of a measure, or between two notes), so the stop timestamp keeps it. Never before the
     *  measure start. */
    private pedalStopTimestamp;
    private endOpenPedal;
    /** Reads a `<wavy-line>` start or stop.
     *  @returns the wavy line that this stops, if it is a stop of an open wavy line
     */
    addWavyLine(wavyLineNode: IXmlElement, currentMeasure: SourceMeasure, currentTimestamp: Fraction, previousTimestamp: Fraction): WavyLine;
    private initialize;
    private readPlacement;
    private readExpressionPlacement;
    private readPosition;
    /** Parse a complex metronome mark with metronome-note elements and a metronome-relation (e.g. swing notation). */
    private parseComplexMetronomeMark;
    /** Parse a note equation written with two beat units instead of metronome-note elements, e.g. quarter = dotted quarter
     *  (MusicXML's simpler form of a metric modulation). The first beat unit, with its dots and tied beat units, is the left
     *  side, the second one the right side.
     */
    private parseBeatUnitNoteEquation;
    /** Add a note equation (e.g. a swing mark or a metric modulation) as a metronome mark. Its BPM is the direction's
     *  sound tempo, or 0, which TemposCalculator replaces with the tempo in force times the equation's tempo factor.
     */
    private addNoteEquation;
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
    /** Where a wedge stop read at the very start of a measure (`readAt` 0, no later <offset>) ends: at the last staff entry of
     *  this staff in the previous measure, if the wedge started before this measure. Such a stop closes the wedge at the barline
     *  (music21 writes the stop of a hairpin over a whole measure there; MuseScore writes it after the last note of that measure);
     *  ending it under the first note of this measure drew it into this measure, and into the next system at a system break
     *  (Schumann, Myrthen 19 m5-6). The drawn end is then the previous measure's end, as for a stop after its last note. */
    private wedgeStopAtPreviousMeasureEnd;
    /** The timestamp of a wedge stop read at `readAt`: the last staff entry of this staff starting before it, i.e. the note
     *  the wedge ends under. The start of the last note read (`previousFraction`) is that note only while the voices are
     *  read in time order: after a <backup> it belongs to another voice, e.g. a stop at the end of the measure after a held
     *  half note in the second voice would end a diminuendo over the second beat at the measure start (Schumann, Myrthen 17 m34). */
    private wedgeStopTimestamp;
    private interpretRehearsalMark;
    private createNewMultiExpressionIfNeeded;
    private static isSameMetronomeMark;
    /** The metronome mark already read for this staff at the given time of the measure, if any. */
    private metronomeMarkAt;
    private readDirectionTimestamp;
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
