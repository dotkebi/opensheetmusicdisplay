import Vex from "vexflow";
import VF = Vex.Flow;
import { GraphicalMeasure } from "../GraphicalMeasure";
import { VexFlowMeasureRepeat } from "./VexFlowMeasureRepeat";
import { SourceMeasure } from "../../VoiceData/SourceMeasure";
import { Staff } from "../../VoiceData/Staff";
import { StaffLine } from "../StaffLine";
import { SystemLinesEnum } from "../SystemLinesEnum";
import { ClefInstruction } from "../../VoiceData/Instructions/ClefInstruction";
import { KeyInstruction } from "../../VoiceData/Instructions/KeyInstruction";
import { RhythmInstruction } from "../../VoiceData/Instructions/RhythmInstruction";
import { Beam } from "../../VoiceData/Beam";
import { GraphicalNote } from "../GraphicalNote";
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";
import { Tuplet } from "../../VoiceData/Tuplet";
import { RepetitionInstruction } from "../../VoiceData/Instructions/RepetitionInstruction";
import { SystemLinePosition } from "../SystemLinePosition";
import { GraphicalVoiceEntry } from "../GraphicalVoiceEntry";
import { VexFlowVoiceEntry } from "./VexFlowVoiceEntry";
import { Voice } from "../../VoiceData/Voice";
import { EngravingRules } from "../EngravingRules";
import { GraphicalTie } from "../GraphicalTie";
/** A format of the voices of a vertical measure (see VexFlowMeasure.format()). */
export interface IVerticalMeasureFormat {
    /** The format function, shared by the measures of the vertical measure (see VexFlowMeasure.formatVoices). */
    formatVoices: (width: number, parent: VexFlowMeasure) => void;
    /** The width the voices were justified to, in pixels. */
    justifyWidth: number;
}
export declare class VexFlowMeasure extends GraphicalMeasure {
    /** Capability markers used by consumers to avoid reinstalling obsolete runtime patches. */
    static readonly HasMeasureLocalCorrectNotePositions: boolean;
    static readonly HasIntrinsicTickCorrection: boolean;
    constructor(staff: Staff, sourceMeasure?: SourceMeasure, staffLine?: StaffLine);
    /** octaveOffset according to active clef */
    octaveOffset: number;
    /** The VexFlow Voices in the measure */
    vfVoices: {
        [voiceID: number]: VF.Voice;
    };
    /** Call this function (if present) to x-format all the voices in the measure */
    formatVoices?: (width: number, parent: VexFlowMeasure) => void;
    /** The VexFlow Ties in the measure */
    vfTies: VF.StaveTie[];
    /** True while SkyBottomLineCalculator draws this measure to measure its skyline and bottom line (not real ink). */
    drawingForSkyline: boolean;
    /** The repetition instructions given as words or symbols (coda, dal segno..) */
    vfRepetitionWords: VF.Repetition[];
    /** Whether a metronome mark is drawn on this staff measure (they are drawn on the first visible staff). */
    hasMetronomeMark: boolean;
    /** The VexFlow Stave (= one measure in a staffline) */
    protected stave: VF.Stave;
    /** VexFlow StaveConnectors (vertical lines) */
    protected connectors: VF.StaveConnector[];
    /** Intermediate object to construct beams */
    private beams;
    /** Beams created by (optional) autoBeam function. */
    private autoVfBeams;
    /** Beams of tuplet notes created by (optional) autoBeam function. */
    private autoTupletVfBeams;
    /** VexFlow Beams */
    private vfbeams;
    /** Intermediate object to construct tuplets */
    protected tuplets: {
        [voiceID: number]: [Tuplet, VexFlowVoiceEntry[]][];
    };
    /** VexFlow Tuplets */
    private vftuplets;
    rules: EngravingRules;
    /** Repeat unit drawn in place of this measure's note content, if any. */
    MeasureRepeat: VexFlowMeasureRepeat;
    get NotesAreAbbreviated(): boolean;
    setAbsoluteCoordinates(x: number, y: number): void;
    /**
     * Reset all the geometric values and parameters of this measure and put it in an initialized state.
     * This is needed to evaluate a measure a second time by system builder.
     */
    resetLayout(): void;
    clean(): void;
    /**
     * returns the x-width (in units) of a given measure line {SystemLinesEnum}.
     * @param line
     * @returns the x-width in osmd units
     */
    getLineWidth(line: SystemLinesEnum): number;
    /**
     * adds the given clef to the begin of the measure.
     * This has to update/increase BeginInstructionsWidth.
     * @param clef
     */
    addClefAtBegin(clef: ClefInstruction): void;
    /**
     * Sets the number of stafflines that are rendered, so that they are centered properly
     * @param lineNumber
     */
    setLineNumber(lineNumber: number): void;
    /**
     * adds the given key to the begin of the measure.
     * This has to update/increase BeginInstructionsWidth.
     * @param currentKey the new valid key.
     * @param previousKey the old cancelled key. Needed to show which accidentals are not valid any more.
     * @param currentClef the valid clef. Needed to put the accidentals on the right y-positions.
     */
    addKeyAtBegin(currentKey: KeyInstruction, previousKey: KeyInstruction, currentClef: ClefInstruction): void;
    /**
     * adds the given rhythm to the begin of the measure.
     * This has to update/increase BeginInstructionsWidth.
     * @param rhythm
     */
    addRhythmAtBegin(rhythm: RhythmInstruction): void;
    /**
     * adds the given clef to the end of the measure.
     * This has to update/increase EndInstructionsWidth.
     * @param clef
     */
    addClefAtEnd(clef: ClefInstruction, visible?: boolean): void;
    addMeasureLine(lineType: SystemLinesEnum, linePosition: SystemLinePosition, renderInitialLine?: boolean): void;
    /**
     * Adds a measure number to the top left corner of the measure
     * This method is not used currently in favor of the calculateMeasureNumberPlacement
     * method in the MusicSheetCalculator.ts
     */
    addMeasureNumber(): void;
    /**
     * Adds a repetition instruction (e.g. Segno, D.S. al Fine) as a VexFlow StaveRepetition to the measure's stave
     * (or as a Volta for endings).
     * @param repetitionInstruction the instruction to add
     * @returns the created VF.Repetition, or undefined if a volta (ending) was added instead
     */
    addWordRepetition(repetitionInstruction: RepetitionInstruction): VF.Repetition;
    protected addVolta(repetitionInstruction: RepetitionInstruction): void;
    /**
     * Sets the overall x-width of the measure.
     * @param width
     */
    setWidth(width: number): void;
    /**
     * This method is called after the StaffEntriesScaleFactor has been set.
     * Here the final x-positions of the staff entries have to be set.
     * (multiply the minimal positions with the scaling factor, considering the BeginInstructionsWidth)
     */
    layoutSymbols(): void;
    /**
     * Draw this measure on a VexFlow CanvasContext
     * @param ctx
     */
    draw(ctx: Vex.IRenderContext): void;
    /** Draws this measure's note content. */
    private drawNotes;
    /** Makes the beams drawn by draw() extend their notes' stems now, before the notes are drawn.
     * A Vexflow beam extends its notes' stems to reach it in Beam.postFormat(), which Beam.draw() calls, i.e. after the notes
     * were drawn. But a note's modifiers are placed from its stem as the note is drawn, e.g. an ornament above a stem-up note
     * (Ornament.draw() reads note.getStem().getExtents()). So the first draw of a measure, the one that measures the skyline
     * (SkyBottomLineCalculator), drew such an ornament from the unextended stem, lower than every later draw: the skyline missed
     * the ornament as rendered, and what was placed from the skyline could cover it, e.g. a fingering in Bach's Prelude BWV 847
     * m.34 (test_ornament_fingering_beamed_stem_up_bwv847_measure34).
     */
    private postFormatBeams;
    /**
     * Formats the voices of this measure's vertical measure, i.e. of all its staves (see VexFlowMusicSheetCalculator.formatMeasures()),
     * to the width of this measure's stave.
     * @param lastFormats For a series of formats, like the skyline calculation's (see SkyBottomLineCalculator), which formats every
     *   measure, and so each vertical measure once per staff: the last format of each vertical measure in the series.
     *   A format that would just repeat the last one of its vertical measure is skipped: it would compute the same result again
     *   (see isRepeatedFormat()). Without lastFormats, the measure is always formatted.
     */
    format(lastFormats?: Map<SourceMeasure, IVerticalMeasureFormat>): void;
    /**
     * Whether formatting this measure now would repeat the last format of its vertical measure in lastFormats: the same format
     * function (shared by the vertical measure's staves, unless they align rests differently) to the same width. The staves of
     * a vertical measure have the same width and aligned note start x (see Stave.formatBegModifiers()), so that's the rule,
     * and the repeated format would compute the same result, leaving the voices as they are. Otherwise, records this format
     * in lastFormats as the vertical measure's last one.
     * Never a repeat if the vertical measure has tablature: a tab note re-measures its width with the stave's current context
     * when it's drawn (TabNote.setStave()), which can change the result of the next format.
     * @param lastFormats the last format of each vertical measure in a series of formats.
     * @returns true if the format would be a repeat (and can be skipped), false if it was recorded as the last format.
     */
    private isRepeatedFormat;
    /**
     * Places each note at the height of its drawn note head, relative to its voice entry, e.g. where a click finds it
     * (GraphicalMusicSheet.GetNearestNote()). A voice entry is at the top of its Vexflow note's bounding box (see
     * VexFlowVoiceEntry.applyBordersFromVexflow()), e.g. the stem tip of a note with its stem up, and stems differ in length:
     * the stems of grace notes and cue notes are shorter, those of 32nd notes longer.
     * A note's x: see VexFlowStaffEntry.calculateXPosition(). Called at the end of draw() (note.setIndex() needs to have been called).
     */
    correctNotePositions(): void;
    /**
     * Places each note of this TAB measure on its string, where its fret number is drawn.
     * The voice entry is placed on the string of its last note, and its notes relative to it, at its x (the right end of the widest
     * fret number, see VexFlowStaffEntry.calculateXPosition()). The voice entry's bounding box spans its notes, e.g. all strings of a chord.
     */
    private correctTabNotePositions;
    /**
     * Returns all the voices that are present in this measure
     */
    getVoicesWithinMeasure(): Voice[];
    /**
     * Returns all the graphicalVoiceEntries of a given Voice.
     * @param voice the voice for which the graphicalVoiceEntries shall be returned.
     */
    getGraphicalVoiceEntriesPerVoice(voice: Voice): GraphicalVoiceEntry[];
    /**
     * Finds the gaps between the existing notes within a measure.
     * Problem here is, that the graphicalVoiceEntry does not exist yet and
     * that Tied notes are not present in the normal voiceEntries.
     * To handle this, calculation with absolute timestamps is needed.
     * And the graphical notes have to be analysed directly (and not the voiceEntries, as it actually should be -> needs refactoring)
     * @param voice the voice for which the ghost notes shall be searched.
     */
    protected getRestFilledVexFlowStaveNotesPerVoice(voice: Voice): GraphicalVoiceEntry[];
    /**
     * Reduces the vexflow ticks of the given tickables in proportion if they don't fit into the available time,
     * unless there is no time available.
     * @returns the ticks the tickables take together
     */
    private fitTicks;
    private createGhostGves;
    /**
     * Add a note to a beam
     * @param graphicalNote
     * @param beam
     */
    handleBeam(graphicalNote: GraphicalNote, beam: Beam): void;
    handleTuplet(graphicalNote: GraphicalNote, tuplet: Tuplet): void;
    /**
     * Complete the creation of VexFlow Beams in this measure
     */
    finalizeBeams(): void;
    /** VexFlow rejects a beam when even one formatted endpoint is quarter-note length or longer. */
    private canCreateVexFlowBeam;
    /** Automatically creates beams for notes except beamedNotes, using Vexflow's Beam.generateBeams().
     *  Takes options from this.rules.AutoBeamOptions.
     * @param beamedNotes notes that will not be autobeamed (usually because they are already beamed)
     */
    private autoBeamNotes;
    /**
     * Complete the creation of VexFlow Tuplets in this measure
     */
    finalizeTuplets(): void;
    layoutStaffEntry(graphicalStaffEntry: GraphicalStaffEntry): void;
    /** Whether a grace note gets the slash given in the XML (slash="yes"): only the first of several grace notes in a row
     *  (Vexflow would draw a slash through each of them), and not a hidden one (Vexflow would draw its slash anyway). */
    private hasGraceSlash;
    graphicalMeasureCreatedCalculations(): void;
    /** Share modifier spacing with the note's accidentals, and keep clef/key order explicit. */
    private attachInStaffKeys;
    protected createInStaffInstructionVoice(): void;
    private createArpeggio;
    /** The VexFlow notes of the arpeggio's other participating voice entries (the stroke's own note is left out),
     *  resolved when the stroke is drawn, so that notes of other voices and of the other staff exist and are formatted.
     *  While the measure is drawn for its skyline/bottom line, notes of other staves are left out: the wavy line's part
     *  in the other staff is not this staff's ink (it would push this staff's bottom line down to the other staff). */
    private arpeggioSpanNotes;
    /**
     * Copy the stem directions chosen by VexFlow to the StemDirection variable of the graphical notes
     */
    private setStemDirectionFromVexFlow;
    /**
     * Create the articulations for all notes of the current staff entry
     */
    protected createArticulations(): void;
    /**
     * Create the ornaments for all notes of the current staff entry
     */
    protected createOrnaments(): void;
    /** Creates vexflow fingering elements.
     * Note that this is currently only used for Left and Right fingering positions, not Above and Below,
     * in which case they are instead added via MusicSheetCalculator.calculateFingerings() as Labels with bounding boxes.
     */
    protected createFingerings(voiceEntry: GraphicalVoiceEntry): void;
    protected createStringNumber(voiceEntry: GraphicalVoiceEntry): void;
    /**
     * Creates a line from 'top' to this measure, of type 'lineType'
     * @param top
     * @param lineType
     */
    lineTo(top: VexFlowMeasure, lineType: any, xShift?: number): void;
    /** The ornaments drawn above (or below) this measure's notes (VexFlowPatch ornament.js records where). */
    private ornamentsAt;
    private ornamentInkAt;
    /** Where the ornaments above the notes were drawn, without a raise over a slur (see
     *  MusicSheetCalculator.calculateOrnaments()), in units relative to the staff line (x) and its top line (y),
     *  like its sky line.
     */
    get OrnamentInk(): {
        ornament: any;
        left: number;
        right: number;
        top: number;
        bottom: number;
    }[];
    /** Where the ornaments below the notes were drawn, like [[OrnamentInk]], without a drop under a slur. */
    get BelowOrnamentInk(): {
        ornament: any;
        left: number;
        right: number;
        top: number;
        bottom: number;
    }[];
    /** Forget the raises (drops) of the ornaments over (under) slurs from a previous layout. */
    resetOrnamentSlurClearance(): void;
    /**
     * Return the VexFlow Stave corresponding to this graphicalMeasure
     * @returns {VF.Stave}
     */
    getVFStave(): VF.Stave;
    /**
     * After re-running the formatting on the VexFlow Stave, update the
     * space needed by Instructions (in VexFlow: StaveModifiers)
     */
    protected updateInstructionWidth(): void;
    addStaveTie(stavetie: VF.StaveTie, graphicalTie: GraphicalTie): void;
}
export declare enum StavePositionEnum {
    LEFT = 1,
    RIGHT = 2,
    ABOVE = 3,
    BELOW = 4,
    BEGIN = 5,
    END = 6
}
