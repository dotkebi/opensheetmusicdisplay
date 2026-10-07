import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A rest goes on the side of its voice's notes on its own staff (Gluck, O del mio dolce ardor, Schirmer, piano m26-28,
 * solo vocal review E11-F07): the left hand's voice 1 has down stems (C3 and 8th rests) under voice 2's up-stemmed 16ths
 * (16th rest, A3-C4). OSMD keeps one Voice per voice number for the whole part, so the right hand's voice 1 (up stems)
 * made the left hand's voice 1 "both directions" for restSideFromVoice(), and the voice number put its 8th rest above,
 * into voice 2's beam, and voice 2's 16th rest below, onto voice 1's flag.
 * Same as osmd-dart test/rest_side_own_staff_test.dart.
 */
describe("Rest side by the voice's notes on its own staff", () => {
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "800px";
        osmd = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore("test_rest_side_own_staff.musicxml"));
        osmd.render();
    });

    /** the key lines of the rest and of the lowest and highest note of the left hand's staff entry */
    function lines(entryIndex: number): { rest: number, low: number, high: number } {
        const entries: VexFlowVoiceEntry[] = osmd.GraphicSheet.MeasureList[0][1].staffEntries[entryIndex]
            .graphicalVoiceEntries as VexFlowVoiceEntry[];
        const restNote: any = entries.find(e => e.notes[0].sourceNote.isRest()).vfStaveNote;
        const noteLines: number[] = entries.filter(e => !e.notes[0].sourceNote.isRest())
            .map(e => (e.vfStaveNote as any).getKeyProps().map((props: any) => props.line)).flat();
        return { rest: restNote.getKeyProps()[0].line, low: Math.min(...noteLines), high: Math.max(...noteLines) };
    }

    it("puts the down-stemmed voice's 8th rest below the up-stemmed voice's notes", () => {
        const { rest, low } = lines(2); // 1/8: voice 1's 8th rest, voice 2's A3-C4
        expect(rest, `rest line ${rest}, lowest note line ${low}`).to.be.lessThan(low);
    });

    it("puts the up-stemmed voice's 16th rest above the down-stemmed voice's note", () => {
        const { rest, high } = lines(0); // 0: voice 2's 16th rest, voice 1's C3
        expect(rest, `rest line ${rest}, note line ${high}`).to.be.greaterThan(high);
    });
});
