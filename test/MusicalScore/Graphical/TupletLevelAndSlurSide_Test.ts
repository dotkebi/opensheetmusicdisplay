import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";

/**
 * Tuplets of a voice that follow each other in a measure on the same side take one height
 * (VexFlowMeasure.levelConsecutiveTuplets(), VexFlowPatch tuplet.js getYPosition()), also when a slur starting among them
 * lifts them over it (VexFlowMusicSheetCalculator.moveTupletUnitBeyondSlurs()), and the side of a slur over notes with
 * stems both ways is read without the tuplet numbers (GraphicalSlur.withoutTupletNumbers()). With the numbers on their
 * articulations (tuplet.js) a run of sextuplets went up and down with the notes (Krommer, Oboe Concerto Op. 52 II m54), a
 * slur from inside the first of two triplets lifted only its 3 (Hummel, Trumpet Concerto II m20-22), and the slur from C5
 * (stem down) to A3 in Lalo, Symphonie espagnole III, violin m44 went over the notes, its accent lifted over it on the
 * 3's bracket: the slur goes over them by the room without the 3 (it was under them for the 3 alone), and a number goes
 * over the marks lifted over a slur that it would touch, the accent where draw() puts it. Same as the osmd-dart
 * test/tuplet_level_and_slur_side_test.dart.
 */
describe("Tuplet level and slur side", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    async function render(file: string): Promise<void> {
        container = TestUtils.getDivElement(document);
        container.style.width = "1024px";
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore(file));
        osmd.render();
    }
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    /** The tops of the tuplet numbers of each measure. */
    function numberTops(): number[][] {
        return osmd.GraphicSheet.MeasureList.map(column =>
            (column[0] as VexFlowMeasure).TupletNumberInk.map(ink => ink.top));
    }

    it("levels a run of sextuplets (Krommer Op. 52 II m54-55)", async () => {
        await render("test_tuplet_level_run.musicxml");
        const tops: number[][] = numberTops();
        expect(tops.map(measure => measure.length)).to.deep.equal([4, 2]);
        for (const measure of tops) {
            // (before: up and down with the notes, by 0.5 spaces)
            expect(Math.max(...measure) - Math.min(...measure)).to.be.closeTo(0, 0.01);
        }
    });

    it("keeps two triplets level with a slur from inside the first (Hummel, Trumpet Concerto II m20-22)", async () => {
        await render("test_tuplet_level_slur.musicxml");
        const tops: number[][] = numberTops();
        expect(tops.map(measure => measure.length)).to.deep.equal([2, 2, 2]);
        for (const measure of tops) {
            // (before: the first 3 over the slur, the second under it)
            expect(Math.abs(measure[0] - measure[1])).to.be.closeTo(0, 0.01);
        }
    });

    it("reads the side of a slur over stems both ways without the 3, the 3 over the accent lifted over it (Lalo Op. 21 III violin m44)",
       async () => {
        await render("test_slur_side_without_tuplet_numbers.musicxml");
        const measure: VexFlowMeasure = osmd.GraphicSheet.MeasureList[0][0] as VexFlowMeasure;
        const slurs: any[] = measure.ParentStaffLine.GraphicalSlurs;
        // (C5 is octave 2, A3 octave 0)
        const fromC5: any = slurs.find(slur => slur.slur.StartNote.Pitch.Octave === 2 && slur.slur.EndNote.Pitch.Octave === 0);
        expect(fromC5, "the slur from C5 to A3").to.not.equal(undefined);
        // over the notes by the room above and under them without the 3 (with the 3 under it before the numbers went on
        //   their articulations: 1.95 above against 2.81 under it, without it 1.00)
        expect(fromC5.placement).to.equal(PlacementEnum.Above);
        const accent: any = measure.AccentInk.find(ink => ink.above);
        const top: number = accent.accent.raisedInkTop(accent.accent.slurClearanceYShift);
        const number: any = measure.TupletNumberInk[0];
        expect(accent.right > number.left && accent.left < number.right, "the accent under the bracket").to.equal(true);
        // the accent over the slur drawn at -2.66 (snapped to the staff, 0.58 over the raise); the 3's hooks were at -2.38
        expect(top, "the accent's top").to.be.closeTo(-2.66, 0.05);
        expect(top - number.bottom, "the bracket over the accent").to.be.greaterThan(0.29);
    });

    it("reads the side of a slur over stems both ways without the 3s (Prokofiev Op. 19 I m58)", async () => {
        await render("test_tuplet_number_over_upbow.musicxml");
        const measure: VexFlowMeasure = osmd.GraphicSheet.MeasureList[1][0] as VexFlowMeasure;
        const staffLine: any = measure.ParentStaffLine;
        const calculator: any = staffLine.SkyBottomLineCalculator;
        const lines: { sky: number[], bottom: number[] } = (GraphicalSlur as any).withoutTupletNumbers(calculator, staffLine);
        // under each 3 the copy of the sky line goes no higher than the number's bottom (the slur from G3, stem up, to E5,
        //   stem down, is placed by it); the staff line's own sky line keeps the numbers
        const inks: any[] = measure.TupletNumberInk;
        expect(inks.length).to.equal(4);
        for (const ink of inks) {
            const middle: number = (ink.left + ink.right) / 2;
            expect(calculator.getMinInRangeOf(lines.sky, middle, middle)).to.be.at.least(ink.bottom - 1e-9);
            expect(calculator.getMinInRangeOf(calculator.SkyLine, middle, middle)).to.be.below(ink.bottom);
        }
    });
});
