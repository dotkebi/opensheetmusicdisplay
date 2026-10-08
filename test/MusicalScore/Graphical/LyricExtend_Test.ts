import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalLine } from "../../../src/MusicalScore/Graphical/GraphicalLine";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Lyric extend lines ("miei____"). Measure 1 is the O cessate di piagarmi Canto m17 case: the syllable's
 * quarter note is tied to a sixteenth (extend stop) and the next syllable follows at once, so the
 * tied note sits under the syllable itself. Measure 2 is an ordinary melisma over a note without lyrics.
 */
describe("Lyric extend lines", () => {
    const score: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Canto</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <time><beats>3</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><tie type="start"/><type>quarter</type>
        <notations><tied type="start"/></notations>
        <lyric number="1"><syllabic>single</syllabic><text>miei</text><extend type="start"/></lyric>
      </note>
      <note>
        <pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><tie type="stop"/><type>16th</type>
        <notations><tied type="stop"/></notations>
        <lyric number="1"><extend type="stop"/></lyric>
      </note>
      <note>
        <pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><type>16th</type>
        <lyric number="1"><syllabic>begin</syllabic><text>mar</text></lyric>
      </note>
      <note>
        <pitch><step>G</step><octave>4</octave></pitch><duration>6</duration><type>quarter</type><dot/>
        <lyric number="1"><syllabic>end</syllabic><text>tir.</text></lyric>
      </note>
    </measure>
    <measure number="2">
      <note>
        <pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type>
        <lyric number="1"><syllabic>single</syllabic><text>la</text><extend type="start"/></lyric>
      </note>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note>
        <pitch><step>E</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type>
        <lyric number="1"><syllabic>single</syllabic><text>sol</text></lyric>
      </note>
    </measure>
  </part>
</score-partwise>`;

    let osmd: OpenSheetMusicDisplay;
    let staffLine: StaffLine;

    before(async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1200px";
        osmd = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        // like the product viewport: no lyric overlap into the next measure, so the measure is as compact as the syllables allow
        osmd.EngravingRules.LyricOverlapAllowedIntoNextMeasure = 0;
        await osmd.load(score);
        osmd.render();
        staffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
        expect(staffLine.Measures.length, "both measures on one staff line").to.equal(2);
    });

    /** Left edge (incl. margin) of the syllable's label, relative to the staff line, minus the lyric distance. */
    function nextSyllableLimit(measure: GraphicalMeasure, entry: GraphicalStaffEntry): number {
        const box: { RelativePosition: { x: number }, BorderMarginLeft: number } = entry.LyricsEntries[0].GraphicalLabel.PositionAndShape;
        return measure.PositionAndShape.RelativePosition.x + entry.PositionAndShape.RelativePosition.x +
            box.RelativePosition.x + box.BorderMarginLeft - osmd.EngravingRules.LyricExtendEndGap;
    }

    function staffEntryOfSyllable(measure: GraphicalMeasure, text: string): GraphicalStaffEntry {
        return measure.staffEntries.find((entry) => entry.LyricsEntries.some((lyric) => lyric.LyricsEntry.Text === text));
    }

    /** Right edge (incl. margin) of the syllable's label, relative to the staff line. */
    function labelRight(entry: GraphicalStaffEntry): number {
        const box: { RelativePosition: { x: number }, BorderMarginRight: number } = entry.LyricsEntries[0].GraphicalLabel.PositionAndShape;
        return entry.parentMeasure.PositionAndShape.RelativePosition.x + entry.PositionAndShape.RelativePosition.x +
            box.RelativePosition.x + box.BorderMarginRight;
    }

    /** The extend line that starts right after the syllable's label (lines stay relative to the staff line after drawing,
     *  see MusicSheetDrawer.drawLyricLines()). */
    function lineAfter(entry: GraphicalStaffEntry): GraphicalLine {
        const right: number = labelRight(entry);
        const line: GraphicalLine = staffLine.LyricLines.find((candidate) => Math.abs(candidate.Start.x - right) < 0.01);
        expect(line, `extend line after "${entry.LyricsEntries[0].LyricsEntry.Text}"`).to.not.equal(undefined);
        return line;
    }

    it("reaches toward the next syllable when the tied stop note leaves no room", () => {
        const measure: GraphicalMeasure = staffLine.Measures[0];
        const mar: GraphicalStaffEntry = staffEntryOfSyllable(measure, "mar");
        const minimumLength: number = osmd.EngravingRules.LyricExtendMinimumLength;
        expect(minimumLength).to.be.greaterThan(1);
        const limit: number = nextSyllableLimit(measure, mar);
        // the rule is applied with the start and end calculateLyricExtend computed (staff line relative, before drawing)
        const extend: (startX: number, endX: number, next: GraphicalStaffEntry, line: StaffLine) => number =
            (osmd.GraphicSheet.GetCalculator as any).extendLyricLineToMinimumLength.bind(osmd.GraphicSheet.GetCalculator);
        // long enough: the end at the last melisma note stays
        expect(extend(limit - 10, limit - 10 + minimumLength + 1, mar, staffLine)).to.equal(limit - 10 + minimumLength + 1);
        // too short, next syllable far away: the line gets the minimum length
        expect(extend(limit - 10, limit - 9.9, mar, staffLine)).to.be.closeTo(limit - 10 + minimumLength, 1e-9);
        // too short, next syllable near (the O cessate m17 case): the line stops right before its label
        expect(extend(limit - 0.6, limit - 0.5, mar, staffLine)).to.be.closeTo(limit, 1e-9);
        // no next syllable on this staff line: bounded by the staff line width only
        const width: number = staffLine.PositionAndShape.Size.width;
        expect(extend(width - 0.5, width - 0.4, undefined, staffLine)).to.be.closeTo(width, 1e-9);
        // no room at all: the end stays left of the start, so calculateLyricExtend draws nothing instead of a dot
        expect(extend(limit + 0.5, limit + 0.6, mar, staffLine)).to.be.at.most(limit + 0.6);
    });

    it("draws the m17 line past the tied note and before the next syllable", () => {
        const measure: GraphicalMeasure = staffLine.Measures[0];
        const miei: GraphicalStaffEntry = staffEntryOfSyllable(measure, "miei");
        const tiedNote: GraphicalStaffEntry = measure.staffEntries[1];
        const mar: GraphicalStaffEntry = staffEntryOfSyllable(measure, "mar");
        expect(tiedNote.LyricsEntries.length, "the tied note carries no syllable").to.equal(0);
        const line: GraphicalLine = lineAfter(miei);
        const minimumLength: number = osmd.EngravingRules.LyricExtendMinimumLength;
        const tiedNoteRight: number = measure.PositionAndShape.RelativePosition.x +
            tiedNote.PositionAndShape.RelativePosition.x + tiedNote.PositionAndShape.BorderMarginRight;
        const limit: number = nextSyllableLimit(measure, mar);
        // the line goes past the tied note, unless the next syllable's label (less LyricExtendEndGap) is in the way
        expect(line.End.x, "line reaches at least the tied note's right border, or the room before the next syllable")
            .to.be.at.least(Math.min(tiedNoteRight, limit) - 0.01);
        expect(line.End.x, "line ends before the next syllable").to.be.at.most(limit + 0.01);
        expect(line.End.x - line.Start.x, "line is at least the minimum length, or as long as the room allows")
            .to.be.at.least(Math.min(minimumLength, limit - line.Start.x) - 0.01);
        expect(line.End.x - line.Start.x, "line is readable").to.be.at.least(1.0);
    });

    it("ends an ordinary melisma line at the last note it spans", () => {
        const measure: GraphicalMeasure = staffLine.Measures[1];
        const la: GraphicalStaffEntry = staffEntryOfSyllable(measure, "la");
        const melismaNote: GraphicalStaffEntry = measure.staffEntries[1];
        expect(melismaNote.LyricsEntries.length).to.equal(0);
        const line: GraphicalLine = lineAfter(la);
        const noteRight: number = measure.PositionAndShape.RelativePosition.x +
            melismaNote.PositionAndShape.RelativePosition.x + melismaNote.PositionAndShape.BorderMarginRight;
        expect(line.End.x).to.be.closeTo(noteRight, 0.01);
        expect(line.End.x - line.Start.x).to.be.at.least(osmd.EngravingRules.LyricExtendMinimumLength);
    });
});
