import Vex from "vexflow";
import { VexFlowMeasure } from "./VexFlowMeasure";
/** Draws a measure-repeat unit. */
export declare class VexFlowMeasureRepeat {
    /** Half-width of the measure-count skyline reservation in staffline units. */
    private static readonly NUMBER_HALF_WIDTH;
    /** Height of the measure-count skyline reservation in staffline units. */
    private static readonly NUMBER_HEIGHT;
    /** Unit measures in staff order. */
    private readonly measures;
    /** Slash count from MusicXML, defaulting to one. */
    private readonly slashes;
    constructor(measures: VexFlowMeasure[], slashes: number);
    /** Unit measures in staff order. */
    get Measures(): VexFlowMeasure[];
    /** Draws the unit from its final measure so later staves do not cover the sign. */
    draw(ctx: Vex.IRenderContext, owner: VexFlowMeasure): void;
    /** Reserves skyline space above multi-measure repeat counts. */
    reserveSkyline(): void;
    /** Position relative to the owner's stave: skyline drawing runs before final stave positions are assigned. */
    private centerX;
    /** Draws the unit length above a multi-measure repeat sign. */
    private drawNumber;
    /** Draws the repeat slashes and flanking dots. */
    private drawSign;
    private drawDot;
}
