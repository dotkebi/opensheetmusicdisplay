import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { MusicSheetCalculator } from "../../../src/MusicalScore/Graphical/MusicSheetCalculator";
import { GraphicalInstantaneousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalInstantaneousDynamicExpression";
import { GraphicalUnknownExpression } from "../../../src/MusicalScore/Graphical/GraphicalUnknownExpression";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Words qualifying a dynamic go before it on its line also when the dynamic follows them shortly ("più" at the third beat,
 * f half a beat later: Schumann, Piano Quartet Op. 47 II m22, m26), and "mezzo" qualifies a dynamic ("mezzo f": Schubert/Reger,
 * Gretchen am Spinnrade m8). Other words ("dolce") don't join a later dynamic. At the end of a line, the dynamic after the
 * words moves only as far as there is room, and the words start left of the first note (Schumann, op. cit. IV m294). Same fixture and checks as osmd-dart
 * test/words_before_close_dynamic_test.dart.
 */
describe("Words before a dynamic shortly after them", () => {
    let staffLine: StaffLine;

    beforeAll(async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1600px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore("test_words_before_close_dynamic.musicxml"));
        osmd.render();
        staffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
        expect(osmd.GraphicSheet.MusicPages[0].MusicSystems.length).toBe(1);
    });

    function words(measure: number): GraphicalUnknownExpression {
        return staffLine.AbstractExpressions.find(e => e instanceof GraphicalUnknownExpression &&
            e.sourceMultiExpression?.SourceMeasureParent.MeasureNumber === measure) as GraphicalUnknownExpression;
    }
    function dynamic(measure: number): GraphicalInstantaneousDynamicExpression {
        return staffLine.AbstractExpressions.find(e => e instanceof GraphicalInstantaneousDynamicExpression &&
            e.InstantaneousDynamic.ParentMultiExpression.SourceMeasureParent.MeasureNumber === measure) as
            GraphicalInstantaneousDynamicExpression;
    }
    function wordsBaseline(w: GraphicalUnknownExpression): number {
        return w.Label.PositionAndShape.RelativePosition.y + MusicSheetCalculator.labelBaselineOffset(w.Label);
    }
    function dynamicBaseline(d: GraphicalInstantaneousDynamicExpression): number {
        return d.PositionAndShape.RelativePosition.y + d.Label.PositionAndShape.RelativePosition.y +
            MusicSheetCalculator.labelBaselineOffset(d.Label);
    }

    it("puts qualifying words before the dynamic on its line", () => {
        for (const measure of [1, 2]) {
            const w: GraphicalUnknownExpression = words(measure);
            const d: GraphicalInstantaneousDynamicExpression = dynamic(measure);
            expect(w.besideDynamic).toBe(true);
            expect(wordsBaseline(w)).toBeCloseTo(dynamicBaseline(d), 2);
            const wordsRight: number = w.Label.PositionAndShape.RelativePosition.x + w.Label.PositionAndShape.BorderMarginRight;
            const dynamicLeft: number = d.PositionAndShape.RelativePosition.x + d.PositionAndShape.BorderMarginLeft;
            expect(wordsRight).toBeLessThanOrEqual(dynamicLeft + 0.01);
            expect(wordsRight).toBeGreaterThan(dynamicLeft - 0.5);
        }
    });

    it("at the end of the line moves the dynamic only as far as there is room", () => {
        const w: GraphicalUnknownExpression = words(4);
        const d: GraphicalInstantaneousDynamicExpression = dynamic(4);
        expect(w.besideDynamic).toBe(true);
        expect(wordsBaseline(w)).toBeCloseTo(dynamicBaseline(d), 2);
        const measure: GraphicalMeasure = staffLine.Measures.find(m => m.MeasureNumber === 4);
        const noteX: number = measure.PositionAndShape.RelativePosition.x + measure.staffEntries[0].PositionAndShape.RelativePosition.x;
        const wordsLeft: number = w.Label.PositionAndShape.RelativePosition.x + w.Label.PositionAndShape.BorderMarginLeft;
        expect(wordsLeft).toBeLessThan(noteX);
        expect(wordsLeft).toBeGreaterThanOrEqual(measure.PositionAndShape.RelativePosition.x);
        expect(d.PositionAndShape.RelativePosition.x + d.PositionAndShape.BorderMarginRight)
            .toBeLessThanOrEqual(staffLine.PositionAndShape.Size.width + 0.01);
    });

    it("doesn't join other words to a later dynamic", () => {
        expect(words(3).besideDynamic).toBe(false);
    });
});
