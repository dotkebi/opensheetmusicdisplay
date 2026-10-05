import { MusicSheetCalculator } from "../MusicSheetCalculator";
import { GraphicalMeasure } from "../GraphicalMeasure";
import { StaffLine } from "../StaffLine";
import { VoiceEntry } from "../../VoiceData/VoiceEntry";
import { GraphicalNote } from "../GraphicalNote";
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";
import { GraphicalTie } from "../GraphicalTie";
import { Tie } from "../../VoiceData/Tie";
import { SourceMeasure } from "../../VoiceData/SourceMeasure";
import { MultiExpression } from "../../VoiceData/Expressions/MultiExpression";
import { RepetitionInstruction } from "../../VoiceData/Instructions/RepetitionInstruction";
import { Beam } from "../../VoiceData/Beam";
import { ClefInstruction } from "../../VoiceData/Instructions/ClefInstruction";
import { OctaveEnum } from "../../VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import { Fraction } from "../../../Common/DataObjects/Fraction";
import { LyricWord } from "../../VoiceData/Lyrics/LyricsWord";
import { OrnamentContainer } from "../../VoiceData/OrnamentContainer";
import { Articulation } from "../../VoiceData/Articulation";
import { Tuplet } from "../../VoiceData/Tuplet";
import { VexFlowMeasure } from "./VexFlowMeasure";
import Vex from "vexflow";
import VF = Vex.Flow;
import { TechnicalInstruction } from "../../VoiceData/Instructions/TechnicalInstruction";
import { Slur } from "../../VoiceData/Expressions/ContinuousExpressions/Slur";
import { GraphicalSlur } from "../GraphicalSlur";
import { InstantaneousTempoExpression } from "../../VoiceData/Expressions/InstantaneousTempoExpression";
import { EngravingRules } from "../EngravingRules";
import { CooperativeYielder } from "../../../Util/CooperativeYielder";
import { GraphicalGlissando } from "../GraphicalGlissando";
import { Glissando } from "../../VoiceData/Glissando";
export declare class VexFlowMusicSheetCalculator extends MusicSheetCalculator {
    /** space needed for a dash for lyrics spacing, calculated once */
    private dashSpace;
    beamsNeedUpdate: boolean;
    /** Per-staff overflow (in pre-elongation units) of the previous measure's last lyric/chord
     *  past its bar line. Used to prevent the next measure's first lyric/chord from colliding
     *  with the overflow. Indexed first by Staff, then by verse/container index. */
    private previousLyricOverflowsByStaff;
    private previousChordOverflowsByStaff;
    private metronomePlacements;
    /** Multi-measure repeat units awaiting skyline reservation in the current render. */
    private measureRepeatUnitsPendingSkyline;
    constructor(rules: EngravingRules);
    protected clearRecreatedObjects(): void;
    protected formatMeasures(): void;
    /** Assigns repeat signs after fully written-out measures establish widths and system breaks. */
    private prepareMeasureRepeats;
    /** Groups each staff's contiguous valid repeat declarations into complete units. */
    private static findMeasureRepeatUnits;
    /** Assigns a repeat sign when its unit and referenced pattern are visible and abbreviable. */
    private tryCreateMeasureRepeat;
    /** Whether the unit can hide its notes without losing instructions, lyrics or connections to visible notation. */
    private static canAbbreviateMeasureRepeatUnit;
    /** Scan backwards to a rest-only entry or a lyric in any verse, matching calculateLyricExtend()'s forward scan. */
    private static hasIncomingLyricExtender;
    /** Whether a connection leaves this staff's unit, or a slur has an unattached end that may reach the barline. */
    private static measureRepeatNoteCrosses;
    /** Collects trill wavy-line ranges for this staff. */
    private findWavyLineRanges;
    /** Reserve after calculateSkyBottomLines() replaces the skyline and before measure numbers are placed above it. */
    protected reserveSkylineForMeasureRepeats(): void;
    /**
     * Calculates the x layout of the staff entries within the staff measures belonging to one source measure.
     * All staff entries are x-aligned throughout all vertically aligned staff measures.
     * This method is called within calculateXLayout.
     * The staff entries are aligned with minimum needed x distances.
     * The MinimumStaffEntriesWidth of every measure will be set - needed for system building.
     * Prepares the VexFlow formatter for later formatting
     * Does not calculate measure width from lyrics (which is called from MusicSheetCalculator)
     * @param measures
     * @returns the minimum required x width of the source measure (=list of staff measures)
     */
    protected calculateMeasureXLayout(measures: GraphicalMeasure[]): number;
    private calculateElongationFactor;
    /**
     * @param previousLyricOverflows Per-verse-index array (`[verseIndex]`) holding how far the
     *   previous measure's last lyric extends past its bar line into this measure (in pre-elongation
     *   units, +dashSpace if mid-word). Used to seed lastLyricEntryDict so the first lyric in this
     *   measure is forced to leave clearance from the overhang.
     * @param previousChordOverflows Same as previousLyricOverflows but for chord symbols.
     * @returns
     *   - `factor`: regular elongation factor from within-measure spacing constraints (subject to
     *     MaximumLyricsElongationFactor cap by the caller).
     *   - `lastLyricEntryDict` / `lastChordEntryDict`: final state of the per-verse last-entry
     *     dicts after processing. The caller uses these (with the post-cap measure width) to
     *     compute the overflows passed into the next measure's call.
     */
    calculateElongationFactorFromStaffEntries(staffEntries: GraphicalStaffEntry[], oldMinimumStaffEntriesWidth: number, elongationFactorForMeasureWidth: number, measureNumber: number, previousLyricOverflows?: number[], previousChordOverflows?: number[]): {
        factor: number;
        lastLyricEntryDict: {
            [i: number]: any;
        };
        lastChordEntryDict: {
            [i: number]: any;
        };
    };
    calculateMeasureWidthFromStaffEntries(measuresVertical: GraphicalMeasure[], oldMinimumStaffEntriesWidth: number): number;
    /**
     * Dynamics and wedges are placed only after the systems are laid out, so they never widened their measure:
     * in a measure that stays near its minimum width, "sf > sf > sf" squeezed its wedges to nothing
     * (Enescu, Cantabile et Presto m38). AlignmentManager puts neighbouring dynamics, verbal dynamics ("cresc.")
     * and wedges on one baseline, where they can only make room for each other sideways.
     * So, like the lyrics, reserve their width here: on each side of a staff, a dynamic must clear an earlier one
     * by DynamicExpressionSpacer, and a wedge between two of them needs WedgeMinLength and another spacer.
     * Same timestamps are left to the vertical alignment. Words are not reserved: the skyline stacks them clear of the dynamics.
     * The measure grows by at most MaximumDynamicsElongationFactor of its minimum width; beyond that the dynamics are left overlapping (debug log).
     * The gaps are checked with the formatter: widening a measure does not widen its note gaps in proportion.
     * (Same as osmd-dart's VexFlowMusicSheetCalculator._fitExpressionsToFormattedEntries.)
     * @returns the minimum staff entries width, widened if needed
     */
    private fitExpressionsToFormattedEntries;
    /** The dynamics and wedges that start in measure on the staff of staffIndex,
     *  with the label widths they will be drawn with (calculateDynamicExpressions()). */
    private expressionSlots;
    /** Dynamic pairs on one side of a staff that start at different timestamps, with the distance the later one must keep from the earlier one. */
    private expressionPairs;
    /** The x of timestamp (relative to its measure) between the measure's staff entries,
     *  as getRelativePositionInStaffLineFromTimestamp() interpolates it. */
    private xAtTimestamp;
    private computeContainerOverflows;
    protected createGraphicalTie(tie: Tie, startGse: GraphicalStaffEntry, endGse: GraphicalStaffEntry, startNote: GraphicalNote, endNote: GraphicalNote): GraphicalTie;
    protected updateStaffLineBorders(staffLine: StaffLine): void;
    protected graphicalMeasureCreatedCalculations(measure: GraphicalMeasure): void;
    /**
     * Can be used to calculate articulations, stem directions, helper(ledger) lines, and overlapping note x-displacement.
     * Is Excecuted per voice entry of a staff entry.
     * After that layoutStaffEntry is called.
     * @param voiceEntry
     * @param graphicalNotes
     * @param graphicalStaffEntry
     * @param hasPitchedNote
     */
    protected layoutVoiceEntry(voiceEntry: VoiceEntry, graphicalNotes: GraphicalNote[], graphicalStaffEntry: GraphicalStaffEntry, hasPitchedNote: boolean): void;
    /**
     * Do all layout calculations that have to be done per staff entry, like dots, ornaments, arpeggios....
     * This method is called after the voice entries are handled by layoutVoiceEntry().
     * @param graphicalStaffEntry
     */
    protected layoutStaffEntry(graphicalStaffEntry: GraphicalStaffEntry): void;
    /**
     * Is called at the begin of the method for creating the vertically aligned staff measures belonging to one source measure.
     */
    protected initGraphicalMeasuresCreation(): void;
    /**
     * add here all given articulations to the VexFlowGraphicalStaffEntry and prepare them for rendering.
     * @param articulations
     * @param voiceEntry
     * @param graphicalStaffEntry
     */
    protected layoutArticulationMarks(articulations: Articulation[], voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry): void;
    /**
     * Calculate the shape (Bezier curve) for this tie.
     * @param tie
     * @param tieIsAtSystemBreak
     * @param isTab Whether this tie is for a tab note (guitar tabulature)
     */
    protected layoutGraphicalTie(tie: GraphicalTie, tieIsAtSystemBreak: boolean, isTab: boolean): void;
    protected calculateDynamicExpressionsForMultiExpression(multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void;
    protected createMetronomeMark(metronomeExpression: InstantaneousTempoExpression): void;
    /** Measures the drawn mark and its clearance from the notation, before tempo text takes its space. */
    private prepareMetronomePlacement;
    protected layoutMetronomeMarks(): void;
    /** The note, dots and number (or the <per-minute> text, e.g. "c. 108") of a simple metronome mark for VexFlow's StaveTempo. */
    private static staveTempoOfMetronomeMark;
    /** Convert MetronomeNoteGroup data into the format expected by VexFlow's StaveTempo.drawNoteEquation(). */
    private buildNoteEquationForVexFlow;
    protected calculateRehearsalMark(measure: SourceMeasure): void;
    /** Returns the leftmost (smallest x) Above-placed chord symbol container in the measure, or undefined if there is none.
     *  The rehearsal mark sits at the measure start, so this is the chord it can collide with (see calculateRehearsalMark). */
    private getFirstChordSymbolAbove;
    /**
     * Calculate a single OctaveShift for a [[MultiExpression]].
     * @param sourceMeasure
     * @param multiExpression
     * @param measureIndex
     * @param staffIndex
     */
    protected calculateSingleOctaveShift(sourceMeasure: SourceMeasure, multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void;
    private hasVexFlowNote;
    /** Instruction-only entries carry key/clef changes but cannot anchor a line or bracket. */
    private findBoundaryNoteEntry;
    /** Finds the last staffline measure with a note that can anchor an expression. */
    protected findLastStafflineMeasure(staffline: StaffLine): GraphicalMeasure;
    /** The staff entries around a pedal stop that falls between the entries of endMeasure: the release is drawn at the
     *  time-proportional x between the entry before it and the entry after it (or the measure end). */
    private findPedalReleaseAnchor;
    /** VexFlow px from anchorNote (the entry before the time) to the time-proportional point between it and the next
     *  entry (or the measure end); undefined when the anchor is the entry after the time. */
    private interpolatedPedalAnchorOffset;
    /** VexFlow px from the end note to an interpolated release (undefined when the release is at a note), at least a
     *  depress mark's width right of the pedal's own Ped. in the same segment. */
    private interpolatedPedalReleaseXOffset;
    /** The Ped. of a symbol pedal stays a text margin right of the * of the previous pedal on the staff line (an x rule,
     *  not a skyline one): a release and the next depress close together in time would otherwise be drawn over each
     *  other. A change already keeps its own gap; a release at the stave end, a hidden release or a release in the
     *  previous measure needs none. */
    private keepPedalDepressRightOfPreviousRelease;
    /** OSMD-unit x where the release mark of a symbol pedal (its *) starts: the interpolated release, the stave end,
     *  or the end note. */
    private pedalReleaseStartX;
    /** Finds the first staffline measure with a note that can anchor an expression. */
    protected findFirstStafflineMeasure(staffline: StaffLine): GraphicalMeasure;
    protected calculateSinglePedal(sourceMeasure: SourceMeasure, multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void;
    protected calculateSingleWavyLine(sourceMeasure: SourceMeasure, multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void;
    private calculateWavyLineSkyBottomLine;
    private calculatePedalSkyBottomLine;
    private calculateOctaveShiftSkyBottomLine;
    /**
     * Calculate all the textual and symbolic [[RepetitionInstruction]]s (e.g. dal segno) for a single [[SourceMeasure]].
     * @param repetitionInstruction
     * @param measureIndex
     */
    protected calculateWordRepetitionInstruction(repetitionInstruction: RepetitionInstruction, measureIndex: number): void;
    /**
     * Draws the signs of a segno where the MusicXML puts them (RepetitionInstruction.SymbolPlacements):
     * above the staff of each sign, at the note of its timestamp (a sign at the start of the measure stays after the begin instructions).
     * @returns false if none of the staves is drawn, so that the segno is drawn above the uppermost one
     */
    protected calculateSegnoSigns(repetitionInstruction: RepetitionInstruction, measures: VexFlowMeasure[]): boolean;
    /** The repetition instruction boxes already placed per staff line, for their mutual collision checks.
     *  (a WeakMap, so that the entries of a previous render's staff lines don't linger) */
    private placedWordRepetitionBoxes;
    /**
     * Shifts a repetition instruction (VF.Repetition, e.g. Coda sign or "D.S. al Fine" text) above
     * other objects in its range, e.g. chord symbols, which are calculated before the repetition
     * instructions, or previously placed repetition instructions (see #1689).
     * Shifted instructions reserve their space in the skyline, so that the staffline borders account for them.
     * The horizontal and default vertical position replicate the drawing code
     * in VexFlowPatch/src/staverepetition.js (drawSymbolText() etc).
     * @param measure the (uppermost) measure the repetition instruction was added to
     * @param repetition the VexFlow repetition (stave modifier) to place, created by addWordRepetition()
     */
    protected placeWordRepetitionInSkyline(measure: VexFlowMeasure, repetition: VF.Repetition): void;
    protected calculateSkyBottomLines(): void;
    /** Compute (not reuse) the sky/bottom lines for the given staff lines: geometric, or the batched /
     *  per-staff-line path. This is the original calculateSkyBottomLines body, extracted so the lazy reuse
     *  path can feed it just the staff lines that actually need computing.
     *  lastMeasureFormats: for the geometric calculation, see SkyBottomLineCalculator.calculateLines(). */
    private computeSkyBottomLinesFor;
    /** Loading-path async mirror of {@link calculateSkyBottomLines}: identical lazy-cache reuse and output,
     *  but the (dominant) compute pass is chunked with event-loop yields. {@link onCellProcessed} reports
     *  (done, total) staff lines processed. */
    protected calculateSkyBottomLinesAsync(yielder: CooperativeYielder, onCellProcessed?: (done: number, total: number) => void): Promise<void>;
    /** Async mirror of {@link computeSkyBottomLinesFor}: same computation, chunked with event-loop yields.
     *  The geometric and per-staff-line paths yield after each staff line; the batch path is a single native
     *  call, so we yield around it. */
    private computeSkyBottomLinesForAsync;
    /**
     * The words were placed clear of the dynamics and wedges, but AlignmentManager then moves those onto a common baseline:
     * a dynamic pulled down to a wedge's baseline can land on a word under it (Enescu, Cantabile et Presto m37-38 on one
     * system: the third sf of m38 on "cédez"). Stack such words beyond the dynamics and wedges again.
     * (Same as osmd-dart's VexFlowMusicSheetCalculator._restackWordsClearOfDynamics.)
     */
    private restackWordsClearOfDynamics;
    /**
     * Re-adjust the x positioning of expressions. Update the skyline afterwards
     */
    protected calculateExpressionAlignements(): void;
    /**
     * Check if the tied graphical note belongs to any beams or tuplets and react accordingly.
     * @param tiedGraphicalNote
     * @param beams
     * @param activeClef
     * @param octaveShiftValue
     * @param graphicalStaffEntry
     * @param duration
     * @param openTie
     * @param isLastTieNote
     */
    protected handleTiedGraphicalNote(tiedGraphicalNote: GraphicalNote, beams: Beam[], activeClef: ClefInstruction, octaveShiftValue: OctaveEnum, graphicalStaffEntry: GraphicalStaffEntry, duration: Fraction, openTie: Tie, isLastTieNote: boolean): void;
    /**
     * Is called if a note is part of a beam.
     * @param graphicalNote
     * @param beam
     * @param openBeams a list of all currently open beams
     */
    protected handleBeam(graphicalNote: GraphicalNote, beam: Beam, openBeams: Beam[]): void;
    protected handleVoiceEntryLyrics(voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry, lyricWords: LyricWord[]): void;
    protected handleVoiceEntryOrnaments(ornamentContainer: OrnamentContainer, voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry): void;
    /**
     * Raise an ornament above the notes over a slur above that would touch it, after the slurs are laid out.
     * A slur clears an ornament under it when it can (GraphicalSlur.liftOverOrnaments()); an ornament over the
     * slur's first or last note, or one the slur would need a steep arch to clear, goes over the slur, with
     * GraphicalSlur.ornamentClearance between them (Couperin, Concerts royaux I Prelude m7: the pincé over F#5, after
     * the grace note the slur starts on). Over a slur the clearance counts from the slur's outer edge, drawn
     * GraphicalSlur.thickness over its curve. The sky line reserves the ornament's new place.
     */
    protected layoutOrnament(ornaments: OrnamentContainer, voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry): void;
    /**
     * Add articulations to the given vexflow staff entry.
     * @param articulations
     * @param voiceEntry
     * @param graphicalStaffEntry
     */
    protected handleVoiceEntryArticulations(articulations: Articulation[], voiceEntry: VoiceEntry, staffEntry: GraphicalStaffEntry): void;
    /**
     * Add technical instructions to the given vexflow staff entry.
     * @param technicalInstructions
     * @param voiceEntry
     * @param staffEntry
     */
    protected handleVoiceEntryTechnicalInstructions(technicalInstructions: TechnicalInstruction[], voiceEntry: VoiceEntry, staffEntry: GraphicalStaffEntry): void;
    /**
     * Is called if a note is part of a tuplet.
     * @param graphicalNote
     * @param tuplet
     * @param openTuplets a list of all currently open tuplets
     */
    protected handleTuplet(graphicalNote: GraphicalNote, tuplet: Tuplet, openTuplets: Tuplet[]): void;
    /**
     * Find the Index of the item of the array of all VexFlow Slurs that holds a specified slur
     * @param gSlurs
     * @param slur
     */
    findIndexGraphicalSlurFromSlur(gSlurs: GraphicalSlur[], slur: Slur): number;
    indexOfGraphicalGlissFromGliss(gGlissandi: GraphicalGlissando[], glissando: Glissando): number;
    /** Returns whether a repeat sign replaces the note's graphical measure. */
    private measureRepeatHidesNote;
    protected calculateSlurs(): void;
    calculateGlissandi(): void;
}
