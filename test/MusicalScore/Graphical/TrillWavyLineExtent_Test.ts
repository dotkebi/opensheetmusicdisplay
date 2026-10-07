import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowVibratoBracket } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVibratoBracket";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";

/**
 * A trill's wavy line runs from its main note to where it stops (Legrenzi, Che fiero costume, piano m16 and m32,
 * solo vocal review E12-F05): `<wavy-line type="start">` is on the chord note F#5 over D5, which was read at the
 * time after the chord (the reader's current time had passed it), so the line started at the grace notes before the
 * next note. Same as the osmd-dart test/trill_wavy_line_extent_test.dart.
 */
describe("Trill wavy line extent", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_trill_wavy_line_extent.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    function brackets(): VexFlowVibratoBracket[] {
        const result: VexFlowVibratoBracket[] = [];
        for (const page of osmd.GraphicSheet.MusicPages) {
            for (const system of page.MusicSystems) {
                for (const staffLine of system.StaffLines as StaffLine[]) {
                    result.push(...(staffLine.WavyLines as VexFlowVibratoBracket[]));
                }
            }
        }
        return result;
    }
    function where(bracket: VexFlowVibratoBracket, start: boolean): string {
        const entry: any = (start ? bracket.startVfVoiceEntry : bracket.endVfVoiceEntry).parentStaffEntry;
        return `m${entry.parentMeasure.MeasureNumber}@${entry.relInMeasureTimestamp.toString()}`;
    }

    it("starts at the trill's note, also a chord note, and ends at its stop", () => {
        // one span per wavy line: from its first piece's start to its last piece's end (a system break splits it)
        const spans: string[] = [];
        let previous: VexFlowVibratoBracket = undefined;
        for (const bracket of brackets()) {
            if (previous?.getWavyLine === bracket.getWavyLine) {
                spans[spans.length - 1] = spans[spans.length - 1].split("-")[0] + "-" + where(bracket, false);
            } else {
                spans.push(`${where(bracket, true)}-${where(bracket, false)}`);
            }
            previous = bracket;
        }
        expect(spans).to.deep.equal([
            "m1@1/4-m1@5/8", // chord note F#5 (D5 at 1/4) to the grace notes' entry (G5)
            "m2@1/4-m2@5/8",
            "m3@3/4-m4@0/1", // into the next measure
        ]);
    });
});
