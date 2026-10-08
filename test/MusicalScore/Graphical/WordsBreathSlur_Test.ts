import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { PointF2D } from "../../../src/Common/DataObjects/PointF2D";
import { TestUtils } from "../../Util/TestUtils";
import Vex from "vexflow";
const VF: any = Vex.Flow;

/**
 * Words above, kept inside their measure (WordsMeasureStart), must still clear what is drawn at their note (Bellini,
 * Vaga luna, voice m11 "più cresc." moved right onto the breath mark of its note; piano m11 "sc." onto the slur rising
 * from the next note, solo vocal verification 10-08). The XML of osmd-dart test/fixtures/test_words_breath_slur.musicxml.
 * Same as osmd-dart test/words_breath_slur_test.dart.
 */
describe("Words above a breath mark or a slur", () => {
    /* eslint-disable max-len */
    const xml: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
    </measure>
    <measure number="2">
      <direction placement="above"><direction-type><words>più cresc.</words></direction-type></direction>
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><notations><articulations><breath-mark/></articulations></notations></note>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
    </measure>
    <measure number="3">
      <direction placement="above"><direction-type><words>più cresc.</words></direction-type></direction>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><notations><slur type="start" number="1" placement="above"/></notations></note>
      <note><pitch><step>A</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type><notations><slur type="stop" number="1"/></notations></note>
      <note><pitch><step>G</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
    </measure>
    <measure number="4">
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>8</duration><voice>1</voice><type>whole</type></note>
    </measure>
  </part>
</score-partwise>
`;
    /* eslint-enable max-len */

    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1600px";
        osmd = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(xml);
        osmd.render();
    });

    function measure(n: number): GraphicalMeasure {
        return osmd.GraphicSheet.MeasureList[n - 1][0];
    }
    /** the words label's box in page units: [left, right, top, bottom] */
    function labelBox(m: GraphicalMeasure): number[] {
        const measureLeft: number = m.PositionAndShape.AbsolutePosition.x;
        const measureRight: number = measureLeft + m.PositionAndShape.Size.width;
        const expression: any = m.ParentStaffLine.AbstractExpressions.find((e: any) => e.Label?.Label?.text === "più cresc." &&
            e.Label.PositionAndShape.AbsolutePosition.x >= measureLeft && e.Label.PositionAndShape.AbsolutePosition.x <= measureRight);
        const box: any = expression.Label.PositionAndShape;
        return [box.AbsolutePosition.x + box.BorderLeft, box.AbsolutePosition.x + box.BorderRight,
                box.AbsolutePosition.y + box.BorderTop, box.AbsolutePosition.y + box.BorderBottom];
    }

    it("keeps the words above the breath mark of their note", () => {
        const m2: GraphicalMeasure = measure(2);
        const [left, right, , bottom] = labelBox(m2);
        const gve: VexFlowVoiceEntry = m2.staffEntries[0].graphicalVoiceEntries[0] as VexFlowVoiceEntry;
        const breath: any = (gve.vfStaveNote as any).getModifiers().find((mod: any) => mod.getCategory() === VF.Articulation.CATEGORY);
        const ink: any = breath.drawnInk;
        const inkLeft: number = ink.left / 10;
        const inkRight: number = ink.right / 10;
        const inkTop: number = ink.top / 10;
        const reason: string = `label ${left}..${right} bottom ${bottom}, breath mark ${inkLeft}..${inkRight} top ${inkTop}`;
        expect(right, reason).to.be.greaterThan(inkLeft); // the label reaches over the breath mark (else no test)
        expect(bottom, reason).to.be.at.most(inkTop - 0.1);
    });

    it("keeps the words above the slur rising from the next note", () => {
        const m3: GraphicalMeasure = measure(3);
        const [left, right, , bottom] = labelBox(m3);
        const slur: any = m3.ParentStaffLine.GraphicalSlurs[0];
        let curveTop: number = Infinity;
        for (let i: number = 0; i <= 128; i++) {
            const point: PointF2D = slur.calculateCurvePointAtIndex(i / 128);
            const x: number = point.x + m3.ParentStaffLine.PositionAndShape.AbsolutePosition.x;
            if (x >= left && x <= right) {
                curveTop = Math.min(curveTop, point.y + m3.ParentStaffLine.PositionAndShape.AbsolutePosition.y);
            }
        }
        const reason: string = `label ${left}..${right} bottom ${bottom}, slur top under it ${curveTop}`;
        expect(curveTop, reason).to.be.lessThan(Infinity);
        expect(bottom, reason).to.be.at.most(curveTop - 0.1);
    });
});
