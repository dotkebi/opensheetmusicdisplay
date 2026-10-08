import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { GraphicalLyricEntry } from "../../../src/MusicalScore/Graphical/GraphicalLyricEntry";
import { GraphicalLine } from "../../../src/MusicalScore/Graphical/GraphicalLine";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { LyricsEntry } from "../../../src/MusicalScore/VoiceData/Lyrics/LyricsEntry";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A lyric elision across two notes (Se tu m'ami m21 and m67 "te‿a", Medium High MH17-U03): <elision/> followed by an empty
 * <text/> joins the syllable to the next note's. The reader keeps the syllable's text without the elision
 * (LyricsEntry.elisionToNext), the calculator draws the elision curve from it to the next syllable.
 * Same as osmd-dart test/lyric_elision_to_next_test.dart.
 */
describe("Lyric elision to the next note", () => {
    async function render(): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        const rules: any = osmd.EngravingRules;
        rules.VoiceSpacingMultiplierVexflow = 0.85;
        rules.VoiceSpacingAddendVexflow = 3.0;
        await osmd.load(TestUtils.getScore("test_lyric_elision_to_next.musicxml"));
        osmd.render();
        return osmd;
    }
    function staffLine(osmd: OpenSheetMusicDisplay): StaffLine {
        return osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
    }
    function lyric(line: StaffLine, text: string): GraphicalLyricEntry {
        for (const measure of line.Measures) {
            for (const entry of measure.staffEntries) {
                const found: GraphicalLyricEntry = entry.LyricsEntries.find(l => l.LyricsEntry.Text === text);
                if (found) {
                    return found;
                }
            }
        }
        return undefined;
    }
    /** the label's text box in staff line coordinates [left, right] */
    function textEdges(entry: GraphicalLyricEntry): [number, number] {
        const staffEntry: any = entry.StaffEntryParent;
        const box: BoundingBox = entry.GraphicalLabel.PositionAndShape;
        const x: number = staffEntry.parentMeasure.PositionAndShape.RelativePosition.x + staffEntry.PositionAndShape.RelativePosition.x +
            box.RelativePosition.x;
        return [x + box.BorderLeft, x + box.BorderRight];
    }

    it("reads an elision followed by an empty text as one to the next note", async () => {
        const osmd: OpenSheetMusicDisplay = await render();
        const lyrics: LyricsEntry[] = [];
        for (const measure of osmd.Sheet.SourceMeasures) {
            for (const container of measure.VerticalSourceStaffEntryContainers) {
                for (const staffEntry of container.StaffEntries) {
                    for (const voiceEntry of staffEntry?.VoiceEntries ?? []) {
                        lyrics.push(...voiceEntry.LyricsEntries.values());
                    }
                }
            }
        }
        expect(lyrics.map(l => l.Text + (l.elisionToNext ? "‿" : "")).join(" ")).to.equal("Fa cil te‿ a to‿ in co");
    });

    it("draws the elision curve from the syllable to the next one", async () => {
        const osmd: OpenSheetMusicDisplay = await render();
        const line: StaffLine = staffLine(osmd);
        // 12 short lines per curve, two curves, no extend lines
        expect(line.LyricLines.length).to.equal(24);
        for (const [first, second, curve] of [
            ["te", "a", line.LyricLines.slice(0, 12)],
            ["to", "in", line.LyricLines.slice(12)],
        ] as [string, string, GraphicalLine[]][]) {
            const right: number = textEdges(lyric(line, first))[1];
            const left: number = textEdges(lyric(line, second))[0];
            const start: any = curve[0].Start;
            const end: any = curve[curve.length - 1].End;
            expect(start.x).to.be.lessThan(right, `${first}: starts under it`);
            expect(end.x).to.be.greaterThan(left, `${second}: ends under it`);
            expect(start.y).to.be.closeTo(end.y, 1e-9);
            const lowest: number = Math.max(...curve.map(l => l.End.y));
            expect(lowest).to.be.greaterThan(start.y + 0.2, "it sags");
            for (let i: number = 1; i < curve.length; i++) {
                expect(curve[i].Start.x).to.equal(curve[i - 1].End.x);
                expect(curve[i].Start.y).to.equal(curve[i - 1].End.y);
            }
        }
    });
});
