import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Verdi, L'esule Canto m1-14; Schumann, In der Fremde Canto m26-28: the XML hides the voice's staff with hidden
 * whole-measure rests (<staff-details print-object="no">), which an automatic multirest showed as "12" or "3". They stay empty measures; a hidden rest
 * filling a second voice beside a printed one still goes into a multirest. Same as osmd-dart
 * test/multirest_hidden_rests_test.dart.
 */
describe("Automatic multirests and hidden rests", () => {
    it("keeps measures with only hidden rests out of a multirest", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1200px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div,
            { autoResize: false, backend: "svg", autoGenerateMultipleRestMeasuresFromRestMeasures: true });
        await osmd.load(TestUtils.getScore("test_multirest_hidden_rests.musicxml"));
        osmd.render();
        const multis: number[] = osmd.Sheet.SourceMeasures.map(m => m.multipleRestMeasures ?? 0);
        expect(multis.slice(1, 4), "m2-4 not in a multirest").to.deep.equal([0, 0, 0]);
        expect(osmd.Sheet.SourceMeasures.slice(1, 4).some(m => m.isReducedToMultiRest), "m2-4 not reduced").to.equal(false);
        expect(multis[4], "m5-8 one multirest").to.equal(4);
        expect(multis[9], "m10-11: hidden rests of a staff not hidden").to.equal(2);
    });
});
