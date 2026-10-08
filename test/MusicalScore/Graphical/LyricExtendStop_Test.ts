import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { GraphicalLyricEntry } from "../../../src/MusicalScore/Graphical/GraphicalLyricEntry";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { LyricsEntry } from "../../../src/MusicalScore/VoiceData/Lyrics/LyricsEntry";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Lyric extend lines end on the note that carries the <extend type="stop"/> (Bellini review B06-F11, B13-F04), and the
 * second syllable of an elision written with the undertie U+203F begins a word (B15-F02):
 * - the stop is read from the text-less <lyric> of its note (VoiceEntry.ExtendOnlyLyricVerses, every note): the line ends
 *   at that note's right border, not at the note before the next syllable — after the stop can come a grace group and a
 *   rest without lyrics (Torna vezzosa Fillide m91 "sta." stops on the G4, "Il" follows the grace group and a rest);
 * - a line cut before the next syllable keeps EngravingRules.LyricExtendEndGap to its label, not
 *   HorizontalBetweenLyricsDistance (Almen se non poss'io m27 "voi ___ non": the stop note's flag reaches under "non");
 * - inputs without continue/stop nodes end the line at the note before the next syllable, as before.
 * Same as osmd-dart test/lyric_extend_stop_test.dart.
 */
describe("Lyric extend stop note", () => {
    function lyricXml(lyric?: string, extend?: string, syllabic: string = "single"): string {
        if (lyric === undefined && extend === undefined) {
            return "";
        }
        return "<lyric number=\"1\">" +
            (lyric === undefined ? "" : `<syllabic>${syllabic}</syllabic><text>${lyric}</text>`) +
            (extend === undefined ? "" : `<extend type="${extend}"/>`) + "</lyric>";
    }
    function note(step: string, octave: number, duration: number, type: string, lyric?: string, extend?: string,
                  syllabic?: string): string {
        return `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${duration}</duration>` +
            `<voice>1</voice><type>${type}</type>${lyricXml(lyric, extend, syllabic)}</note>`;
    }
    function rest(duration: number, type: string): string {
        return `<note><rest/><duration>${duration}</duration><voice>1</voice><type>${type}</type></note>`;
    }
    function grace(step: string, octave: number, type: string, extend?: string): string {
        return `<note><grace slash="yes"/><pitch><step>${step}</step><octave>${octave}</octave></pitch>` +
            `<voice>1</voice><type>${type}</type>${lyricXml(undefined, extend)}</note>`;
    }
    function score(measures: string[], beats: string, beatType: string): string {
        const body: string = measures.map((measure, i) => `<measure number="${i + 1}">` +
            (i === 0 ? `<attributes><divisions>8</divisions><time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time>` +
                "<clef><sign>G</sign><line>2</line></clef></attributes>" : "") + `${measure}</measure>`).join("");
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\">" +
            `<part-list><score-part id="P1"><part-name>Canto</part-name></score-part></part-list><part id="P1">${body}</part></score-partwise>`;
    }

    /** Torna m91: "sta." (quarter) continues over an eighth and stops on a quarter; a slashed grace group and an eighth rest
     *  without lyrics follow, then "Il" */
    const stopBeforeGraceGroupAndRest: string = score([
        note("D", 5, 8, "quarter", "sta.", "start") + note("B", 4, 4, "eighth", undefined, "continue") +
        note("G", 4, 8, "quarter", undefined, "stop") + grace("E", 4, "eighth") + grace("F", 4, "eighth") + grace("G", 4, "eighth") +
        rest(4, "eighth") + note("B", 4, 4, "eighth", "Il") + note("C", 5, 4, "eighth", "ca", undefined, "begin"),
    ], "4", "4");
    /** Almen m27 (3/8): "voi" (eighth), the extend continues over a slashed grace group and stops on the sixteenth after it,
     *  "non" is on the very next sixteenth: the stop note's flag reaches under "non" */
    const stopRightBeforeNextSyllable: string = score([
        note("G", 4, 4, "eighth", "voi", "start") + grace("G", 4, "32nd", "continue") + grace("A", 4, "32nd", "continue") +
        grace("B", 4, "32nd", "continue") + grace("C", 5, "32nd", "continue") + note("A", 5, 2, "16th", undefined, "stop") +
        note("B", 4, 2, "16th", "non") + note("C", 5, 4, "eighth", "è"),
    ], "3", "8");
    /** an old input: the melisma's notes have no lyric nodes at all */
    const noStopNodes: string = score([
        note("D", 5, 8, "quarter", "sta.", "start") + note("B", 4, 8, "quarter") + note("G", 4, 8, "quarter") + note("B", 4, 8, "quarter", "Il"),
    ], "4", "4");
    /** Ma rendi pur contento m12-13: "Gli‿af-fan-ni" — the elision is the undertie U+203F, the second syllable begins the word */
    const undertieElision: string = score([
        note("F", 4, 8, "quarter", "è.") + rest(8, "quarter") + rest(8, "quarter") +
        "<note><pitch><step>C</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice><type>quarter</type>" +
        "<lyric number=\"1\"><syllabic>single</syllabic><text>Gli</text><elision>‿</elision><syllabic>begin</syllabic><text>af</text></lyric></note>",
        note("G", 4, 16, "half", "fan", undefined, "middle") + note("G", 4, 8, "quarter", "ni", undefined, "end") +
        note("A", 4, 8, "quarter", "su", undefined, "begin"),
    ], "4", "4");

    async function render(xml: string): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        const rules: any = osmd.EngravingRules;
        // keep the (only) system at its minimum width, as in a full system
        rules.LastSystemMaxScalingFactor = 1.0;
        // 02front / 03app density rules
        rules.VoiceSpacingMultiplierVexflow = 0.85;
        rules.VoiceSpacingAddendVexflow = 3.0;
        await osmd.load(xml);
        osmd.render();
        return osmd;
    }
    function staffLine(osmd: OpenSheetMusicDisplay): StaffLine {
        return osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
    }
    function entries(line: StaffLine): GraphicalStaffEntry[] {
        return line.Measures.flatMap(m => m.staffEntries);
    }
    function entryWithLyric(line: StaffLine, text: string): GraphicalStaffEntry {
        return entries(line).find(e => e.LyricsEntries.some(l => l.LyricsEntry.Text === text));
    }
    /** the staff entry's x in staff line coordinates */
    function entryX(entry: GraphicalStaffEntry): number {
        return entry.parentMeasure.PositionAndShape.RelativePosition.x + entry.PositionAndShape.RelativePosition.x;
    }
    function entryRight(entry: GraphicalStaffEntry): number {
        return entryX(entry) + entry.PositionAndShape.BorderMarginRight;
    }
    /** the extend lines of the staff line as [start x, end x] in staff line coordinates */
    function extendLines(line: StaffLine): [number, number][] {
        return line.LyricLines.map(l => [l.Start.x, l.End.x] as [number, number]);
    }
    /** the syllable's label edges in staff line coordinates */
    function labelEdges(entry: GraphicalStaffEntry, text: string): [number, number] {
        const lyric: GraphicalLyricEntry = entry.LyricsEntries.find(l => l.LyricsEntry.Text === text);
        const box: BoundingBox = lyric.GraphicalLabel.PositionAndShape;
        const x: number = entryX(entry) + box.RelativePosition.x;
        return [x + box.BorderMarginLeft, x + box.BorderMarginRight];
    }
    /** the last staff entry whose main note carries the verse's text-less extend (the stop note) */
    function stopEntry(line: StaffLine): GraphicalStaffEntry {
        const stops: GraphicalStaffEntry[] = entries(line).filter(e =>
            e.sourceStaffEntry.VoiceEntries.some(v => !v.IsGrace && v.ExtendOnlyLyricVerses.includes("1")));
        return stops[stops.length - 1];
    }
    function lyricsEntry(osmd: OpenSheetMusicDisplay, text: string): LyricsEntry {
        for (const measure of osmd.Sheet.SourceMeasures) {
            for (const container of measure.VerticalSourceStaffEntryContainers) {
                for (const staffEntry of container.StaffEntries) {
                    for (const voiceEntry of staffEntry?.VoiceEntries ?? []) {
                        const entry: LyricsEntry = voiceEntry.LyricsEntries.getValue("1");
                        if (entry?.Text.trim() === text) {
                            return entry;
                        }
                    }
                }
            }
        }
        throw new Error("no lyric " + text);
    }

    it("ends the extend line on the stop note before a grace group and a rest", async () => {
        const osmd: OpenSheetMusicDisplay = await render(stopBeforeGraceGroupAndRest);
        const line: StaffLine = staffLine(osmd);
        const lines: [number, number][] = extendLines(line);
        expect(lines.length).to.equal(1);
        const labelRight: number = labelEdges(entryWithLyric(line, "sta."), "sta.")[1];
        const stop: GraphicalStaffEntry = stopEntry(line);
        const restEntry: GraphicalStaffEntry = entries(line)[3]; // the grace group and the rest
        expect(lines[0][0]).to.be.closeTo(labelRight, 1e-6);
        expect(lines[0][1], "the line ends at the right border of the stop note (G4)").to.be.closeTo(entryRight(stop), 1e-6);
        expect(lines[0][1], "the line does not run under the grace group").to.be.lessThan(entryX(restEntry));
    });

    it("keeps LyricExtendEndGap to the next syllable when the line is cut", async () => {
        const osmd: OpenSheetMusicDisplay = await render(stopRightBeforeNextSyllable);
        const line: StaffLine = staffLine(osmd);
        const lines: [number, number][] = extendLines(line);
        expect(lines.length).to.equal(1);
        const nextLeft: number = labelEdges(entryWithLyric(line, "non"), "non")[0];
        const gap: number = osmd.EngravingRules.LyricExtendEndGap;
        expect(entryRight(stopEntry(line)), "the fixture cuts the line: the stop note reaches under \"non\"").to.be.greaterThan(nextLeft - gap);
        expect(lines[0][1]).to.be.at.most(nextLeft - gap + 1e-6);
        expect(lines[0][1], "the cut line ends LyricExtendEndGap before the label").to.be.closeTo(nextLeft - gap, 1e-6);
        expect(gap).to.be.greaterThan(osmd.EngravingRules.HorizontalBetweenLyricsDistance);
    });

    it("ends the extend line at the note before the next syllable without continue/stop nodes", async () => {
        const osmd: OpenSheetMusicDisplay = await render(noStopNodes);
        const line: StaffLine = staffLine(osmd);
        const lines: [number, number][] = extendLines(line);
        expect(lines.length).to.equal(1);
        const lastMelismaNote: GraphicalStaffEntry = entries(line)[2]; // G4
        const nextLeft: number = labelEdges(entryWithLyric(line, "Il"), "Il")[0];
        expect(lines[0][1]).to.be.closeTo(Math.min(entryRight(lastMelismaNote), nextLeft - osmd.EngravingRules.LyricExtendEndGap), 1e-6);
    });

    it("begins the next word with the second syllable of an undertie elision", async () => {
        const osmd: OpenSheetMusicDisplay = await render(undertieElision);
        const gliAf: LyricsEntry = lyricsEntry(osmd, "Gli‿af");
        const fan: LyricsEntry = lyricsEntry(osmd, "fan");
        const ni: LyricsEntry = lyricsEntry(osmd, "ni");
        expect(gliAf.NextWord).to.not.equal(undefined);
        expect(gliAf.NextWord).to.equal(fan.Word);
        expect(fan.Word).to.equal(ni.Word);
        expect(gliAf.NextWord.Syllables.map(e => e.Text.trim())).to.deep.equal(["Gli‿af", "fan", "ni"]);
        // af-fan, fan-ni (su- has no partner here)
        const dashes: number = osmd.GraphicSheet.MusicPages[0].MusicSystems.flatMap(s => s.StaffLines).map(l => l.LyricsDashes.length)
            .reduce((a, b) => a + b, 0);
        expect(dashes).to.equal(2);
    });
});
