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

    // A synchronous render()/updateGraphic() can interleave with renderAsync while it is parked at a
    // yield (e.g. a host's resize re-flow or density toggle during the initial async render). Before the
    // supersession guard, the async draw resumed on a drawer whose backends had been cleared and died with
    // "Cannot read properties of undefined (reading 'getContext')". Now the synchronous render wins and the
    // async render resolves quietly with identical output.
    it("resolves quietly when a synchronous render() supersedes it mid-flight, keeping the sync output", async () => {
        const referenceContainer: HTMLElement = TestUtils.getDivElement(document);
        const container: HTMLElement = TestUtils.getDivElement(document);
        const xml: string = getScoreXML();

        const reference: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(referenceContainer, { autoResize: false });
        await reference.load(xml);
        reference.render();

        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false });
        await osmd.load(xml);
        const pending: Promise<void> = osmd.renderAsync({ yieldBudgetMs: 0 });
        // park the async render at its first yield, then slip a synchronous render in
        await new Promise<void>((resolve: () => void): void => { setTimeout(resolve, 0); });
        expect(osmd.renderAsyncInFlight, "async render parked at a yield").to.equal(true);
        osmd.render();
        let error: Error | undefined;
        try {
            await pending;
        } catch (e) {
            error = e as Error;
        }
        expect(error, "superseded renderAsync must not reject").to.equal(undefined);
        expect(osmd.renderAsyncInFlight).to.equal(false);

        const counts: { notes: number, paths: number, svgs: number, all: number } = countDrawnElements(container);
        const referenceCounts: { notes: number, paths: number, svgs: number, all: number } = countDrawnElements(referenceContainer);
        expect(counts.svgs, "svg (page) count").to.equal(referenceCounts.svgs);
        expect(counts.notes, "drawn stavenote count (no double draw, no missing systems)").to.equal(referenceCounts.notes);
        expect(counts.all, "total drawn element count").to.equal(referenceCounts.all);
        // the synchronous render marks its pages drawn; a later page request must not redraw them
        expect(osmd.isPageRendered(1)).to.equal(true);
    });

    it("resolves quietly when updateGraphic()+render() (host resize re-flow) supersedes it mid-flight", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false });
        await osmd.load(getScoreXML());
        const pending: Promise<void> = osmd.renderAsync({ yieldBudgetMs: 0 });
        await new Promise<void>((resolve: () => void): void => { setTimeout(resolve, 0); });
        osmd.updateGraphic();
        osmd.render();
        const referenceCounts: { notes: number, paths: number, svgs: number, all: number } = countDrawnElements(container);
        await pending; // must not reject
        expect(countDrawnElements(container).all, "stale async draw must not add to the sync output").to.equal(referenceCounts.all);
    });

    it("skips a page whose render backend is missing instead of throwing", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        // narrow A4 page so the score spans several pages, drawn lazily one page at a time
        Object.defineProperty(container, "offsetWidth", { value: 400 });
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false, pageFormat: "A4_P" });
        await osmd.load(getScoreXML());
        await osmd.renderAsync({ maxPageCount: 1 });
        expect(osmd.GraphicSheet.MusicPages.length, "needs a second page for this test").to.be.greaterThan(1);
        expect(osmd.isPageRendered(2)).to.equal(false);
        // simulate the backends vanishing underneath the drawer (what a concurrent sync render used to do)
        (osmd.Drawer as any).Backends.length = 0;
        let error: Error | undefined;
        try {
            await osmd.renderPageAsync(2);
        } catch (e) {
            error = e as Error;
        }
        expect(error, "missing backend must be skipped, not dereferenced").to.equal(undefined);
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
