import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalInstantaneousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalInstantaneousDynamicExpression";
import { MusicSheetCalculator } from "../../../src/MusicalScore/Graphical/MusicSheetCalculator";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Parisotti, Paisiello Chi vuol la zingarella Canto m8 (renderer leftovers 2, decision C-7): a "p" above the note with an
 * upright fermata sat with its box on the fermata's ink, and its descender touched the arc. Over ink above the staff a
 * dynamic keeps dynamicOverInkClearance. Same as osmd-dart test/dynamic_over_fermata_clearance_test.dart.
 */
describe("Dynamic over a fermata", () => {
    const score: (withDynamic: boolean) => string = (withDynamic: boolean): string => `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Canto</part-name></score-part></part-list><part id="P1">
<measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
<clef><sign>G</sign><line>2</line></clef></attributes>
${withDynamic ? "<direction placement=\"above\"><direction-type><dynamics><p/></dynamics></direction-type></direction>" : ""}
<note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><stem>down</stem>
<notations><fermata type="upright"/></notations></note>
<note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><stem>down</stem></note>
<note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><stem>down</stem></note>
<note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><stem>down</stem></note>
</measure></part></score-partwise>`;

    async function render(withDynamic: boolean): Promise<StaffLine> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "600px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(score(withDynamic));
        osmd.render();
        return osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
    }

    it("keeps a clearance over the fermata's ink", async () => {
        const line: StaffLine = await render(true);
        const dynamic: GraphicalInstantaneousDynamicExpression = line.AbstractExpressions.find(
            e => e instanceof GraphicalInstantaneousDynamicExpression) as GraphicalInstantaneousDynamicExpression;
        expect(dynamic, "the p").to.not.equal(undefined);
        const box: any = dynamic.PositionAndShape;
        const bottom: number = box.RelativePosition.y + box.BorderMarginBottom;
        // the ink alone: the same measure without the dynamic (the fermata is its only ink above the staff)
        const inkLine: StaffLine = await render(false);
        const measureWidth: number = inkLine.Measures[0].PositionAndShape.Size.width;
        const inkTop: number = inkLine.SkyBottomLineCalculator.getSkyLineMinInRange(0, measureWidth);
        expect(inkTop, "the fermata above the staff").to.be.lessThan(-0.5);
        expect(bottom, `dynamic bottom ${bottom} over the fermata ${inkTop}`).to.be.at.most(inkTop - MusicSheetCalculator.dynamicOverInkClearance + 1e-6);
    });
});
