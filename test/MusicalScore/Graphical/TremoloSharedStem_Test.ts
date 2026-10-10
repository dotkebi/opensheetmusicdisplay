import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { TestUtils } from "../../Util/TestUtils";
import Vex from "vexflow";
import VF = Vex.Flow;

/**
 * The two notes of a tremolo between notes share the stem direction a beam over them would give, unless the XML gives one
 * (Parisotti, Paisiello Chi vuol la zingarella Piano m74–75; the XML of osmd-dart test/fixtures/test_tremolo_shared_stem.musicxml):
 * the chord below the middle line had its stem up, the F3 above it down, and the strokes went between the noteheads; the print has
 * both stems up and the strokes between them. Same as osmd-dart test/tremolo_shared_stem_test.dart.
 */
describe("Tremolo between notes: shared stem direction", () => {
    const xml: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions><key><fifths>-1</fifths></key><time><beats>2</beats><beat-type>4</beat-type></time>
        <clef><sign>F</sign><line>4</line></clef></attributes>
      <note><pitch><step>F</step><octave>2</octave></pitch><duration>2</duration><voice>1</voice><type>half</type>
        <time-modification><actual-notes>2</actual-notes><normal-notes>1</normal-notes><normal-type>half</normal-type></time-modification>
        <notations><ornaments><tremolo type="start">2</tremolo></ornaments></notations></note>
      <note><chord/><pitch><step>A</step><octave>2</octave></pitch><duration>2</duration><voice>1</voice><type>half</type>
        <time-modification><actual-notes>2</actual-notes><normal-notes>1</normal-notes><normal-type>half</normal-type></time-modification></note>
      <note><chord/><pitch><step>C</step><octave>3</octave></pitch><duration>2</duration><voice>1</voice><type>half</type>
        <time-modification><actual-notes>2</actual-notes><normal-notes>1</normal-notes><normal-type>half</normal-type></time-modification></note>
      <note><pitch><step>F</step><octave>3</octave></pitch><duration>2</duration><voice>1</voice><type>half</type>
        <time-modification><actual-notes>2</actual-notes><normal-notes>1</normal-notes><normal-type>half</normal-type></time-modification>
        <notations><ornaments><tremolo type="stop">2</tremolo></ornaments></notations></note>
    </measure>
    <measure number="2">
      <note><pitch><step>F</step><octave>2</octave></pitch><duration>2</duration><voice>1</voice><type>half</type>
        <time-modification><actual-notes>2</actual-notes><normal-notes>1</normal-notes><normal-type>half</normal-type></time-modification>
        <stem>up</stem><notations><ornaments><tremolo type="start">2</tremolo></ornaments></notations></note>
      <note><pitch><step>F</step><octave>3</octave></pitch><duration>2</duration><voice>1</voice><type>half</type>
        <time-modification><actual-notes>2</actual-notes><normal-notes>1</normal-notes><normal-type>half</normal-type></time-modification>
        <stem>down</stem><notations><ornaments><tremolo type="stop">2</tremolo></ornaments></notations></note>
    </measure>
  </part>
</score-partwise>`;
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        container.style.width = "1000px";
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(xml);
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    function stemDirections(measureNumber: number): number[] {
        const measure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[measureNumber - 1][0];
        const directions: number[] = [];
        for (const entry of measure.staffEntries) {
            for (const gve of entry.graphicalVoiceEntries) {
                const note: VF.StemmableNote = (gve as VexFlowVoiceEntry).vfStaveNote;
                if (note) {
                    directions.push(note.getStemDirection());
                }
            }
        }
        return directions;
    }

    it("the tremolo notes share the stem direction of a beam over them", () => {
        expect(stemDirections(1)).to.deep.equal([VF.Stem.UP, VF.Stem.UP]);
    });

    it("written stem directions are kept", () => {
        expect(stemDirections(2)).to.deep.equal([VF.Stem.UP, VF.Stem.DOWN]);
    });
});
