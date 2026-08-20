import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Parity tests for the loading-path async render (OpenSheetMusicDisplay.renderAsync).
 *
 * These assert that:
 *  - renderAsync produces the same drawn output as the synchronous render() (same number of drawn
 *    note/staffline SVG elements),
 *  - onProgress is monotonic and ends at exactly 1.0,
 *  - the event loop actually rotates during renderAsync (a setInterval counter increments while it runs),
 *  - renderAsync is re-entrancy guarded.
 */
describe("OpenSheetMusicDisplay renderAsync (loading-path parity)", () => {
    const scoreName: string = "MuzioClementi_SonatinaOpus36No1_Part1.xml";

    function getScoreXML(): string {
        const doc: Document = TestUtils.getScore(scoreName);
        return new XMLSerializer().serializeToString(doc);
    }

    /** Count drawn SVG leaf marks in a container: a stable proxy for "how much was drawn". */
    function countDrawnElements(container: HTMLElement): { notes: number, paths: number, svgs: number, all: number } {
        const svgs: number = container.querySelectorAll("svg").length;
        // vexflow tags note groups with the "vf-stavenote" class
        const notes: number = container.querySelectorAll("g.vf-stavenote").length;
        const paths: number = container.querySelectorAll("path").length;
        const all: number = container.querySelectorAll("*").length;
        return { notes, paths, svgs, all };
    }

    it("draws the same output as sync render()", async () => {
        const syncContainer: HTMLElement = TestUtils.getDivElement(document);
        const asyncContainer: HTMLElement = TestUtils.getDivElement(document);
        const xml: string = getScoreXML();

        const syncOsmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(syncContainer, { autoResize: false });
        const asyncOsmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(asyncContainer, { autoResize: false });

        await syncOsmd.load(xml);
        syncOsmd.render();

        await asyncOsmd.load(xml);
        await asyncOsmd.renderAsync();

        const syncCounts: { notes: number, paths: number, svgs: number, all: number } = countDrawnElements(syncContainer);
        const asyncCounts: { notes: number, paths: number, svgs: number, all: number } = countDrawnElements(asyncContainer);

        // The score has notes; make sure we actually drew something.
        expect(syncCounts.notes).to.be.greaterThan(0);
        expect(syncCounts.paths).to.be.greaterThan(0);

        expect(asyncCounts.svgs, "svg (page) count").to.equal(syncCounts.svgs);
        expect(asyncCounts.notes, "drawn stavenote count").to.equal(syncCounts.notes);
        expect(asyncCounts.paths, "drawn path count").to.equal(syncCounts.paths);
        expect(asyncCounts.all, "total drawn element count").to.equal(syncCounts.all);
    });

    it("reports monotonic progress ending at exactly 1.0", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false });
        await osmd.load(getScoreXML());

        const progresses: number[] = [];
        await osmd.renderAsync({ onProgress: (p: number): void => { progresses.push(p); } });

        expect(progresses.length, "onProgress was called").to.be.greaterThan(1);
        for (let i: number = 1; i < progresses.length; i++) {
            expect(progresses[i], `progress monotonic at index ${i} (${progresses[i - 1]} -> ${progresses[i]})`)
                .to.be.gte(progresses[i - 1]);
        }
        expect(progresses[0]).to.be.gte(0);
        expect(progresses[progresses.length - 1], "final progress is 1.0").to.equal(1.0);
    });

    it("draws only the requested initial pages and appends later pages once", async () => {
        const fullContainer: HTMLElement = TestUtils.getDivElement(document);
        const lazyContainer: HTMLElement = TestUtils.getDivElement(document);
        fullContainer.style.width = "240px";
        lazyContainer.style.width = "240px";
        const fullOsmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(fullContainer, { autoResize: false });
        const lazyOsmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(lazyContainer, { autoResize: false });
        fullOsmd.setPageFormat("A4_P");
        lazyOsmd.setPageFormat("A4_P");
        const xml: string = getScoreXML();

        await fullOsmd.load(xml);
        await fullOsmd.renderAsync();
        await lazyOsmd.load(xml);
        await lazyOsmd.renderAsync({ maxPageCount: 1 });

        const pageCount: number = lazyOsmd.GraphicSheet.MusicPages.length;
        expect(pageCount, "fixture spans more than one page").to.be.greaterThan(1);
        expect(lazyOsmd.isPageRendered(1)).to.equal(true);
        expect(lazyOsmd.isPageRendered(2)).to.equal(false);
        expect(countDrawnElements(lazyContainer).paths).to.be.lessThan(countDrawnElements(fullContainer).paths);

        for (let pageNumber: number = 2; pageNumber <= pageCount; pageNumber++) {
            await lazyOsmd.renderPageAsync(pageNumber);
        }
        const completedCounts: { notes: number, paths: number, svgs: number, all: number } =
            countDrawnElements(lazyContainer);
        expect(completedCounts).to.deep.equal(countDrawnElements(fullContainer));

        await lazyOsmd.renderPageAsync(2);
        expect(countDrawnElements(lazyContainer), "an already-rendered page is not duplicated")
            .to.deep.equal(completedCounts);

        const syncContainer: HTMLElement = TestUtils.getDivElement(document);
        syncContainer.style.width = "240px";
        const syncOsmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(syncContainer, { autoResize: false });
        syncOsmd.setPageFormat("A4_P");
        await syncOsmd.load(xml);
        await syncOsmd.renderAsync({ maxPageCount: 1 });
        syncOsmd.render();
        expect(syncOsmd.isPageRendered(2), "a sync height-fit rerender draws every page").to.equal(true);
        const syncCounts: { notes: number, paths: number, svgs: number, all: number } =
            countDrawnElements(syncContainer);
        await syncOsmd.renderPageAsync(2);
        expect(countDrawnElements(syncContainer), "page append stays idempotent after a sync rerender")
            .to.deep.equal(syncCounts);
    });

    it("yields to the event loop during rendering (setInterval counter increments)", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false });
        await osmd.load(getScoreXML());

        let ticks: number = 0;
        // a 0ms interval fires only when the event loop rotates, i.e. between renderAsync's setTimeout(0) yields.
        const interval: ReturnType<typeof setInterval> = setInterval((): void => { ticks += 1; }, 0);
        // Use a small yield budget so the async path yields frequently and the interval can fire.
        try {
            await osmd.renderAsync({ yieldBudgetMs: 0 });
        } finally {
            clearInterval(interval);
        }
        expect(ticks, "event loop rotated during renderAsync").to.be.greaterThan(0);
    });

    it("guards against re-entrant renderAsync", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false });
        await osmd.load(getScoreXML());

        const first: Promise<void> = osmd.renderAsync();
        expect(osmd.renderAsyncInFlight, "in flight while running").to.equal(true);
        let threw: boolean = false;
        try {
            await osmd.renderAsync();
        } catch (e) {
            threw = true;
        }
        expect(threw, "second concurrent renderAsync throws").to.equal(true);
        await first;
        expect(osmd.renderAsyncInFlight, "not in flight after completion").to.equal(false);
    });
});
