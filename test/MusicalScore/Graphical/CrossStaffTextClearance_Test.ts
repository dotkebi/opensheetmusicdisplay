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
import { GraphicalContinuousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalContinuousDynamicExpression";

/**
 * Text expressions between the staves moved off the cross-staff beams and curves as drawn (CrossStaffExpressionClearance,
 * design (B) of PROMPT-myrthen-cross-staff-skyline-two-pass). Same fixture and checks as osmd-dart
 * test/cross_staff_text_clearance_test.dart.
 *
 * Fixture test_cross_staff_between_text.musicxml (synthetic, piano, A major, 4/4): m1 a slur placed below from the left
 * hand's A2 to the right hand's G#4 on beat 3, an sf below the right hand there (Myrthen 9 m2; the slur rises from staff
 * to staff across the sf's width: no move clears it, it stays); m2 the same slur with a crescendo wedge below the right
 * hand up to beat 3 (a wedge is not moved); m3 an f below the right hand under a sixteenth beam from the right hand's G5
 * C5 A4 F4 to the left hand's C4 F3, all stems down in the XML (centred: the beam under the F4's stem, corpus 0064 m1);
 * m4 words "R. H." below the right hand on beat 4 under a slur placed above from the right hand's D5 down to the left
 * hand's last G2 (corpus 0015 m15); m5 ritard. above the right hand under the top of a slur from the left hand up to the
 * right hand (Myrthen 15 m16); m6 a p below the right hand a sixteenth after the beat, between the stems of an eighth
 * beam from the right hand's E4 D4 to the left hand's C3 A2 (all stems down in the XML: centred).
 *
 * Same rule, different layout: here (the web's spacing and text widths) the p lies on the eighth beam and is moved, the
 * f, the "R. H." and the ritard. are clear; in osmd-dart the f (beam) and the ritard. (curve) are moved. A text cleared
 * of a curve on the web: the Myrthen 9 and 15 regression captures (HANDOFF).
 */
describe("Text expressions clear of cross-staff beams and curves", () => {
    const render: (clearance: boolean) => Promise<{ osmd: OpenSheetMusicDisplay, container: HTMLElement }> =
        async (clearance: boolean) => {
            const container: HTMLElement = TestUtils.getDivElement(document);
            container.style.width = "1400px";
            const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
            await osmd.load(TestUtils.getScore("test_cross_staff_between_text.musicxml"));
            osmd.EngravingRules.CrossStaffTextClearance = clearance;
            osmd.render();
            return { osmd, container };
        };
    const systems: (osmd: OpenSheetMusicDisplay) => MusicSystem[] =
        (osmd: OpenSheetMusicDisplay) => osmd.GraphicSheet.MusicPages.flatMap(p => p.MusicSystems);
    const expressions: (osmd: OpenSheetMusicDisplay) => AbstractGraphicalExpression[] =
        (osmd: OpenSheetMusicDisplay) => systems(osmd).flatMap(s => s.StaffLines).flatMap(l => l.AbstractExpressions);
    const label: (osmd: OpenSheetMusicDisplay, text: string) => GraphicalLabel = (osmd: OpenSheetMusicDisplay, text: string) => {
        const found: AbstractGraphicalExpression[] = expressions(osmd).filter(e => (e as any).Label?.Label?.text === text ||
            (e as any).GraphicalLabel?.Label?.text === text);
        expect(found.length, text).to.equal(1);
        return (found[0] as any).GraphicalLabel ?? found[0].Label;
    };
    const box: (l: GraphicalLabel, dy?: number) => ClearanceBox = (l: GraphicalLabel, dy: number = 0) => {
        const b: any = l.PositionAndShape;
        return new ClearanceBox(b.AbsolutePosition.x + b.BorderLeft, b.AbsolutePosition.y + b.BorderTop + dy,
                                b.AbsolutePosition.x + b.BorderRight, b.AbsolutePosition.y + b.BorderBottom + dy);
    };
    const ink: (osmd: OpenSheetMusicDisplay) => CrossStaffExpressionClearance = (osmd: OpenSheetMusicDisplay) => {
        const system: MusicSystem = systems(osmd)[0];
        const curves: Set<CrossStaffCurve> = new Set<CrossStaffCurve>();
        const beams: Set<CrossStaffBeam> = new Set<CrossStaffBeam>();
        for (const line of system.StaffLines) {
            for (const m of line.Measures as VexFlowMeasure[]) {
                m.crossStaffCurves.filter(c => c.rendered).forEach(c => curves.add(c));
                m.crossStaffBeams.forEach(b => beams.add(b));
            }
        }
        return CrossStaffExpressionClearance.build(curves, beams, system.StaffLines, osmd.EngravingRules.SamplingUnit, 10);
    };
    /** the y of the label's drawn text (SVG) */
    const drawnY: (l: GraphicalLabel) => number = (l: GraphicalLabel) => {
        const node: any = l.SVGNode;
        const text: Element = node?.tagName === "text" ? node : node?.querySelector?.("text");
        return Number(text.getAttribute("y"));
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

    it("without the clearance the sf lies on a curve and the p on a beam", async () => {
        const osmd: OpenSheetMusicDisplay = keep(await render(false));
        expect(systems(osmd).length).to.equal(1);
        const inkOf: CrossStaffExpressionClearance = ink(osmd);
        for (const text of ["sf", "p"]) {
            expect(inkOf.touchesInk(box(label(osmd, text))), text).to.equal(true);
        }
        for (const text of ["f", "R. H.", "ritard."]) {
            expect(inkOf.touchesInk(box(label(osmd, text))), text).to.equal(false);
        }
        expect([...osmd.Drawer.CrossStaffExpressionOffsets.values()].every(v => v === 0)).to.equal(true);
    });

    it("the drawer moves the p clear, within reach, the layout unchanged", async () => {
        const off: OpenSheetMusicDisplay = keep(await render(false));
        const on: OpenSheetMusicDisplay = keep(await render(true));
        const inkOf: CrossStaffExpressionClearance = ink(on);
        const offsets: Map<GraphicalLabel, number> = on.Drawer.CrossStaffExpressionOffsets;
        const p: GraphicalLabel = label(on, "p");
        const dy: number = offsets.get(p);
        expect(dy).to.be.greaterThan(0); // down, away from its staff
        expect(Math.abs(dy)).to.be.at.most(CrossStaffExpressionClearance.MaxMove + 1e-9);
        expect(inkOf.touchesInk(box(p, dy).inflated(CrossStaffExpressionClearance.Clearance - 1e-6))).to.equal(false);
        expect(drawnY(p) - drawnY(label(off, "p"))).to.be.closeTo(dy * 10, 1e-6);
        expect(p.PositionAndShape.AbsolutePosition.y).to.be.closeTo(label(off, "p").PositionAndShape.AbsolutePosition.y, 1e-9);
        // the sf: the slur rises from staff to staff across its width (no move clears it); the others are clear
        for (const text of ["sf", "f", "R. H.", "ritard."]) {
            expect(offsets.get(label(on, text)), text).to.equal(0);
            expect(drawnY(label(on, text)), text).to.equal(drawnY(label(off, text)));
        }
        // the layout (staves, wedge) is the same; a wedge is never moved
        const linesOff: any[] = systems(off)[0].StaffLines;
        systems(on)[0].StaffLines.forEach((line, i) =>
            expect(line.PositionAndShape.AbsolutePosition.y).to.be.closeTo(linesOff[i].PositionAndShape.AbsolutePosition.y, 1e-9));
        const wedge: (osmd: OpenSheetMusicDisplay) => GraphicalContinuousDynamicExpression = (osmd: OpenSheetMusicDisplay) =>
            expressions(osmd).find(e => e instanceof GraphicalContinuousDynamicExpression && !e.IsVerbal) as GraphicalContinuousDynamicExpression;
        wedge(on).Lines.forEach((l, i) => {
            expect(l.Start.y).to.be.closeTo(wedge(off).Lines[i].Start.y, 1e-9);
            expect(l.End.y).to.be.closeTo(wedge(off).Lines[i].End.y, 1e-9);
        });
    });

    it("renderAsync (the web's chunked drawing) moves it as render(), drawn once", async () => {
        const sync: OpenSheetMusicDisplay = keep(await render(true));
        const container: HTMLElement = TestUtils.getDivElement(document);
        container.style.width = "1400px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
        cleanups.push(() => {
            osmd.clear();
            container.remove();
        });
        await osmd.load(TestUtils.getScore("test_cross_staff_between_text.musicxml"));
        await osmd.renderAsync();
        const dy: number = osmd.Drawer.CrossStaffExpressionOffsets.get(label(osmd, "p"));
        expect(dy).to.not.equal(0);
        expect(dy).to.equal(sync.Drawer.CrossStaffExpressionOffsets.get(label(sync, "p")));
        expect(drawnY(label(osmd, "p"))).to.be.closeTo(drawnY(label(sync, "p")), 1e-6);
        const texts: string[] = Array.from(container.querySelectorAll("text")).map(t => t.textContent);
        expect(texts.filter(t => t === "p").length).to.equal(1);
    });
});
