import { GraphicalObject } from "./GraphicalObject";
import { VoiceEntry } from "../VoiceData/VoiceEntry";
import { GraphicalNote } from "./GraphicalNote";
import { GraphicalStaffEntry } from "./GraphicalStaffEntry";
import { OctaveEnum } from "../VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import { EngravingRules } from "./EngravingRules";
/**
 * The graphical counterpart of a [[VoiceEntry]].
 */
export declare class GraphicalVoiceEntry extends GraphicalObject {
    constructor(parentVoiceEntry: VoiceEntry, parentStaffEntry: GraphicalStaffEntry, rules?: EngravingRules);
    parentVoiceEntry: VoiceEntry;
    parentStaffEntry: GraphicalStaffEntry;
    notes: GraphicalNote[];
    /** The x of the centre of the column of note heads the notes are drawn in, relative to the voice entry like the positions
     *  of its notes: including the shift of all of them aside from another voice's notes, but not the shift of a single head
     *  beside the others (e.g. of a second in a chord), so the same for all notes of a chord. The column also has the heads of
     *  other voices that aren't moved aside from them, e.g. of a whole note beside a quarter note: its centre is that of the
     *  widest head. The fingerings of the notes are centred on it (see MusicSheetCalculator.calculateFingerings()).
     *  Set with the positions of the notes (see VexFlowStaffEntry.positionNotesAtNoteHeads()), undefined e.g. for a rest.
     */
    noteHeadsCenterX: number;
    /** Contains octave shifts affecting this voice entry, caused by octave brackets. */
    octaveShiftValue: OctaveEnum;
    protected rules: EngravingRules;
    GraceSlash: boolean;
    /** Sort this entry's notes by pitch.
     * Notes need to be sorted for Vexflow StaveNote creation.
     * Note that Vexflow needs the reverse order, see VexFlowConverter.StaveNote().
     */
    sort(): GraphicalNote[];
    /** Sort notes for vexflow (bottom to top), which needs them in the reverse order OSMD likes to have them.
     *  Note that sort() and reverse() replace the array in place,
     *  so to avoid changing the array one could copy it first, see sortedNotesCopyForVexflow() (commented),
     *  though copying the array is also unnecessary (time+memory) for now.
     */
    sortForVexflow(): GraphicalNote[];
    applyCustomNoteheads(): void;
    /** (Re-)color notes and stems
     */
    color(): void;
}
