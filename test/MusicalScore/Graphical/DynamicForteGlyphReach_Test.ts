import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { CrossStaffExpressionClearance } from "../../../src/MusicalScore/Graphical/VexFlow/CrossStaffExpressionClearance";

/**
 * A dynamic's f reaches out of its label's box with its hook (and a first f with its tail), as
 * CrossStaffExpressionClearance.dynamicBox(): the words beside a dynamic that ends with an f start that much later, where they fit
 * on its line. Same as osmd-dart's test/dynamic_forte_glyph_reach_test.dart (whose second test, an f over the stem beside it, is
 * app only: reading the sky line under the f's ink moved fs down onto other glyphs beside them, 10-28).
 */
describe("Dynamics: the reach of the f glyph", () => {
    const render: (fixture: string, width: number) => Promise<{osmd: OpenSheetMusicDisplay, container: HTMLElement}> =
        async (fixture: string, width: number) => {
            const container: HTMLElement = TestUtils.getDivElement(document);
            container.style.width = `${width}px`;
            const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
            await osmd.load(TestUtils.getScore(fixture));
            osmd.render();
            return {osmd, container};
        };
    const label: (staffLine: StaffLine, text: string) => BoundingBox = (staffLine: StaffLine, text: string) => {
        const found: BoundingBox[] = staffLine.AbstractExpressions.filter(e => e.Label?.Label?.text === text).map(e => e.Label.PositionAndShape);
        expect(found.length, text).to.equal(1);
        return found[0];
    };

    // Sibelius, Violin Concerto Op. 47 III m188-191 (test_words_beside_forte_dynamic.musicxml): "Poco a poco più energico" beside
    //   the mf, on its baseline, touched the f's hook with its P (81sabo SIB3C-VIS-pages33_36-015, SIB3C-APP1024-09).
    for (const width of [1000, 1390]) {
        it(`starts the words after an mf after the f's hook (${width})`, async () => {
            const {osmd, container} = await render("test_words_beside_forte_dynamic.musicxml", width);
            const staffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
            const mf: BoundingBox = label(staffLine, "mf");
            const words: BoundingBox = label(staffLine, "Poco a poco più energico");
            // beside the dynamic, on its line
            expect(words.AbsolutePosition.y + words.BorderBottom, `words ${words.AbsolutePosition.y}, mf ${mf.AbsolutePosition.y}`)
                .to.be.closeTo(mf.AbsolutePosition.y + mf.BorderBottom, 0.6);
            const hook: number = mf.AbsolutePosition.x + mf.BorderRight + CrossStaffExpressionClearance.ForteReachRight;
            const wordsLeft: number = words.AbsolutePosition.x + words.BorderLeft;
            expect(wordsLeft - hook, `words at ${wordsLeft}, the f's hook to ${hook}`).to.be.at.least(0.3);
            osmd.clear();
            container.remove();
        });
    }
});
