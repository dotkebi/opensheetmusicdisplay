import { MusicSheetDrawer } from "../MusicSheetDrawer";
import { RectangleF2D } from "../../../Common/DataObjects/RectangleF2D";
import { VexFlowMeasure } from "./VexFlowMeasure";
import { PointF2D } from "../../../Common/DataObjects/PointF2D";
import { GraphicalLabel } from "../GraphicalLabel";
import { MusicSystem } from "../MusicSystem";
import { GraphicalObject } from "../GraphicalObject";
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";
import { VexFlowBackend } from "./VexFlowBackend";
import { StaffLine } from "../StaffLine";
import { GraphicalInstantaneousDynamicExpression } from "../GraphicalInstantaneousDynamicExpression";
import { VexFlowContinuousDynamicExpression } from "./VexFlowContinuousDynamicExpression";
import { DrawingParameters } from "../DrawingParameters";
import { GraphicalMusicPage } from "../GraphicalMusicPage";
import { GraphicalMusicSheet } from "../GraphicalMusicSheet";
import { CooperativeYielder } from "../../../Util/CooperativeYielder";
/**
 * This is a global constant which denotes the height in pixels of the space between two lines of the stave
 * (when zoom = 1.0)
 * @type number
 */
export declare const unitInPixels: number;
export declare class VexFlowMusicSheetDrawer extends MusicSheetDrawer {
    private backend;
    private backends;
    private zoom;
    private pageIdx;
    constructor(drawingParameters?: DrawingParameters);
    get Backends(): VexFlowBackend[];
    drawSheet(graphicalMusicSheet: GraphicalMusicSheet): void;
    protected drawPage(page: GraphicalMusicPage): void;
    /** A page is drawable only when a backend was created for its page number (see MusicSheetDrawer.canDrawPage). */
    protected canDrawPage(page: GraphicalMusicPage): boolean;
    /** Loading-path async mirror of {@link drawSheet}: performs the same per-page backend prep as the sync
     *  override, then delegates to the base async page/system loop, which selects the page backend through
     *  {@link beginDrawPage}. */
    drawSheetAsync(graphicalMusicSheet: GraphicalMusicSheet, yielder: CooperativeYielder, onSystemDrawn?: (done: number, total: number) => void, maxPageCount?: number): Promise<void>;
    /** Select the page's render backend before its systems are drawn (async path bypasses {@link drawPage}).
     *  This is the fix for the "late backend" crash: without it, drawMusicSystemAsync would draw into the
     *  wrong (or a cleared) backend. */
    beginDrawPage(page: GraphicalMusicPage): void;
    endDrawPage(page: GraphicalMusicPage): void;
    clear(): void;
    setZoom(zoom: number): void;
    /**
     * Converts a distance from unit to pixel space.
     * @param unitDistance the distance in units
     * @returns {number} the distance in pixels
     */
    calculatePixelDistance(unitDistance: number): number;
    protected drawStaffLine(staffLine: StaffLine): void;
    private drawSlurs;
    /** Lazy horizontal rendering: whether a slur belongs in this batch's draw x-window, based on the absolute
     *  x of its start/end notes (forward-stable as the prefix grows). Returns true when not lazy-horizontal, or
     *  when the notes can't be located (don't suppress). See drawSlurs() for why we avoid the bezier points. */
    private lazyDrawsSlur;
    private drawGlissandi;
    private drawGlissando;
    /** Draws the voice leading guides of a system (visual lines from notehead to notehead, see VoiceLeadingGuide).
     *  Their lines are calculated here, at draw time, when both stafflines of a guide have their final positions. */
    protected drawVoiceLeadingGuides(musicSystem: MusicSystem): void;
    private drawSlur;
    /** The curves between staves drawn in this drawing (drawSheet / drawSheetAsync). */
    private drawnCrossStaffCurves;
    /** Draws the slurs and ties between two staves held by the measure (CrossStaffCurve) after it was drawn, once per
     *  drawing: the curve is calculated between the placed staves, after all its measures have their final positions
     *  and their cross-staff beams are placed. Lazy horizontal rendering draws it in the batch of its right end (as
     *  drawSlurs()). Same as osmd-dart. */
    private drawCrossStaffCurves;
    /** The curves between staves calculated in this drawing (true: drawable), once per drawing: when it is drawn, or
     *  before when a text expression is cleared of it (crossStaffClearanceOf()). */
    private calculatedCrossStaffCurves;
    /** The cross-staff beams' and curves' ink of a system as drawn, built once per drawing for its text expressions
     *  (undefined: none in the system). */
    private crossStaffClearances;
    /** The vertical move of a text expression's label off the cross-staff beams and curves, decided once per drawing. */
    private crossStaffExpressionOffsets;
    /** The moves of this drawing's text expressions (for tests). */
    get CrossStaffExpressionOffsets(): Map<GraphicalLabel, number>;
    /** Calculates the curve between the placed staves once per drawing: its other measures (than the one being drawn)
     *  at their final positions and their cross-staff beams placed. False: nothing to draw. */
    private calculateCrossStaffCurve;
    /** The cross-staff beams' and curves' ink of the system as this drawing draws it (the curves not drawn yet are
     *  calculated now, the beams post-formatted at the staves' final positions), for its text expressions
     *  (CrossStaffExpressionClearance). Undefined when the system has none. Same as osmd-dart. */
    private crossStaffClearanceOf;
    /** The box of the label as drawn (its move applied when decided). */
    private drawnBoxOf;
    private static boxOf;
    /** The label of a text expression the drawer clears of the cross-staff beams and curves (dynamics, verbal dynamics,
     *  words, tempo texts; not a text followed by dashes, whose dashes would stay behind), else undefined. */
    private static clearableLabelOf;
    /** The boxes in the system a moved text must not overlap: the other text expressions (as drawn), the wedges, lyrics,
     *  pedals and octave shifts. */
    private otherBoxesOf;
    /** The vertical move this drawing gives the expression's label off the cross-staff beams and curves of its system
     *  (0: none). */
    private crossStaffOffsetOf;
    /** Draws the expression's label by draw(), moved off the cross-staff beams and curves when they lie over it
     *  (CrossStaffExpressionClearance); the label's layout position is kept. */
    private drawClearOfCrossStaff;
    /** A curve in absolute units: one Bézier segment as a slur is drawn (drawSlur(): its outer edge's control points 0.3
     *  out, a tie's 0.27 as VexFlow's StaveTie), out across the line from end to end (the curve between staves can be
     *  steep); several segments filled from their outline (CrossStaffCurve.outline()). */
    private drawCurve;
    /** The cross-staff beams drawn in this drawing (drawSheet / drawSheetAsync). */
    private drawnCrossStaffBeams;
    /** Formats the cross-staff beams of the measure before the first of their measures is drawn (a note's modifiers are
     *  placed from its extended stem as it is drawn): the other staves' measures get the stave position their own draw
     *  will give them, the notes' y values are refreshed against it, and the beam is post-formatted anew (the staves
     *  moved since the skyline pass). Same as osmd-dart. */
    private prepareCrossStaffBeams;
    /** Draws the cross-staff beams of the measure (stems and beam lines) after the first of their measures was drawn,
     *  once per drawing. */
    private drawCrossStaffBeams;
    protected drawMeasure(measure: VexFlowMeasure): void;
    protected drawBuzzRolls(staffEntry: GraphicalStaffEntry, newBuzzRollId: any): number;
    /** Draws the strokes ("tremolo beams") of tremolos between two notes in this measure,
     *  e.g. two alternating half notes with 3 strokes between them, often seen in orchestral string parts.
     *  (Vexflow doesn't support these tremolos, so we draw them ourselves here.)
     *  Also updates the SkyLine/BottomLine where the strokes exceed it.
     */
    protected drawTremolosBetweenNotes(measure: VexFlowMeasure): void;
    /** Draws the strokes between the two notes of a TremoloBetweenNotes (see drawTremolosBetweenNotes). */
    private drawTremoloBetweenTwoNotes;
    /** Draws a line in the current backend. Only usable while pages are drawn sequentially, because backend reference is updated in that process.
     *  To add your own lines after rendering, use DrawOverlayLine.
     */
    protected drawLine(start: PointF2D, stop: PointF2D, color?: string, lineWidth?: number): Node;
    /** Lets a user/developer draw an overlay line on the score. Use this instead of drawLine, which is for OSMD internally only.
     *  The MusicPage has to be specified, because each page and Vexflow backend has its own relative coordinates.
     *  (the AbsolutePosition of a GraphicalNote is relative to its backend)
     *  To get a MusicPage, use GraphicalNote.ParentMusicPage.
     */
    DrawOverlayLine(start: PointF2D, stop: PointF2D, musicPage: GraphicalMusicPage, color?: string, lineWidth?: number, id?: string): Node;
    DrawPath(inputPoints: PointF2D[], musicPage: GraphicalMusicPage, fill?: boolean, id?: string, color?: string): Node;
    protected drawSkyLine(staffline: StaffLine): void;
    protected drawBottomLine(staffline: StaffLine): void;
    /**
     * Draw a line with a width and start point in a chosen color (used for skyline/bottom line debugging) from
     * a simple array
     * @param line numeric array. 0 marks the base line. Direction given by sign. Dimensions in units
     * @param startPosition Start position in units
     * @param width Max line width in units
     * @param color Color to paint in. Default is red
     */
    private drawSampledLine;
    private drawStaffEntry;
    /**
     * Draw all lyrics to the canvas
     * @param lyricEntries Array of lyric entries to be drawn
     * @param layer Number of the layer that the lyrics should be drawn in
     */
    private drawLyrics;
    protected drawInstrumentBrace(brace: GraphicalObject, system: MusicSystem): void;
    protected drawGroupBracket(bracket: GraphicalObject, system: MusicSystem): void;
    /** Lazy horizontal rendering: whether a spanning element (octave shift, pedal, vibrato, hairpin) belongs
     *  in this batch's draw x-window. It is drawn in the batch where its END MEASURE's right edge first enters
     *  the frontier -- i.e. once its whole span is laid out and stable (same rule as the measure itself).
     *  Returns true when not lazy-horizontal, or when the end measure is unknown (don't suppress). */
    private lazyDrawsSpanToMeasure;
    protected drawOctaveShifts(staffLine: StaffLine): void;
    protected drawPedals(staffLine: StaffLine): void;
    protected drawWavyLines(staffLine: StaffLine): void;
    protected drawExpressions(staffline: StaffLine): void;
    protected drawExpressionDashes(staffLine: StaffLine): void;
    protected drawInstantaneousDynamic(instantaneousDynamic: GraphicalInstantaneousDynamicExpression): void;
    protected drawContinuousDynamic(graphicalExpression: VexFlowContinuousDynamicExpression): void;
    /**
     * Renders a Label to the screen (e.g. Title, composer..)
     * @param graphicalLabel holds the label string, the text height in units and the font parameters
     * @param layer is the current rendering layer. There are many layers on top of each other to which can be rendered. Not needed for now.
     * @param bitmapWidth Not needed for now.
     * @param bitmapHeight Not needed for now.
     * @param heightInPixel the height of the text in screen coordinates
     * @param screenPosition the position of the lower left corner of the text in screen coordinates
     */
    protected renderLabel(graphicalLabel: GraphicalLabel, layer: number, bitmapWidth: number, bitmapHeight: number, fontHeightInPixel: number, screenPosition: PointF2D): Node;
    /**
     * Renders a rectangle with the given style to the screen.
     * It is given in screen coordinates.
     * @param rectangle the rect in screen coordinates
     * @param layer is the current rendering layer. There are many layers on top of each other to which can be rendered. Not needed for now.
     * @param styleId the style id
     * @param alpha alpha value between 0 and 1
     */
    protected renderRectangle(rectangle: RectangleF2D, layer: number, styleId: number, colorHex: string, alpha: number): Node;
    /**
     * Converts a point from unit to pixel space.
     * @param point
     * @returns {PointF2D}
     */
    protected applyScreenTransformation(point: PointF2D): PointF2D;
    /**
     * Converts a rectangle from unit to pixel space.
     * @param rectangle
     * @returns {RectangleF2D}
     */
    protected applyScreenTransformationForRect(rectangle: RectangleF2D): RectangleF2D;
}
