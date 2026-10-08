import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalInstantaneousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalInstantaneousDynamicExpression";
import { GraphicalContinuousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalContinuousDynamicExpression";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Legrenzi, Che fiero costume, voice m26 (solo vocal verification 2, X2): a p written at the second note of a dim. wedge
 * above the staff sat on the wedge's lines over its middle - the wedge was placed first, at the notes, and the p over it.
 * As in the print the p is placed at the notes and the wedge goes over it (m1). A dynamic at the wedge's start keeps its place
 * before the wedge (m2), and a dynamic in the wedge's second half, its goal, goes beyond it, over the wedge, which keeps its
 * length (m3; Cesti, Intorno all'idol mio, piano m49). The XML of osmd-dart test/fixtures/test_dynamic_inside_wedge.musicxml. Same as osmd-dart
 * test/dynamic_inside_wedge_test.dart.
 */
describe("Dynamic inside a wedge", () => {
    const xml: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions><time><beats>3</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      <direction placement="above"><direction-type><wedge type="diminuendo" number="1"/></direction-type></direction>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><stem>up</stem></note>
      <direction placement="above"><direction-type><dynamics><p/></dynamics></direction-type></direction>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><stem>up</stem></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><stem>up</stem></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><stem>up</stem></note>
      <direction placement="above"><direction-type><wedge type="stop" number="1"/></direction-type></direction>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><stem>up</stem></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><stem>up</stem></note>
    </measure>
    <measure number="2">
      <direction placement="above"><direction-type><dynamics><f/></dynamics></direction-type></direction>
      <direction placement="above"><direction-type><wedge type="diminuendo" number="1"/></direction-type></direction>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><stem>up</stem></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><stem>up</stem></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><stem>up</stem></note>
      <direction placement="above"><direction-type><wedge type="stop" number="1"/></direction-type></direction>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><stem>up</stem></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><stem>up</stem></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><stem>up</stem></note>
    </measure>
    <measure number="3">
      <direction placement="above"><direction-type><wedge type="crescendo" number="1"/></direction-type></direction>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><stem>up</stem></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><stem>up</stem></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><stem>up</stem></note>
      <direction placement="above"><direction-type><dynamics><f/></dynamics></direction-type></direction>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><stem>up</stem></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><stem>up</stem></note>
      <direction placement="above"><direction-type><wedge type="stop" number="1"/></direction-type></direction>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><stem>up</stem></note>
    </measure>
  </part>
</score-partwise>
`;

    let line: StaffLine;
    beforeEach(async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(xml);
        osmd.render();
        line = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
    });

    function dynamics(): GraphicalInstantaneousDynamicExpression[] {
        return line.AbstractExpressions.filter(e => e instanceof GraphicalInstantaneousDynamicExpression)
            .sort((a, b) => a.PositionAndShape.RelativePosition.x - b.PositionAndShape.RelativePosition.x) as GraphicalInstantaneousDynamicExpression[];
    }
    function wedges(): GraphicalContinuousDynamicExpression[] {
        return line.AbstractExpressions.filter(e => e instanceof GraphicalContinuousDynamicExpression)
            .map(e => e as GraphicalContinuousDynamicExpression)
            .sort((a, b) => Math.min(...a.Lines.map(l => l.Start.x)) - Math.min(...b.Lines.map(l => l.Start.x)));
    }
    /** the y range of the wedge's lines, relative to the staffline */
    function wedgeYs(wedge: GraphicalContinuousDynamicExpression): number[] {
        return wedge.Lines.flatMap(l => [l.Start.y, l.End.y]);
    }
    function box(dynamic: GraphicalInstantaneousDynamicExpression): { top: number, bottom: number } {
        const shape: any = dynamic.PositionAndShape;
        return { top: shape.RelativePosition.y + shape.BorderMarginTop, bottom: shape.RelativePosition.y + shape.BorderMarginBottom };
    }

    it("places a dynamic in the first half of a wedge under it, at the notes", () => {
        const p: GraphicalInstantaneousDynamicExpression = dynamics()[0];
        const wedge: GraphicalContinuousDynamicExpression = wedges()[0];
        const ys: number[] = wedgeYs(wedge);
        const reason: string = `p ${box(p).top.toFixed(2)}..${box(p).bottom.toFixed(2)}, wedge ${Math.min(...ys).toFixed(2)}..` +
            `${Math.max(...ys).toFixed(2)}`;
        expect(box(p).top, reason).to.be.greaterThan(Math.max(...ys));
    });

    it("keeps a dynamic at the wedge's start before the wedge", () => {
        const f: GraphicalInstantaneousDynamicExpression = dynamics()[1];
        const wedge: GraphicalContinuousDynamicExpression = wedges()[1];
        const startX: number = Math.min(...wedge.Lines.map(l => Math.min(l.Start.x, l.End.x)));
        const shape: any = f.PositionAndShape;
        expect(shape.RelativePosition.x + shape.BorderMarginRight, `f, wedge from ${startX}`).to.be.at.most(startX);
    });

    it("places a dynamic in the wedge's second half, its goal, over the wedge, which is not shortened", () => {
        const f: GraphicalInstantaneousDynamicExpression = dynamics()[2];
        const wedge: GraphicalContinuousDynamicExpression = wedges()[2];
        const ys: number[] = wedgeYs(wedge);
        const wedgeRight: number = Math.max(...wedge.Lines.map(l => Math.max(l.Start.x, l.End.x)));
        const shape: any = f.PositionAndShape;
        const left: number = shape.RelativePosition.x + shape.BorderMarginLeft;
        const reason: string = `f ${box(f).top.toFixed(2)}..${box(f).bottom.toFixed(2)} from x ${left.toFixed(2)}, wedge from y ` +
            `${Math.min(...ys).toFixed(2)} to x ${wedgeRight.toFixed(2)}`;
        expect(box(f).bottom, reason).to.be.at.most(Math.min(...ys) + 1e-6);
        expect(wedgeRight, reason).to.be.greaterThan(left);
    });
});
