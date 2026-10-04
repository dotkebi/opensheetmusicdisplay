import { StaffLine } from "./StaffLine";
import { PointF2D } from "../../Common/DataObjects/PointF2D";
import { IVerticalMeasureFormat } from "./VexFlow/VexFlowMeasure";
import { SourceMeasure } from "../VoiceData/SourceMeasure";
import { BoundingBox } from "./BoundingBox";
import { SkyBottomLineCalculationResult } from "./SkyBottomLineCalculationResult";
/**
 * This class calculates and holds the skyline and bottom line information.
 * It also has functions to update areas of the two lines if new elements are
 * added to the staffline (e.g. measure number, annotations, ...)
 */
export declare class SkyBottomLineCalculator {
    /** Parent Staffline where the skyline and bottom line is attached */
    private mStaffLineParent;
    /** Internal array for the skyline */
    private mSkyLine;
    /** Internal array for the bottomline */
    private mBottomLine;
    /** Engraving rules for formatting */
    private mRules;
    /**
     * Create a new object of the calculator
     * @param staffLineParent staffline where the calculator should be attached
     */
    constructor(staffLineParent: StaffLine);
    /**
     * This method updates the skylines and bottomlines for mStaffLineParent.
     * @param calculationResults the skylines and bottomlines of mStaffLineParent's measures calculated by SkyBottomLineBatchCalculator
     */
    updateLines(calculationResults: SkyBottomLineCalculationResult[]): void;
    /**
     * Sets the sky- and bottom lines of mStaffLineParent from the lines of all its measures, one after the other
     * (device-pixel resolution): subsampled to the sampling unit and remapped to units relative to the staffline.
     * @param skyLineConcat the skylines of the measures
     * @param bottomLineConcat the bottom lines of the measures
     * @param concatLength the length of the lines of the measures in the arrays
     */
    private setLinesFromConcatenated;
    /**
     * This method calculates the Sky- and BottomLines for a StaffLine.
     * @param lastMeasureFormats For the geometric calculation of several stafflines: the last format of each vertical measure in it,
     *   so that the stafflines of a vertical measure don't repeat its format (see VexFlowMeasure.format()).
     */
    calculateLines(lastMeasureFormats?: Map<SourceMeasure, IVerticalMeasureFormat>): void;
    /**
     * This method calculates the Sky- and BottomLines for a StaffLine geometrically, from the extents
     * of the VexFlow draw calls of each measure, instead of drawing each measure on a canvas
     * and reading back its pixels (see calculateLines()), which is much slower (see #937).
     * Same flow as calculateLines(), with the canvas replaced by a GeometricSkyBottomLineContext.
     * @param lastMeasureFormats see calculateLines()
     */
    private calculateLinesGeometric;
    /**
     * Fills the columns of a measure's line where nothing was drawn (NaN) like calculateLines() fills them (undefined) for the
     * raster method, one after the other, each with the maximum of the value before it in the measure (findPreviousValidNumber(),
     * the filled value of the previous column, or 0) and the next drawn value (findNextValidNumber(), or 0):
     * so all columns of a run of undrawn columns get the same value.
     * @param line the lines of the measures, one after the other
     * @param start the index of the measure's first column
     * @param end the index after the measure's last column
     */
    private static fillUndrawnColumns;
    /** The per-measure side effects the geometric skyline calc applies before measuring extents: normalize
     *  absolute positions, bump the stave Y, and format the measure at the truncated skyline-canvas width.
     *  Later layout passes read this state (the VexFlow formatter is not idempotent), so the lazy skyline
     *  reuse must replay it via applyGeometricSkylineSideEffectsOnly. Returns the skyline-canvas width.
     *  lastMeasureFormats: see calculateLines(). */
    private prepareMeasureForGeometricSkyline;
    /** Replay the geometric skyline calc's per-measure side effects WITHOUT the expensive extent
     *  measurement, so lazy rendering can reuse cached sky/bottom lines while leaving the measures in the exact
     *  state a normal render would. (calculateLinesGeometric does correctNotePositions inside measure.draw;
     *  here we call it directly since the draw is skipped.) No-op for the non-default raster skyline path.
     *  lastMeasureFormats: see calculateLines(). */
    applyGeometricSkylineSideEffectsOnly(lastMeasureFormats?: Map<SourceMeasure, IVerticalMeasureFormat>): void;
    updateSkyLineWithLine(start: PointF2D, end: PointF2D, value: number): void;
    /**
     * This method updates the SkyLine for a given Wedge.
     * @param start Start point of the wedge (the point where both lines meet)
     * @param end End point of the wedge (the end of the most extreme line: upper line for skyline, lower line for bottomline)
     */
    updateSkyLineWithWedge(start: PointF2D, end: PointF2D): void;
    /**
     * This method updates the BottomLine for a given Wedge.
     * @param start Start point of the wedge
     * @param end End point of the wedge
     */
    updateBottomLineWithWedge(start: PointF2D, end: PointF2D): void;
    /**
     * This method merges a line (e.g. the top edge of a tremolo stroke between two notes) into the SkyLine,
     * updating the SkyLine only where the line lies above it (preserving more extreme existing values),
     * unlike updateSkyLineWithWedge, which overwrites the existing values.
     * @param start Start point of the line, relative to the staffline (like the SkyLine values), in units
     * @param end End point of the line
     */
    mergeSkyLineWithLine(start: PointF2D, end: PointF2D): void;
    /**
     * This method merges a line (e.g. the bottom edge of a tremolo stroke between two notes) into the BottomLine,
     * updating the BottomLine only where the line lies below it (preserving more extreme existing values),
     * unlike updateBottomLineWithWedge, which overwrites the existing values.
     * @param start Start point of the line, relative to the staffline (like the BottomLine values), in units
     * @param end End point of the line
     */
    mergeBottomLineWithLine(start: PointF2D, end: PointF2D): void;
    /**
     * This method updates the SkyLine for a given range with a given value
     * //param  to update the SkyLine for
     * @param startIndex Start index of the range
     * @param endIndex End index of the range
     * @param value ??
     */
    updateSkyLineInRange(startIndex: number, endIndex: number, value: number): void;
    /**
     * This method updates the BottomLine for a given range with a given value
     * @param startIndex Start index of the range
     * @param endIndex End index of the range (excluding)
     * @param value ??
     */
    updateBottomLineInRange(startIndex: number, endIndex: number, value: number): void;
    /**
     * Updates the SkyLine with a label's box, e.g. a dynamic's, from its left to its right margin (relative to the staffline):
     *   only in the samples the box covers completely. A label placed later reads every sample its box touches
     *   (getSkyLineMinForLabel()), so labels whose boxes don't overlap don't read each other.
     * With updateSkyLineInRange() and getSkyLineMinInRange(), which round outward to the samples (1 / SamplingUnit wide),
     *   a label next to another one, e.g. a p right after "dim.", was placed further from the staff than it
     *   when both touched the same sample. The margins keep a label clear of what is in a sample it covers only partially.
     * @param left Left margin of the box
     * @param right Right margin of the box
     * @param value Top margin of the box
     */
    updateSkyLineWithLabel(left: number, right: number, value: number): void;
    /**
     * Updates the BottomLine with a label's box, e.g. a dynamic's, from its left to its right margin (relative to the staffline):
     *   only in the samples the box covers completely. See updateSkyLineWithLabel().
     * @param left Left margin of the box
     * @param right Right margin of the box
     * @param value Bottom margin of the box
     */
    updateBottomLineWithLabel(left: number, right: number, value: number): void;
    /**
     * Returns the SkyLine's minimum for a label's box, e.g. a dynamic's, from its left to its right margin (relative to the staffline):
     *   in every sample the box touches. Unlike getSkyLineMinInRange(), not also in the sample after the box.
     *   See updateSkyLineWithLabel().
     * @param left Left margin of the box
     * @param right Right margin of the box
     */
    getSkyLineMinForLabel(left: number, right: number): number;
    /**
     * Returns the BottomLine's maximum for a label's box, e.g. a dynamic's, from its left to its right margin (relative to the staffline):
     *   in every sample the box touches. See getSkyLineMinForLabel().
     * @param left Left margin of the box
     * @param right Right margin of the box
     */
    getBottomLineMaxForLabel(left: number, right: number): number;
    /**
     * Resets a SkyLine in a range to its original value
     * @param startIndex Start index of the range
     * @param endIndex End index of the range (excluding)
     */
    resetSkyLineInRange(startIndex: number, endIndex: number): void;
    /**
     * Resets a bottom line in a range to its original value
     * @param startIndex Start index of the range
     * @param endIndex End index of the range
     */
    resetBottomLineInRange(startIndex: number, endIndex: number): void;
    /** Replace the sky- and bottom-line arrays directly (lazy rendering reuses the
     *  previously-computed lines of stable interior systems instead of re-measuring them; see
     *  VexFlowMusicSheetCalculator.calculateSkyBottomLines). */
    setLinesDirectly(skyLine: number[], bottomLine: number[]): void;
    /**
     * Update the whole skyline with a certain value
     * @param value value to be set
     */
    setSkyLineWithValue(value: number): void;
    /**
     * Update the whole bottomline with a certain value
     * @param value value to be set
     */
    setBottomLineWithValue(value: number): void;
    getLeftIndexForPointX(x: number, length: number): number;
    getRightIndexForPointX(x: number, length: number): number;
    /**
     * This method updates the StaffLine Borders with the Sky- and BottomLines Min- and MaxValues.
     */
    updateStaffLineBorders(): void;
    /**
     * This method finds the minimum value of the SkyLine, ignoring NaN values.
     * A loop of Math.min(min, value) gives the same result as Math.min(...this.SkyLine.filter(s => !isNaN(s)))
     * (including -0 before 0, and Infinity for no values), without copying the line and spreading it into the arguments
     * of a call, which is slow for lines of thousands of values and fails for very long ones.
     * @returns the minimum
     */
    getSkyLineMin(): number;
    getSkyLineMinAtPoint(point: number): number;
    /**
     * This method finds the SkyLine's minimum value within a given range.
     * @param startIndex Starting index
     * @param endIndex End index (including)
     */
    getSkyLineMinInRange(startIndex: number, endIndex: number): number;
    /**
     * This method finds the maximum value of the BottomLine, ignoring NaN values (a loop, see getSkyLineMin()).
     * @returns the maximum
     */
    getBottomLineMax(): number;
    getBottomLineMaxAtPoint(point: number): number;
    /**
     * This method finds the BottomLine's maximum value within a given range.
     * @param startIndex Start index of the range
     * @param endIndex End index of the range (excluding)
     */
    getBottomLineMaxInRange(startIndex: number, endIndex: number): number;
    /**
     * This method returns the maximum value of the bottom line around a specific
     * bounding box. Will return undefined if the bounding box is not valid or inside staffline
     * @param boundingBox Bounding box where the maximum should be retrieved from
     * @returns Maximum value inside bounding box boundaries or undefined if not possible
     */
    getBottomLineMaxInBoundingBox(boundingBox: BoundingBox): number;
    /**
     * Updates sky- and bottom line with a boundingBox and its children
     * @param boundingBox Bounding box to be added
     */
    updateWithBoundingBoxRecursively(boundingBox: BoundingBox): void;
    /**
     * go backwards through the skyline array and find a number so that
     * we can properly calculate the average
     * @param start the starting index of the search
     * @param tSkyLine the skyline to search through
     */
    private findPreviousValidNumber;
    /**
     * go forward through the skyline array and find a number so that
     * we can properly calculate the average
     * @param start the starting index of the search
     * @param tSkyLine the skyline to search through
     */
    private findNextValidNumber;
    /**
     * Debugging drawing function that can draw single pixels
     * @param coord Point to draw to
     * @param backend the backend to be used
     * @param color the color to be used, default is red
     */
    private drawPixel;
    /**
     * Update an array with the value given inside a range. NOTE: will only be updated if value > oldValue
     * @param array Array to fill in the new value
     * @param startIndex start index to begin with (default: 0)
     * @param endIndex end index of array (excluding, default: array length)
     * @param value value to fill in (default: 0)
     */
    private updateInRange;
    /**
     * Updates an array in the samples the range covers completely (see updateSkyLineWithLabel()), like updateInRange():
     *   only where the value is further from the staff. A range that covers no sample completely updates the sample of its center.
     * @param array Sky or bottom line
     * @param start Start of the range (relative to the staffline)
     * @param end End of the range
     * @param value Value to fill in
     */
    private updateInRangeOfCoveredSamples;
    /**
     * Returns the minimum or maximum of an array in the samples the range touches, at least one.
     * @param array Sky or bottom line
     * @param start Start of the range (relative to the staffline)
     * @param end End of the range
     * @param minimum Whether to return the minimum (sky line) or the maximum (bottom line)
     */
    private getExtremeInTouchedSamples;
    /**
     * Sets the value given to the range inside the array. NOTE: will always update the value
     * @param array Array to fill in the new value
     * @param startIndex start index to begin with (default: 0)
     * @param endIndex end index of array (excluding, default: array length)
     * @param value value to fill in (default: 0)
     */
    private setInRange;
    /**
     * Get all values of the selected line inside the given range
     * @param skyBottomArray Skyline or bottom line
     * @param startIndex start index
     * @param endIndex end index (including)
     */
    private getMinInRange;
    /** The minimum of a copy of a sky- or bottomline (see SkyLine, BottomLine) in the given x range (in units). */
    getMinInRangeOf(skyBottomArray: number[], start: number, end: number): number;
    /** The maximum of a copy of a sky- or bottomline (see SkyLine, BottomLine) in the given x range (in units). */
    getMaxInRangeOf(skyBottomArray: number[], start: number, end: number): number;
    /**
     * Get the maximum value inside the given indices
     * @param skyBottomArray Skyline or bottom line
     * @param startIndex start index
     * @param endIndex end index (including)
     */
    private getMaxInRange;
    /** Sampling units that are used to quantize the sky and bottom line  */
    get SamplingUnit(): number;
    /** Parent staffline where the skybottomline calculator is attached to */
    get StaffLineParent(): StaffLine;
    /** Get the plain skyline array */
    get SkyLine(): number[];
    /** Get the plain bottomline array */
    get BottomLine(): number[];
}
