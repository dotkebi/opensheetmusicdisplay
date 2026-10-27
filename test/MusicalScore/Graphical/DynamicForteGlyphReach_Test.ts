import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { CrossStaffExpressionClearance } from "../../../src/MusicalScore/Graphical/VexFlow/CrossStaffExpressionClearance";

/**
 * A dynamic's f reaches out of its label's box with its hook (and a first f with its tail), as
 * CrossStaffExpressionClearance.dynamicBox(): the words beside a dynamic that ends with an f start that much later, and the sky
 * (bottom) line under a dynamic is read under its glyphs. Same as osmd-dart's test/dynamic_forte_glyph_reach_test.dart.
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

    // Mozart, Flute Concerto K.313 I m206-212 (test_forte_over_stem.musicxml, m209): the f above the staff at the D5 of the second beat,
    //   its stem up and beamed; placed by its box alone, the f missed the stem right of it and came down onto the stem and the beam
    //   (81sabo K313I-RENDER-WEB-F209; here at 1125 px: whether the stem's sample was read depended on where the measures' sky
    //   line samples fell, and the stem was just past the f's box). It stays over them.
    it("keeps an f above over the stem and beam beside it", async () => {
        const {osmd, container} = await render("test_forte_over_stem.musicxml", 1125);
        const staffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
        const f: BoundingBox = label(staffLine, "f");
        const fLeft: number = f.AbsolutePosition.x + f.BorderLeft;
        const fRight: number = f.AbsolutePosition.x + f.BorderRight;
        const fBottom: number = f.AbsolutePosition.y + f.BorderBottom;
        // the up stem nearest right of the f's centre: the D5's
        const centre: number = (fLeft + fRight) / 2;
        let stemX: number = undefined;
        let stemTop: number = undefined;
        for (const measure of staffLine.Measures) {
            for (const entry of measure.staffEntries) {
                for (const gve of entry.graphicalVoiceEntries) {
                    const note: any = (gve as VexFlowVoiceEntry).vfStaveNote;
                    if (!note || note.getStemDirection() !== 1) {
                        continue;
                    }
                    const x: number = note.getStemX() / 10;
                    if (x > centre && (stemX === undefined || x < stemX)) {
                        stemX = x;
                        stemTop = note.getStemExtents().topY / 10;
                    }
                }
            }
        }
        expect(stemX).to.not.equal(undefined);
        expect(stemX - fRight, `the stem at ${stemX} right beside the f (${fRight})`)
            .to.be.lessThan(CrossStaffExpressionClearance.ForteReachRight + 0.3);
        expect(fBottom, `f bottom ${fBottom}, stem top ${stemTop}`).to.be.at.most(stemTop + 1e-6);
        osmd.clear();
        container.remove();
    });
});
