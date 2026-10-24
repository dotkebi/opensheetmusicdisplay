import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { SourceMeasure } from "../../../src/MusicalScore/VoiceData/SourceMeasure";
import Vex from "vexflow";
const VF: any = Vex.Flow;

/**
 * A fermata on a barline (MusicXML <barline location="right"><fermata>, Saint-Saëns, Oboe Sonata Op. 166 II m6/63; Enesco,
 * Concertstück m73) is read into SourceMeasure.endingBarlineFermatas and drawn over the barline of the part's first staff
 * (an upright one) or under its last staff (an inverted one), beside any fermata on the notes. It was read nowhere and
 * drawn nowhere. Same as osmd-dart's barline_fermata_test.dart.
 */
describe("Fermata on a barline", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    const glyphs: { code: string, x: number, y: number }[] = [];
    const originalRenderGlyph: any = VF.Glyph.renderGlyph;

    before(async () => {
        VF.Glyph.renderGlyph = function (ctx: any, x: number, y: number, point: number, code: string, nocache: boolean): any {
            glyphs.push({ code, x, y });
            return originalRenderGlyph.call(this, ctx, x, y, point, code, nocache);
        };
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_barline_fermata.musicxml"));
        glyphs.length = 0;
        osmd.render();
    });
    after(() => {
        VF.Glyph.renderGlyph = originalRenderGlyph;
        osmd.clear();
        container.remove();
    });

    it("reads the barline fermatas to the part's first (upright) and last (inverted) staff", () => {
        const measures: SourceMeasure[] = osmd.Sheet.SourceMeasures;
        const text: (i: number) => string = (i: number): string =>
            measures[i].endingBarlineFermatas.map(f => `${f.staffIndex}${f.inverted ? "v" : "^"}`).join(",");
        expect(text(0)).to.equal("0^,1^");        // oboe staff 0, piano upper staff 1
        expect(text(1)).to.equal("0^,0v,1^,2v");  // the inverted ones under the oboe (its only staff) and the piano's lower staff
        expect(text(2)).to.equal("");             // m3: a fermata on a note only
    });

    it("draws them centred on the barline, over the top line and under the bottom line", () => {
        // (each measure is drawn twice: for the sky/bottom line and for the page; count each place once)
        const seen: Set<string> = new Set<string>();
        const fermatas: { code: string, x: number, y: number }[] = glyphs.filter(g => (g.code === "v43" || g.code === "v5b") &&
            !seen.has(`${g.code}@${g.x},${g.y}`) && !!seen.add(`${g.code}@${g.x},${g.y}`));
        // m1: 2 upright; m2: 2 upright + 2 inverted; m3: the note fermatas are VF.Articulations, not renderGlyph calls counted here
        expect(fermatas.filter(g => g.code === "v43").length).to.be.at.least(4);
        expect(fermatas.filter(g => g.code === "v5b").length).to.be.at.least(2);
        const m1Oboe: VexFlowMeasure = osmd.GraphicSheet.MeasureList[0][0] as VexFlowMeasure;
        const stave: any = m1Oboe.getVFStave();
        const end: number = stave.getX() + stave.getWidth();
        const upright: { code: string, x: number, y: number }[] = fermatas.filter(g => g.code === "v43" && Math.abs(g.x - (end - 1.5)) < 0.01);
        expect(upright.length).to.be.at.least(1, "an upright fermata centred on m1's double barline");
        expect(upright[0].y).to.be.lessThan(stave.getYForLine(0));
        const m2Lower: VexFlowMeasure = osmd.GraphicSheet.MeasureList[1][2] as VexFlowMeasure;
        const lowerStave: any = m2Lower.getVFStave();
        const inverted: { code: string, x: number, y: number }[] = fermatas.filter(g => g.code === "v5b" &&
            Math.abs(g.x - (lowerStave.getX() + lowerStave.getWidth())) < 0.01 && g.y > lowerStave.getYForLine(4));
        expect(inverted.length).to.equal(1, "the inverted fermata under the piano's lower staff at m2's barline");
    });
});
