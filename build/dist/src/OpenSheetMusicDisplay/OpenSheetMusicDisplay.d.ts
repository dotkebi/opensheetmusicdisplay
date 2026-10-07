import { VexFlowBackend } from "./../MusicalScore/Graphical/VexFlow/VexFlowBackend";
import { GraphicalMusicSheet } from "./../MusicalScore/Graphical/GraphicalMusicSheet";
import { MusicSheetCalculator } from "./../MusicalScore/Graphical/MusicSheetCalculator";
import { VexFlowMusicSheetDrawer } from "./../MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";
import { MusicSheet } from "./../MusicalScore/MusicSheet";
import { Cursor } from "./Cursor";
import { DrawingParameters } from "../MusicalScore/Graphical/DrawingParameters";
import { IOSMDOptions, BackendType, CursorOptions } from "./OSMDOptions";
import { EngravingRules, PageFormat } from "../MusicalScore/Graphical/EngravingRules";
import { GraphicalMusicPage } from "../MusicalScore/Graphical/GraphicalMusicPage";
import { GraphicalMeasure } from "../MusicalScore/Graphical/GraphicalMeasure";
import { ITransposeCalculator } from "../MusicalScore/Interfaces/ITransposeCalculator";
export interface RenderAsyncDiagnostics {
    totalMs: number;
    layoutMs: number;
    backendMs: number;
    drawMs: number;
    cursorMs: number;
    yieldCount: number;
    pageCount: number;
    systemCount: number;
    layout: MusicSheetCalculator["lastAsyncCalculateTimings"];
    musicSystems: MusicSheetCalculator["lastAsyncMusicSystemsTimings"];
}
export interface RenderPageAsyncDiagnostics {
    pageNumber: number;
    elapsedMs: number;
    yieldCount: number;
}
/**
 * The main class and control point of OpenSheetMusicDisplay.<br>
 * It can display MusicXML sheet music files in an HTML element container.<br>
 * After the constructor, use load() and render() to load and render a MusicXML file.
 */
export declare class OpenSheetMusicDisplay {
    protected version: string;
    /**
     * Creates and attaches an OpenSheetMusicDisplay object to an HTML element container.<br>
     * After the constructor, use load() and render() to load and render a MusicXML file.
     * @param container The container element OSMD will be rendered into.<br>
     *                  Either a string specifying the ID of an HTML container element,<br>
     *                  or a reference to the HTML element itself (e.g. div)
     * @param options An object for rendering options like the backend (svg/canvas) or autoResize.<br>
     *                For defaults see the OSMDOptionsStandard method in the [[OSMDOptions]] class.
     */
    constructor(container: string | HTMLElement, options?: IOSMDOptions);
    /** Options from which OSMD creates cursors in enableOrDisableCursors(). */
    cursorsOptions: CursorOptions[];
    cursors: Cursor[];
    get cursor(): Cursor;
    get Cursor(): Cursor;
    zoom: number;
    protected zoomUpdated: boolean;
    /** Timeout in milliseconds used in osmd.load(string) when string is a URL. */
    loadUrlTimeout: number;
    /** Latest successful async-render phase breakdown. Cleared at the start
     *  of every attempt so a failure cannot expose stale measurements. */
    lastRenderAsyncDiagnostics?: RenderAsyncDiagnostics;
    lastRenderPageAsyncDiagnostics?: RenderPageAsyncDiagnostics;
    private renderedPageNumbers;
    private pageRenderAsyncInFlight;
    protected container: HTMLElement;
    protected backendType: BackendType;
    protected needBackendUpdate: boolean;
    protected sheet: MusicSheet;
    protected drawer: VexFlowMusicSheetDrawer;
    protected drawBoundingBox: string;
    protected drawSkyLine: boolean;
    protected drawBottomLine: boolean;
    protected graphic: GraphicalMusicSheet;
    protected drawingParameters: DrawingParameters;
    protected rules: EngravingRules;
    protected autoResizeEnabled: boolean;
    protected resizeHandlerAttached: boolean;
    protected followCursor: boolean;
    /** A function that is executed when the XML has been read.
     * The return value will be used as the actual XML OSMD parses,
     * so you can make modifications to the xml that OSMD will use.
     * By default it returns the XML unchanged. It can also be set by the onXMLRead option,
     * and osmd.setOptions() keeps it when the option is left out. */
    OnXMLRead: (xml: string) => string;
    /**
     * Load a MusicXML file
     * @param content is either the url of a file, or the root node of a MusicXML document,
     *   or the string content of a .xml/.mxl file, or a file blob.
     * @param tempTitle is used as the title for the piece if there is no title in the XML.
     *   The name or path of a MusicXML file (e.g. "scores/Sonata No. 1.musicxml") is used without its folder and extension.
     */
    load(content: string | Document | Blob, tempTitle?: string): Promise<{}>;
    /**
     * (Re-)creates the graphic sheet from the music sheet
     */
    updateGraphic(): void;
    /** Lazy rendering (LazyConsistentGraphic): number of systems already drawn into the shared
     *  backends across prior batches, counted through the pages. Greedy layout is *usually* forward-stable, so the next
     *  batch skips redrawing these and draws from this index -- but some scores re-position earlier systems as the
     *  prefix grows, so each batch verifies the drawn systems against lazyDrawnSystemPositions and redraws from
     *  the topmost one that moved (reconciliation). */
    private lazyDrawnSystemCount;
    /** Lazy rendering: the page and the absolute Y (in units, on the page) each already-drawn system [index] was drawn at,
     *  used to detect when a later batch's full-prefix layout moves an earlier system (forward-stability
     *  is not universal) so it can be redrawn at its corrected position. */
    private lazyDrawnSystemPositions;
    /** Lazy HORIZONTAL rendering (RenderSingleHorizontalStaffline): number of graphical measures of the top
     *  staffline already drawn, counted through the systems in order (see renderAppendGrowingHorizontal()).
     *  The next batch draws from here. */
    private lazyDrawnHMeasureCount;
    /** Incremental rendering ({@link renderNext}): whether a session is in progress (started, not yet reset). */
    private lazyIncrementalActive;
    /** Incremental rendering: source-measure index where the next batch continues (the drawn frontier). */
    private lazyNextSourceIndex;
    /** Incremental rendering of the endless page: the width in pixels all batches of the session lay the sheet out at, the
     *  container's content width when the first batch read it (like render() reads it once). A batch reading the width again
     *  laid its systems out narrower than the ones drawn before when the container had become narrower in between, e.g. by
     *  the vertical scrollbar the page gets once the first batch makes it longer than the window. */
    private lazyLayoutWidth;
    /** Incremental rendering: the draw-measure range the lazy layout mutates, saved on begin and restored on
     *  reset, so a later normal render() isn't left limited to the last batch's draw range. */
    private lazySavedMinMeasureToDrawIndex;
    private lazySavedMaxMeasureToDrawIndex;
    /** Incremental rendering: the scroll listener + its target, while enableIncrementalRenderingOnScroll() is on. */
    private lazyScrollHandler;
    private lazyScrollTarget;
    /** Whether a {@link renderAsync} call is currently running (re-entrancy guard). */
    private renderAsyncInFlightFlag;
    /** Bumped by every render()/renderAsync()/clear()/updateGraphic()/load(). An in-flight async render
     *  compares it to the value it started with and, if a synchronous render slipped in while it was
     *  parked at a yield, exits quietly instead of drawing into backends that no longer exist. */
    private renderGeneration;
    /** Render the loaded music sheet to the container. */
    render(): void;
    /** Whether a {@link renderAsync} call is currently running. */
    get renderAsyncInFlight(): boolean;
    /**
     * Loading-path async mirror of {@link render}: same output, but yields to the event loop during layout
     * and drawing so the main thread stays responsive (e.g. a loading spinner keeps animating) on large
     * orchestral scores. Progress is reported monotonically 0.0..1.0 (layout 0..0.65, draw 0.65..1.0).
     * Re-entrant calls throw. Never call concurrently with {@link render}.
     * @param options.onProgress optional monotonic 0.0..1.0 progress callback.
     * @param options.yieldBudgetMs work budget between event-loop yields, in ms (default 12).
     */
    renderAsync(options?: {
        onProgress?: (progress: number) => void;
        yieldBudgetMs?: number;
        maxPageCount?: number;
    }): Promise<void>;
    /** Draw a single page from the existing full-document layout. Calls are
     *  idempotent and serialized against full/page renders. */
    renderPageAsync(pageNumber: number, yieldBudgetMs?: number): Promise<void>;
    isPageRendered(pageNumber: number): boolean;
    /** Internal range-based engine behind {@link renderNext} (the public incremental API). Lays out the
     *  whole prefix [0..toMeasureIndex] and APPENDS the newly-stable source measures below previously
     *  rendered batches, without clearing the container, so a large score renders "system by system".
     *  clearFirst=true starts a fresh session (clears prior content, resets the counters). Returns the
     *  source-measure index at which the next batch should continue. fromMeasureIndex is informational --
     *  the drawn frontier is tracked internally. Targets the endless vertical-scroll format and
     *  RenderSingleHorizontalStaffline (laid out once, then drawn to the right batch by batch).
     *  `targetNewSystems`, if set, draws that many whole systems this batch (vertical path only; ignored for
     *  the single horizontal staffline, which is one system). */
    private renderAppend;
    /**
     * Incrementally render the loaded sheet one batch at a time, appending each batch so a large score
     * paints progressively ("system by system") instead of blocking on a full render(). The first call --
     * or the first after load(), render() or resetIncrementalRendering() -- starts a fresh session: it
     * clears the container and lays the score out from the first measure. Each later call appends the next
     * batch. Returns progress; once `done` is true the whole sheet is rendered and further calls are no-ops.
     * Like render(), a session lays the sheet out at the container's width when it starts: to adapt it to a new
     * width, e.g. after a resize, start a new session.
     * Page labels are drawn with the batch that finalizes their position: the title block (title, subtitle,
     * composer, lyricist) with the first batch, the copyright (below the last system) with the final batch.
     *
     * Pair with {@link enableIncrementalRenderingOnScroll} for scroll-to-load, or {@link renderRemaining}
     * to finish synchronously (e.g. before PDF/image export). Works for the endless vertical-scroll page
     * format and for RenderSingleHorizontalStaffline (one staffline scrolling right).
     *
     * @param options batch options; defaults to 8 visual measures (a multi-rest counts as one). Pass
     *   `systems` instead to advance by whole music systems (vertical only); see {@link IRenderNextOptions}.
     */
    renderNext(options?: IRenderNextOptions): IRenderNextResult;
    /**
     * Finish an in-progress incremental render synchronously: render all remaining measures at once. Useful
     * before PDF/image export or printing, which need every system, not just the ones scrolled into view.
     * No-op if no incremental render is in progress, or it is already complete.
     */
    renderRemaining(): void;
    /** Whether an incremental render ({@link renderNext}) is in progress (started and not yet reset). */
    get IncrementalRenderingActive(): boolean;
    /** Whether the in-progress incremental render has rendered the whole sheet (its last measure). */
    get IncrementalRenderingComplete(): boolean;
    /** Current incremental-render progress as a snapshot (same shape {@link renderNext} returns), queryable
     *  at any time -- e.g. for a progress bar, or to re-render the same extent after a resize. Reports zero
     *  rendered measures when no session is active. */
    get IncrementalRenderProgress(): IRenderNextResult;
    /** All GraphicalMeasures (one per staff/instrument) at the measure position for source-measure index
     *  `sourceIndex`, walking BACK over collapsed multi-rest members (which have no graphical measure of their
     *  own) to the nearest real measure. Empty if there is none at/before it. Used to resolve the last- /
     *  next-measure handles for renderNext(). */
    private graphicalMeasuresAtOrBefore;
    /**
     * Abandon any in-progress incremental render and restore the draw-measure range it mutated, so a
     * following normal render() draws the whole sheet again. Called
     * automatically by render(), load() and clear(); call it directly only to cancel a session yourself.
     */
    resetIncrementalRendering(): void;
    /**
     * Drive {@link renderNext} automatically from scrolling: render the next batch whenever the user scrolls
     * within ~1.5 viewports of the not-yet-rendered edge (the page bottom for the endless vertical format,
     * the right edge for RenderSingleHorizontalStaffline). Renders the first batch immediately if none has
     * been rendered yet, then keeps appending as the user scrolls, and detaches itself once the whole sheet
     * is rendered. Re-enabling replaces any previous listener; reset/render/load also detach it.
     *
     * @param options batch size (as {@link renderNext}) plus an optional `scrollElement` -- the element whose
     *  scrolling drives loading. Defaults to the OSMD container for a single horizontal staffline (it scrolls
     *  horizontally) and to `window` otherwise (the page scrolls vertically).
     */
    enableIncrementalRenderingOnScroll(options?: IRenderNextOptions & {
        scrollElement?: HTMLElement | Window;
    }): void;
    /** Stop driving {@link renderNext} from scrolling (see {@link enableIncrementalRenderingOnScroll}). */
    disableIncrementalRenderingOnScroll(): void;
    /** Start a fresh incremental session: save the draw-measure range the lazy layout mutates (restored on
     *  reset). Lazy needs the greedy, forward-stable builder so earlier systems keep their position as the
     *  prefix grows -- public OSMD is greedy-only, so that is already in effect (nothing to force). */
    private beginIncrementalRendering;
    /** Number of VISUAL measures in the source-measure range [from, toExcl): a multi-rest renders as one
     *  GraphicalMeasure when RenderMultipleRestMeasures collapses it, so it counts as one. */
    private visualMeasureCount;
    /** Source-measure index (inclusive) at which a batch of `visualCount` visual measures starting at source
     *  index `from` ends -- i.e. the toMeasureIndex to render this batch (multi-rests collapsed; see above). */
    private visualBatchEndIndex;
    /**
     * Lazy rendering (EngravingRules.LazyConsistentGraphic). Lays out the WHOLE prefix
     * [0..toMeasureIndex] into ONE globally-consistent graphic and draws only the systems that became
     * stable since the previous batch, appending them into the shared backend below what's already drawn.
     *
     * There is no per-batch vertical offset or seam-distance
     * computation: the real Y-layout already stacks and crisp-snaps every system at its final absolute
     * position, and the title space / first-system instrument names fall out of laying the prefix from
     * measure 0 each time. The greedy builder is forward-stable -- every system except the LAST of a
     * prefix is *usually* forward-stable (an interior system keeps its position as the prefix grows), so
     * we skip drawing the already-drawn systems above and DEFER the last system of a non-final batch (it
     * is unstretched and shifts once it becomes an interior, stretched system next batch). But this is NOT
     * universal -- some scores re-position earlier systems by several px as later systems are added -- so
     * each batch first VERIFIES the drawn systems against their drawn Y (lazyDrawnSystemPositions) and, if any
     * moved, redraws the whole drawn range at the corrected positions (reconciliation). In the common
     * (stable) case nothing is redrawn. See export/inspect_prefix_stability.mjs / inspect_optionb_drawpos.mjs.
     * The layout can have several pages (NewPageAtXMLNewPageAttribute), each drawn into its own backend like in render():
     * the systems are counted through the pages, and a backend is added for each page the layout grows to.
     *
     * @returns the source-measure index at which the next batch should continue (past the last drawn system).
     */
    private renderAppendGrowing;
    /**
     * Lazy rendering: where the furthest wedge or octave shift ends that reaches into the systems a batch draws and ends in the
     * last system of its layout, or beyond. Such a wedge or octave shift needs a longer layout: their parts depend on the system
     * they end in, e.g. a wedge's parts after the first are placed at its last system's bottom line, and an octave shift ends at
     * a note there. The last system still grows (and is stretched once complete), and the end can be beyond the layout, where a
     * wedge isn't calculated at all, so the systems drawn now would be drawn with other or without these parts. They aren't
     * drawn again. A wedge or octave shift without an end is ignored, and so is a verbal continuous dynamic like "cresc.",
     * which is drawn at its start only (see GraphicalContinuousDynamicExpression.IsVerbal).
     * @param systems the systems of the layout, in order
     * @param drawToIdxExcl the index of the first system the batch doesn't draw
     * @returns the source-measure index of the furthest end in the last system or beyond, or -1 if there is none
     */
    private lazySpannerEndInLastSystem;
    /**
     * Lazy rendering: the systems of the laid-out pages that are drawn (see EngravingRules.MaxPageToDrawNumber), in order.
     * The systems a batch draws are counted through them (see MusicSheetDrawer.LazyDrawSystemsFromIndex).
     * @returns the systems of the pages in order
     */
    private lazyLaidOutSystems;
    /**
     * Lazy rendering for RenderSingleHorizontalStaffline (one staffline growing to the right, horizontal scroll).
     * The first batch lays the whole score out like render(), and each batch reuses that layout and draws only the
     * measures entering the drawn frontier (and the elements ending in them), so that the finished incremental render
     * looks like a normal render(). Laying out a growing prefix instead would move what is drawn already, e.g. a
     * higher note further right moves the staffline down, and the lyrics of a staffline are aligned at one height.
     * Laying out the whole staffline is fast anyway, drawing it is the expensive part, which stays lazy.
     * The layout can have several systems, e.g. with forced system breaks (NewSystemAtXMLNewSystemAttribute,
     * RenderXMeasuresPerLineAkaSystem) or where the staffline would be wider than SheetMaximumWidth, and pages
     * (NewPageAtXMLNewPageAttribute): the frontier advances through the measures of all systems in order, and each
     * system a batch reaches is drawn in its own x-window, from the system's previous frontier to its new one. A
     * system's first window is open to the left and its last one to the right, so that every element is drawn once,
     * also the ones beyond the first or last measure, like the instrument names or a long last chord symbol.
     * @param toMeasureIndex source-measure index up to which this batch draws (at least the next measure, so that
     *  the frontier always advances)
     * @param clearFirst whether this batch starts a new session: lays the score out and creates the backends
     * @returns the source-measure index at which the next batch should continue.
     */
    private renderAppendGrowingHorizontal;
    /**
     * Removes the backends (SVG or canvas) from the container and creates a new one for each page drawn.
     * @param pageWidth the width of the pages in pixels. By default the container's content width, read after removing the
     *  backends. An incremental render passes the width all its batches lay the sheet out at (see lazyLayoutWidth).
     */
    protected createOrRefreshRenderBackend(pageWidth?: number): void;
    /**
     * Returns the width in pixels of the container's content box, which the page fills.
     * The page is drawn inside the container's border and padding, so a page as wide as the container's offsetWidth
     * overflowed the container by their width.
     * Like offsetWidth, the width includes a vertical scrollbar of the container. clientWidth doesn't: it would change
     * when createOrRefreshRenderBackend() empties the container and the scrollbar disappears, after render() used it
     * for the layout. It's also 0 in generateImages_browserless, which only sets offsetWidth.
     */
    protected getContainerContentWidth(): number;
    exportSVG(): void;
    /** States whether the render() function can be safely called. */
    IsReadyToRender(): boolean;
    /** Clears what OSMD has drawn on its canvas. */
    clear(): void;
    /** Set OSMD rendering options using an IOSMDOptions object.
     *  Can be called during runtime. Also called by constructor.
     *  For example, setOptions({autoResize: false}) will disable autoResize even during runtime.
     */
    setOptions(options: IOSMDOptions): void;
    setColoringMode(options: IOSMDOptions): void;
    /**
     * Sets the logging level for this OSMD instance. By default, this is set to `warn`.
     *
     * @param: content can be `trace`, `debug`, `info`, `warn` or `error`.
     */
    setLogLevel(level: string): void;
    getLogLevel(): number;
    /**
     * Initialize this object to default values
     * FIXME: Probably unnecessary
     */
    protected reset(): void;
    /**
     * Attach the appropriate handler to the window.onResize event
     */
    protected autoResize(): void;
    /** Re-render and scroll back to previous scroll bar y position in percent.
     * If the document keeps the same height/length, the scroll bar position will basically be unchanged.
     * For example, if you scroll to the bottom of the page, resize by one pixel (or enable dark mode) and call this,
     *   for the human eye there will be no detectable scrolling or change in the scroll position at all.
     * If you just call render() instead of renderAndScrollBack(),
     *   it will scroll you back to the top of the page, even if you were scrolled to the bottom before. */
    renderAndScrollBack(): void;
    /**
     * Helper function for managing window's onResize events
     * @param startCallback is the function called when resizing starts
     * @param endCallback is the function called when resizing (kind-of) ends
     */
    protected handleResize(startCallback: () => void, endCallback: () => void): void;
    /** Enable or disable (hide) the cursor.
     * @param enable whether to enable (true) or disable (false) the cursor
     */
    enableOrDisableCursors(enable: boolean): void;
    createBackend(type: BackendType, page: GraphicalMusicPage, idOverride?: string): VexFlowBackend;
    /** Standard page format options like A4 or Letter, in portrait and landscape. E.g. PageFormatStandards["A4_P"] or PageFormatStandards["Letter_L"]. */
    static PageFormatStandards: {
        [type: string]: PageFormat;
    };
    static StringToPageFormat(pageFormatString: string): PageFormat;
    /** Sets page format by string. Used by setOptions({pageFormat: "A4_P"}) for example. */
    setPageFormat(formatId: string): void;
    setCustomPageFormat(width: number, height: number): void;
    set DrawSkyLine(value: boolean);
    get DrawSkyLine(): boolean;
    set DrawBottomLine(value: boolean);
    get DrawBottomLine(): boolean;
    set DrawBoundingBox(value: string);
    get DrawBoundingBox(): string;
    setDrawBoundingBox(value: string, render?: boolean): void;
    get AutoResizeEnabled(): boolean;
    set AutoResizeEnabled(value: boolean);
    get Zoom(): number;
    set Zoom(value: number);
    set FollowCursor(value: boolean);
    get FollowCursor(): boolean;
    set TransposeCalculator(calculator: ITransposeCalculator);
    get TransposeCalculator(): ITransposeCalculator;
    get Sheet(): MusicSheet;
    get Drawer(): VexFlowMusicSheetDrawer;
    get GraphicSheet(): GraphicalMusicSheet;
    get DrawingParameters(): DrawingParameters;
    get EngravingRules(): EngravingRules;
    /** Returns the version of OSMD this object is built from (the version you are using). */
    get Version(): string;
}
/** Options for {@link OpenSheetMusicDisplay.renderNext} (incremental, "system by system" rendering). */
export interface IRenderNextOptions {
    /** Target number of visual measures to advance per batch (a multi-rest counts as ONE -- it renders as a
     *  single GraphicalMeasure). Defaults to 8. This is a TARGET, not an exact count: a batch always ends on a
     *  whole music-system (line) boundary, so the system the measure count lands inside is deferred to the next
     *  batch (and a batch always renders at least one whole system). The measures actually drawn may therefore
     *  be somewhat fewer or more than this -- e.g. 8 lands part-way into a system, so only the complete systems
     *  before it are drawn; or if 8 doesn't fill one system, the layout extends until one whole system is ready.
     *  To see what was actually rendered, read the returned {@link IRenderNextResult}: `renderedMeasures` (total
     *  visual measures drawn so far, cumulative) and `lastRenderedMeasure` (the GraphicalMeasures at the last
     *  drawn measure position). Ignored when `systems` is set (and applicable). */
    measures?: number;
    /** How many whole music systems (lines) to render in this batch, instead of advancing by `measures`.
     *  Each batch then ends exactly on a system boundary. Takes precedence over `measures` when > 0.
     *  VERTICAL ONLY: a single horizontal staffline (RenderSingleHorizontalStaffline) is one system, so
     *  `systems` is ignored there and rendering falls back to `measures`. */
    systems?: number;
}
/** Progress returned by {@link OpenSheetMusicDisplay.renderNext}. Measure counts are visual (a multi-rest
 *  counts as one). */
export interface IRenderNextResult {
    /** True once the last measure of the sheet has been rendered -- no more batches remain. */
    done: boolean;
    /** Visual measures rendered so far, cumulative across batches. */
    renderedMeasures: number;
    /** Total visual measures in the sheet. */
    totalMeasures: number;
    /** The last measure position rendered so far (highest measure index): all its GraphicalMeasures, one per
     *  staff/instrument (e.g. 3 for a voice + piano score). Empty if nothing has been rendered yet. They
     *  share one source measure -- reach it and its number/index via any element's `.parentSourceMeasure` and
     *  `.parentSourceMeasure.measureListIndex` (0-based). */
    lastRenderedMeasure: GraphicalMeasure[];
    /** The next measure position not yet rendered (the frontier): all its GraphicalMeasures (one per staff),
     *  or empty once `done`. Same `.parentSourceMeasure` / `.parentSourceMeasure.measureListIndex` accessors. */
    nextUnrenderedMeasure: GraphicalMeasure[];
}
