import { TextAlignmentEnum } from "../../Common/Enums/TextAlignment";
import { Label } from "../Label";
import { Note } from "../VoiceData/Note";
import { BoundingBox } from "./BoundingBox";
import { Clickable } from "./Clickable";
import { EngravingRules } from "./EngravingRules";
/**
 * The graphical counterpart of a Label
 */
export declare class GraphicalLabel extends Clickable {
    private label;
    private rules;
    TextLines: {
        text: string;
        xOffset: number;
        width: number;
    }[];
    /** A reference to the Node in the SVG, if SVGBackend, otherwise undefined.
     *  Allows manipulation without re-rendering, e.g. for dynamics, lyrics, etc.
     *  For the Canvas backend, this is unfortunately not possible.
     */
    SVGNode: Node;
    /** Read-only informational variable only set once by lyrics centering algorithm. */
    CenteringXShift: number;
    ColorXML: string;
    /** The note this label was created for, if any. Set for fingerings (GraphicalStaffEntry.FingeringEntries),
     *  which are stacked in the pitch order of their notes rather than the order they were read in,
     *  so that the note a fingering belongs to can be told without re-deriving that order.
     *  Named like GraphicalNote.sourceNote, which holds the same kind of reference.
     */
    sourceNote: Note;
    /** Whether this page label is positioned from the page bottom, i.e. below the last music system, like the
     *  copyright (see MusicSheetCalculator.calculatePageLabels()), rather than from the page top like the title
     *  block (title, subtitle, composer, lyricist). While an incremental render (OpenSheetMusicDisplay.renderNext())
     *  grows the page, the last system moves down with every batch, so such a label is drawn only with the final
     *  batch, once its position is final (#1710). */
    AnchoredToPageBottom: boolean;
    /**
     * Creates a new GraphicalLabel from a Label
     * @param label  label object containing text
     * @param textHeight Height of text
     * @param alignment Alignement like left, right, top, ...
     * @param parent Parent Bounding Box where the label is attached to
     */
    constructor(label: Label, textHeight: number, alignment: TextAlignmentEnum, rules: EngravingRules, parent?: BoundingBox);
    get Label(): Label;
    toString(): string;
    /**
     * Calculate GraphicalLabel's Borders according to its Alignment
     * Create also the text-lines and their offsets here
     */
    setLabelPositionAndShapeBorders(): void;
}
