import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { ContDynamicEnum, ContinuousDynamicExpression }
    from "../../../../src/MusicalScore/VoiceData/Expressions/ContinuousExpressions/ContinuousDynamicExpression";
import { GraphicalContinuousDynamicExpression } from "../../../../src/MusicalScore/Graphical/GraphicalContinuousDynamicExpression";
import { GraphicalMeasure } from "../../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { MultiExpression } from "../../../../src/MusicalScore/VoiceData/Expressions/MultiExpression";
import { SourceMeasure } from "../../../../src/MusicalScore/VoiceData/SourceMeasure";
import { Fraction } from "../../../../src/Common/DataObjects/Fraction";
import { TestUtils } from "../../../Util/TestUtils";

/**
 * Wedges whose stop is written before their start in the file, and wedges without a stop:
 * - MuseScore writes a hairpin of a voice read after a `<backup>` with its stop in the voice read first (at the later time) and
 *   its start after the backup, so the stop was read with no wedge of its number open and ignored, and the start stayed open;
 * - a wedge that stays open ended at the end of the piece, and since the parts between the systems are drawn (OSMD 2.3.0), that
 *   drew a hairpin through every system to the last one (openscore string quartets, e.g. Beethoven op. 18 no. 1 m109).
 * - a stop with an <offset> written at the start of the measure, before the start it belongs to (a generator's hairpin within one
 *   measure), was dropped the same way (no wedge of its number open), and the start stayed open.
 * Now the start closes at the stop read before it, and a wedge without a stop ends at the end of the measure it starts in.
 * A word dynamic ("dim.") without a following dynamic draws no line and still runs to the end of the piece.
 */
describe("Wedge stop written before its start, wedge without a stop", () => {
    const xml: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Violin</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      <direction placement="below"><direction-type><wedge type="crescendo" number="1"/></direction-type></direction>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
      <direction placement="below"><direction-type><wedge type="stop" number="2"/></direction-type></direction>
      <direction placement="below"><direction-type><wedge type="stop" number="1"/></direction-type></direction>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
      <backup><duration>8</duration></backup>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><voice>2</voice><type>quarter</type><stem>down</stem></note>
      <direction placement="below"><direction-type><wedge type="diminuendo" number="2"/></direction-type></direction>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>2</duration><voice>2</voice><type>quarter</type><stem>down</stem></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>2</voice><type>half</type><stem>down</stem></note>
    </measure>
    <measure number="2">
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
      <direction placement="below"><direction-type><wedge type="diminuendo" number="1"/></direction-type></direction>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
    </measure>
    <measure number="3">
      <direction placement="below"><direction-type><words>dim.</words></direction-type></direction>
      <direction placement="below"><direction-type><wedge type="stop" number="3"/></direction-type><offset>6</offset></direction>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
      <direction placement="below"><direction-type><wedge type="crescendo" number="3"/></direction-type></direction>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
    </measure>
    <measure number="4">
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice><type>whole</type></note>
    </measure>
  </part>
</score-partwise>`;

    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async (): Promise<void> => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(xml);
    });

    afterEach((): void => {
        document.body.removeChild(container);
    });

    /** The wedges starting in the sheet, in measure order. */
    function wedges(): ContinuousDynamicExpression[] {
        const result: ContinuousDynamicExpression[] = [];
        for (const measure of osmd.Sheet.SourceMeasures) {
            for (const expressions of measure.StaffLinkedExpressions) {
                for (const multiExpression of expressions ?? []) {
                    if (multiExpression.StartingContinuousDynamic) {
                        result.push(multiExpression.StartingContinuousDynamic);
                    }
                }
            }
        }
        return result;
    }

    function at(expression: MultiExpression): string {
        return `m${expression.SourceMeasureParent.MeasureNumberXML} ${expression.Timestamp.RealValue}`;
    }

    it("closes a wedge at the stop of its number written before its start in the measure (after a <backup>)", () => {
        const diminuendo: ContinuousDynamicExpression = wedges().find(w => w.DynamicType === ContDynamicEnum.diminuendo &&
            w.parentMeasure.MeasureNumberXML === 1);
        expect(diminuendo, "diminuendo of m1").to.not.equal(undefined);
        expect(at(diminuendo.StartMultiExpression)).to.equal("m1 0.25");
        // the stop read before it (with the crescendo's): under the last note before it, the D, drawn to the stop (StopTimestamp)
        expect(at(diminuendo.EndMultiExpression), "diminuendo end").to.equal("m1 0.25");
        expect(diminuendo.StopTimestamp?.RealValue, "diminuendo stop").to.equal(0.5);
        const crescendo: ContinuousDynamicExpression = wedges().find(w => w.DynamicType === ContDynamicEnum.crescendo);
        expect(at(crescendo.StartMultiExpression)).to.equal("m1 0");
        expect(at(crescendo.EndMultiExpression), "crescendo end").to.equal("m1 0"); // under the G it ends after, drawn to its stop
        expect(crescendo.StopTimestamp?.RealValue, "crescendo stop").to.equal(0.5);
    });

    it("ends a wedge without a stop at the end of the measure it starts in, not at the end of the piece", () => {
        const diminuendo: ContinuousDynamicExpression = wedges().find(w => w.DynamicType === ContDynamicEnum.diminuendo &&
            w.parentMeasure.MeasureNumberXML === 2);
        expect(diminuendo, "diminuendo of m2").to.not.equal(undefined);
        expect(at(diminuendo.StartMultiExpression)).to.equal("m2 0.5");
        const m2: SourceMeasure = osmd.Sheet.SourceMeasures[1];
        expect(diminuendo.EndMultiExpression.SourceMeasureParent).to.equal(m2);
        expect(diminuendo.EndMultiExpression.Timestamp.Equals(new Fraction(1, 1))).to.equal(true); // the measure's end
        const lastMeasure: SourceMeasure = osmd.Sheet.SourceMeasures[3];
        expect(lastMeasure.StaffLinkedExpressions.flat().some(e => e.EndingContinuousDynamic && !e.EndingContinuousDynamic.Label),
            "a wedge end in m4").to.equal(false);
    });

    it("closes a wedge at the stop with an <offset> written before its start in the measure", () => {
        const crescendo: ContinuousDynamicExpression = wedges().find(w => w.DynamicType === ContDynamicEnum.crescendo &&
            w.parentMeasure.MeasureNumberXML === 3);
        expect(crescendo, "crescendo of m3").to.not.equal(undefined);
        expect(at(crescendo.StartMultiExpression)).to.equal("m3 0.5");
        // the stop at 0 + 3 quarters: under the half note it ends after, drawn to the stop (StopTimestamp)
        expect(at(crescendo.EndMultiExpression), "crescendo end").to.equal("m3 0.5");
        expect(crescendo.StopTimestamp?.RealValue, "crescendo stop").to.equal(0.75);
    });

    it("keeps a word dynamic without a following dynamic open to the end of the piece", () => {
        const words: ContinuousDynamicExpression = wedges().find(w => w.Label === "dim.");
        expect(words, "dim. of m3").to.not.equal(undefined);
        expect(at(words.StartMultiExpression)).to.equal("m3 0");
        const lastMeasure: SourceMeasure = osmd.Sheet.SourceMeasures[3];
        expect(words.EndMultiExpression.SourceMeasureParent).to.equal(lastMeasure);
        expect(words.EndMultiExpression.Timestamp.Equals(new Fraction(1, 1))).to.equal(true);
    });

    it("draws the four wedges and nothing of them after measure 3", () => {
        osmd.render();
        const drawn: string[] = [];
        for (const page of osmd.GraphicSheet.MusicPages) {
            for (const system of page.MusicSystems) {
                for (const staffLine of system.StaffLines) {
                    for (const expression of staffLine.AbstractExpressions) {
                        if (expression instanceof GraphicalContinuousDynamicExpression && !expression.IsVerbal) {
                            const measures: GraphicalMeasure[] = expression.ParentStaffLine.Measures;
                            drawn.push(`${ContDynamicEnum[expression.ContinuousDynamic.DynamicType]}` +
                                ` m${expression.ContinuousDynamic.parentMeasure.MeasureNumberXML}` +
                                ` in m${measures[0].MeasureNumber}-${measures[measures.length - 1].MeasureNumber}`);
                        }
                    }
                }
            }
        }
        expect(drawn.sort()).to.deep.equal(["crescendo m1 in m1-4", "crescendo m3 in m1-4", "diminuendo m1 in m1-4", "diminuendo m2 in m1-4"]);
    });
});
