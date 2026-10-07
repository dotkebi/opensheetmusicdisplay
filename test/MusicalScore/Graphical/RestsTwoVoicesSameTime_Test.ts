import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Rests of both voices of a staff at the same time, with no note there, were drawn on each other (Gluck, O del mio dolce
 * ardor, Parisotti, piano m10, the right hand: voice 1's half rest and voice 2's 16th rest, solo vocal review E10-F13).
 * The upper voice's rest goes up and the lower voice's down, a quarter of a space apart, as in the Ricordi print.
 * Same as osmd-dart test/rests_two_voices_same_time_test.dart.
 */
describe("Rests of two voices at the same time", () => {
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        // (VexFlowPatch: run `npm run prebuildVexflow` before this test after changing stavenote.js)
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "800px";
        osmd = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore("test_rests_two_voices_same_time.musicxml"));
        osmd.render();
    });

    /** the rests of voices 1 and 2 at the first staff entry of the measure */
    function rests(measure: number): any[] {
        const entries: VexFlowVoiceEntry[] = osmd.GraphicSheet.MeasureList[measure][0].staffEntries[0]
            .graphicalVoiceEntries as VexFlowVoiceEntry[];
        return [1, 2].map(voice => entries.find(e => e.parentVoiceEntry.ParentVoice.VoiceId === voice).vfStaveNote);
    }

    it("puts the upper voice's rest above the lower voice's rest, clear of it", () => {
        const [upper, lower] = rests(0); // half rest, 16th rest
        expect(upper.isRest() && lower.isRest(), "both rests").to.equal(true);
        const upperBottom: number = upper.getKeyLine(0) - upper.glyph.line_below;
        const lowerTop: number = lower.getKeyLine(0) + lower.glyph.line_above;
        // a quarter of a space apart, as a rest from another voice's note
        expect(upperBottom, `half rest bottom ${upperBottom}, 16th rest top ${lowerTop}`).to.be.at.least(lowerTop + 0.25);
    });

    it("leaves two rests of the same duration on each other (one rest of both voices, as the app draws it)", () => {
        const [upper, lower] = rests(1); // two quarter rests
        expect(upper.getKeyLine(0), "same line").to.equal(lower.getKeyLine(0));
    });
});
