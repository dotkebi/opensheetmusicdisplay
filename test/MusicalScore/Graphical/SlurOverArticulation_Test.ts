import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { GraphicalVoiceEntry } from "../../../src/MusicalScore/Graphical/GraphicalVoiceEntry";
import { TestUtils } from "../../Util/TestUtils";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { PointF2D } from "../../../src/Common/DataObjects/PointF2D";
import { unitInPixels } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";

/**
 * Accents go outside a slur on their side, the slur stays at its notes (LilyPond's avoid-slur 'around'): with two voices
 * on a staff an accent goes on the stem side, where the slur starts at the stem tip (Caccini, Amarilli, piano m11, m25,
 * m42); where one slur ends and the next starts on an accented note, both meet at the note and the accent goes over them
 * (Bellini, Vaga luna, piano m13 and m49); an accent below a note at the start of a slur below goes under the slur
 * (Bononcini, Deh piu a me, piano m1). Taking the slur over the accent instead bent it into a steep stroke from beyond the
 * accent (solo vocal verification 2, 10-08). A staccato stays inside: the slur goes over it. The XML of osmd-dart
 * test/fixtures/test_slur_over_articulation.musicxml. Same as osmd-dart test/slur_over_articulation_test.dart.
 */
describe("Slur over an articulation", () => {
    /* eslint-disable max-len */
    const xml: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>half</type><stem>up</stem><notations><articulations><accent/></articulations><slur type="start" number="1" placement="above"/></notations></note>
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type><stem>up</stem><notations><slur type="stop" number="1"/></notations></note>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type><stem>up</stem></note>
      <backup><duration>8</duration></backup>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>2</voice><type>half</type><stem>down</stem></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>2</voice><type>half</type><stem>down</stem></note>
    </measure>
    <measure number="2">
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>half</type><stem>up</stem><notations><slur type="start" number="1" placement="above"/></notations></note>
      <note><pitch><step>F</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type><stem>up</stem><notations><articulations><accent/></articulations><slur type="stop" number="1"/><slur type="start" number="2" placement="above"/></notations></note>
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type><stem>up</stem><notations><slur type="stop" number="2"/></notations></note>
      <backup><duration>8</duration></backup>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>8</duration><voice>2</voice><type>whole</type><stem>down</stem></note>
    </measure>
    <measure number="3">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type><stem>up</stem><notations><articulations><accent/></articulations><slur type="start" number="1" placement="below"/></notations></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type><stem>up</stem><notations><slur type="stop" number="1"/></notations></note>
      <note><rest/><duration>4</duration><voice>1</voice><type>half</type></note>
    </measure>
    <measure number="4">
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type><stem>down</stem><notations><articulations><staccato/></articulations><slur type="start" number="1" placement="above"/></notations></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type><stem>down</stem><notations><slur type="stop" number="1"/></notations></note>
      <note><rest/><duration>4</duration><voice>1</voice><type>half</type></note>
    </measure>
    <measure number="5">
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

    function slurs(): GraphicalSlur[] {
        return osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0].GraphicalSlurs
            .sort((a, b) => a.bezierStartPt.x - b.bezierStartPt.x);
    }
    function measure(index: number): VexFlowMeasure {
        return osmd.GraphicSheet.MeasureList[index][0] as VexFlowMeasure;
    }
    /** the y of the voice entry's box edge on the slur's side (the stem tip or the notehead) */
    function edge(entry: GraphicalStaffEntry, above: boolean): number {
        const gve: GraphicalVoiceEntry = entry.graphicalVoiceEntries[0];
        return gve.PositionAndShape.RelativePosition.y + (above ? gve.PositionAndShape.BorderTop : gve.PositionAndShape.BorderBottom);
    }
    /** the top (bottom) of the slur's curve over left..right */
    function curveExtreme(slur: GraphicalSlur, left: number, right: number, above: boolean): number {
        let extreme: number = above ? Infinity : -Infinity;
        for (let i: number = 0; i <= 128; i++) {
            const point: PointF2D = slur.calculateCurvePointAtIndex(i / 128);
            if (point.x >= left && point.x <= right) {
                extreme = above ? Math.min(extreme, point.y) : Math.max(extreme, point.y);
            }
        }
        return extreme;
    }

    it("starts a slur at the stem tip and takes the accent over it", () => {
        const slur: GraphicalSlur = slurs()[0];
        const stemTip: number = edge(measure(0).staffEntries[0], true);
        const inks: any[] = measure(0).AccentInk;
        expect(inks.length).to.equal(1);
        const ink: any = inks[0];
        const raisedBottom: number = ink.bottom + ink.accent.slurClearanceYShift / unitInPixels;
        const curveTop: number = curveExtreme(slur, ink.left, ink.right, true);
        const reason: string = `slur start ${slur.bezierStartPt.y}, stem tip ${stemTip}, accent ${ink.top}..${ink.bottom} raised to ` +
            `${raisedBottom}, slur top ${curveTop}`;
        expect(slur.bezierStartPt.y, reason).to.be.greaterThan(ink.top);
        expect(slur.bezierStartPt.y, reason).to.be.at.least(stemTip - 1.0);
        expect(ink.above, reason).to.equal(true);
        // (beyond the slur: raised over it, or already there by SlurStartArticulationYOffsetOfArticulation)
        expect(raisedBottom, reason).to.be.lessThan(curveTop);
    });

    it("meets two slurs on an accented note and takes the accent over both", () => {
        const all: GraphicalSlur[] = slurs();
        expect(all.length).to.equal(5);
        const first: GraphicalSlur = all[1];
        const second: GraphicalSlur = all[2];
        const stemTip: number = edge(measure(1).staffEntries[1], true);
        const ink: any = measure(1).AccentInk[0];
        const raisedBottom: number = ink.bottom + ink.accent.slurClearanceYShift / unitInPixels;
        const curveTop: number = Math.min(curveExtreme(first, ink.left, ink.right, true), curveExtreme(second, ink.left, ink.right, true));
        const reason: string = `first slur end ${first.bezierEndPt.y}, second slur start ${second.bezierStartPt.y}, stem tip ${stemTip}, ` +
            `accent raised to ${raisedBottom}, slurs top ${curveTop}`;
        expect(second.bezierStartPt.y, reason).to.be.closeTo(first.bezierEndPt.y, 0.05);
        expect(first.bezierEndPt.y, reason).to.be.at.least(stemTip - 1.0);
        expect(raisedBottom, reason).to.be.lessThan(curveTop);
    });

    it("takes an accent below a note at the start of a slur below under the slur", () => {
        const slur: GraphicalSlur = slurs()[3];
        const notehead: number = edge(measure(2).staffEntries[0], false);
        const ink: any = measure(2).AccentInk[0];
        const droppedTop: number = ink.top + ink.accent.slurClearanceYShift / unitInPixels;
        const curveBottom: number = curveExtreme(slur, ink.left, ink.right, false);
        const reason: string = `slur start ${slur.bezierStartPt.y}, notehead ${notehead}, accent ${ink.top}..${ink.bottom} dropped to ` +
            `${droppedTop}, slur bottom ${curveBottom}`;
        expect(ink.above, reason).to.equal(false);
        expect(slur.bezierStartPt.y, reason).to.be.lessThan(ink.bottom);
        expect(slur.bezierStartPt.y, reason).to.be.at.most(notehead + 1.0);
        expect(droppedTop, reason).to.be.greaterThan(curveBottom);
    });

    it("takes a slur over a staccato at its start", () => {
        const slur: GraphicalSlur = slurs()[4];
        const top: number = measure(3).staffEntries[0].getSkylineMinBeforeSlurs();
        const reason: string = `slur start ${slur.bezierStartPt.y}, staccato top ${top}`;
        expect(slur.bezierStartPt.y, reason).to.be.at.most(top - 0.2);
    });
});
