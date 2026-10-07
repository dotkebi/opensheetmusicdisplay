import { MusicSheet } from "../MusicSheet";
import { SourceMeasure } from "../VoiceData/SourceMeasure";
import { GraphicalMeasure } from "./GraphicalMeasure";
import { GraphicalMusicPage } from "./GraphicalMusicPage";
import { VerticalGraphicalStaffEntryContainer } from "./VerticalGraphicalStaffEntryContainer";
import { GraphicalLabel } from "./GraphicalLabel";
import { GraphicalLine } from "./GraphicalLine";
import { MusicSystem } from "./MusicSystem";
import { GraphicalStaffEntry } from "./GraphicalStaffEntry";
import { SourceStaffEntry } from "../VoiceData/SourceStaffEntry";
import { PointF2D } from "../../Common/DataObjects/PointF2D";
import { ClefInstruction } from "../VoiceData/Instructions/ClefInstruction";
import { KeyInstruction } from "../VoiceData/Instructions/KeyInstruction";
import { Fraction } from "../../Common/DataObjects/Fraction";
import { GraphicalNote } from "./GraphicalNote";
import { MusicSheetCalculator } from "./MusicSheetCalculator";
import { SelectionStartSymbol } from "./SelectionStartSymbol";
import { SelectionEndSymbol } from "./SelectionEndSymbol";
import { OutlineAndFillStyleEnum } from "./DrawingEnums";
import { MusicSheetDrawer } from "./MusicSheetDrawer";
import { GraphicalVoiceEntry } from "./GraphicalVoiceEntry";
import { GraphicalObject } from "./GraphicalObject";
import { CooperativeYielder } from "../../Util/CooperativeYielder";
import { ClassType } from "../Interfaces/AClassHierarchyTrackable";
/**
 * The graphical counterpart of a [[MusicSheet]]
 */
export declare class GraphicalMusicSheet {
    constructor(musicSheet: MusicSheet, calculator: MusicSheetCalculator);
    private musicSheet;
    private calculator;
    drawer: MusicSheetDrawer;
    private musicPages;
    /** measures (i,j) where i is the measure number and j the staff index (e.g. staff indices 0, 1 for two piano parts) */
    private measureList;
    private verticalGraphicalStaffEntryContainers;
    private title;
    private subtitle;
    private composer;
    private firstPageCreditWords;
    private lyricist;
    private copyright;
    private cursors;
    private selectionStartSymbol;
    private selectionEndSymbol;
    private minAllowedSystemWidth;
    private numberOfStaves;
    private leadSheet;
    get ParentMusicSheet(): MusicSheet;
    get GetCalculator(): MusicSheetCalculator;
    get MusicPages(): GraphicalMusicPage[];
    set MusicPages(value: GraphicalMusicPage[]);
    get MeasureList(): GraphicalMeasure[][];
    set MeasureList(value: GraphicalMeasure[][]);
    get VerticalGraphicalStaffEntryContainers(): VerticalGraphicalStaffEntryContainer[];
    set VerticalGraphicalStaffEntryContainers(value: VerticalGraphicalStaffEntryContainer[]);
    get Title(): GraphicalLabel;
    set Title(value: GraphicalLabel);
    get Subtitle(): GraphicalLabel;
    set Subtitle(value: GraphicalLabel);
    get Composer(): GraphicalLabel;
    set Composer(value: GraphicalLabel);
    get FirstPageCreditWords(): GraphicalLabel[];
    set FirstPageCreditWords(value: GraphicalLabel[]);
    get Lyricist(): GraphicalLabel;
    set Lyricist(value: GraphicalLabel);
    get Copyright(): GraphicalLabel;
    set Copyright(value: GraphicalLabel);
    get Cursors(): GraphicalLine[];
    get SelectionStartSymbol(): SelectionStartSymbol;
    get SelectionEndSymbol(): SelectionEndSymbol;
    get MinAllowedSystemWidth(): number;
    set MinAllowedSystemWidth(value: number);
    get NumberOfStaves(): number;
    get LeadSheet(): boolean;
    set LeadSheet(value: boolean);
    /**
     * Calculate the Absolute Positions from the Relative Positions.
     * @param graphicalMusicSheet
     */
    static transformRelativeToAbsolutePosition(graphicalMusicSheet: GraphicalMusicSheet): void;
    Initialize(): void;
    reCalculate(): void;
    /** Loading-path async mirror of {@link reCalculate}: same layout, yielding to the event loop. */
    reCalculateAsync(yielder: CooperativeYielder, onProgress?: (progress: number) => void): Promise<void>;
    EnforceRedrawOfMusicSystems(): void;
    getClickedObject<T>(positionOnMusicSheet: PointF2D): T;
    findGraphicalMeasure(measureIndex: number, staffIndex: number): GraphicalMeasure;
    findGraphicalMeasureByMeasureNumber(measureNumber: number, staffIndex: number): GraphicalMeasure;
    /**
     * Search the MeasureList for a certain GraphicalStaffEntry with the given SourceStaffEntry,
     * at a certain verticalIndex (eg a corresponding Staff), starting at a specific horizontalIndex (eg specific GraphicalMeasure).
     * @param staffIndex
     * @param measureIndex
     * @param sourceStaffEntry
     * @returns {any}
     */
    findGraphicalStaffEntryFromMeasureList(staffIndex: number, measureIndex: number, sourceStaffEntry: SourceStaffEntry): GraphicalStaffEntry;
    /**
     * Return the next (to the right) not null GraphicalStaffEntry from a given Index.
     * @param staffIndex
     * @param measureIndex
     * @param graphicalStaffEntry
     * @returns {any}
     */
    findNextGraphicalStaffEntry(staffIndex: number, measureIndex: number, graphicalStaffEntry: GraphicalStaffEntry): GraphicalStaffEntry;
    getFirstVisibleMeasuresListFromIndices(start: number, end: number): GraphicalMeasure[];
    orderMeasuresByStaffLine(measures: GraphicalMeasure[]): GraphicalMeasure[][];
    /**
     * Return the active Clefs at the start of the first SourceMeasure.
     * @returns {ClefInstruction[]}
     */
    initializeActiveClefs(): ClefInstruction[];
    GetMainKey(): KeyInstruction;
    /**
     * Create the VerticalContainer and adds it to the List at the correct Timestamp position.
     * @param timestamp
     * @returns {any}
     */
    getOrCreateVerticalContainer(timestamp: Fraction): VerticalGraphicalStaffEntryContainer;
    /**
     * Does a binary search on the container list and returns the VerticalContainer with the given Timestamp.
     * The search begins at startIndex, if given.
     * If the timestamp cannot be found, null is returned.
     * @param timestamp - The timestamp for which the container shall be found.
     * @param startIndex - The index from which the search starts in the container list.
     * @returns {any}
     * @constructor
     */
    GetVerticalContainerFromTimestamp(timestamp: Fraction, startIndex?: number): VerticalGraphicalStaffEntryContainer;
    /**
     * Perform a binary search for the absolute given Timestamp in all the GraphicalVerticalContainers.
     * @param musicTimestamp
     * @returns {number}
     * @constructor
     */
    GetInterpolatedIndexInVerticalContainers(musicTimestamp: Fraction): number;
    /**
     * Get a List with the indices of all the visible GraphicalMeasures and calculates their
     * corresponding indices in the first SourceMeasure, taking into account Instruments with multiple Staves.
     * @param visibleMeasures
     * @returns {number[]}
     */
    getVisibleStavesIndicesFromSourceMeasure(visibleMeasures: GraphicalMeasure[]): number[];
    /**
     * Returns the GraphicalMeasure with the given SourceMeasure as Parent at the given staff index.
     * @param sourceMeasure
     * @param staffIndex
     * @returns {any}
     */
    getGraphicalMeasureFromSourceMeasureAndIndex(sourceMeasure: SourceMeasure, staffIndex: number): GraphicalMeasure;
    getLastGraphicalMeasureFromIndex(staffIndex: number, lastRendered?: boolean): GraphicalMeasure;
    getMeasureIndex(graphicalMeasure: GraphicalMeasure, measureIndex: number, inListIndex: number): boolean;
    /**
     * Generic method to find graphical objects on the sheet at a given location.
     * @param clickPosition Position in units where we are searching on the sheet
     * @param classOrName The class we want to find, e.g. GraphicalVoiceEntry. Must extend GraphicalObject.
     *   Or its name, which is unreliable in minified builds (see AClassHierarchyTrackable.isInstanceOfClass()).
     * @param startSearchArea The area in units around our point to look for our graphical object, default 5
     * @param maxSearchArea The max area we want to search around our point
     * @param searchAreaIncrement The amount we expand our search area for each iteration that we don't find an object of the given type
     * @param shouldBeIncludedTest A callback that determines if the object should be included in our results- return false for no, true for yes
     * @param distanceTo A callback that returns an object's (squared) distance to the click position, by which the nearest object is chosen.
     *   By default, the distance of the object's position.
     * @param page The page to search, or undefined for all pages (see pagesToSearch()).
     */
    private GetNearestGraphicalObject;
    /**
     * Returns the pages to search for the objects at a position: the given page, or all pages.
     * Each page has its own coordinates: with a page format (EngravingRules.PageFormat), each page is drawn on its own canvas (SVG),
     * from its top left (see GraphicalMusicPage.setMusicPageAbsolutePosition()). So a position, e.g. of a click on a page,
     * is on every page, and the nearest object of all pages can be on another page, e.g. in the first system there.
     */
    private pagesToSearch;
    /**
     * Returns the voice entry with the note (head) nearest to the position, e.g. of a click.
     * @param clickPosition The position in units
     * @param ignoreGraceNotes Whether to skip voice entries of grace notes
     * @param page The page to search, e.g. the one clicked on: each page has its own coordinates, so the position is on every page.
     *   By default, all pages.
     */
    GetNearestVoiceEntry(clickPosition: PointF2D, ignoreGraceNotes?: boolean, page?: GraphicalMusicPage): GraphicalVoiceEntry;
    /**
     * Whether the voice entry is a rest in a TAB staff, which isn't drawn (see VexFlowTabMeasure), so a click can't be on it.
     * Its position can be where a fret number of the next note is drawn, and it could be found instead of that note.
     */
    private static isUndrawnTabRest;
    /**
     * Returns the (squared) distance of the voice entry's nearest note (head) to the position.
     * The voice entry's own position is the top of its bounding box, e.g. the stem tip of an up-stem note,
     * which is often farther from a click on its note head than another voice's note head next to it.
     */
    private distanceToNearestNote;
    /**
     * Returns the note (head) nearest to the position, e.g. of a click: the nearest note of the nearest voice entry.
     * @param clickPosition The position in units
     * @param maxClickDist Unused
     * @param page The page to search, e.g. the one clicked on: each page has its own coordinates, so the position is on every page.
     *   By default, all pages.
     */
    GetNearestNote(clickPosition: PointF2D, maxClickDist: PointF2D, page?: GraphicalMusicPage): GraphicalNote;
    domToSvg(point: PointF2D): PointF2D;
    svgToDom(point: PointF2D): PointF2D;
    svgToOsmd(point: PointF2D): PointF2D;
    private domToSvgTransform;
    GetClickableLabel(clickPosition: PointF2D): GraphicalLabel;
    /**
     * Returns the staff entry nearest to the position, e.g. of a click.
     * @param clickPosition The position in units
     * @param page The page to search, e.g. the one clicked on: each page has its own coordinates, so the position is on every page.
     *   By default, all pages.
     */
    GetNearestStaffEntry(clickPosition: PointF2D, page?: GraphicalMusicPage): GraphicalStaffEntry;
    /** Returns nearest object of type T near clickPosition.
     * E.g. GetNearestObject(pos, GraphicalMeasure) returns the nearest measure.
     * Note that there is also GetNearestStaffEntry(), which has a bit more specific code for staff entries.
     * @param classOrName The class of the object, e.g. GraphicalMeasure. Or its name (e.g. GraphicalMeasure.name), which is unreliable
     *   in minified builds: they can give other classes the same name, e.g. GraphicalNote (see AClassHierarchyTrackable.isInstanceOfClass()).
     * @param page The page to search, e.g. the one clicked on: each page has its own coordinates, so the position is on every page.
     *   By default, all pages.
     * */
    GetNearestObject<T extends GraphicalObject>(clickPosition: PointF2D, classOrName: ClassType<T> | string, page?: GraphicalMusicPage): T;
    GetPossibleCommentAnchor(clickPosition: PointF2D): SourceStaffEntry;
    getClickedObjectOfType<T>(positionOnMusicSheet: PointF2D): T;
    tryGetTimestampFromPosition(positionOnMusicSheet: PointF2D): Fraction;
    tryGetClickableLabel(positionOnMusicSheet: PointF2D): GraphicalLabel;
    tryGetTimeStampFromPosition(positionOnMusicSheet: PointF2D): Fraction;
    /**
     * Get visible staffentry for the container given by the index.
     * @param index
     * @param onlyReliableXAnchors Whether to skip entries whose x position doesn't reliably reflect
     * their timestamp (see {@link isReliableCursorXAnchor}), for cursor positioning by timestamp.
     * @returns {GraphicalStaffEntry}
     */
    getStaffEntry(index: number, onlyReliableXAnchors?: boolean): GraphicalStaffEntry;
    /**
     * Whether a staff entry's x position is a reliable anchor for mapping a timestamp to an
     * x position (cursor positioning during playback, see {@link calculateXPositionFromTimestamp}).
     * Two kinds of entries are excluded:
     * - Entries without any graphical notes, e.g. staff entries only carrying a chord symbol
     *   (MusicXML harmony). These are never positioned by the layout (their relative x stays at the
     *   measure's left border regardless of their timestamp), so using them as anchors makes the
     *   cursor jump backwards to the measure start (e.g. chord symbols above a centered whole rest).
     * - Entries positioned outside their measure's horizontal bounds. These occur when a note was
     *   never actually formatted/laid out (e.g. rests in some tablature edge cases) and carry
     *   meaningless coordinates.
     */
    isReliableCursorXAnchor(entry: GraphicalStaffEntry): boolean;
    /**
     * Returns the index of the closest previous (earlier) vertical container which has at least some visible staff entry, with respect to the given index.
     * @param index
     * @returns {number}
     * @constructor
     */
    GetPreviousVisibleContainerIndex(index: number): number;
    /**
     * Returns the index of the closest next (later) vertical container which has at least some visible staff entry, with respect to the given index.
     * @param index
     * @returns {number}
     * @constructor
     */
    GetNextVisibleContainerIndex(index: number): number;
    findClosestLeftStaffEntry(fractionalIndex: number, searchOnlyVisibleEntries: boolean, onlyReliableXAnchors?: boolean): GraphicalStaffEntry;
    findClosestRightStaffEntry(fractionalIndex: number, returnOnlyVisibleEntries: boolean, onlyReliableXAnchors?: boolean): GraphicalStaffEntry;
    calculateCursorLineAtTimestamp(musicTimestamp: Fraction, styleEnum: OutlineAndFillStyleEnum): GraphicalLine;
    calculateXPositionFromTimestamp(timeStamp: Fraction): [number, MusicSystem];
    GetNumberOfVisibleInstruments(): number;
    GetNumberOfFollowedInstruments(): number;
    GetGraphicalFromSourceStaffEntry(sourceStaffEntry: SourceStaffEntry): GraphicalStaffEntry;
    private CalculateDistance;
    /**
     * Return the longest StaffEntry duration from a GraphicalVerticalContainer.
     * @param index the index of the vertical container
     * @returns {Fraction}
     */
    private getLongestStaffEntryDuration;
}
export declare class SystemImageProperties {
    positionInPixels: PointF2D;
    systemImageId: number;
    system: MusicSystem;
}
