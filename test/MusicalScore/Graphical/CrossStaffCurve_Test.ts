import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { CrossStaffCurve } from "../../../src/MusicalScore/Graphical/VexFlow/CrossStaffCurve";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { PointF2D } from "../../../src/Common/DataObjects/PointF2D";

/**
 * Slurs and ties between the two staves of a piano part in one system, one curve each between the placed staves
 * (CrossStaffCurve, PLAN-cross-staff-beam (4)). Same fixture and checks as osmd-dart test/cross_staff_curve_test.dart.
 *
 * Fixture test_cross_staff_curves.musicxml (synthetic, piano, 4/4): m1 a cross-staff beam (LH A3 up, RH D4 F4 A4 down)
 * under a slur from the A3 to the A4, placed below, over a whole note of another voice on the left hand (Myrthen 1
 * m4); m2->m3 a tie from the right hand's B3 to the left hand's (one voice); m4 a slur without placement from the right
 * hand's E5 down to the left hand's C3, its notes between (A2, G2) below the line from end to end; m5 a slur placed above
 * from the left hand's last thirty-second E3 (stem up, beamed) to the right hand's D4 right after it (Myrthen 17); m6 a
 * slur without placement from the left hand's sixteenth D3-B3 to the right hand's lower voice's D4 (stem down) under a
 * half note G4 of its upper voice (Myrthen 17 m3); m7 a slur without placement from the left hand's sixteenth B2 (stem
 * up, beamed) to the bottom A3 of the right hand's chord A3-D#4-A4 (stem up) right after it, wider than half the way up
 * (Myrthen 17 m15; hidden thirty-second rests around the sixteenth widen the spacing here), and a second slur between
 * the same notes placed above.
 */
describe("Curves between staves", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    const load: () => Promise<void> = async () => {
        container = TestUtils.getDivElement(document);
        container.style.width = "1400px";
        osmd = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore("test_cross_staff_curves.musicxml"));
    };
    beforeEach(async () => {
        await load();
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });
    const measureAt: (index: number, staff: number) => VexFlowMeasure =
        (index: number, staff: number) => osmd.GraphicSheet.MeasureList[index][staff] as VexFlowMeasure;
    const curvesStartingIn: (index: number) => CrossStaffCurve[] = (index: number) => {
        const curves: CrossStaffCurve[] = [];
        for (const curve of [...measureAt(index, 0).crossStaffCurves, ...measureAt(index, 1).crossStaffCurves]) {
            if (curves.indexOf(curve) < 0 && curve.startNote.sourceNote.SourceMeasure.measureListIndex === index) {
                curves.push(curve);
            }
        }
        return curves;
    };
    /** the curve's y at x (the sample nearest to it) */
    const yAt: (curve: CrossStaffCurve, x: number) => number = (curve: CrossStaffCurve, x: number) => {
        let best: PointF2D = curve.sample()[0];
        for (const point of curve.sample(64)) {
            if (Math.abs(point.x - x) < Math.abs(best.x - x)) {
                best = point;
            }
        }
        return best.y;
    };

    it("is one system, a curve per slur and tie", () => {
        expect(osmd.GraphicSheet.MusicPages[0].MusicSystems.length).to.equal(1);
        expect(curvesStartingIn(0).length).to.equal(1);
        expect(curvesStartingIn(1).length).to.equal(1);
        expect(curvesStartingIn(3).length).to.equal(1);
        expect(curvesStartingIn(1)[0].isTie).to.equal(true);
        // held by both staves' measures it spans
        const slur: CrossStaffCurve = curvesStartingIn(0)[0];
        expect(measureAt(0, 0).crossStaffCurves).to.include(slur);
        expect(measureAt(0, 1).crossStaffCurves).to.include(slur);
    });

    it("a slur under a cross-staff beam: from the left-hand notehead to the right-hand stem, under the beam", () => {
        const curve: CrossStaffCurve = curvesStartingIn(0)[0];
        expect(curve.placement).to.equal(PlacementEnum.Below);
        expect(curve.unclearedObstacles).to.equal(0);
        const beam: any = measureAt(0, 1).crossStaffBeams[0];
        const notes: any[] = beam.notes;
        // the end: the right hand's A4, its down stem reaching the beam
        const a4: any = notes[notes.length - 1];
        expect(curve.endPoint.x).to.be.closeTo(a4.getStemX() / 10, 0.01);
        expect(curve.endPoint.y).to.be.closeTo(a4.getStemExtents().topY / 10 + 0.5, 0.01);
        // the start: under the left hand's A3 notehead
        expect(curve.startPoint.y).to.be.closeTo(notes[0].getYs()[0] / 10 + 1, 0.01);
        // under the beam between them: each stem's end, beam lines under it
        for (const note of notes.slice(1, notes.length - 1)) {
            const x: number = note.getStemX() / 10;
            expect(yAt(curve, x), `under the beam at ${x}`).to.be.greaterThan(note.getStemExtents().topY / 10);
        }
        // not pushed under the left hand's whole note (another voice)
        const lowerTop: number = measureAt(0, 1).ParentStaffLine.PositionAndShape.AbsolutePosition.y;
        const maxY: number = Math.max(...curve.sample().map(p => p.y));
        expect(maxY, "over the D3 whole note (head top 1.5 under the top line)").to.be.lessThan(lowerTop + 1.5);
    });

    it("a tie from one staff to the other: one arch away from the stem, no stubs", () => {
        const curve: CrossStaffCurve = curvesStartingIn(1)[0];
        expect(curve.segments.length).to.equal(1);
        expect(curve.placement, "B3 stem up").to.equal(PlacementEnum.Below);
        expect(measureAt(1, 0).vfTies.length, "no stub").to.equal(0);
        expect(measureAt(2, 1).vfTies.length, "no stub").to.equal(0);
        const p0: PointF2D = curve.startPoint;
        const p3: PointF2D = curve.endPoint;
        const length: number = Math.sqrt((p3.x - p0.x) ** 2 + (p3.y - p0.y) ** 2);
        const n: PointF2D = curve.outerNormal();
        const reach: number = Math.max(...curve.sample().map(p => (p.x - p0.x) * n.x + (p.y - p0.y) * n.y));
        expect(reach).to.be.closeTo(Math.min(1.5, Math.max(0.4, 0.36 + 0.082 * length)), 0.02);
    });

    it("a slur without placement bows away from its notes between", () => {
        const curve: CrossStaffCurve = curvesStartingIn(3)[0];
        expect(curve.placement).to.equal(PlacementEnum.Above);
        expect(curve.unclearedObstacles).to.equal(0);
    });

    it("a steep slur joins the notes' facing sides, bowing away from the start's stem", () => {
        expect(curvesStartingIn(4).length).to.equal(1);
        const curve: CrossStaffCurve = curvesStartingIn(4)[0];
        expect(curve.unclearedObstacles).to.equal(0);
        const start: any = (curve.startNote as any).vfnote[0];
        const end: any = (curve.endNote as any).vfnote[0];
        // from right of the sixteenth's stem, at its notehead (not its beam)
        expect(curve.startPoint.x).to.be.greaterThan(start.getStemX() / 10);
        expect(curve.startPoint.y).to.be.closeTo(start.getYs()[0] / 10 - 0.25, 0.01);
        // to under the D4 notehead (not over it, as the XML's above would)
        expect(curve.endPoint.y).to.be.greaterThan(end.getYs()[0] / 10 + 0.5);
        // bowing right of the line from end to end, as in the source
        expect(curve.placement).to.equal(PlacementEnum.Below);
        const mid: PointF2D = curve.sample(64)[32];
        const t: number = (mid.y - curve.startPoint.y) / (curve.endPoint.y - curve.startPoint.y);
        expect(mid.x).to.be.greaterThan(curve.startPoint.x + t * (curve.endPoint.x - curve.startPoint.x));
    });

    it("a steep slur to a lower voice's note joins the notes' facing sides, not along its stem over its notehead", () => {
        expect(curvesStartingIn(5).length).to.equal(1);
        const curve: CrossStaffCurve = curvesStartingIn(5)[0];
        expect(curve.unclearedObstacles).to.equal(0);
        const start: any = (curve.startNote as any).vfnote[0];
        const end: any = (curve.endNote as any).vfnote[0];
        expect(end.getStemDirection()).to.equal(-1);
        // steep at this width too: across less than half the way up
        const across: number = Math.abs((end.getNoteHeadBeginX() + end.getNoteHeadEndX()) - (start.getNoteHeadBeginX() + start.getNoteHeadEndX())) / 2;
        expect(across).to.be.lessThan(0.5 * Math.abs(end.getYs()[0] - start.getYs()[0]));
        // from right of the sixteenth's stem, at its notehead
        expect(curve.startPoint.x).to.be.greaterThan(start.getStemX() / 10);
        // to under the D4 notehead, at its stem's end (not over it, up along its stem as the usual curve above would)
        expect(curve.endPoint.y).to.be.greaterThan(end.getYs()[0] / 10 + 0.5);
        expect(curve.endPoint.y).to.be.at.least(end.getStemExtents().topY / 10);
        // bowing right of the line from end to end, as in the source
        expect(curve.placement).to.equal(PlacementEnum.Below);
        const mid: PointF2D = curve.sample(64)[32];
        const t: number = (mid.y - curve.startPoint.y) / (curve.endPoint.y - curve.startPoint.y);
        expect(mid.x).to.be.greaterThan(curve.startPoint.x + t * (curve.endPoint.x - curve.startPoint.x));
        expectClearOfRightHand(curve, 5);
    });

    /** m7's slurs: without placement, placed above */
    const m7: () => CrossStaffCurve[] = () => {
        const curves: CrossStaffCurve[] = curvesStartingIn(6);
        expect(curves.length).to.equal(2);
        const placed: (curve: CrossStaffCurve) => boolean =
            (curve: CrossStaffCurve) => curve.graphicalSlur.slur.PlacementXml === PlacementEnum.Above;
        return [curves.find(curve => !placed(curve)), curves.find(placed)];
    };

    it("a slur from beside its start's stem joins the notes' facing sides, however wide", () => {
        const curve: CrossStaffCurve = m7()[0];
        expect(curve.unclearedObstacles).to.equal(0);
        const start: any = (curve.startNote as any).vfnote[0];
        const end: any = (curve.endNote as any).vfnote[0];
        expect(start.getStemDirection()).to.equal(1);
        expect(end.getStemDirection()).to.equal(1);
        // wide at this width: across more than half the way up (the usual curve climbed along the chord's stem to its
        //   end)
        const index: number = (curve.endNote as any).vfnote[1] ?? 0;
        const across: number = Math.abs((end.getNoteHeadBeginX() + end.getNoteHeadEndX()) - (start.getNoteHeadBeginX() + start.getNoteHeadEndX())) / 2;
        expect(across).to.be.greaterThan(0.5 * Math.abs(end.getYs()[index] - start.getYs()[0]));
        // from right of the sixteenth's stem, at its notehead (not its beam)
        expect(curve.startPoint.x).to.be.greaterThan(start.getStemX() / 10);
        expect(curve.startPoint.y).to.be.closeTo(start.getYs()[0] / 10 - 0.25, 0.01);
        // to under the chord's A3, not over the chord at its stem's end
        expect(curve.endPoint.y).to.be.greaterThan(end.getYs()[index] / 10 + 0.5);
        // bowing right of the line from end to end, as in the source
        expect(curve.placement).to.equal(PlacementEnum.Below);
        const mid: PointF2D = curve.sample(64)[32];
        const t: number = (mid.y - curve.startPoint.y) / (curve.endPoint.y - curve.startPoint.y);
        expect(mid.x).to.be.greaterThan(curve.startPoint.x + t * (curve.endPoint.x - curve.startPoint.x));
        expectClearOfRightHand(curve, 6);
    });

    it("a wide slur from beside its start's stem keeps the side the XML gives", () => {
        const curve: CrossStaffCurve = m7()[1];
        const end: any = (curve.endNote as any).vfnote[0];
        // (wider than half the way up: only a steep slur's facing sides override the XML — the two slurs would run as
        //   one)
        expect(curve.placement).to.equal(PlacementEnum.Above);
        // the usual ends above: at the chord's stem's end, over its notes
        expect(curve.endPoint.x).to.be.closeTo(end.getStemX() / 10, 0.01);
        expect(curve.endPoint.y).to.be.lessThan(end.getStemExtents().topY / 10);
    });

    /** the curve clear of the right hand's notes in the measure, all voices: noteheads and stems (but at its end) */
    const expectClearOfRightHand: (curve: CrossStaffCurve, index: number) => void = (curve: CrossStaffCurve, index: number) => {
        for (const staffEntry of measureAt(index, 0).staffEntries) {
            for (const voiceEntry of staffEntry.graphicalVoiceEntries) {
                for (const note of voiceEntry.notes) {
                    const vfNote: any = (note as any).vfnote[0];
                    if (!vfNote?.getStemExtents) {
                        continue;
                    }
                    const left: number = vfNote.getNoteHeadBeginX() / 10;
                    const right: number = vfNote.getNoteHeadEndX() / 10;
                    const y: number = vfNote.getYs()[0] / 10;
                    const stemX: number = vfNote.getStemX() / 10;
                    const extents: any = vfNote.getStemExtents();
                    const stemFrom: number = Math.min(extents.topY, extents.baseY) / 10;
                    const stemTo: number = Math.max(extents.topY, extents.baseY) / 10;
                    for (const p of curve.sample(64)) {
                        if (Math.hypot(p.x - curve.endPoint.x, p.y - curve.endPoint.y) < 0.6) {
                            continue;
                        }
                        const inHead: boolean = p.x > left + 0.1 && p.x < right - 0.1 && Math.abs(p.y - y) < 0.4;
                        const onStem: boolean = Math.abs(p.x - stemX) < 0.2 && p.y > stemFrom && p.y < stemTo;
                        expect(inHead || onStem, `${note.sourceNote.Pitch?.ToString()} at ${p.x}, ${p.y}`).to.equal(false);
                    }
                }
            }
        }
    };

    it("draws each curve once per drawing, the same by renderAsync", async () => {
        const curvePaths: (div: HTMLElement) => string[] = (div: HTMLElement) =>
            Array.from(div.querySelectorAll("g.vf-curve path")).map(path => path.getAttribute("d"));
        const sync: string[] = curvePaths(container);
        expect(sync.length, "six slurs and a tie").to.equal(7);
        osmd.clear();
        container.remove();
        await load();
        await osmd.renderAsync();
        expect(curvePaths(container)).to.deep.equal(sync);
    });
});
