import { Tie } from "../VoiceData/Tie";
import { GraphicalNote } from "./GraphicalNote";
import Vex from "vexflow";
import VF = Vex.Flow;
/**
 * The graphical counterpart of a [[Tie]].
 */
export declare class GraphicalTie {
    private tie;
    private startNote;
    private endNote;
    /** The Vexflow tie that draws this tie. For a tie across a system break, the part in the first system (see vfTies). */
    vfTie: VF.StaveTie;
    /** The Vexflow ties that draw this tie: the tie, or for a tie across a system break, a part in each system, in order
     *  (see VexFlowMusicSheetCalculator.layoutGraphicalTie()). */
    vfTies: VF.StaveTie[];
    constructor(tie: Tie, start?: GraphicalNote, end?: GraphicalNote);
    /** The SVG group of the tie, given the SVG backend is used. For a tie across a system break, the part in the first system
     *  (see SVGElements). */
    get SVGElement(): HTMLElement;
    /** The SVG groups of the tie, given the SVG backend is used: the tie's group, or for a tie across a system break,
     *  the group of the part in each system, in order. */
    get SVGElements(): HTMLElement[];
    get GetTie(): Tie;
    get StartNote(): GraphicalNote;
    get Tie(): Tie;
    set StartNote(value: GraphicalNote);
    get EndNote(): GraphicalNote;
    set EndNote(value: GraphicalNote);
}
