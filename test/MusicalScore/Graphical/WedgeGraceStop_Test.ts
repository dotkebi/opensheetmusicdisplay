import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalContinuousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalContinuousDynamicExpression";
import { ContDynamicEnum } from "../../../src/MusicalScore/VoiceData/Expressions/ContinuousExpressions/ContinuousDynamicExpression";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A crescendo whose stop is at a note with grace notes before it, and a diminuendo starting there (Gluck, O del mio dolce
 * ardor, Canto m13 and m43, solo vocal verification 10-08): the crescendo must end where the diminuendo starts, on one
 * line, as without the grace note (m2). The XML of osmd-dart test/fixtures/test_wedge_grace_stop.musicxml.
 * Same as osmd-dart test/wedge_grace_stop_test.dart.
 */
describe("Wedges meeting at a note with grace notes", () => {
    const xml: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Canto</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      <direction placement="below"><direction-type><dynamics><p/></dynamics></direction-type></direction>
      <direction placement="above"><direction-type><wedge type="crescendo" number="1"/></direction-type></direction>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice><type>half</type></note>
      <direction placement="above"><direction-type><wedge type="stop" number="1"/></direction-type></direction>
      <direction placement="above"><direction-type><wedge type="diminuendo" number="1"/></direction-type></direction>
      <note><grace slash="yes"/><pitch><step>G</step><octave>4</octave></pitch><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type></note>
      <direction placement="above"><direction-type><wedge type="stop" number="1"/></direction-type></direction>
    </measure>
    <measure number="2">
      <direction placement="above"><direction-type><wedge type="crescendo" number="1"/></direction-type></direction>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice><type>half</type></note>
      <direction placement="above"><direction-type><wedge type="stop" number="1"/></direction-type></direction>
      <direction placement="above"><direction-type><wedge type="diminuendo" number="1"/></direction-type></direction>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type></note>
      <direction placement="above"><direction-type><wedge type="stop" number="1"/></direction-type></direction>
    </measure>
    <measure number="3">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice><type>whole</type></note>
    </measure>
  </part>
</score-partwise>
`;

    function render(width: number = 1600): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = `${width}px`;
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        return osmd.load(xml).then(() => {
            osmd.render();
            return osmd;
        });
    }
    function wedges(osmd: OpenSheetMusicDisplay): GraphicalContinuousDynamicExpression[] {
        const result: GraphicalContinuousDynamicExpression[] = [];
        for (const page of osmd.GraphicSheet.MusicPages) {
            for (const system of page.MusicSystems) {
                for (const staffLine of system.StaffLines) {
                    for (const expression of staffLine.AbstractExpressions) {
                        if (expression instanceof GraphicalContinuousDynamicExpression && !expression.IsVerbal && !result.includes(expression)) {
                            result.push(expression);
                        }
                    }
                }
            }
        }
        return result;
    }
    function wedge(osmd: OpenSheetMusicDisplay, measureNumber: number, type: ContDynamicEnum): GraphicalContinuousDynamicExpression {
        const found: GraphicalContinuousDynamicExpression[] = wedges(osmd).filter(w => w.ContinuousDynamic.DynamicType === type &&
            w.ContinuousDynamic.StartMultiExpression.SourceMeasureParent.MeasureNumberXML === measureNumber);
        expect(found.length).to.equal(1);
        return found[0];
    }
    function left(w: GraphicalContinuousDynamicExpression): number {
        return Math.min(...w.Lines.map(l => Math.min(l.Start.x, l.End.x)));
    }
    function right(w: GraphicalContinuousDynamicExpression): number {
        return Math.max(...w.Lines.map(l => Math.max(l.Start.x, l.End.x)));
    }
    function measure(osmd: OpenSheetMusicDisplay, measureNumber: number): GraphicalMeasure {
        for (const system of osmd.GraphicSheet.MusicPages[0].MusicSystems) {
            for (const m of system.StaffLines[0].Measures) {
                if (m.parentSourceMeasure.MeasureNumberXML === measureNumber) {
                    return m;
                }
            }
        }
        return undefined;
    }
    /** x (in the staff line) of the staff entry at `timestamp` in the measure */
    function entryX(osmd: OpenSheetMusicDisplay, measureNumber: number, timestamp: number): number {
        const m: GraphicalMeasure = measure(osmd, measureNumber);
        const entry: GraphicalStaffEntry = m.staffEntries.find(e => Math.abs(e.relInMeasureTimestamp.RealValue - timestamp) < 1e-9);
        return entry.PositionAndShape.RelativePosition.x + m.PositionAndShape.RelativePosition.x;
    }

    for (const m of [1, 2]) {
        it(`ends a crescendo where the diminuendo at its stop starts, on one line (m${m}${m === 1 ? ", grace note at the stop" : ""})`, async () => {
            const osmd: OpenSheetMusicDisplay = await render();
            const crescendo: GraphicalContinuousDynamicExpression = wedge(osmd, m, ContDynamicEnum.crescendo);
            const diminuendo: GraphicalContinuousDynamicExpression = wedge(osmd, m, ContDynamicEnum.diminuendo);
            const stopX: number = entryX(osmd, m, 0.5);
            const reason: string = `cresc ${left(crescendo)}..${right(crescendo)} dim ${left(diminuendo)}..${right(diminuendo)} stop note x ${stopX}`;
            expect(right(crescendo), reason).to.be.lessThan(stopX);
            expect(right(crescendo), reason).to.be.at.most(left(diminuendo) + 0.01);
            expect(diminuendo.Lines[0].Start.y, reason).to.be.closeTo(crescendo.Lines[0].Start.y, 0.01);
        });
    }
});
