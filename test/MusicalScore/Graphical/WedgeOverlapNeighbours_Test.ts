import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalContinuousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalContinuousDynamicExpression";
import { ContDynamicEnum } from "../../../src/MusicalScore/VoiceData/Expressions/ContinuousExpressions/ContinuousDynamicExpression";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A crescendo stopping at the note where a diminuendo starts, the note with a wide syllable (Parisotti, Traetta Ombra cara amorosa
 * Canto m67): the diminuendo starts at the staff entry's left border, under the syllable, left of the crescendo's end. Their boxes
 * overlapped by more than DynamicExpressionMaxDistance, and with the gap taken as the absolute value of the signed distance they were
 * not grouped: neither squeezed nor aligned, the diminuendo stayed stacked above the crescendo. Overlapping boxes are neighbours,
 * as in osmd-dart (AlignmentManager._isClose), where the two wedges were already in one row.
 */
describe("Overlapping wedges are aligned neighbours", () => {
    const xml: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions><time><beats>3</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      <direction placement="above"><direction-type><dynamics><f/></dynamics></direction-type></direction>
      <direction placement="above"><direction-type><wedge type="crescendo" number="1"/></direction-type></direction>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>3</duration><voice>1</voice><type>eighth</type><dot/>
        <lyric number="1"><syllabic>single</syllabic><text>ahi!</text></lyric></note>
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>16th</type>
        <lyric number="1"><syllabic>single</syllabic><text>che</text></lyric></note>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>eighth</type>
        <lyric number="1"><syllabic>single</syllabic><text>non</text></lyric></note>
      <direction placement="above"><direction-type><wedge type="stop" number="1"/></direction-type></direction>
      <direction placement="above"><direction-type><wedge type="diminuendo" number="2"/></direction-type></direction>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>eighth</type>
        <lyric number="1"><syllabic>begin</syllabic><text>giuuuuuuuuuun</text></lyric></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>eighth</type>
        <lyric number="1"><syllabic>end</syllabic><text>ge</text></lyric></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>eighth</type>
        <lyric number="1"><syllabic>single</syllabic><text>an</text></lyric></note>
      <direction placement="above"><direction-type><wedge type="stop" number="2"/></direction-type></direction>
    </measure>
    <measure number="2">
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>12</duration><voice>1</voice><type>half</type><dot/>
        <lyric number="1"><syllabic>single</syllabic><text>cor</text></lyric></note>
    </measure>
  </part>
</score-partwise>`;

    it("the crescendo and the diminuendo starting at its stop note share a row, the crescendo before the diminuendo", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        container.style.width = "1600px";
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.EngravingRules.DefaultFontFamily = "Times New Roman";
        await osmd.load(xml);
        osmd.render();
        const staffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
        const wedges: GraphicalContinuousDynamicExpression[] = staffLine.AbstractExpressions.filter(
            e => e instanceof GraphicalContinuousDynamicExpression && !e.IsVerbal) as GraphicalContinuousDynamicExpression[];
        const cresc: GraphicalContinuousDynamicExpression = wedges.find(w => w.ContinuousDynamic.DynamicType === ContDynamicEnum.crescendo);
        const dim: GraphicalContinuousDynamicExpression = wedges.find(w => w.ContinuousDynamic.DynamicType === ContDynamicEnum.diminuendo);
        const xs: (w: GraphicalContinuousDynamicExpression) => number[] = (w) => w.Lines.flatMap(l => [l.Start.x, l.End.x]);
        const crescRight: number = Math.max(...xs(cresc));
        const dimLeft: number = Math.min(...xs(dim));
        expect(cresc.Lines[0].Start.y, `cresc row ${cresc.Lines[0].Start.y}, dim row ${dim.Lines[0].Start.y}`)
            .to.be.closeTo(dim.Lines[0].Start.y, 0.01);
        expect(crescRight, `cresc ends ${crescRight}, dim starts ${dimLeft}`).to.be.at.most(dimLeft);
        osmd.clear();
        container.remove();
    });

    // A dynamic written inside a wedge stays out of the alignment (MusicSheetCalculator.dynamicsInsideWedges()), overlapping or not:
    //   grouped with the wedge, the wedge was squeezed to a stub after it (Cesti, Intorno all'idol mio, Piano m49: the p near the
    //   end of the dim. wedge). Same as osmd-dart (GraphicalInstantaneousDynamicExpression.insideWedge).
    const pInWedgeXml: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions><time><beats>3</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef></attributes>
      <direction placement="below"><direction-type><dynamics><p/></dynamics></direction-type><offset>4</offset></direction>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <direction placement="below"><direction-type><wedge type="diminuendo" number="1"/></direction-type></direction>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>G</step><alter>1</alter><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
    </measure>
    <measure number="2">
      <direction placement="below"><direction-type><wedge type="stop" number="1"/></direction-type></direction>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>6</duration><voice>1</voice><type>half</type><dot/></note>
    </measure>
  </part>
</score-partwise>`;

    it("a dynamic written inside a wedge does not squeeze it", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        container.style.width = "1600px";
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.EngravingRules.DefaultFontFamily = "Times New Roman";
        await osmd.load(pInWedgeXml);
        osmd.render();
        const staffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
        const wedge: GraphicalContinuousDynamicExpression = staffLine.AbstractExpressions.find(
            e => e instanceof GraphicalContinuousDynamicExpression && !e.IsVerbal) as GraphicalContinuousDynamicExpression;
        const xs: number[] = wedge.Lines.flatMap(l => [l.Start.x, l.End.x]);
        const entryX: number = staffLine.Measures[0].PositionAndShape.RelativePosition.x +
            staffLine.Measures[0].staffEntries[1].PositionAndShape.RelativePosition.x;
        // the wedge from its start note, the second eighth, not from after the p at the fifth
        expect(Math.min(...xs), `wedge ${Math.min(...xs)}..${Math.max(...xs)}, start note ${entryX}`).to.be.closeTo(entryX, 2.0);
        osmd.clear();
        container.remove();
    });

    // A wedge written with an <offset> before the dynamic at the note it starts at (Pergolesi, Stizzoso mio stizzoso Canto m26:
    //   the crescendo before the eighth rest with an offset to the f's eighth; extract test_wedge_offset_before_dynamic.musicxml)
    //   starts after the dynamic ("f <"), not squeezed to a stub before it.
    it("a wedge written before the dynamic at its start is not squeezed before it", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        container.style.width = "1600px";
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.EngravingRules.DefaultFontFamily = "Times New Roman";
        await osmd.load(TestUtils.getScore("test_wedge_offset_before_dynamic.musicxml"));
        osmd.render();
        const staffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
        const wedge: GraphicalContinuousDynamicExpression = staffLine.AbstractExpressions.find(
            e => e instanceof GraphicalContinuousDynamicExpression && !e.IsVerbal &&
                e.ContinuousDynamic.StartMultiExpression.SourceMeasureParent.MeasureNumberXML === 2) as GraphicalContinuousDynamicExpression;
        const xs: number[] = wedge.Lines.flatMap(l => [l.Start.x, l.End.x]);
        const measure: GraphicalMeasure = staffLine.Measures[1];
        const measureEnd: number = measure.PositionAndShape.RelativePosition.x + measure.PositionAndShape.BorderRight;
        const secondNote: number = measure.PositionAndShape.RelativePosition.x + measure.staffEntries[1].PositionAndShape.RelativePosition.x;
        // the crescendo over the measure from about its start, not a stub
        expect(Math.max(...xs) - Math.min(...xs), `wedge ${Math.min(...xs)}..${Math.max(...xs)}, second note ${secondNote}, end ${measureEnd}`)
            .to.be.greaterThan((measureEnd - secondNote) * 0.6);
        osmd.clear();
        container.remove();
    });
});
