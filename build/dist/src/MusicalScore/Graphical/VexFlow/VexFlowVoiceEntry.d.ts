import Vex from "vexflow";
import VF = Vex.Flow;
import { VoiceEntry } from "../../VoiceData/VoiceEntry";
import { GraphicalVoiceEntry } from "../GraphicalVoiceEntry";
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";
import { EngravingRules } from "../EngravingRules";
export declare class VexFlowVoiceEntry extends GraphicalVoiceEntry {
    private mVexFlowStaveNote;
    vfGhostNotes: VF.GhostNote[];
    /** A grace note that no main note follows in its staff entry (e.g. the only note of its voice there), drawn as its own
     *  tickable of the voice. Unlike a grace note after its main note (VoiceEntry.GraceAfterMainNote), it keeps its timestamp. */
    isStandAloneGrace: boolean;
    constructor(parentVoiceEntry: VoiceEntry, parentStaffEntry: GraphicalStaffEntry, rules?: EngravingRules);
    /** The y and height (px) of a note of a cross-staff beam for the layout: its noteheads and the stem the sky/bottom
     *  line reserves for it (CrossStaffBeam.reservedStemLength), not the stem it is drawn with, which reaches the beam
     *  between the staves (as osmd-dart, whose borders are read again after a progressive draw). Undefined: not in a
     *  cross-staff beam. */
    private static crossStaffBeamNoteBox;
    applyBordersFromVexflow(): void;
    set vfStaveNote(value: VF.StemmableNote);
    get vfStaveNote(): VF.StemmableNote;
    /** Apply custom noteheads from Note.CustomNoteheadVFCode. This should happen before color(). */
    applyCustomNoteheads(): void;
    /** Whether the note is drawn although its own notehead is hidden (print-object="no"), because it shares the
     * notehead of a visible unison note in another voice and its stem is beamed. The stem emanates from the shared
     * notehead and has to reach the beam. E.g. Beethoven Moonlight Sonata 1st mvt. m.37, heads of the same shape
     * (test_unison_notehead_moonlight_sonata_measure37), and Debussy Arabesque no. 1 m.3, where the hidden eighth's
     * stem rises from a half note's head (test_unison_notehead_tuplet_arabesque_measure3). Vexflow lays the hidden
     * note's notehead out beside the visible one only next to a whole note (mergeableUnison in the VexFlowPatch
     * stavenote.js, see hiddenUnisonBaseHead in VexFlowMusicSheetCalculator.calculateMeasureXLayout()): there it has
     * to be drawn too, otherwise the beam ends on a bare stem with nothing under it.
     * The beam has to be drawn, i.e. join the note to other drawn notes (see inDrawnBeam). Hidden notes that only
     * write out a tremolo for playback, e.g. 16ths under a dotted half with tremolo strokes, are beamed among
     * themselves, and only the first of them shares the half's notehead: it was drawn as a lone 16th with flags
     * (test_unison_hidden_tremolo_playback_notes_actor_prelude_measure33). */
    private drawnAsSharedUnisonNote;
    /** Whether the Vexflow note is part of a beam that is drawn. VexFlowMeasure.finalizeBeams() creates a Vexflow beam
     * only for two or more notes, and Vexflow sets StemmableNote.beam for each of them. */
    private get inDrawnBeam();
    /** Whether the notehead of a hidden unison note (see drawnAsSharedUnisonNote) lands exactly on the head of the
     * visible note it shares, but with another shape, e.g. a filled eighth note head on an open half note head.
     * Vexflow leaves the two heads in one column on purpose where the hidden note is on the base line of its stave
     * note (see drawnAsSharedUnisonNote), and also where the visible note is another note of a chord: Vexflow only
     * compares the base line of each stave note, so it misses that unison. Drawing the hidden head there would fill
     * the visible open head, which then reads as a quarter note - e.g. Liszt's Liebestraum no. 3 m.42, an eighth
     * note run starting on the E3 of a dotted half E2-E3 chord (test_unison_notehead_over_chord_liebestraum_measure42).
     * Where the two heads have the same shape, the hidden one is inked over the visible one without changing it. */
    private overprintsSharedHeadOfOtherShape;
    /** (Re-)color notes and stems by setting their Vexflow styles.
     * Could be made redundant by a Vexflow PR, but Vexflow needs more solid and permanent color methods/variables for that
     * See VexFlowConverter.StaveNote()
     */
    color(): void;
}
