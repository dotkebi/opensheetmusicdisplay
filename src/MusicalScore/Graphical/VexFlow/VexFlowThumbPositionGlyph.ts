import Vex from "vexflow";
import VF = Vex.Flow;

/**
 * The thumb position sign (MusicXML <thumb-position/>, SMuFL stringsThumbPosition U+E624, a ring on a short stem), placed
 * like a fingering, outside the fingerings of its note (Goltermann, Cello Concerto No. 1 Op. 14, m167: the sign over the
 * "2"), see MusicSheetCalculator.calculateFingerings(). VexFlow's font has no such glyph, so Bravura's outline is drawn
 * (Bravura 1.392, SIL Open Font License), at the size of the notes' glyphs. As osmd_dart's ThumbPositionGlyph.
 */
export class VexFlowThumbPositionGlyph {
    /** The text of the fingering label that stands for the sign (a private use character: the sign's own code point, never
     *  drawn as text). */
    public static readonly LabelText: string = "";

    /** The glyph's name in its font. */
    private static readonly Name: string = "osmdThumbPosition";
    /** Bravura's outline in VexFlow's glyph units (y up from the stem's foot), as vexflow's fontgen_smufl.js writes them. */
    private static readonly Font: any = {
        resolution: 1000,
        glyphs: {
            osmdThumbPosition: {
                x_min: 0, x_max: 248, ha: 426,
                o: "m 248 281 b 124 426 248 360 193 426 b 0 281 55 426 0 360 b 101 138 0 212 43 151 l 101 0 l 147 0 l 147 138 " +
                    "b 248 281 204 151 248 212 z m 124 161 b 69 285 99 161 69 217 b 124 408 69 353 99 408 b 179 285 148 408 179 353 " +
                    "b 124 161 179 217 148 161 z",
            },
        },
    };
    /** The notes' glyph size (VexFlow's notation font scale in osmd_dart, 39 pt). */
    private static readonly Point: number = 39;
    /** Pixels per outline unit: point * 72 / (resolution 1000 * 100). */
    private static readonly Scale: number = VexFlowThumbPositionGlyph.Point * 72 / (1000 * 100);

    /** Width and height of the sign in staff spaces (10 px each). */
    public static readonly Width: number = 248 * VexFlowThumbPositionGlyph.Scale / 10;
    public static readonly Height: number = 426 * VexFlowThumbPositionGlyph.Scale / 10;

    /** Draws the sign centred at centerX, its stem's foot at bottomY (pixels; zoomed by the context). */
    public static draw(ctx: any, centerX: number, bottomY: number): void {
        const glyph: any = new VF.Glyph(VexFlowThumbPositionGlyph.Name, VexFlowThumbPositionGlyph.Point,
            { font: VexFlowThumbPositionGlyph.Font });
        glyph.render(ctx, centerX - VexFlowThumbPositionGlyph.Width * 10 / 2, bottomY);
    }
}
