import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalContinuousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalContinuousDynamicExpression";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";

/**
 * A verbal crescendo ("cresc.") puts its label's top into the sky line only in the samples its box covers completely
 * (SkyBottomLineCalculator.updateSkyLineWithLabel()). osmd-dart rounded the label's margins to whole staff spaces and
 * then outward to the samples (solo vocal review E12-F05, E13-F10); the web already does this, the test keeps the two
 * the same. Same as the osmd-dart test/verbal_cresc_skyline_extent_test.dart.
 */
describe("Verbal crescendo sky line extent", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_verbal_cresc_skyline_extent.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    it("puts the label's height only in the samples its box covers", () => {
        let words: number = 0;
        for (const system of osmd.GraphicSheet.MusicPages[0].MusicSystems) {
            for (const line of system.StaffLines as StaffLine[]) {
                const sky: number[] = line.SkyBottomLineCalculator.SkyLine;
                const su: number = sky.length / line.PositionAndShape.Size.width;
                for (const e of line.AbstractExpressions) {
                    if (!(e instanceof GraphicalContinuousDynamicExpression) || !e.IsVerbal) {
                        continue;
                    }
                    words++;
                    const box: any = e.PositionAndShape;
                    const left: number = box.RelativePosition.x + box.BorderMarginLeft;
                    const right: number = box.RelativePosition.x + box.BorderMarginRight;
                    const top: number = box.RelativePosition.y + box.BorderMarginTop;
                    // a space either side: only low eighth notes there
                    for (let i: number = Math.floor((left - 1) * su); i < (right + 1) * su; i++) {
                        const covered: boolean = i / su >= left && (i + 1) / su <= right;
                        if (covered) {
                            expect(sky[i], `sample ${i / su} in [${left}, ${right}]`).to.be.at.most(top + 1e-6);
                        } else {
                            expect(sky[i], `sample ${i / su} outside [${left}, ${right}], label top ${top}`)
                                .to.be.greaterThan(top + 0.5);
                        }
                    }
                }
            }
        }
        expect(words).to.equal(6);
    });
});
