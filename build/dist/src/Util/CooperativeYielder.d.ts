/**
 * Cooperative yielder for the async loading path (layout, skyline, draw).
 *
 * Callers check {@link needsYield} synchronously inside hot loops — a timestamp
 * read, no allocation — and only when the frame budget is spent do they
 * `await yieldNow()`, which returns control to the event loop for one turn so
 * the host page can pump a frame (loading spinner / progress bar animation).
 *
 * A macrotask (setTimeout 0) — not a microtask — is required: microtasks drain
 * before the event loop turns, so `await Promise.resolve()` would never let a
 * frame (rAF/paint) through. This mirrors the Dart port's use of a zero-duration
 * timer over `scheduleMicrotask`.
 */
/**
 * Thrown from {@link CooperativeYielder.yieldNow} when the render it drives was superseded while
 * parked at a yield (a synchronous render()/clear()/updateGraphic()/load() ran in between).
 * renderAsync/renderPageAsync catch it and return without drawing into backends that no longer exist.
 */
export declare class RenderSupersededError extends Error {
    constructor(message?: string);
}
export declare class CooperativeYielder {
    /**
     * Work budget between yields, in milliseconds. ~12ms keeps a chunk inside a
     * 16ms frame while leaving headroom for the frame itself. Raising it lowers
     * total-load overhead but drops animation frame rate.
     */
    readonly budgetMs: number;
    /** Number of event-loop turns taken so far (diagnostics). */
    yieldCount: number;
    private sinceYieldStart;
    /** Optional supersession probe, checked every time control returns from the event loop. */
    private readonly isSuperseded?;
    constructor(budgetMs?: number, isSuperseded?: () => boolean);
    private static now;
    get needsYield(): boolean;
    yieldNow(): Promise<void>;
    /** Convenience: yield only when the budget is spent. */
    tick(): Promise<void>;
}
