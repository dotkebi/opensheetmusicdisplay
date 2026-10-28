import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";

/**
 * The strokes of a tremolo between two notes are reserved in the sky and bottom lines before the expressions are placed: the
 * skyline calculation doesn't draw them (the drawer does), so a text placed by the bottom line went on them where it reached past
 * the stems (Bowen, Viola Sonata No. 2 Op. 22 m119-120, test_tremolo_strokes_words.musicxml: "trem." under the viola's A3-C4
 * dotted halves, stems down, its start after the first stem; 81sabo B6-P02-14-APP020).
 * Same as osmd-dart's test/tremolo_between_notes_reserved_test.dart.
 */
describe("Tremolo between notes: strokes reserved before the expressions", () => {
    for (const width of [834, 1024]) {
        it(`keeps a text below clear of the strokes (${width})`, async () => {
            const container: HTMLElement = TestUtils.getDivElement(document);
            container.style.width = `${width}px`;
            const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
            await osmd.load(TestUtils.getScore("test_tremolo_strokes_words.musicxml"));
            osmd.render();
            // the strokes as drawn, in units: one group per stroke (its fill path first)
            const strokes: {left: number, right: number, top: number, bottom: number}[] = [];
            for (const group of Array.from(container.querySelectorAll("g[id^=\"vf-tremoloBetweenNotes-\"]"))) {
                const points: number[][] = (group.querySelector("path")?.getAttribute("d") ?? "").split(/[MLZ]/)
                    .filter(part => part.trim().length > 0).map(part => part.trim().split(" ").map(parseFloat));
                strokes.push({left: Math.min(...points.map(p => p[0])) / 10, right: Math.max(...points.map(p => p[0])) / 10,
                              top: Math.min(...points.map(p => p[1])) / 10, bottom: Math.max(...points.map(p => p[1])) / 10});
            }
            const staffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
            const box: BoundingBox = staffLine.AbstractExpressions.find(e => e.Label?.Label?.text === "trem.").Label.PositionAndShape;
            const left: number = box.AbsolutePosition.x + box.BorderMarginLeft;
            const right: number = box.AbsolutePosition.x + box.BorderMarginRight;
            const top: number = box.AbsolutePosition.y + box.BorderMarginTop;
            // the strokes of m119, which the text reaches under
            const under: {left: number, right: number, top: number, bottom: number}[] = strokes.filter(s => left < s.right && s.left < right);
            expect(under.length, `trem. ${left}..${right}, strokes ${strokes.map(s => `${s.left}..${s.right}`).join(", ")}`).to.equal(3);
            for (const s of under) {
                expect(top, `trem. top ${top}, stroke ${s.top}..${s.bottom}`).to.be.at.least(s.bottom - 0.01);
            }
            osmd.clear();
            container.remove();
        });
    }
});
