import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowVibratoBracket } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVibratoBracket";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { GraphicalLabel } from "../../../src/MusicalScore/Graphical/GraphicalLabel";
import Vex from "vexflow";

/**
 * Trill wavy lines from the 81sabo review rows of bundle C (10-24), same as osmd-dart's
 * test/wavy_line_stop_before_trill_test.dart:
 * - a line stopping on a note that starts a trill of its own ends in front of that note's trill mark (Weber Op.74 III
 *   m235–237, Schubert Ganymed piano m56–57): it was drawn to the end of the note, through the next trill mark, and
 *   raised over everything on that note;
 * - a `<barline>` `<wavy-line type="stop">` ends the line at the measure's end (Dittersdorf D major bass concerto Full
 *   m54): it ran from the first measure to the end of the score;
 * - a measure number under the line is raised over it, as over a slur, and the line stays at its mark (Nielsen Op.57
 *   m593·595, Viotti No.22 III m348): the line went up over the number, away from its mark;
 * - a line raised over something higher along it is drawn at VexFlow line 1 of the raised top text position, where
 *   VexFlow puts the mark too (Mozart K.313 III m263, Ganymed m58).
 */
describe("Trill wavy lines (bundle C)", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(() => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    async function render(name: string, configure?: (osmd: OpenSheetMusicDisplay) => void): Promise<VexFlowVibratoBracket[]> {
        configure?.(osmd);
        await osmd.load(TestUtils.getScore(`${name}.musicxml`));
        osmd.render();
        const result: VexFlowVibratoBracket[] = [];
        for (const page of osmd.GraphicSheet.MusicPages) {
            for (const system of page.MusicSystems) {
                for (const staffLine of system.StaffLines as StaffLine[]) {
                    result.push(...(staffLine.WavyLines as VexFlowVibratoBracket[]));
                }
            }
        }
        return result;
    }
    function measure(bracket: VexFlowVibratoBracket, start: boolean): number {
        return (start ? bracket.startVfVoiceEntry : bracket.endVfVoiceEntry).parentStaffEntry.parentMeasure.MeasureNumber;
    }
    function lineY(bracket: VexFlowVibratoBracket): number {
        return bracket.startNote.getStave().getYForTopText(bracket.line);
    }
    function trillInk(note: any): any {
        return (Vex.Flow.VibratoBracket as any).trillMarkInkPx(note);
    }

    it("ends in front of a stop note that starts a trill of its own", async () => {
        const brackets: VexFlowVibratoBracket[] = await render("test_wavy_line_stop_before_trill");
        expect(brackets.length).to.equal(2);
        const first: VexFlowVibratoBracket = brackets[0];
        expect(measure(first, true)).to.equal(1);
        expect(measure(first, false)).to.equal(1);
        expect(first.stopBeforeEndNote).to.equal(true);
        expect(first.ToEndOfStopStave).to.equal(false);
        const stopX: number = (Vex.Flow.VibratoBracket as any).stopBeforeNoteX(first.endNote);
        const ink: any = trillInk(first.endNote);
        expect(ink, "the stop note's trill mark ink").to.not.equal(undefined);
        expect(stopX, "in front of the next trill mark").to.be.lessThan(ink.left);
        expect(stopX).to.be.lessThan(first.endNote.getAbsoluteX());
        // at its mark: nothing on the stop note raised it
        expect(first.startNote.getStave().options.top_text_position).to.equal(1);
        const second: VexFlowVibratoBracket = brackets[1];
        expect(measure(second, true)).to.equal(1);
        expect(measure(second, false)).to.equal(2);
        expect(second.stopBeforeEndNote).to.equal(false);
    });

    it("a wavy-line stop in the barline ends the line at the measure end", async () => {
        const brackets: VexFlowVibratoBracket[] = await render("test_wavy_line_barline_stop");
        expect(brackets.length).to.equal(1);
        const bracket: VexFlowVibratoBracket = brackets[0];
        expect(measure(bracket, true)).to.equal(1);
        expect(measure(bracket, false)).to.equal(1);
        expect(bracket.ToEndOfStopStave).to.equal(true);
        expect(bracket.getWavyLine.ParentEndMultiExpression.SourceMeasureParent.MeasureNumber).to.equal(1);
    });

    it("a measure number under the line is raised over it", async () => {
        const brackets: VexFlowVibratoBracket[] = await render("test_wavy_line_measure_number", (o: OpenSheetMusicDisplay): void => {
            o.EngravingRules.MeasureNumberLabelOffset = 1; // a number over every measure
        });
        expect(brackets.length).to.equal(1);
        const bracket: VexFlowVibratoBracket = brackets[0];
        expect(measure(bracket, true)).to.equal(2);
        expect(measure(bracket, false)).to.equal(4);
        // the line stays at its mark
        expect(bracket.startNote.getStave().options.top_text_position).to.equal(1);
        const labels: GraphicalLabel[] = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].MeasureNumberLabels
            .filter((label: GraphicalLabel) => label.Label.text === "3");
        expect(labels.length, "the number of m3").to.equal(1);
        const box: any = labels[0].PositionAndShape;
        const labelBottom: number = box.AbsolutePosition.y + box.BorderMarginBottom;
        // over the line's ink (half the box height over its y, plus the clearance), in units
        expect(labelBottom, `number bottom ${labelBottom}, line y ${lineY(bracket) / 10}`)
            .to.be.at.most(lineY(bracket) / 10 - 0.6 - 0.2 + 0.01);
    });

    it("a line raised over something higher goes to the raised top text position with its mark", async () => {
        const brackets: VexFlowVibratoBracket[] = await render("test_wavy_line_raised_trill");
        expect(brackets.length).to.equal(1);
        const bracket: VexFlowVibratoBracket = brackets[0];
        const stave: any = bracket.startNote.getStave();
        expect(stave.options.top_text_position).to.be.greaterThan(1);
        expect(bracket.line).to.equal(1);
        expect(lineY(bracket)).to.be.closeTo(stave.getYForTopText(1), 0.01);
    });
});
