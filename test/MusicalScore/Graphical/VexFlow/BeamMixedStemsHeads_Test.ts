import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { TestUtils } from "../../../Util/TestUtils";
import Vex from "vexflow";
const VF: any = Vex.Flow;

/**
 * Sperger, Sonata for violone and basso, Basso I m30, 50, 52, 75: eighth-note beams whose notes have their stems in both
 * directions (as the source). The beam has to pass between the two groups of noteheads instead of through the heads of
 * the notes whose stems point the other way (VexFlowPatch beam.js fitMixedStems()). Same as osmd-dart
 * test/beam_mixed_stems_heads_test.dart.
 */
describe("Beam with stems in both directions keeps clear of the noteheads", () => {
    it("passes between the heads on both sides", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "900px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore("test_beam_mixed_stems_heads.musicxml"));
        osmd.render();
        for (let m: number = 0; m < 4; m++) {
            const measure: any = osmd.GraphicSheet.MeasureList[m][0];
            const notes: any[] = measure.staffEntries
                .map((e: any) => (e.graphicalVoiceEntries[0] as VexFlowVoiceEntry).vfStaveNote)
                .filter((n: any) => !n.isRest());
            const beam: any = notes[0].beam;
            expect(beam, `m${m + 1} beamed`).to.not.equal(undefined);
            const dir: number = beam.stem_direction;
            const space: number = notes[0].getStave().getSpacingBetweenLines();
            const width: number = beam.render_options.beam_width;
            const tip0: number = beam.getBeamYToDraw();
            const x0: number = beam.notes[0].getStemX();
            for (const note of notes) {
                // as drawBeamLines(): from the first stem's (extended) tip along the slope
                const line: number = beam.getSlopeY(note.getStemX(), x0, tip0, beam.slope);
                // the beam block reaches from the line towards the beam direction's heads
                const top: number = dir === VF.Stem.UP ? line : line - width;
                const bottom: number = dir === VF.Stem.UP ? line + width : line;
                for (const y of note.getYs()) {
                    const gap: number = y < top ? top - y : y - bottom;
                    // the head (half a space around its centre) stays outside the beam block
                    expect(y < top || y > bottom, `m${m + 1}: head ${y} outside beam ${top}..${bottom}`).to.equal(true);
                    expect(gap, `m${m + 1}: head ${y} clear of the beam ${top}..${bottom}`).to.be.at.least(space / 2 - 0.01);
                }
            }
        }
    });
});
