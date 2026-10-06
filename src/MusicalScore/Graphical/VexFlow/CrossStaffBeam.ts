import Vex from "vexflow";
import VF = Vex.Flow;
import { Beam } from "../../VoiceData/Beam";
import { Note } from "../../VoiceData/Note";
import { SourceMeasure } from "../../VoiceData/SourceMeasure";
import { Staff } from "../../VoiceData/Staff";
import { StemDirectionType, VoiceEntry } from "../../VoiceData/VoiceEntry";

/**
 * A beam whose notes lie on two (or more) staves of one part (Schumann, Myrthen 1 Widmung m4–43,
 * 25 Aus den östlichen Rosen m2–36): the notes of the beam in one measure, from all staves, under one VexFlow beam.
 *
 * A source beam is cut into one segment per measure (as every beam is: each graphical measure beams its own notes,
 * and the reader closes a beam at the barline). A segment on more than one staff is a cross-staff segment: the
 * measures of the staves do not beam it, the measure of its lowest staff builds this beam over the VexFlow notes of
 * all of them (VexFlowMeasure.buildCrossStaffBeam), and the drawer formats and draws it once per drawing, with the
 * first of its measures, after the staves have their final positions (VexFlowMusicSheetDrawer.prepareCrossStaffBeams).
 *
 * Stems: the notes keep the direction the layout gave them — the XML `<stem>` when given, else the centred default
 * {@link CrossStaffBeam.centerStemDirection} (notes of the upper staff down, of the lower staff up: the beam between
 * the staves; also for XML stems all one way, EngravingRules.CrossStaffBeamsCenterUniformXmlStems). When the
 * directions differ ("mixed", the centred beam) the beam is placed by placeMixed() — VexFlow 1.2.93 cannot place
 * such a beam (it extends every stem as if it went the first note's way), so it is placed here, the same way as in
 * osmd-dart (VexFlow 5). When all stems go one way the beam is VexFlow's own.
 *
 * Same structure and numbers as osmd-dart lib/musical_score/graphical/vex_flow/cross_staff_beam.dart.
 */
export class CrossStaffBeam extends VF.Beam {
    /** Free stem between a notehead and the nearest beam line, at least (px): 2 staff spaces. */
    public static readonly MinClearStem: number = 20;

    public readonly sourceBeam: Beam;
    /** The measures of the beam's notes (VexFlowMeasure, set by the measure that builds the beam). */
    public participants: Object[] = [];

    /** VexFlow's formatter turns the stem of a note of one voice that would cross a note of another voice at the
     *  same time. A note's stem in this beam goes to the beam: it keeps its wanted direction (set again before every
     *  format of the beam). */
    private readonly directions: number[];
    private readonly staffIndices: number[];
    private mixed: boolean = false;
    private firstBeamY: number = 0;
    /** The notes the beam is placed from (see placeMixed()). */
    private readonly anchors: Set<VF.StemmableNote> = new Set<VF.StemmableNote>();

    /**
     * @param notes the VexFlow notes of the segment
     * @param directions each note's stem direction (VF.Stem.UP/DOWN, undefined = as the note has it)
     * @param staffIndices each note's staff in the instrument (0 = top)
     */
    constructor(notes: VF.StemmableNote[], sourceBeam: Beam, directions?: number[], staffIndices?: number[]) {
        super(CrossStaffBeam.withDirections(notes, directions), false);
        this.sourceBeam = sourceBeam;
        this.directions = directions ?? notes.map(() => undefined);
        this.staffIndices = staffIndices ?? notes.map(() => 0);
        this.initialize();
    }

    private static withDirections(notes: VF.StemmableNote[], directions: number[]): VF.StemmableNote[] {
        if (directions) {
            for (let i: number = 0; i < notes.length && i < directions.length; i++) {
                const direction: number = directions[i];
                if (direction !== undefined && notes[i].getStemDirection() !== direction) {
                    notes[i].setStemDirection(direction);
                }
            }
        }
        return notes;
    }

    private get beamNotes(): VF.StemmableNote[] {
        return (this as any).notes;
    }

    /** Whether the notes' stems go both ways (the beam lies between them). */
    public get isMixed(): boolean {
        return this.mixed;
    }

    /** The side of the secondary beams (VF.Stem.UP: the beam lines grow downwards from the primary line). */
    public get stemDirection(): number {
        return (this as any).stem_direction;
    }

    /** The stem direction the note has in this beam (its wanted direction; the formatter may have turned it since). */
    public stemDirectionOf(note: VF.StemmableNote): number {
        const index: number = this.beamNotes.indexOf(note);
        const direction: number = index >= 0 ? this.directions[index] : undefined;
        return direction ?? note.getStemDirection();
    }

    private initialize(): void {
        const notes: VF.StemmableNote[] = this.beamNotes;
        this.mixed = new Set(notes.map(n => n.getStemDirection())).size > 1;
        if (!this.mixed) {
            return;
        }
        // (The beam lines grow towards the first note's noteheads, as in VexFlow: stem_direction.)
        // The anchors: the notes of the top staff stemmed down towards the other staff (else those of the bottom staff
        //   stemmed up). Their stems have their own length and the sky/bottom line reserves them: the beam lies where the
        //   upper staff's bottom line kept room for it, under whatever is placed below that staff (Myrthen 6 m10: an f
        //   under the E4); the other notes' stems cross the room between the staves to it.
        const top: number = Math.min(...this.staffIndices);
        const bottom: number = Math.max(...this.staffIndices);
        notes.forEach((note, i) => {
            if (this.staffIndices[i] === top && note.getStemDirection() === VF.Stem.DOWN) {
                this.anchors.add(note);
            }
        });
        if (this.anchors.size === 0) {
            notes.forEach((note, i) => {
                if (this.staffIndices[i] === bottom && note.getStemDirection() === VF.Stem.UP) {
                    this.anchors.add(note);
                }
            });
        }
        if (this.anchors.size === 0) {
            notes.filter(n => n.getStemDirection() === this.stemDirection).forEach(n => this.anchors.add(n));
        }
    }

    private beamWidth(): number {
        return (this as any).render_options.beam_width ?? 5;
    }

    /** Height of the beam lines at a note (px): one beam level. */
    private stackHeight(note: VF.StemmableNote): number {
        return this.beamWidth();
    }

    public postFormat(): VF.Beam {
        if ((this as any).postFormatted) {
            return this;
        }
        CrossStaffBeam.withDirections(this.beamNotes, this.directions);
        // A beam is post-formatted again for every draw (the staves move between the skyline pass and the drawing):
        //   start from the notes' own stem lengths (as VexFlowPatch's Beam.postFormat does).
        //   The formatter may also have shortened a stem that would cross another voice's note (VexFlow 1.2.93's
        //   StaveNote.format setStemLength; VexFlow 5 turns the stem instead): the stem goes to the beam, drop that.
        for (const note of this.beamNotes) {
            (note as any).stemExtensionOverride = undefined;
            const stem: any = note.getStem();
            if (stem) {
                stem.setExtension((note as any).getStemExtension());
            }
        }
        if (this.mixed) {
            this.placeMixed();
            this.applyMixedStemExtensions();
            (this as any).postFormatted = true;
        } else {
            super.postFormat();
        }
        // VexFlow 1.2.93 sets a stem's x when its note is drawn, and the beam draws the stems: a note of another staff
        //   not drawn yet in this drawing still has the x of its last draw (the skyline pass). (VexFlow 5's
        //   Beam.drawStems sets it.)
        for (const note of this.beamNotes) {
            const stem: any = note.getStem();
            if (stem) {
                const stemX: number = note.getStemX();
                stem.setNoteHeadXBounds(stemX, stemX);
            }
        }
        return this;
    }

    public getBeamYToDraw(): number {
        return this.mixed ? this.firstBeamY : (VF.Beam.prototype as any).getBeamYToDraw.call(this);
    }

    /** The notehead nearest the beam (px): the top one of a stem-up note, the bottom one of a stem-down note. */
    private static headY(note: VF.StemmableNote): number {
        const ys: number[] = note.getYs();
        return note.getStemDirection() === VF.Stem.UP ? Math.min(...ys) : Math.max(...ys);
    }

    /** Offset of the beam lines' edge nearest the note from the primary line: the beam lines grow from the primary
     *  line towards the noteheads of the notes stemmed in the beam's direction. */
    private nearEdgeOffset(note: VF.StemmableNote): number {
        return note.getStemDirection() === this.stemDirection ? this.stemDirection * this.stackHeight(note) : 0;
    }

    /** The stem length a note would have on its own staff (px): 3.5 spaces and the beam extension of its duration. */
    public static defaultStemLength(note: VF.StemmableNote): number {
        return (VF.Stem as any).HEIGHT + (note as any).getStemExtension();
    }

    /** The stem a note of this beam reserves in its staff's sky/bottom line (px), measured before the staves are
     *  placed: an anchor its default length (the beam lies within it), any other note of a mixed beam MinClearStem (its
     *  stem crosses the room between the staves to the beam), every note of a beam stemmed one way its default length. */
    public reservedStemLength(note: VF.StemmableNote): number {
        return !this.mixed || this.anchors.has(note) ? CrossStaffBeam.defaultStemLength(note) : CrossStaffBeam.MinClearStem;
    }

    /** The primary beam line y = firstBeamY + slope · (x − first stem x): the anchors' stems end where they have their
     *  default length (the shortest exactly that long; an anchor stemmed against the beam's direction crosses its beam
     *  lines within it), every notehead at least MinClearStem from the nearest beam line; the slope as close to half the
     *  notes' contour as VexFlow's own beams (within its ±max_slope) and the anchors' stems as close to their default
     *  length. */
    private placeMixed(): void {
        const notes: VF.StemmableNote[] = this.beamNotes;
        const options: any = (this as any).render_options;
        const x0: number = notes[0].getStemX();
        const maxSlope: number = options.max_slope ?? 0.25;
        const minSlope: number = options.min_slope ?? -0.25;
        const iterations: number = options.slope_iterations ?? 20;
        const slopeCost: number = options.slope_cost ?? 100;
        const dxAll: number = notes[notes.length - 1].getStemX() - x0;
        const contour: number = Math.abs(dxAll) < 1e-6 ? 0 :
            (CrossStaffBeam.headY(notes[notes.length - 1]) - CrossStaffBeam.headY(notes[0])) / dxAll;
        const idealSlope: number = Math.min(maxSlope, Math.max(minSlope, contour / 2));
        const direction: number = this.stemDirection;
        const anchors: VF.StemmableNote[] = Array.from(this.anchors);
        const anchorsUp: boolean = anchors.length > 0 && anchors[0].getStemDirection() === VF.Stem.UP;
        const minClear: number = CrossStaffBeam.MinClearStem;

        let bestCost: number = Number.POSITIVE_INFINITY;
        let bestSlope: number = 0;
        let bestOffset: number = 0;
        const step: number = (maxSlope - minSlope) / iterations;
        for (let k: number = 0; k <= iterations; k++) {
            const slope: number = minSlope + k * step;
            let lower: number = Number.NEGATIVE_INFINITY; // beam line at x0, from stems down
            let upper: number = Number.POSITIVE_INFINITY; // from stems up
            let target: number = anchorsUp ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
            for (const note of notes) {
                const dx: number = note.getStemX() - x0;
                const near: number = this.nearEdgeOffset(note);
                const head: number = CrossStaffBeam.headY(note);
                if (note.getStemDirection() === VF.Stem.UP) {
                    upper = Math.min(upper, head - minClear - near - slope * dx);
                } else {
                    lower = Math.max(lower, head + minClear - near - slope * dx);
                }
                if (this.anchors.has(note)) {
                    // the primary line where the anchor's stem tip (the line, or past its beam lines when stemmed
                    //   against the beam) is at its default length from the notehead
                    const up: boolean = note.getStemDirection() === VF.Stem.UP;
                    const tipOffset: number = note.getStemDirection() === direction ? 0 : direction * this.stackHeight(note);
                    const length: number = CrossStaffBeam.defaultStemLength(note);
                    const line: number = head + (up ? -length : length) - tipOffset - slope * dx;
                    // the shortest anchor stem has its default length
                    target = up ? Math.min(target, line) : Math.max(target, line);
                }
            }
            const offset: number = lower <= upper ? Math.min(upper, Math.max(lower, target)) : (lower + upper) / 2;
            let extension: number = 0;
            for (const note of anchors) {
                const tipOffset: number = note.getStemDirection() === direction ? 0 : direction * this.stackHeight(note);
                const tip: number = offset + slope * (note.getStemX() - x0) + tipOffset;
                extension += Math.abs(Math.abs(tip - CrossStaffBeam.headY(note)) - CrossStaffBeam.defaultStemLength(note));
            }
            const shortage: number = Math.max(0, lower - upper);
            const cost: number = slopeCost * Math.abs(idealSlope - slope) + extension + 10 * shortage;
            if (cost < bestCost) {
                bestCost = cost;
                bestSlope = slope;
                bestOffset = offset;
            }
        }
        (this as any).slope = bestSlope;
        (this as any).y_shift = 0;
        this.firstBeamY = bestOffset;
    }

    /** Every stem to the beam: stems in the beam's direction end at the primary line, the others cross their own beam
     *  lines to its far side (as VexFlow 5's cross-stem extension does). */
    private applyMixedStemExtensions(): void {
        const notes: VF.StemmableNote[] = this.beamNotes;
        const x0: number = notes[0].getStemX();
        const slope: number = (this as any).slope;
        for (const note of notes) {
            const stem: any = note.getStem();
            if (!stem) {
                continue;
            }
            const lineY: number = this.firstBeamY + slope * (note.getStemX() - x0);
            const tip: number = note.getStemDirection() === this.stemDirection ? lineY : lineY + this.stemDirection * this.stackHeight(note);
            const currentTip: number = (note.getStemExtents() as any).topY;
            const extension: number = note.getStemDirection() === VF.Stem.UP ? currentTip - tip : tip - currentTip;
            stem.setExtension(stem.getExtension() + extension);
            stem.renderHeightAdjustment = -(VF.Stem as any).WIDTH / 2;
        }
    }

    // ---------------------------------------------------------------------
    // Model side: which beam segments cross staves.

    private static measureOf(note: Note): SourceMeasure {
        return note.ParentStaffEntry?.VerticalContainerParent?.ParentMeasure;
    }

    /** The notes of the note's beam in the note's measure (the beam segment the measure draws). */
    public static segmentOf(note: Note): Note[] {
        const beam: Beam = note.NoteBeam;
        if (!beam) {
            return [];
        }
        const measure: SourceMeasure = CrossStaffBeam.measureOf(note);
        return beam.Notes.filter(n => CrossStaffBeam.measureOf(n) === measure);
    }

    /** Whether the segment is beamed across staves: two notes or more, not grace notes, on more than one staff of one
     *  instrument. */
    public static isCrossStaffSegment(segment: Note[]): boolean {
        if (segment.length < 2) {
            return false;
        }
        const staves: Set<Staff> = new Set<Staff>();
        let instrument: Object = undefined;
        for (const note of segment) {
            const staff: Staff = note.ParentStaff;
            if (!staff || !note.ParentVoiceEntry || note.ParentVoiceEntry.IsGrace) {
                return false;
            }
            instrument = instrument ?? staff.ParentInstrument;
            if (instrument !== staff.ParentInstrument) {
                return false;
            }
            staves.add(staff);
        }
        return staves.size > 1;
    }

    /** The index of the note's staff in its instrument (0 = top). */
    public static staffIndexOf(note: Note): number {
        const staff: Staff = note.ParentStaff;
        return staff.ParentInstrument.Staves.indexOf(staff);
    }

    /** The centred stem direction of a voice entry in a cross-staff beam segment: down on the segment's top staff, up
     *  below it (the beam between the staves). Undefined: not in such a segment (or, with onlyIfXmlStemsUniform, not
     *  every note of it has the same XML stem). */
    public static centerStemDirection(voiceEntry: VoiceEntry, onlyIfXmlStemsUniform: boolean = false): StemDirectionType {
        for (const note of voiceEntry.Notes) {
            if (!note.NoteBeam) {
                continue;
            }
            const segment: Note[] = CrossStaffBeam.segmentOf(note);
            if (!CrossStaffBeam.isCrossStaffSegment(segment)) {
                return undefined;
            }
            if (onlyIfXmlStemsUniform) {
                const xml: Set<StemDirectionType> = new Set(segment.map(n => n.ParentVoiceEntry.StemDirectionXml));
                const single: StemDirectionType = xml.values().next().value;
                if (xml.size !== 1 || single === StemDirectionType.Undefined || single === undefined) {
                    return undefined;
                }
            }
            const top: number = Math.min(...segment.map(n => CrossStaffBeam.staffIndexOf(n)));
            return CrossStaffBeam.staffIndexOf(note) === top ? StemDirectionType.Down : StemDirectionType.Up;
        }
        return undefined;
    }
}
