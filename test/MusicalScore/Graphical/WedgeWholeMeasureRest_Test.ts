import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalContinuousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalContinuousDynamicExpression";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalInstantaneousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalInstantaneousDynamicExpression";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { MultiExpression } from "../../../src/MusicalScore/VoiceData/Expressions/MultiExpression";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Wedges on a staff with only a whole-measure rest, the other staff playing. VexFlow draws the rest in the middle of the measure,
 * and the wedge's x was taken from the entries of its own staff only: a start at the start of the measure began at the middle
 * (Enescu, Concertstück, Piano m109), a stop inside the measure went to its end (Glière, Horn Concerto Op. 91 III, Piano m98). The
 * x of the time comes from the other staves of the system. A diminuendo started by an <offset> into a whole rest and stopped at the
 * next measure's start, which the reader leaves in that measure, is drawn to the barline as the other stops at a measure's start
 * (Enescu m1-2); its playback end stays. Same as osmd-dart test/wedge_whole_measure_rest_test.dart.
 */
describe("Wedge on a staff with only a whole-measure rest", () => {
    function note(step: string, octave: number, duration: number, type: string, staff: number): string {
        return `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${duration}</duration>` +
            `<voice>${staff === 1 ? 1 : 5}</voice><type>${type}</type><staff>${staff}</staff></note>`;
    }
    function wholeRest(duration: number): string {
        return `<note><rest measure="yes"/><duration>${duration}</duration><voice>1</voice><staff>1</staff></note>`;
    }
    function wedgeXml(type: string, offset?: number): string {
        return `<direction placement="below"><direction-type><wedge type="${type}"/></direction-type>` +
            `${offset === undefined ? "" : `<offset>${offset}</offset>`}<staff>1</staff></direction>`;
    }
    const p: string = "<direction placement=\"below\"><direction-type><dynamics><p/></dynamics></direction-type>" +
        "<staff>1</staff></direction>";
    function attributes(beats: number): string {
        return `<attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>${beats}</beats>` +
            "<beat-type>4</beat-type></time><staves>2</staves><clef number=\"1\"><sign>G</sign><line>2</line></clef>" +
            "<clef number=\"2\"><sign>F</sign><line>4</line></clef></attributes>";
    }
    // the left hand in quarters (4/4) or eighths (2/4)
    function leftHand(beats: number): string {
        return ["C", "D", "E", "F"].map(s => beats === 4 ? note(s, 3, 4, "quarter", 2) : note(s, 3, 2, "eighth", 2)).join("");
    }
    function score(beats: number, rightHandDirections: string[]): string {
        const duration: number = beats * 4;
        const measures: string = [0, 1, 2].map(i =>
            `<measure number="${i + 1}">${i === 0 ? attributes(beats) : ""}${rightHandDirections[i]}${wholeRest(duration)}` +
            `<backup><duration>${duration}</duration></backup>${leftHand(beats)}</measure>`).join("");
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list><score-part id=\"P1\">" +
            `<part-name>Piano</part-name></score-part></part-list><part id="P1">${measures}</part></score-partwise>`;
    }

    function render(source: string): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        return osmd.load(source).then(() => {
            osmd.render();
            return osmd;
        });
    }
    function wedge(osmd: OpenSheetMusicDisplay): GraphicalContinuousDynamicExpression {
        const found: GraphicalContinuousDynamicExpression[] = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0]
            .AbstractExpressions.filter(e => e instanceof GraphicalContinuousDynamicExpression) as GraphicalContinuousDynamicExpression[];
        expect(found.length).to.equal(1);
        return found[0];
    }
    function left(w: GraphicalContinuousDynamicExpression): number {
        return Math.min(...w.Lines.map(l => Math.min(l.Start.x, l.End.x)));
    }
    function right(w: GraphicalContinuousDynamicExpression): number {
        return Math.max(...w.Lines.map(l => Math.max(l.Start.x, l.End.x)));
    }
    function measure(osmd: OpenSheetMusicDisplay, index: number, staff: number): GraphicalMeasure {
        return osmd.GraphicSheet.MeasureList[index][staff];
    }
    function entryX(m: GraphicalMeasure, timestamp: number): number {
        const entry: GraphicalStaffEntry = m.staffEntries.find(e => Math.abs(e.relInMeasureTimestamp.RealValue - timestamp) < 1e-9);
        return m.PositionAndShape.RelativePosition.x + entry.PositionAndShape.RelativePosition.x;
    }
    function measureEnd(m: GraphicalMeasure): number {
        return m.PositionAndShape.RelativePosition.x + m.PositionAndShape.BorderRight;
    }

    it("starts a wedge over a whole-measure rest at the time of its start on the other staff", async () => {
        // m2: crescendo at the start, stopped at the end of the measure
        const osmd: OpenSheetMusicDisplay = await render(score(4, ["", `${wedgeXml("crescendo")}${wedgeXml("stop", 16)}`, ""]));
        const leftHandFirst: number = entryX(measure(osmd, 1, 1), 0);
        const rest: number = entryX(measure(osmd, 1, 0), 0);
        expect(left(wedge(osmd))).to.be.closeTo(leftHandFirst, 0.05, `the rest (middle of the measure) ${rest}`);
    });

    it("puts a dynamic over a whole-measure rest at the time of its start, the wedge after it (Enescu m109 \"p <\")", async () => {
        const osmd: OpenSheetMusicDisplay = await render(score(4, ["", `${p}${wedgeXml("crescendo")}${wedgeXml("stop", 16)}`, ""]));
        const leftHandFirst: number = entryX(measure(osmd, 1, 1), 0);
        const rest: number = entryX(measure(osmd, 1, 0), 0);
        const box: BoundingBox = (osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0].AbstractExpressions
            .find(e => e instanceof GraphicalInstantaneousDynamicExpression) as GraphicalInstantaneousDynamicExpression).PositionAndShape;
        const pLeft: number = box.RelativePosition.x + box.BorderLeft;
        const pRight: number = box.RelativePosition.x + box.BorderRight;
        expect(leftHandFirst).to.be.within(pLeft - 0.5, pRight, `p ${pLeft}..${pRight}, the rest ${rest}`);
        expect(left(wedge(osmd))).to.be.within(pRight, rest - 1, `p right ${pRight}, the rest ${rest}`);
    });

    it("ends a wedge stopped inside a whole-measure rest before the time of its stop on the other staff", async () => {
        // 2/4, m1 q0 crescendo to m2 q0.5 (the left hand's second eighth)
        const osmd: OpenSheetMusicDisplay = await render(score(2, [wedgeXml("crescendo"), wedgeXml("stop", 2), ""]));
        const margin: number = osmd.EngravingRules.WedgeHorizontalMargin;
        const secondEighth: number = entryX(measure(osmd, 1, 1), 0.125);
        expect(right(wedge(osmd))).to.be.closeTo(secondEighth - margin, 0.05, `measure end ${measureEnd(measure(osmd, 1, 0))}`);
        expect(left(wedge(osmd))).to.be.closeTo(entryX(measure(osmd, 0, 1), 0), 1.5);
    });

    it("ends a wedge from an offset into a whole rest, stopped at the next measure's start, at the barline", async () => {
        // m1: diminuendo from q2 (offset 8) to m2 q0
        const osmd: OpenSheetMusicDisplay = await render(score(4, [wedgeXml("diminuendo", 8), wedgeXml("stop"), ""]));
        const margin: number = osmd.EngravingRules.WedgeHorizontalMargin;
        const w: GraphicalContinuousDynamicExpression = wedge(osmd);
        expect(right(w)).to.be.closeTo(measureEnd(measure(osmd, 0, 0)) - margin, 0.05);
        expect(left(w)).to.be.closeTo(entryX(measure(osmd, 0, 1), 0.5), 1.5);
        // the playback end stays at m2 q0
        const end: MultiExpression = w.ContinuousDynamic.EndMultiExpression;
        expect(end.SourceMeasureParent.MeasureNumberXML).to.equal(2);
        expect(end.Timestamp.RealValue).to.equal(0);
    });
});
