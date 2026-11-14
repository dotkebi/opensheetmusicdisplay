import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalLabel } from "../../../src/MusicalScore/Graphical/GraphicalLabel";
import { GraphicalUnknownExpression } from "../../../src/MusicalScore/Graphical/GraphicalUnknownExpression";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { FontStyles } from "../../../src/Common/Enums/FontStyles";
import { TestUtils } from "../../Util/TestUtils";

/** Words of a size, font or height of their own, and headings left of a system (user decisions 11-14; same as
 *  osmd-dart's words_font_size_margin_title_test):
 *  - Stamitz Viola Concerto No.2 m243: "Rondeau" (font-size 24, bold, default-y 80) and "Solo" at one time were one
 *    small line "Solo Rondeau". Words of another font size, style or default-y are a label of their own, the higher
 *    default-y further out; the size is drawn relative to the words size the score uses most.
 *  - Vieuxtemps Op.31 m1: "INTRODUZIONE." (default-x -220, justify right) is drawn in the system's left margin, left of
 *    the part name, the label column widened for it, and not again above the staff. */
describe("Words font size and margin titles", () => {
    const score: (m1: string) => string = (m1: string): string => `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Viola</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1"><attributes><divisions>1</divisions>
      <time><beats>2</beats><beat-type>4</beat-type></time><clef><sign>C</sign><line>3</line></clef></attributes>
      ${m1}
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><type>half</type></note></measure>
${[2, 3, 4].map(m => `    <measure number="${m}"><direction placement="above"><direction-type><words font-size="12">+</words>` +
    "</direction-type></direction><note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><type>half</type></note></measure>")
    .join("\n")}
  </part>
</score-partwise>`;
    const solo: string = "<direction placement=\"above\"><direction-type><words>Solo</words></direction-type></direction>";
    const rondeau: string = "<direction placement=\"above\"><direction-type><words font-family=\"Times New Roman\" font-size=\"24\" " +
        "font-weight=\"bold\" default-y=\"80\" relative-y=\"30\" halign=\"left\">Rondeau</words></direction-type></direction>";
    const introduzione: string = "<direction placement=\"above\"><direction-type><words default-x=\"-220\" default-y=\"-60\" " +
        "font-weight=\"bold\" justify=\"right\">INTRODUZIONE.</words></direction-type></direction>";
    const divs: HTMLElement[] = [];
    afterEach(() => {
        divs.splice(0).forEach(d => d.remove());
    });
    async function render(xml: string): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        divs.push(div);
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(xml);
        osmd.render();
        return osmd;
    }
    const firstSystem: (osmd: OpenSheetMusicDisplay) => MusicSystem = (osmd) => osmd.GraphicSheet.MusicPages[0].MusicSystems[0];
    const words: (osmd: OpenSheetMusicDisplay) => GraphicalLabel[] = (osmd) => osmd.GraphicSheet.MusicPages[0].MusicSystems
        .flatMap(s => s.StaffLines).flatMap(l => l.AbstractExpressions)
        .filter(e => e instanceof GraphicalUnknownExpression).map(e => (e as GraphicalUnknownExpression).Label);
    const word: (osmd: OpenSheetMusicDisplay, text: string) => GraphicalLabel = (osmd, text) => {
        const found: GraphicalLabel[] = words(osmd).filter(l => l.Label.text === text);
        expect(found.length, text).to.equal(1);
        return found[0];
    };

    it("draws \"Rondeau\" and \"Solo\" at one time as two labels, \"Rondeau\" twice the usual words size, bold, above", async () => {
        const osmd: OpenSheetMusicDisplay = await render(score(solo + rondeau));
        const r: GraphicalLabel = word(osmd, "Rondeau");
        const s: GraphicalLabel = word(osmd, "Solo");
        expect(r.Label.fontHeight).to.be.closeTo(s.Label.fontHeight * 2, 1e-9);
        expect(r.Label.fontStyle).to.equal(FontStyles.Bold);
        expect(r.PositionAndShape.AbsolutePosition.y + r.PositionAndShape.BorderBottom)
            .to.be.at.most(s.PositionAndShape.AbsolutePosition.y + s.PositionAndShape.BorderTop + 1e-6);
    });

    it("keeps words of one font and height one label", async () => {
        const osmd: OpenSheetMusicDisplay = await render(score(solo + solo.replace("Solo", "dolce")));
        expect(words(osmd).map(l => l.Label.text)).to.include("Solo dolce");
    });

    it("draws \"INTRODUZIONE.\" left of the part name, not above the staff", async () => {
        const plain: OpenSheetMusicDisplay = await render(score(solo));
        const osmd: OpenSheetMusicDisplay = await render(score(solo + introduzione));
        expect(words(osmd).map(l => l.Label.text)).to.not.include("INTRODUZIONE.");
        const system: MusicSystem = firstSystem(osmd);
        const titles: GraphicalLabel[] = Array.from(system.marginTitles.values());
        expect(titles.map(t => t.Label.text)).to.deep.equal(["INTRODUZIONE."]);
        expect(titles[0].Label.fontStyle).to.equal(FontStyles.Bold);
        const name: GraphicalLabel = system.Labels.find(l => l.Label.text === "Viola");
        expect(titles[0].PositionAndShape.AbsolutePosition.x + titles[0].PositionAndShape.BorderRight)
            .to.be.at.most(name.PositionAndShape.AbsolutePosition.x + name.PositionAndShape.BorderLeft);
        expect(system.StaffLines[0].PositionAndShape.AbsolutePosition.x)
            .to.be.greaterThan(firstSystem(plain).StaffLines[0].PositionAndShape.AbsolutePosition.x);
        expect(titles[0].PositionAndShape.AbsolutePosition.y - system.StaffLines[0].PositionAndShape.AbsolutePosition.y)
            .to.be.closeTo(6, 1e-6);
    });
});
