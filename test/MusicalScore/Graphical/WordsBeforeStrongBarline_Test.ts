import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalUnknownExpression } from "../../../src/MusicalScore/Graphical/GraphicalUnknownExpression";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { SystemLinesEnum } from "../../../src/MusicalScore/Graphical/SystemLinesEnum";
import { MusicSheetCalculator } from "../../../src/MusicalScore/Graphical/MusicSheetCalculator";

/**
 * Words in a measure that ends with a repeat or final barline end before it (Couperin, Concerts royaux, 1722 review
 * N-R13): "fin." at the last beat before a backward repeat (II Echos m16) ran over the repeat sign, and
 * "au Rondeau pour finir." after the last note of the final measure, where a key change follows the note
 * (IV Forlane m60), was pushed left over the measure's first barline. The final measure is now wide enough for the
 * words after its last note. Same rule as osmd-dart (words_before_strong_barline_test.dart).
 */
describe("Words before a repeat or final barline", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1024px";
        document.body.appendChild(container);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
    });
    afterEach(() => {
        container.remove();
    });

    it("end before the barline and after the measure's start", async () => {
        await osmd.load(TestUtils.getScore("test_words_before_strong_barline.musicxml"));
        osmd.render();
        const staffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
        const words: Map<string, BoundingBox> = new Map();
        for (const expression of staffLine.AbstractExpressions) {
            if (expression instanceof GraphicalUnknownExpression) {
                words.set(expression.Label.Label.text, expression.Label.PositionAndShape);
            }
        }
        const cases: [string, number, SystemLinesEnum][] = [
            ["fin.", 1, SystemLinesEnum.DotsThinBold],
            ["au Rondeau pour finir.", 2, SystemLinesEnum.ThinBold],
        ];
        for (const [text, measureIndex, style] of cases) {
            const label: BoundingBox = words.get(text);
            expect(label, text).to.not.equal(undefined);
            const measure: BoundingBox = staffLine.Measures[measureIndex].PositionAndShape;
            const measureEnd: number = measure.RelativePosition.x + measure.Size.width;
            const right: number = label.RelativePosition.x + label.BorderRight;
            expect(right, `"${text}" ends at ${right}, the measure at ${measureEnd}`)
                .to.be.at.most(measureEnd - MusicSheetCalculator.wordsBarlineMargin(style) + 0.01);
            const left: number = label.RelativePosition.x + label.BorderLeft;
            expect(left, `"${text}" starts at ${left}, the measure at ${measure.RelativePosition.x}`)
                .to.be.above(measure.RelativePosition.x);
        }
    });
});
