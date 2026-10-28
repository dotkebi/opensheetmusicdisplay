import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { Tuplet } from "../../../src/MusicalScore/VoiceData/Tuplet";

/**
 * A tuplet number hidden as a consecutive repetition (TupletNumberLimitConsecutiveRepetitions) is not in the sky line: the
 * decisions are made before the sky and bottom lines. They were made after them, so the lines had the number a tuplet doesn't
 * draw, and a slur over its notes went over it (Boccherini/Piatti, Cello Sonata 1 m142: four triplets with staccatos, the 3
 * of each raised over the staccatos' text lines, 10-28).
 */
describe("Hidden tuplet number", () => {
    it("is not in the sky line", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        container.style.width = "1024px";
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_tuplet_hidden_number_skyline.musicxml"));
        for (const pass of [1, 2]) { // a re-render decides the same
            osmd.render();
            const measure: VexFlowMeasure = osmd.GraphicSheet.MeasureList[0][0] as VexFlowMeasure;
            const tuplets: Tuplet[] = (measure as any).tuplets[1].map((entry: any[]) => entry[0] as Tuplet);
            const vftuplets: any[] = (measure as any).vftuplets[1];
            expect(tuplets.length, "four triplets").to.equal(4);
            const hidden: number[] = tuplets.map((tuplet, i) => tuplet.RenderTupletNumber ? -1 : i).filter(i => i >= 0);
            expect(hidden.length, `hidden numbers (render ${pass})`).to.be.at.least(1);
            const x: number = measure.PositionAndShape.RelativePosition.x;
            for (const i of hidden) {
                const ink: any = (measure as any).tupletNumberInk(vftuplets[i]);
                const sky: number = measure.ParentStaffLine.SkyBottomLineCalculator.getSkyLineMinInRange(x + ink.left, x + ink.right);
                expect(sky, `render ${pass}, triplet ${i + 1}: the sky line ${sky} under its hidden 3 (top ${ink.top})`)
                    .to.be.greaterThan(ink.bottom);
            }
        }
        osmd.clear();
        container.remove();
    });
});
