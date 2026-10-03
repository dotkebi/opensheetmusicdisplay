import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalUnknownExpression } from "../../../../src/MusicalScore/Graphical/GraphicalUnknownExpression";
import { StaffLine } from "../../../../src/MusicalScore/Graphical/StaffLine";
import { SourceMeasure } from "../../../../src/MusicalScore/VoiceData/SourceMeasure";
import { ContinuousTempoExpression } from "../../../../src/MusicalScore/VoiceData/Expressions/ContinuousExpressions/ContinuousTempoExpression";
import { TestUtils } from "../../../Util/TestUtils";

/**
 * Multi-line <words> directions ("La seconda volta\nmolto ritenuto", staff 2, placement below).
 * The reader must classify them by their first line: a performance note that merely contains a tempo
 * word in a later line is a staff-linked unknown expression, drawn below the staff it belongs to,
 * with a bounding box that covers all of its lines.
 */
describe("ExpressionReader multi-line words", () => {
    const multilineNote: string = "La seconda volta\nmolto ritenuto";

    function twoStaffScore(wordsText: string): string {
        return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>2</divisions>
        <time><beats>3</beats><beat-type>8</beat-type></time>
        <staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef>
      </attributes>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>3</duration><voice>1</voice><type>quarter</type><dot/><staff>1</staff></note>
      <backup><duration>3</duration></backup>
      <direction placement="below">
        <direction-type><words font-style="italic">${wordsText}</words></direction-type>
        <staff>2</staff>
      </direction>
      <note><pitch><step>B</step><octave>2</octave></pitch><duration>3</duration><voice>5</voice><type>quarter</type><dot/><staff>2</staff></note>
    </measure>
  </part>
</score-partwise>`;
    }

    async function load(wordsText: string): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "800px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(twoStaffScore(wordsText));
        return osmd;
    }

    function unknownLabelsOfStaff(measure: SourceMeasure, staffIndex: number): string[] {
        const labels: string[] = [];
        for (const multiExpression of measure.StaffLinkedExpressions[staffIndex] ?? []) {
            for (const unknown of multiExpression.UnknownList) {
                labels.push(unknown.Label);
            }
        }
        return labels;
    }

    /** Distinct unknown expressions of the staff line (each is registered twice: by its constructor and by the calculator). */
    function graphicalUnknownExpressions(staffLine: StaffLine): GraphicalUnknownExpression[] {
        return Array.from(new Set(staffLine.AbstractExpressions.filter(
            (expression) => expression instanceof GraphicalUnknownExpression) as GraphicalUnknownExpression[]));
    }

    it("keeps a multi-line note whose first line is no tempo word on its staff as an unknown expression", async () => {
        const osmd: OpenSheetMusicDisplay = await load(multilineNote);
        const measure: SourceMeasure = osmd.Sheet.SourceMeasures[0];
        expect(measure.TempoExpressions.length, "no tempo expression").to.equal(0);
        expect(unknownLabelsOfStaff(measure, 0), "nothing on staff 1").to.deep.equal([]);
        expect(unknownLabelsOfStaff(measure, 1), "unknown expression on staff 2").to.deep.equal([multilineNote]);
    });

    it("draws the multi-line note below the second staff with a box covering both lines", async () => {
        const osmd: OpenSheetMusicDisplay = await load(multilineNote);
        osmd.render();
        const staffLines: StaffLine[] = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines;
        expect(graphicalUnknownExpressions(staffLines[0]).length, "nothing drawn on staff 1").to.equal(0);
        const drawn: GraphicalUnknownExpression[] = graphicalUnknownExpressions(staffLines[1]);
        expect(drawn.length, "drawn on staff 2").to.equal(1);
        const label: GraphicalUnknownExpression = drawn[0];
        expect(label.Label.Label.text).to.equal(multilineNote);
        expect(label.Label.TextLines.length, "two text lines").to.equal(2);
        const box: { RelativePosition: { x: number, y: number }; BorderTop: number; BorderBottom: number;
            BorderMarginLeft: number; BorderMarginRight: number; } = label.Label.PositionAndShape;
        const labelTop: number = box.RelativePosition.y + box.BorderTop;
        const labelBottom: number = box.RelativePosition.y + box.BorderBottom;
        expect(labelTop, "label top below the bottom line of staff 2").to.be.at.least(osmd.EngravingRules.StaffHeight - 0.001);
        expect(labelBottom - labelTop, "box height covers two lines").to.be.at.least(2 * osmd.EngravingRules.UnknownTextHeight - 0.001);
        const bottomLine: number = staffLines[1].SkyBottomLineCalculator.getBottomLineMaxInRange(
            box.RelativePosition.x + box.BorderMarginLeft, box.RelativePosition.x + box.BorderMarginRight);
        expect(bottomLine, "bottom line reserves the whole label").to.be.at.least(labelBottom - 0.001);
    });

    it("still classifies single-line tempo words as tempo expressions", async () => {
        const osmd: OpenSheetMusicDisplay = await load("molto ritenuto");
        const measure: SourceMeasure = osmd.Sheet.SourceMeasures[0];
        expect(measure.TempoExpressions.length).to.equal(1);
        expect(measure.TempoExpressions[0].EntriesList[0].Expression).to.be.instanceOf(ContinuousTempoExpression);
        expect(unknownLabelsOfStaff(measure, 1)).to.deep.equal([]);
    });

    it("still classifies multi-line words whose first line is a tempo word as tempo expressions", async () => {
        const osmd: OpenSheetMusicDisplay = await load("Allegro\nmoderato");
        const measure: SourceMeasure = osmd.Sheet.SourceMeasures[0];
        expect(measure.TempoExpressions.length).to.equal(1);
        expect(measure.TempoExpressions[0].EntriesList[0].label).to.equal("Allegro\nmoderato");
        expect(unknownLabelsOfStaff(measure, 1)).to.deep.equal([]);
    });
});
