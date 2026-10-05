import {MusicSheet} from "../../MusicSheet";
import {Fraction} from "../../../Common/DataObjects/Fraction";
import {musicXmlColorToCss} from "../../../Common/DataObjects/XmlColor";
import {MultiTempoExpression} from "../../VoiceData/Expressions/MultiTempoExpression";
import {ContDynamicEnum, ContinuousDynamicExpression} from "../../VoiceData/Expressions/ContinuousExpressions/ContinuousDynamicExpression";
import {ContinuousTempoExpression} from "../../VoiceData/Expressions/ContinuousExpressions/ContinuousTempoExpression";
import {DynamicEnum, InstantaneousDynamicExpression} from "../../VoiceData/Expressions/InstantaneousDynamicExpression";
import {OctaveShift} from "../../VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import {Instrument} from "../../Instrument";
import {MultiExpression} from "../../VoiceData/Expressions/MultiExpression";
import {IXmlAttribute, IXmlElement} from "../../../Common/FileIO/Xml";
import {SourceMeasure} from "../../VoiceData/SourceMeasure";
import {InstantaneousTempoExpression, MetronomeNote, MetronomeNoteGroup, MetronomeTuplet} from "../../VoiceData/Expressions/InstantaneousTempoExpression";
import {MoodExpression} from "../../VoiceData/Expressions/MoodExpression";
import {UnknownExpression} from "../../VoiceData/Expressions/UnknownExpression";
import {AbstractExpression, PlacementEnum} from "../../VoiceData/Expressions/AbstractExpression";
import {TextAlignmentEnum} from "../../../Common/Enums/TextAlignment";
import {ITextTranslation} from "../../Interfaces/ITextTranslation";
import log from "loglevel";
import { FontStyles } from "../../../Common/Enums/FontStyles";
import { RehearsalExpression } from "../../VoiceData/Expressions/RehearsalExpression";
import { Pedal } from "../../VoiceData/Expressions/ContinuousExpressions/Pedal";
import { WavyLine } from "../../VoiceData/Expressions/ContinuousExpressions/WavyLine";

/** A dashed line (MusicXML <dashes>) after a text expression, while its text or its stop is still being read. */
interface OpenDashes {
    numberXml: number;
    placement: PlacementEnum;
    startMeasure: SourceMeasure;
    startTimestamp: Fraction;
    expression?: AbstractExpression;
    endMeasure?: SourceMeasure;
    endTimestamp?: Fraction;
}

/** A text expression read from <words> that a dashed line can follow. */
interface WordExpressionPosition {
    expression: AbstractExpression;
    timestamp: Fraction;
    placement: PlacementEnum;
}

export class ExpressionReader {
    private musicSheet: MusicSheet;
    private placement: PlacementEnum;
    /** Whether the current direction gives its placement (placement attribute or default-y). */
    private placementFromXml: boolean;
    private soundTempo: number;
    private soundTimestamp: Fraction;
    private explicitSoundTempo: number;
    private soundDynamic: number;
    private divisions: number;
    private offsetDivisions: number;
    private staffNumber: number;
    private globalStaffIndex: number;
    private directionTimestamp: Fraction;
    private currentMultiTempoExpression: MultiTempoExpression;
    /** The last simple metronome mark read, to attach further marks at the same time to it. */
    private lastMetronomeMark: {expression: InstantaneousTempoExpression, timestamp: Fraction};
    private openContinuousDynamicExpressions: ContinuousDynamicExpression[] = [];
    private openContinuousTempoExpression: ContinuousTempoExpression;
    private activeInstantaneousDynamic: InstantaneousDynamicExpression;
    private openOctaveShifts: Map<number, OctaveShift> = new Map();
    private pendingOctaveShiftStops: Map<number, {measure: SourceMeasure, endTimestamp: Fraction}> = new Map();
    private lastWedge: ContinuousDynamicExpression;
    private WedgeYPosXml: number;
    private openPedal: Pedal;
    private openWavyLine: WavyLine;
    private openDashes: OpenDashes[] = [];
    /** Word expressions of dashesMeasure, the last measure a direction was read in. */
    private wordExpressionsOfMeasure: WordExpressionPosition[] = [];
    private dashesMeasure: SourceMeasure;
    constructor(musicSheet: MusicSheet, instrument: Instrument, staffNumber: number) {
        this.musicSheet = musicSheet;
        this.staffNumber = staffNumber;
        this.globalStaffIndex = musicSheet.getGlobalStaffIndexOfFirstStaff(instrument) + (staffNumber - 1);
        this.initialize();
    }
    public getMultiExpression: MultiExpression;
    public readExpressionParameters(xmlNode: IXmlElement, currentInstrument: Instrument, divisions: number,
                                    inSourceMeasureCurrentFraction: Fraction,
                                    inSourceMeasureFormerFraction: Fraction,
                                    currentMeasureIndex: number,
                                    ignoreDivisionsOffset: boolean): void {
        this.initialize();
        this.divisions = divisions;
        const offsetNode: IXmlElement = xmlNode.element("offset");
        if (offsetNode !== undefined && !ignoreDivisionsOffset) {
            try {
                this.offsetDivisions = parseInt(offsetNode.value, 10);
            } catch (ex) {
                const errorMsg: string = "ReaderErrorMessages/ExpressionOffsetError" + ", Invalid expression offset -> set to default.";
                log.debug("ExpressionReader.readExpressionParameters", errorMsg, ex);
                this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                this.offsetDivisions = 0;
            }
        }
        this.directionTimestamp = Fraction.createFromFraction(inSourceMeasureCurrentFraction);
        let offsetFraction: Fraction = new Fraction(Math.abs(this.offsetDivisions), divisions * 4);

        if (this.offsetDivisions > 0) {
            if (inSourceMeasureCurrentFraction.RealValue > 0) {
                offsetFraction = Fraction.multiply(Fraction.minus(inSourceMeasureCurrentFraction, inSourceMeasureFormerFraction), offsetFraction);
                this.directionTimestamp = Fraction.plus(offsetFraction, inSourceMeasureCurrentFraction);
            } else { this.directionTimestamp = Fraction.createFromFraction(offsetFraction); }
        } else if (this.offsetDivisions < 0) {
            if (inSourceMeasureCurrentFraction.RealValue > 0) {
                offsetFraction = Fraction.multiply(Fraction.minus(inSourceMeasureCurrentFraction, inSourceMeasureFormerFraction), offsetFraction);
                this.directionTimestamp = Fraction.minus(inSourceMeasureCurrentFraction, offsetFraction);
            } else { this.directionTimestamp = Fraction.createFromFraction(offsetFraction); }
        }

        const directionTypeNodes: IXmlElement[] = xmlNode.elements("direction-type");

        const placeAttr: IXmlAttribute = xmlNode.attribute("placement");
        if (placeAttr) {
            try {
                const placementString: string = placeAttr.value;
                if (placementString === "below") {
                    this.placement = PlacementEnum.Below;
                } else if (placementString === "above") {
                    this.placement = PlacementEnum.Above;
                     }
            } catch (ex) {
                const errorMsg: string = ITextTranslation.translateText(  "ReaderErrorMessages/ExpressionPlacementError",
                                                                          "Invalid expression placement -> set to default.");
                log.debug("ExpressionReader.readExpressionParameters", errorMsg, ex);
                this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                this.placement = PlacementEnum.Below;
            }
        }
        try {
            for (const directionTypeNode of directionTypeNodes) {
                const wedgeNode: IXmlElement = directionTypeNode.element("wedge");
                if (wedgeNode) {
                    const defAttr: IXmlAttribute = wedgeNode.attribute("default-y");
                    if (defAttr) {
                        this.WedgeYPosXml = parseInt(defAttr.value, 10);
                        if (this.placement === PlacementEnum.NotYetDefined) {
                            this.readExpressionPlacement(defAttr, "read wedge y pos");
                        }
                    }
                }
                if (this.placement === PlacementEnum.NotYetDefined) {
                    const dynamicsNode: IXmlElement = directionTypeNode.element("dynamics");
                    if (dynamicsNode) {
                        const defAttr: IXmlAttribute = dynamicsNode.attribute("default-y");
                        if (defAttr) {
                            this.readExpressionPlacement(defAttr, "read dynamics y pos");
                        }
                    }
                    const wordsNode: IXmlElement = directionTypeNode.element("words");
                    if (wordsNode) {
                        const defAttr: IXmlAttribute = wordsNode.attribute("default-y");
                        if (defAttr) {
                            this.readExpressionPlacement(defAttr, "read words y pos");
                        }
                    }
                    const rehearsalNode: IXmlElement = directionTypeNode.element("rehearsal");
                    if (rehearsalNode) {
                        const defAttr: IXmlAttribute = rehearsalNode.attribute("default-y");
                        if (defAttr) {
                            this.readExpressionPlacement(defAttr, "read rehearsal pos");
                        }
                    }
                }
            }
        } catch (ex) {
            const errorMsg: string = ITextTranslation.translateText(  "ReaderErrorMessages/ExpressionPlacementError",
                                                                      "Invalid expression placement. Set to default.");
            log.debug("ExpressionReader.readExpressionParameters", errorMsg, ex);
            this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
            this.placement = PlacementEnum.Below;
        }
        this.placementFromXml = this.placement !== PlacementEnum.NotYetDefined;
        if (this.placement === PlacementEnum.NotYetDefined) {
            if (currentInstrument.Staves.length > 1) {
                this.placement = PlacementEnum.Below;
            } else if (currentInstrument.HasLyrics) {
                this.placement = PlacementEnum.Above;
                 } else { this.placement = PlacementEnum.Below; }
        }
    }
    public read(directionNode: IXmlElement, currentMeasure: SourceMeasure,
                inSourceMeasureCurrentFraction: Fraction, inSourceMeasurePreviousFraction: Fraction = undefined): void {
        let isTempoInstruction: boolean = false;
        let isDynamicInstruction: boolean = false;
        this.startMeasureForDashes(currentMeasure);

        const timestampFraction: Fraction = inSourceMeasureCurrentFraction.clone();
        const offsetNode: IXmlElement = directionNode.element("offset");
        if (offsetNode?.value) {
          const offsetValue: number = Number.parseInt(offsetNode.value, 10);
          timestampFraction.Add(new Fraction(offsetValue, 4 * this.divisions));
        }
        // this.directionTimestamp = timestampFraction.clone();
        //   this could be correct, but leads to odd differences with Musescore for elements like dim. and wedges.

        const n: IXmlElement = directionNode.element("sound");
        if (n) {
            const tempoAttr: IXmlAttribute = n.attribute("tempo");
            const dynAttr: IXmlAttribute = n.attribute("dynamics");
            if (tempoAttr) {
                // const match: string[] = tempoAttr.value.match(/^(\d+\.?\d{0,9}|\.\d{1,9})$/);
                const match: string[] = tempoAttr.value.match(/^(\d+)(\.\d+)?$/);
                if (match?.length > 0) {
                    this.soundTempo = Math.round(Number.parseFloat(tempoAttr.value));
                } else {
                    log.info("invalid xml tempo: " + tempoAttr.value);
                    this.soundTempo = 100;
                }
                //console.log(`value: ${tempoAttr.value}\n  soundTempo: ${this.soundTempo}`);
                currentMeasure.TempoInBPM = this.soundTempo;
                this.musicSheet.HasBPMInfo = true;
                isTempoInstruction = true;
                this.explicitSoundTempo = this.soundTempo;
                const soundOffset: IXmlElement = n.element("offset") ??
                    (offsetNode?.attribute("sound")?.value === "yes" ? offsetNode : undefined);
                this.soundTimestamp = this.readTempoTimestamp(soundOffset, inSourceMeasureCurrentFraction);
            }
            if (dynAttr) {
                const match: string[] = dynAttr.value.match(/\d+/);
                this.soundDynamic = match !== undefined ? parseInt(match[0], 10) : 100;
                isDynamicInstruction = true;
            }
        }
        const dirNodes: IXmlElement[] = directionNode.elements("direction-type");
        const originalDirectionTimestamp: Fraction = this.directionTimestamp;
        for (const dirNode of dirNodes) {
            this.directionTimestamp = originalDirectionTimestamp;
            let dirContentNode: IXmlElement = dirNode.element("metronome");
            if (dirContentNode) {
                this.directionTimestamp = this.readTempoTimestamp(
                    dirContentNode.attribute("default-x") ? undefined : offsetNode, inSourceMeasureCurrentFraction);
                const metronomeNotes: IXmlElement[] = dirContentNode.elements("metronome-note");
                const metronomeRelation: IXmlElement = dirContentNode.element("metronome-relation");

                if (metronomeNotes.length > 0 && metronomeRelation) {
                    // Complex metronome mark (note equation, e.g. swing notation)
                    this.parseComplexMetronomeMark(dirContentNode, metronomeNotes, metronomeRelation,
                                                   currentMeasure, timestampFraction);
                } else if (!dirContentNode.element("per-minute") && dirContentNode.elements("beat-unit").length > 1) {
                    // Note equation written with two beat units, e.g. quarter = dotted quarter (a metric modulation)
                    this.parseBeatUnitNoteEquation(dirContentNode, currentMeasure, timestampFraction);
                } else {
                    // Simple metronome mark: beat-unit = BPM
                    const beatUnit: IXmlElement = dirContentNode.element("beat-unit");
                    const dotted: boolean = dirContentNode.element("beat-unit-dot") !== undefined;
                    const bpm: IXmlElement = dirContentNode.element("per-minute");
                    if (beatUnit !== undefined && bpm) {
                        // per-minute can contain text alongside the number (e.g. "c. 108" for circa)
                        // -> find first number ("c. 108" matches 108, "108.5" would match 108.5)
                        const perMinute: string = bpm.value.trim();
                        const bpmMatch: RegExpMatchArray = perMinute.match(/(\d+\.?\d*)/);
                        const bpmNumber: number = bpmMatch ? parseFloat(bpmMatch[1]) : NaN;
                        // keep the whole text for display ("c. 108", "80 e")
                        const perMinuteText: string = bpmMatch && bpmMatch[1] !== perMinute ? perMinute : undefined;
                        const precedingMark: InstantaneousTempoExpression = this.metronomeMarkAt(currentMeasure, timestampFraction);
                        if (precedingMark && !isTempoInstruction &&
                            !ExpressionReader.isSameMetronomeMark(precedingMark, beatUnit.value, dotted, perMinute)) {
                            // Another, different metronome mark at the same time without a <sound tempo> of its own
                            // ("♩. = 80 e ♩. = 50", two alternatives) is drawn after the first one on the same line.
                            // Only the first one sets the tempo. Repeated identical marks (exporter duplicates) and marks
                            // with their own <sound tempo> (tempo changes) are read as before.
                            const followingMark: InstantaneousTempoExpression =
                                new InstantaneousTempoExpression(undefined,
                                                                 this.placement,
                                                                 this.staffNumber,
                                                                 bpmNumber,
                                                                 precedingMark.ParentMultiTempoExpression,
                                                                 true);
                            followingMark.parentMeasure = currentMeasure;
                            followingMark.dotted = dotted;
                            followingMark.beatUnit = beatUnit.value;
                            followingMark.perMinuteText = perMinuteText;
                            precedingMark.followingMetronomeMarks.push(followingMark);
                            continue;
                        }
                        this.createNewTempoExpressionIfNeeded(currentMeasure);
                        const instantaneousTempoExpression: InstantaneousTempoExpression =
                            new InstantaneousTempoExpression(undefined,
                                                             this.placement,
                                                             this.staffNumber,
                                                             bpmNumber,
                                                             this.currentMultiTempoExpression,
                                                             true);
                        instantaneousTempoExpression.parentMeasure = currentMeasure;
                        this.soundTempo = bpmNumber;
                        // make sure to take dotted beats into account
                        currentMeasure.TempoInBPM = this.soundTempo * (dotted?1.5:1);
                        this.musicSheet.HasBPMInfo = true;
                        instantaneousTempoExpression.dotted = dotted;
                        instantaneousTempoExpression.beatUnit = beatUnit.value;
                        instantaneousTempoExpression.perMinuteText = perMinuteText;
                        this.lastMetronomeMark = { expression: instantaneousTempoExpression, timestamp: timestampFraction.clone() };
                        instantaneousTempoExpression.printObject = dirContentNode.attribute("print-object")?.value !== "no";
                        this.currentMultiTempoExpression.addExpression(instantaneousTempoExpression, "");
                        this.currentMultiTempoExpression.CombinedExpressionsText = "test";
                    }
                }
                continue;
            }

            dirContentNode = dirNode.element("dynamics");
            if (dirContentNode) {
                const fromNotation: boolean = directionNode.element("notations") !== undefined;
                this.interpretInstantaneousDynamics(dirContentNode, currentMeasure, timestampFraction, fromNotation);
                continue;
            }

            dirContentNode = dirNode.element("words");
            if (dirContentNode) {
                // an exporter may split the words where their formatting changes
                const text: string = dirNode.elements("words").map((wordsNode: IXmlElement): string => wordsNode.value).join("");
                if (isTempoInstruction) {
                    this.directionTimestamp = this.readTempoTimestamp(
                        dirContentNode.attribute("default-x") ? undefined : offsetNode, inSourceMeasureCurrentFraction);
                    this.createNewTempoExpressionIfNeeded(currentMeasure);
                    this.currentMultiTempoExpression.CombinedExpressionsText = text;
                    const instantaneousTempoExpression: InstantaneousTempoExpression = new InstantaneousTempoExpression(
                        text, this.placement, this.staffNumber, this.soundTempo, this.currentMultiTempoExpression);
                    instantaneousTempoExpression.fontStyle = ExpressionReader.readWordsFontStyle(dirContentNode);
                    instantaneousTempoExpression.placementStaffIndex = this.placementStaffIndex();
                    instantaneousTempoExpression.language = dirContentNode.attribute("xml:lang")?.value;
                    this.currentMultiTempoExpression.addExpression(instantaneousTempoExpression, "");
                    this.addWordExpressionForDashes(instantaneousTempoExpression, timestampFraction);
                } else if (!isDynamicInstruction) {
                    this.interpretWords(dirContentNode, text, currentMeasure, timestampFraction);
                }
                continue;
            }

            dirContentNode = dirNode.element("wedge");
            if (dirContentNode) {
                this.interpretWedge(directionNode, dirContentNode, currentMeasure, inSourceMeasurePreviousFraction, currentMeasure.MeasureNumber);
                continue;
            }

            dirContentNode = dirNode.element("rehearsal");
            if (dirContentNode) {
                this.interpretRehearsalMark(dirContentNode, currentMeasure, inSourceMeasureCurrentFraction, currentMeasure.MeasureNumber);
                continue;
            }

            dirContentNode = dirNode.element("dashes");
            if (dirContentNode) {
                this.interpretDashes(dirContentNode, currentMeasure, timestampFraction);
                continue;
            }
        }
    }
    /** Usually called at end of last measure. */
    public closeOpenExpressions(sourceMeasure: SourceMeasure, timestamp: Fraction): void {
        for (const openCont of this.openContinuousDynamicExpressions) {
            // add to current stafflinked expression // refactor into closeOpenContinuousDynamic?
            this.createNewMultiExpressionIfNeeded(sourceMeasure, openCont.NumberXml, timestamp);

            this.closeOpenContinuousDynamic(openCont, sourceMeasure, timestamp);
        }
        if (this.openContinuousTempoExpression) {
            this.closeOpenContinuousTempo(Fraction.plus(sourceMeasure.AbsoluteTimestamp, timestamp));
        }
        this.startMeasureForDashes(undefined);
        this.openDashes = []; // dashes without a stop are not drawn
    }
    public addOctaveShift(directionNode: IXmlElement, currentMeasure: SourceMeasure, endTimestamp: Fraction,
                          endVoiceEntryCount: number = 0): void {
        let octaveStaffNumber: number = 1;
        const staffNode: IXmlElement = directionNode.element("staff");
        if (staffNode) {
            try {
                octaveStaffNumber = parseInt(staffNode.value, 10);
            } catch (ex) {
                const errorMsg: string = ITextTranslation.translateText(  "ReaderErrorMessages/OctaveShiftStaffError",
                                                                          "Invalid octave shift staff number. Set to default");
                this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                octaveStaffNumber = 1;
                log.debug("ExpressionReader.addOctaveShift", errorMsg, ex);
            }
        }
        const directionTypeNodes: IXmlElement[] = directionNode.elements("direction-type");
        const placement: PlacementEnum = this.readPlacement(directionNode);
        for (const directionTypeNode of directionTypeNodes) {
            const octaveShiftNode: IXmlElement = directionTypeNode.element("octave-shift");
            // if (placement === PlacementEnum.NotYetDefined && this.staffNumber === 1) {
            //     placement = PlacementEnum.Above;
            // }
            if (octaveShiftNode !== undefined && octaveShiftNode.hasAttributes) {
                try {
                    const numberXml: number = this.readNumber(octaveShiftNode);
                    if (octaveShiftNode.attribute("size")) {
                        const size: number = parseInt(octaveShiftNode.attribute("size").value, 10);
                        let octave: number = 0;
                        if (size === 8) {
                            octave = 1;
                        } else if (size === 15) {
                            octave = 2;
                             }
                        let type: string = octaveShiftNode.attribute("type")?.value;
                        if (!type) {
                            if (placement === PlacementEnum.Above) {
                                type = "down";
                            } else if (placement === PlacementEnum.Below) {
                                type = "up";
                            }
                        }
                        if (type === "up" || type === "down") { // unfortunately not always given in MusicXML (e.g. Musescore 3.6.2) even though required
                            const octaveShift: OctaveShift = new OctaveShift(type, octave);
                            octaveShift.StaffNumber = octaveStaffNumber;
                            octaveShift.numberXml = numberXml;
                            this.getMultiExpression = this.createNewMultiExpressionIfNeeded(
                                currentMeasure, numberXml);
                            this.getMultiExpression.OctaveShiftStart = octaveShift;
                            octaveShift.ParentStartMultiExpression = this.getMultiExpression;
                            this.openOctaveShifts.set(numberXml, octaveShift);
                            // Check if the matching stop was already encountered (stop before start due to voice/backup ordering)
                            const pendingStop: {measure: SourceMeasure, endTimestamp: Fraction} =
                                this.pendingOctaveShiftStops.get(numberXml);
                            if (pendingStop) {
                                this.pendingOctaveShiftStops.delete(numberXml);
                                this.getMultiExpression = this.createNewMultiExpressionIfNeeded(
                                    pendingStop.measure, numberXml, pendingStop.endTimestamp);
                                this.getMultiExpression.OctaveShiftEnd = octaveShift;
                                octaveShift.ParentEndMultiExpression = this.getMultiExpression;
                                this.openOctaveShifts.delete(numberXml);
                            }
                        } else if (type === "stop") {
                            const matchingShift: OctaveShift = this.openOctaveShifts.get(numberXml);
                            if (matchingShift) {
                                matchingShift.endVoiceEntryIndex = endVoiceEntryCount;
                                this.getMultiExpression = this.createNewMultiExpressionIfNeeded(
                                    currentMeasure, matchingShift.numberXml, endTimestamp);
                                const octaveShiftStartExpression: MultiExpression = this.getMultiExpression;
                                octaveShiftStartExpression.OctaveShiftEnd = matchingShift;
                                matchingShift.ParentEndMultiExpression = this.getMultiExpression;
                                this.openOctaveShifts.delete(numberXml);
                            } else {
                                // Stop arrived before its matching start (e.g. due to voice/backup ordering in MusicXML).
                                // Store it so it can be matched when the start is encountered later.
                                // Use directionTimestamp stepped back by one division to get an inclusive end (notes at end timestamp are included),
                                // since directionTimestamp (= currentFraction) is an exclusive boundary and
                                // endTimestamp (= previousFraction) refers to the wrong voice's timeline.
                                const inclusiveEnd: Fraction = Fraction.minus(
                                    this.directionTimestamp, new Fraction(1, 4 * this.divisions));
                                this.pendingOctaveShiftStops.set(numberXml, {
                                    measure: currentMeasure,
                                    endTimestamp: inclusiveEnd
                                });
                            }
                        } // TODO handle type === "continue"?
                        else if (!type) {
                            log.debug("octave-shift missing type in xml");
                        }
                    }
                } catch (ex) {
                    const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/OctaveShiftError", "Error while reading octave shift.");
                    this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                    log.debug("ExpressionReader.addOctaveShift", errorMsg, ex);
                }
            }
        }
    }
    public addPedalMarking(directionNode: IXmlElement, currentMeasure: SourceMeasure, endTimestamp: Fraction): void {
        const directionTypeNodes: IXmlElement[] = directionNode.elements("direction-type");
        for (const directionTypeNode of directionTypeNodes) {
            const pedalNode: IXmlElement = directionTypeNode.element("pedal");
            if (!pedalNode) { continue; }
            if (pedalNode.hasAttributes) {
                let sign: boolean = false, line: boolean = false;
                try {
                    if (pedalNode.attribute("line")?.value === "yes") {
                        line = true;
                    } else if (pedalNode.attribute("line")?.value === "no"){
                        line = false;
                        //No line implies sign
                        sign = true;
                    } else if (pedalNode.attribute("sign")?.value === "yes") {
                        sign = true;
                    } else { //if (pedalNode.attribute("sign")?.value === "no"){
                        // only assume sign if explicitly given in one way or another
                        sign = false;
                        line = true;
                    }
                    switch (pedalNode.attribute("type").value) {
                        case "start":
                            //ignore duplicate tags (causes issues when pedals aren't terminated)
                            // if (!this.openPedal || !this.openPedal.ParentStartMultiExpression.AbsoluteTimestamp.Equals(endTimestamp)) {
                            //     this.createNewMultiExpressionIfNeeded(currentMeasure, -1);
                            // }
                            // instead, just end open pedal if there already was one, and create new one
                            if (this.openPedal && this.openPedal.IsLine) {
                                // if we don't check IsLine, the Ped. at the end of Dichterliebe overlaps with a *
                                this.endOpenPedal(currentMeasure);
                            }
                            this.createNewMultiExpressionIfNeeded(currentMeasure, -1);
                            this.openPedal = new Pedal(line, sign);
                            this.getMultiExpression.PedalStart = this.openPedal;
                            this.openPedal.ParentStartMultiExpression = this.getMultiExpression;
                        break;
                        case "stop":
                            if (this.openPedal) {
                                this.endOpenPedal(currentMeasure, endTimestamp);
                            }
                        break;
                        case "change":
                            //Ignore non-line pedals
                            if (this.openPedal && this.openPedal.IsLine) {
                                this.openPedal.ChangeEnd = true;
                                this.createNewMultiExpressionIfNeeded(currentMeasure, -1);
                                this.getMultiExpression.PedalEnd = this.openPedal;
                                this.openPedal.ParentEndMultiExpression = this.getMultiExpression;

                                this.createNewMultiExpressionIfNeeded(currentMeasure, -1);
                                this.openPedal = new Pedal(line, sign);
                                this.openPedal.ChangeBegin = true;
                                this.getMultiExpression.PedalStart = this.openPedal;
                                this.openPedal.ParentStartMultiExpression = this.getMultiExpression;
                            }
                        break;
                        case "continue":
                        break;
                        default:
                        break;
                    }
                } catch (ex) {
                    const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/PedalError", "Error while reading pedal.");
                    this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                    log.debug("ExpressionReader.addPedalMarking", errorMsg, ex);
                }
            }
        }
    }
    private endOpenPedal(currentMeasure: SourceMeasure, endTimeStamp?: Fraction): void {
        this.createNewMultiExpressionIfNeeded(currentMeasure, -1, endTimeStamp);
        // unfortunately currentMeasure.Duration doesn't exist here yet, so we can't check pedal.EndsStave
        this.getMultiExpression.PedalEnd = this.openPedal;
        this.openPedal.ParentEndMultiExpression = this.getMultiExpression;
        this.openPedal = undefined;
    }
    public addWavyLine(wavyLineNode: IXmlElement, currentMeasure: SourceMeasure, currentTimestamp: Fraction, previousTimestamp: Fraction): void {
        if (wavyLineNode && wavyLineNode.hasAttributes) {
            try {
                switch (wavyLineNode.attribute("type").value) {
                    case "start":
                        this.createNewMultiExpressionIfNeeded(currentMeasure, -1);
                        this.openWavyLine = new WavyLine(this.placement);
                        this.getMultiExpression.WavyLineStart = this.openWavyLine;
                        this.openWavyLine.ParentStartMultiExpression = this.getMultiExpression;
                    break;
                    case "stop":
                        if (this.openWavyLine) {
                            this.createNewMultiExpressionIfNeeded(currentMeasure, -1, currentTimestamp);
                            this.getMultiExpression.WavyLineEnd = this.openWavyLine;
                            this.openWavyLine.ParentEndMultiExpression = this.getMultiExpression;
                            this.openWavyLine = undefined;
                        }
                    break;
                    case "continue":
                        //Seems we can ignore this for now. TODO: Look into when this is a barline child
                    break;
                    default:
                    break;
                }
            } catch (ex) {
                const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/WavyLineError", "Error while reading wavy-line.");
                this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                log.debug("ExpressionReader.addWavyLine", errorMsg, ex);
            }
        }
    }
    private initialize(): void {
        this.placement = PlacementEnum.NotYetDefined;
        this.soundTempo = 0;
        this.soundTimestamp = undefined;
        this.explicitSoundTempo = undefined;
        this.soundDynamic = 0;
        this.offsetDivisions = 0;
    }
    private readPlacement(node: IXmlElement): PlacementEnum {
        const value: string = node.attribute("placement")?.value;
        if (value === "above") {
            return PlacementEnum.Above;
        } else if (value === "below") {
            return PlacementEnum.Below;
        } else {
            return PlacementEnum.NotYetDefined;
        }
    }
    private readExpressionPlacement(yPosAttr: IXmlAttribute, catchLogMessage: string): void {
        try {
            const y: number = this.readPosition(yPosAttr);
            if (y < 0) {
                this.placement = PlacementEnum.Below;
            } else if (y > 0) {
                this.placement = PlacementEnum.Above;
            }
        } catch (ex) {
            log.debug("ExpressionReader.readExpressionParameters", catchLogMessage, ex);
        }
    }
    private readPosition(posAttr: IXmlAttribute): number {
        try {
            const xOrY: number = parseInt(posAttr.value, 10);
            if (xOrY < 0) {
                this.placement = PlacementEnum.Below;
            } else if (xOrY > 0) {
                this.placement = PlacementEnum.Above;
            }
            return xOrY;
        } catch (ex) {
            log.debug("ExpressionReader.readExpressionParameters", ex);
        }
    }
    /** Parse a complex metronome mark with metronome-note elements and a metronome-relation (e.g. swing notation). */
    private parseComplexMetronomeMark(metronomeNode: IXmlElement, metronomeNotes: IXmlElement[],
                                      metronomeRelationNode: IXmlElement,
                                      currentMeasure: SourceMeasure, timestampFraction: Fraction): void {
        // Split metronome-note elements into left and right groups, divided by metronome-relation.
        // We iterate the raw children to determine ordering.
        const allChildren: IXmlElement[] = metronomeNode.elements();
        const leftNotes: MetronomeNote[] = [];
        const rightNotes: MetronomeNote[] = [];
        let leftTuplet: MetronomeTuplet | undefined;
        let rightTuplet: MetronomeTuplet | undefined;
        let passedRelation: boolean = false;
        let tieStarted: boolean = false;

        for (const child of allChildren) {
            if (child.name === "metronome-relation") {
                passedRelation = true;
                tieStarted = false;
                continue;
            }
            if (child.name !== "metronome-note") {
                continue;
            }
            const typeEl: IXmlElement = child.element("metronome-type");
            if (!typeEl) {
                continue;
            }
            const note: MetronomeNote = {
                type: typeEl.value,
                dots: child.elements("metronome-dot").length,
            };
            const beamEl: IXmlElement = child.element("metronome-beam");
            if (beamEl) {
                note.beam = beamEl.value; // "begin", "continue", "end"
            }
            // Tied to the preceding note if this tie stops or the preceding one starts: a note has only one
            //   metronome-tied, so the middle note of a chain has either.
            const tiedType: string = child.element("metronome-tied")?.attribute("type")?.value;
            if (tiedType === "stop" || tieStarted) {
                note.tied = true;
            }
            tieStarted = tiedType === "start";

            // Parse tuplet start/stop
            const tupletEl: IXmlElement = child.element("metronome-tuplet");
            if (tupletEl) {
                const tupletType: string = tupletEl.hasAttributes ? tupletEl.attribute("type")?.value : undefined;
                if (tupletType === "start") {
                    const actualEl: IXmlElement = tupletEl.element("actual-notes");
                    const normalEl: IXmlElement = tupletEl.element("normal-notes");
                    const bracketAttr: IXmlAttribute = tupletEl.attribute("bracket");
                    const showNumberAttr: IXmlAttribute = tupletEl.attribute("show-number");
                    const tuplet: MetronomeTuplet = {
                        actualNotes: actualEl ? parseInt(actualEl.value, 10) : 3,
                        normalNotes: normalEl ? parseInt(normalEl.value, 10) : 2,
                        bracket: bracketAttr ? bracketAttr.value === "yes" : true,
                        showNumber: showNumberAttr ? showNumberAttr.value : "actual",
                    };
                    // the tuplet belongs to the side it starts on, e.g. the right side of a swing mark
                    if (passedRelation) {
                        rightTuplet = tuplet;
                    } else {
                        leftTuplet = tuplet;
                    }
                }
                // tupletType === "stop" — tuplet ends on this note, handled below
            }

            if (passedRelation) {
                rightNotes.push(note);
            } else {
                leftNotes.push(note);
            }
        }

        // Build note groups
        const leftGroup: MetronomeNoteGroup = { notes: leftNotes, tuplet: leftTuplet };
        const rightGroup: MetronomeNoteGroup = { notes: rightNotes, tuplet: rightTuplet };
        this.addNoteEquation(metronomeNode, leftGroup, rightGroup, metronomeRelationNode.value, currentMeasure, timestampFraction);
    }

    /** Parse a note equation written with two beat units instead of metronome-note elements, e.g. quarter = dotted quarter
     *  (MusicXML's simpler form of a metric modulation). The first beat unit, with its dots and tied beat units, is the left
     *  side, the second one the right side.
     */
    private parseBeatUnitNoteEquation(metronomeNode: IXmlElement, currentMeasure: SourceMeasure, timestampFraction: Fraction): void {
        const leftNotes: MetronomeNote[] = [];
        const rightNotes: MetronomeNote[] = [];
        let notes: MetronomeNote[] = leftNotes;
        for (const child of metronomeNode.elements()) {
            if (child.name === "beat-unit") {
                if (leftNotes.length > 0) {
                    notes = rightNotes; // the second beat unit starts the right side
                }
                notes.push({ type: child.value, dots: 0 });
            } else if (child.name === "beat-unit-dot" && notes.length > 0) {
                notes[notes.length - 1].dots++;
            } else if (child.name === "beat-unit-tied" && child.element("beat-unit")) {
                notes.push({ type: child.element("beat-unit").value, dots: child.elements("beat-unit-dot").length, tied: true });
            }
        }
        this.addNoteEquation(metronomeNode, { notes: leftNotes }, { notes: rightNotes }, "equals", currentMeasure, timestampFraction);
    }

    /** Add a note equation (e.g. a swing mark or a metric modulation) as a metronome mark. Its BPM is the direction's
     *  sound tempo, or 0, which TemposCalculator replaces with the tempo in force times the equation's tempo factor.
     */
    private addNoteEquation(metronomeNode: IXmlElement, leftGroup: MetronomeNoteGroup, rightGroup: MetronomeNoteGroup,
                            relation: string, currentMeasure: SourceMeasure, timestampFraction: Fraction): void {
        const useCurrentFractionForPositioning: boolean =
            (metronomeNode.hasAttributes && metronomeNode.attribute("default-x") !== undefined);
        if (useCurrentFractionForPositioning) {
            this.directionTimestamp = Fraction.createFromFraction(timestampFraction);
        }

        // Create the tempo expression. Use the sound tempo from the parent <sound> element.
        this.createNewTempoExpressionIfNeeded(currentMeasure);
        const instantaneousTempoExpression: InstantaneousTempoExpression =
            new InstantaneousTempoExpression(undefined,
                                             this.placement,
                                             this.staffNumber,
                                             this.soundTempo,
                                             this.currentMultiTempoExpression,
                                             true);
        instantaneousTempoExpression.parentMeasure = currentMeasure;
        instantaneousTempoExpression.metronomeNoteGroupLeft = leftGroup;
        instantaneousTempoExpression.metronomeNoteGroupRight = rightGroup;
        instantaneousTempoExpression.metronomeRelation = relation;
        instantaneousTempoExpression.printObject = metronomeNode.attribute("print-object")?.value !== "no";

        this.musicSheet.HasBPMInfo = true;
        this.currentMultiTempoExpression.addExpression(instantaneousTempoExpression, "");
        this.currentMultiTempoExpression.CombinedExpressionsText = "test";
    }

    private interpretInstantaneousDynamics(dynamicsNode: IXmlElement,
                                           currentMeasure: SourceMeasure,
                                           inSourceMeasureCurrentFraction: Fraction,
                                           fromNotation: boolean): void {
        if (dynamicsNode.hasElements) {
            if (dynamicsNode.hasAttributes && dynamicsNode.attribute("default-x")) {
                this.directionTimestamp = Fraction.createFromFraction(inSourceMeasureCurrentFraction);
            }
            const numberXml: number = this.readNumber(dynamicsNode); // probably never given, just to comply with createExpressionIfNeeded()
            const dynamicsElements: IXmlElement[] = dynamicsNode.elements();
            // A single <dynamics> element may contain multiple symbols, e.g. <sf/><mp/>.
            const expressionText: string = dynamicsElements
                .map((element: IXmlElement): string => element.name === "other-dynamics" ? element.value : element.name)
                .join("")
                .trim(); // e.g. Finale writes <other-dynamics> marcato</other-dynamics> with a leading space
            if (expressionText) {
                // The playback dynamic of the marking: sf for <sf/><mp/> (sfmp) as well as for the same marking spelled
                //   letter by letter, ff for <other-dynamics>ffz</other-dynamics>, f for "f con fuoco", none for "cresc.".
                const dynamicEnum: DynamicEnum = InstantaneousDynamicExpression.dynamicEnumFromText(expressionText);
                // ToDo: make duplicate recognition an afterReadingModule, as we can't definitively check here if there is a repetition:
                // Compare with the active dynamic expression and only add it if there is a change in dynamic
                // Exception is when a repetition starts here, where the "repeated" dynamic might be desired.
                // see PR #767 where this was removed
                if (currentMeasure.Rules?.IgnoreRepeatedDynamics) {
                    // Compare the whole marking, not just its playback enum (the first symbol of a combined marking):
                    //   <sf/><p/> right after <sf/><mp/> is a different marking, not a repeated sf.
                    if (this.activeInstantaneousDynamic?.DynamicExpression?.toLowerCase() === expressionText.toLowerCase()) {
                        // repeated dynamic
                        return;
                    }
                }
                if (!fromNotation) {
                    this.createNewMultiExpressionIfNeeded(currentMeasure, numberXml);
                } else {
                    this.createNewMultiExpressionIfNeeded(currentMeasure, numberXml,
                        Fraction.createFromFraction(inSourceMeasureCurrentFraction));
                }
                // A second dynamic at the same position on the same staff, e.g. Finale's "ff marcato" written as <ff/> plus
                //   <other-dynamics>marcato</other-dynamics> in two <direction>s: the MultiExpression holds only one
                //   instantaneous dynamic, so combine both into one marking instead of losing the first one.
                const existingDynamic: InstantaneousDynamicExpression = this.getMultiExpression.InstantaneousDynamic;
                let markingText: string = expressionText;
                let markingEnum: DynamicEnum = dynamicEnum;
                if (existingDynamic && existingDynamic.StaffNumber === this.staffNumber &&
                    existingDynamic.DynamicExpression.toLowerCase() !== expressionText.toLowerCase()) {
                    markingText = existingDynamic.DynamicExpression + " " + expressionText;
                    markingEnum = existingDynamic.DynEnum ?? dynamicEnum; // the playback dynamic of "ff marcato" is the ff
                }
                const instantaneousDynamicExpression: InstantaneousDynamicExpression =
                    new InstantaneousDynamicExpression(
                        markingText,
                        this.soundDynamic,
                        this.placement,
                        this.staffNumber,
                        currentMeasure,
                        markingEnum);
                instantaneousDynamicExpression.InMeasureTimestamp = inSourceMeasureCurrentFraction.clone();
                this.getMultiExpression.addExpression(instantaneousDynamicExpression, "");
                // addExpression unnecessary now?:
                //const multiExpression = this.getMultiExpression(ExpressionType.InstantaneousDynamic, numberXml);
                //multiExpression.addExpression(instantaneousDynamicExpression, "");
                //this.initialize(); this is unnecessary, also done at the beginning of readExpressionParameters().
                //  initialize also resets this.placement to NotYetDefined, would be an issue for multiple direction-type nodes in one direction node.
                if (this.activeInstantaneousDynamic) {
                    this.activeInstantaneousDynamic.DynEnum = instantaneousDynamicExpression.DynEnum;
                    this.activeInstantaneousDynamic.DynamicExpression = instantaneousDynamicExpression.DynamicExpression;
                } else {
                    this.activeInstantaneousDynamic = new InstantaneousDynamicExpression(instantaneousDynamicExpression.DynamicExpression, 0,
                                                                                         PlacementEnum.NotYetDefined, 1, currentMeasure,
                                                                                         instantaneousDynamicExpression.DynEnum);
                }
                //}
            }
        }
    }
    private interpretWords(wordsNode: IXmlElement, text: string, currentMeasure: SourceMeasure, inSourceMeasureCurrentFraction: Fraction): void {
        if (currentMeasure.Rules.IgnoreBracketsWords && (
            /^\(\s*\)$/.test(text) || /^\[\s*\]$/.test(text) // (*) and [*]
        )) { // regex: brackets with arbitrary white space in-between
            return;
        }
        let fontStyle: FontStyles;
        const fontStyleAttr: Attr = wordsNode.attribute("font-style");
        let fontStyleText: string;
        let fontWeightText: string;
        let fontColor: string;
        if (fontStyleAttr) {
            fontStyleText = fontStyleAttr.value;
            if (fontStyleText === "italic") {
                fontStyle = FontStyles.Italic;
            }
        }
        const fontWeightAttr: Attr = wordsNode.attribute("font-weight");
        if (fontWeightAttr) {
            fontWeightText = fontWeightAttr.value;
            if (fontWeightText === "bold") {
                fontStyle = FontStyles.Bold;
                if (fontStyleText === "italic") {
                    fontStyle = FontStyles.BoldItalic;
                }
            }
        }
        const colorAttr: Attr = wordsNode.attribute("color");
        if (colorAttr) {
            fontColor = musicXmlColorToCss(colorAttr.value);
        }
        const tempoFontStyle: FontStyles = ExpressionReader.readWordsFontStyle(wordsNode);
        const language: string = wordsNode.attribute("xml:lang")?.value;
        let defaultYXml: number;
        if (currentMeasure.Rules.PlaceWordsInsideStafflineFromXml) {
            const defaultYString: string = wordsNode.attribute("default-y")?.value;
            if (defaultYString?.length > 0) {
                defaultYXml = Number.parseInt(defaultYString, 10);
            }
        }
        if (text.length > 0) {
            if (wordsNode.hasAttributes && wordsNode.attribute("default-x")) {
                this.directionTimestamp = Fraction.createFromFraction(inSourceMeasureCurrentFraction);
            }
            if (this.checkIfWordsNodeIsRepetitionInstruction(text)) {
                return;
            }
            this.fillMultiOrTempoExpression(text, currentMeasure, inSourceMeasureCurrentFraction, fontStyle, fontColor, defaultYXml, tempoFontStyle, language);
            // readExpressionParameters() initializes once per outer <direction>.
            // Resetting here loses placement/staff context needed by later
            // <direction-type> siblings (for example whitespace words + wedge).
        }
    }
    /** The staff a tempo expression is placed at: its own staff if the direction gives a placement, else undefined. */
    private placementStaffIndex(): number {
        return this.placementFromXml ? this.globalStaffIndex : undefined;
    }
    /** The font style a <words> node specifies with font-style and font-weight, or undefined if it specifies neither. */
    private static readWordsFontStyle(wordsNode: IXmlElement): FontStyles {
        const fontStyleText: string = wordsNode.attribute("font-style")?.value;
        const fontWeightText: string = wordsNode.attribute("font-weight")?.value;
        if (fontStyleText === undefined && fontWeightText === undefined) {
            return undefined;
        }
        const italic: boolean = fontStyleText === "italic";
        if (fontWeightText === "bold") {
            return italic ? FontStyles.BoldItalic : FontStyles.Bold;
        }
        return italic ? FontStyles.Italic : FontStyles.Regular;
    }
    /** The first line of a (possibly multi-line) <words> text, trimmed. */
    private static firstTextLine(text: string): string {
        return text.split(/[\r\n]+/)[0].trim();
    }
    private readNumber(node: IXmlElement): number {
        let numberXml: number = 1; // default value
        const numberStringXml: string = node.attribute("number")?.value;
        if (numberStringXml) {
            numberXml = Number.parseInt(numberStringXml, 10);
        }
        return numberXml;
    }
    private interpretWedge(directionNode: IXmlElement, wedgeNode: IXmlElement,
        currentMeasure: SourceMeasure, inSourceMeasureCurrentFraction: Fraction, currentMeasureIndex: number): void {
        if (wedgeNode !== undefined && wedgeNode.hasAttributes && wedgeNode.attribute("default-x")) {
            this.directionTimestamp = Fraction.createFromFraction(inSourceMeasureCurrentFraction);
        }
        const wedgeNumberXml: number = this.readNumber(wedgeNode);

        const typeAttributeString: string = wedgeNode.attribute("type")?.value?.toLowerCase();

        // check for duplicate
        if (this.lastWedge && this.lastWedge.parentMeasure.MeasureNumberXML === currentMeasure.MeasureNumberXML &&
                this.lastWedge.StaffNumber === this.staffNumber &&
                this.placement === this.lastWedge.Placement &&
                this.WedgeYPosXml !== undefined &&
                this.lastWedge.YPosXml === this.WedgeYPosXml &&
                this.lastWedge.StartMultiExpression.Timestamp.Equals(this.directionTimestamp) &&
                this.lastWedge.DynamicType === ContDynamicEnum[typeAttributeString]

        ) {
            // duplicate, ignore
            return;
        }
        //Ending needs to use previous fraction, not current.
        //If current is used, when there is a system break it will mess up
        if (typeAttributeString === "stop") {
            this.createNewMultiExpressionIfNeeded(currentMeasure, wedgeNumberXml, inSourceMeasureCurrentFraction);
            this.getMultiExpression.EndOffsetFraction = new Fraction(this.offsetDivisions, this.divisions * 4);
        } else {
            this.createNewMultiExpressionIfNeeded(currentMeasure, wedgeNumberXml);
        }
        this.addWedge(wedgeNode, currentMeasure, inSourceMeasureCurrentFraction);
        // Keep the outer <direction> context for later <direction-type> siblings.
    }
    private interpretRehearsalMark(
        rehearsalNode: IXmlElement, currentMeasure: SourceMeasure,
        inSourceMeasureCurrentFraction: Fraction, currentMeasureIndex: number): void {
        // TODO create multi expression? for now we just need to have a static rehearsal mark though.
        currentMeasure.rehearsalExpression = new RehearsalExpression(rehearsalNode.value, this.placement);
    }
    private createNewMultiExpressionIfNeeded(currentMeasure: SourceMeasure, numberXml: number,
        timestamp: Fraction = undefined): MultiExpression {
        if (!timestamp) {
            timestamp = this.directionTimestamp;
        }
        let existingMultiExpression: MultiExpression = this.getMultiExpression;
        if (!existingMultiExpression ||
            existingMultiExpression &&
            (existingMultiExpression.SourceMeasureParent !== currentMeasure ||
                existingMultiExpression.numberXml !== numberXml ||
                (existingMultiExpression.SourceMeasureParent === currentMeasure && !existingMultiExpression.Timestamp.Equals(timestamp)))) {
                    this.getMultiExpression = existingMultiExpression = new MultiExpression(currentMeasure, Fraction.createFromFraction(timestamp));
                    this.getMultiExpression.numberXml = numberXml;
            currentMeasure.StaffLinkedExpressions[this.globalStaffIndex].push(existingMultiExpression);
        }
        return existingMultiExpression;
    }

    private static isSameMetronomeMark(mark: InstantaneousTempoExpression, beatUnit: string, dotted: boolean, perMinute: string): boolean {
        for (const other of [mark].concat(mark.followingMetronomeMarks)) {
            const otherPerMinute: string = other.perMinuteText ?? String(other.TempoInBpm);
            if (other.beatUnit === beatUnit && other.dotted === dotted &&
                (otherPerMinute === perMinute || Number(perMinute) === other.TempoInBpm)) {
                return true;
            }
        }
        return false;
    }

    /** The metronome mark already read for this staff at the given time of the measure, if any. */
    private metronomeMarkAt(currentMeasure: SourceMeasure, timestamp: Fraction): InstantaneousTempoExpression {
        const last: InstantaneousTempoExpression = this.lastMetronomeMark?.expression;
        if (last?.parentMeasure === currentMeasure && last.StaffNumber === this.staffNumber &&
            this.lastMetronomeMark.timestamp.Equals(timestamp)) {
            return last;
        }
        return undefined;
    }

    private readTempoTimestamp(offset: IXmlElement, sourceTimestamp: Fraction): Fraction {
        const timestamp: Fraction = sourceTimestamp.clone();
        if (offset) {
            const value: string = offset.value.trim();
            const divisions: number = Number(value);
            if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) && Number.isFinite(divisions)) {
                timestamp.Add(new Fraction(divisions, 4 * this.divisions));
            }
        }
        return timestamp;
    }

    private createNewTempoExpressionIfNeeded(currentMeasure: SourceMeasure): void {
        if (!this.currentMultiTempoExpression ||
            this.currentMultiTempoExpression.SourceMeasureParent !== currentMeasure ||
            this.currentMultiTempoExpression.Timestamp !== this.directionTimestamp) {
            this.currentMultiTempoExpression = new MultiTempoExpression(currentMeasure, Fraction.createFromFraction(this.directionTimestamp));
            this.currentMultiTempoExpression.PlaybackTimestamp = this.soundTimestamp?.clone();
            this.currentMultiTempoExpression.PlaybackTempoInBpm = this.explicitSoundTempo;
            currentMeasure.TempoExpressions.push(this.currentMultiTempoExpression);
        }
    }
    private addWedge(wedgeNode: IXmlElement, currentMeasure: SourceMeasure, inSourceMeasureCurrentFraction: Fraction): void {
        if (wedgeNode !== undefined && wedgeNode.hasAttributes) {
            const numberXml: number = this.readNumber(wedgeNode);
            const type: string = wedgeNode.attribute("type").value.toLowerCase();
            try {
                if (type === "crescendo" || type === "diminuendo") {
                    const continuousDynamicExpression: ContinuousDynamicExpression =
                        new ContinuousDynamicExpression(
                            ContDynamicEnum[type],
                            this.placement,
                            this.staffNumber,
                            currentMeasure,
                            numberXml);
                    this.lastWedge = continuousDynamicExpression;
                    this.lastWedge.YPosXml = this.WedgeYPosXml;
                    this.openContinuousDynamicExpressions.push(continuousDynamicExpression);
                    let multiExpression: MultiExpression = this.getMultiExpression;
                    if (!multiExpression) {
                        multiExpression = this.createNewMultiExpressionIfNeeded(currentMeasure, numberXml);
                    }
                    multiExpression.StartingContinuousDynamic = continuousDynamicExpression;
                    continuousDynamicExpression.StartMultiExpression = multiExpression;
                    if (this.activeInstantaneousDynamic !== undefined &&
                        this.activeInstantaneousDynamic.StaffNumber === continuousDynamicExpression.StaffNumber) {
                        this.activeInstantaneousDynamic = undefined;
                    }
                } else if (type === "stop") {
                    for (const openCont of this.openContinuousDynamicExpressions) {
                        if (openCont.NumberXml === numberXml) {
                            // if (openCont.NumberXml === numberXml) { // was there supposed to be another check here? someone wrote the same check twice.
                            this.closeOpenContinuousDynamic(openCont, currentMeasure, inSourceMeasureCurrentFraction);
                        }
                    }
                }
            } catch (ex) {
                const errorMsg: string = "ReaderErrorMessages/WedgeError" + ", Error while reading Crescendo / Diminuendo.";
                this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                log.debug("ExpressionReader.addWedge", errorMsg, ex);
            }
        }
    }
    private fillMultiOrTempoExpression(inputString: string, currentMeasure: SourceMeasure, inSourceMeasureCurrentFraction: Fraction,
        fontStyle: FontStyles, fontColor: string, defaultYXml: number = undefined, tempoFontStyle: FontStyles = undefined, language: string = undefined): void {
        if (!inputString) {
            return;
        }
        const tmpInputString: string = inputString.trim();
        // split string at enumerating words or signs
        //const splitStrings: string[] = tmpInputString.split(/([\s,\r\n]and[\s,\r\n]|[\s,\r\n]und[\s,\r\n]|[\s,\r\n]e[\s,\r\n]|[\s,\r\n])+/g);

        //for (const splitStr of splitStrings) {
        this.createExpressionFromString("", tmpInputString, currentMeasure, inSourceMeasureCurrentFraction, inputString, fontStyle, fontColor, defaultYXml,
                                        tempoFontStyle, language);
        //}
    }
    /*
    private splitStringRecursive(input: [string, string], stringSeparators: string[]): [string, string][] {
        let text: string = input[1];
        let lastSeparator: string = input[0];
        let resultList: [string, string][] = [];
        for (let idx: number = 0, len: number = stringSeparators.length; idx < len; ++idx) {
            let stringSeparator: string = stringSeparators[idx];
            if (text.indexOf(stringSeparator) < 0) {
                continue;
            }
            let splitStrings: string[] = text.split(stringSeparator, StringSplitOptions.RemoveEmptyEntries);

            if (splitStrings.length !== 0) {
                resultList.push(...this.splitStringRecursive([lastSeparator, splitStrings[0]], stringSeparators));
                for (let index: number = 1; index < splitStrings.length; index++) {
                    resultList.push(...this.splitStringRecursive([stringSeparator, splitStrings[index]], stringSeparators));
                }
            } else {
                resultList.push(["", stringSeparator]);
            }
            break;
        }
        if (resultList.length === 0) {
            resultList.push(input);
        }
        return resultList;
    }
    */
    private createExpressionFromString(prefix: string, stringTrimmed: string,
                                       currentMeasure: SourceMeasure, inSourceMeasureCurrentFraction, inputString: string,
                                       fontStyle: FontStyles,
                                       fontColor: string,
                                       defaultYXml: number = undefined,
                                       tempoFontStyle: FontStyles = undefined, language: string = undefined): boolean {
        // A multi-line <words> text is a tempo instruction only when its first line is one.
        // "La seconda volta\nmolto ritenuto" is a performance note that merely contains a tempo word
        // in its second line; classifying it as a tempo expression drew it on the first staff with
        // the tempo font and ignored its <staff> and placement.
        const tempoClassificationString: string = ExpressionReader.firstTextLine(stringTrimmed);
        const isInstantaneousTempo: boolean = InstantaneousTempoExpression.isInputStringInstantaneousTempo(tempoClassificationString);
        const isContinuousTempo: boolean = ContinuousTempoExpression.isInputStringContinuousTempo(tempoClassificationString);
        if (isInstantaneousTempo || isContinuousTempo) {
            // first check if there is already a tempo expression with the same function
            if (currentMeasure.TempoExpressions.length > 0) {
                for (let idx: number = 0, len: number = currentMeasure.TempoExpressions.length; idx < len; ++idx) {
                    const multiTempoExpression: MultiTempoExpression = currentMeasure.TempoExpressions[idx];
                    if (multiTempoExpression.Timestamp === this.directionTimestamp &&
                        multiTempoExpression.InstantaneousTempo !== undefined &&
                        multiTempoExpression.InstantaneousTempo.Label.indexOf(stringTrimmed) !== -1) {
                        return false;
                    }
                }
            }
            this.createNewTempoExpressionIfNeeded(currentMeasure); // TODO process fontStyle? (also for other expressions)
            this.currentMultiTempoExpression.CombinedExpressionsText = inputString;
            if (isInstantaneousTempo) {
                const instantaneousTempoExpression: InstantaneousTempoExpression = new InstantaneousTempoExpression(  stringTrimmed,
                                                                                                                      this.placement,
                                                                                                                      this.staffNumber,
                                                                                                                      this.soundTempo,
                                                                                                                      this.currentMultiTempoExpression);
                instantaneousTempoExpression.ColorXML = fontColor;
                instantaneousTempoExpression.fontStyle = tempoFontStyle;
                instantaneousTempoExpression.placementStaffIndex = this.placementStaffIndex();
                instantaneousTempoExpression.language = language;
                this.currentMultiTempoExpression.addExpression(instantaneousTempoExpression, prefix);
                this.addWordExpressionForDashes(instantaneousTempoExpression, inSourceMeasureCurrentFraction);
                return true;
            }
            if (isContinuousTempo) {
                const continuousTempoExpression: ContinuousTempoExpression = new ContinuousTempoExpression(
                    stringTrimmed,
                    this.placement,
                    this.staffNumber,
                    this.currentMultiTempoExpression);
                continuousTempoExpression.ColorXML = fontColor;
                continuousTempoExpression.fontStyle = tempoFontStyle;
                continuousTempoExpression.placementStaffIndex = this.placementStaffIndex();
                continuousTempoExpression.language = language;
                this.currentMultiTempoExpression.addExpression(continuousTempoExpression, prefix);
                this.addWordExpressionForDashes(continuousTempoExpression, inSourceMeasureCurrentFraction);
                return true;
            }
        }
        if (ContinuousDynamicExpression.isInputStringContinuousDynamic(stringTrimmed)) {
            // || InstantaneousDynamicExpression.isInputStringInstantaneousDynamic(stringTrimmed)
            //   looks like <words> never has instantaneous dynamics like p or sf, those are in <dynamics>.
            // if (InstantaneousDynamicExpression.isInputStringInstantaneousDynamic(stringTrimmed)) {
            //     if (this.openContinuousDynamicExpression !== undefined && !this.openContinuousDynamicExpression.EndMultiExpression) {
            //         this.closeOpenContinuousDynamic();
            //     }
            //     const instantaneousDynamicExpression: InstantaneousDynamicExpression =
            //         new InstantaneousDynamicExpression(
            //             stringTrimmed,
            //             this.soundDynamic,
            //             this.placement,
            //             this.staffNumber,
            //             currentMeasure);
            //     this.getMultiExpression.addExpression(instantaneousDynamicExpression, prefix);
            //     return true;
            // }
            // if (ContinuousDynamicExpression.isInputStringContinuousDynamic(stringTrimmed)) {
            const continuousDynamicExpression: ContinuousDynamicExpression =
                new ContinuousDynamicExpression(
                    undefined,
                    this.placement,
                    this.staffNumber,
                    currentMeasure,
                    -1,
                    stringTrimmed);
            continuousDynamicExpression.ColorXML = fontColor;
            continuousDynamicExpression.language = language;
            const openWordContinuousDynamic: MultiExpression = this.getMultiExpression;
            if (openWordContinuousDynamic) {
                this.closeOpenContinuousDynamic(openWordContinuousDynamic.StartingContinuousDynamic, currentMeasure, inSourceMeasureCurrentFraction);
            }
            this.createNewMultiExpressionIfNeeded(currentMeasure, -1);
            if (this.activeInstantaneousDynamic !== undefined && this.activeInstantaneousDynamic.StaffNumber === continuousDynamicExpression.StaffNumber) {
                this.activeInstantaneousDynamic = undefined;
            }
            this.openContinuousDynamicExpressions.push(continuousDynamicExpression);
            continuousDynamicExpression.StartMultiExpression = this.getMultiExpression;
            this.getMultiExpression.addExpression(continuousDynamicExpression, prefix);
            return true;
        }
        if (MoodExpression.isInputStringMood(stringTrimmed)) {
            const multiExpression: MultiExpression = this.createNewMultiExpressionIfNeeded(currentMeasure, -1);
            currentMeasure.hasMoodExpressions = true;
            const moodExpression: MoodExpression = new MoodExpression(stringTrimmed, this.placement, this.staffNumber);
            moodExpression.fontStyle = fontStyle;
            moodExpression.ColorXML = fontColor;
            moodExpression.language = language;
            multiExpression.addExpression(moodExpression, prefix);
            this.addWordExpressionForDashes(moodExpression, inSourceMeasureCurrentFraction);
            return true;
        }

        // create unknown:
        const unknownMultiExpression: MultiExpression = this.createNewMultiExpressionIfNeeded(currentMeasure, -1, inSourceMeasureCurrentFraction);
        // check here first if there might be a tempo expression doublette:
        if (currentMeasure.TempoExpressions.length > 0) {
            for (let idx: number = 0, len: number = currentMeasure.TempoExpressions.length; idx < len; ++idx) {
                const multiTempoExpression: MultiTempoExpression = currentMeasure.TempoExpressions[idx];
                if (multiTempoExpression.Timestamp === this.directionTimestamp &&
                    multiTempoExpression.InstantaneousTempo !== undefined &&
                    multiTempoExpression.EntriesList.length > 0 &&
                    !this.hasDigit(stringTrimmed)) {
                        // if at other parts of the score
                        if (this.globalStaffIndex > 0) {
                            // don't add duplicate TempoExpression
                            if (multiTempoExpression.EntriesList[0].label.indexOf(stringTrimmed) >= 0) {
                                return false;
                        } else {
                            break;
                        }
                    }
                }
            }
        }
        let textAlignment: TextAlignmentEnum = this.musicSheet.Rules.UnknownExpressionTextAlignment;
        if (this.musicSheet.Rules.CompactMode) {
            textAlignment = TextAlignmentEnum.LeftBottom;
        }
        const unknownExpression: UnknownExpression = new UnknownExpression(
            stringTrimmed, this.placement, textAlignment, this.staffNumber);
        unknownExpression.fontStyle = fontStyle;
        unknownExpression.ColorXML = fontColor;
        unknownExpression.language = language;
        unknownExpression.defaultYXml = defaultYXml;
        unknownExpression.parentMeasure = currentMeasure;
        unknownMultiExpression.addExpression(unknownExpression, prefix);
        this.addWordExpressionForDashes(unknownExpression, inSourceMeasureCurrentFraction);
        return false;
    }

    /**
     * Reads <dashes>: the dashed line that follows a text expression (e.g. "rit. - - -").
     * Exporters write the dashes either in the same <direction> as the <words> or in a separate <direction>,
     * possibly before the words. A start is attached to the word expression of the same staff and placement
     * at the same timestamp, or else to the last such word before it in the same measure.
     */
    private interpretDashes(dashesNode: IXmlElement, currentMeasure: SourceMeasure, timestamp: Fraction): void {
        const type: string = dashesNode.attribute("type")?.value;
        const numberXml: number = this.readNumber(dashesNode);
        if (type === "start") {
            const dashes: OpenDashes = {
                numberXml: numberXml,
                placement: this.placement,
                startMeasure: currentMeasure,
                startTimestamp: timestamp.clone(),
            };
            for (const word of this.wordExpressionsOfMeasure) {
                if (word.placement === dashes.placement && word.timestamp.Equals(timestamp)) {
                    dashes.expression = word.expression; // the last one wins
                }
            }
            this.openDashes.push(dashes);
        } else if (type === "stop") {
            for (let i: number = this.openDashes.length - 1; i >= 0; i--) {
                const dashes: OpenDashes = this.openDashes[i];
                if (dashes.numberXml === numberXml && !dashes.endMeasure) {
                    dashes.endMeasure = currentMeasure;
                    dashes.endTimestamp = timestamp.clone();
                    this.finishDashesIfComplete(dashes);
                    break;
                }
            }
        }
    }

    private addWordExpressionForDashes(expression: AbstractExpression, timestamp: Fraction): void {
        const position: WordExpressionPosition = {expression: expression, timestamp: timestamp.clone(), placement: this.placement};
        this.wordExpressionsOfMeasure.push(position);
        for (const dashes of this.openDashes.slice()) {
            if (!dashes.expression && dashes.startMeasure === this.dashesMeasure &&
                dashes.placement === position.placement && dashes.startTimestamp.Equals(position.timestamp)) {
                dashes.expression = expression;
                this.finishDashesIfComplete(dashes);
            }
        }
    }

    /** Called for each direction: when a new measure begins, dashes of the previous measure that found no word
     *  at their own timestamp are attached to the last word before them, or dropped. */
    private startMeasureForDashes(measure: SourceMeasure): void {
        if (measure === this.dashesMeasure) {
            return;
        }
        for (const dashes of this.openDashes.slice()) {
            if (dashes.expression || dashes.startMeasure === measure) {
                continue;
            }
            if (dashes.startMeasure === this.dashesMeasure) {
                for (const word of this.wordExpressionsOfMeasure) {
                    if (word.placement === dashes.placement && word.timestamp.lte(dashes.startTimestamp)) {
                        dashes.expression = word.expression;
                    }
                }
            }
            if (dashes.expression) {
                this.finishDashesIfComplete(dashes);
            } else {
                this.openDashes.splice(this.openDashes.indexOf(dashes), 1); // e.g. dashes after "cresc."
            }
        }
        this.dashesMeasure = measure;
        this.wordExpressionsOfMeasure = [];
    }

    private finishDashesIfComplete(dashes: OpenDashes): void {
        if (!dashes.expression || !dashes.endMeasure) {
            return;
        }
        dashes.expression.DashesEndMeasure = dashes.endMeasure;
        dashes.expression.DashesEndTimestamp = dashes.endTimestamp;
        this.openDashes.splice(this.openDashes.indexOf(dashes), 1);
    }
    private closeOpenContinuousDynamic(openContinuousDynamicExpression: ContinuousDynamicExpression, endMeasure: SourceMeasure, timestamp: Fraction): void {
        if (!openContinuousDynamicExpression) {
            return;
        }
        const numberXml: number = openContinuousDynamicExpression.NumberXml;
        openContinuousDynamicExpression.EndMultiExpression = this.createNewMultiExpressionIfNeeded(
            endMeasure, numberXml, timestamp);
        openContinuousDynamicExpression.StartMultiExpression.EndingContinuousDynamic = openContinuousDynamicExpression;
        this.openContinuousDynamicExpressions = this.openContinuousDynamicExpressions.filter(dyn => dyn !== openContinuousDynamicExpression);
    }
    private closeOpenContinuousTempo(endTimestamp: Fraction): void {
        this.openContinuousTempoExpression.AbsoluteEndTimestamp = endTimestamp;
        this.openContinuousTempoExpression = undefined;
    }
    private checkIfWordsNodeIsRepetitionInstruction(inputString: string): boolean {
        inputString = inputString.trim().toLowerCase();
        if (inputString === "coda" ||
            inputString === "tocoda" ||
            inputString === "to coda" ||
            inputString === "fine" ||
            inputString === "d.c." ||
            inputString === "dacapo" ||
            inputString === "da capo" ||
            inputString === "d.s." ||
            inputString === "dalsegno" ||
            inputString === "dal segno" ||
            inputString === "d.c. al fine" ||
            inputString === "d.s. al fine" ||
            inputString === "d.c. al coda" ||
            inputString === "d.s. al coda") {
            return true;
        }
        return false;
    }
    private hasDigit(input: string): boolean {
        return /\d/.test(input);
    }
}
