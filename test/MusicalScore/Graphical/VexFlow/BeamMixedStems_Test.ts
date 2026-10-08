import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { TestUtils } from "../../../Util/TestUtils";
import Vex from "vexflow";
const VF: any = Vex.Flow;

/**
 * Parisotti, Vivaldi Un certo non so che Piano m30, left hand (renderer leftovers 2, 2-2 P10-B3): a beam over a low bass
 * note with its stem up and a chord with its stem down. The XML stems are kept (setBeamNotesWantedStemDirections() set the
 * chord's to the bass note's) and both stems reach the beam between them (VexFlowPatch beam.js, as VexFlow 4).
 * Same as osmd-dart test/beam_mixed_stems_test.dart.
 */
describe("Beam with stems in both directions", () => {
    it("keeps the XML stems and extends both to the beam", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "600px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore("test_beam_mixed_stems.musicxml"));
        osmd.render();
        const measure: any = osmd.GraphicSheet.MeasureList[0][0];
        const note = (i: number): any => (measure.staffEntries[i].graphicalVoiceEntries[0] as VexFlowVoiceEntry).vfStaveNote;
        const bass: any = note(0), chord: any = note(1);
        expect(bass.getStemDirection(), "bass note stem up (XML)").to.equal(VF.Stem.UP);
        expect(chord.getStemDirection(), "chord stem down (XML)").to.equal(VF.Stem.DOWN);
        expect(bass.beam, "one beam").to.equal(chord.beam);
        const beam: any = bass.beam;
        const beamWidth: number = beam.render_options.beam_width;
        // the beam lies between them: the bass stem's tip from below, the chord stem's tip from above, a beam apart
        //   (the beam line at the chord's stem: the beam's slope from the bass note's stem tip)
        const bassTip: number = bass.getStemExtents().topY, chordTip: number = chord.getStemExtents().topY;
        const chordBeamY: number = beam.getSlopeY(chord.getStemX(), bass.getStemX(), bassTip, beam.slope);
        expect(Math.abs(chordTip - chordBeamY), `chord tip ${chordTip}, beam line there ${chordBeamY}`).to.be.at.most(2 * beamWidth);
        expect(chordTip, "the chord's stem ends below its noteheads").to.be.greaterThan(Math.max(...chord.getYs()));
        expect(bassTip, "the bass note's stem ends above its notehead").to.be.lessThan(Math.min(...bass.getYs()));
    });
});
