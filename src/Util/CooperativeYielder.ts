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
export class RenderSupersededError extends Error {
    constructor(message: string = "OSMD: async render superseded by a synchronous render") {
        super(message);
        this.name = "RenderSupersededError";
        Object.setPrototypeOf(this, RenderSupersededError.prototype);
    }
}

export class CooperativeYielder {
    /**
     * Work budget between yields, in milliseconds. ~12ms keeps a chunk inside a
     * 16ms frame while leaving headroom for the frame itself. Raising it lowers
     * total-load overhead but drops animation frame rate.
     */
    public readonly budgetMs: number;

    /** Number of event-loop turns taken so far (diagnostics). */
    public yieldCount: number = 0;

    private sinceYieldStart: number = CooperativeYielder.now();

    /** Optional supersession probe, checked every time control returns from the event loop. */
    private readonly isSuperseded?: () => boolean;

    constructor(budgetMs: number = 12, isSuperseded?: () => boolean) {
        this.budgetMs = budgetMs;
        this.isSuperseded = isSuperseded;
    }

    private static now(): number {
        if (typeof performance !== "undefined" && typeof performance.now === "function") {
            return performance.now();
        }
        return Date.now();
    }

    public get needsYield(): boolean {
        return CooperativeYielder.now() - this.sinceYieldStart >= this.budgetMs;
    }

    public async yieldNow(): Promise<void> {
        this.yieldCount += 1;
        await new Promise<void>((resolve: () => void): void => {
            setTimeout(resolve, 0);
        });
        // A synchronous render can only interleave while we are parked in the timeout above. Abort on
        // resume, before the caller mutates a graphic that the sync render has already re-laid-out or
        // draws into a drawer whose backends were cleared (the "reading 'getContext' of undefined" crash).
        if (this.isSuperseded?.()) {
            throw new RenderSupersededError();
        }
        this.sinceYieldStart = CooperativeYielder.now();
    }

    /** Convenience: yield only when the budget is spent. */
    public tick(): Promise<void> {
        if (this.needsYield) {
            return this.yieldNow();
        }
        return Promise.resolve();
    }
}
