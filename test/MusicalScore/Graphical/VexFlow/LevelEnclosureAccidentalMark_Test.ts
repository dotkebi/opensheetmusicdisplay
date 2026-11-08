import { expect } from "vitest";
import Vex from "vexflow";
import VF = Vex.Flow;
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { VexFlowAccidentalMark } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowAccidentalMark";
import { VoiceEntry } from "../../../../src/MusicalScore/VoiceData/VoiceEntry";
import { AccidentalEnum } from "../../../../src/Common/DataObjects/Pitch";
import { PlacementEnum } from "../../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { TestUtils } from "../../../Util/TestUtils";

/**
 * <notations><level bracket|parentheses="yes"/> encloses the trill of that <notations>: "[tr]" (Vivaldi, Op. 44 No. 11 I
 * m72), "(tr)" (Dittersdorf, Double Bass Concerto in D, flutes m55); a trill without <level> is drawn as before. An
 * <accidental-mark> outside <ornaments> is drawn above the note (below with placement="below"), under the note's
 * ornament (Saint-Saëns, Bassoon Sonata Op. 168; Schumann, Piano Quartet Op. 47 I cello m11). Same fixture as osmd-dart
 * test/level_enclosure_accidental_mark_test.dart.
 */
describe("Editorial level enclosure and accidental marks", () => {
    let osmd: OpenSheetMusicDisplay;

    beforeAll(async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        osmd = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore("test_level_enclosure_accidental_mark.musicxml"));
        osmd.render();
    });

    const gve: (measure: number, index?: number) => VexFlowVoiceEntry = (measure: number, index: number = 0): VexFlowVoiceEntry =>
        osmd.GraphicSheet.MeasureList[measure][0].staffEntries[index].graphicalVoiceEntries[0] as VexFlowVoiceEntry;
    const voiceEntry: (measure: number, index?: number) => VoiceEntry = (measure: number, index: number = 0): VoiceEntry =>
        gve(measure, index).parentVoiceEntry;
    const ornament: (measure: number, index?: number) => any = (measure: number, index: number = 0): any =>
        (gve(measure, index).vfStaveNote as any).getModifiers().find((m: any) => m.getCategory() === "ornaments");
    const accidentalMarks: (measure: number, index?: number) => VexFlowAccidentalMark[] = (measure: number, index: number = 0) =>
        (gve(measure, index).vfStaveNote as any).getModifiers().filter((m: any) => m instanceof VexFlowAccidentalMark);

    it("reads the <level> of the trill's <notations>", () => {
        expect(voiceEntry(0).OrnamentContainer.LevelEnclosure).to.equal("bracket");
        expect(voiceEntry(1).OrnamentContainer.LevelEnclosure).to.equal("parentheses");
        expect(voiceEntry(2).OrnamentContainer.LevelEnclosure).to.equal(undefined);
    });

    it("encloses the trill, and only a trill with a <level>", () => {
        expect(ornament(0).levelEnclosure).to.equal("bracket");
        expect(ornament(1).levelEnclosure).to.equal("parentheses");
        expect(ornament(2).levelEnclosure).to.equal(undefined);
        const width: (measure: number) => number = (measure: number): number =>
            ornament(measure).layoutInk.right - ornament(measure).layoutInk.left;
        const glyphWidth: number = ornament(2).glyph.getMetrics().width;
        expect(width(2)).to.be.closeTo(glyphWidth, 0.01);
        // the ink reaches half a staff space beyond the glyph on both sides
        expect(width(0)).to.be.closeTo(glyphWidth + 10, 0.01);
        expect(width(1)).to.be.closeTo(glyphWidth + 10, 0.01);
    });

    it("reads an <accidental-mark> outside <ornaments> as the note's", () => {
        expect(voiceEntry(3, 0).AccidentalMarks).to.deep.equal(
            [{ accidental: AccidentalEnum.NATURAL, accidentalXml: "natural", placement: PlacementEnum.Above }]);
        expect(voiceEntry(3, 1).AccidentalMarks).to.deep.equal(
            [{ accidental: AccidentalEnum.FLAT, accidentalXml: "flat", placement: PlacementEnum.Above }]);
        expect(voiceEntry(3, 1).OrnamentContainer.AccidentalAbove, "not the trill's").to.equal(AccidentalEnum.NONE);
        expect(voiceEntry(4).AccidentalMarks[0].placement).to.equal(PlacementEnum.Below);
        expect(voiceEntry(0).AccidentalMarks).to.deep.equal([]);
    });

    it("draws the accidental mark above the note, outside the staff and under the trill", () => {
        // (drawnInk: in the stave's pixels; the ornament's layoutInk: from the stave's top line)
        const stave: any = gve(3, 0).vfStaveNote.getStave();
        const topLine: number = stave.getYForLine(0);
        const [natural] = accidentalMarks(3, 0);
        expect(natural.accidental).to.equal("n");
        expect(natural.getPosition()).to.equal(VF.Modifier.Position.ABOVE);
        expect((natural as any).drawnInk.bottom, "above the staff").to.be.lessThan(topLine + 0.01);

        const [flat] = accidentalMarks(3, 1);
        expect(flat.accidental).to.equal("b");
        const flatInk: any = (flat as any).drawnInk;
        expect(flatInk.bottom).to.be.lessThan(topLine + 0.01);
        expect(ornament(3, 1).layoutInk.bottom + topLine, "the trill over the flat").to.be.lessThan(flatInk.top);

        const [sharp] = accidentalMarks(4);
        expect(sharp.accidental).to.equal("#");
        expect(sharp.getPosition()).to.equal(VF.Modifier.Position.BELOW);
        expect((sharp as any).drawnInk.top, "below the staff").to.be.greaterThan(stave.getYForLine(4) - 0.01);
    });

    it("draws no accidental before a note whose sign is an accidental mark without <accidental>", () => {
        const accidentals: (measure: number, index?: number) => any[] = (measure: number, index: number = 0): any[] =>
            (gve(measure, index).vfStaveNote as any).getModifiers().filter((m: any) => m.getCategory() === "accidentals");
        expect(accidentalMarks(5, 0).map((mark: VexFlowAccidentalMark) => mark.accidental)).to.deep.equal(["b"]);
        expect(accidentals(5, 0), "B-flat4 with the flat mark").to.have.length(0);
        expect(accidentals(5, 1), "the next B-flat4").to.have.length(0);
        // with <accidental>, the printed sign stays before the note (Schumann, Piano Quartet Op. 47 I cello m11)
        expect(accidentals(3, 1)).to.have.length(1);
    });
});
