import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";

/**
 * Tuplets of a voice that follow each other in a measure on the same side take one height
 * (VexFlowMeasure.levelConsecutiveTuplets(), VexFlowPatch tuplet.js getYPosition()), also when a slur starting inside one of
 * them lifts them over it (VexFlowMusicSheetCalculator.tupletUnitTouchedInside()), and a number goes over an accent lifted
 * over a slur before that it would touch, the accent recorded where draw() puts it (articulation.js raisedInkTop()). With
 * the numbers on their articulations (tuplet.js) a run of sextuplets went up and down with the notes (Krommer, Oboe
 * Concerto Op. 52 II m54), a slur from inside the first of two triplets lifted only its 3 (Hummel, Trumpet Concerto II
 * m20-22), and the accent of C5 lifted over the slur from it went on the 3's bracket (Lalo, Symphonie espagnole III, violin
 * m44). A 3 that another slur lifts over the slur over its tuplet takes the others of its group with it (Hummel II m24:
 * VexFlowMusicSheetCalculator.tupletUnitMoveBeyondAllSlurs()). Same as the osmd-dart test/tuplet_level_test.dart (no
 * accent case there: the C5 is beamed with the others, the slur under them).
 */
describe("Tuplet level", () => {
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

    it("puts the 3 over the accent lifted over the slur (Lalo Op. 21 III violin m44)", async () => {
        await render("test_slur_side_without_tuplet_numbers.musicxml");
        const measure: VexFlowMeasure = osmd.GraphicSheet.MeasureList[0][0] as VexFlowMeasure;
        const slurs: any[] = measure.ParentStaffLine.GraphicalSlurs;
        // (C5 is octave 2, A3 octave 0)
        const fromC5: any = slurs.find(slur => slur.slur.StartNote.Pitch.Octave === 2 && slur.slur.EndNote.Pitch.Octave === 0);
        expect(fromC5, "the slur from C5 to A3").to.not.equal(undefined);
        // over the notes (by the room above and under them: 1.95 above against 2.81 under)
        expect(fromC5.placement).to.equal(PlacementEnum.Above);
        const accent: any = measure.AccentInk.find(ink => ink.above);
        const top: number = accent.accent.raisedInkTop(accent.accent.slurClearanceYShift);
        const number: any = measure.TupletNumberInk[0];
        expect(accent.right > number.left && accent.left < number.right, "the accent under the bracket").to.equal(true);
        // the accent over the slur drawn at -2.66 (snapped to the staff, 0.58 over the raise); the 3's hooks were at -2.38
        expect(top, "the accent's top").to.be.closeTo(-2.66, 0.05);
        expect(top - number.bottom, "the bracket over the accent").to.be.greaterThan(0.29);
    });


    it("takes two triplets over a slur over both that the first 3 went over (Hummel, Trumpet Concerto II m24)", async () => {
        await render("test_tuplet_level_covering_slur.musicxml");
        const measure: VexFlowMeasure = osmd.GraphicSheet.MeasureList[1][0] as VexFlowMeasure;
        const inks: any[] = measure.TupletNumberInk;
        expect(inks.length).to.equal(2);
        // (before: the first 3 over the slurs into and from A5, the second under the slur over both)
        expect(Math.abs(inks[0].top - inks[1].top)).to.be.closeTo(0, 0.01);
        const fromA5: any[] = measure.ParentStaffLine.GraphicalSlurs.filter(slur =>
            slur.coversTuplet(inks[0].tuplet) && slur.coversTuplet(inks[1].tuplet));
        expect(fromA5.length).to.equal(1);
        // the second 3 over that slur too
        for (let i: number = 0; i <= 128; i++) {
            const point: any = fromA5[0].calculateCurvePointAtIndex(i / 128);
            if (point.x >= inks[1].left && point.x <= inks[1].right) {
                expect(inks[1].bottom).to.be.below(point.y);
            }
        }
    });
});
