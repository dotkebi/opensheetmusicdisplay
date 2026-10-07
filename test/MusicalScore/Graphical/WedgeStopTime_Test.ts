import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalContinuousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalContinuousDynamicExpression";
import { ContDynamicEnum, ContinuousDynamicExpression }
    from "../../../src/MusicalScore/VoiceData/Expressions/ContinuousExpressions/ContinuousDynamicExpression";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Wedge stops and the drawn wedge ends (solo vocal hairpins, the XML of osmd-dart test/fixtures/test_wedge_stop_time.musicxml):
 * - a wedge over one note (its stop before the next note) reaches that next note (Gluck, O del mio dolce ardor m6: it stopped
 *   1/WedgeEndDistanceBetweenTimestampsFactor of the way, a short ">" over the accent);
 * - a stop on the note the wedge starts on shares its start MultiExpression, and "cresc." words after it closed it again at the
 *   words (Legrenzi, Che fiero costume m16: the diminuendo ran into m17);
 * - the drawn end goes towards the stop as written, not the end note plus the longest note of the staff there (Bononcini,
 *   Deh più a me non v'ascondete m4: a dotted half rest in voice 2 drew the crescendo to the end of the measure, and the
 *   diminuendo starting at its stop was stacked below it; m7 without the diminuendo);
 * - a start with a negative <offset> starts between the notes (Legrenzi m12);
 * - a wedge written for a staff without notes in the measure still ends at the measure's end (Schumann, Myrthen 7 m7: the
 *   crescendo of the empty right hand over the left-hand chords was drawn 3 spaces long);
 * - a wedge in one measure gets WedgeMinReservedLength from its start to its stop by widening the measure: in a tight measure
 *   the one over a dotted quarter was a short ">" over the accent (Gluck m6).
 * Same as osmd-dart test/wedge_stop_time_test.dart.
 */
describe("Wedge stops and drawn wedge ends", () => {
    /* eslint-disable max-len */
    const xml: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      <direction placement="above"><direction-type><wedge type="diminuendo" number="1"/></direction-type></direction>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>3</duration><voice>1</voice><type>quarter</type><dot/><notations><articulations><accent placement="above"/></articulations></notations></note>
      <direction placement="above"><direction-type><wedge type="stop" number="1"/></direction-type></direction>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
      <note><rest/><duration>2</duration><voice>1</voice><type>quarter</type></note>
    </measure>
    <measure number="2">
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
      <direction placement="below"><direction-type><wedge type="crescendo" number="1"/></direction-type></direction>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
      <direction placement="below"><direction-type><wedge type="stop" number="1"/></direction-type></direction>
    </measure>
    <measure number="3">
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
      <direction placement="below"><direction-type><wedge type="diminuendo" number="1"/></direction-type></direction>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
      <direction placement="below"><direction-type><wedge type="stop" number="1"/></direction-type></direction>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
    </measure>
    <measure number="4">
      <direction placement="below"><direction-type><words>cresc.</words></direction-type><offset>2</offset></direction>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
    </measure>
    <measure number="5">
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <direction placement="below"><direction-type><wedge type="crescendo" number="1"/></direction-type></direction>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
      <note><chord/><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
      <direction placement="below"><direction-type><wedge type="stop" number="1"/></direction-type></direction>
      <direction placement="below"><direction-type><wedge type="diminuendo" number="1"/></direction-type></direction>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <note><chord/><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <note><chord/><pitch><step>E</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
      <direction placement="below"><direction-type><wedge type="stop" number="1"/></direction-type></direction>
      <backup><duration>8</duration></backup>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><voice>2</voice><type>quarter</type><stem>down</stem></note>
      <note><rest/><duration>6</duration><voice>2</voice><type>half</type><dot/></note>
    </measure>
    <measure number="6">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
      <note><chord/><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
      <direction placement="below"><direction-type><wedge type="diminuendo" number="1"/></direction-type><offset>-2</offset></direction>
      <direction placement="below"><direction-type><wedge type="stop" number="1"/></direction-type></direction>
      <note><pitch><step>B</step><octave>3</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
      <note><chord/><pitch><step>D</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
      <note><rest/><duration>2</duration><voice>1</voice><type>quarter</type></note>
    </measure>
    <measure number="7">
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <direction placement="below"><direction-type><wedge type="crescendo" number="1"/></direction-type></direction>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
      <note><chord/><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
      <direction placement="below"><direction-type><wedge type="stop" number="1"/></direction-type></direction>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <note><chord/><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <note><chord/><pitch><step>E</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
      <backup><duration>8</duration></backup>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><voice>2</voice><type>quarter</type><stem>down</stem></note>
      <note><rest/><duration>6</duration><voice>2</voice><type>half</type><dot/></note>
    </measure>
  </part>
</score-partwise>`;
    /* eslint-enable max-len */

    function render(width: number = 1600, reservedLength: number = undefined, source: string = xml): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = `${width}px`;
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        if (reservedLength !== undefined) {
            osmd.EngravingRules.WedgeMinReservedLength = reservedLength;
        }
        return osmd.load(source).then(() => {
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

    it("keeps the stop as written and ends where it was read", async () => {
        const osmd: OpenSheetMusicDisplay = await render();
        const describe: (w: ContinuousDynamicExpression) => string = w =>
            `${ContDynamicEnum[w.DynamicType]} ${w.StartMultiExpression.SourceMeasureParent.MeasureNumberXML}` +
            `@${w.StartMultiExpression.Timestamp.RealValue}-${w.EndMultiExpression.SourceMeasureParent.MeasureNumberXML}` +
            `@${w.EndMultiExpression.Timestamp.RealValue} stop ${w.StopTimestamp?.RealValue}`;
        expect(wedges(osmd).map(w => describe(w.ContinuousDynamic))).to.deep.equal([
            "diminuendo 1@0-1@0 stop 0.375",
            "crescendo 2@0.5-2@0.5 stop 1",
            // ends in m3, not at the "cresc." of m4
            "diminuendo 3@0.5-3@0.5 stop 0.75",
            "crescendo 5@0.25-5@0.25 stop 0.5",
            "diminuendo 5@0.5-5@0.75 stop 1",
            "diminuendo 6@0.25-6@0 stop 0.5",
            "crescendo 7@0.25-7@0.25 stop 0.5",
        ]);
    });

    it("draws a wedge over one note to the next note", async () => {
        const osmd: OpenSheetMusicDisplay = await render();
        const margin: number = osmd.EngravingRules.WedgeHorizontalMargin;
        // to the next note (its left edge for a diminuendo), not 1/WedgeEndDistanceBetweenTimestampsFactor of the way
        for (const [m, start, next] of [[1, 0, 3 / 8], [3, 1 / 2, 3 / 4]]) {
            const dim: GraphicalContinuousDynamicExpression = wedge(osmd, m, ContDynamicEnum.diminuendo);
            const nextX: number = entryX(osmd, m, next) - margin;
            expect(left(dim)).to.be.closeTo(entryX(osmd, m, start), 1.0);
            expect(right(dim)).to.be.at.most(nextX + 0.01);
            expect(right(dim) - left(dim)).to.be.greaterThan(0.75 * (nextX - left(dim)));
        }
    });

    it("ends a crescendo over a rest in another voice at its stop", async () => {
        const osmd: OpenSheetMusicDisplay = await render();
        const margin: number = osmd.EngravingRules.WedgeHorizontalMargin;
        const alone: GraphicalContinuousDynamicExpression = wedge(osmd, 7, ContDynamicEnum.crescendo);
        expect(right(alone)).to.be.closeTo(entryX(osmd, 7, 1 / 2) - margin, 0.3);
        const crescendo: GraphicalContinuousDynamicExpression = wedge(osmd, 5, ContDynamicEnum.crescendo);
        const diminuendo: GraphicalContinuousDynamicExpression = wedge(osmd, 5, ContDynamicEnum.diminuendo);
        expect(right(crescendo)).to.be.lessThan(entryX(osmd, 5, 1 / 2));
        expect(right(crescendo)).to.be.at.most(left(diminuendo) + 0.01);
        // both on one line: the diminuendo is not stacked below the crescendo
        expect(diminuendo.Lines[0].Start.y).to.be.closeTo(crescendo.Lines[0].Start.y, 0.01);
    });

    it("starts a wedge with a negative offset between the chords", async () => {
        const osmd: OpenSheetMusicDisplay = await render();
        const margin: number = osmd.EngravingRules.WedgeHorizontalMargin;
        const dim: GraphicalContinuousDynamicExpression = wedge(osmd, 6, ContDynamicEnum.diminuendo);
        const chord1: number = entryX(osmd, 6, 0);
        const chord2: number = entryX(osmd, 6, 1 / 2);
        expect(left(dim)).to.be.greaterThan(chord1 + 0.1);
        expect(left(dim)).to.be.lessThan(chord2);
        // to the second chord (its left edge for a diminuendo, at least WedgeMinLength)
        expect(right(dim)).to.be.closeTo(chord2 - margin, 0.7);
    });

    it("gives a wedge in a tight measure WedgeMinReservedLength", async () => {
        const length: (osmd: OpenSheetMusicDisplay) => number = osmd => {
            const dim: GraphicalContinuousDynamicExpression = wedge(osmd, 1, ContDynamicEnum.diminuendo);
            return right(dim) - left(dim);
        };
        // m1 stays near its minimum width in a narrow system
        const reserved: OpenSheetMusicDisplay = await render(1000);
        const reservedLength: number = reserved.EngravingRules.WedgeMinReservedLength;
        expect(reservedLength).to.equal(4);
        // the diminuendo ends at the left edge of the next note
        expect(length(reserved)).to.be.greaterThan(reservedLength - 0.7);
        const unreserved: OpenSheetMusicDisplay = await render(1000, 0);
        expect(length(unreserved)).to.be.lessThan(length(reserved) - 0.2);
    });

    it("ends a wedge on a staff without notes at the measure end", async () => {
        const chord: (staff: number) => string = staff => `<note><pitch><step>C</step><octave>${staff === 1 ? 5 : 3}</octave></pitch>` +
            `<duration>2</duration><voice>${staff === 1 ? 1 : 5}</voice><type>quarter</type><staff>${staff}</staff></note>`;
        const rest: (staff: number) => string = staff => "<note><rest measure=\"yes\"/><duration>8</duration>" +
            `<voice>${staff === 1 ? 1 : 5}</voice><staff>${staff}</staff></note>`;
        const wedgeXml: (type: string) => string = type =>
            `<direction placement="below"><direction-type><wedge type="${type}" number="1"/></direction-type><staff>1</staff></direction>`;
        const source: string = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list>" +
            "<score-part id=\"P1\"><part-name>Piano</part-name></score-part></part-list><part id=\"P1\"><measure number=\"1\">" +
            "<attributes><divisions>2</divisions><staves>2</staves><time><beats>4</beats><beat-type>4</beat-type></time>" +
            "<clef number=\"1\"><sign>G</sign><line>2</line></clef><clef number=\"2\"><sign>F</sign><line>4</line></clef></attributes>" +
            `${chord(1)}${chord(1)}${chord(1)}${chord(1)}<backup><duration>8</duration></backup>${rest(2)}</measure>` +
            `<measure number="2">${wedgeXml("crescendo")}${chord(2)}${chord(2)}${chord(2)}${wedgeXml("stop")}${chord(2)}</measure>` +
            `<measure number="3">${chord(2)}${chord(2)}${chord(2)}${chord(2)}</measure>` +
            `<measure number="4">${rest(1)}<backup><duration>8</duration></backup>${rest(2)}</measure></part></score-partwise>`;
        const osmd: OpenSheetMusicDisplay = await render(1600, undefined, source);
        const all: GraphicalContinuousDynamicExpression[] = wedges(osmd);
        expect(all.length).to.equal(1);
        const m: GraphicalMeasure = measure(osmd, 2);
        const measureEnd: number = m.PositionAndShape.RelativePosition.x + m.PositionAndShape.Size.width;
        expect(right(all[0])).to.be.closeTo(measureEnd - osmd.EngravingRules.WedgeHorizontalMargin, 0.1);
    });
});
