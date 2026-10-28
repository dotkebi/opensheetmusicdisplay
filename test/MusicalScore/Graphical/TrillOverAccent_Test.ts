import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowVibratoBracket } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVibratoBracket";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";

/**
 * A trill mark stacked over an accent (81sabo WIII-RENDER09, Weber Op.74 III m135 and m137), same as osmd-dart's
 * test/trill_over_accent_test.dart:
 * - over a stave top text position a raised wavy line moved up, the mark is at its text line there (1.5 over an
 *   accent; VexFlow 1.2.93, trillTextLine 5fbfa9de), which osmd-dart now does too;
 * - an accent moved over the slur starting at its note takes the trill mark (with its accidental mark and wavy line)
 *   over it (user decision 10-28, D1 1): the mark stayed where the accent had been and was drawn on it (m135).
 */
describe("Trill mark over an accent", () => {
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

    async function render(name: string, width: number): Promise<void> {
        container.style.width = `${width}px`;
        await osmd.load(TestUtils.getScore(`${name}.musicxml`));
        osmd.render();
    }
    function note(measureIndex: number): any {
        const entry: VexFlowVoiceEntry = osmd.GraphicSheet.MeasureList[measureIndex][0].staffEntries[0]
            .graphicalVoiceEntries[0] as VexFlowVoiceEntry;
        return entry.vfStaveNote;
    }
    function trill(staveNote: any): any {
        return staveNote.getModifiers().find((modifier: any) => modifier.type === "tr");
    }
    /** The trill mark's ink as drawn (with its accidental mark), in staff spaces from the top line. */
    function trillInk(staveNote: any): { top: number, bottom: number } {
        const mark: any = trill(staveNote);
        const space: number = staveNote.getStave().getSpacingBetweenLines();
        const shift: number = mark.slurClearanceYShift ?? 0;
        return { top: (mark.layoutInk.top + shift) / space, bottom: (mark.layoutInk.bottom + shift) / space };
    }
    /** The accent's ink as drawn (moved over a slur), like trillInk(). */
    function accentInk(staveNote: any): { top: number, lift: number } {
        const accent: any = staveNote.getModifiers().find((modifier: any) => modifier.goesOutsideSlurs);
        const stave: any = staveNote.getStave();
        const space: number = stave.getSpacingBetweenLines();
        return { top: (accent.drawnInk.top - stave.getYForLine(0)) / space, lift: -(accent.slurClearanceYShift ?? 0) / space };
    }
    function wavyLine(start: any): VexFlowVibratoBracket {
        for (const page of osmd.GraphicSheet.MusicPages) {
            for (const system of page.MusicSystems) {
                for (const staffLine of system.StaffLines as StaffLine[]) {
                    for (const bracket of staffLine.WavyLines as VexFlowVibratoBracket[]) {
                        if (bracket.startNote === start) {
                            return bracket;
                        }
                    }
                }
            }
        }
        return undefined;
    }

    it("over a raised top text position a trill over an accent is at its text line", async () => {
        // m1: F5 with an accent and a trill, m2: the same without the accent; the C7 under each wavy line raises it
        await render("test_trill_text_line_raised_wavy_line", 1000);
        const withAccent: any = note(0);
        const plain: any = note(1);
        const stave: any = withAccent.getStave();
        expect(stave.options.top_text_position).to.be.greaterThan(1);
        expect(trill(withAccent).text_line).to.equal(1.5);
        expect(trill(plain).text_line).to.equal(0);
        const space: number = stave.getSpacingBetweenLines();
        const top: number = stave.getYForLine(0);
        expect(trillInk(withAccent).bottom * space + top).to.be.closeTo(stave.getYForTopText(1.5), 1);
        expect(trillInk(plain).bottom * space + top).to.be.closeTo(plain.getStave().getYForTopText(0), 1);
    });

    for (const width of [1366, 1024]) {
        it(`a trill goes over an accent moved over its slur (Weber m135, m137) at ${width}`, async () => {
            await render("test_weber_op74_iii_trill_over_accent", width);
            for (const [index, measure] of [[0, 135], [2, 137]]) {
                const staveNote: any = note(index);
                const accent: { top: number, lift: number } = accentInk(staveNote);
                expect(accent.lift, `m${measure}: the accent goes over the slur`).to.be.greaterThan(0);
                // the layout's place of the moved accent is where it is drawn
                const accentModifier: any = staveNote.getModifiers().find((modifier: any) => modifier.goesOutsideSlurs);
                expect(accentModifier.raisedInkTop(accentModifier.slurClearanceYShift)).to.be.closeTo(accent.top, 0.01);
                const mark: { top: number, bottom: number } = trillInk(staveNote);
                expect(mark.bottom, `m${measure}: the trill ${mark.bottom} over the accent ${accent.top}`)
                    .to.be.at.most(accent.top - 0.3);
                const bracket: VexFlowVibratoBracket = wavyLine(staveNote);
                const stave: any = staveNote.getStave();
                const lineY: number = (stave.getYForTopText(bracket.line) - stave.getYForLine(0)) / stave.getSpacingBetweenLines();
                expect(lineY, `m${measure}: the wavy line`).to.be.lessThan(accent.top - 0.3);
            }
        });
    }
});
