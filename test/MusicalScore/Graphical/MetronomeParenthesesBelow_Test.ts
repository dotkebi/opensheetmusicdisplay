import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { InstantaneousTempoExpression } from "../../../src/MusicalScore/VoiceData/Expressions/InstantaneousTempoExpression";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Metronome marks in parentheses (MusicXML <metronome parentheses="yes">) and below the staff (placement="below" on
 * the direction): Mozart, Bassoon Concerto K.191 I (Richault) m1 "Allegro (♩ = 108)", m161 "mesuré." above and
 * "(♩ = 104)" below the bassoon.
 * The fixture has, in the bassoon: m1 "(♩ = 108)" with "Allegro", m2 "♩ = 96" without parentheses, m3 "(♩ = 104)" below
 * with "mesuré." above, m4 "(♩. = c. 80 ♩. = 50)" (a following mark). The piano repeats the m2 mark without placement:
 * drawn once above the system although its part has two staves (its Placement defaults to below).
 * Same rules as osmd-dart (test/metronome_parentheses_below_test.dart).
 */
describe("Metronome mark parentheses and placement below", () => {
    const marks: string = "test_metronome_parentheses_below.musicxml";
    const plain: string = "test_metronome_parentheses_below_plain.musicxml";

    async function render(name: string): Promise<{ osmd: OpenSheetMusicDisplay, div: HTMLElement }> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1200px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(new XMLSerializer().serializeToString(TestUtils.getScore(name)));
        osmd.render();
        return { div, osmd };
    }

    /** The texts of each drawn metronome mark, in drawing order, with the y of the mark's line. */
    function markLines(div: HTMLElement): { texts: string[], y: number }[] {
        return Array.from(div.querySelectorAll("g.vf-stavetempo")).map((group: Element) => {
            const texts: SVGTextElement[] = Array.from(group.querySelectorAll("text"));
            return { texts: texts.map(t => t.textContent), y: parseFloat(texts[0].getAttribute("y")) };
        });
    }

    it("reads the parentheses and the placement below of a metronome mark", async () => {
        const { osmd } = await render(marks);
        const described: string[] = [];
        for (const measure of osmd.Sheet.SourceMeasures) {
            for (const multi of measure.TempoExpressions) {
                const mark: InstantaneousTempoExpression = multi.InstantaneousTempo;
                if (mark?.isMetronomeMark) { // not the tempo words ("Allegro")
                    described.push(`m${measure.MeasureNumber} ${mark.perMinuteText ?? Math.round(mark.TempoInBpm)} ` +
                        `parentheses=${mark.metronomeParentheses} below=${mark.metronomeBelow} following=${mark.followingMetronomeMarks.length}`);
                }
            }
        }
        expect(described, JSON.stringify(described)).to.deep.equal([
            "m1 108 parentheses=true below=false following=0",
            "m2 96 parentheses=false below=false following=0",
            "m2 96 parentheses=false below=false following=0",
            "m3 104 parentheses=true below=true following=0",
            "m4 c. 80 parentheses=true below=false following=1",
        ]);
    });

    it("draws the parentheses around the whole line of the mark", async () => {
        const { div } = await render(marks);
        const lines: string[] = markLines(div).map(line => line.texts.join("|"));
        expect(lines, JSON.stringify(lines)).to.deep.equal([
            "(| = 108)",
            " = 96",
            "(| = 104)",
            "(| = c. 80| = 50)",
        ]);
        const plainLines: string[] = markLines((await render(plain)).div).map(line => line.texts.join("|"));
        expect(plainLines).to.deep.equal([" = 108", " = 96", " = 104", " = c. 80| = 50"]);
    });

    it("draws a mark with placement=\"below\" under its staff", async () => {
        const { osmd, div } = await render(marks);
        const measures: VexFlowMeasure[] = osmd.GraphicSheet.MeasureList[0] as VexFlowMeasure[];
        const bassoonBottomLine: number = measures[0].getVFStave().getYForLine(4);
        const bassoonTop: number = measures[0].getVFStave().getYForLine(0);
        const pianoTop: number = measures[1].getVFStave().getYForLine(0);
        const lines: { texts: string[], y: number }[] = markLines(div);
        // the text's baseline: under the bassoon's bottom line by more than the text's height, above the piano
        expect(lines[2].y).to.be.greaterThan(bassoonBottomLine + 15);
        expect(lines[2].y).to.be.lessThan(pianoTop);
        for (const line of [lines[0], lines[1], lines[3]]) {
            expect(line.y, line.texts.join("")).to.be.lessThan(bassoonTop);
        }
        // the bottom line keeps the mark: the piano is further down than with the mark above
        const plainMeasures: VexFlowMeasure[] = (await render(plain)).osmd.GraphicSheet.MeasureList[0] as VexFlowMeasure[];
        expect(pianoTop - bassoonTop).to.be.greaterThan(
            plainMeasures[1].getVFStave().getYForLine(0) - plainMeasures[0].getVFStave().getYForLine(0));
    });
});
