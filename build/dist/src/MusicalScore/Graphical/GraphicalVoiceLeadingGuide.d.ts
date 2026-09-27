import { PointF2D } from "../../Common/DataObjects/PointF2D";
import { VoiceLeadingGuide, VoiceLeadingGuideLineType } from "../VoiceData/VoiceLeadingGuide";
import { EngravingRules } from "./EngravingRules";
import { GraphicalNote } from "./GraphicalNote";
import { MusicSystem } from "./MusicSystem";
/** An axis-aligned box (center and half extents, in units) a voice leading guide must not run through. */
export interface VoiceLeadingGuideBox {
    x: number;
    y: number;
    halfWidth: number;
    halfHeight: number;
}
/** Where a voice leading guide attaches to a note: the notehead plus what is printed next to it. */
export interface VoiceLeadingGuideAnchor {
    /** Center of the notehead, in units, absolute on the page. */
    center: PointF2D;
    headHalfWidth: number;
    headHalfHeight: number;
    /** Accidental and augmentation dots of this notehead. */
    boxes: VoiceLeadingGuideBox[];
}
export type VoiceLeadingGuideAnchorProvider = (graphicalNote: GraphicalNote) => VoiceLeadingGuideAnchor;
export declare enum VoiceLeadingGuidePart {
    /** Both notes are in the same system: one line from note to note. */
    Full = "full",
    /** The end note is in a later system: from the start note to the end of this system. */
    BeforeBreak = "before-break",
    /** The start note is in an earlier system: from the beginning of this system to the end note. */
    AfterBreak = "after-break"
}
/**
 * One drawn line of a [[VoiceLeadingGuide]]. A guide interrupted by a system (or page) break has two of these,
 * one per system, which keep the slope the guide would have without the break.
 */
export declare class GraphicalVoiceLeadingGuide {
    constructor(guide: VoiceLeadingGuide, part: VoiceLeadingGuidePart, start: PointF2D, end: PointF2D);
    Guide: VoiceLeadingGuide;
    Part: VoiceLeadingGuidePart;
    /** In units, absolute on the page of the system. */
    Start: PointF2D;
    End: PointF2D;
    Width: number;
    Color: string;
    SVGElement: Node;
    get LineType(): VoiceLeadingGuideLineType;
    /**
     * The strokes that make up the line: dot centers for a dotted line (start === end),
     * dash segments for a dashed line, the whole line for a solid one.
     * The first and last stroke always touch Start and End, so the line visibly reaches both notes.
     */
    calculateStrokes(rules: EngravingRules): [PointF2D, PointF2D][];
    /**
     * Calculates the voice leading guide lines of one system from the final positions of its notes.
     * Has to run after the vertical layout of the system (i.e. at draw time), like cross-staff slurs.
     */
    static calculateForSystem(musicSystem: MusicSystem, rules: EngravingRules, anchorOf: VoiceLeadingGuideAnchorProvider): GraphicalVoiceLeadingGuide[];
    private static calculateLine;
    /**
     * How far (as a fraction of the vector dx/dy) a line leaving the notehead center has to travel
     * until it is clear of the notehead and of the accidental/dots in its way, including the gap.
     */
    private static clearance;
    private static staffLineOf;
    /** The staffline of the note's staff within the system (the note itself is in another system). */
    private static staffLineInSystem;
    private static contentLeft;
    private static contentRight;
}
