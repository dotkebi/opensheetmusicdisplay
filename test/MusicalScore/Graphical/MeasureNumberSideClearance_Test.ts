import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalLabel } from "../../../src/MusicalScore/Graphical/GraphicalLabel";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { MusicSheetCalculator } from "../../../src/MusicalScore/Graphical/MusicSheetCalculator";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Parisotti, Pur dicesti Canto m137 / Stizzoso Canto m96 (renderer leftovers 2, 2-1): the measure number was placed from the
 * sky line of its own width shrunk by 0.5 on each side and without a clearance, so the accent (or the flat) over the measure's
 * first note, right beside the number at the same height, touched it ("137>", "96♭"). The number keeps
 * measureNumberSideClearance to the ink beside it and measureNumberClearance over the ink it is raised by.
 * Same as osmd-dart test/measure_number_side_clearance_test.dart (which also covers a number raised by the ink under it).
 */
describe("Measure number side clearance", () => {
    async function render(renderMeasureNumbers: boolean): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        osmd.EngravingRules.RenderMeasureNumbers = renderMeasureNumbers;
        osmd.EngravingRules.RenderMeasureNumbersOnlyAtSystemStart = false;
        osmd.EngravingRules.MeasureNumberLabelOffset = 1;
        await osmd.load(TestUtils.getScore("test_measure_number_side_clearance.musicxml"));
        osmd.render();
        return osmd;
    }

    it("a measure number clears the ink beside it", async () => {
        const osmd: OpenSheetMusicDisplay = await render(true);
        const system: MusicSystem = osmd.GraphicSheet.MusicPages[0].MusicSystems[0];
        const label: GraphicalLabel = system.MeasureNumberLabels.find(l => l.Label.text === "137");
        expect(label, "number 137").to.not.equal(undefined);
        const staffLine: StaffLine = system.StaffLines[0];
        const box: any = label.PositionAndShape;
        const staffX: number = staffLine.PositionAndShape.RelativePosition.x;
        const left: number = box.RelativePosition.x - staffX;
        const right: number = left - box.BorderLeft + box.BorderRight;
        const side: number = MusicSheetCalculator.measureNumberSideClearance;
        // the ink alone: the same layout without measure numbers (the number reserves its own place in the sky line)
        const inkLine: StaffLine = (await render(false)).GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
        const ink: number = inkLine.SkyBottomLineCalculator.getSkyLineMinInRange(left - side, right + side);
        expect(ink, "the flat and the accent over the first note, at the number's right edge").to.be.lessThan(-1);
        expect(inkLine.SkyBottomLineCalculator.getSkyLineMinInRange(left + 0.5, right - 0.5),
            "nothing under the number's width shrunk by 0.5 on each side (where upstream read)").to.be.at.least(0);
        const labelBottom: number = box.RelativePosition.y + box.BorderMarginBottom;
        expect(labelBottom, `number bottom ${labelBottom} over the ink ${ink}`)
            .to.be.at.most(ink - MusicSheetCalculator.measureNumberClearance + 1e-6);
    });
});
