import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { musicXmlColorToCss } from "../../../src/Common/DataObjects/XmlColor";
import { Note } from "../../../src/MusicalScore/VoiceData/Note";
import { AbstractExpression } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { TestUtils } from "../../Util/TestUtils";

/**
 * MusicXML colors are #RRGGBB or #AARRGGBB (alpha first). OSMD hands colors to SVG, where 8-digit hex is CSS #RRGGBBAA.
 * The reader converts once, so the model holds CSS colors: color="#80FF0000" (half-transparent red) must become "#FF000080",
 * not be drawn as R=0x80 G=0xFF B=0x00 with alpha 0 (invisible).
 */
describe("MusicXML color attributes", () => {
    const halfTransparentRedXml: string = "#80FF0000";
    const halfTransparentRedCss: string = "#FF000080";

    function score(color: string): string {
        return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <time><beats>2</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <direction placement="above">
        <direction-type><words color="${color}">colored words</words></direction-type>
      </direction>
      <note color="${color}"><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
    </measure>
  </part>
</score-partwise>`;
    }

    async function load(color: string): Promise<{ osmd: OpenSheetMusicDisplay, div: HTMLElement }> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "800px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(score(color));
        return { div, osmd };
    }

    function firstNote(osmd: OpenSheetMusicDisplay): Note {
        return osmd.Sheet.SourceMeasures[0].VerticalSourceStaffEntryContainers[0].StaffEntries[0].VoiceEntries[0].Notes[0];
    }

    function wordsExpressions(osmd: OpenSheetMusicDisplay): AbstractExpression[] {
        const expressions: AbstractExpression[] = [];
        for (const multiExpression of osmd.Sheet.SourceMeasures[0].StaffLinkedExpressions[0]) {
            expressions.push(...multiExpression.UnknownList, ...multiExpression.MoodList);
        }
        return expressions;
    }

    function fillsOf(div: HTMLElement, selector: string): string[] {
        return Array.from(div.querySelectorAll(selector)).map(element => element.getAttribute("fill"));
    }

    it("converts #AARRGGBB to CSS #RRGGBBAA and leaves other strings unchanged", () => {
        expect(musicXmlColorToCss("#80FF0000")).to.equal("#FF000080");
        expect(musicXmlColorToCss("#FF000000")).to.equal("#000000FF"); // opaque black, not invisible
        expect(musicXmlColorToCss("#ff0000")).to.equal("#ff0000");
        expect(musicXmlColorToCss("red")).to.equal("red");
        expect(musicXmlColorToCss(undefined)).to.equal(undefined);
    });

    it("stores note and words colors as CSS #RRGGBBAA", async () => {
        const { osmd } = await load(halfTransparentRedXml);
        const note: Note = firstNote(osmd);
        expect(note.NoteheadColorXml).to.equal(halfTransparentRedCss);
        expect(note.NoteheadColor).to.equal(halfTransparentRedCss);
        expect(note.StemColorXml).to.equal(halfTransparentRedCss);
        const words: AbstractExpression[] = wordsExpressions(osmd);
        expect(words.length).to.equal(1);
        expect(words[0].ColorXML).to.equal(halfTransparentRedCss);
    });

    it("renders the converted color as SVG fill", async () => {
        const { osmd, div } = await load(halfTransparentRedXml);
        osmd.render();
        const noteheadFills: string[] = fillsOf(div, "g.vf-notehead path");
        expect(noteheadFills.length).to.equal(2);
        expect(noteheadFills[0]).to.equal(halfTransparentRedCss);
        expect(noteheadFills[1]).to.not.equal(halfTransparentRedCss);
        const wordsText: Element = Array.from(div.querySelectorAll("text")).find(text => text.textContent === "colored words");
        expect(wordsText, "words label").to.not.equal(undefined);
        expect(wordsText.getAttribute("fill")).to.equal(halfTransparentRedCss);
        expect(fillsOf(div, "*").filter(fill => fill === halfTransparentRedXml), "unconverted MusicXML color").to.deep.equal([]);
    });

    it("keeps 6-digit colors as they are", async () => {
        const { osmd } = await load("#FF0000");
        expect(firstNote(osmd).NoteheadColorXml).to.equal("#FF0000");
        expect(wordsExpressions(osmd)[0].ColorXML).to.equal("#FF0000");
    });
});
