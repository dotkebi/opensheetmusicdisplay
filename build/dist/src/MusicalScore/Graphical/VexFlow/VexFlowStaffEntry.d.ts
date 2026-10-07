import Vex from "vexflow";
import VF = Vex.Flow;
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";
import { VexFlowMeasure } from "./VexFlowMeasure";
import { SourceStaffEntry } from "../../VoiceData/SourceStaffEntry";
import { VexFlowKeySignatureNote } from "./VexFlowKeySignatureNote";
export declare class VexFlowStaffEntry extends GraphicalStaffEntry {
    constructor(measure: VexFlowMeasure, sourceStaffEntry: SourceStaffEntry, staffEntryParent: VexFlowStaffEntry);
    vfClefBefore: VF.ClefNote;
    /** vfClefBefore follows the grace notes of the entry (ClefInstruction.AfterGraceNotes), see VexFlowMeasure */
    vfClefAfterGraceNotes: boolean;
    vfKeys: VexFlowKeySignatureNote[];
    vfInStaffInstructionNote: VF.GhostNote;
    /**
     * Calculates the staff entry positions from the VexFlow stave information and the tickabels inside the staff.
     * This is needed in order to set the OSMD staff entries (which are almost the same as tickables) to the correct positions.
     * It is also needed to be done after formatting!
     */
    calculateXPosition(): void;
    /**
     * Places the voice entries of grace notes where Vexflow draws them, relative to the staff entry (see calculateXPosition()),
     * like the voice entries that give the staff entry its position. Otherwise they would be at the main note's position,
     * and e.g. a click on the main note could find its grace note instead (GraphicalMusicSheet.GetNearestVoiceEntry()).
     */
    private positionGraceEntries;
    /**
     * Places the syllables sung on grace notes at their grace notes (GraphicalLyricEntry.placeAtGraceNote()), which
     * positionGraceEntries() has just placed. A lyric label is positioned relative to its staff entry, i.e. at the main note
     * the grace note belongs to, where the main note's own syllable overlapped it. That syllable is kept clear of the grace
     * note's by VexFlowMusicSheetCalculator.fitGraceLyricsToFormattedEntries().
     */
    private placeGraceLyrics;
    /**
     * Places the notes where they are drawn, relative to their voice entries: at the centres of their note heads, or of their
     * fret numbers in a TAB staff. That's where e.g. a click finds them (GraphicalMusicSheet.GetNearestNote()), and where slurs
     * start and end (GraphicalSlur.calculateStartAndEnd()).
     * The staff entry (e.g. for the cursor) and its voice entries can be elsewhere (see calculateXPosition(), positionGraceEntries()):
     * - in the middle of a Vexflow note's width, which includes e.g. the flag of an unbeamed note with its stem up (so it's at the
     *   right edge of the note head), or a note head displaced beside the others (e.g. of a second in a chord),
     * - moved by the widest left border of its voice entries, e.g. of another voice's note with an accidental, or which Vexflow
     *   moves aside so that the voices' notes don't overlap (x shift),
     * - at the right end of the widest fret number of a TAB chord.
     * The notes' y: see VexFlowMeasure.correctNotePositions().
     * Also sets the centre of the column of note heads of each voice entry (GraphicalVoiceEntry.noteHeadsCenterX).
     */
    private positionNotesAtNoteHeads;
    /** The x (in pixels) at which Vexflow draws the note's head, or a TAB note's fret number, and its width. */
    private static drawnHead;
    setMaxAccidentals(): number;
    setModifierXOffsets(): void;
    private applyModifierOffsets;
    /**
     * Calculate x offsets for overlapping string and fingering modifiers in a chord.
     */
    private calculateModifierXOffsets;
}
