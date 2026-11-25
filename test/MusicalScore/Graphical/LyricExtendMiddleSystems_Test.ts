import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { GraphicalLine } from "../../../src/MusicalScore/Graphical/GraphicalLine";

/**
 * A lyric extend line held over more than two systems goes across the systems between its first and its last
 * (Handel, Care selve, soprano m44-49: "tà" held over m45-48, a whole system in the web, which had no line there).
 * The line was drawn only on the system of its syllable and on the system it stops in. Fixture: "tà" (m1) held to
 * the first note of m7 over four systems (new-system at m3, m5, m7), then "la". Without syllables there, the line is at
 * the verse's row under the staff line's lowest ink (m5 starts on a low G3), not at the first system's height (it went
 * through the tuplet brackets under Care selve m45). Same as the osmd-dart
 * test/lyric_extend_middle_systems_test.dart.
 */
describe("Lyric extend over middle systems", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.EngravingRules.NewSystemAtXMLNewSystemAttribute = true;
        await osmd.load(TestUtils.getScore("test_lyric_extend_middle_systems.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    function staffLines(): StaffLine[] {
        return osmd.GraphicSheet.MusicPages.flatMap(page => page.MusicSystems).map(system => system.StaffLines[0]);
    }

    it("draws the line on every system it is held over", () => {
        const lines: StaffLine[] = staffLines();
        expect(lines.map(line => line.Measures.map(m => m.MeasureNumber))).to.deep.equal([[1, 2], [3, 4], [5, 6], [7, 8]]);
        expect(lines.map(line => line.LyricLines.length)).to.deep.equal([1, 1, 1, 1]);
    });

    it("goes across a middle system, at the verse's row under its lowest note", () => {
        const lines: StaffLine[] = staffLines();
        const first: GraphicalLine = lines[0].LyricLines[0];
        for (const line of [lines[1], lines[2]]) {
            const middle: GraphicalLine = line.LyricLines[0];
            const firstMeasure = line.Measures[0].PositionAndShape;
            const lastMeasure = line.Measures[line.Measures.length - 1].PositionAndShape;
            // from the first note to the end of the staff line
            expect(middle.Start.x).to.be.greaterThan(firstMeasure.RelativePosition.x);
            expect(middle.Start.x).to.be.lessThan(firstMeasure.RelativePosition.x + firstMeasure.Size.width / 2);
            expect(middle.End.x).to.be.closeTo(lastMeasure.RelativePosition.x + lastMeasure.Size.width, 0.01);
            // its row is kept clear in the staff line's bottom line
            expect(line.SkyBottomLineCalculator.getBottomLineMaxInRange(middle.Start.x, middle.End.x))
                .to.be.at.least(middle.Start.y);
        }
        // under the stems of m3-4, not above the first system's row; m5's G3 two ledger lines below the staff: lower still
        expect(lines[1].LyricLines[0].Start.y).to.be.at.least(first.Start.y);
        expect(lines[2].LyricLines[0].Start.y).to.be.greaterThan(lines[1].LyricLines[0].Start.y + 0.5);
    });
});
