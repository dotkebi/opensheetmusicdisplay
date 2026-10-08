import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { GraphicalLyricEntry } from "../../../src/MusicalScore/Graphical/GraphicalLyricEntry";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Lyrics and grace notes (solo vocal review, Gluck "O del mio dolce ardor" E11-F02, Legrenzi "Che fiero costume" E10-F06
 * m12 and E10-F07 m18):
 * - a lyric extend line whose <extend type="continue"/> and <extend type="stop"/> are on the grace notes before the next
 *   syllable's note (lyric nodes without text) is drawn, to the end of the last grace note that carries the extend.
 *   Those grace notes share the next syllable's staff entry, so the extend's forward scan reached the next syllable without
 *   an end entry and drew nothing;
 * - a syllable on a grace note is placed at the grace note, not at the main note of its staff entry, and the main note's
 *   syllable clears it (the grace note group is widened, the measure can't be stretched to make room there).
 * Same as osmd-dart test/lyric_grace_notes_test.dart.
 */
describe("Lyrics on grace notes", () => {
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
    function grace(step: string, octave: number, type: string, lyric?: string, extend?: string, slash: boolean = false): string {
        return `<note><grace${slash ? " slash=\"yes\"" : ""}/><pitch><step>${step}</step><octave>${octave}</octave></pitch>` +
            `<voice>1</voice><type>${type}</type>${lyricXml(lyric, extend)}</note>`;
    }
    function score(measures: string[], beats: string, beatType: string): string {
        const body: string = measures.map((measure, i) => `<measure number="${i + 1}">` +
            (i === 0 ? `<attributes><divisions>8</divisions><time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time>` +
                "<clef><sign>G</sign><line>2</line></clef></attributes>" : "") + `${measure}</measure>`).join("");
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\">" +
            `<part-list><score-part id="P1"><part-name>Canto</part-name></score-part></part-list><part id="P1">${body}</part></score-partwise>`;
    }

    /** E10 m12: the melisma of "fin" ends on the last of the grace notes before "re" (the stop is on that grace note) */
    const stopOnGraceNote: string = score([
        note("C", 5, 16, "half", "fin", "start", "end") + grace("B", 4, "eighth") + grace("F", 4, "eighth", undefined, "stop") +
        note("E", 4, 8, "quarter", "re", undefined, "begin") + note("D", 4, 8, "quarter", "mo", undefined, "end"),
    ], "4", "4");
    /** E11 m12: every grace note before "re" carries the extend, continue… stop */
    const continueOverGraceNotes: string = score([
        note("D", 5, 16, "half", "fin", "start", "end") + grace("C", 5, "eighth", undefined, "continue") +
        grace("B", 4, "eighth", undefined, "continue") + grace("G", 4, "eighth", undefined, "stop") +
        note("F", 4, 8, "quarter", "re", undefined, "begin") + note("E", 4, 8, "quarter", "mo", undefined, "end"),
    ], "4", "4");
    /** the grace notes carry a continue, the stop is on a main note after them: the line ends at that main note as before */
    const stopOnMainNoteAfterGraceNotes: string = score([
        note("D", 5, 8, "quarter", "fin", "start", "end") + grace("C", 5, "eighth", undefined, "continue") +
        grace("B", 4, "eighth", undefined, "continue") + note("A", 4, 8, "quarter", undefined, "stop") +
        note("F", 4, 8, "quarter", "re", undefined, "begin") + note("E", 4, 8, "quarter", "mo", undefined, "end"),
    ], "4", "4");
    /** Lotti, Pur dicesti m59 (Medium High MH12-R05): "is" on the measure's last quarter, its extend stops on the last of the
     *  grace notes after that quarter (a Nachschlag ending the measure, which shares its staff entry); the next syllable is in
     *  the next measure */
    const stopOnGraceNoteAfterMainNote: string = score([
        note("G", 4, 8, "quarter", "mio") + note("F", 4, 8, "quarter", "is", "start") + grace("G", 4, "32nd") +
        grace("F", 4, "32nd") + grace("E", 4, "32nd") + grace("F", 4, "32nd", undefined, "stop"),
        note("E", 4, 16, "half", "mine"),
    ], "2", "4");
    /** the same with a note between: "is" on the first quarter, the second has no syllable, the grace notes after it carry the stop */
    const stopOnGraceNoteAfterLaterNote: string = score([
        note("F", 4, 8, "quarter", "is", "start") + note("G", 4, 8, "quarter") + grace("A", 4, "32nd") +
        grace("G", 4, "32nd", undefined, "stop"),
        note("E", 4, 16, "half", "mine"),
    ], "2", "4");
    /** E10 m18: "in" on a slashed grace note right before "me" on a sixteenth, "re" on the eighth before */
    const syllableOnGraceNote: string = score([
        note("A", 4, 4, "eighth", "re") + grace("A", 4, "16th", "in", undefined, true) + note("A", 4, 2, "16th", "me") +
        note("G", 4, 2, "16th") + note("B", 4, 4, "eighth", "di", undefined, "begin") + note("G", 4, 4, "eighth", "pin", undefined, "end"),
    ], "2", "4");

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
    function entryWithLyric(line: StaffLine, text: string): GraphicalStaffEntry {
        for (const measure of line.Measures) {
            for (const entry of measure.staffEntries) {
                if (entry.LyricsEntries.some(lyric => lyric.LyricsEntry.Text === text)) {
                    return entry;
                }
            }
        }
        return undefined;
    }
    /** the staff entry's x in staff line coordinates */
    function entryX(entry: GraphicalStaffEntry): number {
        return entry.parentMeasure.PositionAndShape.RelativePosition.x + entry.PositionAndShape.RelativePosition.x;
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

    /** the extend line of "fin" ends at the grace notes before "re": after the label, before the main note "re" is at */
    function expectLineToEndAtGraceNotes(osmd: OpenSheetMusicDisplay): void {
        const line: StaffLine = staffLine(osmd);
        const lines: [number, number][] = extendLines(line);
        expect(lines.length).to.equal(1, "one extend line");
        const labelRight: number = labelEdges(entryWithLyric(line, "fin"), "fin")[1];
        const nextEntry: GraphicalStaffEntry = entryWithLyric(line, "re");
        expect(lines[0][0]).to.be.closeTo(labelRight, 1e-6);
        expect(lines[0][1]).to.be.greaterThan(lines[0][0] + 1, "the line reaches the grace notes");
        expect(lines[0][1]).to.be.lessThan(entryX(nextEntry), "the line ends before the main note of the next syllable");
        expect(lines[0][1]).to.be.at.most(labelEdges(nextEntry, "re")[0] - osmd.EngravingRules.LyricExtendEndGap + 1e-6);
    }

    it("draws the extend line to a grace note that carries the stop", async () => {
        expectLineToEndAtGraceNotes(await render(stopOnGraceNote));
    });

    it("draws the extend line over grace notes that carry continue and stop", async () => {
        expectLineToEndAtGraceNotes(await render(continueOverGraceNotes));
    });

    it("still ends the extend line at a main note that carries the stop after grace notes", async () => {
        const osmd: OpenSheetMusicDisplay = await render(stopOnMainNoteAfterGraceNotes);
        const line: StaffLine = staffLine(osmd);
        const lines: [number, number][] = extendLines(line);
        expect(lines.length).to.equal(1);
        const stopEntry: GraphicalStaffEntry = line.Measures[0].staffEntries[1]; // A4, no lyrics
        expect(stopEntry.LyricsEntries.length).to.equal(0);
        expect(lines[0][1]).to.be.greaterThan(entryX(stopEntry), "the line covers the main note with the stop");
    });

    for (const [name, xml] of [["on its own note", stopOnGraceNoteAfterMainNote], ["on a later note", stopOnGraceNoteAfterLaterNote]]) {
        it(`draws the extend line to a grace note after its main note that carries the stop (${name})`, async () => {
            const osmd: OpenSheetMusicDisplay = await render(xml);
            const line: StaffLine = staffLine(osmd);
            const lines: [number, number][] = extendLines(line);
            expect(lines.length).to.equal(1, "one extend line");
            expect(lines[0][0]).to.be.closeTo(labelEdges(entryWithLyric(line, "is"), "is")[1], 1e-6);
            const mainEntry: GraphicalStaffEntry = line.Measures[0].staffEntries[1];
            const mainNote: BoundingBox = mainEntry.graphicalVoiceEntries.find(gve => !gve.parentVoiceEntry.IsGrace).PositionAndShape;
            expect(lines[0][1]).to.be.greaterThan(entryX(mainEntry) + mainNote.RelativePosition.x + mainNote.BorderMarginRight + 1,
                "the line goes on over the grace notes after the main note");
            const lastGrace: BoundingBox = mainEntry.graphicalVoiceEntries[mainEntry.graphicalVoiceEntries.length - 1].PositionAndShape;
            expect(lines[0][1]).to.be.closeTo(entryX(mainEntry) + lastGrace.RelativePosition.x + lastGrace.BorderMarginRight, 1e-6,
                "the line ends at the last grace note");
            expect(lines[0][1]).to.be.lessThan(labelEdges(entryWithLyric(line, "mine"), "mine")[0], "before the next syllable");
        });
    }

    it("places a syllable on a grace note at the grace note, clear of the main note's syllable", async () => {
        const osmd: OpenSheetMusicDisplay = await render(syllableOnGraceNote);
        const line: StaffLine = staffLine(osmd);
        const entry: GraphicalStaffEntry = entryWithLyric(line, "me");
        expect(entry.LyricsEntries.map(l => l.LyricsEntry.Text)).to.deep.equal(["in", "me"]);
        const distance: number = osmd.EngravingRules.HorizontalBetweenLyricsDistance;
        const [inLeft, inRight]: [number, number] = labelEdges(entry, "in");
        const [meLeft]: [number, number] = labelEdges(entry, "me");
        expect(inLeft).to.be.lessThan(meLeft, "the grace note's syllable is left of the main note's");
        expect(inRight + distance).to.be.at.most(meLeft + 1e-6, "the main note's syllable clears the grace note's");
        expect(inLeft).to.be.lessThan(entryX(entry) - 1, "the grace note's syllable is at the grace note, left of the main note");
        const reRight: number = labelEdges(entryWithLyric(line, "re"), "re")[1];
        expect(reRight + distance).to.be.at.most(inLeft + 1e-6, "the grace note's syllable clears the previous one");
    });
});
