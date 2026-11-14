import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { GraphicalUnknownExpression } from "../../../src/MusicalScore/Graphical/GraphicalUnknownExpression";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A dashed line is broken around the words on it instead of ended at the first, also a word starting just before the line of
 * a later system and words on the line already (Schubert/Reger, Gretchen am Spinnrade piano m54-61 "cre- - - scen- - - do - - -
 * poco - - - a - - - poco"), and the pieces of a word divided by dashed lines go on one baseline on a system, a piece's line
 * continued on a later system on that of the next piece there (Schubert, Ganymed m84-92 "cre - - - scen - - - do"). Same
 * fixtures and checks as osmd-dart test/expression_dashes_word_pieces_test.dart.
 */
describe("Expression dashes with words on them", () => {
    async function render(file: string): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1024px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore(file));
        osmd.render();
        return osmd;
    }
    function staffLinesWithWords(osmd: OpenSheetMusicDisplay): [StaffLine, BoundingBox[]][] {
        const lines: [StaffLine, BoundingBox[]][] = [];
        for (const system of osmd.GraphicSheet.MusicPages[0].MusicSystems) {
            for (const staffLine of system.StaffLines) {
                const words: BoundingBox[] = staffLine.AbstractExpressions.filter(e => e instanceof GraphicalUnknownExpression)
                    .map(e => e.Label.PositionAndShape);
                if (words.length > 0 || staffLine.ExpressionDashes.length > 0) {
                    lines.push([staffLine, words]);
                }
            }
        }
        return lines;
    }

    it("breaks the line around the words on it", async () => {
        const osmd: OpenSheetMusicDisplay = await render("test_expression_dashes_words_on_line.musicxml");
        let checked: number = 0;
        for (const [staffLine, words] of staffLinesWithWords(osmd)) {
            const lineEnd: number = Math.max(...staffLine.ExpressionDashes.map(d => d.End.x), 0);
            for (const box of words) {
                const right: number = box.RelativePosition.x + box.BorderMarginRight;
                if (right > lineEnd - 3) {
                    continue; // the last word, after the line (or a word near its end)
                }
                expect(staffLine.ExpressionDashes.some(d => d.Start.x >= right && d.Start.x - right < 2),
                       `a line after the word at x ${right.toFixed(1)}`).toBe(true);
                checked++;
            }
        }
        expect(checked).toBeGreaterThanOrEqual(4);
    });

    it("puts the pieces of a divided word and their lines on one baseline on a system", async () => {
        const osmd: OpenSheetMusicDisplay = await render("test_expression_dashes_word_pieces.musicxml");
        let checked: number = 0;
        for (const [staffLine, words] of staffLinesWithWords(osmd)) {
            const ys: number[] = [...words.map(box => box.RelativePosition.y + (box.BorderTop + box.BorderBottom) / 2),
                                  ...staffLine.ExpressionDashes.map(d => d.Start.y)];
            if (ys.length < 2) {
                continue;
            }
            for (const y of ys) {
                expect(y).toBeCloseTo(ys[0], 2);
            }
            checked++;
        }
        expect(checked).toBeGreaterThanOrEqual(2);
    });
});
