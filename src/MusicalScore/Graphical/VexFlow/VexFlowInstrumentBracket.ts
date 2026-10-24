import Vex from "vexflow";
import VF = Vex.Flow;
import { GraphicalObject } from "../GraphicalObject";
import { VexFlowStaffLine } from "./VexFlowStaffLine";
import { BoundingBox } from "../BoundingBox";
import { VexFlowMeasure } from "./VexFlowMeasure";
import { unitInPixels } from "./VexFlowMusicSheetDrawer";

/**
 * Class that defines a instrument bracket at the beginning of a line.
 */
export class VexFlowInstrumentBracket extends GraphicalObject {

    public vexflowConnector: VF.StaveConnector;
    public Visible: boolean = true;
    /**
     * The MusicXML group-symbol drawn by this bracket when it is not VexFlow's: "square" (a thin line with right-angled
     * hooks, a secondary bracket) or "line" (a thin line), as in the MusicXML pictures and MuseScore.
     */
    public Shape: string = "";

    constructor(firstVexFlowStaffLine: VexFlowStaffLine, lastVexFlowStaffLine: VexFlowStaffLine, depth: number = 0) {
        super();
        this.PositionAndShape = new BoundingBox(this, firstVexFlowStaffLine.ParentMusicSystem.PositionAndShape);
        const firstVexMeasure: VexFlowMeasure = firstVexFlowStaffLine.Measures[0] as VexFlowMeasure;
        const lastVexMeasure: VexFlowMeasure = lastVexFlowStaffLine.Measures[0] as VexFlowMeasure;
        this.addConnector(firstVexMeasure.getVFStave(), lastVexMeasure.getVFStave(), VF.StaveConnector.type.BRACKET, depth);
    }

    /**
     * Render the bracket using the given backend
     * @param ctx Render Vexflow context
     */
    public draw(ctx: Vex.IRenderContext): void {
        // Draw vexflow brace. This sets the positions inside the connector.
        if (this.Visible) {
            if (this.Shape) {
                this.drawThin(ctx);
            } else if ((this.vexflowConnector as any).type === VF.StaveConnector.type.BRACKET && this.vexflowConnector.x_shift !== 0) {
                this.drawShiftedBracket(ctx);
            } else {
                this.vexflowConnector.setContext(ctx).draw();
            }
        }
        // Set bounding box
        const con: VF.StaveConnector = this.vexflowConnector;
        // First line in first stave
        const topY: number = con.top_stave.getYForLine(0);
        // Last line in last stave
        const botY: number = con.bottom_stave.getYForLine(con.bottom_stave.getNumLines() - 1) + con.thickness;
        // Set bounding box position and size in OSMD units
        this.PositionAndShape.AbsolutePosition.x = (con.top_stave.getX() - 2 + con.x_shift) / unitInPixels;
        this.PositionAndShape.AbsolutePosition.y = topY / unitInPixels;
        this.PositionAndShape.Size.height = (botY - topY) / unitInPixels;
        this.PositionAndShape.Size.width = 12 / unitInPixels; // width is always 12 -> vexflow implementation
    }
    /**
     * A square bracket or a line, 1.5 px wide, standing where a bracket's bar stands (5 px left of the staves, 5 px further
     * per nesting depth like a brace), from the top line of the first staff to the bottom line of the last; a square
     * bracket's hooks reach right 5 px, to the system line or the outer bracket.
     */
    private drawThin(ctx: Vex.IRenderContext): void {
        const con: VF.StaveConnector = this.vexflowConnector;
        const topY: number = con.top_stave.getYForLine(0);
        const botY: number = con.bottom_stave.getYForLine(con.bottom_stave.getNumLines() - 1) + con.thickness;
        const x: number = con.top_stave.getX() - 5 + con.x_shift;
        const w: number = 1.5;
        const c: any = ctx as any;
        c.fillRect(x, topY, w, botY - topY);
        if (this.Shape === "square") {
            c.fillRect(x, topY, 5, w);
            c.fillRect(x, botY - w, 5, w);
        }
    }

    /**
     * VexFlow's bracket (StaveConnector.draw()) moved left by the connector's x shift, which VexFlow leaves out for a
     * bracket: a bracket nested in another stood on top of it.
     */
    private drawShiftedBracket(ctx: Vex.IRenderContext): void {
        const con: VF.StaveConnector = this.vexflowConnector;
        const x: number = con.top_stave.getX() + con.x_shift;
        const topY: number = con.top_stave.getYForLine(0) - 4;
        const botY: number = con.bottom_stave.getYForLine(con.bottom_stave.getNumLines() - 1) + con.thickness + 4;
        (VF.Glyph as any).renderGlyph(ctx, x - 5, topY - 3, 40, "v1b", true);
        (VF.Glyph as any).renderGlyph(ctx, x - 5, botY + 3, 40, "v10", true);
        (ctx as any).fillRect(x - 5, topY, 3, botY - topY);
    }

    /**
     * Adds a connector between two staves
     *
     * @param {Stave} stave1: First stave
     * @param {Stave} stave2: Second stave
     * @param {Flow.StaveConnector.type} type: Type of connector
     */
    private addConnector(stave1: VF.Stave, stave2: VF.Stave, type: any, depth: number): void {
        this.vexflowConnector = new VF.StaveConnector(stave1, stave2)
        .setType(type)
        .setXShift(depth * -5);
    }
}
