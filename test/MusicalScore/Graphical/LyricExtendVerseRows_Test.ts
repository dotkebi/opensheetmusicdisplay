import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { GraphicalLine } from "../../../src/MusicalScore/Graphical/GraphicalLine";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A lyric extend line over a system break continues at its verse's row in the next system: each system's lyric rows start
 * under its own lowest notes, so the row of the first system is not the row of the second (Bellini, Vaga luna, voice m29,
 * solo vocal verification 10-08: verse 2's "pain" line continued at verse 1's height, into its hyphens).
 * The XML of osmd-dart test/fixtures/test_lyric_extend_verse_rows.musicxml. Same as osmd-dart test/lyric_extend_verse_rows_test.dart.
 */
describe("Lyric extend line over a system break and the verse rows", () => {
    /* eslint-disable max-len */
    const xml: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>8</divisions><time><beats>2</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      <note><pitch><step>F</step><octave>3</octave></pitch><duration>8</duration><voice>1</voice><type>quarter</type><lyric number="1"><syllabic>single</syllabic><text>a</text></lyric><lyric number="2"><syllabic>single</syllabic><text>b</text></lyric></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>8</duration><voice>1</voice><type>quarter</type><lyric number="1"><syllabic>single</syllabic><text>c</text></lyric><lyric number="2"><syllabic>single</syllabic><text>d</text></lyric></note>
    </measure>
    <measure number="2">
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>16</duration><voice>1</voice><type>half</type><lyric number="1"><syllabic>begin</syllabic><text>ca</text></lyric><lyric number="2"><syllabic>single</syllabic><text>pain</text><extend type="start"/></lyric></note>
    </measure>
    <measure number="3">
      <print new-system="yes"/>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>8</duration><voice>1</voice><type>quarter</type><lyric number="1"><syllabic>end</syllabic><text>ro,</text></lyric><lyric number="2"><extend type="stop"/></lyric></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>8</duration><voice>1</voice><type>quarter</type><lyric number="1"><syllabic>single</syllabic><text>x</text></lyric><lyric number="2"><syllabic>single</syllabic><text>y</text></lyric></note>
    </measure>
    <measure number="4">
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>16</duration><voice>1</voice><type>half</type><lyric number="1"><syllabic>single</syllabic><text>z</text></lyric><lyric number="2"><syllabic>single</syllabic><text>w</text></lyric></note>
    </measure>
  </part>
</score-partwise>
`;
    /* eslint-enable max-len */

    /** the verse's label y in the staff line (its first syllable there) */
    function verseY(line: StaffLine, verse: string): number {
        for (const measure of line.Measures) {
            for (const entry of measure.staffEntries) {
                for (const lyric of entry.LyricsEntries) {
                    if (lyric.LyricsEntry.VerseNumber === verse) {
                        return lyric.GraphicalLabel.PositionAndShape.RelativePosition.y;
                    }
                }
            }
        }
        throw new Error(`no syllable of verse ${verse}`);
    }

    it("continues the extend line at the verse's row of the next system", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg", newSystemFromXML: true });
        const rules: any = osmd.EngravingRules;
        rules.LastSystemMaxScalingFactor = 1.0;
        await osmd.load(xml);
        osmd.render();
        const lines: StaffLine[] = osmd.GraphicSheet.MusicPages[0].MusicSystems.map(system => system.StaffLines[0]);
        expect(lines.length).to.equal(2);
        // the fixture's first system has lower lyric rows (its F3 with ledger lines)
        const row1: number = verseY(lines[0], "2");
        const row2: number = verseY(lines[1], "2");
        expect(row1 - row2, `verse 2 rows: first system ${row1}, second ${row2}`).to.be.greaterThan(0.5);
        expect(lines[1].LyricLines.length, "the extend line continues on the second system").to.equal(1);
        const continuation: GraphicalLine = lines[1].LyricLines[0];
        const height: number = lines[1].Measures[0].staffEntries[0].LyricsEntries[0].GraphicalLabel.PositionAndShape.Size.height;
        const expected: number = row2 - height / 4;
        expect(continuation.Start.y, `line y ${continuation.Start.y}, verse 2 row ${row2} (first system ${row1}), verse 1 row ${verseY(lines[1], "1")}`)
            .to.be.closeTo(expected, 0.15);
    });
});
