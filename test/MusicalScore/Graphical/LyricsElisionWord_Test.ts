import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { LyricsEntry } from "../../../src/MusicalScore/VoiceData/Lyrics/LyricsEntry";
import { TestUtils } from "../../Util/TestUtils";

/**
 * An elision joins syllables of two words on one note (Parisotti, Selve amiche m5 "Sel-ve a-mi-che":
 * <syllabic>end</syllabic><text>ve</text><elision> </elision><syllabic>begin</syllabic><text>a</text>).
 * The reader took the first <syllabic> only, so no word was open for "mi" and "che," and the hyphens
 * mi-che (Selve amiche), af-flit (Ogni pena m29), co-la (Zingarella m13) were missing.
 */
describe("Lyrics elision beginning a word", () => {
    const note: (step: string, lyricXml: string) => string = (step: string, lyricXml: string): string =>
        `<note><pitch><step>${step}</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type>${lyricXml}</note>`;
    const lyric: (syllabic: string, text: string) => string = (syllabic: string, text: string): string =>
        `<lyric number="1"><syllabic>${syllabic}</syllabic><text>${text}</text></lyric>`;
    const elided: (first: string, firstText: string, second: string, secondText: string) => string =
        (first: string, firstText: string, second: string, secondText: string): string =>
            `<lyric number="1"><syllabic>${first}</syllabic><text>${firstText}</text>` +
            `<elision> </elision><syllabic>${second}</syllabic><text>${secondText}</text></lyric>`;
    function score(notes: string): string {
        return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Canto</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef></attributes>
      ${notes}
    </measure>
  </part>
</score-partwise>`;
    }
    // Sel - ve a - mi - che,
    const selveAmiche: string = score(note("A", lyric("begin", "Sel")) + note("B", elided("end", "ve", "begin", "a")) +
        note("C", lyric("middle", "mi")) + note("A", lyric("end", "che,")));

    async function render(xml: string): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(xml);
        osmd.render();
        return osmd;
    }
    function entry(osmd: OpenSheetMusicDisplay, text: string): LyricsEntry {
        for (const container of osmd.Sheet.SourceMeasures[0].VerticalSourceStaffEntryContainers) {
            for (const staffEntry of container.StaffEntries) {
                const lyricsEntry: LyricsEntry = staffEntry?.VoiceEntries[0]?.LyricsEntries.getValue("1");
                if (lyricsEntry?.Text.trim() === text) {
                    return lyricsEntry;
                }
            }
        }
        throw new Error("no lyric " + text);
    }

    it("begins the next word with the second syllable of an elision", async () => {
        const osmd: OpenSheetMusicDisplay = await render(selveAmiche);
        const vea: LyricsEntry = entry(osmd, "ve a");
        const mi: LyricsEntry = entry(osmd, "mi");
        const che: LyricsEntry = entry(osmd, "che,");
        expect(vea.Word.Syllables.map((e) => e.Text.trim())).to.deep.equal(["Sel", "ve a"]);
        expect(vea.NextWord).to.not.equal(undefined);
        expect(vea.NextWord).to.equal(mi.Word);
        expect(mi.Word).to.equal(che.Word);
        expect(mi.Word.Syllables.map((e) => e.Text.trim())).to.deep.equal(["ve a", "mi", "che,"]);
    });

    it("draws the hyphens of both words", async () => {
        const osmd: OpenSheetMusicDisplay = await render(selveAmiche);
        const staffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
        expect(staffLine.LyricsDashes.length, "Sel-ve, a-mi, mi-che").to.equal(3);
    });

    it("opens no word for an elision whose second syllable is a whole word", async () => {
        // sa è (Nel cor m21): end + single
        const xml: string = score(note("A", lyric("begin", "sen")) + note("B", elided("end", "sa", "single", "è")) +
            note("C", lyric("single", "ahi")));
        const osmd: OpenSheetMusicDisplay = await render(xml);
        expect(entry(osmd, "sa è").NextWord).to.equal(undefined);
        expect(osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0].LyricsDashes.length, "sen-sa").to.equal(1);
    });
});
