import { expect } from "chai";
import Vex from "vexflow";
import VF = Vex.Flow;
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { CrossStaffCurve } from "../../../src/MusicalScore/Graphical/VexFlow/CrossStaffCurve";
import { CrossStaffBeam } from "../../../src/MusicalScore/Graphical/VexFlow/CrossStaffBeam";
import { ClearanceBox, CrossStaffExpressionClearance } from "../../../src/MusicalScore/Graphical/VexFlow/CrossStaffExpressionClearance";
import { GraphicalLabel } from "../../../src/MusicalScore/Graphical/GraphicalLabel";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { AbstractGraphicalExpression } from "../../../src/MusicalScore/Graphical/AbstractGraphicalExpression";

/**
 * Text expressions between the staves that no move up or down clears of the cross-staff beams are moved sideways
 * (CrossStaffExpressionClearance, 2026-10-27 user decision "LW"), and a dynamic's box reaches its glyphs' tails. Same
 * fixture and checks as osmd-dart test/cross_staff_sideways_text_test.dart.
 *
 * Fixture test_cross_staff_sideways_text.musicxml (synthetic, piano, D major, 3/4): m1-2 the Sibelius Op.47 III piano
 * sixteenths (per beat two lower-staff notes stemmed up, two upper-staff notes stemmed down, one beam; their stems cross
 * the whole room between the staves), m1 words "poco f" below the upper staff at the downbeat (S.9336 prints it before
 * the first beam), m2 a p after the second sixteenth of beat 2 (m31, printed between the stems); m3 the Gliere Op.91 I
 * piano m156 eighths (an upper-staff eighth stemmed down beamed with three lower-staff eighths stemmed up) with a p below
 * the upper staff.
 *
 * Since 2026-10-28 (second batch) a dynamic's box is its glyphs' (the p's tail 0.18 left and 0.43 below, its x-height
 * 0.99 below the label's top, checked here by these measured numbers): the m31 p may fit with a move up or down.
 *
 * Same rule, different layout: on the web the words "poco f" measure 5 spaces (12 in osmd-dart) and start right of the
 * first stem; the place before the first beam is 7 spaces to the left, beyond its reach (its width and one space): it
 * goes between the stems to the right. In osmd-dart it is moved before the first beam.
 */
describe("Text expressions moved sideways off cross-staff stems", () => {
    const render: (clearance: boolean) => Promise<{ osmd: OpenSheetMusicDisplay, container: HTMLElement }> =
        async (clearance: boolean) => {
            const container: HTMLElement = TestUtils.getDivElement(document);
            container.style.width = "1400px";
            const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
            await osmd.load(TestUtils.getScore("test_cross_staff_sideways_text.musicxml"));
            osmd.EngravingRules.CrossStaffTextClearance = clearance;
            osmd.render();
            return { osmd, container };
        };
    const systems: (osmd: OpenSheetMusicDisplay) => MusicSystem[] =
        (osmd: OpenSheetMusicDisplay) => osmd.GraphicSheet.MusicPages.flatMap(p => p.MusicSystems);
    /** the labels reading the text (of the measure when given), in measure order */
    const labels: (osmd: OpenSheetMusicDisplay, text: string, measure?: number) => GraphicalLabel[] =
        (osmd: OpenSheetMusicDisplay, text: string, measure?: number) => {
            const found: [number, GraphicalLabel][] = [];
            const all: AbstractGraphicalExpression[] = systems(osmd).flatMap(s => s.StaffLines).flatMap(l => l.AbstractExpressions);
            for (const e of all) {
                const label: GraphicalLabel = (e as any).Label;
                if (label?.Label?.text !== text) {
                    continue;
                }
                const number: number = (e as any).SourceExpression?.ParentMultiExpression?.SourceMeasureParent?.MeasureNumber ?? 0;
                if (measure !== undefined && number !== measure) {
                    continue;
                }
                found.push([number, label]);
            }
            return found.sort((a, b) => a[0] - b[0]).map(f => f[1]);
        };
    const box: (l: GraphicalLabel, dx?: number, dy?: number, dynamic?: boolean) => ClearanceBox =
        (l: GraphicalLabel, dx: number = 0, dy: number = 0, dynamic: boolean = false) => {
            const b: any = l.PositionAndShape;
            const plain: ClearanceBox = new ClearanceBox(b.AbsolutePosition.x + b.BorderLeft + dx, b.AbsolutePosition.y + b.BorderTop + dy,
                                                         b.AbsolutePosition.x + b.BorderRight + dx, b.AbsolutePosition.y + b.BorderBottom + dy);
            return dynamic ? CrossStaffExpressionClearance.dynamicBox(plain, l.Label.text) : plain;
        };
    /** a p's box by its glyph as measured in the 81sabo app captures (2026-10-28) */
    const pGlyphBox: (l: GraphicalLabel, dx?: number, dy?: number) => ClearanceBox =
        (l: GraphicalLabel, dx: number = 0, dy: number = 0) => {
            const b: ClearanceBox = box(l, dx, dy);
            return new ClearanceBox(b.left - 0.18, b.top + 0.99, b.right + 0.08, b.bottom + 0.43);
        };
    const beamsOf: (osmd: OpenSheetMusicDisplay) => Set<CrossStaffBeam> = (osmd: OpenSheetMusicDisplay) => {
        const beams: Set<CrossStaffBeam> = new Set<CrossStaffBeam>();
        for (const line of systems(osmd)[0].StaffLines) {
            for (const m of line.Measures as VexFlowMeasure[]) {
                m.crossStaffBeams.forEach(b => beams.add(b));
            }
        }
        return beams;
    };
    const ink: (osmd: OpenSheetMusicDisplay) => CrossStaffExpressionClearance = (osmd: OpenSheetMusicDisplay) => {
        const system: MusicSystem = systems(osmd)[0];
        const curves: Set<CrossStaffCurve> = new Set<CrossStaffCurve>();
        for (const line of system.StaffLines) {
            for (const m of line.Measures as VexFlowMeasure[]) {
                m.crossStaffCurves.filter(c => c.rendered).forEach(c => curves.add(c));
            }
        }
        return CrossStaffExpressionClearance.build(curves, beamsOf(osmd), system.StaffLines, osmd.EngravingRules.SamplingUnit, 10);
    };
    const cleanups: (() => void)[] = [];
    afterEach(() => {
        cleanups.splice(0).forEach(c => c());
    });
    const keep: (r: { osmd: OpenSheetMusicDisplay, container: HTMLElement }) => OpenSheetMusicDisplay =
        (r: { osmd: OpenSheetMusicDisplay, container: HTMLElement }) => {
            cleanups.push(() => {
                r.osmd.clear();
                r.container.remove();
            });
            return r.osmd;
        };

    it("moves the texts the stems cross from staff to staff, within reach (poco f sideways, the p by its glyph); the layout unchanged", async () => {
        const off: OpenSheetMusicDisplay = keep(await render(false));
        const on: OpenSheetMusicDisplay = keep(await render(true));
        expect(systems(on).length).to.equal(1);
        const inkOf: CrossStaffExpressionClearance = ink(on);
        const shifts: Map<GraphicalLabel, number> = on.Drawer.CrossStaffExpressionShifts;
        const offsets: Map<GraphicalLabel, number> = on.Drawer.CrossStaffExpressionOffsets;

        const poco: GraphicalLabel = labels(on, "poco f")[0];
        const pocoWidth: number = poco.PositionAndShape.BorderRight - poco.PositionAndShape.BorderLeft;
        expect(inkOf.touchesInk(box(poco)), "poco f on the stems").to.equal(true);
        const firstStemX: number = Math.min(...[...beamsOf(on)].flatMap(b => (b as any).notes as any[])
            .filter(n => n instanceof VF.StaveNote).map(n => n.getStemX() / 10));
        // the place before the first beam is beyond its reach: it goes between the stems
        expect(box(poco).right - firstStemX).to.be.greaterThan(Math.max(CrossStaffExpressionClearance.MaxShift, pocoWidth + 1));
        const pocoDx: number = shifts.get(poco);
        expect(pocoDx).to.be.greaterThan(0);
        expect(pocoDx).to.be.at.most(CrossStaffExpressionClearance.MaxShift + 1e-9);
        expect(inkOf.touchesInk(box(poco, pocoDx, offsets.get(poco)).inflated(CrossStaffExpressionClearance.Clearance - 1e-6)))
            .to.equal(false);

        const p: GraphicalLabel = labels(on, "p", 2)[0]; // m31
        expect(inkOf.touchesInk(pGlyphBox(p)), "the p on the beam and a stem").to.equal(true);
        const pDx: number = shifts.get(p) ?? 0;
        const pDy: number = offsets.get(p);
        expect(pDx !== 0 || pDy !== 0).to.equal(true);
        expect(Math.abs(pDx)).to.be.at.most(CrossStaffExpressionClearance.MaxShift + 1e-9);
        expect(Math.abs(pDy)).to.be.at.most(CrossStaffExpressionClearance.MaxMove + 1e-9);
        // clear by its glyph (its tail left and below)
        expect(inkOf.touchesInk(pGlyphBox(p, pDx, pDy).inflated(CrossStaffExpressionClearance.Clearance - 1e-6)))
            .to.equal(false);

        // only where they are drawn moves
        for (const text of ["poco f", "p"]) {
            const a: GraphicalLabel[] = labels(on, text);
            const b: GraphicalLabel[] = labels(off, text);
            a.forEach((l, i) => {
                expect(l.PositionAndShape.AbsolutePosition.x).to.be.closeTo(b[i].PositionAndShape.AbsolutePosition.x, 1e-9);
                expect(l.PositionAndShape.AbsolutePosition.y).to.be.closeTo(b[i].PositionAndShape.AbsolutePosition.y, 1e-9);
            });
        }
        expect(off.Drawer.CrossStaffExpressionShifts.size).to.equal(0);
    });
});
