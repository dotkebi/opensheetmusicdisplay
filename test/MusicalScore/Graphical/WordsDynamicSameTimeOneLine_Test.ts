import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { MusicSheetCalculator } from "../../../src/MusicalScore/Graphical/MusicSheetCalculator";
import { GraphicalInstantaneousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalInstantaneousDynamicExpression";
import { GraphicalUnknownExpression } from "../../../src/MusicalScore/Graphical/GraphicalUnknownExpression";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Words and an instantaneous dynamic of the same staff, placement and time are engraved on one line, the words before the
 * dynamic if they qualify it ("leggero e pp", "sempre f"), after it otherwise ("p dolce") — Bellini, Malinconia piano m13;
 * Parisotti, Pur dicesti piano m1 "p e leggero"; Bononcini piano m1 "p dolce". Same fixture and checks as osmd-dart
 * test/words_dynamic_same_time_one_line_test.dart.
 */
describe("Words and a dynamic at the same time on one line", () => {
    const file: string = "test_words_dynamic_same_time_one_line.musicxml";

    class Pair {
        public words: GraphicalUnknownExpression;
        public dynamic: GraphicalInstantaneousDynamicExpression;
        constructor(words: GraphicalUnknownExpression, dynamic: GraphicalInstantaneousDynamicExpression) {
            this.words = words;
            this.dynamic = dynamic;
        }
        public get w(): BoundingBox { return this.words.Label.PositionAndShape; }
        public get d(): BoundingBox { return this.dynamic.PositionAndShape; }
        public get wordsLeft(): number { return this.w.RelativePosition.x + this.w.BorderMarginLeft; }
        public get wordsRight(): number { return this.w.RelativePosition.x + this.w.BorderMarginRight; }
        public get wordsTop(): number { return this.w.RelativePosition.y + this.w.BorderMarginTop; }
        public get dynamicLeft(): number { return this.d.RelativePosition.x + this.d.BorderMarginLeft; }
        public get dynamicRight(): number { return this.d.RelativePosition.x + this.d.BorderMarginRight; }
        public get dynamicBottom(): number { return this.d.RelativePosition.y + this.d.BorderMarginBottom; }
        public get wordsBaseline(): number {
            return this.w.RelativePosition.y + MusicSheetCalculator.labelBaselineOffset(this.words.Label);
        }
        public get dynamicBaseline(): number {
            return this.d.RelativePosition.y + this.dynamic.Label.PositionAndShape.RelativePosition.y +
                MusicSheetCalculator.labelBaselineOffset(this.dynamic.Label);
        }
    }

    async function render(oneLine: boolean = true): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1600px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        osmd.EngravingRules.PlaceWordsBesideSameTimeDynamic = oneLine;
        await osmd.load(TestUtils.getScore(file));
        osmd.render();
        return osmd;
    }

    /** the words of measure number (containing text) and the dynamic of that measure on their staff line */
    function pair(osmd: OpenSheetMusicDisplay, number: number, text: string): [Pair, StaffLine] {
        for (const system of osmd.GraphicSheet.MusicPages[0].MusicSystems) {
            for (const staffLine of system.StaffLines) {
                const words: GraphicalUnknownExpression = staffLine.AbstractExpressions.find(e =>
                    e instanceof GraphicalUnknownExpression && e.sourceMultiExpression?.SourceMeasureParent.MeasureNumber === number &&
                    e.Label.Label.text.includes(text)) as GraphicalUnknownExpression;
                if (!words) {
                    continue;
                }
                const dynamic: GraphicalInstantaneousDynamicExpression = staffLine.AbstractExpressions.find(e =>
                    e instanceof GraphicalInstantaneousDynamicExpression &&
                    e.InstantaneousDynamic.ParentMultiExpression.SourceMeasureParent.MeasureNumber === number) as GraphicalInstantaneousDynamicExpression;
                return [new Pair(words, dynamic), staffLine];
            }
        }
        throw new Error(`no words "${text}" in measure ${number}`);
    }

    it("puts qualifying words before the dynamic, from the first note on", async () => {
        const osmd: OpenSheetMusicDisplay = await render();
        const before: OpenSheetMusicDisplay = await render(false);
        const [p, staffLine] = pair(osmd, 1, "leggero e");
        const [old] = pair(before, 1, "leggero e");
        expect(p.wordsBaseline).to.be.closeTo(p.dynamicBaseline, 0.01);
        expect(p.wordsRight).to.be.at.most(p.dynamicLeft + 0.01);
        const measure: any = staffLine.Measures[0];
        const firstNoteX: number = measure.PositionAndShape.RelativePosition.x + measure.staffEntries[0].PositionAndShape.RelativePosition.x;
        expect(p.wordsLeft).to.be.closeTo(firstNoteX, 0.01);
        expect(p.dynamicLeft).to.be.above(old.dynamicLeft + 1);
        expect(old.wordsTop).to.be.at.least(old.dynamicBottom - 0.01);
    });

    it("draws the words' text on the dynamic's baseline", async () => {
        const osmd: OpenSheetMusicDisplay = await render();
        const texts: SVGTextElement[] = Array.from(osmd.Drawer.Backends[0].getInnerElement().querySelectorAll("text"));
        const y: (text: string) => number = (text: string): number => Number(texts.find(t => t.textContent === text).getAttribute("y"));
        expect(y("leggero e")).to.be.closeTo(y("pp"), 1);
        expect(y("dolce")).to.be.closeTo(y("p"), 1);
    });

    it("puts other words after the dynamic, which stays on its note", async () => {
        const osmd: OpenSheetMusicDisplay = await render();
        const before: OpenSheetMusicDisplay = await render(false);
        for (const [number, text] of [[2, "dolce"], [6, "espress."]] as [number, string][]) {
            const [p] = pair(osmd, number, text);
            const [old] = pair(before, number, text);
            expect(p.wordsBaseline, `m${number}`).to.be.closeTo(p.dynamicBaseline, 0.01);
            expect(p.wordsLeft, `m${number}`).to.be.at.least(p.dynamicRight - 0.01);
            expect(p.d.RelativePosition.x, `m${number}`).to.be.closeTo(old.d.RelativePosition.x, 0.01);
        }
    });

    it("puts words before a dynamic in the middle of a measure, and above the staff", async () => {
        const osmd: OpenSheetMusicDisplay = await render();
        const before: OpenSheetMusicDisplay = await render(false);
        for (const [number, text] of [[3, "sempre"], [7, "poco"]] as [number, string][]) {
            const [p] = pair(osmd, number, text);
            expect(p.wordsBaseline, `m${number}`).to.be.closeTo(p.dynamicBaseline, 0.01);
            expect(p.wordsRight, `m${number}`).to.be.at.most(p.dynamicLeft + 0.01);
        }
        const [sempre] = pair(osmd, 3, "sempre");
        const [oldSempre] = pair(before, 3, "sempre");
        expect(sempre.d.RelativePosition.x).to.be.closeTo(oldSempre.d.RelativePosition.x, 0.01);
        const [poco] = pair(osmd, 7, "poco");
        expect(poco.w.RelativePosition.y + poco.w.BorderMarginBottom).to.be.at.most(0.01);
    });

    it("places words at another time and instrument cues as before", async () => {
        const osmd: OpenSheetMusicDisplay = await render();
        const before: OpenSheetMusicDisplay = await render(false);
        for (const [number, text] of [[4, "cédez"], [5, "Solo"]] as [number, string][]) {
            const [p] = pair(osmd, number, text);
            const [old] = pair(before, number, text);
            expect(p.w.RelativePosition.x, `m${number}`).to.be.closeTo(old.w.RelativePosition.x, 0.01);
            expect(p.w.RelativePosition.y, `m${number}`).to.be.closeTo(old.w.RelativePosition.y, 0.01);
            expect(p.d.RelativePosition.y, `m${number}`).to.be.closeTo(old.d.RelativePosition.y, 0.01);
        }
        const [solo] = pair(osmd, 5, "Solo");
        expect(solo.wordsTop).to.be.at.least(solo.dynamicBottom - 0.01);
    });

    it("moves the dynamic out with words that would touch the notes", async () => {
        const osmd: OpenSheetMusicDisplay = await render();
        const before: OpenSheetMusicDisplay = await render(false);
        const [p, staffLine] = pair(osmd, 8, "dolce");
        const [old] = pair(before, 8, "dolce");
        expect(p.wordsBaseline).to.be.closeTo(p.dynamicBaseline, 0.01);
        expect(p.d.RelativePosition.y).to.be.above(old.d.RelativePosition.y);
        const notes: number = staffLine.SkyBottomLineCalculator.getMaxInRangeOf(staffLine.NotesBottomLine, p.wordsLeft, p.wordsRight);
        expect(p.wordsTop).to.be.at.least(notes - 0.01);
    });

    it("puts \"piu\" of one direction with an empty words, f and <sound dynamics> before the f", async () => {
        // Gounod, Méditation m33 (an OSMD sample): the words are read since the words of a direction with <sound dynamics> are drawn
        const osmd: OpenSheetMusicDisplay = await render();
        const [p] = pair(osmd, 9, "piu");
        expect(p.words.Label.Label.text).to.equal("piu");
        expect(p.wordsBaseline).to.be.closeTo(p.dynamicBaseline, 0.01);
        expect(p.wordsRight).to.be.at.most(p.dynamicLeft + 0.01);
    });
});

