import { GraphicalVoiceLeadingGuide } from "./GraphicalVoiceLeadingGuide";
import {StaffLine} from "./StaffLine";
import {Instrument} from "../Instrument";
import {BoundingBox} from "./BoundingBox";
import {Fraction} from "../../Common/DataObjects/Fraction";
import {SourceMeasure} from "../VoiceData/SourceMeasure";
import {InstrumentalGroup} from "../InstrumentalGroup";
import {TextAlignmentEnum} from "../../Common/Enums/TextAlignment";
import {GraphicalMusicPage} from "./GraphicalMusicPage";
import {GraphicalLabel} from "./GraphicalLabel";
import {GraphicalMeasure} from "./GraphicalMeasure";
import {GraphicalObject} from "./GraphicalObject";
import {EngravingRules} from "./EngravingRules";
import {PointF2D} from "../../Common/DataObjects/PointF2D";
import {GraphicalStaffEntry} from "./GraphicalStaffEntry";
import {SystemLinesEnum} from "./SystemLinesEnum";
import { Dictionary } from "typescript-collections";
import {GraphicalComment} from "./GraphicalComment";
import {GraphicalMarkedArea} from "./GraphicalMarkedArea";
import {SystemLine} from "./SystemLine";
import {SystemLinePosition} from "./SystemLinePosition";
import {Staff} from "../VoiceData/Staff";
import { Label } from "../Label";

/**
 * A MusicSystem contains the [[StaffLine]]s for all instruments, until a line break
 */
export abstract class MusicSystem extends GraphicalObject {
    public needsToBeRedrawn: boolean = true;
    public rules: EngravingRules;
    protected parent: GraphicalMusicPage;
    protected id: number;
    protected staffLines: StaffLine[] = [];
    protected graphicalMeasures: GraphicalMeasure[][] = [];
    /** Dictionary of (Instruments and) labels.
     * note that the key needs to be unique, GraphicalLabel is not unique yet.
     * That is why the labels are labels.values() and not labels.keys().
     */
    protected labels: Dictionary<Instrument, GraphicalLabel> = new Dictionary<Instrument, GraphicalLabel>();
    protected groupLabels: Map<InstrumentalGroup, GraphicalLabel> = new Map<InstrumentalGroup, GraphicalLabel>();
    protected measureNumberLabels: GraphicalLabel[] = [];
    protected maxLabelLength: number;
    protected objectsToRedraw: [Object[], Object][] = [];
    protected instrumentBrackets: GraphicalObject[] = [];
    protected groupBrackets: GraphicalObject[] = [];
    protected graphicalMarkedAreas: GraphicalMarkedArea[] = [];
    protected graphicalComments: GraphicalComment[] = [];
    protected systemLines: SystemLine[] = [];
    public breaksPage: boolean = false;
    /** The voice leading guide lines of this system, as of its last draw (they are calculated at draw time,
     *  when all stafflines have their final positions). */
    public VoiceLeadingGuides: GraphicalVoiceLeadingGuide[] = [];

    constructor(id: number) {
        super();
        this.id = id;
        this.boundingBox = new BoundingBox(this);
        this.maxLabelLength = 0.0;
    }

    public get Parent(): GraphicalMusicPage {
        return this.parent;
    }

    public set Parent(value: GraphicalMusicPage) {
        // remove from old page
        if (this.parent) {
            const index: number = this.parent.MusicSystems.indexOf(this, 0);
            if (index > -1) {
                this.parent.MusicSystems.splice(index, 1);
            }
        }

        this.parent = value;
        this.boundingBox.Parent = value.PositionAndShape;
    }

    public get NextSystem(): MusicSystem {
        const idxInParent: number = this.Parent.MusicSystems.indexOf(this);
        return idxInParent !== this.Parent.MusicSystems.length ? this.Parent.MusicSystems[idxInParent + 1] : undefined;
    }

    public get StaffLines(): StaffLine[] {
        return this.staffLines;
    }

    /**
     * Labels the system again from its stafflines not hidden in it (StaffLine.hiddenInSystem), so a part taken out of
     * the system (removeHiddenStaffLines) leaves no room for its label before the staves (Nielsen Op. 57: the first
     * system indented by the names of the percussion staves hidden in it).
     * @returns whether it did
     */
    public relabelWithoutHiddenStaffLines(instrumentLabelTextHeight: number, systemLabelsRightMargin: number,
                                          labelMarginBorderFactor: number, isFirstSystem: boolean): boolean {
        const shown: StaffLine[] = this.staffLines.filter(line => !line.hiddenInSystem);
        if (shown.length === 0 || shown.length === this.staffLines.length) {
            return false;
        }
        this.createMusicSystemLabel(instrumentLabelTextHeight, systemLabelsRightMargin, labelMarginBorderFactor,
                                    isFirstSystem, shown);
        return true;
    }

    /**
     * Takes the stafflines out of the system whose staff the MusicXML hides in all measures of the system
     * (StaffLine.hiddenInSystem, see SourceMeasure.HiddenStaffIndices). A part label goes with the part's last staffline,
     * and the system lines (e.g. the barline joining the staves of a part) of their measures go too; the barlines drawn
     * between the staves are joined to the stafflines left (see reconnectAroundHiddenStaffLines()).
     * @returns whether one was taken out
     */
    public removeHiddenStaffLines(): boolean {
        const hidden: StaffLine[] = this.staffLines.filter(line => line.hiddenInSystem);
        const staffLinesBefore: StaffLine[] = this.staffLines.slice();
        for (const staffLine of hidden) {
            this.staffLines.splice(this.staffLines.indexOf(staffLine), 1);
            // (its box no longer counts for the system's borders)
            const childIndex: number = this.PositionAndShape.ChildElements.indexOf(staffLine.PositionAndShape);
            if (childIndex >= 0) {
                this.PositionAndShape.ChildElements.splice(childIndex, 1);
            }
            const instrument: Instrument = staffLine.ParentStaff.ParentInstrument;
            if (!this.staffLines.some(line => line.ParentStaff.ParentInstrument === instrument)) {
                const label: GraphicalLabel = this.labels.remove(instrument);
                const labelIndex: number = label ? this.PositionAndShape.ChildElements.indexOf(label.PositionAndShape) : -1;
                if (labelIndex >= 0) {
                    this.PositionAndShape.ChildElements.splice(labelIndex, 1);
                }
            }
            this.systemLines = this.systemLines.filter(line => line.parentTopStaffLine !== staffLine &&
                line.bottomMeasure?.ParentStaffLine !== staffLine);
        }
        if (hidden.length > 0) {
            this.reconnectAroundHiddenStaffLines(staffLinesBefore);
        }
        return hidden.length > 0;
    }

    /**
     * Joins the lines drawn between the staves (barlines, the system's left line) that ended at a staffline just taken out
     * of the system (removeHiddenStaffLines()) to the first and last staffline left between their ends.
     * @param staffLinesBefore the system's stafflines before the hidden ones were taken out, in order
     */
    protected reconnectAroundHiddenStaffLines(staffLinesBefore: StaffLine[]): void {
        // no impl here
    }
    public set StaffLines(value: StaffLine[]) {
        this.staffLines = value;
    }

    public get GraphicalMeasures(): GraphicalMeasure[][] {
        return this.graphicalMeasures;
    }

    public get MeasureNumberLabels(): GraphicalLabel[] {
        return this.measureNumberLabels;
    }

    public get Labels(): GraphicalLabel[] {
        return [...this.groupLabels.values(), ...this.labels.values()];
    }

    public get ObjectsToRedraw(): [Object[], Object][] {
        return this.objectsToRedraw;
    }

    public get InstrumentBrackets(): GraphicalObject[] {
        return this.instrumentBrackets;
    }

    public get GroupBrackets(): GraphicalObject[] {
        return this.groupBrackets;
    }

    public get GraphicalMarkedAreas(): GraphicalMarkedArea[] {
        return this.graphicalMarkedAreas;
    }

    public get GraphicalComments(): GraphicalComment[] {
        return this.graphicalComments;
    }

    public get SystemLines(): SystemLine[] {
        return this.systemLines;
    }

    public get Id(): number {
        return this.id;
    }

    public get MaxLabelLength(): number {
        return this.maxLabelLength;
    }

    /**
     * Create the left vertical Line connecting all staves of the [[MusicSystem]].
     * @param lineWidth
     * @param systemLabelsRightMargin
     */
    public createSystemLeftLine(lineWidth: number, systemLabelsRightMargin: number, isFirstSystem: boolean): void {
        let xPosition: number = -lineWidth / 2;
        if (isFirstSystem) {
            xPosition = this.maxLabelLength + systemLabelsRightMargin - lineWidth / 2;
        }
        const top: GraphicalMeasure = this.staffLines[0].Measures[0];
        let bottom: GraphicalMeasure = undefined;
        if (this.staffLines.length > 1) {
            bottom = this.staffLines[this.staffLines.length - 1].Measures[0];
        }
        const leftSystemLine: SystemLine = this.createSystemLine(xPosition, lineWidth, SystemLinesEnum.SingleThin,
                                                                 SystemLinePosition.MeasureBegin, this, top, bottom);
        this.SystemLines.push(leftSystemLine);
        leftSystemLine.PositionAndShape.RelativePosition = new PointF2D(xPosition, 0);
        leftSystemLine.PositionAndShape.BorderLeft = 0;
        leftSystemLine.PositionAndShape.BorderRight = lineWidth;
        leftSystemLine.PositionAndShape.BorderTop = leftSystemLine.PositionAndShape.Parent.BorderTop;
        leftSystemLine.PositionAndShape.BorderBottom = leftSystemLine.PositionAndShape.Parent.BorderBottom;
        // TODO this is arguably still too large for the systemline bbox, but at least not larger than the MusicSystem anymore.
        //   see https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1245
        this.createLinesForSystemLine(leftSystemLine);
    }

    /**
     * Create the vertical Lines after the End of all [[StaffLine]]'s Measures
     * @param xPosition
     * @param lineWidth
     * @param lineType
     * @param linePosition indicates if the line belongs to start or end of measure
     * @param measureIndex the measure index within the staffline
     * @param measure
     */
    public createVerticalLineForMeasure(xPosition: number, lineWidth: number, lineType: SystemLinesEnum, linePosition: SystemLinePosition,
                                        measureIndex: number, measure: GraphicalMeasure): void {
        //return; // TODO check why there's a bold line here for the double barline sample
        const staffLine: StaffLine = measure.ParentStaffLine;
        const staffLineRelative: PointF2D = new PointF2D(staffLine.PositionAndShape.RelativePosition.x,
                                                         staffLine.PositionAndShape.RelativePosition.y);
        // the part's first and last stafflines in the system (a staff hidden in the system is taken out later, and the line
        //   joined to the stafflines left, see reconnectAroundHiddenStaffLines(); osmd-dart makes it after, from those left)
        const partLines: StaffLine[] = this.staffLines.filter(line => line.ParentStaff.ParentInstrument === staffLine.ParentStaff.ParentInstrument);
        if (partLines[0] === staffLine) {
            let bottomMeasure: GraphicalMeasure = undefined;
            if (partLines.length > 1) {
                bottomMeasure = partLines[partLines.length - 1].Measures[measureIndex];
            }
            const singleVerticalLineAfterMeasure: SystemLine = this.createSystemLine(xPosition, lineWidth, lineType,
                                                                                     linePosition, this, measure, bottomMeasure);
            const systemXPosition: number = staffLineRelative.x + xPosition;
            singleVerticalLineAfterMeasure.PositionAndShape.RelativePosition = new PointF2D(systemXPosition, 0);
            singleVerticalLineAfterMeasure.PositionAndShape.BorderLeft = 0;
            singleVerticalLineAfterMeasure.PositionAndShape.BorderRight = lineWidth;
            this.SystemLines.push(singleVerticalLineAfterMeasure);
        }
    }

    /**
     * Set the y-Positions of all the system lines in the system and creates the graphical Lines and dots within.
     * @param rules
     */
    public setYPositionsToVerticalLineObjectsAndCreateLines(rules: EngravingRules): void {
        // empty
    }

    public calculateBorders(rules: EngravingRules): void {
        // empty
    }

    public alignBeginInstructions(): void {
        // empty
    }

    public GetLeftBorderAbsoluteXPosition(): number {
        return this.StaffLines[0].PositionAndShape.AbsolutePosition.x + this.StaffLines[0].Measures[0].beginInstructionsWidth;
    }

    public GetRightBorderAbsoluteXPosition(): number {
        return this.StaffLines[0].PositionAndShape.AbsolutePosition.x + this.StaffLines[0].StaffLines[0].End.x;
    }

    public AddGraphicalMeasures(graphicalMeasures: GraphicalMeasure[]): void {
        for (let idx: number = 0, len: number = graphicalMeasures.length; idx < len; ++idx) {
            const graphicalMeasure: GraphicalMeasure = graphicalMeasures[idx];
            graphicalMeasure.ParentMusicSystem = this;
        }
        this.graphicalMeasures.push(graphicalMeasures);
    }

    public GetSystemsFirstTimeStamp(): Fraction {
        return this.graphicalMeasures[0][0].parentSourceMeasure.AbsoluteTimestamp;
    }

    public GetSystemsLastTimeStamp(): Fraction {
        const m: SourceMeasure = this.graphicalMeasures[this.graphicalMeasures.length - 1][0].parentSourceMeasure;
        return Fraction.plus(m.AbsoluteTimestamp, m.Duration);
    }

    /**
     * Create an InstrumentBracket for each multiStave Instrument, from its first staffline in the system down to its last one:
     * a staff hidden in the system (removeHiddenStaffLines()) is not in it, so the brace joins the staves left, if there are
     * two or more of them (Glière, Horn Concerto Op. 91, piano: the horn staff above the piano's two shown in m85-93 only).
     * @param instruments
     * @param staffHeight
     */
    public createInstrumentBrackets(instruments: Instrument[], staffHeight: number): void {
        for (let idx: number = 0, len: number = instruments.length; idx < len; ++idx) {
            const instrument: Instrument = instruments[idx];
            if (instrument.Staves.length > 1) {
                let firstStaffLine: StaffLine = undefined, lastStaffLine: StaffLine = undefined;
                for (let idx2: number = 0, len2: number = this.staffLines.length; idx2 < len2; ++idx2) {
                    const staffLine: StaffLine = this.staffLines[idx2];
                    if (staffLine.ParentStaff.ParentInstrument === instrument && staffLine.ParentStaff.Visible) {
                        firstStaffLine = firstStaffLine ?? staffLine;
                        lastStaffLine = staffLine;
                    }
                }
                if (firstStaffLine && lastStaffLine && firstStaffLine !== lastStaffLine) {
                    this.createInstrumentBracket(firstStaffLine, lastStaffLine);
                }
            }
        }
    }

    /**
     * Create a GroupBracket for each [[InstrumentalGroup]], from the group's first staffline in the system down to its last
     * one, so the bracket of a group ending with a piano takes in both of the piano's staves, as in MusicXML (a part-group
     * groups whole parts) and MuseScore (before, it ended at the first staff of the last part): a part hidden in the system
     * (removeHiddenStaffLines()) is not in it, so the bracket joins the parts left, if there are two or more of them. Before,
     * it was only made when the first staff of the group's first and last parts were both in the system, so a hidden first
     * or last part took the whole bracket with it, as did a hidden top staff of a piano at either end, or a nested group
     * hidden at either end. Same rule as createInstrumentBrackets(); same as osmd-dart.
     * @param instrumentGroups
     * @param staffHeight
     * @param recursionDepth
     */
    public createGroupBrackets(instrumentGroups: InstrumentalGroup[], staffHeight: number, recursionDepth: number): void {
        for (let idx: number = 0, len: number = instrumentGroups.length; idx < len; ++idx) {
            const instrumentGroup: InstrumentalGroup = instrumentGroups[idx];
            if (instrumentGroup.InstrumentalGroups.length < 1) {
                continue;
            }
            const range: StaffLine[] = this.groupBracketRange(instrumentGroup, this.staffLines);
            if (range && instrumentGroup.GroupSymbol !== "none") {
                this.createGroupBracket(range[0], range[1], recursionDepth, instrumentGroup.GroupSymbol);
            }
            if (instrumentGroup.InstrumentalGroups.length < 1) {
                continue;
            }
            this.createGroupBrackets(instrumentGroup.InstrumentalGroups, staffHeight, recursionDepth + 1);
        }
    }

    /**
     * Create the Instrument's Labels (only for the first [[MusicSystem]] of the first MusicPage).
     * The labels created before are dropped. All of the system's stafflines are moved to the right of the labels;
     * whether the system has a single staff (part abbreviations) is judged on all of them.
     * @param instrumentLabelTextHeight
     * @param systemLabelsRightMargin
     * @param labelMarginBorderFactor
     * @param labelled the stafflines whose parts (and groups) get labels, all of the system's by default
     */
    public createMusicSystemLabel(  instrumentLabelTextHeight: number, systemLabelsRightMargin: number,
                                    labelMarginBorderFactor: number, isFirstSystem: boolean = false,
                                    labelled: StaffLine[] = this.staffLines): void {

        for (const label of [...this.labels.values(), ...this.groupLabels.values()]) {
            const childIndex: number = this.PositionAndShape.ChildElements.indexOf(label.PositionAndShape);
            if (childIndex >= 0) {
                this.PositionAndShape.ChildElements.splice(childIndex, 1);
            }
        }
        this.labels.clear();
        this.groupLabels.clear();
        const originalSystemLabelsRightMargin: number = systemLabelsRightMargin;
        const groupLabelsByDepth: GraphicalLabel[][] = [];
        const groups: InstrumentalGroup[] = labelled[0]?.ParentStaff.ParentInstrument.GetMusicSheet.InstrumentalGroups ?? [];
        this.createGroupLabels(groups, 0, isFirstSystem, instrumentLabelTextHeight, groupLabelsByDepth, labelled);
        for (let idx: number = 0, len: number = labelled.length; idx < len; ++idx) {
            const instrument: Instrument = labelled[idx].ParentStaff.ParentInstrument;
            let instrNameLabel: Label;
            if (isFirstSystem) {
                instrNameLabel = instrument.NameLabel;
                if (!this.rules.RenderPartNames || !instrNameLabel?.print || !instrNameLabel.text?.trim()) {
                    instrNameLabel = new Label("", instrument.NameLabel.textAlignment, instrument.NameLabel.font);
                    systemLabelsRightMargin = 0; // might affect lyricist/tempo placement. but without this there's still some extra x-spacing.
                }
            } else {
                if (!this.rules.RenderPartAbbreviations || !this.rules.RenderPartNames // don't render abbreviations if we don't render part names
                    || (this.staffLines.length === 1 && !this.rules.RenderPartAbbreviationsForSingleStaff)) {
                    return;
                }
                if (!instrument.PartAbbreviation?.trim() || !instrument.PartAbbreviationPrintObject) {
                    // no abbreviation to show for this part: no label, but the other parts still get theirs
                    systemLabelsRightMargin = 0; // restored below if another part's label takes space
                    continue;
                }
                const labelText: string = instrument.PartAbbreviation;
                // const labelText: string = instrument.NameLabel.text[0] + ".";
                instrNameLabel = new Label(labelText, instrument.NameLabel.textAlignment, instrument.NameLabel.font);
            }
            if (instrument?.NameLabel?.print) {
                const graphicalLabel: GraphicalLabel = new GraphicalLabel(
                    instrNameLabel, instrumentLabelTextHeight, TextAlignmentEnum.LeftCenter, this.rules, this.boundingBox
                );
                graphicalLabel.setLabelPositionAndShapeBorders();
                this.labels.setValue(instrument, graphicalLabel);
                // X is set after all group and part label widths are known; Y is set after staff spacing.
            } else {
                systemLabelsRightMargin = 0;
            }
        }

        // Group labels and part labels occupy separate columns; their combined width reserves system space.
        let labelX: number = 0;
        let hasPreviousColumn: boolean = false;
        for (const groupLabels of groupLabelsByDepth) {
            if (!groupLabels?.length) {
                continue;
            }
            if (hasPreviousColumn) {
                labelX += originalSystemLabelsRightMargin;
            }
            let columnWidth: number = 0;
            for (const label of groupLabels) {
                label.PositionAndShape.RelativePosition = new PointF2D(labelX, 0);
                columnWidth = Math.max(columnWidth, label.PositionAndShape.Size.width);
            }
            labelX += columnWidth;
            hasPreviousColumn = true;
        }
        // Only the labels of parts in a named group start after the group columns, so a group name takes room only
        //   beside its own parts (e.g. "Horns in F" before "1 2" fits within the width of "Bass Clarinet in Bb").
        const groupedPartX: number = hasPreviousColumn ? labelX + originalSystemLabelsRightMargin : 0;
        const labeledGroups: InstrumentalGroup[] = Array.from(this.groupLabels.keys());
        this.maxLabelLength = labelX;
        this.labels.forEach((instrument: Instrument, label: GraphicalLabel): void => {
            if (!label.Label.print || !label.Label.text?.trim()) {
                return;
            }
            const x: number = labeledGroups.some((group: InstrumentalGroup): boolean => this.instrumentBelongsToGroup(instrument, group))
                ? groupedPartX : 0;
            label.PositionAndShape.RelativePosition = new PointF2D(x, 0);
            this.maxLabelLength = Math.max(this.maxLabelLength, x + label.PositionAndShape.Size.width);
        });
        if (this.maxLabelLength > 0) {
            systemLabelsRightMargin = originalSystemLabelsRightMargin;
            // the labels keep from the brackets standing further left than a part brace the gap they keep from a part brace
            this.maxLabelLength += this.groupBracketsReachBeyondPartBrace(labelled);
        }
        this.updateMusicSystemStaffLineXPosition(systemLabelsRightMargin);
    }

    private createGroupLabels(groups: InstrumentalGroup[], depth: number, isFirstSystem: boolean,
                              textHeight: number, byDepth: GraphicalLabel[][], labelled: StaffLine[]): void {
        if (!this.rules.RenderPartGroupNames) {
            return;
        }
        for (const group of groups) {
            if (group instanceof Instrument) {
                continue;
            }
            const text: string = isFirstSystem ? group.Name : group.Abbreviation;
            const print: boolean = isFirstSystem ? group.PrintName && this.rules.RenderPartNames
                : group.PrintAbbreviation && this.rules.RenderPartNames && this.rules.RenderPartAbbreviations
                    && (this.staffLines.length !== 1 || this.rules.RenderPartAbbreviationsForSingleStaff);
            if (print && text?.trim() && this.staffLinesForGroup(group, labelled).length > 0) {
                const label: GraphicalLabel = new GraphicalLabel(
                    new Label(text), textHeight, TextAlignmentEnum.LeftCenter, this.rules, this.boundingBox
                );
                label.setLabelPositionAndShapeBorders();
                this.groupLabels.set(group, label);
                if (!byDepth[depth]) {
                    byDepth[depth] = [];
                }
                byDepth[depth].push(label);
            }
            this.createGroupLabels(group.InstrumentalGroups, depth + 1, isFirstSystem, textHeight, byDepth, labelled);
        }
    }

    private instrumentBelongsToGroup(instrument: Instrument, group: InstrumentalGroup): boolean {
        let parent: InstrumentalGroup = instrument.Parent;
        while (parent) {
            if (parent === group) {
                return true;
            }
            parent = parent.Parent;
        }
        return false;
    }

    private staffLinesForGroup(group: InstrumentalGroup, lines: StaffLine[] = this.staffLines): StaffLine[] {
        return lines.filter((line: StaffLine): boolean =>
            this.instrumentBelongsToGroup(line.ParentStaff.ParentInstrument, group));
    }

    /**
     * Set the Y-Positions for the MusicSystem's Labels.
     */
    public setMusicSystemLabelsYPosition(): void {
        this.groupLabels.forEach((value: GraphicalLabel, key: InstrumentalGroup): void => {
            const lines: StaffLine[] = this.staffLinesForGroup(key);
            if (lines.length > 0) {
                const firstY: number = lines[0].PositionAndShape.RelativePosition.y;
                const lastY: number = lines[lines.length - 1].PositionAndShape.RelativePosition.y;
                value.PositionAndShape.RelativePosition = new PointF2D(
                    value.PositionAndShape.RelativePosition.x, (firstY + lastY) / 2 + 2.0);
            }
        });
        this.labels.forEach((key: Instrument, value: GraphicalLabel): void => {
            let ypositionSum: number = 0;
            let staffCounter: number = 0;
            for (let i: number = 0; i < this.staffLines.length; i++) {
                if (this.staffLines[i].ParentStaff.ParentInstrument === key) {
                    for (let j: number = i; j < this.staffLines.length; j++) {
                        const staffLine: StaffLine = this.staffLines[j];
                        if (staffLine.ParentStaff.ParentInstrument !== key) {
                            break;
                        }
                        ypositionSum += staffLine.PositionAndShape.RelativePosition.y;
                        staffCounter++;
                    }
                    break;
                }
            }
            if (staffCounter > 0) {
                value.PositionAndShape.RelativePosition = new PointF2D(
                    value.PositionAndShape.RelativePosition.x, ypositionSum / staffCounter + 2.0);
            }
        });
    }

    /**
     * Check if two "adjacent" StaffLines have BOTH a StaffEntry with a StaffEntryLink.
     * This is needed for the y-spacing algorithm.
     * @returns {boolean}
     */
    public checkStaffEntriesForStaffEntryLink(): boolean {
        let first: boolean = false;
        let second: boolean = false;
        for (let i: number = 0; i < this.staffLines.length - 1; i++) {
            for (let idx: number = 0, len: number = this.staffLines[i].Measures.length; idx < len; ++idx) {
                const measure: GraphicalMeasure = this.staffLines[i].Measures[idx];
                for (let idx2: number = 0, len2: number = measure.staffEntries.length; idx2 < len2; ++idx2) {
                    const staffEntry: GraphicalStaffEntry = measure.staffEntries[idx2];
                    if (staffEntry.sourceStaffEntry.Link) {
                        first = true;
                    }
                }
            }
            for (let idx: number = 0, len: number = this.staffLines[i + 1].Measures.length; idx < len; ++idx) {
                const measure: GraphicalMeasure = this.staffLines[i + 1].Measures[idx];
                for (let idx2: number = 0, len2: number = measure.staffEntries.length; idx2 < len2; ++idx2) {
                    const staffEntry: GraphicalStaffEntry = measure.staffEntries[idx2];
                    if (staffEntry.sourceStaffEntry.Link) {
                        second = true;
                    }
                }
            }
        }
        if (first && second) {
            return true;
        }
        return false;
    }

    public getBottomStaffLine(topStaffLine: StaffLine): StaffLine {
        const staves: Staff[] = topStaffLine.ParentStaff.ParentInstrument.Staves;
        let lastStaff: Staff;
        for (let i: number = staves.length - 1; i >= 0; i--) {
            if (staves[i]?.Visible) {
                lastStaff = staves[i];
                break;
            }
        }
        for (const line of topStaffLine.ParentMusicSystem.staffLines) {
            if (line.ParentStaff === lastStaff) {
                return line;
            }
        }
        return undefined;
    }

    /**
     * Here the system line is generated, which acts as the container of graphical lines and dots that will be finally rendered.
     * It holds al the logical parameters of the system line.
     * @param xPosition The x position within the system
     * @param lineWidth The total x width
     * @param lineType The line type enum
     * @param linePosition indicates if the line belongs to start or end of measure
     * @param musicSystem
     * @param topMeasure
     * @param bottomMeasure
     */
    protected createSystemLine(xPosition: number, lineWidth: number, lineType: SystemLinesEnum, linePosition: SystemLinePosition,
                               musicSystem: MusicSystem, topMeasure: GraphicalMeasure, bottomMeasure: GraphicalMeasure = undefined): SystemLine {
        throw new Error("not implemented");
    }

    /**
     * Create all the graphical lines and dots needed to render a system line (e.g. bold-thin-dots..).
     * @param systemLine
     */
    protected createLinesForSystemLine(systemLine: SystemLine): void {
        //Empty
    }

    /**
     * Calculates the summed x-width of a possibly given Instrument Brace and/or Group Bracket(s).
     * @returns {number} the x-width
     */
    protected calcBracketsWidth(): number {
        let width: number = 0;
        for (let idx: number = 0, len: number = this.GroupBrackets.length; idx < len; ++idx) {
            const groupBracket: GraphicalObject = this.GroupBrackets[idx];
            width = Math.max(width, groupBracket.PositionAndShape.Size.width);
        }
        for (let idx2: number = 0, len2: number = this.InstrumentBrackets.length; idx2 < len2; ++idx2) {
            const instrumentBracket: GraphicalObject = this.InstrumentBrackets[idx2];
            width = Math.max(width, instrumentBracket.PositionAndShape.Size.width);
        }
        return width;
    }

    protected createInstrumentBracket(firstStaffLine: StaffLine, lastStaffLine: StaffLine): void {
        // no impl here
    }

    protected createGroupBracket(firstStaffLine: StaffLine, lastStaffLine: StaffLine,
                                 recursionDepth: number, groupSymbol: string): void {
        // no impl here
    }

    /**
     * The first and last stafflines of a group's bracket among the given stafflines (see createGroupBrackets()), or undefined
     * when the group has no bracket there (fewer than two of its parts in them).
     */
    private groupBracketRange(instrumentGroup: InstrumentalGroup, staffLines: StaffLine[]): StaffLine[] {
        const instruments: Set<Instrument> = this.instrumentsInInstrumentalGroup(instrumentGroup);
        const lines: StaffLine[] = staffLines.filter(line => instruments.has(line.ParentStaff.ParentInstrument) && line.ParentStaff.Visible);
        if (lines.length === 0 || lines[0].ParentStaff.ParentInstrument === lines[lines.length - 1].ParentStaff.ParentInstrument) {
            return undefined;
        }
        return [lines[0], lines[lines.length - 1]];
    }

    /**
     * How much further left than a part brace (in units) the group brackets of the system and the part braces inside them
     * reach when drawn beside the given stafflines (createGroupBrackets()): a nested group stands left of its outer group,
     * and a part brace inside a group left of the group's bracket. The labels move left by as much, so they keep the gap
     * they have from a part brace (a piano in a nested group: the brace 1.0 further left).
     */
    private groupBracketsReachBeyondPartBrace(staffLines: StaffLine[]): number {
        let reach: number = 0;
        const reachOfGroups: (groups: InstrumentalGroup[], depth: number) => void = (groups, depth) => {
            for (const group of groups) {
                if (group.InstrumentalGroups.length < 1) {
                    continue;
                }
                const range: StaffLine[] = this.groupBracketRange(group, staffLines);
                if (range && group.GroupSymbol !== "none") {
                    reach = Math.max(reach, this.groupBracketReach(group.GroupSymbol, depth));
                    for (const instrument of this.instrumentsInInstrumentalGroup(group)) {
                        if (staffLines.filter(line => line.ParentStaff.ParentInstrument === instrument && line.ParentStaff.Visible).length > 1) {
                            reach = Math.max(reach, this.partBraceReach(depth + 1));
                        }
                    }
                }
                reachOfGroups(group.InstrumentalGroups, depth + 1);
            }
        };
        reachOfGroups(staffLines[0]?.ParentStaff.ParentInstrument.GetMusicSheet.InstrumentalGroups ?? [], 0);
        return Math.max(0, reach - this.partBraceReach(0));
    }

    /** How far left of the staves (in units) a group's bracket of the given symbol reaches at the given nesting depth. */
    protected groupBracketReach(groupSymbol: string, depth: number): number {
        return 0;
    }

    /** How far left of the staves (in units) a part brace reaches, moved left of the brackets of the given number of groups. */
    protected partBraceReach(columns: number): number {
        return 0;
    }

    /** The parts of an [[InstrumentalGroup]], also those of the groups nested in it. */
    private instrumentsInInstrumentalGroup(instrumentalGroup: InstrumentalGroup, instruments: Set<Instrument> = new Set()): Set<Instrument> {
        for (const groupOrInstrument of instrumentalGroup.InstrumentalGroups) {
            if (groupOrInstrument instanceof Instrument) {
                instruments.add(groupOrInstrument);
            } else {
                this.instrumentsInInstrumentalGroup(groupOrInstrument, instruments);
            }
        }
        return instruments;
    }

    /**
     * Update the xPosition of the [[MusicSystem]]'s [[StaffLine]]'s due to [[Label]] positioning.
     * @param systemLabelsRightMargin
     */
    private updateMusicSystemStaffLineXPosition(systemLabelsRightMargin: number): void {
        for (let idx: number = 0, len: number = this.StaffLines.length; idx < len; ++idx) {
            const staffLine: StaffLine = this.StaffLines[idx];
            const relative: PointF2D = staffLine.PositionAndShape.RelativePosition;
            relative.x = this.maxLabelLength + systemLabelsRightMargin;
            staffLine.PositionAndShape.RelativePosition = relative;
            staffLine.PositionAndShape.BorderRight = this.boundingBox.Size.width - this.maxLabelLength - systemLabelsRightMargin;
            for (let i: number = 0; i < staffLine.StaffLines.length; i++) {
                const lineEnd: PointF2D = new PointF2D(staffLine.PositionAndShape.Size.width, staffLine.StaffLines[i].End.y);
                staffLine.StaffLines[i].End = lineEnd;
            }
        }
    }
}
