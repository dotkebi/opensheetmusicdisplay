import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { GraphicalLyricEntry } from "../../../src/MusicalScore/Graphical/GraphicalLyricEntry";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A lyric extend on a single note, the last before a rest (or before the end of the piece), is drawn (Schumann, Myrthen 3
 * m44, R-03-1: "stern," on the dotted quarter that ends the system, the next system starts with a rest, had no line):
 * - from the label's right, EngravingRules.LyricExtendMinimumLength long, within its staff line;
 * - before a syllable that follows the rest closely, it keeps EngravingRules.LyricExtendEndGap to its label;
 * - an extend whose next note has the next syllable still gets no line.
 * Same as osmd-dart test/lyric_extend_single_note_test.dart.
 */
describe("Lyric extend on a single note", () => {
    function note(step: string, octave: number, duration: number, type: string, lyric?: string, extend: boolean = false,
                  dot: boolean = false): string {
        const lyricXml: string = lyric === undefined ? "" :
            `<lyric number="1"><syllabic>single</syllabic><text>${lyric}</text>${extend ? "<extend type=\"start\"/>" : ""}</lyric>`;
        return `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${duration}</duration>` +
            `<voice>1</voice><type>${type}</type>${dot ? "<dot/>" : ""}${lyricXml}</note>`;
    }
    function rest(duration: number, type: string, measure: boolean = false): string {
        return `<note><rest${measure ? " measure=\"yes\"" : ""}/><duration>${duration}</duration><voice>1</voice>` +
            `${measure ? "" : `<type>${type}</type>`}</note>`;
    }
    function score(measures: string[], beats: number = 2): string {
        const body: string = measures.map((measure, i) => `<measure number="${i + 1}">` +
            (i === 0 ? `<attributes><divisions>8</divisions><time><beats>${beats}</beats><beat-type>4</beat-type></time>` +
                "<clef><sign>G</sign><line>2</line></clef></attributes>" : "") + `${measure}</measure>`).join("");
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\">" +
            `<part-list><score-part id="P1"><part-name>Canto</part-name></score-part></part-list><part id="P1">${body}</part></score-partwise>`;
    }

    /** Myrthen 3 m44-45 (3/4): "flü" on a quarter, an eighth, "stern," (dotted quarter, extend start) ends the system; the
     *  next system starts with a measure rest */
    const beforeSystemBreakRest: string = score([
        note("B", 4, 8, "quarter", "flü") + note("E", 5, 4, "eighth") + note("D", 5, 12, "quarter", "stern,", true, true),
        "<print new-system=\"yes\"/>" + rest(24, "half", true),
        note("G", 4, 24, "half", "Ach", false, true),
    ], 3);
    /** the extend's note, an eighth rest and the next syllable on the next eighth */
    const beforeRestInMeasure: string = score([
        note("D", 5, 4, "eighth", "stern,", true) + rest(4, "eighth") + note("G", 4, 4, "eighth", "sie") + note("A", 4, 4, "eighth", "flü"),
    ]);
    /** the extend's note ends the piece */
    const atPieceEnd: string = score([
        note("G", 4, 8, "quarter", "das") + note("D", 5, 8, "quarter", "Licht", true),
    ]);
    /** the next note has the next syllable: nothing to extend over */
    const nextSyllableNext: string = score([
        note("D", 5, 4, "eighth", "stern,", true) + note("G", 4, 4, "eighth", "sie") + note("A", 4, 8, "quarter", "flü"),
    ]);

    async function render(xml: string): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        const rules: any = osmd.EngravingRules;
        rules.LastSystemMaxScalingFactor = 1.0;
        // 02front / 03app density rules
        rules.VoiceSpacingMultiplierVexflow = 0.85;
        rules.VoiceSpacingAddendVexflow = 3.0;
        rules.NewSystemAtXMLNewSystemAttribute = true;
        await osmd.load(xml);
        osmd.render();
        return osmd;
    }
    function staffLines(osmd: OpenSheetMusicDisplay): StaffLine[] {
        return osmd.GraphicSheet.MusicPages.flatMap(page => page.MusicSystems).map(system => system.StaffLines[0]);
    }
    function entries(line: StaffLine): GraphicalStaffEntry[] {
        return line.Measures.flatMap(m => m.staffEntries);
    }
    function lastEntryWithLyric(line: StaffLine, text: string): GraphicalStaffEntry {
        const found: GraphicalStaffEntry[] = entries(line).filter(e => e.LyricsEntries.some(l => l.LyricsEntry.Text === text));
        return found[found.length - 1];
    }
    function entryX(entry: GraphicalStaffEntry): number {
        return entry.parentMeasure.PositionAndShape.RelativePosition.x + entry.PositionAndShape.RelativePosition.x;
    }
    function labelEdges(entry: GraphicalStaffEntry, text: string): [number, number] {
        const lyric: GraphicalLyricEntry = entry.LyricsEntries.find(l => l.LyricsEntry.Text === text);
        const box: BoundingBox = lyric.GraphicalLabel.PositionAndShape;
        const x: number = entryX(entry) + box.RelativePosition.x;
        return [x + box.BorderMarginLeft, x + box.BorderMarginRight];
    }
    function extendLines(line: StaffLine): [number, number][] {
        return line.LyricLines.map(l => [l.Start.x, l.End.x] as [number, number]);
    }

    it("draws the line of a single note before a rest that starts the next system", async () => {
        const osmd: OpenSheetMusicDisplay = await render(beforeSystemBreakRest);
        const lines: StaffLine[] = staffLines(osmd);
        expect(lines.length).to.equal(2);
        const first: StaffLine = lines[0];
        const [, labelRight] = labelEdges(lastEntryWithLyric(first, "stern,"), "stern,");
        const drawn: [number, number][] = extendLines(first);
        expect(drawn.length).to.equal(1);
        expect(drawn[0][0]).to.be.closeTo(labelRight, 1e-6);
        const width: number = first.PositionAndShape.Size.width;
        expect(drawn[0][1]).to.be.closeTo(Math.min(labelRight + osmd.EngravingRules.LyricExtendMinimumLength, width), 1e-6);
        expect(drawn[0][1]).to.be.greaterThan(drawn[0][0]);
        expect(extendLines(lines[1]).length).to.equal(0);
    });

    it("draws the line of a single note before a rest, before the next syllable's label", async () => {
        const osmd: OpenSheetMusicDisplay = await render(beforeRestInMeasure);
        const line: StaffLine = staffLines(osmd)[0];
        const [, labelRight] = labelEdges(lastEntryWithLyric(line, "stern,"), "stern,");
        const [nextLeft] = labelEdges(lastEntryWithLyric(line, "sie"), "sie");
        const drawn: [number, number][] = extendLines(line);
        expect(drawn.length).to.equal(1);
        expect(drawn[0][0]).to.be.closeTo(labelRight, 1e-6);
        const rules: any = osmd.EngravingRules;
        expect(drawn[0][1]).to.be.closeTo(Math.min(labelRight + rules.LyricExtendMinimumLength, nextLeft - rules.LyricExtendEndGap), 1e-6);
    });

    it("draws the line of a single note at the end of the piece", async () => {
        const osmd: OpenSheetMusicDisplay = await render(atPieceEnd);
        const line: StaffLine = staffLines(osmd)[0];
        const [, labelRight] = labelEdges(lastEntryWithLyric(line, "Licht"), "Licht");
        const drawn: [number, number][] = extendLines(line);
        expect(drawn.length).to.equal(1);
        expect(drawn[0][0]).to.be.closeTo(labelRight, 1e-6);
        expect(drawn[0][1]).to.be.closeTo(Math.min(labelRight + osmd.EngravingRules.LyricExtendMinimumLength,
                                                   line.PositionAndShape.Size.width), 1e-6);
    });

    it("draws no line when the next note has the next syllable", async () => {
        const osmd: OpenSheetMusicDisplay = await render(nextSyllableNext);
        expect(extendLines(staffLines(osmd)[0]).length).to.equal(0);
    });
});
