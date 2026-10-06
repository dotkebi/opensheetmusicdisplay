import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";

/**
 * A slur from before the endings to a note in the second ending is broken where the endings part (Schumann, Myrthen 18
 * m31-33, recheck M18-D05: one arch over the first ending to the second): its part over the first ending ends at the first
 * ending's end, the second ending starts with a piece from its barline. With an alternative slur from the same start into
 * the first ending (Myrthen 18 slur 1), only the second ending's piece is drawn.
 * Same as osmd-dart test/slur_into_second_ending_test.dart.
 *
 * Fixture test_slur_into_second_ending.musicxml (synthetic, 4/4): slur 1 m1 -> first ending m2 and slur 2 m1 -> second
 * ending m3 from the same note; slur 3 m4 -> second ending m6 alone (first ending m5).
 */
describe("Slurs into a second ending", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    const byEnd: { [endMeasure: number]: GraphicalSlur[] } = {};

    before(async () => {
        container = TestUtils.getDivElement(document);
        container.style.width = "1600px";
        osmd = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore("test_slur_into_second_ending.musicxml"));
        osmd.render();
        for (const system of osmd.GraphicSheet.MusicPages[0].MusicSystems) {
            for (const line of system.StaffLines) {
                for (const slur of line.GraphicalSlurs) {
                    (byEnd[slur.slur.EndNote.SourceMeasure.MeasureNumberXML] ??= []).push(slur);
                }
            }
        }
    });
    after(() => {
        osmd.clear();
        container.remove();
    });

    function measures(slur: GraphicalSlur): string {
        const numbers: number[] = [];
        for (const entry of slur.staffEntries) {
            if (numbers.indexOf(entry.parentMeasure.MeasureNumber) < 0) {
                numbers.push(entry.parentMeasure.MeasureNumber);
            }
        }
        return numbers.join(",");
    }

    it("leaves a slur into the first ending alone", () => {
        expect(byEnd[2].length).to.equal(1);
        expect(measures(byEnd[2][0])).to.equal("1,2");
        expect(byEnd[2][0].isVoltaPiece).to.equal(false);
    });

    it("with an alternative slur: draws only the second ending piece", () => {
        expect(byEnd[3].length, "no arch over the first ending").to.equal(1);
        const piece: GraphicalSlur = byEnd[3][0];
        expect(measures(piece)).to.equal("3");
        expect(piece.isVoltaPiece).to.equal(true);
        const m3: GraphicalMeasure = osmd.GraphicSheet.MeasureList[2][0];
        expect(piece.bezierStartPt.x, "starts at the second ending barline").to.be.lessThan(m3.PositionAndShape.RelativePosition.x + 2);
        expect(piece.bezierStartPt.x).to.be.greaterThan(m3.PositionAndShape.RelativePosition.x - 0.5);
    });

    it("alone: over the first ending to its end, and a second ending piece", () => {
        expect(byEnd[6].map(measures).sort()).to.deep.equal(["4,5", "6"]);
        expect(byEnd[6].every(slur => slur.isVoltaPiece)).to.equal(true);
        const first: GraphicalSlur = byEnd[6].find(slur => measures(slur) === "4,5");
        const m5: GraphicalMeasure = osmd.GraphicSheet.MeasureList[4][0];
        expect(first.bezierEndPt.x, "ends at the end of the first ending")
            .to.be.closeTo(m5.PositionAndShape.RelativePosition.x + m5.PositionAndShape.Size.width, 1.5);
    });
});
