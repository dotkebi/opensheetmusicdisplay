import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { TestUtils } from "../../../Util/TestUtils";
import Vex from "vexflow";
const VF: any = Vex.Flow;

/**
 * Parisotti, Paisiello Il mio ben quando verrà Piano m24, left hand (renderer leftovers 2, 2-3 P29-S1): the upper voice's
 * beamed eighths with their stems down, low in the staff, and the lower voice's eighth rests at the beat. The rest, kept at
 * most two lines under the staff, sat on the beam: a beam (not a lone stem) is cleared beyond that limit
 * (VexFlowPatch stavenote.js osmdPlaceRests()). Same as osmd-dart test/rest_under_beam_other_voice_test.dart.
 */
describe("Rest under the other voice's beam", () => {
    it("the lower voice's rest clears the upper voice's beam under the staff", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "700px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore("test_rest_under_beam_other_voice.musicxml"));
        osmd.render();
        const measure: any = osmd.GraphicSheet.MeasureList[0][0];
        // the second beat: the upper voice's A2 (stem down, beamed) and the lower voice's eighth rest
        const entry: any = measure.staffEntries.find((se: any) => Math.abs(se.relInMeasureTimestamp.RealValue - 0.25) < 1e-9);
        const notes: any[] = entry.graphicalVoiceEntries.map((gve: VexFlowVoiceEntry) => gve.vfStaveNote);
        const note: any = notes.find(n => !n.isRest());
        const rest: any = notes.find(n => n.isRest());
        expect(note.getStemDirection(), "stem down").to.equal(VF.Stem.DOWN);
        expect(note.beam, "beamed").to.not.equal(undefined);
        const headLow: number = Math.min(...note.getKeyProps().map((k: any) => k.line));
        const beamLow: number = headLow - (VF.Stem.HEIGHT / 10 + 1);
        const restTop: number = rest.getKeyLine(0) + rest.glyph.line_above;
        expect(rest.getKeyLine(0), "beyond the two-line limit, under the beam").to.be.lessThan(-1);
        expect(restTop, `rest top ${restTop} under the beamed stems ${beamLow}`).to.be.at.most(beamLow + 1e-9);
    });
});
