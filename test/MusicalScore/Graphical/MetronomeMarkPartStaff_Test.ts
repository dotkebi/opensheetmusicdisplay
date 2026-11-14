import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { TestUtils } from "../../Util/TestUtils";

/** Where metronome marks are drawn (81sabo A2 rows, 11-14; same as osmd-dart's metronome_mark_part_staff_test):
 *  - on the first visible staff of their measure, also below a hidden part (Saint-Saëns Op.61's ossia part above the
 *    violin);
 *  - when the parts give different tempos at one time, each part's mark above that part, with its words (Saint-Saëns
 *    Op.61 m881: the violin's "Più Allegro" half = 158, the piano's "Più Allegro" half = 138; user decision 11-14,
 *    different tempos only); the same tempo once, above the system. */
describe("Metronome marks of parts", () => {
    const direction: (words: string, perMinute: string, staff: string) => string = (words, perMinute, staff) =>
        `<direction placement="above"><direction-type><words>${words}</words></direction-type>${staff}</direction>` +
        `<direction placement="above"><direction-type><metronome><beat-unit>half</beat-unit><per-minute>${perMinute}</per-minute>` +
        `</metronome></direction-type>${staff}</direction>`;
    const score: (violin: string, piano: string) => string = (violin, piano) => `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P0"><part-name print-object="no">Ossia</part-name></score-part>
    <score-part id="P1"><part-name>Violin</part-name></score-part>
    <score-part id="P2"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P0">
    <measure number="1"><attributes><divisions>1</divisions><time><beats>2</beats><beat-type>2</beat-type></time>
      <clef><sign>G</sign><line>2</line></clef><staff-details print-object="no"/></attributes>
      <note print-object="no"><rest measure="yes"/><duration>4</duration></note></measure>
    <measure number="2"><note print-object="no"><rest measure="yes"/><duration>4</duration></note></measure>
  </part>
  <part id="P1">
    <measure number="1"><attributes><divisions>1</divisions><time><beats>2</beats><beat-type>2</beat-type></time>
      <clef><sign>G</sign><line>2</line></clef></attributes>
      ${violin}
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note></measure>
    <measure number="2"><note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note></measure>
  </part>
  <part id="P2">
    <measure number="1"><attributes><divisions>1</divisions><time><beats>2</beats><beat-type>2</beat-type></time>
      <staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>
      ${piano}
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><type>whole</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><pitch><step>D</step><octave>3</octave></pitch><duration>4</duration><type>whole</type><staff>2</staff></note></measure>
    <measure number="2">
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><type>whole</type><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><pitch><step>D</step><octave>3</octave></pitch><duration>4</duration><type>whole</type><staff>2</staff></note></measure>
  </part>
</score-partwise>`;
    const divs: HTMLElement[] = [];
    afterEach(() => {
        divs.splice(0).forEach(d => d.remove());
    });
    async function render(xml: string): Promise<{ osmd: OpenSheetMusicDisplay, div: HTMLElement }> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        divs.push(div);
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(xml);
        osmd.render();
        return { osmd, div };
    }
    /** each drawn mark's bpm text with the MeasureList staff index of the staff right below it */
    function marks(osmd: OpenSheetMusicDisplay, div: HTMLElement): string[] {
        const svgTop: number = div.querySelector("svg").getBoundingClientRect().top;
        const column: GraphicalMeasure[] = osmd.GraphicSheet.MeasureList[0];
        const staffTops: [number, number][] = column.map((m, i) => [i, m.PositionAndShape.AbsolutePosition.y * 10 * osmd.Zoom] as [number, number])
            .filter(([i]) => column[i].isVisible());
        return Array.from(div.querySelectorAll("g.vf-stavetempo g.vf-bpm text")).map(t => {
            const y: number = t.getBoundingClientRect().bottom - svgTop;
            const below: [number, number] = staffTops.filter(([, top]) => top > y).sort((a, b) => a[1] - b[1])[0];
            return `${below?.[0]}:${t.textContent.trim()}`;
        });
    }

    it("draws a mark above a hidden part on the first visible staff", async () => {
        const { osmd, div } = await render(score(direction("Più Allegro", "158", ""), ""));
        expect(marks(osmd, div)).to.deep.equal(["1:= 158"]);
    });

    it("draws different marks of the violin and the piano at one time above each part", async () => {
        const { osmd, div } = await render(score(direction("Più Allegro", "158", ""), direction("Più Allegro", "138", "<staff>1</staff>")));
        expect(marks(osmd, div)).to.have.members(["1:= 158", "2:= 138"]);
    });

    it("draws the same mark of both parts once, above the system", async () => {
        const { osmd, div } = await render(score(direction("Più Allegro", "158", ""), direction("Più Allegro", "158", "<staff>1</staff>")));
        expect(marks(osmd, div)).to.deep.equal(["1:= 158"]);
    });
});
