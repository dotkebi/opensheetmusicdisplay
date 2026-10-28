import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";

/**
 * A tuplet's number over its notes goes 1.5 spaces over the ink of the articulations over the notes (VexFlowPatch tuplet.js
 * getYPosition(), articulation.js inkYExtent()): VexFlow 1.2.93 looked only at the stems and noteheads, so the 3 sat on the
 * accent of the middle note (Lalo, Symphonie espagnole I, violin m67, the second triplet G4 Eb5 Eb4, each with an accent,
 * Eb5's above) and on the first staccato after a rest (Mozart, Flute Concerto K.313 III, flute m245, the first triplet: an
 * eighth rest and two C6 with staccatos). VexFlow 5's text lines, read before, put it far over an articulation drawn at the
 * staff: 7.4 spaces over the staff over the up-bow of G3 (Prokofiev, Violin Concerto No. 1 I, violin m58), and the slur from
 * that G3 to the E5 of the next measure went under the notes. Same as the osmd-dart
 * test/tuplet_number_over_articulation_test.dart.
 */
describe("Tuplet number over articulations", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    async function render(file: string, measureIndex: number = 0): Promise<VexFlowMeasure> {
        container = TestUtils.getDivElement(document);
        container.style.width = "1024px";
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore(file));
        osmd.render();
        return osmd.GraphicSheet.MeasureList[measureIndex][0] as VexFlowMeasure;
    }
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    /** The tuplet's y (Tuplet.getYPosition()) in spaces from the staff's first line. */
    function tupletY(ink: any): number {
        const stave: any = ink.tuplet.getNotes()[0].getStave();
        return (ink.tuplet.getYPosition() - stave.getYForLine(0)) / stave.getSpacingBetweenLines();
    }

    /** The top of the ink of the articulations of a tuplet's notes on a side, in spaces from the staff's first line. */
    function articulationTop(ink: any, position: number): number {
        const stave: any = ink.tuplet.getNotes()[0].getStave();
        const tops: number[] = [];
        for (const note of ink.tuplet.getNotes()) {
            for (const articulation of note.getModifiers().filter((m: any) => m.getCategory() === "articulations" &&
                m.getPosition() === position)) {
                tops.push((articulation.inkYExtent().top - stave.getYForLine(0)) / stave.getSpacingBetweenLines());
            }
        }
        return Math.min(...tops);
    }

    it("puts the 3 over an accent 1.5 spaces over its ink (Lalo m67)", async () => {
        const measure: VexFlowMeasure = await render("test_tuplet_number_over_accent.musicxml");
        const inks: any[] = measure.TupletNumberInk;
        expect(inks.length).to.equal(2);
        const second: any = inks[1];
        // 1.5 spaces over the accent over Eb5 (before: -1.5, the staff's default, on the accent; with VexFlow 5's text
        //   lines -4.5)
        expect(tupletY(second), "second triplet's y").to.be.closeTo(articulationTop(second, 3) - 1.5, 0.01);
        expect(tupletY(second), "second triplet's y").to.be.closeTo(-2.86, 0.05);
        const accents: any[] = measure.AccentInk.filter(accent => accent.above &&
            accent.right > second.left && accent.left < second.right);
        expect(accents.length, "the accent over Eb5 under the 3").to.equal(1);
        expect(accents[0].top - second.bottom, "3 clear of the accent").to.be.greaterThan(0.5);
    });

    it("puts the 3 over a staccato after a rest 1.5 spaces over its ink (Mozart K.313 III m245)", async () => {
        const measure: VexFlowMeasure = await render("test_tuplet_number_over_staccato.musicxml");
        const inks: any[] = measure.TupletNumberInk;
        expect(inks.length).to.equal(3);
        // 1.5 spaces over the staccato over C6 (before: -4, 2 spaces over C6, on the staccato)
        expect(tupletY(inks[0]), "first triplet's y").to.be.closeTo(articulationTop(inks[0], 3) - 1.5, 0.01);
        expect(tupletY(inks[0]), "first triplet's y").to.be.closeTo(-4.87, 0.05);
    });

    it("puts the 3 over an up-bow of a low note over its ink, the slur over the notes (Prokofiev Op.19 I m58)", async () => {
        const measure: VexFlowMeasure = await render("test_tuplet_number_over_upbow.musicxml", 1);
        const inks: any[] = measure.TupletNumberInk;
        expect(inks.length).to.equal(4);
        // the up-bow over G3 is drawn at the staff (its ink from -1.55): the 3 1.5 spaces over it (VexFlow 5's text lines:
        //   -7.36, the up-bow's 2 lines and the 2.4 from the stem's tip to the staff's top line)
        expect(articulationTop(inks[0], 3), "the up-bow's ink").to.be.closeTo(-1.55, 0.05);
        expect(tupletY(inks[0]), "first triplet's y").to.be.closeTo(-3.05, 0.05);
        // the slur from G3 (stem up) to E5 (stem down) over the notes, as engraved (under them with the 3 at -7.36)
        const slurs: any[] = measure.ParentStaffLine.GraphicalSlurs;
        expect(slurs.length).to.equal(1);
        expect(slurs[0].placement).to.equal(PlacementEnum.Above);
    });
});
