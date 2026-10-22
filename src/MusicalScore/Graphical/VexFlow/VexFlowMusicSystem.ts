import Vex from "vexflow";
import VF = Vex.Flow;
import {MusicSystem} from "../MusicSystem";
import {SystemLinesEnum} from "../SystemLinesEnum";
import {SystemLinePosition} from "../SystemLinePosition";
import {GraphicalMeasure} from "../GraphicalMeasure";
import {SystemLine} from "../SystemLine";
import {VexFlowStaffLine} from "./VexFlowStaffLine";
import {VexFlowMeasure} from "./VexFlowMeasure";
import {VexFlowConverter} from "./VexFlowConverter";
import {StaffLine} from "../StaffLine";
import {EngravingRules} from "../EngravingRules";
import { VexFlowInstrumentBracket } from "./VexFlowInstrumentBracket";
import { VexFlowInstrumentBrace } from "./VexFlowInstrumentBrace";
import { SkyBottomLineCalculator } from "../SkyBottomLineCalculator";

export class VexFlowMusicSystem extends MusicSystem {
    constructor(id: number, rules: EngravingRules) {
        super(id);
        this.rules = rules;
    }

    public calculateBorders(rules: EngravingRules): void {
        if (this.staffLines.length === 0) {
            return;
        }
        const width: number = this.calcBracketsWidth();
        this.boundingBox.BorderLeft = -width;
        this.boundingBox.BorderMarginLeft = -width;
        //this.boundingBox.BorderRight = this.rules.SystemRightMargin;
        this.boundingBox.XBordersHaveBeenSet = true;

        const topSkyBottomLineCalculator: SkyBottomLineCalculator = this.staffLines[0].SkyBottomLineCalculator;
        const top: number = topSkyBottomLineCalculator.getSkyLineMin();
        this.boundingBox.BorderTop = top;
        this.boundingBox.BorderMarginTop = top;

        const lastStaffLine: StaffLine = this.staffLines[this.staffLines.length - 1];
        const bottomSkyBottomLineCalculator: SkyBottomLineCalculator = lastStaffLine.SkyBottomLineCalculator;
        const bottom: number = bottomSkyBottomLineCalculator.getBottomLineMax()
                    + lastStaffLine.PositionAndShape.RelativePosition.y;
        this.boundingBox.BorderBottom = bottom;
        this.boundingBox.BorderMarginBottom = bottom;

        this.boundingBox.XBordersHaveBeenSet = true;
        this.boundingBox.YBordersHaveBeenSet = true;
    }

    /**
     * A StaveConnector (VexFlowMeasure.lineTo()) is drawn with its bottom measure from the stave of its top measure. One that
     * ends at a staffline taken out of the system (hidden in all of its measures) is joined to the first and last staffline left
     * between its ends instead, or dropped where fewer than two are left. Before, a hidden top staff, whose stave is never drawn
     * and so never placed, drew each barline of the system from the page top (Glière, Op. 91, piano, its top staff shown in
     * m85-93 only), and a hidden bottom staff took the barlines between the other staves with it. Same as osmd-dart.
     */
    protected reconnectAroundHiddenStaffLines(staffLinesBefore: StaffLine[]): void {
        const staveAt: Map<VF.Stave, [number, number]> = new Map();
        staffLinesBefore.forEach((staffLine, lineIndex) => {
            staffLine.Measures.forEach((measure, measureIndex) => {
                const stave: VF.Stave = (measure as VexFlowMeasure).getVFStave?.();
                if (stave) {
                    staveAt.set(stave, [lineIndex, measureIndex]);
                }
            });
        });
        const moved: [VexFlowMeasure, VF.StaveConnector][] = [];
        for (const staffLine of staffLinesBefore) {
            for (const measure of staffLine.Measures) {
                const vfMeasure: VexFlowMeasure = measure as VexFlowMeasure;
                if (!vfMeasure.Connectors?.length) {
                    continue;
                }
                vfMeasure.Connectors = vfMeasure.Connectors.filter(connector => {
                    const top: [number, number] = staveAt.get((connector as any).top_stave);
                    const bottom: [number, number] = staveAt.get((connector as any).bottom_stave);
                    if (!top || !bottom || (!staffLinesBefore[top[0]].hiddenInSystem && !staffLinesBefore[bottom[0]].hiddenInSystem)) {
                        return true;
                    }
                    const left: StaffLine[] = staffLinesBefore.slice(top[0], bottom[0] + 1).filter(line => !line.hiddenInSystem);
                    if (left.length >= 2) {
                        const newTop: VexFlowMeasure = left[0].Measures[top[1]] as VexFlowMeasure;
                        const newBottom: VexFlowMeasure = left[left.length - 1].Measures[bottom[1]] as VexFlowMeasure;
                        if (newTop && newBottom) {
                            (connector as any).top_stave = newTop.getVFStave();
                            (connector as any).bottom_stave = newBottom.getVFStave();
                            moved.push([newBottom, connector]);
                        }
                    }
                    return false;
                });
            }
        }
        for (const [measure, connector] of moved) {
            measure.Connectors.push(connector);
        }
    }

    /**
     * This method creates all the graphical lines and dots needed to render a system line (e.g. bold-thin-dots..).
     * @param xPosition
     * @param lineWidth
     * @param lineType
     * @param linePosition indicates if the line belongs to start or end of measure
     * @param musicSystem
     * @param topMeasure
     * @param bottomMeasure
     */
    protected createSystemLine(xPosition: number, lineWidth: number, lineType: SystemLinesEnum, linePosition: SystemLinePosition,
                               musicSystem: MusicSystem, topMeasure: GraphicalMeasure, bottomMeasure: GraphicalMeasure = undefined): SystemLine {
        const vfTopMeasure: VexFlowMeasure = topMeasure as VexFlowMeasure;
        let renderInitialLine: boolean = false;

        if (bottomMeasure) {
            renderInitialLine = true;
            // Set bar types on both staves before creating connectors,
            // so VexFlow's stave formatting is aware of the REPEAT_BEGIN barline.
            (bottomMeasure as VexFlowMeasure).addMeasureLine(lineType, linePosition);
            if (vfTopMeasure) {
                vfTopMeasure.addMeasureLine(lineType, linePosition, renderInitialLine);
            }

            // For begin repeat barlines on measures with begin instructions (clef, key, time signature),
            // shift the StaveConnector past the begin instructions so it aligns with the repeat barline
            // rather than drawing at the stave's leftmost x position.
            let connectorXShift: number = 0;
            if (lineType === SystemLinesEnum.BoldThinDots && linePosition === SystemLinePosition.MeasureBegin
                && topMeasure.beginInstructionsWidth > 0) {
                connectorXShift = vfTopMeasure.getVFStave().getModifierXShift(0);
            }

            // create here the correct lines according to the given lineType.
            (bottomMeasure as VexFlowMeasure).lineTo(
                topMeasure as VexFlowMeasure, VexFlowConverter.line(lineType, linePosition), connectorXShift);
            //Double repeat. VF doesn't have concept of double repeat. Need to add stave connector to begin of next measure
            if (lineType === SystemLinesEnum.DotsBoldBoldDots) {
                const nextIndex: number = bottomMeasure.ParentStaffLine.Measures.indexOf(bottomMeasure) + 1;
                const nextBottomMeasure: VexFlowMeasure = bottomMeasure.ParentStaffLine.Measures[nextIndex] as VexFlowMeasure;
                const nextTopMeasure: VexFlowMeasure = topMeasure.ParentStaffLine.Measures[nextIndex] as VexFlowMeasure;
                if (nextBottomMeasure && nextTopMeasure) {
                    nextBottomMeasure.lineTo(nextTopMeasure, VexFlowConverter.line(SystemLinesEnum.BoldThinDots, linePosition));
                    nextBottomMeasure.addMeasureLine(SystemLinesEnum.BoldThinDots, linePosition);
                }
            }
        } else if (vfTopMeasure) {
            vfTopMeasure.addMeasureLine(lineType, linePosition, renderInitialLine);
        }

        return new SystemLine(lineType, linePosition, this, topMeasure, bottomMeasure);
    }

    /**
     * creates an instrument brace for the given dimension.
     * The height and positioning can be inferred from the given staff lines.
     * @param firstStaffLine the upper StaffLine (use a cast to get the VexFlowStaffLine) of the brace to create
     * @param lastStaffLine the lower StaffLine (use a cast to get the VexFlowStaffLine) of the brace to create
     */
    protected createInstrumentBracket(firstStaffLine: StaffLine, lastStaffLine: StaffLine): void {
        // You could write this in one line but the linter doesn't let me.
        const firstVexStaff: VexFlowStaffLine = (firstStaffLine as VexFlowStaffLine);
        const lastVexStaff: VexFlowStaffLine = (lastStaffLine as VexFlowStaffLine);
        const vexFlowBracket: VexFlowInstrumentBrace = new VexFlowInstrumentBrace(firstVexStaff, lastVexStaff);
        this.InstrumentBrackets.push(vexFlowBracket);
        return;
    }

    /**
     * creates an instrument group bracket for the given dimension.
     * There can be cascaded bracket (e.g. a group of 2 in a group of 4) -
     * The recursion depth informs about the current depth level (needed for positioning)
     * @param firstStaffLine the upper staff line of the bracket to create
     * @param lastStaffLine the lower staff line of the bracket to create
     * @param recursionDepth
     */
    protected createGroupBracket(firstStaffLine: StaffLine, lastStaffLine: StaffLine,
                                 recursionDepth: number, groupSymbol: string): void {
        const firstVexStaff: VexFlowStaffLine = (firstStaffLine as VexFlowStaffLine);
        const lastVexStaff: VexFlowStaffLine = (lastStaffLine as VexFlowStaffLine);
        if (groupSymbol === "brace" || (!groupSymbol && recursionDepth > 0)) {
            const vexFlowBrace: VexFlowInstrumentBrace = new VexFlowInstrumentBrace(firstVexStaff, lastVexStaff, recursionDepth);
            this.GroupBrackets.push(vexFlowBrace);
        } else {
            const vexFlowBracket: VexFlowInstrumentBracket = new VexFlowInstrumentBracket(firstVexStaff, lastVexStaff, recursionDepth);
            this.GroupBrackets.push(vexFlowBracket);
        }
        return;
    }
}
