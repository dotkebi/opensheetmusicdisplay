import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { PointF2D } from "../../../src/Common/DataObjects/PointF2D";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Two slurs both broken by the same system break (Alma del core, piano m49-52: the slur from the m49 chord to the m52 chord
 * over the slur from the m50 E5 to the m51 D5, with the E5 tied over): their pieces continued at the start of the next system,
 * and those continued to the end of the system before it, are stacked as the slurs are nested - the outer slur's piece outside
 * the inner one's, as in the print. Each continued piece took its height at the system edge from its own other end only
 * (1 unit out), so the outer piece, ending at a lower chord, started 1.7 units inside the inner one and crossed it (and ended
 * 0.5 units inside it at the end of the system before).
 * Same as osmd-dart test/split_slur_continuation_crossing_test.dart.
 */
describe("Slurs continued at the same system edge", () => {
    const steps: string = "CDEFGAB";

    /** [step, octave] mirrored about the staff's middle line B4 for the slurs below */
    function mirror(step: string, octave: number): [string, number] {
        const index: number = 68 - (octave * 7 + steps.indexOf(step));
        return [steps[index % 7], Math.floor(index / 7)];
    }

    function chord(pitches: string[], type: string, duration: number, below: boolean,
                   options: { dot?: boolean, tieStart?: boolean, tieStop?: boolean, slurs?: string } = {}): string {
        let result: string = "";
        pitches.forEach((pitch, i) => {
            let step: string = pitch[0];
            let octave: number = Number(pitch.substring(1));
            if (below) {
                [step, octave] = mirror(step, octave);
            }
            const ties: string[] = [];
            if (options.tieStop) {
                ties.push("stop");
            }
            if (options.tieStart) {
                ties.push("start");
            }
            const notations: string = ties.map(t => `<tied type="${t}"/>`).join("") + (i === 0 ? options.slurs ?? "" : "");
            result += `<note>${i === 0 ? "" : "<chord/>"}<pitch><step>${step}</step><octave>${octave}</octave></pitch>` +
                `<duration>${duration}</duration>${ties.map(t => `<tie type="${t}"/>`).join("")}` +
                `<voice>1</voice><type>${type}</type>${options.dot ? "<dot/>" : ""}<stem>${below ? "down" : "up"}</stem>` +
                `${notations ? `<notations>${notations}</notations>` : ""}</note>`;
        });
        return result;
    }

    function score(below: boolean, outer: boolean = true, inner: boolean = true): string {
        const side: string = below ? "below" : "above";
        const start: (n: number) => string = n => `<slur type="start" number="${n}" placement="${side}"/>`;
        const stop: (n: number) => string = n => `<slur type="stop" number="${n}"/>`;
        const m1: string = chord(["G4", "D5"], "quarter", 2, below, { slurs: outer ? start(1) : "" }) +
            chord(["A4", "C5"], "quarter", 2, below) + chord(["D4", "B4"], "quarter", 2, below);
        const m2: string = chord(["C5"], "quarter", 2, below) + chord(["D5"], "quarter", 2, below) +
            chord(["E5"], "quarter", 2, below, { tieStart: true, slurs: inner ? start(2) : "" });
        const m3: string = chord(["E5"], "eighth", 1, below, { tieStop: true }) +
            chord(["D5"], "eighth", 1, below, { slurs: inner ? stop(2) : "" }) +
            chord(["C4", "E4", "C5"], "quarter", 2, below) + chord(["B3", "E4", "G4", "B4"], "quarter", 2, below);
        const m4: string = chord(["C4", "E4", "A4"], "half", 6, below, { dot: true, slurs: outer ? stop(1) : "" });
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\">" +
            "<part-list><score-part id=\"P1\"><part-name>Piano</part-name></score-part></part-list><part id=\"P1\">" +
            "<measure number=\"1\"><attributes><divisions>2</divisions><key><fifths>0</fifths></key><time><beats>3</beats>" +
            `<beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>${m1}</measure>` +
            `<measure number="2">${m2}</measure><measure number="3"><print new-system="yes"/>${m3}</measure>` +
            `<measure number="4">${m4}</measure></part></score-partwise>`;
    }

    async function render(below: boolean, outer: boolean = true, inner: boolean = true): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg", newSystemFromXML: true });
        await osmd.load(score(below, outer, inner));
        osmd.render();
        return osmd;
    }

    /** the pieces on the staff line with the measure, each undefined without its slur */
    function pieces(osmd: OpenSheetMusicDisplay, measure: number): { outer: GraphicalSlur, inner: GraphicalSlur } {
        for (const system of osmd.GraphicSheet.MusicPages[0].MusicSystems) {
            const line: StaffLine = system.StaffLines[0];
            if (!line.Measures.some(m => m.MeasureNumber === measure)) {
                continue;
            }
            const piece: (startMeasure: number) => GraphicalSlur = (startMeasure) =>
                line.GraphicalSlurs.filter(s => s.slur.StartNote.SourceMeasure.MeasureNumber === startMeasure)[0];
            return { outer: piece(1), inner: piece(2) };
        }
        throw new Error(`no staff line with measure ${measure}`);
    }

    function points(slur: GraphicalSlur): PointF2D[] {
        const result: PointF2D[] = [];
        for (let i: number = 0; i <= 200; i++) {
            result.push(slur.calculateCurvePointAtIndex(i / 200));
        }
        return result;
    }

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

    /** the least distance of the outer piece outside the inner one where both are (negative: the inner one reaches over it) */
    function minGap(outer: GraphicalSlur, inner: GraphicalSlur, below: boolean): number {
        const outerPoints: PointF2D[] = points(outer);
        let gap: number = Infinity;
        for (const p of points(inner)) {
            const outerY: number = yAt(outerPoints, p.x);
            if (outerY === undefined) {
                continue;
            }
            gap = Math.min(gap, below ? outerY - p.y : p.y - outerY);
        }
        return gap;
    }

    for (const below of [false, true]) {
        const side: string = below ? "below" : "above";

        it(`puts the measures on two systems (${side})`, async () => {
            const osmd: OpenSheetMusicDisplay = await render(below);
            const systems: any[] = osmd.GraphicSheet.MusicPages[0].MusicSystems;
            expect(systems.length).to.equal(2);
            expect(systems[1].StaffLines[0].Measures[0].MeasureNumber).to.equal(3);
        });

        for (const measure of [2, 3]) {
            const edge: string = measure === 3 ? "system start" : "system end";

            it(`draws the outer piece outside the inner one at the ${edge} (${side}), 0.5 units apart`, async () => {
                const { outer, inner } = pieces(await render(below), measure);
                const gap: number = minGap(outer, inner, below);
                expect(gap).to.be.at.least(0.5, `the inner piece reaches ${-gap} units over the outer`);
            });

            it(`keeps the inner piece as without the outer slur at the ${edge} (${side})`, async () => {
                const inner: GraphicalSlur = pieces(await render(below), measure).inner;
                const alone: GraphicalSlur = pieces(await render(below, false), measure).inner;
                for (const [a, b] of [[inner.bezierStartPt, alone.bezierStartPt], [inner.bezierEndPt, alone.bezierEndPt]]) {
                    expect(a.x).to.be.closeTo(b.x, 0.2);
                    expect(a.y).to.be.closeTo(b.y, 0.2);
                }
            });

            it(`keeps a piece continued alone 1 unit out from its other end at the ${edge} (${side})`, async () => {
                const outer: GraphicalSlur = pieces(await render(below, true, false), measure).outer;
                const out: number = below ? 1 : -1;
                if (measure === 3) {
                    expect(outer.bezierStartPt.y).to.be.closeTo(outer.bezierEndPt.y + out, 1e-9);
                } else {
                    expect(outer.bezierEndPt.y).to.be.closeTo(outer.bezierStartPt.y + out, 1e-9);
                }
            });
        }
    }
});
