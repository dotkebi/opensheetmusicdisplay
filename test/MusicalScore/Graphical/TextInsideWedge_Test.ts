import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalContinuousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalContinuousDynamicExpression";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { TestUtils } from "../../Util/TestUtils";

/**
 * The words "cres." starting inside a crescendo wedge of the same side, after its start (Parisotti, A. Scarlatti Se Florindo è fedele,
 * Piano m4; the XML of osmd-dart test/fixtures/test_words_inside_wedge.musicxml): the print has the text between the staff and the
 * wedge, the wedge at its full length. The web drew the text on the wedge's lines, the app squeezed the wedge to a stub "<" before
 * the text. Same as osmd-dart test/text_inside_wedge_test.dart.
 */
describe("Text inside a wedge", () => {
    const xml: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions><time><beats>3</beats><beat-type>8</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef></attributes>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
    </measure>
    <measure number="2">
      <direction placement="below"><direction-type><wedge type="crescendo" number="1"/></direction-type></direction>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <direction placement="below"><direction-type><words>cres.</words></direction-type></direction>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <direction placement="below"><direction-type><wedge type="stop" number="1"/></direction-type></direction>
    </measure>
    <measure number="3">
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>3</duration><voice>1</voice><type>quarter</type><dot/></note>
    </measure>
    <measure number="4">
      <direction placement="below"><direction-type><wedge type="crescendo" number="1"/></direction-type></direction>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <direction placement="below"><direction-type><words>crescendo</words></direction-type></direction>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <direction placement="below"><direction-type><wedge type="stop" number="1"/></direction-type></direction>
      <note><pitch><step>A</step><octave>2</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
    </measure>
    <measure number="5">
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>3</duration><voice>1</voice><type>quarter</type><dot/></note>
    </measure>
  </part>
</score-partwise>`;

    it("the text inside a wedge goes between the staff and the full wedge", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        container.style.width = "1600px";
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.EngravingRules.DefaultFontFamily = "Times New Roman";
        await osmd.load(xml);
        osmd.render();
        const staffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
        const expressions: GraphicalContinuousDynamicExpression[] = staffLine.AbstractExpressions.filter(
            e => e instanceof GraphicalContinuousDynamicExpression) as GraphicalContinuousDynamicExpression[];
        const inMeasure2: GraphicalContinuousDynamicExpression[] = expressions.filter(
            e => e.ContinuousDynamic.StartMultiExpression.SourceMeasureParent.MeasureNumberXML === 2);
        const wedges: GraphicalContinuousDynamicExpression[] = inMeasure2.filter(e => !e.IsVerbal);
        const texts: GraphicalContinuousDynamicExpression[] = inMeasure2.filter(e => e.IsVerbal);
        expect(wedges.length).to.equal(1);
        expect(texts.length).to.equal(1);
        const wedge: GraphicalContinuousDynamicExpression = wedges[0];
        const box: GraphicalContinuousDynamicExpression["PositionAndShape"] = texts[0].PositionAndShape;
        const measure: GraphicalMeasure = staffLine.Measures.find(m => m.parentSourceMeasure.MeasureNumberXML === 2);
        const entryX: (index: number) => number = (index) =>
            measure.PositionAndShape.RelativePosition.x + measure.staffEntries[index].PositionAndShape.RelativePosition.x;
        const xs: number[] = wedge.Lines.flatMap(l => [l.Start.x, l.End.x]);
        const ys: number[] = wedge.Lines.flatMap(l => [l.Start.y, l.End.y]);
        const wedgeLeft: number = Math.min(...xs);
        const wedgeRight: number = Math.max(...xs);
        const wedgeTop: number = Math.min(...ys);
        const textTop: number = box.RelativePosition.y + box.BorderMarginTop;
        const textBottom: number = box.RelativePosition.y + box.BorderMarginBottom;
        const textLeft: number = box.RelativePosition.x + box.BorderMarginLeft;
        // the wedge at its full length: from the first note past the third
        expect(wedgeLeft).to.be.closeTo(entryX(0), 1.5);
        expect(wedgeRight, `wedge ${wedgeLeft}..${wedgeRight}, third note ${entryX(2)}`).to.be.greaterThan(entryX(2));
        // the text inside it, between the staff and the wedge
        expect(textLeft).to.be.greaterThan(wedgeLeft);
        expect(textBottom, `text ${textTop}..${textBottom}, wedge top ${wedgeTop}`).to.be.lessThan(wedgeTop);
        expect(textTop, `text top ${textTop}`).to.be.greaterThan(4.0);
        osmd.clear();
        container.remove();
    });

    // Words starting inside a wedge but reaching beyond its end: the room between the staff and the wedge is checked beyond the
    //   wedge too (Vivaldi, Un certo non so che Piano m13-14: "crescendo" moved there ran onto the beamed notes after the wedge).
    //   The text is clear of the notes under it.
    it("a text wider than the wedge it starts in stays clear of the notes", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        container.style.width = "1600px";
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.EngravingRules.DefaultFontFamily = "Times New Roman";
        await osmd.load(xml);
        osmd.render();
        const staffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
        const text: GraphicalContinuousDynamicExpression = staffLine.AbstractExpressions.find(
            e => e instanceof GraphicalContinuousDynamicExpression && e.IsVerbal &&
                e.ContinuousDynamic.StartMultiExpression.SourceMeasureParent.MeasureNumberXML === 4) as GraphicalContinuousDynamicExpression;
        const box: GraphicalContinuousDynamicExpression["PositionAndShape"] = text.PositionAndShape;
        const textTop: number = box.RelativePosition.y + box.BorderMarginTop;
        const notesBottom: number = staffLine.SkyBottomLineCalculator.getMaxInRangeOf(staffLine.NotesBottomLine,
            box.RelativePosition.x + box.BorderMarginLeft, box.RelativePosition.x + box.BorderMarginRight);
        expect(textTop, `text top ${textTop}, notes under it down to ${notesBottom}`).to.be.at.least(notesBottom - 0.01);
        osmd.clear();
        container.remove();
    });

    // The same with the score it was found in (Vivaldi, Un certo non so che Piano m12-15, extract
    //   test_words_inside_wedge_beyond.musicxml): "crescendo" from inside the short diminuendo of m13 over the beamed notes of m14.
    it("a text wider than the wedge it starts in stays clear of the notes (Vivaldi)", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        container.style.width = "1024px";
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.EngravingRules.DefaultFontFamily = "Times New Roman";
        await osmd.load(TestUtils.getScore("test_words_inside_wedge_beyond.musicxml"));
        osmd.render();
        const staffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
        const text: GraphicalContinuousDynamicExpression = staffLine.AbstractExpressions.find(
            e => e instanceof GraphicalContinuousDynamicExpression && e.IsVerbal) as GraphicalContinuousDynamicExpression;
        const box: GraphicalContinuousDynamicExpression["PositionAndShape"] = text.PositionAndShape;
        const textTop: number = box.RelativePosition.y + box.BorderMarginTop;
        const notesBottom: number = staffLine.SkyBottomLineCalculator.getMaxInRangeOf(staffLine.NotesBottomLine,
            box.RelativePosition.x + box.BorderMarginLeft, box.RelativePosition.x + box.BorderMarginRight);
        expect(textTop, `text top ${textTop}, notes under it down to ${notesBottom}`).to.be.at.least(notesBottom - 0.01);
        osmd.clear();
        container.remove();
    });

    // "< cres.": the words at the stop of a wedge follow it in its row (Parisotti, Vivaldi Un certo non so che Canto m24, m3 of the
    //   extract test_words_at_wedge_stop.musicxml: cres. at the stop of the crescendo over sixteenth sextuplets).
    it("the text at the stop of a wedge follows it in its row", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        container.style.width = "1600px";
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.EngravingRules.DefaultFontFamily = "Times New Roman";
        await osmd.load(TestUtils.getScore("test_words_at_wedge_stop.musicxml"));
        osmd.render();
        const staffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
        const expressions: GraphicalContinuousDynamicExpression[] = staffLine.AbstractExpressions.filter(
            e => e instanceof GraphicalContinuousDynamicExpression &&
                e.ContinuousDynamic.StartMultiExpression.SourceMeasureParent.MeasureNumberXML === 3) as GraphicalContinuousDynamicExpression[];
        const wedge: GraphicalContinuousDynamicExpression = expressions.find(e => !e.IsVerbal);
        const box: GraphicalContinuousDynamicExpression["PositionAndShape"] = expressions.find(e => e.IsVerbal).PositionAndShape;
        const ys: number[] = wedge.Lines.flatMap(l => [l.Start.y, l.End.y]);
        const textTop: number = box.RelativePosition.y + box.BorderMarginTop;
        const textBottom: number = box.RelativePosition.y + box.BorderMarginBottom;
        // the text in the wedge's row, not between it and the staff
        const message: string = `text ${textTop}..${textBottom}, wedge ${Math.min(...ys)}..${Math.max(...ys)}`;
        expect(textBottom, message).to.be.greaterThan(Math.min(...ys));
        expect(textTop, message).to.be.lessThan(Math.max(...ys));
        osmd.clear();
        container.remove();
    });
});
