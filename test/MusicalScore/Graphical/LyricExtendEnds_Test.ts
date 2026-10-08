import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Lyric extend lines (Schumann, Myrthen): the line starts after the syllable's text (7 m21 "Höh;"), ends before the next
 * syllable's label when the melisma's last note sits under it (10 m14 "weh!" into "Ein"), and continues under the first
 * note of the next system when the melisma ends there (11 m25-26 "er."). Same as osmd-dart test/lyric_extend_ends_test.dart.
 */
describe("Lyric extend ends", () => {
    function note(step: string, duration: number, type: string, lyric?: string, extend?: string, tie?: string): string {
        const lyricXml: string = lyric === undefined && extend === undefined ? "" : "<lyric number=\"1\">" +
            (lyric === undefined ? "" : `<syllabic>single</syllabic><text>${lyric}</text>`) +
            (extend === undefined ? "" : `<extend type="${extend}"/>`) + "</lyric>";
        return `<note><pitch><step>${step}</step><octave>4</octave></pitch><duration>${duration}</duration>` +
            (tie ? `<tie type="${tie}"/>` : "") + `<voice>1</voice><type>${type}</type>${lyricXml}</note>`;
    }
    function score(measures: string[], beats: string, beatType: string): string {
        const body: string = measures.map((measure, i) => `<measure number="${i + 1}">` +
            (i === 0 ? `<attributes><divisions>8</divisions><time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time>` +
                "<clef><sign>G</sign><line>2</line></clef></attributes>" : "") + `${measure}</measure>`).join("");
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\">" +
            `<part-list><score-part id="P1"><part-name>Canto</part-name></score-part></part-list><part id="P1">${body}</part></score-partwise>`;
    }

    /** 10 m14 (3/8): a syllable whose melisma ends on a flagged sixteenth right before the next syllable's sixteenth,
     *  at the measure's minimum width: the flag reaches under the next label, which starts left of its note */
    const melismaUnderNextSyllable: string = score([
        note("B", 4, "eighth", "a", "start", "start") + note("B", 2, "16th", undefined, "stop", "stop") +
        note("F", 2, "16th", "Ein") + note("G", 4, "eighth", "hoch"),
    ], "3", "8");
    /** 7 m21: a half note's syllable whose melisma ends on the next quarter */
    const halfNoteMelisma: string = score([
        note("D", 16, "half", "Höh;", "start") + note("C", 8, "quarter", undefined, "stop") + note("C", 8, "quarter", "sie"),
    ], "4", "4");
    /** 11 m25-26: the melisma of the last measure of a system ends on the first note of the next system */
    const melismaOverSystemBreak: string = score([
        note("E", 16, "half", "er.", "start"),
        "<print new-system=\"yes\"/>" + note("F", 8, "quarter", undefined, "stop") + note("B", 8, "quarter", "Mut"),
    ], "2", "4");

    async function render(xml: string): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg", newSystemFromXML: true });
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

    function staffLines(osmd: OpenSheetMusicDisplay): StaffLine[] {
        return osmd.GraphicSheet.MusicPages[0].MusicSystems.map(system => system.StaffLines[0]);
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
    /** the extend lines of the staff line as [start x, end x] in staff line coordinates (the drawer leaves them relative to
     *  the staff line and adds its position only when drawing, see MusicSheetDrawer.drawLyricLines()) */
    function extendLines(line: StaffLine): [number, number][] {
        return line.LyricLines.map(l => [l.Start.x, l.End.x] as [number, number]);
    }
    /** the syllable's label edges in staff line coordinates */
    function labelEdges(entry: GraphicalStaffEntry): [number, number] {
        const box: BoundingBox = entry.LyricsEntries[0].GraphicalLabel.PositionAndShape;
        const x: number = entry.parentMeasure.PositionAndShape.RelativePosition.x + entry.PositionAndShape.RelativePosition.x +
            box.RelativePosition.x;
        return [x + box.BorderMarginLeft, x + box.BorderMarginRight];
    }

    it("starts the extend line after the syllable text", async () => {
        const osmd: OpenSheetMusicDisplay = await render(halfNoteMelisma);
        const line: StaffLine = staffLines(osmd)[0];
        const labelRight: number = labelEdges(entryWithLyric(line, "Höh;"))[1];
        const lines: [number, number][] = extendLines(line);
        expect(lines.length).to.equal(1);
        expect(lines[0][0]).to.be.closeTo(labelRight, 1e-6);
        expect(lines[0][1] - lines[0][0]).to.be.at.least(osmd.EngravingRules.LyricExtendMinimumLength - 1e-6);
    });

    it("ends the extend line before the next syllable", async () => {
        const osmd: OpenSheetMusicDisplay = await render(melismaUnderNextSyllable);
        const line: StaffLine = staffLines(osmd)[0];
        const nextLeft: number = labelEdges(entryWithLyric(line, "Ein"))[0];
        const lines: [number, number][] = extendLines(line);
        expect(lines.length).to.equal(1);
        expect(lines[0][1]).to.be.at.most(nextLeft - osmd.EngravingRules.LyricExtendEndGap + 1e-6);
    });

    it("continues the extend line under the first note of the next system", async () => {
        const osmd: OpenSheetMusicDisplay = await render(melismaOverSystemBreak);
        const lines: StaffLine[] = staffLines(osmd);
        expect(lines.length).to.equal(2);
        expect(lines[0].LyricLines.length).to.equal(1);
        expect(lines[1].LyricLines.length).to.equal(1, "the line continues on the second system");
        const firstEntry: GraphicalStaffEntry = lines[1].Measures[0].staffEntries[0];
        const noteX: number = lines[1].Measures[0].PositionAndShape.RelativePosition.x + firstEntry.PositionAndShape.RelativePosition.x;
        expect(extendLines(lines[1])[0][0]).to.be.at.most(noteX);
        expect(extendLines(lines[1])[0][1]).to.be.greaterThan(noteX);
    });
});
