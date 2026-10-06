import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { GraphicalLabel } from "../../../src/MusicalScore/Graphical/GraphicalLabel";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { GraphicalLyricEntry } from "../../../src/MusicalScore/Graphical/GraphicalLyricEntry";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";

/**
 * Verse numbers ("1." "2." "3.") at the left of the first syllable of each verse (Breitkopf Myrthen:
 * Hochländisches Wiegenlied m2, Weit weit m4, Niemand m3). OSMD only used LyricsEntry.VerseNumber to pick
 * the lyric line; the number itself was never drawn.
 */
describe("Lyric verse number labels", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    const threeVerses: string = "test_lyrics_verse_numbers.musicxml";
    const firstNote: string = "test_lyrics_verse_numbers_first_note.musicxml";

    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1300px";
        document.body.appendChild(container);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
    });
    afterEach(() => {
        container.remove();
    });

    function xml(name: string): string {
        return new XMLSerializer().serializeToString(TestUtils.getScore(name));
    }

    async function render(score: string, renderVerseNumbers: boolean = true): Promise<void> {
        osmd.EngravingRules.NewSystemAtXMLNewSystemAttribute = true;
        osmd.EngravingRules.RenderLyricVerseNumbers = renderVerseNumbers;
        await osmd.load(score);
        osmd.render();
    }

    function systems(): MusicSystem[] {
        const all: MusicSystem[] = [];
        for (const page of osmd.GraphicSheet.MusicPages) {
            all.push(...page.MusicSystems);
        }
        return all;
    }

    function staffLine(systemIndex: number): StaffLine {
        return systems()[systemIndex].StaffLines[0];
    }

    function allLabels(): GraphicalLabel[] {
        const labels: GraphicalLabel[] = [];
        for (const system of systems()) {
            for (const line of system.StaffLines) {
                labels.push(...line.LyricVerseNumberLabels);
            }
        }
        return labels;
    }

    function texts(labels: GraphicalLabel[]): string[] {
        return labels.map(label => label.Label.text);
    }

    function measureWidths(line: StaffLine): number[] {
        return line.Measures.map(measure => measure.PositionAndShape.Size.width);
    }

    /** Left border of a syllable label, relative to the staff line. */
    function syllableLeft(line: StaffLine, measureIndex: number, entryIndex: number, verseIndex: number): number {
        const measure: GraphicalMeasure = line.Measures[measureIndex];
        const staffEntry: GraphicalStaffEntry = measure.staffEntries[entryIndex];
        const label: GraphicalLabel = staffEntry.LyricsEntries[verseIndex].GraphicalLabel;
        return measure.PositionAndShape.RelativePosition.x + staffEntry.PositionAndShape.RelativePosition.x +
            label.PositionAndShape.RelativePosition.x + label.PositionAndShape.BorderMarginLeft;
    }

    it("(a) three verses starting in measure 2 get 1. 2. 3. in one column", async () => {
        await render(xml(threeVerses));
        const line: StaffLine = staffLine(0);
        const labels: GraphicalLabel[] = line.LyricVerseNumberLabels;
        expect(texts(labels)).to.deep.equal(["1.", "2.", "3."]);
        const firstSyllables: GraphicalLyricEntry[] = line.Measures[1].staffEntries[0].LyricsEntries;
        expect(firstSyllables.length).to.equal(3);
        const left: number = syllableLeft(line, 1, 0, 0);
        for (let i: number = 0; i < 3; i++) {
            const shape: BoundingBox = labels[i].PositionAndShape;
            expect(shape.RelativePosition.x, "right-aligned one margin left of the syllable")
                .to.be.closeTo(left - osmd.EngravingRules.LyricVerseNumberXMargin, 1e-6);
            expect(shape.RelativePosition.x).to.be.closeTo(labels[0].PositionAndShape.RelativePosition.x, 1e-9);
            expect(shape.BorderMarginLeft).to.be.lessThan(0);
            expect(shape.BorderMarginRight).to.be.at.most(osmd.EngravingRules.LyricVerseNumberXMargin);
            expect(shape.RelativePosition.y, "on the baseline of its own verse")
                .to.be.closeTo(firstSyllables[i].GraphicalLabel.PositionAndShape.RelativePosition.y, 1e-6);
            expect(labels[i].Label.fontHeight).to.equal(osmd.EngravingRules.LyricsHeight);
        }
        expect(labels[0].PositionAndShape.RelativePosition.y).to.be.lessThan(labels[2].PositionAndShape.RelativePosition.y);
        const x: number = labels[2].PositionAndShape.RelativePosition.x;
        expect(line.SkyBottomLineCalculator.getBottomLineMaxInRange(x + labels[2].PositionAndShape.BorderMarginLeft, x),
            "the label width is reserved in the bottom line")
            .to.be.at.least(labels[2].PositionAndShape.RelativePosition.y - 1e-6);
    });

    it("(a2) a short first syllable (shifted right) keeps the numbers in one column", async () => {
        osmd.EngravingRules.LyricsExtraXShiftForShortLyricsWidthThreshold = 2.5;
        await render(xml(threeVerses).replace("<text>Was</text>", "<text>O</text>"));
        const line: StaffLine = staffLine(0);
        const lefts: number[] = [0, 1, 2].map(v => syllableLeft(line, 1, 0, v));
        expect(lefts[1], "the short O is shifted right").to.be.greaterThan(lefts[0]);
        const labels: GraphicalLabel[] = line.LyricVerseNumberLabels;
        expect(texts(labels)).to.deep.equal(["1.", "2.", "3."]);
        for (const label of labels) {
            expect(label.PositionAndShape.RelativePosition.x).to.be.closeTo(Math.min(...lefts) - osmd.EngravingRules.LyricVerseNumberXMargin, 1e-6);
        }
    });

    it("(b) a single verse gets no label", async () => {
        const score: string = xml(threeVerses).replace(/<lyric number="[23]">.*?<\/lyric>/g, "");
        expect(score).to.not.contain("<lyric number=\"2\"");
        await render(score);
        expect(allLabels()).to.have.lengthOf(0);
    });

    it("(c) a verse whose first syllable embeds \"1. \" keeps its text and gets no label", async () => {
        await render(xml(threeVerses).replace("<text>Wie</text>", "<text>1. Wie</text>"));
        const line: StaffLine = staffLine(0);
        expect(texts(line.LyricVerseNumberLabels)).to.deep.equal(["2.", "3."]);
        expect(line.Measures[1].staffEntries[0].LyricsEntries[0].GraphicalLabel.Label.text).to.equal("1. Wie");
    });

    it("(c2) a bare number or \"N word\" as the first syllable also counts as embedded", async () => {
        await render(xml(threeVerses).replace("<text>Was</text>", "<text>2</text>").replace("<text>Er</text>", "<text>3 Er</text>"));
        const line: StaffLine = staffLine(0);
        expect(texts(line.LyricVerseNumberLabels)).to.deep.equal(["1."]);
        expect(line.Measures[1].staffEntries[0].LyricsEntries.map(entry => entry.GraphicalLabel.Label.text)).to.deep.equal(["Wie", "2", "3 Er"]);
    });

    it("(d) non-numeric and chorus lines get no label, the numeric line does", async () => {
        await render(xml(threeVerses).replace(/number="3"/g, "number=\"chorus\"").replace(/number="2"/g, "number=\"part1verse2\""));
        expect(texts(allLabels())).to.deep.equal(["1."]);
    });

    it("(e) first syllable on the first note: the label stays right of the staff start and moves nothing", async () => {
        await render(xml(firstNote));
        const line: StaffLine = staffLine(0);
        const labels: GraphicalLabel[] = line.LyricVerseNumberLabels;
        expect(texts(labels)).to.deep.equal(["1.", "2.", "3."]);
        for (const label of labels) {
            const shape: BoundingBox = label.PositionAndShape;
            expect(shape.RelativePosition.x + shape.BorderMarginLeft).to.be.at.least(0);
            expect(shape.RelativePosition.x).to.be.at.most(syllableLeft(line, 0, 0, 0) + 1e-6);
        }
        const withLabels: number[] = measureWidths(line);
        const withLabelsLeft: number = syllableLeft(line, 0, 0, 0);
        expect(systems().length).to.equal(1);
        await render(xml(firstNote), false);
        expect(systems().length).to.equal(1);
        expect(measureWidths(staffLine(0))).to.deep.equal(withLabels);
        expect(syllableLeft(staffLine(0), 0, 0, 0)).to.equal(withLabelsLeft);
    });

    it("(f) only the system with the first syllable carries the labels", async () => {
        await render(xml(threeVerses));
        expect(systems().length).to.equal(2);
        expect(staffLine(0).LyricVerseNumberLabels.length).to.equal(3);
        expect(staffLine(1).LyricVerseNumberLabels).to.have.lengthOf(0);
        const widths: number[] = measureWidths(staffLine(0));
        await render(xml(threeVerses), false);
        expect(systems().length).to.equal(2);
        expect(measureWidths(staffLine(0))).to.deep.equal(widths);
    });

    it("(g) RenderLyricVerseNumbers=false draws none", async () => {
        await render(xml(threeVerses), false);
        expect(allLabels()).to.have.lengthOf(0);
    });

    it("draws the labels into the SVG with the lyrics", async () => {
        await render(xml(threeVerses));
        const nodes: NodeListOf<Element> = container.querySelectorAll("g.verse-number");
        expect(nodes.length).to.equal(3);
        expect(Array.from(nodes).map(node => node.textContent.trim())).to.deep.equal(["1.", "2.", "3."]);
    });
});
