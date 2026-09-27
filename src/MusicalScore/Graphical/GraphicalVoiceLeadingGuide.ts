import { PointF2D } from "../../Common/DataObjects/PointF2D";
import { VoiceLeadingGuide, VoiceLeadingGuideLineType } from "../VoiceData/VoiceLeadingGuide";
import { Note } from "../VoiceData/Note";
import { Staff } from "../VoiceData/Staff";
import { EngravingRules } from "./EngravingRules";
import { GraphicalMeasure } from "./GraphicalMeasure";
import { GraphicalNote } from "./GraphicalNote";
import { MusicSystem } from "./MusicSystem";
import { StaffLine } from "./StaffLine";

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

export enum VoiceLeadingGuidePart {
    /** Both notes are in the same system: one line from note to note. */
    Full = "full",
    /** The end note is in a later system: from the start note to the end of this system. */
    BeforeBreak = "before-break",
    /** The start note is in an earlier system: from the beginning of this system to the end note. */
    AfterBreak = "after-break",
}

/**
 * One drawn line of a [[VoiceLeadingGuide]]. A guide interrupted by a system (or page) break has two of these,
 * one per system, which keep the slope the guide would have without the break.
 */
export class GraphicalVoiceLeadingGuide {
    constructor(guide: VoiceLeadingGuide, part: VoiceLeadingGuidePart, start: PointF2D, end: PointF2D) {
        this.Guide = guide;
        this.Part = part;
        this.Start = start;
        this.End = end;
    }

    public Guide: VoiceLeadingGuide;
    public Part: VoiceLeadingGuidePart;
    /** In units, absolute on the page of the system. */
    public Start: PointF2D;
    public End: PointF2D;
    public Width: number;
    public Color: string;
    public SVGElement: Node;

    public get LineType(): VoiceLeadingGuideLineType {
        return this.Guide.LineType;
    }

    /**
     * The strokes that make up the line: dot centers for a dotted line (start === end),
     * dash segments for a dashed line, the whole line for a solid one.
     * The first and last stroke always touch Start and End, so the line visibly reaches both notes.
     */
    public calculateStrokes(rules: EngravingRules): [PointF2D, PointF2D][] {
        const dx: number = this.End.x - this.Start.x;
        const dy: number = this.End.y - this.Start.y;
        const length: number = Math.sqrt(dx * dx + dy * dy);
        const pointAt: (distance: number) => PointF2D = (distance: number) =>
            new PointF2D(this.Start.x + dx * distance / length, this.Start.y + dy * distance / length);
        const strokes: [PointF2D, PointF2D][] = [];
        if (this.LineType === VoiceLeadingGuideLineType.Solid || !(length > 0)) {
            strokes.push([this.Start, this.End]);
        } else if (this.LineType === VoiceLeadingGuideLineType.Dashed) {
            const period: number = rules.VoiceLeadingGuideDashLength + rules.VoiceLeadingGuideDashGap;
            const dashCount: number = Math.max(1, Math.round((length + rules.VoiceLeadingGuideDashGap) / period));
            // stretch the gaps so that the last dash ends exactly at End
            const gap: number = dashCount > 1 ? (length - dashCount * rules.VoiceLeadingGuideDashLength) / (dashCount - 1) : 0;
            if (dashCount === 1 || gap <= 0) {
                strokes.push([this.Start, this.End]);
            } else {
                for (let i: number = 0; i < dashCount; i++) {
                    const from: number = i * (rules.VoiceLeadingGuideDashLength + gap);
                    strokes.push([pointAt(from), pointAt(from + rules.VoiceLeadingGuideDashLength)]);
                }
            }
        } else {
            const intervals: number = Math.max(1, Math.round(length / rules.VoiceLeadingGuideDotSpacing));
            for (let i: number = 0; i <= intervals; i++) {
                const dot: PointF2D = pointAt(length * i / intervals);
                strokes.push([dot, dot]);
            }
        }
        return strokes;
    }

    /**
     * Calculates the voice leading guide lines of one system from the final positions of its notes.
     * Has to run after the vertical layout of the system (i.e. at draw time), like cross-staff slurs.
     */
    public static calculateForSystem(musicSystem: MusicSystem, rules: EngravingRules,
                                     anchorOf: VoiceLeadingGuideAnchorProvider): GraphicalVoiceLeadingGuide[] {
        const lines: GraphicalVoiceLeadingGuide[] = [];
        const handled: Set<VoiceLeadingGuide> = new Set<VoiceLeadingGuide>();
        for (const staffLine of musicSystem.StaffLines) {
            for (const measure of staffLine.Measures) {
                for (const staffEntry of measure.staffEntries) {
                    for (const voiceEntry of staffEntry.graphicalVoiceEntries) {
                        for (const graphicalNote of voiceEntry.notes) {
                            for (const guide of graphicalNote.sourceNote?.VoiceLeadingGuides ?? []) {
                                if (handled.has(guide) || !guide.PrintObject) {
                                    continue;
                                }
                                handled.add(guide);
                                const line: GraphicalVoiceLeadingGuide =
                                    GraphicalVoiceLeadingGuide.calculateLine(guide, musicSystem, rules, anchorOf);
                                if (line) {
                                    lines.push(line);
                                }
                            }
                        }
                    }
                }
            }
        }
        return lines;
    }

    private static calculateLine(guide: VoiceLeadingGuide, musicSystem: MusicSystem, rules: EngravingRules,
                                 anchorOf: VoiceLeadingGuideAnchorProvider): GraphicalVoiceLeadingGuide {
        const startNote: GraphicalNote = rules.GNote(guide.StartNote);
        const endNote: GraphicalNote = rules.GNote(guide.EndNote);
        const startStaffLine: StaffLine = GraphicalVoiceLeadingGuide.staffLineOf(startNote);
        const endStaffLine: StaffLine = GraphicalVoiceLeadingGuide.staffLineOf(endNote);
        if (!startStaffLine || !endStaffLine) {
            return undefined; // a note isn't laid out (e.g. invisible staff, multiple rest measure)
        }
        const start: VoiceLeadingGuideAnchor = anchorOf(startNote);
        const end: VoiceLeadingGuideAnchor = anchorOf(endNote);
        if (!start || !end) {
            return undefined;
        }
        const startSystem: MusicSystem = startStaffLine.ParentMusicSystem;
        const endSystem: MusicSystem = endStaffLine.ParentMusicSystem;
        let part: VoiceLeadingGuidePart = VoiceLeadingGuidePart.Full;
        let clipX: number;
        if (startSystem !== endSystem) {
            // Lay the two systems end to end, so the line keeps one slope across the break:
            // the other note is placed where it would be if its system continued this one.
            const breakWidth: number =
                Math.max(0, GraphicalVoiceLeadingGuide.contentRight(startStaffLine) - start.center.x) +
                Math.max(0, end.center.x - GraphicalVoiceLeadingGuide.contentLeft(endStaffLine));
            if (startSystem === musicSystem) {
                part = VoiceLeadingGuidePart.BeforeBreak;
                const staffLineHere: StaffLine = GraphicalVoiceLeadingGuide.staffLineInSystem(musicSystem, guide.EndNote, startStaffLine);
                end.center = new PointF2D(
                    start.center.x + breakWidth,
                    staffLineHere.PositionAndShape.AbsolutePosition.y + end.center.y - endStaffLine.PositionAndShape.AbsolutePosition.y);
                end.boxes = [];
                clipX = GraphicalVoiceLeadingGuide.contentRight(startStaffLine) - rules.VoiceLeadingGuideSystemBreakInset;
            } else if (endSystem === musicSystem) {
                part = VoiceLeadingGuidePart.AfterBreak;
                const staffLineHere: StaffLine = GraphicalVoiceLeadingGuide.staffLineInSystem(musicSystem, guide.StartNote, endStaffLine);
                start.center = new PointF2D(
                    end.center.x - breakWidth,
                    staffLineHere.PositionAndShape.AbsolutePosition.y + start.center.y - startStaffLine.PositionAndShape.AbsolutePosition.y);
                start.boxes = [];
                clipX = GraphicalVoiceLeadingGuide.contentLeft(endStaffLine) + rules.VoiceLeadingGuideSystemBreakInset;
            } else {
                return undefined;
            }
        }

        const dx: number = end.center.x - start.center.x;
        const dy: number = end.center.y - start.center.y;
        if (!Number.isFinite(dx) || !Number.isFinite(dy) || (dx === 0 && dy === 0)) {
            return undefined;
        }
        // Parameters along start -> end (0 = start notehead center, 1 = end notehead center)
        let from: number = part === VoiceLeadingGuidePart.AfterBreak ? 0 :
            GraphicalVoiceLeadingGuide.clearance(start, dx, dy, rules.VoiceLeadingGuideNoteGap);
        let to: number = part === VoiceLeadingGuidePart.BeforeBreak ? 1 :
            1 - GraphicalVoiceLeadingGuide.clearance(end, -dx, -dy, rules.VoiceLeadingGuideNoteGap);
        if (clipX !== undefined) {
            if (dx <= 0) {
                return undefined; // can't happen for notes in consecutive systems laid end to end
            }
            const clip: number = (clipX - start.center.x) / dx;
            if (part === VoiceLeadingGuidePart.BeforeBreak) {
                to = Math.min(to, clip);
            } else {
                from = Math.max(from, clip);
            }
        }
        if (!(from < to)) {
            return undefined; // the notes are too close to each other for a line in between
        }
        if (part !== VoiceLeadingGuidePart.Full &&
            (to - from) * Math.sqrt(dx * dx + dy * dy) < rules.VoiceLeadingGuideSystemBreakMinimumLength) {
            return undefined;
        }
        const line: GraphicalVoiceLeadingGuide = new GraphicalVoiceLeadingGuide(guide, part,
            new PointF2D(start.center.x + dx * from, start.center.y + dy * from),
            new PointF2D(start.center.x + dx * to, start.center.y + dy * to));
        line.Width = rules.VoiceLeadingGuideLineWidth;
        line.Color = guide.Color;
        return line;
    }

    /**
     * How far (as a fraction of the vector dx/dy) a line leaving the notehead center has to travel
     * until it is clear of the notehead and of the accidental/dots in its way, including the gap.
     */
    private static clearance(anchor: VoiceLeadingGuideAnchor, dx: number, dy: number, gap: number): number {
        // notehead: ellipse
        const rx: number = anchor.headHalfWidth + gap;
        const ry: number = anchor.headHalfHeight + gap;
        let clear: number = 1 / Math.sqrt((dx / rx) * (dx / rx) + (dy / ry) * (dy / ry));
        // accidental, dots: boxes (slab method)
        for (const box of anchor.boxes) {
            let enter: number = 0;
            let leave: number = Number.POSITIVE_INFINITY;
            const axes: [number, number, number, number][] = [
                [anchor.center.x, dx, box.x, box.halfWidth + gap],
                [anchor.center.y, dy, box.y, box.halfHeight + gap],
            ];
            for (const [origin, direction, center, halfSize] of axes) {
                if (direction === 0) {
                    if (Math.abs(origin - center) > halfSize) {
                        leave = Number.NEGATIVE_INFINITY; // parallel to and outside of this slab
                    }
                    continue;
                }
                const t1: number = (center - halfSize - origin) / direction;
                const t2: number = (center + halfSize - origin) / direction;
                enter = Math.max(enter, Math.min(t1, t2));
                leave = Math.min(leave, Math.max(t1, t2));
            }
            if (enter <= leave && Number.isFinite(leave)) {
                clear = Math.max(clear, leave);
            }
        }
        return clear;
    }

    private static staffLineOf(graphicalNote: GraphicalNote): StaffLine {
        return graphicalNote?.parentVoiceEntry?.parentStaffEntry?.parentMeasure?.ParentStaffLine;
    }

    /** The staffline of the note's staff within the system (the note itself is in another system). */
    private static staffLineInSystem(musicSystem: MusicSystem, note: Note, fallback: StaffLine): StaffLine {
        const staff: Staff = note.ParentStaff;
        for (const staffLine of musicSystem.StaffLines) {
            if (staffLine.ParentStaff === staff) {
                return staffLine;
            }
        }
        return fallback;
    }

    private static contentLeft(staffLine: StaffLine): number {
        const firstMeasure: GraphicalMeasure = staffLine.Measures[0];
        return firstMeasure.PositionAndShape.AbsolutePosition.x + (firstMeasure.beginInstructionsWidth ?? 0);
    }

    private static contentRight(staffLine: StaffLine): number {
        return staffLine.PositionAndShape.AbsolutePosition.x + staffLine.PositionAndShape.Size.width;
    }
}
