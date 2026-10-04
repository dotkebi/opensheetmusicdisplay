import { expect } from "chai";
import Vex from "vexflow";
import { TestUtils } from "../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";

/** Same-browser benchmark and full SVG/contour parity probe for the 2.2.0 selective port. */
describe("Web 2.2.0 benchmark and parity", () => {
    /* eslint-disable no-bitwise */
    function hash(text: string): string {
        let value: number = 2166136261;
        for (let i: number = 0; i < text.length; i++) { value = Math.imul(value ^ text.charCodeAt(i), 16777619); }
        return (value >>> 0).toString(16);
    }
    /* eslint-enable no-bitwise */
    function output(osmd: OpenSheetMusicDisplay, div: HTMLElement): { svg: string, contours: string } {
        return {
            svg: hash(Array.from(div.querySelectorAll("svg")).map(svg => svg.outerHTML).join("")
                .replace(/id="[^"]*"/g, "id=\"normalized\"")),
            contours: hash(JSON.stringify(osmd.GraphicSheet.MusicPages.flatMap(page => page.MusicSystems)
                .flatMap(system => system.StaffLines).map(staff => [staff.SkyLine, staff.BottomLine])))
        };
    }
    for (const score of ["ActorPreludeSample.xml", "Beethoven_AnDieFerneGeliebte.xml"]) {
        it(`measures cold and warm sync/async with identical output: ${score}`, async function(): Promise<void> {
            this.timeout(100000);
            await document.fonts.ready;
            const original: any = Vex.Flow.Formatter.prototype.format;
            let formats: number = 0;
            Vex.Flow.Formatter.prototype.format = function(...args: any[]): any {
                formats++; return original.apply(this, args);
            };
            const rows: any[] = [];
            try {
                for (const mode of ["sync", "async"]) {
                    for (let run: number = 0; run < 7; run++) {
                        const div: HTMLElement = TestUtils.getDivElement(document);
                        div.style.width = "1200px";
                        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false });
                        osmd.EngravingRules.UseGeometricSkyBottomLineCalculation = true;
                        let start: number = performance.now();
                        await osmd.load(TestUtils.getScore(score).cloneNode(true) as Document);
                        const loadMs: number = performance.now() - start;
                        formats = 0; start = performance.now();
                        if (mode === "sync") { osmd.render(); } else { await osmd.renderAsync({ yieldBudgetMs: 100000 }); }
                        const renderMs: number = performance.now() - start;
                        const formatCalls: number = formats;
                        start = performance.now(); div.getBoundingClientRect();
                        const browserLayoutMs: number = performance.now() - start;
                        rows.push({mode, run, loadMs, renderMs, browserLayoutMs, formatCalls, ...output(osmd, div)});
                        osmd.clear(); div.remove();
                    }
                }
            } finally { Vex.Flow.Formatter.prototype.format = original; }
            console.log("WEB220_BENCH", JSON.stringify({score, browser: navigator.userAgent,
                font: "Times New Roman (default)", width: 1200, geometric: true, rows}));
            expect(new Set(rows.map(row => row.svg)).size, "all sync/async SVG bytes except IDs").to.equal(1);
            expect(new Set(rows.map(row => row.contours)).size, "all sync/async skyline values").to.equal(1);
        });
    }
});
