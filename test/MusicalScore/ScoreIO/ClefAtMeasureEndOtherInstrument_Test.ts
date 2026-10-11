import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { ClefInstruction, ClefEnum } from "../../../src/MusicalScore/VoiceData/Instructions/ClefInstruction";
import { SourceStaffEntry } from "../../../src/MusicalScore/VoiceData/SourceStaffEntry";

/**
 * A clef just before the measure's end (the end-of-measure clef path) is stored on its own staff also when its
 * instrument is not the first one: it went to the staff with the same number within the first instrument
 * (Vieuxtemps, Grand Concerto Op. 31 m194: the piano left hand's bass clef drawn on the right hand from m196 on;
 * individual 32 fix D, D-1 of 2026-10-11). Same as osmd-dart test/clef_end_of_measure_other_instrument_test.dart.
 */
describe("Clef at the measure's end on a later instrument", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(() => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    function clefsAtEnd(entry: SourceStaffEntry): string[] {
        return !entry ? [] : entry.Instructions.filter(i => i instanceof ClefInstruction)
            .map(c => ClefEnum[(c as ClefInstruction).ClefType]);
    }

    /** test_clef_end_of_measure_second_instrument.musicxml: violin, then piano; m1 and m3 last five quarters in 4/4.
     *  The left hand turns to the treble clef after its last note of m1 (the measure's last node) and back to the bass
     *  clef after its last note of m3 (a right-hand voice follows). Staves: 0 violin, 1 right hand, 2 left hand. */
    it("goes to its own staff at the end of its measure", async () => {
        await osmd.load(TestUtils.getScore("test_clef_end_of_measure_second_instrument.musicxml"));
        osmd.render();
        const measures: any[] = osmd.Sheet.SourceMeasures;
        const atEnd: (m: number) => string[][] = m => [0, 1, 2].map(s => clefsAtEnd(measures[m].LastInstructionsStaffEntries[s]));
        expect(atEnd(0), "m1").to.deep.equal([[], [], ["G"]]);
        expect(atEnd(1), "m2").to.deep.equal([[], [], []]);
        expect(atEnd(2), "m3").to.deep.equal([[], [], ["F"]]);
    });
});
