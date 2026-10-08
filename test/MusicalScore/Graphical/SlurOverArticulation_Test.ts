import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { GraphicalVoiceEntry } from "../../../src/MusicalScore/Graphical/GraphicalVoiceEntry";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A slur starting or ending at a note with an articulation on its side goes over the articulation: with two voices on a
 * staff an accent goes on the stem side (ArticulationVoicesOutside), where the slur started at the stem tip and ran
 * through it (Caccini, Amarilli, piano m11, m25, m42, solo vocal verification 10-08); where one slur ends and the next
 * starts on an accented note, both meet above the accent (Bellini, Vaga luna, piano m13 and m49). The XML of osmd-dart
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
    /** the top of what is drawn at the entry before the slurs (its accent) */
    function inkTop(entry: GraphicalStaffEntry): number {
        return entry.getSkylineMinBeforeSlurs();
    }

    it("starts a slur over the accent on its side", () => {
        const slur: GraphicalSlur = slurs()[0];
        const entry: GraphicalStaffEntry = osmd.GraphicSheet.MeasureList[0][0].staffEntries[0];
        const gve: GraphicalVoiceEntry = entry.graphicalVoiceEntries[0];
        const stemTip: number = gve.PositionAndShape.RelativePosition.y + gve.PositionAndShape.BorderTop;
        const top: number = inkTop(entry);
        const reason: string = `slur start ${slur.bezierStartPt.y}, accent top ${top}, stem tip ${stemTip}`;
        // the accent is above the stem tip (the fixture's two voices)
        expect(top, reason).to.be.lessThan(stemTip - 0.5);
        expect(slur.bezierStartPt.y, reason).to.be.at.most(top - 0.2);
    });

    it("meets two slurs on an accented note over the accent", () => {
        const all: GraphicalSlur[] = slurs();
        expect(all.length).to.equal(3);
        const first: GraphicalSlur = all[1];
        const second: GraphicalSlur = all[2];
        const entry: GraphicalStaffEntry = osmd.GraphicSheet.MeasureList[1][0].staffEntries[1];
        const top: number = inkTop(entry);
        const reason: string = `first slur end ${first.bezierEndPt.y}, second slur start ${second.bezierStartPt.y}, accent top ${top}`;
        expect(first.bezierEndPt.y, reason).to.be.at.most(top - 0.2);
        expect(second.bezierStartPt.y, reason).to.be.at.most(top - 0.2);
        expect(second.bezierStartPt.y, reason).to.be.closeTo(first.bezierEndPt.y, 0.05);
    });
});
