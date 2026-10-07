import { GraphicalLabel } from "./GraphicalLabel";
import { ChordSymbolContainer } from "../VoiceData/ChordSymbolContainer";
import { BoundingBox } from "./BoundingBox";
import { GraphicalObject } from "./GraphicalObject";
import { EngravingRules } from "./EngravingRules";
import { KeyInstruction } from "../VoiceData/Instructions/KeyInstruction";
export declare class GraphicalChordSymbolContainer extends GraphicalObject {
    private chordSymbolContainer;
    private graphicalLabel;
    private rules;
    /** The parent bounding box before the first layout calculation, see resetPosition(). */
    private initialParent;
    /** The relative position before the first layout calculation, see resetPosition(). */
    private initialRelativePosition;
    /** The relative position of the label before the first layout calculation, see resetPosition(). */
    private initialLabelRelativePosition;
    constructor(chordSymbolContainer: ChordSymbolContainer, parent: BoundingBox, textHeight: number, keyInstruction: KeyInstruction, transposeHalftones: number, rules: EngravingRules);
    get GetChordSymbolContainer(): ChordSymbolContainer;
    get GraphicalLabel(): GraphicalLabel;
    /**
     * Puts the chord symbol back where it was before the first layout calculation, called before each calculation.
     * MusicSheetCalculator.calculateChordSymbols() moves the chord symbol and its label, and moves a chord symbol that isn't
     * over a note from its staff entry to its measure (parent), but the layout reads them before that, e.g. for the
     * measure width needed for the chord symbols, for their x positions (MusicSheetCalculator.calculateChordSymbolsXPositions(),
     * e.g. after the begin instructions of the measure), and for the bounding boxes, whose top and bottom borders only grow
     * (BoundingBox.calculateTopBottomBorders()).
     * Without the reset, a re-render would read the previous render's positions, parent and borders there, where the first
     * render read the initial ones, and place the chord symbols (or e.g. the composer above them) differently.
     * The first call takes the snapshot of the initial positions and parent.
     */
    resetPosition(): void;
    private calculateLabel;
}
