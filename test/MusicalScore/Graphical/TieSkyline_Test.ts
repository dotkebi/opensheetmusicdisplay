import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { GraphicalLabel } from "../../../src/MusicalScore/Graphical/GraphicalLabel";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A tie across a barline is drawn by the measure of its end note, so the start measure's skyline used to stop
 * at the notehead and a word placed above the tie's start was put on the tie (Enescu, Cantabile et Presto m52:
 * "Piano" over the tied cue D6). The start measure's skyline now includes the tie's beginning.
 */
describe("Tie across the barline in the skyline", () => {
    const attributes: string = `<attributes><divisions>2</divisions><time><beats>2</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef></attributes>`;
    const rest: string = "<note><rest/><duration>2</duration><voice>1</voice><type>quarter</type></note>";
    const piano: string = "<direction placement=\"above\"><direction-type><words default-y=\"35\">Piano</words></direction-type></direction>";
    function cueD6(tie: string): string {
        return `<note><pitch><step>D</step><octave>6</octave></pitch><duration>2</duration><voice>1</voice>
            <type size="cue">quarter</type><tie type="${tie}"/><notations><tied type="${tie}"/></notations></note>`;
    }
    const score: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Solo</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">${attributes}${rest}${piano}${cueD6("start")}</measure>
    <measure number="2">${cueD6("stop")}${rest}</measure>
    <measure number="3">${rest}${rest}</measure>
  </part>
</score-partwise>`;

    async function render(geometricSkyline: boolean): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "700px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        osmd.EngravingRules.UseGeometricSkyBottomLineCalculation = geometricSkyline;
        await osmd.load(score);
        osmd.render();
        return osmd;
    }

    function labelBottom(osmd: OpenSheetMusicDisplay): number {
        const line: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
        const label: GraphicalLabel = line.AbstractExpressions
            .map((expression) => (expression as any).Label as GraphicalLabel)
            .find((graphicalLabel) => graphicalLabel?.Label?.text === "Piano");
        expect(label, "Piano label").to.not.equal(undefined);
        return label.PositionAndShape.RelativePosition.y + label.PositionAndShape.BorderBottom;
    }

    // D6 sits 2.5 units above the top staff line (y = -2.5). The tie above it rises about 1.1 units
    // (VexFlow y_shift 7px + half of cp1 8px) from the notehead; the label must end above that,
    // not at the notehead's top.
    const noteY: number = -2.5;

    it("places a word above the start of the tie clear of the tie (geometric skyline)", async () => {
        const bottom: number = labelBottom(await render(true));
        expect(bottom, "label bottom above the tie").to.be.lessThan(noteY - 1.0);
    });

    it("places a word above the start of the tie clear of the tie (raster skyline)", async () => {
        const bottom: number = labelBottom(await render(false));
        expect(bottom, "label bottom above the tie").to.be.lessThan(noteY - 1.0);
    });
});
