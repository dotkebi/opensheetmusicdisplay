import Vex from "vexflow";
import VF = Vex.Flow;
import { Beam } from "../../VoiceData/Beam";
import { Note } from "../../VoiceData/Note";
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
export declare class CrossStaffBeam extends VF.Beam {
    /** Free stem between a notehead and the nearest beam line, at least (px): 2 staff spaces. */
    static readonly MinClearStem: number;
    readonly sourceBeam: Beam;
    /** The measures of the beam's notes (VexFlowMeasure, set by the measure that builds the beam). */
    participants: Object[];
    /** VexFlow's formatter turns the stem of a note of one voice that would cross a note of another voice at the
     *  same time. A note's stem in this beam goes to the beam: it keeps its wanted direction (set again before every
     *  format of the beam). */
    private readonly directions;
    private readonly staffIndices;
    private mixed;
    private firstBeamY;
    /** The notes the beam is placed from (see placeMixed()). */
    private readonly anchors;
    /**
     * @param notes the VexFlow notes of the segment
     * @param directions each note's stem direction (VF.Stem.UP/DOWN, undefined = as the note has it)
     * @param staffIndices each note's staff in the instrument (0 = top)
     */
    constructor(notes: VF.StemmableNote[], sourceBeam: Beam, directions?: number[], staffIndices?: number[]);
    private static withDirections;
    private get beamNotes();
    /** Whether the notes' stems go both ways (the beam lies between them). */
    get isMixed(): boolean;
    /** The side of the secondary beams (VF.Stem.UP: the beam lines grow downwards from the primary line). */
    get stemDirection(): number;
    /** The stem direction the note has in this beam (its wanted direction; the formatter may have turned it since). */
    stemDirectionOf(note: VF.StemmableNote): number;
    private initialize;
    private beamWidth;
    /** Height of a note's own beam lines (px): its beam count lines of the beam width, 1.5 beam widths apart. */
    private stackHeight;
    postFormat(): VF.Beam;
    getBeamYToDraw(): number;
    /** The notehead nearest the beam (px): the top one of a stem-up note, the bottom one of a stem-down note. */
    private static headY;
    /** Offset of the beam lines' edge nearest the note from the primary line: the beam lines grow from the primary
     *  line towards the noteheads of the notes stemmed in the beam's direction. */
    private nearEdgeOffset;
    /** The stem length a note would have on its own staff (px): 3.5 spaces and the beam extension of its duration. */
    static defaultStemLength(note: VF.StemmableNote): number;
    /** The stem a note of this beam reserves in its staff's sky/bottom line (px), measured before the staves are
     *  placed: an anchor its default length (the beam lies within it), any other note of a mixed beam MinClearStem (its
     *  stem crosses the room between the staves to the beam), every note of a beam stemmed one way its default length. */
    reservedStemLength(note: VF.StemmableNote): number;
    /** The primary beam line y = firstBeamY + slope · (x − first stem x): the anchors' stems end where they have their
     *  default length (the shortest exactly that long; an anchor stemmed against the beam's direction crosses its beam
     *  lines within it), every notehead at least MinClearStem from the nearest beam line; the slope as close to half the
     *  notes' contour as VexFlow's own beams (within its ±max_slope) and the anchors' stems as close to their default
     *  length. */
    private placeMixed;
    /** Every stem to the beam: stems in the beam's direction end at the primary line, the others cross their own beam
     *  lines to its far side (as VexFlow 5's cross-stem extension does). */
    private applyMixedStemExtensions;
    private static measureOf;
    /** The notes of the note's beam in the note's measure (the beam segment the measure draws). */
    static segmentOf(note: Note): Note[];
    /** Whether the segment is beamed across staves: two notes or more, not grace notes, on more than one staff of one
     *  instrument. */
    static isCrossStaffSegment(segment: Note[]): boolean;
    /** The index of the note's staff in its instrument (0 = top). */
    static staffIndexOf(note: Note): number;
    /** The centred stem direction of a voice entry in a cross-staff beam segment: down on the segment's top staff, up
     *  below it (the beam between the staves). Undefined: not in such a segment (or, with onlyIfXmlStemsUniform, not
     *  every note of it has the same XML stem). */
    static centerStemDirection(voiceEntry: VoiceEntry, onlyIfXmlStemsUniform?: boolean): StemDirectionType;
}
