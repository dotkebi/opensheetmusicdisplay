import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalInstantaneousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalInstantaneousDynamicExpression";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A dynamic at a time inside the last note of a staff, after which the staff has no note in the piece, lies between that note
 * and the end of its measure, as one inside the last note of the piece: it was given no x and drawn at the start of the system
 * (Bowen, Viola Sonata No. 2 I, viola m437: the pp at the third beat of the last dotted half). Same fixture and checks as
 * osmd-dart test/dynamic_after_last_note_of_staff_test.dart.
 */
describe("A dynamic after the last note of a staff", () => {
    it("lies in that note's measure, after the note", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore("test_dynamic_after_last_note_of_staff.musicxml"));
        osmd.render();
        const staffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
        const pp: GraphicalInstantaneousDynamicExpression = staffLine.AbstractExpressions.find(e =>
            e instanceof GraphicalInstantaneousDynamicExpression) as GraphicalInstantaneousDynamicExpression;
        expect(pp).toBeDefined();
        const measure: GraphicalMeasure = staffLine.Measures[1];
        const noteX: number = measure.PositionAndShape.RelativePosition.x + measure.staffEntries[0].PositionAndShape.RelativePosition.x;
        const measureEnd: number = measure.PositionAndShape.RelativePosition.x + measure.PositionAndShape.BorderRight;
        const x: number = pp.PositionAndShape.RelativePosition.x;
        // two thirds of the way from the note to the end of the measure
        expect(x).toBeGreaterThan(noteX + (measureEnd - noteX) / 2);
        expect(x).toBeLessThan(measureEnd);
    });
});
