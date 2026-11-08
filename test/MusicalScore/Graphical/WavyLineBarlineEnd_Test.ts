import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowVibratoBracket } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVibratoBracket";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import Vex from "vexflow";

/**
 * Wavy lines from the 81sabo review rows of bundle B5 (11-07), same as osmd-dart's test/wavy_line_barline_end_test.dart and
 * test/wavy_bracket_below_test.dart:
 * - a trill line stopping on the first note of the next measure, the note the trill resolves to, ends at the barline
 *   (Mozart K.313 I m208→209, Berwald Op.2 m74→75): it ran over that note, after a system break as a fragment at the start
 *   of the next system, and on one system raised over «Tutti» and f over the note; a line stopping on the tied continuation
 *   of its note still runs over it;
 * - a line goes through its tr, not through an accidental mark over the tr (K.313 I m137);
 * - a mark raised with its line over a slur sits at the line (Berwald Op.2 m24·74: the mark went up again by its own raise
 *   over the slur, away from its line);
 * - a `<bracket line-type="wavy">` is a wavy line under the staff from its start note to its stop time (Sperger, Sonata
 *   for violone and basso, Adagio m11–14 and Trio I m1–24: it was not drawn).
 */
describe("Wavy lines (bundle B5)", () => {
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

    async function render(name: string, width?: number): Promise<VexFlowVibratoBracket[]> {
        if (width) {
            container.style.width = `${width}px`;
        }
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
    /** The trill mark's glyph as drawn: its baseline and top (the bottom-left origin of the glyph and its height). */
    function drawnTrill(bracket: VexFlowVibratoBracket): { baseline: number, top: number } {
        const mark: any = (bracket.startNote as any).modifiers.find((modifier: any) => modifier?.type === "tr");
        const { y } = mark.getRenderXY();
        return { baseline: y, top: y - mark.glyph.getMetrics().height };
    }

    it("a line stopping on the next measure's first note ends at the barline", async () => {
        const brackets: VexFlowVibratoBracket[] = await render("test_wavy_line_barline_end");
        expect(brackets.length).to.equal(4);
        const resolved: VexFlowVibratoBracket = brackets[0];
        expect(measure(resolved, true)).to.equal(1);
        expect(measure(resolved, false)).to.equal(1);
        expect(resolved.ToEndOfStopStave).to.equal(true);
        // not raised over «Tutti» and f over the stop note
        expect(resolved.startNote.getStave().options.top_text_position).to.equal(1);
        const tied: VexFlowVibratoBracket = brackets[1];
        expect(measure(tied, true)).to.equal(3);
        expect(measure(tied, false)).to.equal(4);
    });

    it("leaves no fragment of a line ending at the barline after a system break", async () => {
        const brackets: VexFlowVibratoBracket[] = await render("test_wavy_line_barline_end", 330);
        const pieces: VexFlowVibratoBracket[] = brackets.filter(bracket => measure(bracket, true) <= 2);
        expect(pieces.length).to.equal(1);
        expect(measure(pieces[0], false)).to.equal(1);
    });

    it("goes through the tr, not the accidental mark over it", async () => {
        const brackets: VexFlowVibratoBracket[] = await render("test_wavy_line_barline_end");
        const bracket: VexFlowVibratoBracket = brackets[2];
        expect(measure(bracket, true)).to.equal(5);
        const mark: { baseline: number, top: number } = drawnTrill(bracket);
        expect(lineY(bracket), "under the glyph's top").to.be.greaterThan(mark.top);
        expect(lineY(bracket), "over its baseline").to.be.lessThan(mark.baseline);
    });

    it("keeps a mark raised with its line over a slur at the line", async () => {
        const brackets: VexFlowVibratoBracket[] = await render("test_wavy_line_barline_end");
        const bracket: VexFlowVibratoBracket = brackets[3];
        expect(measure(bracket, true)).to.equal(6);
        // (by its line, the mark by its y_shift; the stave's top text position stays, since upstream 2.3.0)
        expect(bracket.line, "raised over the slur to A5").to.be.greaterThan(1);
        expect(bracket.startNote.getStave().options.top_text_position).to.equal(1);
        const mark: { baseline: number, top: number } = drawnTrill(bracket);
        const distance: number = mark.baseline - lineY(bracket);
        expect(distance, `mark baseline ${mark.baseline}, line ${lineY(bracket)}`).to.be.within(3, 10);
    });

    it("draws a wavy bracket under the staff to its stop", async () => {
        const brackets: VexFlowVibratoBracket[] = await render("test_wavy_bracket_below");
        expect(brackets.length, "the two wavy brackets only").to.equal(2);
        for (const bracket of brackets) {
            expect(bracket.getWavyLine.IsBracket).to.equal(true);
            expect(bracket.getWavyLine.Placement).to.equal(PlacementEnum.Below);
            const stave: Vex.Flow.Stave = bracket.startNote.getStave();
            expect(stave.getYForLine(bracket.belowLine), "under the bottom line").to.be.greaterThan(stave.getYForLine(4) + 10);
        }
        const first: VexFlowVibratoBracket = brackets[0];
        expect(measure(first, true)).to.equal(1);
        expect(measure(first, false)).to.equal(2);
        expect(first.ToEndOfStopStave, "stop at the end of m2").to.equal(true);
        expect(first.belowLine, "under A3 (line 6)").to.be.greaterThan(7);
        const second: VexFlowVibratoBracket = brackets[1];
        expect(measure(second, true)).to.equal(3);
        expect(second.belowLine, "under the stems down to line 5").to.be.greaterThan(5.5);
        expect((second.startNote as any).keys[0]).to.match(/^dn?\/5/);
        expect(second.stopBeforeEndNote).to.equal(true);
        expect((second.endNote as any).keys[0]).to.match(/^fn?\/5/);
    });
});
