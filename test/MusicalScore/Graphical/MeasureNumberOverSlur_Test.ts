import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { GraphicalLabel } from "../../../src/MusicalScore/Graphical/GraphicalLabel";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { PointF2D } from "../../../src/Common/DataObjects/PointF2D";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Couperin, Concerts royaux IV Rigaudon m5 (1722 review N-R12): measure numbers are placed before the slurs, and a slur
 * above over the barline ran through the number of the next measure. The number goes over the slur.
 * Same as osmd-dart test/measure_number_over_slur_test.dart.
 */
describe("Measure number over a slur", () => {
    it("raises a measure number over a slur above the staff under it", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        osmd.EngravingRules.RenderMeasureNumbersOnlyAtSystemStart = false;
        osmd.EngravingRules.MeasureNumberLabelOffset = 1;
        await osmd.load(TestUtils.getScore("test_measure_number_over_slur.musicxml"));
        osmd.render();
        const system: MusicSystem = osmd.GraphicSheet.MusicPages[0].MusicSystems[0];
        const label: GraphicalLabel = system.MeasureNumberLabels.find(l => l.Label.text === "2");
        expect(label, "number 2").to.not.equal(undefined);
        const slur: GraphicalSlur = system.StaffLines[0].GraphicalSlurs[0];
        const box: any = label.PositionAndShape;
        // the label is relative to the system, the slur to the staff line
        const staffX: number = system.StaffLines[0].PositionAndShape.RelativePosition.x;
        const left: number = box.RelativePosition.x + box.BorderMarginLeft - staffX;
        const right: number = box.RelativePosition.x + box.BorderMarginRight - staffX;
        let slurTop: number = Number.POSITIVE_INFINITY;
        for (let i: number = 0; i <= 64; i++) {
            const point: PointF2D = slur.calculateCurvePointAtIndex(i / 64);
            if (point.x >= left && point.x <= right) {
                slurTop = Math.min(slurTop, point.y);
            }
        }
        expect(slurTop, "the slur passes under the number").to.be.lessThan(Number.POSITIVE_INFINITY);
        expect(box.RelativePosition.y + box.BorderMarginBottom).to.be.at.most(slurTop - GraphicalSlur.thickness);
    });
});
