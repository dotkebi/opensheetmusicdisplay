import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";

/**
 * A staccato on a note with a single-note tremolo is drawn as one dot per repetition, in a row centred where the staccato
 * goes (EngravingRules.RenderTremoloStaccatoDots): a half note with one stroke takes four dots (Mozart, Bassoon Concerto
 * K.191, Richault 17178R, I piano m45, m65). Same as osmd-dart's test/tremolo_staccato_dots_test.dart.
 */
describe("Staccato dots of single-note tremolos", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    async function render(dotRows: boolean): Promise<void> {
        container = TestUtils.getDivElement(document);
        container.style.width = "1600px";
        osmd = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
        osmd.EngravingRules.RenderTremoloStaccatoDots = dotRows;
        await osmd.load(TestUtils.getScore("test_tremolo_staccato_dots.musicxml"));
        osmd.render();
    }
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    /** The centres (x, y in px) of the dot-sized paths (staccatos and augmentation dots) drawn in the measure, left to right. */
    function dots(measureNumber: number): [number, number][] {
        const box: BoundingBox = osmd.GraphicSheet.MeasureList[measureNumber - 1][0].PositionAndShape;
        const left: number = (box.AbsolutePosition.x + box.BorderLeft) * 10;
        const right: number = (box.AbsolutePosition.x + box.BorderRight) * 10;
        const result: [number, number][] = [];
        for (const path of Array.from(container.querySelectorAll("path"))) {
            const b: DOMRect = (path as SVGGraphicsElement).getBBox();
            const x: number = b.x + b.width / 2;
            if (b.width > 0 && b.height > 0 && b.width <= 6 && b.height <= 6 && x >= left && x <= right) {
                result.push([x, b.y + b.height / 2]);
            }
        }
        return result.sort((a, b) => a[0] - b[0]);
    }

    it("draws one dot per repetition of a single-note tremolo with a staccato", async () => {
        await render(true);
        expect(dots(1).length, "two half notes, one stroke").to.equal(8);
        expect(dots(2).length, "two quarters, two strokes").to.equal(8);
        expect(dots(3).length, "a tremolo alone, a staccato alone").to.equal(1);
        expect(dots(4).length, "a tremolo between two notes keeps its staccato").to.equal(1);
        expect(dots(5).length, "32 repetitions are more than TremoloStaccatoDotsMaxCount").to.equal(1);
        expect(dots(6).length, "a dotted half note: six dots and its augmentation dot").to.equal(7);
        expect(dots(7).length, "eighths with two strokes keep one staccato each (a note with a flag)").to.equal(2);
    });

    it("draws the dots in a row, centred where the staccato goes", async () => {
        await render(false);
        const alone: [number, number][] = dots(1);
        osmd.clear();
        container.remove();
        await render(true);
        const row: [number, number][] = dots(1);
        const spacing: number = osmd.EngravingRules.TremoloStaccatoDotSpacing * 10;
        expect(alone.length).to.equal(2);
        for (let note: number = 0; note < 2; note++) {
            const noteDots: [number, number][] = row.slice(note * 4, note * 4 + 4);
            for (let i: number = 1; i < 4; i++) {
                expect(noteDots[i][0] - noteDots[i - 1][0]).to.be.closeTo(spacing, 0.05);
                expect(noteDots[i][1]).to.be.closeTo(noteDots[0][1], 0.05);
            }
            const centre: number = noteDots.reduce((sum, dot) => sum + dot[0], 0) / 4;
            expect(centre).to.be.closeTo(alone[note][0], 0.05);
            expect(noteDots[0][1]).to.be.closeTo(alone[note][1], 0.05);
        }
        expect(row[0][1], "above the C5 with its stem down, below the G4 with its stem up").to.be.lessThan(row[4][1]);
    });
});
