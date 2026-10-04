import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { MultiTempoExpression } from "../../../src/MusicalScore/VoiceData/Expressions/MultiTempoExpression";
import { InstantaneousTempoExpression, TempoType } from "../../../src/MusicalScore/VoiceData/Expressions/InstantaneousTempoExpression";
import { SourceMeasure } from "../../../src/MusicalScore/VoiceData/SourceMeasure";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Metronome marks at the start of O cessate di piagarmi (A. Scarlatti, Parisotti): the print reads
 * "♩.=80 e ♩.=50" (two alternatives) above "Andante con moto". In MusicXML these are two <metronome>
 * directions at the same time, the first with <per-minute>80 e</per-minute>.
 * - both marks are drawn, in document order, on one line; the text after the number ("e") is kept,
 * - the first mark sets the tempo, the second one is only displayed,
 * - the marks don't overlap the tempo words.
 */
describe("Metronome marks at the same time", () => {
    const metronome: (perMinute: string, defaultX: number) => string = (perMinute, defaultX) =>
        `<direction placement="above"><direction-type><metronome default-x="${defaultX}" default-y="60" relative-x="${defaultX}">` +
        `<beat-unit>quarter</beat-unit><beat-unit-dot/><per-minute>${perMinute}</per-minute></metronome></direction-type>__STAFF__</direction>`;
    const andante: string = "<direction placement=\"above\"><direction-type><words font-style=\"italic\" default-y=\"20\">Andante con moto" +
        "</words></direction-type>__STAFF__</direction>";
    const twoMarks: string = metronome("80 e", 0) + metronome("50", 110) + andante;

    function cantoScore(directions: string): string {
        return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Canto</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions><time><beats>6</beats><beat-type>8</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      ${directions.split("__STAFF__").join("")}
      <note><rest measure="yes"/><duration>6</duration></note>
    </measure>
    <measure number="2">
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type></note>
    </measure>
  </part>
</score-partwise>`;
    }

    /** Piano m1: "agitato" above the right hand pushes "Andante con moto" up, into the metronome mark's default height. */
    function pianoScore(directions: string): string {
        return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions><time><beats>6</beats><beat-type>8</beat-type></time><staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>
      ${directions.split("__STAFF__").join("<staff>1</staff>")}
      <direction placement="above"><direction-type><words font-style="italic">agitato</words></direction-type>
        <offset>1</offset><staff>1</staff></direction>
      <note><rest/><duration>1</duration><voice>1</voice><type>eighth</type><staff>1</staff></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type><staff>1</staff></note>
      <note><chord/><pitch><step>B</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type><staff>1</staff></note>
      <note><rest/><duration>1</duration><voice>1</voice><type>eighth</type><staff>1</staff></note>
      <note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type><staff>1</staff></note>
      <note><chord/><pitch><step>B</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type><staff>1</staff></note>
      <backup><duration>6</duration></backup>
      <note><pitch><step>D</step><octave>3</octave></pitch><duration>3</duration><voice>5</voice><type>quarter</type><dot/><staff>2</staff></note>
      <note><pitch><step>D</step><alter>1</alter><octave>3</octave></pitch><duration>3</duration><voice>5</voice><type>quarter</type><dot/>
        <staff>2</staff></note>
    </measure>
  </part>
</score-partwise>`;
    }

    async function render(xml: string): Promise<{ osmd: OpenSheetMusicDisplay, div: HTMLElement }> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(xml);
        osmd.render();
        return { osmd, div };
    }

    function metronomeMarks(measure: SourceMeasure): InstantaneousTempoExpression[] {
        const marks: InstantaneousTempoExpression[] = [];
        for (const multiTempoExpression of measure.TempoExpressions) {
            for (const entry of (multiTempoExpression as MultiTempoExpression).EntriesList) {
                if (entry.Expression instanceof InstantaneousTempoExpression && entry.Expression.TempoType === TempoType.metronomeMark) {
                    marks.push(entry.Expression);
                }
            }
        }
        return marks;
    }

    function bpmTexts(div: HTMLElement): string[] {
        return Array.from(div.querySelectorAll("g.vf-stavetempo g.vf-bpm text")).map((text) => text.textContent);
    }

    function overlaps(a: DOMRect, b: DOMRect): boolean {
        return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    }

    it("draws both metronome marks at the same time on one line, in document order, keeping the text after the number", async () => {
        const { div } = await render(cantoScore(twoMarks));
        expect(div.querySelectorAll("g.vf-stavetempo").length, "one metronome line").to.equal(1);
        expect(bpmTexts(div)).to.deep.equal([" = 80 e", " = 50"]);
        const [first, second] = Array.from(div.querySelectorAll("g.vf-stavetempo g.vf-bpm text")).map((t) => t.getBoundingClientRect());
        expect(second.left, "second mark after the first").to.be.greaterThan(first.right);
        // the second note head starts a word space after the "e", not right at it
        const glyphLefts: number[] = Array.from(div.querySelectorAll("g.vf-stavetempo > path")).map((p) => p.getBoundingClientRect().left);
        const secondHead: number = glyphLefts.find((left) => left > first.right);
        expect(secondHead - first.right, "word space before the second mark").to.be.greaterThan(5);
        expect(Math.abs(second.bottom - first.bottom), "same baseline").to.be.lessThan(0.5);
    });

    it("keeps the per-minute text and takes the tempo from the first mark only", async () => {
        const { osmd } = await render(cantoScore(twoMarks));
        const measure: SourceMeasure = osmd.Sheet.SourceMeasures[0];
        const marks: InstantaneousTempoExpression[] = metronomeMarks(measure);
        expect(marks.length, "the second mark is not a tempo entry of its own").to.equal(1);
        expect(marks[0].TempoInBpm).to.equal(80);
        expect(marks[0].perMinuteText).to.equal("80 e");
        expect(marks[0].followingMetronomeMarks.map((m) => [m.TempoInBpm, m.perMinuteText, m.dotted, m.beatUnit]))
            .to.deep.equal([[50, undefined, true, "quarter"]]);
        expect(measure.TempoInBPM, "dotted quarter 80").to.equal(120);
        expect(osmd.Sheet.DefaultStartTempoInBpm).to.equal(80);
    });

    it("draws the metronome marks above the tempo words without overlapping them", async () => {
        for (const score of [cantoScore(twoMarks), pianoScore(twoMarks)]) {
            const { div } = await render(score);
            const mark: DOMRect = div.querySelector("g.vf-stavetempo").getBoundingClientRect();
            const words: Element = Array.from(div.querySelectorAll("text")).find((t) => t.textContent === "Andante con moto");
            const wordsBox: DOMRect = words.getBoundingClientRect();
            expect(overlaps(mark, wordsBox), `mark ${JSON.stringify(mark)} words ${JSON.stringify(wordsBox)}`).to.equal(false);
            expect(mark.bottom, "mark above the words").to.be.at.most(wordsBox.top + 1);
        }
    });

    it("leaves a single metronome mark with a plain number as before", async () => {
        const { osmd, div } = await render(cantoScore(metronome("120", 0)));
        expect(bpmTexts(div)).to.deep.equal([" = 120"]);
        const marks: InstantaneousTempoExpression[] = metronomeMarks(osmd.Sheet.SourceMeasures[0]);
        expect(marks.length).to.equal(1);
        expect(marks[0].perMinuteText).to.equal(undefined);
        expect(marks[0].followingMetronomeMarks).to.deep.equal([]);
        expect(osmd.Sheet.SourceMeasures[0].TempoInBPM).to.equal(180);
    });

    it("reads repeated identical marks and marks with their own <sound tempo> as before", async () => {
        // exporter duplicates: the same mark twice at the same time is drawn once
        let { osmd, div } = await render(cantoScore(metronome("120", 0) + metronome("120", 0)));
        expect(bpmTexts(div)).to.deep.equal([" = 120"]);
        expect(metronomeMarks(osmd.Sheet.SourceMeasures[0]).every((m) => m.followingMetronomeMarks.length === 0)).to.equal(true);
        // a second mark with its own <sound tempo> is a tempo change, not an alternative
        const withSound: string = metronome("50", 110).replace("</direction-type>", "</direction-type><sound tempo=\"75\"/>");
        ({ osmd, div } = await render(cantoScore(metronome("80", 0) + withSound)));
        expect(bpmTexts(div)).to.deep.equal([" = 80"]);
        const marks: InstantaneousTempoExpression[] = metronomeMarks(osmd.Sheet.SourceMeasures[0]);
        expect(marks.map((m) => m.TempoInBpm)).to.deep.equal([80, 50]);
        expect(marks[0].followingMetronomeMarks).to.deep.equal([]);
    });

    it("draws the text of a per-minute value like \"c. 108\" and plays the number", async () => {
        const { osmd, div } = await render(cantoScore(metronome("c. 108", 0)));
        expect(bpmTexts(div)).to.deep.equal([" = c. 108"]);
        expect(metronomeMarks(osmd.Sheet.SourceMeasures[0])[0].TempoInBpm).to.equal(108);
    });
});
