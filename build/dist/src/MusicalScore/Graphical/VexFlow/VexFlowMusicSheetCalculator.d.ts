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
import { GraphicalMusicPage } from "../GraphicalMusicPage";
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
    /** Multi-measure repeat units awaiting skyline reservation in the current render. */
    private measureRepeatUnitsPendingSkyline;
    private metronomePlacements;
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
    /** Minimum staff entries width (units) of a measure ending in a double, final or repeat barline that leaves room
     *  after its last note for the words written after it, which are anchored at that note (Couperin, Concerts royaux
     *  IV Forlane m60: "au Rondeau pour finir." after the one quarter note of the last measure ran left over its
     *  barline). The label ends MusicSheetCalculator.wordsBarlineMargin() before the barline. Same rule as osmd-dart. */
    private trailingWordsMinimumWidth;
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
    /**
     * Creates a Vexflow tie in a standard staff, curved in the given direction.
     * @param notes The notes of the tie (or of the part of a tie across a system break), see VF.StaveTie.
     * @param direction The direction, e.g. from the XML. Without one, Vexflow takes it from the stem direction of the notes.
     * @returns The Vexflow tie.
     */
    private createStaveTie;
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
     *  other. Without a drawn * (a hidden release: the next Ped. retakes it, Gluck, Tu lo sai m31), right of the previous
     *  Ped. in the same measure; after a * moved past the barline (ReleaseAfterDepress), right of its overhang. A change
     *  already keeps its own gap; a release at the stave end or a release in the previous measure needs none. */
    private keepPedalDepressRightOfPreviousRelease;
    /** The * of a short pedal stays a text margin right of its own Ped. (an x rule like the one above): the Ped. is drawn
     *  at the start note and the * at the end note, or right-aligned before the barline for a release at the stave end,
     *  so a release one note later or a Ped. on the last note was drawn over the Ped. (Schumann, Myrthen 24 m14). Only
     *  within one measure, as above; a change keeps its own place. Same as osmd-dart. */
    private keepPedalReleaseRightOfItsDepress;
    /** Where the Ped. glyph of a symbol pedal starts (drawn 10px left of its x, a change CHANGE_GAP right of it). */
    private static pedalDepressLeft;
    private static pedalDepressGlyphWidth;
    private static pedalReleaseGlyphWidth;
    /** OSMD-unit x where the release mark of a symbol pedal (its *) starts: the interpolated release, the stave end,
     *  or the end note. */
    /** The x of a box in a staffline (its relative positions up to the staffline), whatever its absolute position was last
     *  computed from. */
    private static xInStaffLine;
    private pedalReleaseStartX;
    /** Finds the first staffline measure with a note that can anchor an expression. */
    protected findFirstStafflineMeasure(staffline: StaffLine): GraphicalMeasure;
    protected calculateSinglePedal(sourceMeasure: SourceMeasure, multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void;
    protected calculateSingleWavyLine(sourceMeasure: SourceMeasure, multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void;
    private calculateWavyLineSkyBottomLine;
    /** A staff line's bottom line as it was before its first pedal mark, by the bottom line array (a new layout makes a
     *  new one). */
    private static bottomLineBeforePedals;
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
    /** The repetition instructions in their default place (placeWordRepetitionInSkyline()) reserve no skyline. */
    protected firstSystemUnreservedSymbolsTop(page: GraphicalMusicPage, left: number, right: number): number;
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
     * Places the words of multiExpression (see super), then stacks each new words label clear of the dynamics and wedges
     * of its staffline, see restackWordsClearOfDynamics().
     */
    protected calculateMoodAndUnknownExpression(multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void;
    /**
     * calculateLabel() places a words label at the sky/bottom line, which the dynamics and wedges (aligned onto a common
     * baseline before, see calculateExpressionAlignements()) have raised: the label's text touches them, and its box,
     * whose top/bottom margin reaches beyond the text, overlaps theirs (Enescu, Cantabile et Presto m37-38 on one system:
     * "cédez" under the third sf of m38). Stack such words DynamicExpressionSpacer beyond the dynamics and wedges and update
     * the sky/bottom line for their new position.
     * (Same as osmd-dart's VexFlowMusicSheetCalculator._restackWordsClearOfDynamics, which runs after the alignment there.)
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
    /** How far ink above the notes goes up to clear the slurs above that would touch it (0: none), see layoutOrnament(). */
    private static raiseOverSlursAbove;
    /**
     * A fermata above a note goes over a slur above that would touch it, like an ornament (layoutOrnament()): the slur
     * ends at its note's stem, where the fermata is (Torelli, Tu lo sai, piano m38 and m44; Giordani, Caro mio ben, voice m29:
     * the slur from the fermata's note). The sky line reserves the fermata's new place.
     */
    protected layoutFermatasOverSlurs(measure: GraphicalMeasure): void;
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
    /**
     * Whether a slur from one staff of an instrument to the other is drawn as two pieces, one on each staff, instead of
     * one curve between the placed staves (CrossStaffCurve): when its notes are in different systems (Schumann, Myrthen 15
     * m5-7 in both platforms' layouts; the curve between two staves can't be drawn across a system break). In one system
     * the slur is one curve however far its notes are (Myrthen 14 m12-14, 15 m41-43: the curve clears the notes between
     * them, decision Q1 10-08). Same as osmd-dart.
     */
    private crossStaffSlurIsSplit;
    /**
     * The CrossStaffCurve of a slur from the start entry's note to a note on another staff of the same system, held by
     * the measures it spans on both staves; undefined when its end note is not placed in this system.
     */
    private crossStaffCurveOf;
    /** Forgets the curves between staves of the last layout: the measures are kept from one layout to the next. */
    protected clearCrossStaffCurves(): void;
    /** A tie from one staff of an instrument to another staff of it in the same system: one curve between the placed
     *  staves (CrossStaffCurve), not a VexFlow StaveTie (it can't arch between two staves' notes: it ran nearly straight
     *  across both and the beams between them, Schumann, Myrthen 10 m72-73) nor two stubs (10-07). Held by the start and
     *  the end note's measures. Same as osmd-dart VexFlowMeasure._buildTies. */
    protected layoutCrossStaffTie(tie: GraphicalTie): void;
    /** A slur's curve between two staves is calculated with the staves' preliminary distance to reserve its outer sides
     *  (over the upper staff, under the lower one) before the expressions are placed; the drawer calculates it again
     *  between the placed staves (CrossStaffCurve). */
    protected reserveCrossStaffCurves(): void;
    /**
     * The measure index after which a slur drawn as two pieces (see crossStaffSlurIsSplit()) changes staff: the start piece
     * goes from the start note to the end of that measure on the start note's staff, the end piece from the start of the
     * next measure to the end note on the end note's staff. The long piece goes on the staff where the start note's voice
     * has more of its notes between the two: Myrthen 14 m12-14 (voice 5 moves to the left hand: 4 notes on the right, 8 on
     * the left) changes staff after the start note's measure, the slur running under the left hand; Myrthen 15 m5-7 and
     * m41-43 (the right hand melody, all its notes on the right) before the end note's measure, the slur running over the
     * right hand and reaching the left hand's last note in the end measure. Equal counts go to the end staff.
     */
    private crossStaffSlurSplitMeasureIndex;
    /**
     * The volta (ending) of each measure, by measure index: the index of the volta's first measure and its ending numbers
     * (as calculateWordRepetitionInstructions() tracks them). Undefined for a measure outside a volta.
     */
    private voltaOfMeasures;
    /**
     * A slur from before the endings of a repeat to a note in a second (or later) ending is played from its start into
     * that ending, but drawn as one curve it runs over the first ending to the note in the second: a long arch over the
     * first ending (Schumann, Myrthen 18 m31-33, slur 6 from m31 to the second ending m33, recheck M18-D05). The source
     * (Breitkopf) breaks it where the endings part: the part over the first ending ends at the end of the first ending, and
     * the second ending starts with a short piece from its barline to the end note. When the
     * score writes the first ending's slur separately, from the same start (an alternative slur: Myrthen 18 slur 1 from m31
     * to the first ending m32), the part over the first ending is that slur and is left out here; only the second ending's
     * piece is drawn, as in the source. Pieces end and start at their measures' barlines (GraphicalSlur.isVoltaPiece).
     */
    private splitSlursIntoVoltas;
    protected calculateSlurs(): void;
    calculateGlissandi(): void;
}
