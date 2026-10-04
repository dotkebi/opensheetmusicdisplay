import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { GraphicalInstantaneousTempoExpression } from "../../../src/MusicalScore/Graphical/GraphicalInstantaneousTempoExpression";
import { GraphicalUnknownExpression } from "../../../src/MusicalScore/Graphical/GraphicalUnknownExpression";
import { GraphicalExpressionDashes } from "../../../src/MusicalScore/Graphical/GraphicalExpressionDashes";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Dashed lines after words (MusicXML <dashes>, e.g. "rit. - - -" in O cessate di piagarmi, Canto m17):
 * a <dashes> start/stop draws a dashed line from the text to the stop position, whether the dashes are in
 * the words' <direction> or in a separate one (written before or after the words).
 */
describe("Expression dashes", () => {
    const attributes: string = `<attributes><divisions>4</divisions><time><beats>6</beats><beat-type>8</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef></attributes>`;
    // a quarter B4 tied to a 16th B4, a 16th A4 and a dotted quarter G4 (Canto m17)
    const m17Notes: string = `
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      __WORDS__
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><type>16th</type></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><type>16th</type></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>6</duration><type>quarter</type><dot/></note>`;
    const filler: string = "<note><pitch><step>G</step><octave>4</octave></pitch><duration>12</duration><type>half</type><dot/></note>";

    function singleStaffScore(measure2: string, leadingDirections: string = "", extraMeasures: string = ""): string {
        return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Canto</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">${attributes}${filler}</measure>
    <measure number="2">${leadingDirections}${measure2}</measure>
    ${extraMeasures}
  </part>
</score-partwise>`;
    }

    async function render(xml: string, configure?: (osmd: OpenSheetMusicDisplay) => void): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        configure?.(osmd);
        await osmd.load(xml);
        osmd.render();
        return osmd;
    }

    function staffLines(osmd: OpenSheetMusicDisplay, system: number = 0): StaffLine[] {
        return osmd.GraphicSheet.MusicPages[0].MusicSystems[system].StaffLines;
    }

    function tempoLabels(staffLine: StaffLine): GraphicalInstantaneousTempoExpression[] {
        return Array.from(new Set(staffLine.AbstractExpressions.filter(
            (expression) => expression instanceof GraphicalInstantaneousTempoExpression) as GraphicalInstantaneousTempoExpression[]));
    }

    /** x of a staff entry of measure 2, relative to the staffline */
    function staffEntryX(staffLine: StaffLine, measureNumber: number, entryIndex: number): number {
        const measure: GraphicalMeasure = staffLine.Measures.find((m) => m.MeasureNumber === measureNumber);
        const entry: GraphicalStaffEntry = measure.staffEntries[entryIndex];
        return measure.PositionAndShape.RelativePosition.x + entry.PositionAndShape.RelativePosition.x;
    }

    function labelRight(label: GraphicalInstantaneousTempoExpression | GraphicalUnknownExpression): number {
        return label.Label.PositionAndShape.RelativePosition.x + label.Label.PositionAndShape.BorderMarginRight;
    }

    const separateDashes: string =
        "<direction placement=\"above\"><direction-type><dashes type=\"start\" number=\"1\"/></direction-type><offset>3</offset></direction>" +
        "<direction placement=\"above\"><direction-type><dashes type=\"stop\" number=\"1\"/></direction-type><offset>6</offset></direction>";
    const italicRit: string = "<direction placement=\"above\"><direction-type><words font-style=\"italic\">rit.</words></direction-type>" +
        "<offset>-1</offset></direction>";

    it("draws dashes from a separate direction (written before the words) from the text to the stop position", async () => {
        const osmd: OpenSheetMusicDisplay = await render(singleStaffScore(m17Notes.replace("__WORDS__", italicRit), separateDashes));
        const line: StaffLine = staffLines(osmd)[0];
        const labels: GraphicalInstantaneousTempoExpression[] = tempoLabels(line);
        expect(labels.map((l) => l.Label.Label.text)).to.deep.equal(["rit."]);
        expect(line.ExpressionDashes.length, "one dashed line").to.equal(1);
        const dashes: GraphicalExpressionDashes = line.ExpressionDashes[0];
        expect(dashes.Start.x, "starts after the text").to.be.greaterThan(labelRight(labels[0]));
        const stopX: number = staffEntryX(line, 2, 3); // the dotted quarter G4 at the stop offset
        expect(dashes.End.x, "ends before the stop note").to.be.at.most(stopX);
        expect(dashes.End.x, "reaches the stop note").to.be.at.least(stopX - 1);
        expect(dashes.End.x - dashes.Start.x, "visible length").to.be.greaterThan(1);
        const box: { RelativePosition: { y: number }, BorderTop: number, BorderBottom: number } = labels[0].Label.PositionAndShape;
        expect(dashes.Start.y, "at the height of the text").to.be.within(
            box.RelativePosition.y + box.BorderTop, box.RelativePosition.y + box.BorderBottom);
        expect(dashes.calculateStrokes(osmd.EngravingRules).length, "several dashes").to.be.greaterThan(1);
        const svgDashes: NodeListOf<Element> = (osmd as any).container.querySelectorAll("g.vf-expression-dashes");
        expect(svgDashes.length, "drawn").to.equal(1);
    });

    it("draws dashes given in the same direction as the words", async () => {
        const words: string = "<direction placement=\"above\"><direction-type><words>rit.</words></direction-type>" +
            "<direction-type><dashes type=\"start\" number=\"1\"/></direction-type></direction>";
        const stop: string = "<direction placement=\"above\"><direction-type><dashes type=\"stop\" number=\"1\"/></direction-type></direction>";
        const measure2: string = m17Notes.replace("__WORDS__", "").replace(
            "<note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration>",
            `${words}<note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration>`).replace(
            "<note><pitch><step>G</step>", `${stop}<note><pitch><step>G</step>`);
        const osmd: OpenSheetMusicDisplay = await render(singleStaffScore(measure2));
        const line: StaffLine = staffLines(osmd)[0];
        expect(line.ExpressionDashes.length).to.equal(1);
        expect(line.ExpressionDashes[0].Start.x).to.be.greaterThan(labelRight(tempoLabels(line)[0]));
        expect(line.ExpressionDashes[0].End.x).to.be.at.most(staffEntryX(line, 2, 3));
    });

    it("draws dashes after words that are no tempo expression", async () => {
        const words: string = "<direction placement=\"above\"><direction-type><words font-style=\"italic\">poco a poco</words></direction-type>" +
            "<direction-type><dashes type=\"start\" number=\"1\"/></direction-type></direction>";
        const stop: string = "<direction placement=\"above\"><direction-type><dashes type=\"stop\" number=\"1\"/></direction-type></direction>";
        const measure2: string = m17Notes.replace("__WORDS__", "").replace(
            "<note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration>",
            `${words}<note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration>`).replace(
            "<note><pitch><step>G</step>", `${stop}<note><pitch><step>G</step>`);
        const osmd: OpenSheetMusicDisplay = await render(singleStaffScore(measure2));
        const line: StaffLine = staffLines(osmd)[0];
        const unknown: GraphicalUnknownExpression = line.AbstractExpressions.find(
            (e) => e instanceof GraphicalUnknownExpression) as GraphicalUnknownExpression;
        expect(unknown.Label.Label.text).to.equal("poco a poco");
        expect(line.ExpressionDashes.length).to.equal(1);
        expect(line.ExpressionDashes[0].Start.x).to.be.greaterThan(labelRight(unknown));
    });

    it("continues the dashes over a system break", async () => {
        const words: string = "<direction placement=\"above\"><direction-type><words>rit.</words></direction-type>" +
            "<direction-type><dashes type=\"start\" number=\"1\"/></direction-type></direction>";
        const measure3: string = "<measure number=\"3\"><print new-system=\"yes\"/>" +
            "<note><pitch><step>A</step><octave>4</octave></pitch><duration>6</duration><type>quarter</type><dot/></note>" +
            "<direction placement=\"above\"><direction-type><dashes type=\"stop\" number=\"1\"/></direction-type></direction>" +
            "<note><pitch><step>G</step><octave>4</octave></pitch><duration>6</duration><type>quarter</type><dot/></note></measure>";
        const osmd: OpenSheetMusicDisplay = await render(singleStaffScore(words + filler, "", measure3),
            (o) => { o.EngravingRules.NewSystemAtXMLNewSystemAttribute = true; });
        expect(osmd.GraphicSheet.MusicPages[0].MusicSystems.length).to.equal(2);
        const first: StaffLine = staffLines(osmd, 0)[0];
        const second: StaffLine = staffLines(osmd, 1)[0];
        expect(first.ExpressionDashes.length, "first system part").to.equal(1);
        expect(second.ExpressionDashes.length, "second system part").to.equal(1);
        const lastMeasure: GraphicalMeasure = first.Measures[first.Measures.length - 1];
        expect(first.ExpressionDashes[0].End.x, "runs to the end of the first system").to.be.greaterThan(
            lastMeasure.PositionAndShape.RelativePosition.x + lastMeasure.PositionAndShape.Size.width - 1);
        expect(second.ExpressionDashes[0].End.x, "stops before the stop note").to.be.at.most(staffEntryX(second, 3, 1));
    });

    it("draws no dashes for a start without a stop, or for dashes after a crescendo word", async () => {
        const open: string = "<direction placement=\"above\"><direction-type><words>rit.</words></direction-type>" +
            "<direction-type><dashes type=\"start\" number=\"1\"/></direction-type></direction>";
        let osmd: OpenSheetMusicDisplay = await render(singleStaffScore(open + filler));
        expect(staffLines(osmd)[0].ExpressionDashes.length).to.equal(0);
        const cresc: string = "<direction placement=\"below\"><direction-type><words>cresc.</words></direction-type>" +
            "<direction-type><dashes type=\"start\" number=\"1\"/></direction-type></direction>";
        const stop: string = "<direction placement=\"below\"><direction-type><dashes type=\"stop\" number=\"1\"/></direction-type>" +
            "<offset>6</offset></direction>";
        osmd = await render(singleStaffScore(cresc + stop + filler));
        expect(staffLines(osmd)[0].ExpressionDashes.length).to.equal(0);
    });
});
