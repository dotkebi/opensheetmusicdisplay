import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";

/**
 * A measure number is placed at the measure's start, before the ornaments; the fermata over the measure's first note (a whole
 * note) stood beside it at its height, touching it (Bellini, Per pietà, bell'idol mio, piano m63, review B14-F03: "63" and the
 * fermata's arc a pixel apart). Ink within EngravingRules.MeasureNumberInkGap of the number's margins, at its height, raises
 * the number over the ink like a raised mark (raiseMeasureNumbersOverRaisedMarks()). Same as osmd-dart's
 * test/measure_number_fermata_gap_test.dart (its fixture numbered from 1, with a two-digit number over the fermata too: the web
 * places a whole note further from the barline, so the numbers here are three digits wide, from 101, at the barline, for the
 * fermatas' ink to begin within MeasureNumberInkGap of both numbers).
 */
describe("Measure number beside a fermata", () => {
    /* eslint-disable max-len */
    const xml: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="101">
      <attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
    </measure>
    <measure number="102">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
    </measure>
    <measure number="103">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice><type>whole</type><notations><fermata type="upright"/></notations></note>
    </measure>
    <measure number="104">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
    </measure>
    <measure number="105">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
    </measure>
    <measure number="106">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
    </measure>
    <measure number="107">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
    </measure>
    <measure number="108">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
    </measure>
    <measure number="109">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
    </measure>
    <measure number="110">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
    </measure>
    <measure number="111">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
    </measure>
    <measure number="112">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
    </measure>
    <measure number="113">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice><type>whole</type><notations><fermata type="upright"/></notations></note>
    </measure>
    <measure number="114">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice><type>whole</type></note>
      <barline location="right"><bar-style>light-heavy</bar-style></barline>
    </measure>
  </part>
</score-partwise>`;
    /* eslint-enable max-len */
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        container.style.width = "1000px";
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.EngravingRules.MeasureNumberLabelOffset = 1;
        // the numbers at the barline (not MeasureNumberLabelXOffset before it): the fermatas' ink then begins within the gap
        osmd.EngravingRules.MeasureNumberLabelXOffset = 0;
        await osmd.load(xml);
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    function numberBox(staffLine: StaffLine, text: string): BoundingBox {
        const labels: BoundingBox[] = staffLine.ParentMusicSystem.MeasureNumberLabels
            .filter(label => label.Label.text === text).map(label => label.PositionAndShape);
        expect(labels.length, `m${text}'s number`).to.equal(1);
        return labels[0];
    }

    it("the number goes over the fermata beside it within the gap", () => {
        const m3: VexFlowMeasure = osmd.GraphicSheet.MeasureList[2][0] as VexFlowMeasure;
        const staffLine: StaffLine = m3.ParentStaffLine;
        const [ink] = m3.FermataInk;
        expect(ink.fermata.slurClearanceYShift, "no slur to raise over").to.equal(0);
        const box: BoundingBox = numberBox(staffLine, "103");
        const right: number = box.RelativePosition.x + box.BorderMarginRight - staffLine.PositionAndShape.RelativePosition.x;
        // beside the fermata: its ink begins within the gap after the number
        expect(ink.left - right, `number right ${right}, fermata left ${ink.left}`).to.be.at.least(-0.01);
        expect(ink.left - right, `number right ${right}, fermata left ${ink.left}`).to.be.at.most(osmd.EngravingRules.MeasureNumberInkGap);
        const labelBottom: number = box.RelativePosition.y + box.BorderMarginBottom;
        expect(labelBottom, `number bottom ${labelBottom}, fermata top ${ink.top}`).to.be.lessThan(ink.top);
    });

    it("a two-digit number beside the fermata goes over it too", () => {
        const m113: VexFlowMeasure = osmd.GraphicSheet.MeasureList[12][0] as VexFlowMeasure;
        const staffLine: StaffLine = m113.ParentStaffLine;
        const [ink] = m113.FermataInk;
        const box: BoundingBox = numberBox(staffLine, "113");
        const right: number = box.RelativePosition.x + box.BorderMarginRight - staffLine.PositionAndShape.RelativePosition.x;
        expect(ink.left - right, `number right ${right}, fermata left ${ink.left}`).to.be.at.least(-0.01);
        expect(ink.left - right, `number right ${right}, fermata left ${ink.left}`).to.be.at.most(osmd.EngravingRules.MeasureNumberInkGap);
        const labelBottom: number = box.RelativePosition.y + box.BorderMarginBottom;
        expect(labelBottom, `number bottom ${labelBottom}, fermata top ${ink.top}`).to.be.lessThan(ink.top);
    });
});
