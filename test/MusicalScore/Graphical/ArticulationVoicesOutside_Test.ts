import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import Vex from "vexflow";
const VF: any = Vex.Flow;

/**
 * With two voices on a staff, an articulation without placement goes outside, on its voice's stem side: the upper
 * voice's above, the lower voice's below (Caccini, Amarilli, mia bella, Schirmer, piano m4, m11–12, solo vocal review
 * E03-F03). They were on the notehead side, between the voices, as for a single voice. One voice keeps the notehead
 * side, and a placement in the XML still wins. Same as the osmd-dart test/articulation_voices_outside_test.dart.
 */
describe("Articulations of two voices on a staff", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_articulation_voices_outside.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    it("puts the upper voice's above and the lower voice's below", () => {
        const positions: string[] = [];
        for (const row of osmd.GraphicSheet.MeasureList) {
            for (const staffEntry of row[0].staffEntries) {
                for (const gve of staffEntry.graphicalVoiceEntries) {
                    for (const modifier of ((gve as VexFlowVoiceEntry).vfStaveNote as any).getModifiers()) {
                        if (modifier.getCategory() === "articulations") {
                            const above: boolean = modifier.getPosition() === VF.Modifier.Position.ABOVE;
                            positions.push(`m${row[0].MeasureNumber} v${gve.parentVoiceEntry.ParentVoice.VoiceId} ${modifier.type} ` +
                                (above ? "above" : "below"));
                        }
                    }
                }
            }
        }
        expect(positions).to.deep.equal([
            "m1 v1 a> above", "m1 v2 a> below", "m1 v1 a. above", "m1 v2 a- below",
            "m2 v1 a> below", "m2 v1 a> above", // one voice: notehead side
            "m3 v1 a> below", "m3 v2 a> above", // placement from the XML
            "m4 v1 a> above", // alone at its time: notehead side
        ]);
    });
});
