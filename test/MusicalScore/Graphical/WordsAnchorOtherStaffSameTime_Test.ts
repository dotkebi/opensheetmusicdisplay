import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalUnknownExpression } from "../../../src/MusicalScore/Graphical/GraphicalUnknownExpression";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";

/**
 * "Fin" written on the right hand on the third beat, where only the left hand has a note, was interpolated between the
 * right hand's notes of its measure and the next one, so it was drawn near the next measure's first note and stacked
 * with the "1er Couplet" above it (Couperin, Concerts royaux II Échos m16). It is now drawn at the left hand's note.
 */
describe("Words at a time only another staff of the instrument plays", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    let staffLines: StaffLine[];
    let wordsX: Map<string, number>;
    let wordsLeft: Map<string, number>;
    const entryX: (measure: GraphicalMeasure, index: number) => number = (measure, index) =>
        measure.PositionAndShape.RelativePosition.x + measure.staffEntries[index].PositionAndShape.RelativePosition.x;

    before(async () => {
        container = document.createElement("div");
        container.style.width = "1300px";
        document.body.appendChild(container);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_words_anchor_other_staff_same_time.musicxml"));
        osmd.render();
        staffLines = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines;
        wordsX = new Map();
        wordsLeft = new Map();
        for (const expression of staffLines[1].AbstractExpressions) {
            if (expression instanceof GraphicalUnknownExpression) {
                wordsX.set(expression.Label.Label.text, expression.Label.PositionAndShape.RelativePosition.x);
                wordsLeft.set(expression.Label.Label.text, expression.Label.PositionAndShape.BorderLeft);
            }
        }
    });
    after(() => {
        container.remove();
    });

    it("are drawn at the other staff's note", () => {
        // m1: the left hand's D2 on the third beat
        expect(wordsX.get("Fin")).to.be.closeTo(entryX(staffLines[2].Measures[0], 1), 0.001);
        expect(wordsX.get("Fin")).to.be.lessThan(staffLines[1].Measures[1].PositionAndShape.RelativePosition.x);
    });

    it("stay at a note of their own staff, not left of its measure", () => {
        // (centered on the note, "Couplet" would start left of the barline: it starts at the measure, see
        //   WordsMeasureStart_Test)
        const measure: GraphicalMeasure = staffLines[1].Measures[1];
        const start: number = measure.PositionAndShape.RelativePosition.x + measure.beginInstructionsWidth;
        const expected: number = Math.max(entryX(measure, 0), start - wordsLeft.get("Couplet"));
        expect(wordsX.get("Couplet")).to.be.closeTo(expected, 0.01);
    });

    it("do not use a note of another instrument", () => {
        // m2 third beat: only the violin plays, so the right hand's notes are still interpolated (2/3 of the way to m3)
        const left: number = entryX(staffLines[1].Measures[1], 0);
        const right: number = entryX(staffLines[1].Measures[2], 0);
        expect(wordsX.get("doux")).to.be.closeTo(left + (right - left) * 2 / 3, 0.001);
        expect(Math.abs(wordsX.get("doux") - entryX(staffLines[0].Measures[1], 2))).to.be.greaterThan(0.001);
    });
});
