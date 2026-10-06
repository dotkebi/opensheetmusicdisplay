import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Couperin, Concerts royaux III Courante m5 (1722 review N-R15): a slur below from an upper-voice quarter to the next
 * eighth of the lower voice, whose down stems are beamed under the noteheads, goes from notehead to notehead over the
 * beam, as in the 1722 print. It hung under the beam, from the stem ends.
 * A slur over three notes (the third) stays a regular slur, around the stem ends.
 * Same as osmd-dart test/slur_head_to_head_between_voices_test.dart.
 */
describe("Slur from one voice to the next note of another voice", () => {
    async function slurs(): Promise<{ line: StaffLine, slurs: GraphicalSlur[] }> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore("test_slur_cross_voice_head_to_head.musicxml"));
        osmd.render();
        const line: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
        const sorted: GraphicalSlur[] = line.GraphicalSlurs.slice()
            .sort((a, b) => a.bezierStartPt.x - b.bezierStartPt.x);
        return { line, slurs: sorted };
    }

    it("draws a short arc between the noteheads, over the beam", async () => {
        const { slurs: all } = await slurs();
        expect(all.length).to.equal(3);
        for (const slur of all.slice(0, 2)) {
            const points: number[] = [slur.bezierStartPt.y, slur.bezierStartControlPt.y, slur.bezierEndControlPt.y,
                slur.bezierEndPt.y];
            // the noteheads are at 0 (F#5, G5) to 1.5 (D5, E5): the slur stays by them, far over the beam (about 4.5)
            expect(Math.max(...points)).to.be.lessThan(2.5, `slur ${points} under the noteheads, down to the beam`);
            expect(slur.bezierEndPt.x - slur.bezierStartPt.x).to.be.lessThan(3);
        }
    });

    it("keeps a slur over three notes around the stem ends", async () => {
        const { slurs: all } = await slurs();
        expect(all[2].bezierEndPt.y).to.be.greaterThan(4);
    });
});
