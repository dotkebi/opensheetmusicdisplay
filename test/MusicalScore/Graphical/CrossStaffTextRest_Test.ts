import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { CrossStaffCurve } from "../../../src/MusicalScore/Graphical/VexFlow/CrossStaffCurve";
import { CrossStaffBeam } from "../../../src/MusicalScore/Graphical/VexFlow/CrossStaffBeam";
import { ClearanceBox, CrossStaffExpressionClearance } from "../../../src/MusicalScore/Graphical/VexFlow/CrossStaffExpressionClearance";
import { GraphicalLabel } from "../../../src/MusicalScore/Graphical/GraphicalLabel";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { AbstractGraphicalExpression } from "../../../src/MusicalScore/Graphical/AbstractGraphicalExpression";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";

/**
 * The texts the 2026-10-27 clearance (CrossStaffExpressionClearance, "LW") left on the ink between the staves
 * (2026-10-28): a dynamic on the barline between the staves, a dynamic kept off the room between two beams by the sky
 * and bottom lines' samples next to a stem, words under a slur that more than MaxMove clears. Same fixtures as osmd-dart
 * test/cross_staff_text_rest_test.dart (excerpts of 81sabo's Sibelius Op.47 III piano m33-36 and m152-156, Enescu
 * Concertstück piano m48-52).
 *
 * Same rule, different layout: on the web the two mp are moved up off the beams within reach (base and fix alike; the
 * 81sabo rows are the app's), so here they only check the drawn mp clear of the beams and the barlines; "Harmonieux et
 * fondu" is moved over the slur only with MaxMoveAway (1024 px).
 */
describe("Text expressions between the staves: barlines, stems' samples, over a slur", () => {
    const render: (fixture: string, width: number, clearance: boolean) => Promise<{ osmd: OpenSheetMusicDisplay, container: HTMLElement }> =
        async (fixture: string, width: number, clearance: boolean) => {
            const container: HTMLElement = TestUtils.getDivElement(document);
            container.style.width = `${width}px`;
            const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
            await osmd.load(TestUtils.getScore(fixture));
            osmd.EngravingRules.CrossStaffTextClearance = clearance;
            osmd.render();
            return { osmd, container };
        };
    const systems: (osmd: OpenSheetMusicDisplay) => MusicSystem[] =
        (osmd: OpenSheetMusicDisplay) => osmd.GraphicSheet.MusicPages.flatMap(p => p.MusicSystems);
    /** the expression reading the text (the single one) and its label */
    const expression: (osmd: OpenSheetMusicDisplay, text: string) => [AbstractGraphicalExpression, GraphicalLabel] =
        (osmd: OpenSheetMusicDisplay, text: string) => {
            const found: [AbstractGraphicalExpression, GraphicalLabel][] = [];
            for (const e of systems(osmd).flatMap(s => s.StaffLines).flatMap(l => l.AbstractExpressions)) {
                const label: GraphicalLabel = (e as any).Label;
                if (label?.Label?.text === text) {
                    found.push([e, label]);
                }
            }
            expect(found.length, text).to.equal(1);
            return found[0];
        };
    const box: (l: GraphicalLabel, dx?: number, dy?: number, dynamic?: boolean) => ClearanceBox =
        (l: GraphicalLabel, dx: number = 0, dy: number = 0, dynamic: boolean = false) => {
            const b: any = l.PositionAndShape;
            const plain: ClearanceBox = new ClearanceBox(b.AbsolutePosition.x + b.BorderLeft + dx, b.AbsolutePosition.y + b.BorderTop + dy,
                                                         b.AbsolutePosition.x + b.BorderRight + dx, b.AbsolutePosition.y + b.BorderBottom + dy);
            return dynamic ? CrossStaffExpressionClearance.dynamicBox(plain, l.Label.text) : plain;
        };
    /** the cross-staff beams' and curves' ink of the system as drawn, and its barlines between the staves */
    const ink: (osmd: OpenSheetMusicDisplay, system: MusicSystem) => CrossStaffExpressionClearance =
        (osmd: OpenSheetMusicDisplay, system: MusicSystem) => {
            const curves: Set<CrossStaffCurve> = new Set<CrossStaffCurve>();
            const beams: Set<CrossStaffBeam> = new Set<CrossStaffBeam>();
            for (const line of system.StaffLines) {
                for (const m of line.Measures as VexFlowMeasure[]) {
                    m.crossStaffCurves.filter(c => c.rendered).forEach(c => curves.add(c));
                    m.crossStaffBeams.forEach(b => beams.add(b));
                }
            }
            const upper: StaffLine = system.StaffLines[0];
            const lower: StaffLine = system.StaffLines[1];
            const barlines: [number, number, number][] = upper.Measures.map(m => [
                m.PositionAndShape.AbsolutePosition.x + m.PositionAndShape.BorderRight,
                upper.PositionAndShape.AbsolutePosition.y,
                lower.PositionAndShape.AbsolutePosition.y + lower.StaffHeight] as [number, number, number]);
            return CrossStaffExpressionClearance.build(curves, beams, system.StaffLines, osmd.EngravingRules.SamplingUnit, 10,
                                                       barlines);
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

    const mpFixtures: [string, number][] = [["test_cross_staff_mp_barline.musicxml", 1024],
                                            ["test_cross_staff_mp_between_beams.musicxml", 1707]];
    for (const [fixture, width] of mpFixtures) {
        it(`draws the mp of ${fixture} clear of the beams and the barlines`, async () => {
            const on: OpenSheetMusicDisplay = keep(await render(fixture, width, true));
            const [e, mp] = expression(on, "mp");
            const inkOf: CrossStaffExpressionClearance = ink(on, e.ParentStaffLine.ParentMusicSystem);
            const dx: number = on.Drawer.CrossStaffExpressionShifts.get(mp) ?? 0;
            const dy: number = on.Drawer.CrossStaffExpressionOffsets.get(mp);
            const moved: ClearanceBox = box(mp, dx, dy, true).inflated(CrossStaffExpressionClearance.Clearance - 1e-6);
            expect(inkOf.touchesInk(moved)).to.equal(false);
            expect(inkOf.touchesBarline(moved)).to.equal(false);
        });
    }

    it("moves words with no free place within reach farther up, over the slur, not into the system above", async () => {
        const fixture: string = "test_cross_staff_words_over_slur.musicxml";
        const off: OpenSheetMusicDisplay = keep(await render(fixture, 1024, false));
        const on: OpenSheetMusicDisplay = keep(await render(fixture, 1024, true));
        const [e, words] = expression(on, "Harmonieux et fondu");
        const system: MusicSystem = e.ParentStaffLine.ParentMusicSystem;
        const inkOf: CrossStaffExpressionClearance = ink(on, system);
        expect(inkOf.touchesInk(box(words)), "under the slur, on the beam").to.equal(true);
        const dy: number = on.Drawer.CrossStaffExpressionOffsets.get(words);
        expect(on.Drawer.CrossStaffExpressionShifts.has(words)).to.equal(false);
        expect(dy).to.be.lessThan(-CrossStaffExpressionClearance.MaxMove);
        expect(dy).to.be.at.least(-CrossStaffExpressionClearance.MaxMoveAway);
        const moved: ClearanceBox = box(words, 0, dy);
        expect(inkOf.touchesInk(moved.inflated(CrossStaffExpressionClearance.Clearance - 1e-6))).to.equal(false);
        const all: MusicSystem[] = systems(on);
        const index: number = all.indexOf(system);
        expect(index).to.be.greaterThan(0);
        const previous: any = all[index - 1].PositionAndShape;
        expect(moved.top).to.be.at.least(previous.AbsolutePosition.y + previous.BorderMarginBottom + CrossStaffExpressionClearance.TextGap - 1e-9);
        expect(words.PositionAndShape.AbsolutePosition.y)
            .to.be.closeTo(expression(off, "Harmonieux et fondu")[1].PositionAndShape.AbsolutePosition.y, 1e-9);
    });
});
