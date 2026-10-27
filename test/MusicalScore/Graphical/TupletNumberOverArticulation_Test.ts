import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";

/**
 * A tuplet's number over its notes goes 2 spaces over the text lines of the articulations over the notes, as VexFlow 5
 * (osmd-dart) puts it (VexFlowPatch tuplet.js getYPosition(), modifierTextLines()): VexFlow 1.2.93 looked only at the
 * stems and noteheads, so the 3 sat on the accent of the middle note (Lalo, Symphonie espagnole I, violin m67, the second
 * triplet G4 Eb5 Eb4, each with an accent, Eb5's above) and on the first staccato after a rest (Mozart, Flute Concerto
 * K.313 III, flute m245, the first triplet: an eighth rest and two C6 with staccatos). Same as the osmd-dart
 * test/tuplet_number_over_articulation_test.dart.
 */
describe("Tuplet number over articulations", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    async function render(file: string): Promise<VexFlowMeasure> {
        container = TestUtils.getDivElement(document);
        container.style.width = "1024px";
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore(file));
        osmd.render();
        return osmd.GraphicSheet.MeasureList[0][0] as VexFlowMeasure;
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

    it("puts the 3 over an accent two spaces over its text line (Lalo m67)", async () => {
        const measure: VexFlowMeasure = await render("test_tuplet_number_over_accent.musicxml");
        const inks: any[] = measure.TupletNumberInk;
        expect(inks.length).to.equal(2);
        const second: any = inks[1];
        // the app's place (osmd-dart): the accent's text line 1.5, 2 spaces over it (before: -1.5, the staff's default)
        expect(tupletY(second), "second triplet's y").to.be.closeTo(-4.5, 0.01);
        const accents: any[] = measure.AccentInk.filter(accent => accent.above &&
            accent.right > second.left && accent.left < second.right);
        expect(accents.length, "the accent over Eb5 under the 3").to.equal(1);
        expect(accents[0].top - second.bottom, "3 clear of the accent").to.be.greaterThan(1);
    });

    it("puts the 3 over a staccato after a rest two spaces over its text line (Mozart K.313 III m245)", async () => {
        const measure: VexFlowMeasure = await render("test_tuplet_number_over_staccato.musicxml");
        const inks: any[] = measure.TupletNumberInk;
        expect(inks.length).to.equal(3);
        // the app's place (osmd-dart): the staccato's text line 1.5 (VexFlow 5's dot is 5.1 px high, a line and a half),
        //   2 spaces over it (before: -4, 2 spaces over C6)
        expect(tupletY(inks[0]), "first triplet's y").to.be.closeTo(-4.5, 0.01);
    });
});
