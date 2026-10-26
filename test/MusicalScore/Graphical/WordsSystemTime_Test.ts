import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalLabel } from "../../../src/MusicalScore/Graphical/GraphicalLabel";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { Fraction } from "../../../src/Common/DataObjects/Fraction";

/**
 * Words, tempo texts and verbal dynamics of a staff that gives no x for their time take it from the other staves of the system
 * (MusicSheetCalculator.takesTimeFromSystem(), user decision 2026-10-27 A+D). Same fixture and checks as osmd-dart
 * test/words_system_time_test.dart.
 *
 * Fixture test_words_system_time.musicxml (synthetic, piano, C major, 3/4): m2 a whole-measure rest in the right hand, "rall."
 * below it at the downbeat (Nielsen, Clarinet Concerto m251: drawn at the rest in the middle of the measure); m3 an invisible
 * rest as long as the measure in the right hand under left-hand eighths that cross to it from beat 2, "dim." below it at the
 * downbeat (Bowen, Viola Sonata No. 2 m279: drawn at the rest); m4 no right-hand note, "dim." above it on beat 2 (Schumann,
 * Piano Quartet III m117: interpolated between the right hand's notes of m3 and m5); m5 as m2 with the tempo "poco accel."
 * (Nielsen m471). Each is drawn at the left hand's note of its time.
 */
describe("Texts of a staff with no x for their time", () => {
    it("go to the time in the system: the left hand's note of their time", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        container.style.width = "1400px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
        try {
            await osmd.load(TestUtils.getScore("test_words_system_time.musicxml"));
            osmd.render();
            const measures: GraphicalMeasure[][] = osmd.GraphicSheet.MeasureList;
            const leftEdge: (l: GraphicalLabel) => number = (l: GraphicalLabel) =>
                l.PositionAndShape.AbsolutePosition.x + l.PositionAndShape.BorderLeft;
            const label: (text: string, number: number) => GraphicalLabel = (text: string, number: number) => {
                const measure: GraphicalMeasure = measures[number - 1][0];
                const line: StaffLine = measure.ParentStaffLine;
                const x0: number = measure.PositionAndShape.AbsolutePosition.x;
                const x1: number = x0 + measure.PositionAndShape.BorderRight;
                const found: GraphicalLabel[] = line.AbstractExpressions
                    .map(e => ((e as any).Label ?? (e as any).GraphicalLabel) as GraphicalLabel)
                    .filter(l => l?.Label?.text === text && leftEdge(l) >= x0 - 0.5 && leftEdge(l) < x1);
                expect(found.length, `${text} m${number}`).to.equal(1);
                return found[0];
            };
            const leftHandX: (number: number, time: Fraction) => number = (number: number, time: Fraction) =>
                measures[number - 1][1].staffEntries.find(se => se.relInMeasureTimestamp.Equals(time)).PositionAndShape.AbsolutePosition.x;
            const cases: [string, number, Fraction][] = [
                ["rall.", 2, new Fraction(0, 1)],
                ["dim.", 3, new Fraction(0, 1)],
                ["dim.", 4, new Fraction(1, 4)],
                ["poco accel.", 5, new Fraction(0, 1)],
            ];
            for (const [text, number, time] of cases) {
                expect(leftEdge(label(text, number)), `${text} m${number}`).to.be.closeTo(leftHandX(number, time), 1e-6);
            }
        } finally {
            osmd.clear();
            container.remove();
        }
    });
});
