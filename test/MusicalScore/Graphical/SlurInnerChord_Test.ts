import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { GraphicalNote } from "../../../src/MusicalScore/Graphical/GraphicalNote";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A slur from an inner note of a chord whose outer note on that side has its own slur (or tie) to the next chord goes
 * between the chords, from notehead to notehead, inside the outer curve: m1 slurs above from Bb4 and Db5 (Bononcini, Deh
 * piu a me, piano m12, m19), a slur below from Bb4 under the tie of Eb4 (m2); m2 slurs below from Eb4 and Ab4 and above
 * from C5 (m8). Both slurs had the end points of the chord's outer note, one lying on the other (solo vocal verification
 * 2, X5). A slur from an inner note without such an outer curve keeps its place outside the chord, as does a slur over the
 * chord written on its bottom note: m3 over a tie of the middle note (Pergolesi/Ciampi, Nina, piano m12), m4 over a tie of
 * the top note (Torelli, Tu lo sai, piano m36). The XML of osmd-dart
 * test/fixtures/test_slur_inner_chord.musicxml. Same as osmd-dart test/slur_inner_chord_test.dart.
 */
describe("Slurs inside a chord", () => {
    /* eslint-disable max-len */
    const xml: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions><key><fifths>-4</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      <note><pitch><step>E</step><alter>-1</alter><octave>4</octave></pitch><duration>1</duration><tie type="start"/><voice>1</voice><type>eighth</type><stem>up</stem><beam number="1">begin</beam><notations><tied type="start"/></notations></note>
      <note><chord/><pitch><step>B</step><alter>-1</alter><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><stem>up</stem><notations><slur type="start" number="4" placement="above"/></notations></note>
      <note><chord/><pitch><step>D</step><alter>-1</alter><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><stem>up</stem><notations><slur type="start" number="3" placement="above"/></notations></note>
      <note><pitch><step>E</step><alter>-1</alter><octave>4</octave></pitch><duration>1</duration><tie type="stop"/><voice>1</voice><type>eighth</type><stem>up</stem><beam number="1">end</beam><notations><tied type="stop"/></notations></note>
      <note><chord/><pitch><step>A</step><alter>-1</alter><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><stem>up</stem><notations><slur type="stop" number="4"/></notations></note>
      <note><chord/><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><stem>up</stem><notations><slur type="stop" number="3"/></notations></note>
      <note><rest/><duration>2</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>E</step><alter>-1</alter><octave>4</octave></pitch><duration>1</duration><tie type="start"/><voice>1</voice><type>eighth</type><stem>up</stem><beam number="1">begin</beam><notations><tied type="start"/></notations></note>
      <note><chord/><pitch><step>B</step><alter>-1</alter><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><stem>up</stem><notations><slur type="start" number="4" placement="below"/></notations></note>
      <note><chord/><pitch><step>D</step><alter>-1</alter><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><stem>up</stem><notations><slur type="start" number="3" placement="above"/></notations></note>
      <note><pitch><step>E</step><alter>-1</alter><octave>4</octave></pitch><duration>1</duration><tie type="stop"/><voice>1</voice><type>eighth</type><stem>up</stem><beam number="1">end</beam><notations><tied type="stop"/></notations></note>
      <note><chord/><pitch><step>A</step><alter>-1</alter><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><stem>up</stem><notations><slur type="stop" number="4"/></notations></note>
      <note><chord/><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><stem>up</stem><notations><slur type="stop" number="3"/></notations></note>
      <note><rest/><duration>2</duration><voice>1</voice><type>quarter</type></note>
    </measure>
    <measure number="2">
      <note><pitch><step>E</step><alter>-1</alter><octave>4</octave></pitch><duration>3</duration><voice>1</voice><type>quarter</type><dot/><stem>up</stem><notations><slur type="start" number="1" placement="below"/></notations></note>
      <note><chord/><pitch><step>A</step><alter>-1</alter><octave>4</octave></pitch><duration>3</duration><voice>1</voice><type>quarter</type><dot/><stem>up</stem><notations><slur type="start" number="3" placement="below"/></notations></note>
      <note><chord/><pitch><step>C</step><octave>5</octave></pitch><duration>3</duration><voice>1</voice><type>quarter</type><dot/><stem>up</stem><notations><slur type="start" number="4" placement="above"/></notations></note>
      <note><pitch><step>D</step><alter>-1</alter><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><stem>up</stem><notations><slur type="stop" number="1"/></notations></note>
      <note><chord/><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><stem>up</stem><notations><slur type="stop" number="3"/></notations></note>
      <note><chord/><pitch><step>B</step><alter>-1</alter><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><stem>up</stem><notations><slur type="stop" number="4"/></notations></note>
      <note><pitch><step>E</step><alter>-1</alter><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type><stem>up</stem><notations><slur type="start" number="1" placement="above"/></notations></note>
      <note><chord/><pitch><step>B</step><alter>-1</alter><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type><stem>up</stem></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type><stem>up</stem><notations><slur type="stop" number="1"/></notations></note>
      <note><chord/><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type><stem>up</stem></note>
    </measure>
    <measure number="3">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><tie type="start"/><voice>1</voice><type>half</type><notations><tied type="start"/><slur type="start" number="1" placement="above"/></notations></note>
      <note><chord/><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><tie type="start"/><voice>1</voice><type>half</type><notations><tied type="start"/></notations></note>
      <note><chord/><pitch><step>B</step><alter>-1</alter><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><tie type="stop"/><voice>1</voice><type>quarter</type><notations><tied type="stop"/><slur type="stop" number="1"/></notations></note>
      <note><chord/><pitch><step>F</step><octave>4</octave></pitch><duration>2</duration><tie type="stop"/><voice>1</voice><type>quarter</type><notations><tied type="stop"/></notations></note>
      <note><chord/><pitch><step>A</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
      <note><rest/><duration>2</duration><voice>1</voice><type>quarter</type></note>
    </measure>
    <measure number="4">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type><notations><slur type="start" number="1" placement="above"/></notations></note>
      <note><chord/><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
      <note><chord/><pitch><step>B</step><alter>-1</alter><octave>4</octave></pitch><duration>4</duration><tie type="start"/><voice>1</voice><type>half</type><notations><tied type="start" orientation="over"/></notations></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type><notations><slur type="stop" number="1"/></notations></note>
      <note><chord/><pitch><step>F</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
      <note><chord/><pitch><step>B</step><alter>-1</alter><octave>4</octave></pitch><duration>2</duration><tie type="stop"/><voice>1</voice><type>quarter</type><notations><tied type="stop"/></notations></note>
      <note><rest/><duration>2</duration><voice>1</voice><type>quarter</type></note>
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

    /** The first slur of the measure from its start note's pitch (e.g. "Bb4") on that side. */
    function slur(measureIndex: number, startNote: string, placement: PlacementEnum): GraphicalSlur {
        const entries: GraphicalStaffEntry[] = osmd.GraphicSheet.MeasureList[measureIndex][0].staffEntries;
        const found: GraphicalSlur[] = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0].GraphicalSlurs.filter(s =>
            s.placement === placement && name(s.slur.StartNote.Pitch) === startNote && entries.indexOf(s.staffEntries[0]) >= 0)
            .sort((a, b) => a.bezierStartPt.x - b.bezierStartPt.x);
        return found[0];
    }
    function name(pitch: any): string {
        return pitch.ToStringShort(3); // OSMD's octave 1 is the one from middle C
    }
    /** The notes of the fixture's chords, by their staff position (in units below the top line, treble clef): the chords
     *  are written out here, as the notes of a chord get their own y only at the end of drawing. */
    const y: { [pitch: string]: number } = { Db4: 4.5, Eb4: 4.0, G4: 3.0, Ab4: 2.5, Bb4: 2.0, C5: 1.5, Db5: 1.0 };
    /** The x of the chord's noteheads, relative to the staffline: left and right of a 1.2 wide black notehead. */
    function headX(entry: GraphicalStaffEntry): { left: number, right: number } {
        const note: GraphicalNote = entry.graphicalVoiceEntries[0].notes[0];
        const left: number = note.PositionAndShape.RelativePosition.x + entry.PositionAndShape.RelativePosition.x +
            entry.parentMeasure.PositionAndShape.RelativePosition.x;
        return { left, right: left + 1.2 };
    }
    function describeSlur(s: GraphicalSlur): string {
        return `(${s.bezierStartPt.x.toFixed(2)}, ${s.bezierStartPt.y.toFixed(2)})..(${s.bezierEndPt.x.toFixed(2)}, ${s.bezierEndPt.y.toFixed(2)})`;
    }

    it("goes between the chords inside the outer slur above (m12, m19)", () => {
        const inner: GraphicalSlur = slur(0, "Bb4", PlacementEnum.Above);
        const outer: GraphicalSlur = slur(0, "Db5", PlacementEnum.Above);
        const start: GraphicalStaffEntry = inner.staffEntries[0];
        const end: GraphicalStaffEntry = inner.staffEntries[1];
        const reason: string = `inner ${describeSlur(inner)}, outer ${describeSlur(outer)}, ` +
            `heads ${headX(start).right.toFixed(2)}..${headX(end).left.toFixed(2)}`;
        // the inner slur: from the start chord's noteheads to the end chord's, beside its own notes
        expect(inner.bezierStartPt.x, reason).to.be.greaterThan(headX(start).right);
        expect(inner.bezierEndPt.x, reason).to.be.lessThan(headX(end).left);
        // below the top notes Db5 and C5
        expect(inner.bezierStartPt.y, reason).to.be.greaterThan(y.Db5);
        expect(inner.bezierEndPt.y, reason).to.be.greaterThan(y.C5);
        // the outer slur stays over the chord (over the stems, beamed up), well apart from the inner one
        expect(outer.bezierStartPt.y, reason).to.be.lessThan(y.Db5 - 1);
        expect(inner.bezierStartPt.y - outer.bezierStartPt.y, reason).to.be.greaterThan(2);
    });

    it("goes between the chords inside the tie of the outer note below (m2)", () => {
        const inner: GraphicalSlur = slur(0, "Bb4", PlacementEnum.Below);
        const start: GraphicalStaffEntry = inner.staffEntries[0];
        const reason: string = `inner ${describeSlur(inner)}`;
        expect(inner.bezierStartPt.x, reason).to.be.greaterThan(headX(start).right);
        // above the bottom note Eb4 and its tie
        expect(inner.bezierStartPt.y, reason).to.be.lessThan(y.Eb4);
        expect(inner.bezierEndPt.y, reason).to.be.lessThan(y.Eb4);
    });

    it("keeps the inner slur below inside the outer one of three slurs (m8)", () => {
        const inner: GraphicalSlur = slur(1, "Ab4", PlacementEnum.Below);
        const outer: GraphicalSlur = slur(1, "Eb4", PlacementEnum.Below);
        const start: GraphicalStaffEntry = inner.staffEntries[0];
        const reason: string = `inner ${describeSlur(inner)}, outer ${describeSlur(outer)}`;
        // above the bottom notes Eb4 and Db4, the outer slur under them
        expect(inner.bezierStartPt.y, reason).to.be.lessThan(y.Eb4);
        expect(inner.bezierEndPt.y, reason).to.be.lessThan(y.Db4);
        expect(outer.bezierStartPt.y, reason).to.be.greaterThan(y.Eb4);
        // after the dots of the dotted chord
        expect(inner.bezierStartPt.x, reason).to.be.greaterThan(headX(start).right + 0.5);
    });

    it("keeps a slur from an inner note without an outer curve outside the chord", () => {
        const single: GraphicalSlur = slur(1, "Eb4", PlacementEnum.Above);
        // over the top note Bb4 of the chord
        expect(single.bezierStartPt.y, `slur ${describeSlur(single)}`).to.be.lessThan(y.Bb4);
    });

    it("keeps a slur over the chord written on its bottom note over the chord (m3)", () => {
        const over: GraphicalSlur = slur(2, "C4", PlacementEnum.Above);
        // over the top note Bb4 of the chord
        expect(over.bezierStartPt.y, `slur ${describeSlur(over)}`).to.be.lessThan(y.Bb4);
    });

    it("keeps a slur over the chord written on its bottom note over the chord with a tie of its top note (m4)", () => {
        const over: GraphicalSlur = slur(3, "C4", PlacementEnum.Above);
        // over the top note Bb4 of the chord
        expect(over.bezierStartPt.y, `slur ${describeSlur(over)}`).to.be.lessThan(y.Bb4);
    });
});
