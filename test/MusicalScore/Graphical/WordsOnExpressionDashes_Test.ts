import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { AbstractGraphicalExpression } from "../../../src/MusicalScore/Graphical/AbstractGraphicalExpression";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { GraphicalContinuousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalContinuousDynamicExpression";
import { GraphicalExpressionDashes } from "../../../src/MusicalScore/Graphical/GraphicalExpressionDashes";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { TestUtils } from "../../Util/TestUtils";

/**
 * The words inside a dashed line and at its end go on the line, which is broken around them, as printed: "cres: - - - ed - - -
 * accel." in one row between the staves (Parisotti, A. Scarlatti Se tu della mia morte Piano m18–20; the XML of osmd-dart
 * test/fixtures/test_words_on_expression_dashes.musicxml). The text of the line was placed clear of the low notes under the whole
 * line, "ed" and "accel." only of the high notes under them: nearer the staff, with the line running under "ed".
 * Same as osmd-dart test/words_on_expression_dashes_test.dart.
 */
describe("Words on a dashed line", () => {
    const xml: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef></attributes>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <direction placement="below"><direction-type><words>cres.</words></direction-type></direction>
      <direction placement="below"><direction-type><dashes type="start" number="1"/></direction-type></direction>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>F</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
    </measure>
    <measure number="2">
      <note><pitch><step>A</step><octave>3</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>G</step><octave>3</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <direction placement="below"><direction-type><words>ed</words></direction-type></direction>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
    </measure>
    <measure number="3">
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <direction placement="below"><direction-type><dashes type="stop" number="1"/></direction-type></direction>
      <direction placement="below"><direction-type><words>accel.</words></direction-type></direction>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
    </measure>
    <measure number="4">
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
    </measure>
  </part>
</score-partwise>`;

    it("the words in a dashed line go on it, the line broken around them", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        container.style.width = "1600px";
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.EngravingRules.DefaultFontFamily = "Times New Roman";
        await osmd.load(xml);
        osmd.render();
        const staffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
        // the text's box in the staff line: a verbal dynamic's label is at (0, 0) in the expression's box
        const textBox: (text: string) => BoundingBox = (text) => {
            const expression: AbstractGraphicalExpression = staffLine.AbstractExpressions.find(e => e.Label?.Label?.text === text);
            return expression instanceof GraphicalContinuousDynamicExpression && expression.IsVerbal ?
                expression.PositionAndShape : expression.Label.PositionAndShape;
        };
        const centerY: (box: BoundingBox) => number = (box) => box.RelativePosition.y + (box.BorderTop + box.BorderBottom) / 2;
        const dashes: GraphicalExpressionDashes[] = staffLine.ExpressionDashes;
        expect(dashes.length).to.be.greaterThan(0);
        const ed: BoundingBox = textBox("ed");
        const accel: BoundingBox = textBox("accel.");
        const cres: BoundingBox = textBox("cres.");
        // the words on the line, as its text
        expect(centerY(ed), `ed ${centerY(ed)}, cres. ${centerY(cres)}`).to.be.closeTo(centerY(cres), 0.3);
        expect(centerY(accel), `accel. ${centerY(accel)}, cres. ${centerY(cres)}`).to.be.closeTo(centerY(cres), 0.3);
        // the line broken around "ed": before it and after it, not under it
        const edLeft: number = ed.RelativePosition.x + ed.BorderMarginLeft;
        const edRight: number = ed.RelativePosition.x + ed.BorderMarginRight;
        const lines: string = dashes.map(d => `${d.Start.x}..${d.End.x}`).join(", ");
        expect(dashes.some(d => d.End.x <= edLeft && d.End.x > edLeft - 2), `a line ending before ed (${edLeft}): ${lines}`).to.equal(true);
        expect(dashes.some(d => d.Start.x >= edRight && d.Start.x < edRight + 2), `a line starting after ed (${edRight}): ${lines}`)
            .to.equal(true);
        expect(dashes.some(d => d.Start.x < edRight && d.End.x > edLeft), `no line under ed: ${lines}`).to.equal(false);
        osmd.clear();
        container.remove();
    });

    // A text with its own line moved onto an earlier text's line keeps its own line at the height it was moved to: the lines are
    //   calculated in the order of their texts in the music (Parisotti, Traetta Ombra cara Piano m60-61: "cres. - - -" in
    //   "animato - - -"; the dynamics' texts are collected before the words, so its line was calculated before it moved).
    const earlierLineXml: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef></attributes>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <direction placement="below"><direction-type><words>animato</words></direction-type>
        <direction-type><dashes type="start" number="1"/></direction-type></direction>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>F</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
    </measure>
    <measure number="2">
      <note><pitch><step>A</step><octave>3</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>G</step><octave>3</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <direction placement="below"><direction-type><words>cres.</words></direction-type>
        <direction-type><dashes type="start" number="2"/></direction-type></direction>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
    </measure>
    <measure number="3">
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <direction placement="below"><direction-type><dashes type="stop" number="1"/></direction-type></direction>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <direction placement="below"><direction-type><dashes type="stop" number="2"/></direction-type></direction>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
    </measure>
    <measure number="4">
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
    </measure>
  </part>
</score-partwise>`;

    it("the own line of a text moved onto an earlier line moves with it", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        container.style.width = "1600px";
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.EngravingRules.DefaultFontFamily = "Times New Roman";
        await osmd.load(earlierLineXml);
        osmd.render();
        const staffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
        const textBox: (text: string) => BoundingBox = (text) => {
            const expression: AbstractGraphicalExpression = staffLine.AbstractExpressions.find(e => e.Label?.Label?.text === text);
            return expression instanceof GraphicalContinuousDynamicExpression && expression.IsVerbal ?
                expression.PositionAndShape : expression.Label.PositionAndShape;
        };
        const centerY: (box: BoundingBox) => number = (box) => box.RelativePosition.y + (box.BorderTop + box.BorderBottom) / 2;
        const cres: BoundingBox = textBox("cres.");
        const animato: BoundingBox = textBox("animato");
        expect(centerY(cres), `cres. ${centerY(cres)}, animato ${centerY(animato)}`).to.be.closeTo(centerY(animato), 0.3);
        const cresRight: number = cres.RelativePosition.x + cres.BorderMarginRight;
        const ownLine: GraphicalExpressionDashes[] = staffLine.ExpressionDashes.filter(d => d.Start.x >= cresRight && d.Start.x < cresRight + 2);
        expect(ownLine.length, `a line after cres. (${cresRight})`).to.be.greaterThan(0);
        for (const d of ownLine) {
            expect(d.Start.y, `line at ${d.Start.y}, cres. at ${centerY(cres)}`).to.be.closeTo(centerY(cres), 1.0);
        }
        osmd.clear();
        container.remove();
    });
});
