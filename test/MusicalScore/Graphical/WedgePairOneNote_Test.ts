import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalContinuousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalContinuousDynamicExpression";
import { ContDynamicEnum } from "../../../src/MusicalScore/VoiceData/Expressions/ContinuousExpressions/ContinuousDynamicExpression";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A crescendo and a diminuendo paired as a swell "<>" over one note, written as directions at the measure's start with
 * <offset>s (Bellini, L'allegro marinaro m46 and m87; the XML of osmd-dart test/fixtures/test_wedge_pair_one_note.musicxml):
 * both wedges went to the end of the measure (no note of the staff after their stops) and lay over each other, stacked on the
 * web. The first ends where the second starts, the second at its own stop, at the x of the time between the notes, in one row;
 * the pair gets WedgeMinReservedLength once. A pair whose stops are on notes keeps the note-based ends.
 * Same as osmd-dart test/wedge_pair_one_note_test.dart.
 */
describe("Wedge pair over one note", () => {
    const xml: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions><time><beats>3</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      <direction placement="above"><direction-type><wedge type="crescendo" number="1"/></direction-type><offset>0</offset></direction>
      <direction placement="above"><direction-type><wedge type="stop" number="1"/></direction-type><offset>2</offset></direction>
      <direction placement="above"><direction-type><wedge type="diminuendo" number="2"/></direction-type><offset>2</offset></direction>
      <direction placement="above"><direction-type><wedge type="stop" number="2"/></direction-type><offset>4</offset></direction>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>12</duration><voice>1</voice><type>half</type><dot/></note>
    </measure>
    <measure number="2">
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type></note>
    </measure>
    <measure number="3">
      <direction placement="above"><direction-type><wedge type="crescendo" number="1"/></direction-type><offset>0</offset></direction>
      <direction placement="above"><direction-type><wedge type="stop" number="1"/></direction-type><offset>2</offset></direction>
      <direction placement="above"><direction-type><wedge type="diminuendo" number="2"/></direction-type><offset>2</offset></direction>
      <direction placement="above"><direction-type><wedge type="stop" number="2"/></direction-type><offset>4</offset></direction>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice><type>half</type></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type></note>
    </measure>
    <measure number="4">
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type></note>
    </measure>
    <measure number="5">
      <direction placement="above"><direction-type><wedge type="crescendo" number="1"/></direction-type></direction>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type></note>
      <direction placement="above"><direction-type><wedge type="stop" number="1"/></direction-type></direction>
      <direction placement="above"><direction-type><wedge type="diminuendo" number="2"/></direction-type></direction>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type></note>
      <direction placement="above"><direction-type><wedge type="stop" number="2"/></direction-type></direction>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type></note>
    </measure>
    <measure number="6">
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type></note>
    </measure>
  </part>
</score-partwise>`;

    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    async function render(reservedLength?: number): Promise<void> {
        container = TestUtils.getDivElement(document);
        container.style.width = "1600px";
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.EngravingRules.DefaultFontFamily = "Times New Roman";
        if (reservedLength !== undefined) {
            osmd.EngravingRules.WedgeMinReservedLength = reservedLength;
        }
        await osmd.load(xml);
        osmd.render();
    }
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    function wedges(): GraphicalContinuousDynamicExpression[] {
        const result: GraphicalContinuousDynamicExpression[] = [];
        for (const page of osmd.GraphicSheet.MusicPages) {
            for (const system of page.MusicSystems) {
                for (const staffLine of system.StaffLines) {
                    for (const e of staffLine.AbstractExpressions) {
                        if (e instanceof GraphicalContinuousDynamicExpression && !e.IsVerbal && !result.includes(e)) {
                            result.push(e);
                        }
                    }
                }
            }
        }
        return result;
    }
    function wedge(measureNumber: number, type: ContDynamicEnum): GraphicalContinuousDynamicExpression {
        const found: GraphicalContinuousDynamicExpression[] = wedges().filter(w =>
            w.ContinuousDynamic.DynamicType === type &&
            w.ContinuousDynamic.StartMultiExpression.SourceMeasureParent.MeasureNumberXML === measureNumber);
        expect(found.length, `one ${ContDynamicEnum[type]} in m${measureNumber}`).to.equal(1);
        return found[0];
    }
    const xs: (w: GraphicalContinuousDynamicExpression) => number[] = (w) => w.Lines.flatMap(l => [l.Start.x, l.End.x]);
    const left: (w: GraphicalContinuousDynamicExpression) => number = (w) => Math.min(...xs(w));
    const right: (w: GraphicalContinuousDynamicExpression) => number = (w) => Math.max(...xs(w));
    const rowY: (w: GraphicalContinuousDynamicExpression) => number = (w) => w.Lines[0].Start.y;
    function measure(measureNumber: number): GraphicalMeasure {
        return osmd.GraphicSheet.MusicPages[0].MusicSystems.flatMap(system => system.StaffLines[0].Measures)
            .find(m => m.parentSourceMeasure.MeasureNumberXML === measureNumber);
    }
    /** the x (in the staff line) of the staff entry at the timestamp in the measure */
    function entryX(measureNumber: number, timestamp: number): number {
        const m: GraphicalMeasure = measure(measureNumber);
        const entry: GraphicalStaffEntry = m.staffEntries.find(e => Math.abs(e.relInMeasureTimestamp.RealValue - timestamp) < 1e-9);
        return entry.PositionAndShape.RelativePosition.x + m.PositionAndShape.RelativePosition.x;
    }
    function measureEnd(measureNumber: number): number {
        const m: GraphicalMeasure = measure(measureNumber);
        return m.PositionAndShape.RelativePosition.x + m.PositionAndShape.BorderRight;
    }

    it("the pair over one note ends at its stops, in one row", async () => {
        await render();
        const cresc: GraphicalContinuousDynamicExpression = wedge(1, ContDynamicEnum.crescendo);
        const dim: GraphicalContinuousDynamicExpression = wedge(1, ContDynamicEnum.diminuendo);
        const noteX: number = entryX(1, 0);
        const end: number = measureEnd(1);
        expect(rowY(cresc)).to.be.closeTo(rowY(dim), 0.01);
        expect(right(cresc), `cresc ${left(cresc)}..${right(cresc)} before dim ${left(dim)}..${right(dim)}`).to.be.lessThan(left(dim));
        expect(left(cresc)).to.be.closeTo(noteX, 1.0);
        expect(right(dim), `dim ends at ${right(dim)}, note ${noteX}, measure end ${end}`).to.be.lessThan(noteX + (end - noteX) * 0.5);
        const crescLength: number = right(cresc) - left(cresc);
        const dimLength: number = right(dim) - left(dim);
        expect(Math.abs(crescLength - dimLength), `equal times: cresc ${crescLength}, dim ${dimLength}`).to.be.lessThan(1.5);
    });

    it("the pair keeps its stops before a note after them", async () => {
        await render();
        const cresc: GraphicalContinuousDynamicExpression = wedge(3, ContDynamicEnum.crescendo);
        const dim: GraphicalContinuousDynamicExpression = wedge(3, ContDynamicEnum.diminuendo);
        const noteX: number = entryX(3, 0);
        const nextX: number = entryX(3, 0.5);
        expect(rowY(cresc)).to.be.closeTo(rowY(dim), 0.01);
        expect(right(cresc)).to.be.lessThan(left(dim));
        expect(right(dim), `dim ends at ${right(dim)}, note ${noteX}, next ${nextX}`).to.be.lessThan((noteX + nextX) / 2 + 0.5);
    });

    it("a pair with its stops on notes keeps the note-based ends", async () => {
        await render();
        const cresc: GraphicalContinuousDynamicExpression = wedge(5, ContDynamicEnum.crescendo);
        const dim: GraphicalContinuousDynamicExpression = wedge(5, ContDynamicEnum.diminuendo);
        const secondX: number = entryX(5, 0.25);
        const thirdX: number = entryX(5, 0.5);
        expect(rowY(cresc)).to.be.closeTo(rowY(dim), 0.01);
        expect(right(cresc)).to.be.lessThan(left(dim));
        expect(right(cresc)).to.be.greaterThan(secondX - 2.5);
        expect(left(dim)).to.be.closeTo(secondX, 2.0);
        expect(right(dim)).to.be.lessThan(thirdX);
        expect(right(dim)).to.be.greaterThan(thirdX - 2.5);
    });

    it("the pair is reserved WedgeMinReservedLength once", async () => {
        await render(5.0);
        const span: number = right(wedge(1, ContDynamicEnum.diminuendo)) - left(wedge(1, ContDynamicEnum.crescendo));
        const reservedWidth: number = measure(1).PositionAndShape.Size.width;
        osmd.clear();
        container.remove();
        await render(0.0);
        const unreservedSpan: number = right(wedge(1, ContDynamicEnum.diminuendo)) - left(wedge(1, ContDynamicEnum.crescendo));
        const unreservedWidth: number = measure(1).PositionAndShape.Size.width;
        expect(unreservedSpan, `without: ${unreservedSpan}`).to.be.lessThan(5.0);
        expect(span, `pair span ${span}`).to.be.at.least(5.0);
        expect(reservedWidth, `measure ${reservedWidth}, without the reservation ${unreservedWidth}`).to.be.greaterThan(unreservedWidth + 1);
        expect(span, `pair span ${span}`).to.be.lessThan(10.0);
    });
});
