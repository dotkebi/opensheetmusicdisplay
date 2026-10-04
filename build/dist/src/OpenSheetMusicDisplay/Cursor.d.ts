import { MusicPartManagerIterator } from "../MusicalScore/MusicParts/MusicPartManagerIterator";
import { MusicPartManager } from "../MusicalScore/MusicParts/MusicPartManager";
import { VoiceEntry } from "../MusicalScore/VoiceData/VoiceEntry";
import { OpenSheetMusicDisplay } from "./OpenSheetMusicDisplay";
import { GraphicalMusicSheet } from "../MusicalScore/Graphical/GraphicalMusicSheet";
import { Instrument } from "../MusicalScore/Instrument";
import { Note } from "../MusicalScore/VoiceData/Note";
import { CursorOptions } from "./OSMDOptions";
import { BoundingBox } from "../MusicalScore/Graphical/BoundingBox";
import { GraphicalNote } from "../MusicalScore/Graphical/GraphicalNote";
/** A cursor which can iterate through the music sheet. */
export declare class Cursor {
    /** Product playhead guards are implemented without replacing the upstream update lifecycle. */
    static readonly HasPlayheadGuards: boolean;
    constructor(container: HTMLElement, openSheetMusicDisplay: OpenSheetMusicDisplay, cursorOptions: CursorOptions);
    adjustToBackgroundColor(): void;
    private container;
    cursorElement: HTMLImageElement;
    /** a unique id of the cursor's HTMLElement in the document.
     * Should be constant between re-renders and backend changes,
     * but different between different OSMD objects on the same page.
     */
    cursorElementId: string;
    /** The desired zIndex (layer) of the cursor when no background color is set.
     *  When a background color is set, using a negative zIndex would make the cursor invisible.
     */
    wantedZIndex: string;
    private openSheetMusicDisplay;
    private rules;
    private manager;
    iterator: MusicPartManagerIterator;
    private graphic;
    hidden: boolean;
    currentPageNumber: number;
    private cursorOptions;
    private cursorOptionsRendered;
    private cursorWidthRendered;
    private lastPlayheadMeasure;
    private lastPlayheadTimestamp;
    private lastPlayheadX;
    private skipInvisibleNotes;
    /** Initialize the cursor. Necessary before using functions like show() and next(). */
    init(manager: MusicPartManager, graphic: GraphicalMusicSheet): void;
    /** Make the cursor visible. */
    show(): void;
    resetIterator(): void;
    private getStaffEntryFromVoiceEntry;
    /** Moves the cursor to the current position of the iterator (visually), e.g. after next(). */
    update(): void;
    private monotonicPlayheadX;
    private findVisibleGraphicalMeasure;
    updateWidthAndStyle(measurePositionAndShape: BoundingBox, x: number, y: number, height: number): void;
    /** Whether updateStyle() would draw a different image than the current one.
     *  The image only depends on the type, color and alpha options, and for the standard cursor's gradient on the width
     *  (a solid color image is a single pixel, stretched to the width).
     *  Compared by value: the options are usually changed in place (cursor.CursorOptions.color = ..., see #1519),
     *  and cursorOptionsRendered is a clone, so comparing the objects themselves is always unequal.
     */
    private cursorImageOutdated;
    /** Hide the cursor. */
    hide(): void;
    /** Go to previous entry / note / vertical position. */
    previous(): void;
    /** Go to next entry / note / vertical position. */
    next(): void;
    /** reset cursor to start position (start of sheet or osmd.Sheet.SelectionStart if set). */
    reset(): void;
    /** updates cursor style (visually), e.g. cursor.cursorOptions.type or .color. */
    private updateStyle;
    /** Whether the cursor type is drawn in a solid color, which doesn't depend on the width
     *  (the standard cursor fades out to both sides instead).
     */
    private hasSolidColor;
    get Iterator(): MusicPartManagerIterator;
    get Hidden(): boolean;
    /** returns voices under the current Cursor position. Without instrument argument, all voices are returned. */
    VoicesUnderCursor(instrument?: Instrument): VoiceEntry[];
    NotesUnderCursor(instrument?: Instrument): Note[];
    GNotesUnderCursor(instrument?: Instrument): GraphicalNote[];
    /** Check if there was a change in current page, and attach cursor element to the corresponding HTMLElement (div).
     *  This is only necessary if using PageFormat (multiple pages).
     */
    updateCurrentPage(): number;
    /** Moves the cursor element to the element of the page with the given number (see getPageElement()), if the page is drawn.
     *  A page that isn't drawn, e.g. after drawUpToPageNumber, has no element: the cursor element stays where it is,
     *  and update() hides it.
     */
    private attachToPage;
    /** Returns the element (div) of this OSMD instance's page with the given number, which the cursor is attached to on that page.
     *  Found through the instance's backends, not by the element's id "osmdCanvasPage" + page number: every OSMD instance
     *  on a web page gives its pages the same ids, so document.getElementById() can return another instance's page.
     */
    private getPageElement;
    get SkipInvisibleNotes(): boolean;
    set SkipInvisibleNotes(value: boolean);
    get CursorOptions(): CursorOptions;
    set CursorOptions(value: CursorOptions);
    /** Hides and removes the cursor element, deletes object variables. */
    Dispose(): void;
    nextMeasure(): void;
    previousMeasure(): void;
}
