import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { TestUtils } from "../../Util/TestUtils";

/**
 * The side of a rest among two voices when its voice's nearest note is at the other voice's pitch: the voice's stems decide
 * (Gluck, O del mio dolce ardor, left hand m10, solo vocal E10-F13: voice 5's eighth rest between its low note and its note
 * at voice 6's pitch went above as the rest of a "first" voice, into voice 6's beam; the voice's stems are down).
 * The XML of osmd-dart test/fixtures/test_rest_side_stems_tie.musicxml. Same as osmd-dart test/rest_side_stems_tie_test.dart.
 */
describe("Rest side at a pitch tie", () => {
    /* eslint-disable max-len */
    const xml: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>eighth</type><stem>down</stem></note>
      <note><rest/><duration>2</duration><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>F</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>eighth</type><stem>down</stem></note>
      <note><rest/><duration>2</duration><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>eighth</type><stem>down</stem></note>
      <note><rest/><duration>2</duration><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>eighth</type><stem>down</stem></note>
      <note><rest/><duration>2</duration><voice>1</voice><type>eighth</type></note>
      <backup><duration>16</duration></backup>
      <note><rest/><duration>1</duration><voice>2</voice><type>16th</type></note>
      <note><pitch><step>F</step><octave>5</octave></pitch><duration>1</duration><voice>2</voice><type>16th</type><stem>up</stem><beam number="1">begin</beam><beam number="2">begin</beam></note>
      <note><pitch><step>F</step><octave>5</octave></pitch><duration>1</duration><voice>2</voice><type>16th</type><stem>up</stem><beam number="1">continue</beam><beam number="2">continue</beam></note>
      <note><pitch><step>F</step><octave>5</octave></pitch><duration>1</duration><voice>2</voice><type>16th</type><stem>up</stem><beam number="1">end</beam><beam number="2">end</beam></note>
      <note><rest/><duration>1</duration><voice>2</voice><type>16th</type></note>
      <note><pitch><step>F</step><octave>5</octave></pitch><duration>1</duration><voice>2</voice><type>16th</type><stem>up</stem><beam number="1">begin</beam><beam number="2">begin</beam></note>
      <note><pitch><step>F</step><octave>5</octave></pitch><duration>1</duration><voice>2</voice><type>16th</type><stem>up</stem><beam number="1">continue</beam><beam number="2">continue</beam></note>
      <note><pitch><step>F</step><octave>5</octave></pitch><duration>1</duration><voice>2</voice><type>16th</type><stem>up</stem><beam number="1">end</beam><beam number="2">end</beam></note>
      <note><rest/><duration>8</duration><voice>2</voice><type>half</type></note>
    </measure>
    <measure number="2">
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>16</duration><voice>1</voice><type>whole</type></note>
    </measure>
  </part>
</score-partwise>
`;
    /* eslint-enable max-len */

    it("keeps the rest of the voice with down stems below", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1600px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(xml);
        osmd.render();
        const m1: GraphicalMeasure = osmd.GraphicSheet.MeasureList[0][0];
        // the eighth rest of voice 1 on the second eighth (its nearest notes: C4 before, F5 after, F5 at voice 2's pitch)
        const entry: GraphicalStaffEntry = m1.staffEntries.find(e => Math.abs(e.relInMeasureTimestamp.RealValue - 0.125) < 1e-9);
        const rest: VexFlowVoiceEntry = entry.graphicalVoiceEntries.find(gve => gve.parentVoiceEntry.ParentVoice.VoiceId === 1) as VexFlowVoiceEntry;
        expect(rest.notes[0].sourceNote.isRest()).to.equal(true);
        const vfRest: any = rest.vfStaveNote;
        const line: number = vfRest.getKeyProps()[0].line;
        // on or below the middle line, not above the staff in voice 2's beam
        //   (the web positions the rest by its side without a stem direction of its own, see restSideForVexFlow)
        expect(line, `rest line ${line}`).to.be.at.most(3.0);
    });
});
