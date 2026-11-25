import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../Util/TestUtils";

/**
 * <rehearsal enclosure="circle"> is drawn in a circle, not in the box (Nielsen, Clarinet Concerto Op. 57: rehearsal 1-7
 * are circled in the print and were boxed). The circle is centred on the box it replaces, its diameter the box's longer
 * side. The default (no enclosure) and "rectangle" keep the box, "none" draws the text only. Same rule as osmd-dart
 * test/rehearsal_enclosure_circle_test.dart (fixture test_rehearsal_enclosure_circle.musicxml: the same marks A-D).
 */
describe("Rehearsal enclosure circle", () => {
    function scoreXml(enclosures: string[]): string {
        let measures: string = "";
        enclosures.forEach((enclosure: string, i: number) => {
            const attribute: string = enclosure ? ` enclosure="${enclosure}"` : "";
            measures += `<measure number="${i + 1}">` +
                (i === 0 ? "<attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats>" +
                    "<beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>" : "") +
                `<direction placement="above"><direction-type><rehearsal${attribute}>${"ABCD"[i]}</rehearsal></direction-type></direction>` +
                "<note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>whole</type></note></measure>";
        });
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list>" +
            "<score-part id=\"P1\"><part-name>Clarinet</part-name></score-part></part-list>" +
            `<part id="P1">${measures}</part></score-partwise>`;
    }
    /** For each rehearsal mark group: [its text, rect count, arc path count]. */
    function marks(div: HTMLElement): [string, number, number][] {
        return Array.from(div.querySelectorAll("g.vf-stavesection")).map((g: Element) => [
            g.textContent.trim(),
            g.querySelectorAll("rect").length,
            Array.from(g.querySelectorAll("path")).filter((p: Element) => / A/.test(p.getAttribute("d") ?? "")).length,
        ]);
    }

    it("draws a circle for enclosure circle, a box otherwise, nothing for none", () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1200px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        return osmd.load(scoreXml(["circle", "", "rectangle", "none"])).then(() => {
            osmd.render();
            const drawn: [string, number, number][] = marks(div);
            expect(drawn.map(m => m[0])).to.deep.equal(["A", "B", "C", "D"]);
            expect(drawn[0]).to.deep.equal(["A", 0, 1]);
            expect(drawn[1]).to.deep.equal(["B", 1, 0]);
            expect(drawn[2]).to.deep.equal(["C", 1, 0]);
            expect(drawn[3]).to.deep.equal(["D", 0, 0]);
        });
    });

    it("centres the circle on the box it replaces, the box's longer side across", () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1200px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        return osmd.load(scoreXml(["circle", ""])).then(() => {
            osmd.render();
            const groups: Element[] = Array.from(div.querySelectorAll("g.vf-stavesection"));
            const circle: DOMRect = (groups[0].querySelector("path") as SVGGraphicsElement).getBBox();
            const box: DOMRect = (groups[1].querySelector("rect") as SVGGraphicsElement).getBBox();
            const text0: DOMRect = (groups[0].querySelector("text") as SVGGraphicsElement).getBBox();
            // a circle: as wide as high, at least the box's longer side
            expect(circle.width).to.be.closeTo(circle.height, 0.5);
            expect(circle.width).to.be.closeTo(Math.max(box.width, box.height), 0.5);
            // the box's vertical centre (both marks stand at the same height over the same staff)
            expect(circle.y + circle.height / 2).to.be.closeTo(box.y + box.height / 2, 0.5);
            // the text inside the circle
            expect(text0.x).to.be.greaterThan(circle.x);
            expect(text0.x + text0.width).to.be.lessThan(circle.x + circle.width);
        });
    });
});
