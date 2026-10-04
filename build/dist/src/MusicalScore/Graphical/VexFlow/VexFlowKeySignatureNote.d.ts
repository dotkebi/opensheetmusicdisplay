import Vex from "vexflow";
import VF = Vex.Flow;
/** A key-signature subgroup uses the active clef and follows its parent note's stave. */
export declare class VexFlowKeySignatureNote extends VF.KeySigNote {
    private clef;
    attachedToNote: boolean;
    /** Reserves real signature width without inventing a source note. */
    static createCarrier(instructions: VF.Note[], stave: VF.Stave): VF.GhostNote;
    constructor(key: string, previousKey: string, clef: string);
    setStave(stave: VF.Stave): this;
    preFormat(): this;
}
