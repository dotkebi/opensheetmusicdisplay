import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { PointF2D } from "../../../src/Common/DataObjects/PointF2D";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A slur continued on the next system and a slur inside it from that system's first note to the same end note (Alma del core,
 * piano m89-90: the slur from the m89 chord to the m90 C#5 over the slur A4-C#5): the continued piece goes over the inner slur,
 * which keeps the height it has without the system break. Both pieces cover the same time, and the continued piece was placed
 * first (by the order of the staff line), so the inner slur rose over it into a high arch, crossing it at the end note.
 * Same as osmd-dart test/split_slur_inner_slur_test.dart.
 */
describe("Slur inside a slur continued on the next system", () => {
    function note(step: string, octave: number, type: string, duration: number,
                  options: { alter?: string, dot?: boolean, extra?: string, chord?: boolean } = {}): string {
        return `<note>${options.chord ? "<chord/>" : ""}<pitch><step>${step}</step>${options.alter ?? ""}<octave>${octave}</octave>` +
            `</pitch><duration>${duration}</duration><voice>1</voice><type>${type}</type>${options.dot ? "<dot/>" : ""}` +
            `<stem>up</stem>${options.extra ?? ""}</note>`;
    }
    function score(systemBreak: boolean, outerSlur: boolean = true): string {
        const outerStart: string = outerSlur ? "<notations><slur type=\"start\" number=\"1\" placement=\"above\"/></notations>" : "";
        const m1: string = note("E", 4, "half", 4, { extra: outerStart }) +
            note("A", 4, "half", 4, { chord: true }) + note("C", 5, "half", 4, { chord: true }) +
            note("D", 4, "quarter", 2) + note("B", 4, "quarter", 2, { chord: true });
        const m2: string = note("A", 4, "quarter", 3,
                                { dot: true, extra: "<notations><slur type=\"start\" number=\"2\" placement=\"above\"/></notations>" }) +
            note("B", 4, "eighth", 1) +
            note("C", 5, "quarter", 2, {
                alter: "<alter>1</alter>",
                extra: `<notations><slur type="stop" number="2"/>${outerSlur ? "<slur type=\"stop\" number=\"1\"/>" : ""}</notations>`,
            });
        const m3: string = note("A", 4, "half", 4, { dot: true });
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\">" +
            "<part-list><score-part id=\"P1\"><part-name>Piano</part-name></score-part></part-list><part id=\"P1\">" +
            "<measure number=\"1\"><attributes><divisions>2</divisions><key><fifths>3</fifths></key><time><beats>3</beats>" +
            `<beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>${m1}</measure>` +
            `<measure number="2">${systemBreak ? "<print new-system=\"yes\"/>" : ""}${m2}</measure>` +
            `<measure number="3">${m3}</measure></part></score-partwise>`;
    }

    async function render(systemBreak: boolean, outerSlur: boolean = true): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg", newSystemFromXML: true });
        await osmd.load(score(systemBreak, outerSlur));
        osmd.render();
        return osmd;
    }

    /** the staff line of measure 2 and its slur pieces there */
    function pieces(osmd: OpenSheetMusicDisplay): { line: StaffLine, outer: GraphicalSlur, inner: GraphicalSlur } {
        for (const system of osmd.GraphicSheet.MusicPages[0].MusicSystems) {
            const line: StaffLine = system.StaffLines[0];
            if (!line.Measures.some(m => m.MeasureNumber === 2)) {
                continue;
            }
            const piece: (startMeasure: number) => GraphicalSlur = (startMeasure) =>
                line.GraphicalSlurs.filter(s => s.slur.StartNote.SourceMeasure.MeasureNumber === startMeasure)[0];
            return { line, outer: piece(1), inner: piece(2) };
        }
        throw new Error("no staff line with measure 2");
    }

    function points(slur: GraphicalSlur): PointF2D[] {
        const result: PointF2D[] = [];
        for (let i: number = 0; i <= 200; i++) {
            result.push(slur.calculateCurvePointAtIndex(i / 200));
        }
        return result;
    }

    /** the y of the curve at x (linear between its sampled points), undefined outside */
    function yAt(curve: PointF2D[], x: number): number {
        for (let i: number = 1; i < curve.length; i++) {
            const a: PointF2D = curve[i - 1];
            const b: PointF2D = curve[i];
            if (x >= a.x && x <= b.x) {
                return b.x === a.x ? a.y : a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x);
            }
        }
        return undefined;
    }

    function top(slur: GraphicalSlur): number {
        return Math.min(...points(slur).map(p => p.y));
    }

    it("ends the inner slur at its note, as without the outer slur", async () => {
        // (the offset of a second slur ending at a note is for the longer one only)
        for (const systemBreak of [false, true]) {
            const inner: GraphicalSlur = pieces(await render(systemBreak)).inner;
            const alone: GraphicalSlur = pieces(await render(systemBreak, false)).inner;
            expect(inner.bezierEndPt.y).to.be.closeTo(alone.bezierEndPt.y, 0.01, `system break ${systemBreak}`);
        }
    });

    it("puts the measures on two systems with the break, one without", async () => {
        expect(pieces(await render(true)).line.Measures[0].MeasureNumber).to.equal(2);
        expect(pieces(await render(false)).line.Measures[0].MeasureNumber).to.equal(1);
    });

    it("draws the continued piece over the inner slur, 0.5 units apart", async () => {
        const { outer, inner } = pieces(await render(true));
        const outerPoints: PointF2D[] = points(outer);
        let minGap: number = Infinity;
        for (const p of points(inner)) {
            const outerY: number = yAt(outerPoints, p.x);
            if (outerY === undefined) {
                continue;
            }
            // (y down: the outer piece above has the smaller y)
            minGap = Math.min(minGap, p.y - outerY);
        }
        expect(minGap).to.be.at.least(0.5, `the inner slur reaches ${-minGap} units over the outer one`);
    });

    it("keeps the inner slur as high as without the system break", async () => {
        const broken: GraphicalSlur = pieces(await render(true)).inner;
        const whole: GraphicalSlur = pieces(await render(false)).inner;
        const rise: number = (top(broken) - broken.bezierStartPt.y) - (top(whole) - whole.bezierStartPt.y);
        expect(Math.abs(rise)).to.be.at.most(0.5, `inner slur top ${top(broken)} with the break, ${top(whole)} without`);
    });
});
