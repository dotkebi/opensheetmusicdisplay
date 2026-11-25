import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

/**
 * A note symbol between words (<symbol>metNoteHalfUp</symbol>, read as U+1D15E) is drawn with the notation font, as a
 * metronome mark's note: text fonts rarely have the Unicode Musical Symbols block, and it was a missing-glyph box
 * (Vieuxtemps, Grand Concerto Op. 31 m562 "Tempo I.mo Metron:" and a dotted half note; user decision 11-26). The text around
 * it stays text, in the room the layout measured for the character. Same as osmd-dart test/words_note_symbol_glyph_test.dart.
 */
describe("Words note symbol glyph", () => {
    const xml: string = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list>" +
        "<score-part id=\"P1\"><part-name>Violin</part-name></score-part></part-list><part id=\"P1\"><measure number=\"1\">" +
        "<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>" +
        "<clef><sign>G</sign><line>2</line></clef></attributes>" +
        "<direction placement=\"above\"><direction-type><words>Tempo I.mo Metron:</words><symbol>metNoteHalfUp</symbol>" +
        "<symbol>metAugmentationDot</symbol></direction-type></direction>" +
        "<note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>" +
        "</measure></part></score-partwise>";

    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        container.style.width = "800px";
        osmd = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
        await osmd.load(xml);
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    function texts(): SVGTextElement[] {
        return Array.from(container.querySelectorAll("text"));
    }

    it("draws no Unicode note character, the words and the dot stay text", () => {
        expect(texts().some(t => /[\u{1D15D}-\u{1D164}]/u.test(t.textContent))).to.equal(false);
        const words: SVGTextElement = texts().find(t => t.textContent === "Tempo I.mo Metron:");
        const dot: SVGTextElement = texts().find(t => t.textContent === "·");
        expect(words).to.not.equal(undefined);
        expect(dot).to.not.equal(undefined);
        expect(dot.getBBox().x).to.be.greaterThan(words.getBBox().x + words.getBBox().width);
    });

    it("draws the half note (notehead and stem) between the words and the dot", () => {
        const words: DOMRect = texts().find(t => t.textContent === "Tempo I.mo Metron:").getBBox();
        const dot: DOMRect = texts().find(t => t.textContent === "·").getBBox();
        const between: (box: DOMRect) => boolean = (box: DOMRect) =>
            box.x >= words.x + words.width - 0.5 && box.x + box.width <= dot.x + 0.5 &&
            box.y + box.height > words.y && box.y < words.y + words.height + 5;
        const heads: SVGGraphicsElement[] = Array.from(container.querySelectorAll("path"))
            .filter((p: SVGGraphicsElement) => between(p.getBBox()));
        const stems: SVGGraphicsElement[] = Array.from(container.querySelectorAll("rect"))
            .filter((r: SVGGraphicsElement) => between(r.getBBox()) && r.getBBox().height > r.getBBox().width * 3);
        expect(heads.length).to.equal(1);
        expect(stems.length).to.equal(1);
        // the stem rises from the notehead's right side
        const head: DOMRect = heads[0].getBBox();
        const stem: DOMRect = stems[0].getBBox();
        expect(stem.x).to.be.closeTo(head.x + head.width, 2);
        expect(stem.y).to.be.lessThan(head.y);
    });
});
