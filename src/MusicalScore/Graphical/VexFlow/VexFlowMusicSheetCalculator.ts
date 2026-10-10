import { MusicSheetCalculator } from "../MusicSheetCalculator";
import { VexFlowGraphicalSymbolFactory } from "./VexFlowGraphicalSymbolFactory";
import { GraphicalMeasure } from "../GraphicalMeasure";
import { VexFlowMeasureRepeat } from "./VexFlowMeasureRepeat";
import { MeasureRepeatInstruction, MeasureRepeatType } from "../../VoiceData/Instructions/MeasureRepeatInstruction";
import { StaffLine } from "../StaffLine";
import { SkyBottomLineBatchCalculator } from "../SkyBottomLineBatchCalculator";
import { SkyBottomLineCalculator } from "../SkyBottomLineCalculator";
import { Fonts } from "../../../Common/Enums/Fonts";
import { FontStyles } from "../../../Common/Enums/FontStyles";
import { VoiceEntry } from "../../VoiceData/VoiceEntry";
import { GraphicalNote } from "../GraphicalNote";
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";
import { GraphicalVoiceEntry } from "../GraphicalVoiceEntry";
import { GraphicalTie } from "../GraphicalTie";
import { Tie } from "../../VoiceData/Tie";
import { SourceMeasure } from "../../VoiceData/SourceMeasure";
import { SourceStaffEntry } from "../../VoiceData/SourceStaffEntry";
import { MultiExpression } from "../../VoiceData/Expressions/MultiExpression";
import { AlignmentType, RepetitionInstruction, RepetitionInstructionEnum } from "../../VoiceData/Instructions/RepetitionInstruction";
import { Beam } from "../../VoiceData/Beam";
import { ClefInstruction } from "../../VoiceData/Instructions/ClefInstruction";
import { OctaveEnum, OctaveShift } from "../../VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import { Fraction } from "../../../Common/DataObjects/Fraction";
import { LyricWord } from "../../VoiceData/Lyrics/LyricsWord";
import { OrnamentContainer, OrnamentEnum } from "../../VoiceData/OrnamentContainer";
import { Articulation } from "../../VoiceData/Articulation";
import { Tuplet } from "../../VoiceData/Tuplet";
import { IVerticalMeasureFormat, VexFlowMeasure } from "./VexFlowMeasure";
import { VexFlowTextMeasurer } from "./VexFlowTextMeasurer";
import Vex from "vexflow";
import VF = Vex.Flow;
import log from "loglevel";
import { unitInPixels } from "./VexFlowMusicSheetDrawer";
import { VexFlowGraphicalNote } from "./VexFlowGraphicalNote";
import { CrossStaffCurve, CrossStaffCurveLayoutGeometry } from "./CrossStaffCurve";
import { TechnicalInstruction } from "../../VoiceData/Instructions/TechnicalInstruction";
import { GraphicalLyricEntry } from "../GraphicalLyricEntry";
import { GraphicalLabel } from "../GraphicalLabel";
import { LyricsEntry } from "../../VoiceData/Lyrics/LyricsEntry";
import { GraphicalLyricWord } from "../GraphicalLyricWord";
import { VexFlowStaffEntry } from "./VexFlowStaffEntry";
import { VexFlowOctaveShift } from "./VexFlowOctaveShift";
import { VexFlowInstantaneousDynamicExpression } from "./VexFlowInstantaneousDynamicExpression";
import { Slur } from "../../VoiceData/Expressions/ContinuousExpressions/Slur";
/* VexFlow Version - for later use
// import { VexFlowSlur } from "./VexFlowSlur";
// import { VexFlowStaffLine } from "./VexFlowStaffLine";
// import { VexFlowVoiceEntry } from "./VexFlowVoiceEntry";
*/
import { PointF2D } from "../../../Common/DataObjects/PointF2D";
import { TextAlignmentEnum, TextAlignment } from "../../../Common/Enums/TextAlignment";
import { GraphicalSlur } from "../GraphicalSlur";
import { BoundingBox } from "../BoundingBox";
import { ContDynamicEnum, ContinuousDynamicExpression } from "../../VoiceData/Expressions/ContinuousExpressions/ContinuousDynamicExpression";
import { VexFlowContinuousDynamicExpression } from "./VexFlowContinuousDynamicExpression";
import { GraphicalInstantaneousDynamicExpression } from "../GraphicalInstantaneousDynamicExpression";
import { GraphicalContinuousDynamicExpression } from "../GraphicalContinuousDynamicExpression";
import { GraphicalUnknownExpression } from "../GraphicalUnknownExpression";
import { AbstractGraphicalExpression } from "../AbstractGraphicalExpression";
import { InstantaneousTempoExpression, MetronomeNoteGroup, TempoType } from "../../VoiceData/Expressions/InstantaneousTempoExpression";
import { AlignRestOption } from "../../../OpenSheetMusicDisplay/OSMDOptions";
import { VexFlowStaffLine } from "./VexFlowStaffLine";
import { EngravingRules } from "../EngravingRules";
import { VexflowStafflineNoteCalculator } from "./VexflowStafflineNoteCalculator";
import { MusicSystem } from "../MusicSystem";
import { GraphicalMusicPage } from "../GraphicalMusicPage";
import { NoteTypeHandler } from "../../VoiceData/NoteType";
import { VexFlowConverter } from "./VexFlowConverter";
import { TabNote } from "../../VoiceData/TabNote";
import { PlacementEnum } from "../../VoiceData/Expressions";
import { GraphicalChordSymbolContainer } from "../GraphicalChordSymbolContainer";
import { RehearsalExpression } from "../../VoiceData/Expressions/RehearsalExpression";
import { SystemLinesEnum } from "../SystemLinesEnum";
import { Pedal } from "../../VoiceData/Expressions/ContinuousExpressions/Pedal";
import { VexFlowPedal } from "./VexFlowPedal";
import { MusicSymbol } from "../MusicSymbol";
import { VexFlowVoiceEntry } from "./VexFlowVoiceEntry";
import { CollectionUtil } from "../../../Util/CollectionUtil";
import { CooperativeYielder } from "../../../Util/CooperativeYielder";
import { GraphicalGlissando } from "../GraphicalGlissando";
import { Glissando } from "../../VoiceData/Glissando";
import { VexFlowGlissando } from "./VexFlowGlissando";
import { WavyLine } from "../../VoiceData/Expressions/ContinuousExpressions/WavyLine";
import { VexFlowVibratoBracket } from "./VexFlowVibratoBracket";
import { Staff } from "../../VoiceData/Staff";
import { Note, TremoloBetweenNotes } from "../../VoiceData/Note";
import { DynamicEnum, InstantaneousDynamicExpression } from "../../VoiceData/Expressions/InstantaneousDynamicExpression";
import { GeometricSkyBottomLineContext } from "../GeometricSkyBottomLineContext";
import { GraphicalInstantaneousTempoExpression } from "../GraphicalInstantaneousTempoExpression";

/** A dynamic (instantaneous or verbal) or a wedge on one side of one staff of a measure,
 *  see VexFlowMusicSheetCalculator.fitExpressionsToFormattedEntries(). */
interface ExpressionSlot {
  timestamp: number;
  endTimestamp: number;
  /** a wedge's stop as written (ContinuousDynamicExpression.StopTimestamp) */
  stopTimestamp?: number;
  /** a diminuendo ends at the left border of the note after its stop */
  diminuendo?: boolean;
  below: boolean;
  isLabel: boolean;
  /** label borders relative to the x of timestamp */
  left: number;
  right: number;
  text: string;
  /** for the first wedge of a pair (wedgeStartingAtStop()): the stop of the second one, in the measure. The pair is reserved as one. */
  pairStop?: number;
  /** the second wedge of a pair: reserved with the first one */
  pairedPrevious?: boolean;
  /** the measure of the column whose staff entries place the slot, if not the pair's (a pedal mark at a time only another
   *  staff plays, drawn at that staff's note) */
  placedBy?: VexFlowMeasure;
}

interface ExpressionPair {
  measure: VexFlowMeasure;
  earlier: ExpressionSlot;
  later: ExpressionSlot;
  /** distance the later label must keep from the earlier one */
  need: number;
}

/** Extents of a drawing, in pixels relative to its staffline and the top line of its staff. */
interface IMetronomeBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface IMetronomePlacement {
  measure: VexFlowMeasure;
  expression: InstantaneousTempoExpression;
  mark: VF.StaveTempo;
  bounds: IMetronomeBounds;
  yShift: number;
  /** Whether the mark is where the existing layout draws it, which already reserves space for it. */
  existingPosition: boolean;
}

/** Where a pedal stop between two staff entries is drawn: fraction of the way from entry to after (or to the
 *  measure end when after is undefined). */
interface PedalReleaseAnchor {
  entry: GraphicalStaffEntry;
  after: GraphicalStaffEntry;
  fraction: number;
  /** a staff entry of another staff of the measure at exactly the time, where the mark is drawn instead of interpolating */
  atTime?: GraphicalStaffEntry;
}

export class VexFlowMusicSheetCalculator extends MusicSheetCalculator {
  /** space needed for a dash for lyrics spacing, calculated once */
  private dashSpace: number;
  public beamsNeedUpdate: boolean = false;
  /** Per-staff overflow (in pre-elongation units) of the previous measure's last lyric/chord
   *  past its bar line. Used to prevent the next measure's first lyric/chord from colliding
   *  with the overflow. Indexed first by Staff, then by verse/container index. */
  private previousLyricOverflowsByStaff: Map<Staff, number[]> = new Map<Staff, number[]>();
  private previousChordOverflowsByStaff: Map<Staff, number[]> = new Map<Staff, number[]>();
  /** Multi-measure repeat units awaiting skyline reservation in the current render. */
  private measureRepeatUnitsPendingSkyline: VexFlowMeasureRepeat[] = [];
  private metronomePlacements: IMetronomePlacement[] = [];

  constructor(rules: EngravingRules) {
    super();
    this.rules = rules;
    MusicSheetCalculator.symbolFactory = new VexFlowGraphicalSymbolFactory();
    MusicSheetCalculator.TextMeasurer = new VexFlowTextMeasurer(this.rules);
    MusicSheetCalculator.stafflineNoteCalculator = new VexflowStafflineNoteCalculator(this.rules);

    // prepare Vexflow font (doesn't affect Vexflow 1.x). It seems like this has to be done here for now, otherwise it's too slow for the generateImages script.
    //   (first image will have the non-updated font, in this case the Vexflow default Bravura, while we want Gonville here)
    if (this.rules.DefaultVexFlowNoteFont?.toLowerCase() === "gonville") {
      (Vex.Flow as any).DEFAULT_FONT_STACK = [(Vex.Flow as any).Fonts?.Gonville, (Vex.Flow as any).Fonts?.Bravura, (Vex.Flow as any).Fonts?.Custom];
    } else if (this.rules.DefaultVexFlowNoteFont?.toLowerCase() === "petaluma") {
      (Vex.Flow as any).DEFAULT_FONT_STACK = [(Vex.Flow as any).Fonts?.Petaluma, (Vex.Flow as any).Fonts?.Gonville, (Vex.Flow as any).Fonts?.Bravura];
    }
    // else keep new vexflow default Bravura (more cursive, bold)
  }

  protected clearRecreatedObjects(): void {
    super.clearRecreatedObjects();
    MusicSheetCalculator.stafflineNoteCalculator = new VexflowStafflineNoteCalculator(this.rules);
    // Reset the measure-to-measure carry state of the lyrics/chord symbol elongation calculation:
    // it is rebuilt during each render's width calculation, but without the reset, the trailing
    // overflow of the last lyric measure leaked into the *next* render's first measures
    // (when no later measure with staff entries overwrote it), making re-renders elongate
    // slightly differently than the first render.
    this.previousLyricOverflowsByStaff.clear();
    this.previousChordOverflowsByStaff.clear();
    this.metronomePlacements = [];
    this.dashSpace = undefined;
    for (const graphicalMeasures of this.graphicalMusicSheet.MeasureList) {
      for (const graphicalMeasure of graphicalMeasures) {
        (<VexFlowMeasure>graphicalMeasure)?.clean();
      }
    }
  }

  protected formatMeasures(): void {
    // let totalFinalizeBeamsTime: number = 0;
    for (const verticalMeasureList of this.graphicalMusicSheet.MeasureList) {
      if (!verticalMeasureList || !verticalMeasureList[0]) {
        continue;
      }
      const firstVisibleMeasure: VexFlowMeasure = verticalMeasureList.find(measure => measure?.isVisible()) as VexFlowMeasure;
      // first measure has formatting method as lambda function object, but formats all measures. TODO this could be refactored
      firstVisibleMeasure.format();
      for (const measure of verticalMeasureList) {
        for (const staffEntry of measure.staffEntries) {
          (<VexFlowStaffEntry>staffEntry).calculateXPosition();
        }
        // const t0: number = performance.now();
        if (true || this.beamsNeedUpdate) {
          // finalizeBeams takes a few milliseconds, so we can save some performance here sometimes,
          // but we'd have to check for every setting change that would affect beam rendering. See #843
          (measure as VexFlowMeasure).finalizeBeams(); // without this, when zooming a lot (e.g. 250%), beams keep their old, now wrong slope.
          // totalFinalizeBeamsTime += performance.now() - t0;
          // console.log("Total calls to finalizeBeams in VexFlowMusicSheetCalculator took " + totalFinalizeBeamsTime + " milliseconds.");
        }
      }
    }
    this.beamsNeedUpdate = false;
    this.prepareMeasureRepeats();
  }

  /** Assigns repeat signs after fully written-out measures establish widths and system breaks. */
  private prepareMeasureRepeats(): void {
    this.measureRepeatUnitsPendingSkyline = [];
    // Index measures by staff and clear repeat assignments from prior renders.
    const measuresByStaff: Map<number, Map<SourceMeasure, VexFlowMeasure>> = new Map<number, Map<SourceMeasure, VexFlowMeasure>>();
    for (const verticalMeasures of this.graphicalMusicSheet.MeasureList) {
      for (const measure of verticalMeasures) {
        if (!(measure instanceof VexFlowMeasure)) {
          continue; // e.g. undefined for a multi-rest-collapsed staff
        }
        measure.MeasureRepeat = undefined;
        const staffIndex: number = measure.ParentStaff.idInMusicSheet;
        let byMeasure: Map<SourceMeasure, VexFlowMeasure> = measuresByStaff.get(staffIndex);
        if (!byMeasure) {
          byMeasure = new Map<SourceMeasure, VexFlowMeasure>();
          measuresByStaff.set(staffIndex, byMeasure);
        }
        byMeasure.set(measure.parentSourceMeasure, measure);
      }
    }
    // An incremental render (OpenSheetMusicDisplay.renderNext()) lays the sheet out from its first measure to the end of the batch
    //   and draws only complete systems, which hold all their units and the patterns before them, like in render().
    //   (A unit reaching past the end of the batch, see tryCreateMeasureRepeat(), is in the last system, which isn't drawn yet.)
    if (!this.rules.RenderMeasureRepeats) {
      return;
    }

    const sourceMeasures: SourceMeasure[] = this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures;
    const staffIndicesWithDeclarations: Set<number> = new Set<number>();
    for (const sourceMeasure of sourceMeasures) {
      for (const staffIndex of sourceMeasure.MeasureRepeatInstructions.keys()) {
        staffIndicesWithDeclarations.add(staffIndex);
      }
    }
    for (const staffIndex of staffIndicesWithDeclarations) {
      const byMeasure: Map<SourceMeasure, VexFlowMeasure> = measuresByStaff.get(staffIndex);
      if (!byMeasure) {
        continue;
      }
      const wavyLineRanges: {start: number, end: number}[] = this.findWavyLineRanges(sourceMeasures, staffIndex);
      for (const unit of VexFlowMusicSheetCalculator.findMeasureRepeatUnits(sourceMeasures, staffIndex)) {
        this.tryCreateMeasureRepeat(sourceMeasures, byMeasure, staffIndex, unit, wavyLineRanges);
      }
    }
  }

  /** Groups each staff's contiguous valid repeat declarations into complete units. */
  private static findMeasureRepeatUnits(measures: SourceMeasure[], staffIndex: number):
      {unitStart: number, length: number, slashes: number}[] {
    const units: {unitStart: number, length: number, slashes: number}[] = [];
    let active: MeasureRepeatInstruction;
    let runStart: number = 0;
    const closeRun: (runEnd: number) => void = (runEnd: number): void => {
      if (!active) {
        return;
      }
      for (let unitStart: number = runStart; unitStart + active.measures <= runEnd; unitStart += active.measures) {
        units.push({unitStart, length: active.measures, slashes: active.slashes});
      }
    };
    for (let index: number = 0; index < measures.length; index++) {
      const declarations: MeasureRepeatInstruction[] = measures[index].MeasureRepeatInstructions.get(staffIndex);
      if (!declarations || declarations.length === 0) {
        continue;
      }
      closeRun(index); // any declaration (valid or not) ends the previous run right before this measure
      active = declarations.length === 1 && declarations[0].type === MeasureRepeatType.Start ? declarations[0] : undefined;
      runStart = index;
    }
    closeRun(measures.length);
    return units;
  }

  /** Assigns a repeat sign when its unit and referenced pattern are visible and abbreviable. */
  private tryCreateMeasureRepeat(sourceMeasures: SourceMeasure[], byMeasure: Map<SourceMeasure, VexFlowMeasure>, staffIndex: number,
      unit: {unitStart: number, length: number, slashes: number}, wavyLineRanges: {start: number, end: number}[]): void {
    if (unit.unitStart < this.rules.MinMeasureToDrawIndex || unit.unitStart + unit.length - 1 > this.rules.MaxMeasureToDrawIndex) {
      // Avoid assignments to measures outside the current draw range.
      return;
    }
    const unitMeasures: VexFlowMeasure[] = [];
    for (let i: number = 0; i < unit.length; i++) {
      const graphicalMeasure: VexFlowMeasure = byMeasure.get(sourceMeasures[unit.unitStart + i]);
      if (!graphicalMeasure) {
        return;
      }
      unitMeasures.push(graphicalMeasure);
    }
    if (unitMeasures.some((measure: VexFlowMeasure): boolean => measure.isTabMeasure)) {
      return;
    }
    // A repeat sign requires every unit measure in one staff line.
    const staffLine: StaffLine = unitMeasures[0].ParentStaffLine;
    if (!staffLine || unitMeasures.some((measure: VexFlowMeasure): boolean => measure.ParentStaffLine !== staffLine)) {
      return;
    }
    const referenceStart: number = unit.unitStart - unit.length;
    if (referenceStart < 0) {
      return;
    }
    if (referenceStart < this.rules.MinMeasureToDrawIndex) {
      // The referenced pattern must be in the current draw range.
      return;
    }
    // The referenced pattern must be visible; it may be in another system.
    for (let i: number = 0; i < unit.length; i++) {
      if (!byMeasure.get(sourceMeasures[referenceStart + i])?.ParentStaffLine) {
        return;
      }
    }
    if (!VexFlowMusicSheetCalculator.canAbbreviateMeasureRepeatUnit(sourceMeasures, staffIndex, unit.unitStart, unit.length, wavyLineRanges)) {
      return;
    }
    const display: VexFlowMeasureRepeat = new VexFlowMeasureRepeat(unitMeasures, unit.slashes);
    if (unit.length > 1) {
      this.measureRepeatUnitsPendingSkyline.push(display);
    }
    for (const measure of unitMeasures) {
      measure.MeasureRepeat = display;
    }
  }

  /** Whether the unit can hide its notes without losing instructions, lyrics or connections to visible notation. */
  private static canAbbreviateMeasureRepeatUnit(sourceMeasures: SourceMeasure[], staffIndex: number, unitStart: number, length: number,
      wavyLineRanges: {start: number, end: number}[]): boolean {
    const previousMeasure: SourceMeasure = sourceMeasures[unitStart - 1];
    if (previousMeasure?.LastInstructionsStaffEntries[staffIndex]?.Instructions.length) {
      return false;
    }
    if (VexFlowMusicSheetCalculator.hasIncomingLyricExtender(sourceMeasures, unitStart, staffIndex)) {
      return false;
    }
    const unitMeasures: SourceMeasure[] = sourceMeasures.slice(unitStart, unitStart + length);
    const unitSet: Set<SourceMeasure> = new Set<SourceMeasure>(unitMeasures);
    for (let measureIndex: number = 0; measureIndex < unitMeasures.length; measureIndex++) {
      const measure: SourceMeasure = unitMeasures[measureIndex];
      if (measure.isReducedToMultiRest) {
        return false;
      }
      if (measure.FirstInstructionsStaffEntries[staffIndex]?.Instructions.length) {
        return false;
      }
      // Check advance instructions at internal unit barlines.
      if (measureIndex < unitMeasures.length - 1 && measure.LastInstructionsStaffEntries[staffIndex]?.Instructions.length) {
        return false;
      }
      const staffEntries: SourceStaffEntry[] = measure.getEntriesPerStaff(staffIndex);
      for (let entryIndex: number = 0; entryIndex < staffEntries.length; entryIndex++) {
        const sourceStaffEntry: SourceStaffEntry = staffEntries[entryIndex];
        // Preserve instructions inside a measure.
        if (entryIndex > 0 && sourceStaffEntry.Instructions.length) {
          return false;
        }
        for (const voiceEntry of sourceStaffEntry.VoiceEntries) {
          if (voiceEntry.IsGrace || !voiceEntry.LyricsEntries.isEmpty()) {
            return false;
          }
          for (const note of voiceEntry.Notes) {
            if (VexFlowMusicSheetCalculator.measureRepeatNoteCrosses(note, staffIndex, unitSet)) {
              return false;
            }
          }
        }
      }
    }
    const unitStartIndex: number = unitMeasures[0].measureListIndex;
    const unitEndIndex: number = unitMeasures[unitMeasures.length - 1].measureListIndex;
    if (wavyLineRanges.some((range: {start: number, end: number}): boolean =>
        range.start <= unitEndIndex && range.end >= unitStartIndex)) {
      return false;
    }
    return true;
  }

  /** Scan backwards to a rest-only entry or a lyric in any verse, matching calculateLyricExtend()'s forward scan. */
  private static hasIncomingLyricExtender(sourceMeasures: SourceMeasure[], unitStart: number, staffIndex: number): boolean {
    for (let measureIndex: number = unitStart - 1; measureIndex >= 0; measureIndex--) {
      const staffEntries: SourceStaffEntry[] = sourceMeasures[measureIndex].getEntriesPerStaff(staffIndex);
      for (let entryIndex: number = staffEntries.length - 1; entryIndex >= 0; entryIndex--) {
        const sourceStaffEntry: SourceStaffEntry = staffEntries[entryIndex];
        if (sourceStaffEntry.hasOnlyRests) {
          return false;
        }
        let hasExtend: boolean = false;
        let hasLyrics: boolean = false;
        for (const voiceEntry of sourceStaffEntry.VoiceEntries) {
          voiceEntry.LyricsEntries.forEach((_verse: string, lyricsEntry: LyricsEntry): void => {
            hasLyrics = true;
            hasExtend = hasExtend || lyricsEntry.extend;
          });
        }
        if (hasLyrics) {
          return hasExtend;
        }
      }
    }
    return false;
  }

  /** Whether a connection leaves this staff's unit, or a slur has an unattached end that may reach the barline. */
  private static measureRepeatNoteCrosses(note: Note, staffIndex: number, unitMeasures: Set<SourceMeasure>): boolean {
    const escapes: (other: Note) => boolean = (other: Note): boolean =>
      !!other && (!unitMeasures.has(other.SourceMeasure) || other.ParentStaff?.idInMusicSheet !== staffIndex);
    if (note.NoteTie?.Notes.some(escapes)) {
      return true;
    }
    if (note.NoteBeam?.Notes.some(escapes)) {
      return true;
    }
    if (note.NoteTuplets.some((tuplet: Tuplet): boolean => tuplet.Notes.some((group: Note[]): boolean => group.some(escapes)))) {
      return true;
    }
    if (note.Arpeggio?.notes.some(escapes)) {
      return true;
    }
    if (note.NoteSlurs?.some((slur: Slur): boolean => slur.HasUnattachedEnd || escapes(slur.StartNote) || escapes(slur.EndNote))) {
      return true;
    }
    const gliss: Glissando = note.NoteGlissando;
    if (gliss && (escapes(gliss.StartNote) || escapes(gliss.EndNote))) {
      return true;
    }
    const tremolo: TremoloBetweenNotes = note.TremoloInfo?.tremoloBetweenNotes;
    if (tremolo && (escapes(tremolo.startNote) || escapes(tremolo.stopNote))) {
      return true;
    }
    return false;
  }

  /** Collects trill wavy-line ranges for this staff. */
  private findWavyLineRanges(sourceMeasures: SourceMeasure[], staffIndex: number): {start: number, end: number}[] {
    const ranges: {start: number, end: number}[] = [];
    for (const measure of sourceMeasures) {
      const expressions: MultiExpression[] = measure.StaffLinkedExpressions[staffIndex];
      if (!expressions) {
        continue;
      }
      for (const multiExpression of expressions) {
        const wavyLine: WavyLine = multiExpression.WavyLineStart;
        if (!wavyLine) {
          continue;
        }
        const endMeasure: SourceMeasure = wavyLine.ParentEndMultiExpression?.SourceMeasureParent;
        // An unclosed wavy line is drawn from the first rendered measure, even before its declaration.
        ranges.push({start: endMeasure ? measure.measureListIndex : 0, end: endMeasure ? endMeasure.measureListIndex : Number.MAX_SAFE_INTEGER});
      }
    }
    return ranges;
  }

  /** Reserve after calculateSkyBottomLines() replaces the skyline and before measure numbers are placed above it. */
  protected reserveSkylineForMeasureRepeats(): void {
    for (const display of this.measureRepeatUnitsPendingSkyline) {
      display.reserveSkyline();
    }
  }

  //protected clearSystemsAndMeasures(): void {
  //    for (let measure of measures) {
  //
  //    }
  //}

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
  private trailingWordsMinimumWidth(measures: GraphicalMeasure[], formatter: VF.Formatter): number {
    const style: SystemLinesEnum = MusicSheetCalculator.endingBarline(measures[0]?.parentSourceMeasure);
    if (!MusicSheetCalculator.isStrongBarline(style)) {
      return 0;
    }
    const contexts: any = (formatter as any).tickContexts;
    if (!contexts) {
      return 0;
    }
    // the last note: not a ghost note
    const ticks: number[] = contexts.list.filter((tick: number) =>
      contexts.map[tick].getTickables().some((t: any) => t instanceof VF.StaveNote));
    if (ticks.length === 0) {
      return 0;
    }
    const lastTick: number = ticks[ticks.length - 1];
    let lastX: number = 12; // VexFlow's padding (px) before a measure's first note
    for (const tick of contexts.list) {
      if (tick === lastTick) {
        break;
      }
      lastX += contexts.map[tick].getWidth();
    }
    const lastXUnits: number = lastX / unitInPixels * this.rules.VoiceSpacingMultiplierVexflow;
    let required: number = 0;
    for (const measure of measures) {
      const sourceMeasure: SourceMeasure = measure.parentSourceMeasure;
      const staffIndex: number = measure.ParentStaff.idInMusicSheet;
      if (!sourceMeasure || !(staffIndex >= 0) || staffIndex >= sourceMeasure.StaffLinkedExpressions.length) {
        continue;
      }
      for (const multiExpression of sourceMeasure.StaffLinkedExpressions[staffIndex]) {
        if (multiExpression.MoodList.length === 0 && multiExpression.UnknownList.length === 0) {
          continue;
        }
        if (multiExpression.Timestamp.RealValue * VF.RESOLUTION <= lastTick + 1e-6) {
          continue;
        }
        for (const entries of multiExpression.getEntryGroupsByPlacement()) {
          const right: number = this.wordsLabelExtent(MusicSheetCalculator.combinedWordsText(entries),
                                                      MultiExpression.getFontstyleOfEntry(entries[0]),
                                                      MultiExpression.getPlacementOfEntry(entries[0]),
                                                      this.rules.UnknownTextHeight)[1];
          required = Math.max(required, lastXUnits + right + MusicSheetCalculator.wordsBarlineMargin(style));
        }
      }
    }
    return required;
  }

  protected calculateMeasureXLayout(measures: GraphicalMeasure[]): number {
    const visibleMeasures: GraphicalMeasure[] = [];
    for (const measure of measures) {
      if (measure?.isVisible()) { // if we don't check for visibility, invisible parts affect layout (#1444)
        visibleMeasures.push(measure);
      }
    }
    if (visibleMeasures.length === 0) { // e.g. after Multiple Rest measures (VexflowMultiRestMeasure)
      return 0;
    }
    measures = visibleMeasures;

    // Format the voices
    const allVoices: VF.Voice[] = [];
    const formatter: VF.Formatter = new VF.Formatter({
      // maxIterations: 2,
      softmaxFactor: this.rules.SoftmaxFactorVexFlow // this setting is only applied in Vexflow 3.x. also this needs @types/vexflow ^3.0.0
    });

    let maxStaffEntries: number = measures[0].staffEntries.length;
    let maxStaffEntriesPlusAccidentals: number = 1;
    for (const measure of measures) {
      if (!measure) {
        continue;
      }
      let measureAccidentals: number = 0;
      for (const staffEntry of measure.staffEntries) {
        measureAccidentals += (staffEntry as VexFlowStaffEntry).setMaxAccidentals(); // staffEntryAccidentals
      }
      // TODO the if is a TEMP change to show pure diff for pickup measures, should be done for all measures, but increases spacing
      if (measure.parentSourceMeasure.ImplicitMeasure) {
        maxStaffEntries = Math.max(measure.staffEntries.length, maxStaffEntries);
        maxStaffEntriesPlusAccidentals = Math.max(measure.staffEntries.length + measureAccidentals, maxStaffEntriesPlusAccidentals);
      }
      const mvoices: { [voiceID: number]: VF.Voice } = (measure as VexFlowMeasure).vfVoices;
      const voices: VF.Voice[] = [];
      for (const voiceID in mvoices) {
        if (mvoices.hasOwnProperty(voiceID)) {
          const mvoice: any = mvoices[voiceID];
          if (measure.hasOnlyRests && !mvoice.ticksUsed.equals(mvoice.totalTicks)) {
            // fix layouting issues with whole measure rests in one staff and notes in other. especially in 12/8 rthythm (#1187)
            mvoice.ticksUsed = mvoice.totalTicks;
            // Vexflow 1.2.93: needs VexFlowPatch for formatter.js (see #1187)
          }
          voices.push(mvoice);
          allVoices.push(mvoice);
        }
      }

      if (voices.length === 0) {
        log.debug("Found a measure with no voices. Continuing anyway.", mvoices);
        // no need to log this, measures with no voices/notes are fine. see OSMDOptions.fillEmptyMeasuresWithWholeRest
        continue;
      }
      // Reset formatting state left over from a previous render on the (reused) VexFlow notes back
      // to its initial values, so that all calculations read the same state on every render - it is
      // recalculated during each render anyway, but partly later than some readers:
      // - center_x_shift (only set for center-aligned tickables, i.e. whole measure rests):
      //   read by the early VexFlowStaffEntry.calculateXPosition() call below (Note.getAbsoluteX()).
      //   Without the reset, a re-render reads the previous render's centered whole rest position
      //   there, where the first render read the unshifted one - making e.g. the lyrics/chord symbol
      //   elongation of the following measures (and thus the whole layout) differ from the first render.
      // - the beam-applied stem extension: the beams recalculate it when a render first draws the measure
      //   (VexFlowMeasure.postFormatBeams(), before the notes, with the same reset in the VexFlowPatch
      //   beam.js postFormat fix for #1636). That is after the early VexFlowStaffEntry.calculateXPosition()
      //   call below, whose voice entry bounding boxes include the stems (StaveNote.getBoundingBox()), so
      //   without the reset, a re-render would read the previous render's extended stems there.
      // - TabNote widths: TabNote.setStave() re-measures the fret text width once a stave has a
      //   rendering context, i.e. during the draws at the end of a render. updateWidth() restores
      //   the construction-time width (from VexFlow's glyph table), which is what the first
      //   render's width calculation saw.
      // - stemExtensionOverride: StaveNote.format()'s voice-collision handling shortens stems via
      //   setStemLength() during a render. Restore the value it had before the first render
      //   (usually none - but e.g. the tremolo-between-notes stem lengthening of VexFlowConverter
      //   sets it at creation, which must survive), snapshotted on the first render.
      // - stem direction and renderFlag: the same voice-collision handling turns the stem of one of two
      //   unison notes with stems in the same direction down (setStemDirection()) after lengthening the
      //   other one's stem, and hides the flag of one of two colliding notes (renderFlag), but never
      //   back. Restore both as snapshotted on the first render - otherwise a re-render would find the
      //   stems in different directions, not lengthen the other stem, and e.g. slope its beam differently.
      // - rest positions: StaveNote.format()'s shiftRestVertical() moves colliding rests
      //   *relative* to their current line (possibly several times during the first render's
      //   format passes), and the moved line persists on the VexFlow note - so a re-render
      //   would move them even further. Freeze the rests at their converged first-render
      //   positions instead (same pattern as the existing shiftRestVerticalDisabled
      //   workaround for ledger-lined rests; centerRest() is absolute, i.e. harmless).
      // - x_shift, and the y_shift of augmentation dots: StaveNote.format() shifts one of two colliding
      //   unison notes aside (setXShift()) and lifts the other one's dots above it (setYShift()), but never
      //   back. Restore the x_shift it had before the first render (usually 0, VexFlowConverter shifts whole
      //   rests), snapshotted on the first render, and the dots' 0 - otherwise notes that aren't staggered
      //   anymore, e.g. after PrintObject changed hiddenUnisonBaseHead (below), would stay shifted.
      // - dot_shiftY of augmentation dots: Dot.format() sets it for the dot of a note, but adds to it for the dot of
      //   a rest (whose value starts at the rest glyph's dot position), e.g. half a staff space up after a dotted note
      //   on a line at the same time, on each of the two formats of a render. Restore the value it had before the
      //   first render, snapshotted on the first render - otherwise the dot of e.g. a dotted rest below a dotted note
      //   moved up by a staff space with every re-render.
      // - delayXShift of delayed ornaments (e.g. a turn between two notes): Ornament.draw() calculates it from the
      //   distance to the next note on its first draw and keeps it. Unset it, so that the next draw calculates it
      //   for the current layout - otherwise the turn kept its distance of the previous layout, e.g. after a resize.
      for (const voice of voices) {
        for (const tickable of voice.getTickables()) {
          const note: any = tickable as any;
          note.center_x_shift = 0;
          if (note.osmdInitialXShift === undefined) {
            note.osmdInitialXShift = note.x_shift ?? 0; // first render: snapshot
            for (const modifier of note.modifiers ?? []) {
              if (modifier.getCategory?.() === "dots") {
                modifier.osmdInitialDotShiftY = modifier.dot_shiftY; // first render: snapshot
              }
            }
          } else {
            note.x_shift = note.osmdInitialXShift;
            for (const modifier of note.modifiers ?? []) {
              if (modifier.getCategory?.() === "dots") {
                modifier.setYShift(0);
                if (modifier.osmdInitialDotShiftY !== undefined) {
                  modifier.setDotShiftY(modifier.osmdInitialDotShiftY);
                }
              } else if (modifier.getCategory?.() === "ornaments") {
                modifier.delayXShift = undefined; // a delayed ornament (e.g. turn) caches its x shift on its first draw
              }
            }
          }
          if (note.osmdInitialStemExtensionOverride === undefined) {
            note.osmdInitialStemExtensionOverride = note.stemExtensionOverride ?? null; // first render: snapshot
            note.osmdInitialStemDirection = note.getStemDirection?.();
            note.osmdInitialRenderFlag = note.renderFlag;
          } else {
            note.stemExtensionOverride = note.osmdInitialStemExtensionOverride;
            if (note.osmdInitialRenderFlag !== undefined) {
              note.renderFlag = note.osmdInitialRenderFlag;
            }
            if (note.osmdInitialStemDirection !== undefined && note.getStemDirection() !== note.osmdInitialStemDirection) {
              const beam: VF.Beam = note.beam; // setStemDirection() detaches the note from its beam, which the formatting reads
              note.setStemDirection(note.osmdInitialStemDirection);
              note.beam = beam;
            }
            if (note.isRest?.()) {
              note.shiftRestVerticalDisabled = true; // re-render: freeze rest at its current position
            }
          }
          if (note.stem && note.getStemExtension) {
            note.stem.setExtension(note.getStemExtension());
          }
          if (note.updateWidth && note.glyphs) { // TabNote
            note.updateWidth();
          }
        }
      }
      // Tell the patched StaveNote.format() which notes have a hidden note on their base line that shares the
      // visible head of another voice's unison note, so that it doesn't stagger that head beside the visible one
      // (VexFlowPatch stavenote.js mergeableUnison()). Set on each render, PrintObject can change between renders.
      for (const staffEntry of measure.staffEntries) {
        for (const gve of staffEntry.graphicalVoiceEntries) {
          const vfStaveNote: any = (gve as VexFlowVoiceEntry).vfStaveNote;
          if (vfStaveNote && gve.notes.length > 0) {
            const baseNote: GraphicalNote = gve.notes.reduce(
              (lowest: GraphicalNote, note: GraphicalNote) => note.staffLine < lowest.staffLine ? note : lowest);
            vfStaveNote.hiddenUnisonBaseHead = baseNote.sourceNote.sharesNoteheadWithVisibleUnisonNote();
          }
        }
      }
      // all voices that belong to one stave are collectively added to create a common context in VexFlow.
      formatter.joinVoices(voices);
    }

    let minStaffEntriesWidth: number = 12; // a typical measure has roughly a length of 3*StaffHeight (3*4 = 12)
    const parentSourceMeasure: SourceMeasure = measures[0].parentSourceMeasure;
    // the voicing space bonus addition makes the voicing more relaxed. With a bonus of 0 the notes are basically completely squeezed together.
    const staffEntryFactor: number = 0.3;

    if (allVoices.length > 0) {
      minStaffEntriesWidth = formatter.preCalculateMinTotalWidth(allVoices) / unitInPixels
      * this.rules.VoiceSpacingMultiplierVexflow
      + this.rules.VoiceSpacingAddendVexflow
      + maxStaffEntries * staffEntryFactor; // TODO use maxStaffEntriesPlusAccidentals here as well, adjust spacing
      if (parentSourceMeasure?.ImplicitMeasure) {
        // shrink width in the ratio that the pickup measure is shorter compared to a full measure('s time signature):
        minStaffEntriesWidth = parentSourceMeasure.Duration.RealValue / parentSourceMeasure.ActiveTimeSignature.RealValue * minStaffEntriesWidth;
        // e.g. a 1/4 pickup measure in a 3/4 time signature should be 1/4 / 3/4 = 1/3 as long (a third)
        // it seems like this should be respected by staffEntries.length and preCaculateMinTotalWidth, but apparently not,
        //   without this the pickup measures were always too long.

        let barlineSpacing: number = 0;
        const measureListIndex: number = parentSourceMeasure.measureListIndex;
        if (measureListIndex > 1) {
          // only give this implicit measure more space if the previous one had a thick barline (e.g. repeat end)
          for (const gMeasure of this.graphicalMusicSheet.MeasureList[measureListIndex - 1]) {
            const endingBarStyleEnum: SystemLinesEnum = gMeasure?.parentSourceMeasure.endingBarStyleEnum;
            if (endingBarStyleEnum === SystemLinesEnum.ThinBold ||
                endingBarStyleEnum === SystemLinesEnum.DotsThinBold
            ) {
              barlineSpacing = this.rules.PickupMeasureRepetitionSpacing;
              break;
            }
          }
        }
        minStaffEntriesWidth += barlineSpacing;
        // add more than the original staffEntries scaling again: (removing it above makes it too short)
        if (maxStaffEntries > 1) { // not necessary for only 1 StaffEntry
          minStaffEntriesWidth += maxStaffEntriesPlusAccidentals * staffEntryFactor * 1.5; // don't scale this for implicit measures
          // in fact overscale it, this needs a lot of space the more staffEntries (and modifiers like accidentals) there are
        } else if (measureListIndex > 1 && maxStaffEntries === 1) {
          // do this also for measures not after repetitions:
          minStaffEntriesWidth += this.rules.PickupMeasureSpacingSingleNoteAddend;
        }
        minStaffEntriesWidth *= this.rules.PickupMeasureWidthMultiplier;
      }
      minStaffEntriesWidth = Math.max(minStaffEntriesWidth, this.trailingWordsMinimumWidth(measures, formatter));

        // TODO this could use some fine-tuning. currently using *1.5 + 1 by default, results in decent spacing.
      // firstMeasure.formatVoices = (w: number) => {
      //     formatter.format(allVoices, w);
      // };
      MusicSheetCalculator.setMeasuresMinStaffEntriesWidth(measures, minStaffEntriesWidth);

      const formatVoicesDefault: (w: number, p: VexFlowMeasure) => void = (w, p) => {
        formatter.formatToStave(allVoices, p.getVFStave());
      };
      const formatVoicesAlignRests: (w: number,  p: VexFlowMeasure) => void = (w, p) => {
        formatter.formatToStave(allVoices, p.getVFStave(), {
          align_rests: true,
          context: undefined
        });
      };

      for (const measure of measures) {
        // determine whether to align rests
        if (this.rules.AlignRests === AlignRestOption.Never) {
          (measure as VexFlowMeasure).formatVoices = formatVoicesDefault;
        } else if (this.rules.AlignRests === AlignRestOption.Always) {
          (measure as VexFlowMeasure).formatVoices = formatVoicesAlignRests;
        } else if (this.rules.AlignRests === AlignRestOption.Auto) {
          let alignRests: boolean = false;
          for (const staffEntry of measure.staffEntries) {
            let collidableVoiceEntries: number = 0;
            let numberOfRests: number = 0;
            for (const voiceEntry of staffEntry.graphicalVoiceEntries) {
              if (!voiceEntry.parentVoiceEntry.IsGrace) {
                if (voiceEntry && voiceEntry.notes && voiceEntry.notes[0] && voiceEntry.notes[0].sourceNote) {// TODO null chaining, TS 3.7
                  if (voiceEntry.notes[0].sourceNote.PrintObject) { // only respect collision when not invisible
                    collidableVoiceEntries++;
                  }
                }
              }
              if (voiceEntry && voiceEntry.notes && voiceEntry.notes[0] && voiceEntry.notes[0].sourceNote) {// TODO null chaining, TS 3.7
                if (voiceEntry.notes[0].sourceNote.isRest() && voiceEntry.notes[0].sourceNote.PrintObject) {
                  numberOfRests++; // only align rests if there is actually a rest (which could collide)
                }
              }
              if (collidableVoiceEntries > 1 && numberOfRests >= 1) {
                // TODO could add further checks like if any of the already checked voice entries actually collide
                alignRests = true;
                break;
              }
            }
            if (alignRests) {
              break;
            }
          }

          // set measure's format function
          if (alignRests) {
            (measure as VexFlowMeasure).formatVoices = formatVoicesAlignRests;
          } else {
            (measure as VexFlowMeasure).formatVoices = formatVoicesDefault;
          }
        }

        // format first measure with minimum width
        if (measure === measures[0]) {
          const vexflowMeasure: VexFlowMeasure = (measure as VexFlowMeasure);
          // prepare format function for voices, will be called later for formatting measure again
          //vexflowMeasure.formatVoices = formatVoicesDefault;

          // format now for minimum width, calculateMeasureWidthFromLyrics later
          vexflowMeasure.formatVoices(minStaffEntriesWidth * unitInPixels, vexflowMeasure);
        } else {
          //(measure as VexFlowMeasure).formatVoices = undefined;
          // TODO why was the formatVoices function disabled for other measures? would now disable the new align rests option.
        }
      }
    }

    for (const graphicalMeasure of measures) {
      if (!graphicalMeasure) {
        continue;
      }
      for (const staffEntry of graphicalMeasure.staffEntries) {
        // here the measure modifiers are not yet set, therefore the begin instruction width will be empty
        (<VexFlowStaffEntry>staffEntry).calculateXPosition();
      }
    }
    if (allVoices.length > 0) {
      minStaffEntriesWidth = this.fitGraceLyricsToFormattedEntries(measures, minStaffEntriesWidth, formatter, allVoices);
    }
    //Can't quite figure out why, but this is the calculation that needs redone to have consistent rendering.
    //The first render of a sheet vs. subsequent renders are calculated differently by vexflow without this re-joining of the voices
    for (const measure of measures) {
      if (!measure) {
        continue;
      }
      const mvoices: { [voiceID: number]: VF.Voice } = (measure as VexFlowMeasure).vfVoices;
      const voices: VF.Voice[] = [];
      for (const voiceID in mvoices) {
        if (mvoices.hasOwnProperty(voiceID)) {
          voices.push(mvoices[voiceID]);
        }
      }

      if (voices.length === 0) {
        log.debug("Found a measure with no voices. Continuing anyway.", mvoices);
        // no need to log this, measures with no voices/notes are fine. see OSMDOptions.fillEmptyMeasuresWithWholeRest
        continue;
      }
      // all voices that belong to one stave are collectively added to create a common context in VexFlow.
      formatter.joinVoices(voices);
    }

    // calculateMeasureWidthFromLyrics() will be called from MusicSheetCalculator after this
    return minStaffEntriesWidth;
  }

  /**
   * Keeps the main note's syllable clear of the syllable sung on a grace note before it, in the same verse and voice
   * (Legrenzi, Che fiero costume m18: "in" on the slashed grace note, "me" on the sixteenth; the grace note's syllable is
   * placed at the grace note by VexFlowStaffEntry.placeGraceLyrics()). The two notes share a staff entry and the gap
   * between them is the grace note group's, which stretching the measure (calculateElongationFactor()) doesn't widen:
   * the missing distance is added to the group's spacing before the main note (VexFlowPatch GraceNoteGroup.spacing),
   * like the right padding a long syllable's note gets in osmd-dart (lyricClearance). The measure's minimum width grows by
   * what the formatter's minimum total width gains, and the voices are formatted again at that width to read the new
   * positions (the main note's own modifier context keeps the extra shift until the voices are joined again, when
   * GraceNoteGroup.format() reads the spacing).
   * @returns the minimum staff entries width (units), unchanged without such syllables
   */
  private fitGraceLyricsToFormattedEntries(measures: GraphicalMeasure[], minimumWidth: number, formatter: VF.Formatter,
                                           allVoices: VF.Voice[]): number {
    if (!this.rules.RenderLyrics) {
      return minimumWidth;
    }
    const visible: VexFlowMeasure[] = measures.filter(m => m instanceof VexFlowMeasure && m.isVisible()) as VexFlowMeasure[];
    interface GracePair { entry: VexFlowStaffEntry, grace: GraphicalLyricEntry, main: GraphicalLyricEntry }
    const pairs: GracePair[] = [];
    for (const measure of visible) {
      for (const entry of measure.staffEntries as VexFlowStaffEntry[]) {
        for (const grace of entry.LyricsEntries) {
          const voiceEntry: VoiceEntry = grace.LyricsEntry.Parent;
          if (!voiceEntry?.IsGrace || voiceEntry.GraceAfterMainNote) {
            continue;
          }
          const main: GraphicalLyricEntry = entry.LyricsEntries.find((lyric: GraphicalLyricEntry): boolean =>
            lyric !== grace && lyric.LyricsEntry.VerseNumber === grace.LyricsEntry.VerseNumber &&
            !lyric.LyricsEntry.Parent?.IsGrace && lyric.LyricsEntry.Parent?.ParentVoice === voiceEntry.ParentVoice);
          if (main) {
            pairs.push({ entry, grace, main });
          }
        }
      }
    }
    if (pairs.length === 0) {
      return minimumWidth;
    }
    // what the main note's label lacks to clear the grace note's, by their margin boxes as the skyline sees them (units)
    const deficit: (pair: GracePair) => number = (pair: GracePair): number => {
      const graceBox: BoundingBox = pair.grace.GraphicalLabel.PositionAndShape;
      const mainBox: BoundingBox = pair.main.GraphicalLabel.PositionAndShape;
      return graceBox.RelativePosition.x + graceBox.BorderMarginRight + this.rules.HorizontalBetweenLyricsDistance -
        (mainBox.RelativePosition.x + mainBox.BorderMarginLeft);
    };
    let width: number = minimumWidth;
    for (let pass: number = 0; pass < 8; pass++) {
      const minTotalWidthBefore: number = formatter.preCalculateMinTotalWidth(allVoices);
      let widened: boolean = false;
      for (const pair of pairs) {
        const missing: number = deficit(pair);
        if (missing <= 0.01) {
          continue;
        }
        const graceGve: VexFlowVoiceEntry = pair.entry.graphicalVoiceEntries.find(
          (gve: GraphicalVoiceEntry): boolean => gve.parentVoiceEntry === pair.grace.LyricsEntry.Parent) as VexFlowVoiceEntry;
        const mainGve: VexFlowVoiceEntry = pair.entry.graphicalVoiceEntries.find(
          (gve: GraphicalVoiceEntry): boolean => gve.parentVoiceEntry === pair.main.LyricsEntry.Parent) as VexFlowVoiceEntry;
        const mainNote: any = mainGve?.vfStaveNote;
        const group: any = mainNote?.modifiers?.find((modifier: any): boolean =>
          modifier instanceof VF.GraceNoteGroup && (modifier as any).getGraceNotes().includes(graceGve?.vfStaveNote));
        const modifierContext: any = mainNote?.getModifierContext?.();
        if (!group || !modifierContext?.state) {
          continue;
        }
        const px: number = missing * unitInPixels;
        group.spacing = (group.spacing ?? 0) + px;
        // the already formatted context: GraceNoteGroup.format() has added the spacing to the left shift
        modifierContext.state.left_shift += px;
        modifierContext.width += px;
        widened = true;
      }
      if (!widened) {
        break;
      }
      // the formatter's minimum total width with the wider groups, from new tick contexts (the cached ones keep their widths)
      (formatter as any).tickContexts = undefined;
      (formatter as any).hasMinTotalWidth = false;
      const minTotalWidthAfter: number = formatter.preCalculateMinTotalWidth(allVoices);
      width += Math.max(0, minTotalWidthAfter - minTotalWidthBefore) / unitInPixels * this.rules.VoiceSpacingMultiplierVexflow;
      MusicSheetCalculator.setMeasuresMinStaffEntriesWidth(measures, width);
      for (const measure of visible) {
        measure.setWidth(width + measure.beginInstructionsWidth + measure.endInstructionsWidth);
      }
      visible[0].formatVoices?.(width * unitInPixels, visible[0]);
      for (const measure of visible) {
        for (const staffEntry of measure.staffEntries) {
          (staffEntry as VexFlowStaffEntry).calculateXPosition();
        }
      }
    }
    return width;
  }

  /**
   * The staff entry's syllables in the order they are spaced, with the verse slot of each (its index in the last entry
   * dict of calculateElongationFactor()): a syllable on a grace note goes before the main note's syllable of the same
   * verse and voice and shares its slot, so the previous syllable is spaced from it and the next one from the main
   * note's. Without grace notes each lyric entry has its own slot, as before.
   */
  private static lyricsInSpacingOrder(lyrics: GraphicalLyricEntry[]): [GraphicalLyricEntry[], number[]] {
    const isOnGraceNote: (lyric: GraphicalLyricEntry) => boolean = (lyric: GraphicalLyricEntry): boolean =>
      lyric.LyricsEntry.Parent?.IsGrace && !lyric.LyricsEntry.Parent.GraceAfterMainNote;
    const graces: GraphicalLyricEntry[] = lyrics.filter(isOnGraceNote);
    if (graces.length === 0) {
      return [lyrics, lyrics.map((lyric: GraphicalLyricEntry, i: number): number => i)];
    }
    const ordered: GraphicalLyricEntry[] = [];
    const slots: number[] = [];
    const mains: GraphicalLyricEntry[] = lyrics.filter((lyric: GraphicalLyricEntry): boolean => !isOnGraceNote(lyric));
    mains.forEach((main: GraphicalLyricEntry, mainSlot: number): void => {
      for (const grace of graces) {
        if (!ordered.includes(grace) && grace.LyricsEntry.VerseNumber === main.LyricsEntry.VerseNumber &&
            grace.LyricsEntry.Parent.ParentVoice === main.LyricsEntry.Parent?.ParentVoice) {
          ordered.push(grace);
          slots.push(mainSlot);
        }
      }
      ordered.push(main);
      slots.push(mainSlot);
    });
    let nextSlot: number = mains.length;
    for (const grace of graces) {
      if (!ordered.includes(grace)) {
        ordered.push(grace);
        slots.push(nextSlot++);
      }
    }
    return [ordered, slots];
  }

  private calculateElongationFactor(containers: (GraphicalLyricEntry|GraphicalChordSymbolContainer)[], staffEntry: GraphicalStaffEntry, lastEntryDict: any,
                                    oldMinimumStaffEntriesWidth: number, elongationFactorForMeasureWidth: number,
                                    measureNumber: number, oldMinSpacing: number, nextMeasureOverlap: number,
                                    slotIndices?: number[]): number {
    let newElongationFactorForMeasureWidth: number = elongationFactorForMeasureWidth;
    let currentContainerIndex: number = 0;

    let needsDashSpaceAtEnd: boolean = false;
    for (let position: number = 0; position < containers.length; position++) {
      const container: GraphicalLyricEntry|GraphicalChordSymbolContainer = containers[position];
      // the verse slot: shared by a syllable on a grace note and the main note's syllable (lyricsInSpacingOrder())
      currentContainerIndex = slotIndices ? slotIndices[position] : position;
      const alignment: TextAlignmentEnum = container.GraphicalLabel.Label.textAlignment;
      let minSpacing: number = oldMinSpacing;

      let overlapAllowedIntoNextMeasure: number = nextMeasureOverlap;
      needsDashSpaceAtEnd = false;

      if (container instanceof GraphicalLyricEntry && container.ParentLyricWord) {
        // spacing for multi-syllable words
        if (container.LyricsEntry.SyllableIndex > 0) { // syllables after first
          // give a little more spacing for dash between syllables
          minSpacing = this.rules.BetweenSyllableMinimumDistance;
          if (TextAlignment.IsCenterAligned(alignment)) {
            minSpacing += 1.0; // TODO check for previous lyric alignment too. though center is not standard
            // without this, there's not enough space for dashes between long syllables on eighth notes
          }
        }
        const syllables: LyricsEntry[] = container.ParentLyricWord.GetLyricWord.Syllables;
        if (syllables.length > 1) {
          if (container.LyricsEntry.SyllableIndex < syllables.length - 1) {
            needsDashSpaceAtEnd = true;
            // if a middle syllable of a word, give less measure overlap into next measure, to give room for dash
            if (this.dashSpace === undefined) { // don't replace undefined check
              this.dashSpace = 1.5;
              // better method, doesn't work:
              // this.dashLength = new GraphicalLabel(new Label("-"), this.rules.LyricsHeight, TextAlignmentEnum.CenterBottom)
              //   .PositionAndShape.Size.width; // always returns 0
            }
            overlapAllowedIntoNextMeasure -= this.dashSpace;
          }
        }
      }

      const bBox: BoundingBox = container instanceof GraphicalLyricEntry ? container.GraphicalLabel.PositionAndShape : container.PositionAndShape;
      const labelWidth: number = bBox.Size.width;
      const vexStaffEntry: VexFlowStaffEntry = staffEntry as VexFlowStaffEntry;
      // vexStaffEntry.calculateXPosition(false);
      // const notePosition: number = (staffEntry.graphicalVoiceEntries[0] as VexFlowVoiceEntry).vfStaveNote.getBoundingBox().getX() / unitInPixels;
      const staffEntryXPosition: number = vexStaffEntry.PositionAndShape.RelativePosition.x;
      let xPosition: number = staffEntryXPosition + bBox.BorderLeft;
      if (container instanceof GraphicalLyricEntry) {
        xPosition += container.GraceXShift; // a syllable on a grace note is left of the staff entry (at the main note)
      }
      // vexStaffEntry.calculateXPosition();
      if (container instanceof GraphicalChordSymbolContainer && container.PositionAndShape.Parent.DataObject instanceof GraphicalMeasure) {
        // the parent is only the measure for whole measure rest notes with chord symbols,
        //   which should start near the beginning of the measure instead of the middle, where there is no desired staffEntry position.
        //   TODO somehow on the 2nd render, above xPosition (from VexFlowStaffEntry) is way too big (for whole measure rests).
        xPosition = this.rules.ChordSymbolWholeMeasureRestXOffset + bBox.BorderMarginLeft +
          (container.PositionAndShape.Parent.DataObject as GraphicalMeasure).beginInstructionsWidth;
      }

      if (lastEntryDict[currentContainerIndex] !== undefined) {
        if (lastEntryDict[currentContainerIndex].extend) {
          // TODO handle extend of last entry (extend is stored in lyrics entry of preceding syllable)
          // only necessary for center alignment
        }
      }

      let spacingNeededToLastContainer: number;
      let currentSpacingToLastContainer: number; // undefined for first container in measure
      if (lastEntryDict[currentContainerIndex]) {
        currentSpacingToLastContainer = xPosition - lastEntryDict[currentContainerIndex].xPosition;
        // currentSpacingToLastContainer = lastEntryDict[currentContainerIndex].bBox.Size.width;
      }

      let currentSpacingToMeasureEnd: number;
      let spacingNeededToMeasureEnd: number;
      const maxXInMeasure: number = oldMinimumStaffEntriesWidth * elongationFactorForMeasureWidth;

      if (TextAlignment.IsCenterAligned(alignment)) {
        overlapAllowedIntoNextMeasure /= 4; // reserve space for overlap from next measure. its first note can't be spaced.
        currentSpacingToMeasureEnd = maxXInMeasure - xPosition;
        spacingNeededToMeasureEnd = (labelWidth / 2) - overlapAllowedIntoNextMeasure;
        // spacing to last lyric only done if not first lyric in measure:
        if (lastEntryDict[currentContainerIndex]) {
          spacingNeededToLastContainer =
            lastEntryDict[currentContainerIndex].labelWidth / 2 + labelWidth / 2 + minSpacing;
        }
      } else if (TextAlignment.IsLeft(alignment)) {
        currentSpacingToMeasureEnd = maxXInMeasure - xPosition;
        spacingNeededToMeasureEnd = labelWidth - overlapAllowedIntoNextMeasure;
        if (lastEntryDict[currentContainerIndex]) {
          spacingNeededToLastContainer = lastEntryDict[currentContainerIndex].labelWidth + minSpacing;
        }
      }

      // get factor of how much we need to stretch the measure to space the current lyric
      let elongationFactorForMeasureWidthForCurrentContainer: number = 1;
      let elongationFactorNeededForMeasureEnd: number;
      if (currentSpacingToMeasureEnd > 0) {
        elongationFactorNeededForMeasureEnd = spacingNeededToMeasureEnd / currentSpacingToMeasureEnd;
      } else {
        // currentSpacingToMeasureEnd <= 0 happens for pickup/anacrusis measures, where the staff entry
        // sits past the staff-entries-only width because xPosition includes begin instructions (clef, key,
        // time signature) but maxXInMeasure does not. The xPosition - oldMin offset is roughly the
        // begin-instructions width. Solve for F directly: oldMin*F >= xPosition + labelWidth - overlapAllowed.
        elongationFactorNeededForMeasureEnd = (xPosition + spacingNeededToMeasureEnd) / oldMinimumStaffEntriesWidth;
      }
      let elongationFactorNeededForLastContainer: number = 1;

      if (container instanceof GraphicalLyricEntry && container.LyricsEntry) {
        if (lastEntryDict[currentContainerIndex]?.graceNoteStaffEntry === staffEntry) {
          // the main note's syllable after the one on its grace note: the grace note group's spacing made room for it
          //   (fitGraceLyricsToFormattedEntries()), stretching the measure wouldn't
          elongationFactorNeededForLastContainer = 1;
        } else if (lastEntryDict[currentContainerIndex]) { // if previous lyric needs more spacing than measure end, take that spacing
          const lastNoteDuration: Fraction = lastEntryDict[currentContainerIndex].sourceNoteDuration;
          elongationFactorNeededForLastContainer = spacingNeededToLastContainer / currentSpacingToLastContainer;
          if ((lastNoteDuration.Denominator) > 4) {
            elongationFactorNeededForLastContainer *= 1.1; // from 1.2 upwards, this unnecessarily bloats shorter measures
            // spacing in Vexflow depends on note duration, our minSpacing is calibrated for quarter notes
            // if we double the measure length, the distance between eighth notes only gets half of the added length
            // compared to a quarter note.
          }
        }
      } else if (lastEntryDict[currentContainerIndex]) {
        elongationFactorNeededForLastContainer =
        spacingNeededToLastContainer / currentSpacingToLastContainer;
      }

      elongationFactorForMeasureWidthForCurrentContainer = Math.max(
        elongationFactorNeededForMeasureEnd,
        elongationFactorNeededForLastContainer
      );

      newElongationFactorForMeasureWidth = Math.max(
        newElongationFactorForMeasureWidth,
        elongationFactorForMeasureWidthForCurrentContainer
      );

      let overlap: number = Math.max((spacingNeededToLastContainer - currentSpacingToLastContainer) || 0, 0);
      if (lastEntryDict[currentContainerIndex]) {
        overlap += lastEntryDict[currentContainerIndex].cumulativeOverlap;
      }

      // set up information about this lyric entry of verse j for next lyric entry of verse j
      lastEntryDict[currentContainerIndex] = {
        cumulativeOverlap: overlap,
        extend: container instanceof GraphicalLyricEntry ? container.LyricsEntry.extend : false,
        // the staff entry, if the syllable is on a grace note before its main note (then at the grace note)
        graceNoteStaffEntry: container instanceof GraphicalLyricEntry && container.GraceXShift !== 0 ? staffEntry : undefined,
        labelWidth: labelWidth,
        measureNumber: measureNumber,
        needsDashSpaceAtEnd: needsDashSpaceAtEnd,
        sourceNoteDuration: container instanceof GraphicalLyricEntry ? (container.LyricsEntry && container.LyricsEntry.Parent?.Notes[0]?.Length) : false,
        text: container instanceof GraphicalLyricEntry ? container.LyricsEntry.Text : container.GraphicalLabel.Label.text,
        xPosition: xPosition,
      };
    }

    return newElongationFactorForMeasureWidth;
  }

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
  public calculateElongationFactorFromStaffEntries(staffEntries: GraphicalStaffEntry[], oldMinimumStaffEntriesWidth: number,
                                                  elongationFactorForMeasureWidth: number, measureNumber: number,
                                                  previousLyricOverflows?: number[],
                                                  previousChordOverflows?: number[]): {
    factor: number;
    lastLyricEntryDict: { [i: number]: any };
    lastChordEntryDict: { [i: number]: any };
  } {
    interface EntryInfo {
      cumulativeOverlap: number;
      extend: boolean;
      labelWidth: number;
      needsDashSpaceAtEnd?: boolean;
      xPosition: number;
      sourceNoteDuration: Fraction;
      text: string;
      measureNumber: number;
    }
    // holds lyrics entries for verses i
    interface EntryDict {
      [i: number]: EntryInfo;
    }

    let newElongationFactorForMeasureWidth: number = elongationFactorForMeasureWidth;

    const lastLyricEntryDict: EntryDict = {}; // holds info about last lyric entries for all verses j???
    const lastChordEntryDict: EntryDict = {}; // holds info about last chord entries for all verses j???

    // Seed dicts with previous-measure overflow as synthetic entries, so the first lyric/chord
    // in this measure is forced to leave clearance from the previous measure's overhang.
    // The synthetic entry sits at xPosition 0 with labelWidth = overflow, so for left-aligned
    // labels (the standard) the existing logic requires xPosition_first >= overflow + minSpacing.
    if (previousLyricOverflows) {
      for (let i: number = 0; i < previousLyricOverflows.length; i++) {
        const overflow: number = previousLyricOverflows[i];
        if (overflow > 0) {
          lastLyricEntryDict[i] = {
            cumulativeOverlap: 0,
            extend: false,
            labelWidth: overflow,
            measureNumber: measureNumber - 1,
            sourceNoteDuration: new Fraction(1, 4),
            text: "",
            xPosition: 0,
          };
        }
      }
    }
    if (previousChordOverflows) {
      for (let i: number = 0; i < previousChordOverflows.length; i++) {
        const overflow: number = previousChordOverflows[i];
        if (overflow > 0) {
          lastChordEntryDict[i] = {
            cumulativeOverlap: 0,
            extend: false,
            labelWidth: overflow,
            measureNumber: measureNumber - 1,
            sourceNoteDuration: new Fraction(1, 4),
            text: "",
            xPosition: 0,
          };
        }
      }
    }

    // for all staffEntries i, each containing the lyric entry for all verses at that timestamp in the measure
    for (const staffEntry of staffEntries) {
      if (staffEntry.LyricsEntries.length > 0 && this.rules.RenderLyrics) {
        const [lyrics, slots]: [GraphicalLyricEntry[], number[]] = VexFlowMusicSheetCalculator.lyricsInSpacingOrder(staffEntry.LyricsEntries);
        newElongationFactorForMeasureWidth =
          this.calculateElongationFactor(
            lyrics,
            staffEntry,
            lastLyricEntryDict,
            oldMinimumStaffEntriesWidth,
            newElongationFactorForMeasureWidth,
            measureNumber,
            this.rules.HorizontalBetweenLyricsDistance,
            this.rules.LyricOverlapAllowedIntoNextMeasure,
            slots,
          );
      }
      if (staffEntry.graphicalChordContainers.length > 0 && this.rules.RenderChordSymbols) {
        newElongationFactorForMeasureWidth =
          this.calculateElongationFactor(
            staffEntry.graphicalChordContainers,
            staffEntry,
            lastChordEntryDict,
            oldMinimumStaffEntriesWidth,
            newElongationFactorForMeasureWidth,
            measureNumber,
            this.rules.ChordSymbolXSpacing,
            this.rules.ChordOverlapAllowedIntoNextMeasure,
          );
      }
    }

    return {
      factor: newElongationFactorForMeasureWidth,
      lastLyricEntryDict,
      lastChordEntryDict,
    };
  }

  public calculateMeasureWidthFromStaffEntries(measuresVertical: GraphicalMeasure[], oldMinimumStaffEntriesWidth: number): number {
    let elongationFactorForMeasureWidth: number = 1;

    interface PerStaffResult {
      staff: Staff;
      lastLyricEntryDict: { [i: number]: any };
      lastChordEntryDict: { [i: number]: any };
    }
    const perStaffResults: PerStaffResult[] = [];
    const visibleStaves: Set<Staff> = new Set<Staff>();

    for (const measure of measuresVertical) {
      if (!measure || measure.staffEntries.length === 0 || !measure.isVisible()) {
        continue;
      }
      const staff: Staff = measure.ParentStaff;
      visibleStaves.add(staff);
      const previousLyricOverflows: number[] = this.previousLyricOverflowsByStaff.get(staff);
      const previousChordOverflows: number[] = this.previousChordOverflowsByStaff.get(staff);

      // (measure as VexFlowMeasure).format(); // needed to get vexflow bbox / x-position
      const result: { factor: number, lastLyricEntryDict: { [i: number]: any }, lastChordEntryDict: { [i: number]: any } } =
        this.calculateElongationFactorFromStaffEntries(
          measure.staffEntries,
          oldMinimumStaffEntriesWidth,
          elongationFactorForMeasureWidth,
          measure.MeasureNumber,
          previousLyricOverflows,
          previousChordOverflows,
        );
      elongationFactorForMeasureWidth = result.factor;
      perStaffResults.push({
        staff,
        lastLyricEntryDict: result.lastLyricEntryDict,
        lastChordEntryDict: result.lastChordEntryDict,
      });
    }
    elongationFactorForMeasureWidth = Math.min(elongationFactorForMeasureWidth, this.rules.MaximumLyricsElongationFactor);
    // console.log(`elongationFactor for measure ${measuresVertical[0]?.MeasureNumber}: ${elongationFactorForMeasureWidth}`);
    // TODO check when this is > 2.0. See PR #1474

    const newMinimumStaffEntriesWidth: number = oldMinimumStaffEntriesWidth * elongationFactorForMeasureWidth;

    // Compute overflow of this measure's last lyric/chord into the next measure, per staff and per verse,
    // so the next measure's calculation can leave clearance for it.
    // overflow is measured against newMinimumStaffEntriesWidth (the bar position) using the same
    // pre-elongation xPosition convention used elsewhere in this calculator.
    for (const result of perStaffResults) {
      const lyricOverflows: number[] = this.computeContainerOverflows(result.lastLyricEntryDict, newMinimumStaffEntriesWidth);
      const chordOverflows: number[] = this.computeContainerOverflows(result.lastChordEntryDict, newMinimumStaffEntriesWidth);
      this.previousLyricOverflowsByStaff.set(result.staff, lyricOverflows);
      this.previousChordOverflowsByStaff.set(result.staff, chordOverflows);
    }
    // For staves that were skipped (invisible or empty) this measure, drop the previous overflow
    // so it doesn't get applied across a gap.
    for (const staff of Array.from(this.previousLyricOverflowsByStaff.keys())) {
      if (!visibleStaves.has(staff)) {
        this.previousLyricOverflowsByStaff.delete(staff);
      }
    }
    for (const staff of Array.from(this.previousChordOverflowsByStaff.keys())) {
      if (!visibleStaves.has(staff)) {
        this.previousChordOverflowsByStaff.delete(staff);
      }
    }

    return this.fitExpressionsToFormattedEntries(measuresVertical, oldMinimumStaffEntriesWidth, newMinimumStaffEntriesWidth);
  }

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
  private fitExpressionsToFormattedEntries(measures: GraphicalMeasure[], minimumWidth: number, candidateWidth: number): number {
    const maxWidth: number = Math.max(candidateWidth, minimumWidth * this.rules.MaximumDynamicsElongationFactor);
    if (!isFinite(candidateWidth) || candidateWidth <= 0 || maxWidth <= candidateWidth) {
      return candidateWidth;
    }
    const pairs: ExpressionPair[] = [];
    const wedgePairs: ExpressionPair[] = [];
    for (let staffIndex: number = 0; staffIndex < measures.length; staffIndex++) {
      const measure: GraphicalMeasure = measures[staffIndex];
      if (!(measure instanceof VexFlowMeasure) || !measure.isVisible() || measure.staffEntries.length === 0) {
        continue;
      }
      const slots: ExpressionSlot[] = this.expressionSlots(measure, staffIndex);
      if (slots.filter(slot => slot.isLabel).length > 1) {
        pairs.push(...this.expressionPairs(measure, slots));
      }
      wedgePairs.push(...this.wedgeLengthPairs(measure, slots));
      wedgePairs.push(...this.pedalMarkPairs(measure, staffIndex, measures));
    }
    if (pairs.length === 0 && wedgePairs.length === 0) {
      return candidateWidth;
    }
    // the staff entries' width the measures are formatted at (formatAt): the measure's end for a time after its last note (xAtTimestamp())
    let formattedWidth: number = minimumWidth;
    const pairGrowth: (pair: ExpressionPair) => number = (pair: ExpressionPair): number => {
      const endX: number = pair.measure.beginInstructionsWidth + formattedWidth;
      const x0: number = this.xAtTimestamp(pair.earlier.placedBy ?? pair.measure, pair.earlier.timestamp, endX);
      const x1: number = this.xAtTimestamp(pair.later.placedBy ?? pair.measure, pair.later.timestamp, endX);
      const gap: number = x1 - x0;
      const deficit: number = x0 + pair.earlier.right + pair.need - (x1 + pair.later.left);
      return gap <= 0.01 || deficit <= 0.01 ? 1 : (gap + deficit) / gap;
    };
    // The current positions are the tighter ones of calculateMeasureXLayout(): if the dynamics fit there,
    // they fit at candidateWidth, without formatting again.
    const fits: (list: ExpressionPair[]) => boolean = (list: ExpressionPair[]): boolean => list.every(pair => pairGrowth(pair) <= 1.0001);
    if (fits(pairs) && fits(wedgePairs)) {
      return candidateWidth;
    }
    const visible: VexFlowMeasure[] = measures.filter(m => m instanceof VexFlowMeasure && m.isVisible()) as VexFlowMeasure[];
    const originalWidths: number[] = visible.map(m => m.PositionAndShape.Size.width);
    const formatAt: (width: number) => void = (width: number): void => {
      formattedWidth = width;
      for (const measure of visible) {
        measure.setWidth(width + measure.beginInstructionsWidth + measure.endInstructionsWidth);
      }
      visible[0].formatVoices?.(width * unitInPixels, visible[0]);
      for (const measure of visible) {
        for (const staffEntry of measure.staffEntries) {
          (staffEntry as VexFlowStaffEntry).calculateXPosition();
        }
      }
    };
    try {
      formatAt(candidateWidth);
      for (let pass: number = 0; pass < 8 && pairs.length > 0; pass++) {
        const factor: number = pairs.reduce((growth, pair) => Math.max(growth, pairGrowth(pair)), 1);
        if (factor <= 1.0001) {
          break;
        }
        const next: number = Math.min(candidateWidth * factor, maxWidth);
        if (next <= candidateWidth + 0.0001) {
          log.debug(`measure ${visible[0].MeasureNumber}: dynamics still overlap at ${candidateWidth.toFixed(2)} ` +
            "(MaximumDynamicsElongationFactor)");
          break;
        }
        candidateWidth = next;
        formatAt(candidateWidth);
      }
      // The wedges (and the pedal marks) get the least width they fit in: the note gaps grow faster than the measure, so
      // growing it by the gap's deficit factor, as for the dynamics above, widened a measure with one short wedge by half.
      if (!fits(wedgePairs)) {
        let tight: number = candidateWidth;
        let wide: number = maxWidth;
        formatAt(wide);
        if (fits(wedgePairs)) {
          for (let pass: number = 0; pass < 8 && wide - tight > 0.05; pass++) {
            const middle: number = (tight + wide) / 2;
            formatAt(middle);
            if (fits(wedgePairs)) {
              wide = middle;
            } else {
              tight = middle;
            }
          }
        } else {
          log.debug(`measure ${visible[0].MeasureNumber}: wedges or pedal marks still don't fit at ${wide.toFixed(2)} ` +
            "(MaximumDynamicsElongationFactor)");
        }
        candidateWidth = wide;
      }
    } finally {
      for (let i: number = 0; i < visible.length; i++) {
        visible[i].setWidth(originalWidths[i]);
      }
    }
    return candidateWidth;
  }

  /** The dynamics and wedges that start in measure on the staff of staffIndex,
   *  with the label widths they will be drawn with (calculateDynamicExpressions()). */
  private expressionSlots(measure: VexFlowMeasure, staffIndex: number): ExpressionSlot[] {
    const source: SourceMeasure = measure.parentSourceMeasure;
    const slots: ExpressionSlot[] = [];
    if (!source || staffIndex >= source.StaffLinkedExpressions.length) {
      return slots;
    }
    for (const multiExpression of source.StaffLinkedExpressions[staffIndex]) {
      const timestamp: number = multiExpression.Timestamp.RealValue;
      const instantaneous: InstantaneousDynamicExpression = multiExpression.InstantaneousDynamic;
      if (instantaneous) {
        const box: BoundingBox = VexFlowInstantaneousDynamicExpression.createLabel(instantaneous, this.rules).PositionAndShape;
        slots.push({
          below: instantaneous.Placement === PlacementEnum.Below, endTimestamp: timestamp, isLabel: true,
          left: box.BorderMarginLeft, right: box.BorderMarginRight, text: DynamicEnum[instantaneous.DynEnum], timestamp,
        });
      }
      // calculateDynamicExpressions() skips a continuous dynamic that comes with words unless there is an instantaneous dynamic too.
      const continuous: ContinuousDynamicExpression = multiExpression.StartingContinuousDynamic;
      if (continuous && continuous.StartMultiExpression === multiExpression &&
          (instantaneous || multiExpression.UnknownList.length === 0)) {
        const below: boolean = continuous.Placement === PlacementEnum.Below;
        if (continuous.Label && continuous.Label.length > 0) {
          const box: BoundingBox = VexFlowContinuousDynamicExpression.createVerbalLabel(continuous, this.rules).PositionAndShape;
          slots.push({
            below, endTimestamp: timestamp, isLabel: true,
            left: box.BorderMarginLeft, right: box.BorderMarginRight, text: continuous.Label, timestamp,
          });
        } else {
          const end: MultiExpression = continuous.EndMultiExpression;
          if (end && end.SourceMeasureParent === source) {
            const slot: ExpressionSlot = { below, diminuendo: continuous.DynamicType === ContDynamicEnum.diminuendo,
              endTimestamp: end.Timestamp.RealValue, isLabel: false, left: 0, right: 0, stopTimestamp: continuous.StopTimestamp?.RealValue,
              text: "wedge", timestamp };
            const next: ContinuousDynamicExpression = this.wedgeStartingAtStop(continuous, staffIndex);
            if (next && next.EndMultiExpression?.SourceMeasureParent === source) {
              slot.pairStop = this.wedgeStopTime(next)?.RealValue;
            }
            slot.pairedPrevious = this.wedgeStoppingAtStart(continuous, staffIndex) !== undefined;
            slots.push(slot);
          }
        }
      }
    }
    return slots;
  }

  /** Dynamic pairs on one side of a staff that start at different timestamps, with the distance the later one must keep from the earlier one. */
  private expressionPairs(measure: VexFlowMeasure, slots: ExpressionSlot[]): ExpressionPair[] {
    const spacer: number = this.rules.DynamicExpressionSpacer;
    const wedgeLength: number = this.rules.WedgeMinLength;
    const pairs: ExpressionPair[] = [];
    for (const below of [false, true]) {
      // stable sort by timestamp
      const labels: ExpressionSlot[] = slots.filter(s => s.isLabel && s.below === below)
        .map((slot, index) => ({ index, slot }))
        .sort((a, b) => a.slot.timestamp - b.slot.timestamp || a.index - b.index)
        .map(entry => entry.slot);
      const wedges: ExpressionSlot[] = slots.filter(s => !s.isLabel && s.below === below);
      for (const later of labels) {
        const earlierLabels: ExpressionSlot[] = labels.filter(s => s.timestamp < later.timestamp);
        if (earlierLabels.length === 0) {
          continue;
        }
        const previousTimestamp: number = Math.max(...earlierLabels.map(s => s.timestamp));
        for (const earlier of earlierLabels) {
          let need: number = spacer;
          // A wedge ends at the last note before its stop (the reader's EndMultiExpression),
          // so one from a dynamic to the next one on the following note starts and ends at the same timestamp.
          if (earlier.timestamp === previousTimestamp &&
              wedges.some(w => w.timestamp >= earlier.timestamp && w.timestamp < later.timestamp && w.endTimestamp <= later.timestamp)) {
            need += wedgeLength + spacer;
          }
          pairs.push({ earlier, later, measure, need });
        }
      }
    }
    return pairs;
  }

  /** Each wedge that starts and stops before the last staff entry of the measure, from its start (after a dynamic there, else
   *  the left border of its note) to its stop (the left border of the note there for a diminuendo, as drawn), with the distance
   *  WedgeMinReservedLength and the end margin it is drawn with. */
  private wedgeLengthPairs(measure: VexFlowMeasure, slots: ExpressionSlot[]): ExpressionPair[] {
    const margin: number = this.rules.WedgeHorizontalMargin;
    const need: number = this.rules.WedgeMinReservedLength + margin;
    const lastEntry: number = measure.staffEntries.length === 0 ? 0 :
      measure.staffEntries[measure.staffEntries.length - 1].relInMeasureTimestamp.RealValue;
    const duration: number = measure.parentSourceMeasure?.Duration.RealValue ?? lastEntry;
    const pairs: ExpressionPair[] = [];
    for (const wedge of slots.filter(s => !s.isLabel)) {
      // A pair (a swell "<>" over one note, wedgeStartingAtStop()) is reserved once, from the first wedge's start to the
      // second one's stop; the second wedge is not reserved on its own.
      const paired: boolean = wedge.pairStop !== undefined || wedge.pairedPrevious;
      const stop: number = wedge.pairStop ?? wedge.stopTimestamp;
      if (wedge.pairedPrevious && wedge.pairStop === undefined) {
        continue;
      }
      if (stop === undefined || stop <= wedge.timestamp || stop > (paired ? duration : lastEntry)) {
        continue;
      }
      const borderLeftAt: (timestamp: number) => number = (timestamp: number): number =>
        measure.staffEntries.find(se => se.relInMeasureTimestamp.RealValue === timestamp)?.PositionAndShape.BorderLeft ?? 0;
      // the wedge starts after a dynamic at its start (startCollideBox)
      const labels: ExpressionSlot[] = slots.filter(s => s.isLabel && s.below === wedge.below && s.timestamp === wedge.timestamp);
      const startRight: number = labels.length === 0 ? borderLeftAt(wedge.timestamp) :
        labels.reduce((r, s) => Math.max(r, s.right + margin), 0);
      const stopLeft: number = wedge.diminuendo && !paired ? borderLeftAt(stop) : 0;
      pairs.push({
        earlier: { below: wedge.below, endTimestamp: wedge.timestamp, isLabel: true, left: 0, right: startRight, text: "",
                   timestamp: wedge.timestamp },
        later: { below: wedge.below, endTimestamp: stop, isLabel: true, left: stopLeft, right: 0, text: "", timestamp: stop },
        measure, need,
      });
    }
    return pairs;
  }

  /** The Ped. and * marks of the symbol pedals on the staff of staffIndex in measure, each paired with the next mark at a later
   *  time, which must keep PedalMarking's text margin to it (in the glyphs' borders as calculateSinglePedal() and VexFlowPatch
   *  PedalMarking.drawText() place them: the Ped. x_shift left of its note, the * at its note or interpolated release time, a
   *  release at the measure's end right-aligned before the barline). Without them a Ped., its * and the next Ped. in a narrow
   *  measure were pushed right of each other's notes, the * past the next note and over the barline (Schumann, Myrthen 24
   *  m14-15, R-24-1). A change (* Ped. at one time) keeps its own gap. Same as osmd-dart. */
  private pedalMarkPairs(measure: VexFlowMeasure, staffIndex: number, column: GraphicalMeasure[]): ExpressionPair[] {
    const source: SourceMeasure = measure.parentSourceMeasure;
    if (!source || staffIndex >= source.StaffLinkedExpressions.length) {
      return [];
    }
    const marking: any = (Vex.Flow as any).PedalMarking;
    const point: number = 40; // PedalMarking's default glyph_point_size, as getPedalMarking() leaves it
    const margin: number = 6; // its default text_margin_right
    const gap: number = marking.CHANGE_GAP ?? 3;
    const depressWidth: number = marking.depressGlyphWidth ? marking.depressGlyphWidth(point) : 20;
    const releaseWidth: number = marking.releaseGlyphWidth ? marking.releaseGlyphWidth(point) : 10;
    const depressShift: number = marking.GLYPHS?.pedal_depress?.x_shift ?? -10;
    const releaseShift: number = marking.GLYPHS?.pedal_release?.x_shift ?? -2;
    const duration: number = source.Duration.RealValue;
    const isSymbol: (pedal: Pedal) => boolean = (pedal: Pedal): boolean => pedal && !pedal.IsLine && pedal.IsSign;
    // borders in VexFlow px relative to the x of the mark's time
    const marks: { timestamp: number, left: number, right: number, order: number }[] = [];
    for (const multiExpression of source.StaffLinkedExpressions[staffIndex]) {
      const timestamp: number = multiExpression.Timestamp.RealValue;
      const ended: Pedal = multiExpression.PedalEnd;
      if (isSymbol(ended)) {
        // the release calculateSinglePedal() leaves out: sign="no", or retaken by the next Ped. at the same time
        const next: Pedal = ended.ParentEndMultiExpression?.PedalStart;
        const hidden: boolean = ended.ReleaseHidden || next !== undefined && next !== ended && !ended.ChangeEnd;
        if (!hidden) {
          if (timestamp >= duration) {
            marks.push({ left: -margin - releaseWidth, order: 0, right: -margin, timestamp: duration });
          } else if (ended.ChangeEnd) {
            marks.push({ left: -gap - releaseWidth, order: 0, right: -gap, timestamp });
          } else {
            marks.push({ left: releaseShift, order: 0, right: releaseShift + releaseWidth, timestamp });
          }
        }
      }
      const started: Pedal = multiExpression.PedalStart;
      if (isSymbol(started) && timestamp < duration) {
        const left: number = started.ChangeBegin ? gap : depressShift;
        marks.push({ left, order: 1, right: left + depressWidth, timestamp });
      }
    }
    marks.sort((a, b) => a.timestamp - b.timestamp || a.order - b.order);
    // a mark between the staff's notes is drawn at another staff's note at its time (otherStaffEntryAtTime())
    const placedBy: (timestamp: number) => VexFlowMeasure = (timestamp: number): VexFlowMeasure => {
      const has: (m: GraphicalMeasure) => boolean = (m: GraphicalMeasure): boolean =>
        m.staffEntries.some(se => se.relInMeasureTimestamp.RealValue === timestamp && this.hasVexFlowNote(se));
      if (timestamp >= duration || has(measure)) {
        return measure;
      }
      return column.find(m => m instanceof VexFlowMeasure && m !== measure && m.isVisible() && has(m)) as VexFlowMeasure ?? measure;
    };
    const pairs: ExpressionPair[] = [];
    for (let i: number = 1; i < marks.length; i++) {
      const earlier: { timestamp: number, left: number, right: number } = marks[i - 1];
      const later: { timestamp: number, left: number, right: number } = marks[i];
      if (later.timestamp <= earlier.timestamp) {
        continue;
      }
      const slot: (mark: { timestamp: number, left: number, right: number }) => ExpressionSlot = mark => ({
        below: true, endTimestamp: mark.timestamp, isLabel: true, left: mark.left / unitInPixels, placedBy: placedBy(mark.timestamp),
        right: mark.right / unitInPixels, text: "pedal", timestamp: mark.timestamp,
      });
      pairs.push({ earlier: slot(earlier), later: slot(later), measure, need: margin / unitInPixels });
    }
    return pairs;
  }

  /** The x of timestamp (relative to its measure) between the measure's staff entries,
   *  as getRelativePositionInStaffLineFromTimestamp() interpolates it; after the last staff entry towards endX, the measure's end
   *  (a pair's stop over the measure's last note). */
  private xAtTimestamp(measure: VexFlowMeasure, timestamp: number, endX?: number): number {
    let left: GraphicalStaffEntry = undefined;
    let right: GraphicalStaffEntry = undefined;
    for (const staffEntry of measure.staffEntries) {
      const t: number = staffEntry.relInMeasureTimestamp.RealValue;
      if (t <= timestamp) {
        left = staffEntry;
      }
      if (t >= timestamp) {
        right = staffEntry;
        break;
      }
    }
    if (left && !right && endX !== undefined) {
      // after the last staff entry: towards the measure's end, where the next measure's first note is about (a pair's stop over the last note)
      const lastT: number = left.relInMeasureTimestamp.RealValue;
      const endT: number = measure.parentSourceMeasure?.Duration.RealValue ?? lastT;
      const lastX: number = left.PositionAndShape.RelativePosition.x;
      if (endT <= lastT || endX <= lastX) {
        return lastX;
      }
      return lastX + (endX - lastX) * (Math.min(timestamp, endT) - lastT) / (endT - lastT);
    }
    left = left ?? right;
    right = right ?? left;
    const leftX: number = left.PositionAndShape.RelativePosition.x;
    const rightX: number = right.PositionAndShape.RelativePosition.x;
    const t0: number = left.relInMeasureTimestamp.RealValue;
    const t1: number = right.relInMeasureTimestamp.RealValue;
    if (t1 <= t0) {
      return leftX;
    }
    return leftX + (rightX - leftX) * (timestamp - t0) / (t1 - t0);
  }

  private computeContainerOverflows(lastEntryDict: { [i: number]: any }, measureWidth: number): number[] {
    const overflows: number[] = [];
    for (const key of Object.keys(lastEntryDict)) {
      const i: number = Number(key);
      const entry: any = lastEntryDict[i];
      if (!entry) {
        continue;
      }
      // entry.xPosition is the lyric label's left edge in pre-elongation units.
      // entry.labelWidth is the label width (does not scale with elongation).
      // measureWidth is the elongated bar position.
      const rightEdge: number = entry.xPosition + entry.labelWidth;
      let overflow: number = Math.max(0, rightEdge - measureWidth);
      // If this lyric is a multi-syllable mid-word, the next syllable is connected by a dash.
      // The previous-measure elongation already reserved this.dashSpace for the dash via
      // overlapAllowedIntoNextMeasure -= dashSpace; the next measure's first lyric must clear
      // the dash too, otherwise the dash has no room to render between the two syllables.
      if (entry.needsDashSpaceAtEnd && this.dashSpace !== undefined) {
        overflow += this.dashSpace;
      }
      overflows[i] = overflow;
    }
    return overflows;
  }

  protected createGraphicalTie(tie: Tie, startGse: GraphicalStaffEntry, endGse: GraphicalStaffEntry,
                               startNote: GraphicalNote, endNote: GraphicalNote): GraphicalTie {
    return new GraphicalTie(tie, startNote, endNote);
  }


  protected updateStaffLineBorders(staffLine: StaffLine): void {
    staffLine.SkyBottomLineCalculator.updateStaffLineBorders();
  }

  protected graphicalMeasureCreatedCalculations(measure: GraphicalMeasure): void {
    (measure as VexFlowMeasure).rules = this.rules;
    (measure as VexFlowMeasure).graphicalMeasureCreatedCalculations();
  }

  /**
   * Can be used to calculate articulations, stem directions, helper(ledger) lines, and overlapping note x-displacement.
   * Is Excecuted per voice entry of a staff entry.
   * After that layoutStaffEntry is called.
   * @param voiceEntry
   * @param graphicalNotes
   * @param graphicalStaffEntry
   * @param hasPitchedNote
   */
  protected layoutVoiceEntry(voiceEntry: VoiceEntry, graphicalNotes: GraphicalNote[], graphicalStaffEntry: GraphicalStaffEntry,
                             hasPitchedNote: boolean): void {
      for (let i: number = 0; i < graphicalNotes.length; i++) {
        graphicalNotes[i] = MusicSheetCalculator.stafflineNoteCalculator.positionNote(graphicalNotes[i]);
      }
  }

  /**
   * Do all layout calculations that have to be done per staff entry, like dots, ornaments, arpeggios....
   * This method is called after the voice entries are handled by layoutVoiceEntry().
   * @param graphicalStaffEntry
   */
  protected layoutStaffEntry(graphicalStaffEntry: GraphicalStaffEntry): void {
    (graphicalStaffEntry.parentMeasure as VexFlowMeasure).layoutStaffEntry(graphicalStaffEntry);
  }

  /**
   * Is called at the begin of the method for creating the vertically aligned staff measures belonging to one source measure.
   */
  protected initGraphicalMeasuresCreation(): void {
    return;
  }

  /**
   * add here all given articulations to the VexFlowGraphicalStaffEntry and prepare them for rendering.
   * @param articulations
   * @param voiceEntry
   * @param graphicalStaffEntry
   */
  protected layoutArticulationMarks(articulations: Articulation[], voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry): void {
    // uncomment this when implementing:
    // let vfse: VexFlowStaffEntry = (graphicalStaffEntry as VexFlowStaffEntry);

    return;
  }

  /**
   * Calculate the shape (Bezier curve) for this tie.
   * @param tie
   * @param tieIsAtSystemBreak
   * @param isTab Whether this tie is for a tab note (guitar tabulature)
   */
  protected layoutGraphicalTie(tie: GraphicalTie, tieIsAtSystemBreak: boolean, isTab: boolean): void {
    const startNote: VexFlowGraphicalNote = (tie.StartNote as VexFlowGraphicalNote);
    const endNote: VexFlowGraphicalNote = (tie.EndNote as VexFlowGraphicalNote);

    let vfStartNote: VF.StemmableNote  = undefined;
    let startNoteIndexInTie: number = 0;
    if (startNote && startNote.vfnote && startNote.vfnote.length >= 2) {
      vfStartNote = startNote.vfnote[0];
      startNoteIndexInTie = startNote.vfnote[1];
    }

    let vfEndNote: VF.StemmableNote  = undefined;
    let endNoteIndexInTie: number = 0;
    if (endNote && endNote.vfnote && endNote.vfnote.length >= 2) {
      vfEndNote = endNote.vfnote[0];
      endNoteIndexInTie = endNote.vfnote[1];
    }
    // in a standard staff, e.g. given in the XML for the start note (a TabTie always curves upwards)
    const tieDirection: PlacementEnum = tie.Tie.getTieDirection(startNote?.sourceNote);

    if (tieIsAtSystemBreak) {
      // split tie into two ties.
      // In a TAB staff, TabTies like in one system (see below), but only the part in the first system gets the label
      //   of a hammer-on or pull-off ("H" or "P"), like in MuseScore: it isn't repeated in the next system.
      //   (notes: any, because the typings of TabTie want both notes, though a TabTie draws a part with one, like a StaveTie)
      if (vfStartNote) { // first_note or last_note must be not null in Vexflow
        const notes: any = {
          first_indices: [startNoteIndexInTie],
          first_note: vfStartNote
        };
        const vfTie1: VF.StaveTie = isTab ? new VF.TabTie(notes, tie.Tie.Type) : this.createStaveTie(notes, tieDirection);
        VexFlowConverter.setVexFlowTextFontFamily((vfTie1 as any).font, this.rules); // e.g. "H" for a hammer-on
        const measure1: VexFlowMeasure = (startNote.parentVoiceEntry.parentStaffEntry.parentMeasure as VexFlowMeasure);
        measure1.addStaveTie(vfTie1, tie);
      }

      if (vfEndNote) {
        const notes: any = {
          last_indices: [endNoteIndexInTie],
          last_note: vfEndNote
        };
        const vfTie2: VF.StaveTie = isTab ? new VF.TabTie(notes) : this.createStaveTie(notes, tieDirection);
        const measure2: VexFlowMeasure = (endNote.parentVoiceEntry.parentStaffEntry.parentMeasure as VexFlowMeasure);
        measure2.addStaveTie(vfTie2, tie);
      }
    } else {
      // normal case
      if (vfStartNote || vfEndNote) { // one of these must be not null in Vexflow
        let vfTie: any;
        if (isTab) {
          if (tie.Tie.Type === "S") {
            //calculate direction
            const startTieNote: TabNote = <TabNote> tie.StartNote.sourceNote;
            const endTieNote: TabNote = <TabNote> tie.EndNote.sourceNote;
            let slideDirection: number = 1;
            if (startTieNote.FretNumber > endTieNote.FretNumber) {
              slideDirection = -1;
            }
            vfTie = new VF.TabSlide(
              {
                first_indices: [startNoteIndexInTie],
                first_note: vfStartNote,
                last_indices: [endNoteIndexInTie],
                last_note: vfEndNote,
              },
              slideDirection
            );
          } else {
            vfTie = new VF.TabTie(
              {
                first_indices: [startNoteIndexInTie],
                first_note: vfStartNote,
                last_indices: [endNoteIndexInTie],
                last_note: vfEndNote,
              },
              tie.Tie.Type
            );
          }
          VexFlowConverter.setVexFlowTextFontFamily(vfTie.font, this.rules); // e.g. "H" for a hammer-on

        } else { // not Tab (guitar), normal StaveTie
          vfTie = this.createStaveTie({
            first_indices: [startNoteIndexInTie],
            first_note: vfStartNote,
            last_indices: [endNoteIndexInTie],
            last_note: vfEndNote
          }, tieDirection);
          if (!vfEndNote) {
            // a tie to the start of a repeat (no end note) ends before the backward repeat's dots, not on its thick line
            vfTie.render_options.last_x_shift = -14;
          }
        }

        // (a tie without an end note, see MusicSheetCalculator.tieContinuesAfterRepeat(), goes to the end of its note's staff)
        const measure: VexFlowMeasure = ((endNote ?? startNote).parentVoiceEntry.parentStaffEntry.parentMeasure as VexFlowMeasure);
        measure.addStaveTie(vfTie, tie);
      }
    }
  }

  /**
   * Creates a Vexflow tie in a standard staff, curved in the given direction.
   * @param notes The notes of the tie (or of the part of a tie across a system break), see VF.StaveTie.
   * @param direction The direction, e.g. from the XML. Without one, Vexflow takes it from the stem direction of the notes.
   * @returns The Vexflow tie.
   */
  private createStaveTie(notes: any, direction: PlacementEnum): VF.StaveTie {
    const vfTie: VF.StaveTie = new VF.StaveTie(notes);
    if (direction === PlacementEnum.Below) {
      (vfTie as any).setDirection(1); // + is down in vexflow
    } else if (direction === PlacementEnum.Above) {
      (vfTie as any).setDirection(-1);
    }
    return vfTie;
  }

  protected calculateDynamicExpressionsForMultiExpression(multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void {
    if (measureIndex < this.rules.MinMeasureToDrawIndex || measureIndex > this.rules.MaxMeasureToDrawIndex) {
      return;
      // we do already use the min/max in MusicSheetCalculator.calculateDynamicsExpressions,
      // but this may be necessary for StaffLinkedExpressions, not tested.
    }
    // calculate absolute Timestamp
    const absoluteTimestamp: Fraction = multiExpression.AbsoluteTimestamp;
    const measures: GraphicalMeasure[] = this.graphicalMusicSheet.MeasureList[measureIndex];
    const staffLine: StaffLine = measures[staffIndex].ParentStaffLine;
    const startMeasure: GraphicalMeasure = measures[staffIndex];

    // start position in staffline:
    // const useStaffEntryBorderLeft: boolean = multiExpression.StartingContinuousDynamic?.DynamicType === ContDynamicEnum.diminuendo;
    const continuousDynamic: ContinuousDynamicExpression = multiExpression.StartingContinuousDynamic;
    const useStaffEntryBorderLeft: boolean = continuousDynamic !== undefined && !continuousDynamic.IsStartOfSoftAccent;
    const dynamicStartPosition: PointF2D = this.getRelativePositionInStaffLineFromTimestamp(
      absoluteTimestamp,
      staffIndex,
      staffLine,
      staffLine?.isPartOfMultiStaffInstrument(),
      undefined,
      useStaffEntryBorderLeft
      );
    if (dynamicStartPosition.x <= 0) {
      dynamicStartPosition.x = startMeasure.beginInstructionsWidth + this.rules.RhythmRightMargin;
    }

    if (multiExpression.InstantaneousDynamic) {
      const graphicalInstantaneousDynamic: VexFlowInstantaneousDynamicExpression = new VexFlowInstantaneousDynamicExpression(
        multiExpression.InstantaneousDynamic,
        staffLine,
        startMeasure);
      graphicalInstantaneousDynamic.InsideWedge = this.dynamicsWithinWedges.has(multiExpression);
      // compare with multiExpression.InstantaneousDynamic.InMeasureTimestamp or add a relative timestamp? if we ever need a separate timestamp
      this.calculateGraphicalInstantaneousDynamicExpression(graphicalInstantaneousDynamic, dynamicStartPosition, absoluteTimestamp);
      this.dynamicExpressionMap.set(absoluteTimestamp.RealValue, graphicalInstantaneousDynamic.PositionAndShape);
    }
    if (continuousDynamic) {
      const graphicalContinuousDynamic: VexFlowContinuousDynamicExpression = new VexFlowContinuousDynamicExpression(
        continuousDynamic,
        staffLine,
        startMeasure.parentSourceMeasure);
      graphicalContinuousDynamic.StartMeasure = startMeasure;
      graphicalContinuousDynamic.IsSoftAccent = multiExpression.StartingContinuousDynamic.IsStartOfSoftAccent;
      //graphicalContinuousDynamic.StartIsEnd = multiExpression.StartingContinuousDynamic.EndMultiExpression === multiExpression;

      if (!graphicalContinuousDynamic.IsVerbal && continuousDynamic.EndMultiExpression) {
        try {
        this.calculateGraphicalContinuousDynamic(graphicalContinuousDynamic, dynamicStartPosition);
        graphicalContinuousDynamic.updateSkyBottomLine();
        } catch (e) {
          // TODO this sometimes fails when the measure range to draw doesn't include all the dynamic's measures, method needs to be adjusted
          //   see calculateGraphicalContinuousDynamic(), also in MusicSheetCalculator.

        }
      } else if (graphicalContinuousDynamic.IsVerbal) {
        this.calculateGraphicalVerbalContinuousDynamic(graphicalContinuousDynamic, dynamicStartPosition);
      } else {
        log.warn("This continuous dynamic is not covered. measure" + multiExpression.SourceMeasureParent.MeasureNumber);
      }
    }
  }

  protected createMetronomeMark(metronomeExpression: InstantaneousTempoExpression): void {
    // Draw the mark on the first visible staff of its measure, where all tempo markings go
    //   (MusicSheetCalculator.calculateTempoExpressionsForMultiTempoExpression). The expression's StaffNumber is the
    //   staff within its part, not an index into the measure list: used as one, it put every part's mark on the
    //   first staff of the score, and lost the mark when that staff was hidden.
    const sourceMeasures: SourceMeasure[] = this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures;
    const absoluteTimestamp: Fraction = metronomeExpression.ParentMultiTempoExpression.AbsoluteTimestamp;
    let measureIndex: number = metronomeExpression.ParentMultiTempoExpression.SourceMeasureParent.measureListIndex;
    while (measureIndex + 1 < sourceMeasures.length && absoluteTimestamp.gte(sourceMeasures[measureIndex + 1].AbsoluteTimestamp)) {
      measureIndex++;
    }
    while (measureIndex > 0 && absoluteTimestamp.lt(sourceMeasures[measureIndex].AbsoluteTimestamp)) {
      measureIndex--;
    }
    if (measureIndex < this.rules.MinMeasureToDrawIndex || measureIndex > this.rules.MaxMeasureToDrawIndex) {
      return;
    }
    const vfMeasure: VexFlowMeasure = this.graphicalMusicSheet.MeasureList[measureIndex]?.find(
      (measure: GraphicalMeasure) => measure?.ParentStaffLine && measure.ParentStaff.isVisible()) as VexFlowMeasure;
    if (!vfMeasure) {
      return;
    }
    const firstMetronomeMark: boolean = measureIndex === 0;
    // A measure can have marks at different times. The same mark at the same time, typically repeated in another
    //   part, is drawn once, following the tempo-text deduplication rule above.
    const timestamp: Fraction = Fraction.minus(absoluteTimestamp, sourceMeasures[measureIndex].AbsoluteTimestamp);
    if (this.metronomePlacements.some((placement: IMetronomePlacement): boolean => placement.measure === vfMeasure &&
      placement.expression.ParentMultiTempoExpression.AbsoluteTimestamp.Equals(absoluteTimestamp) &&
      this.isSameMetronomeMark(placement.expression, metronomeExpression))) {
      return;
    }
    const vfStave: VF.Stave = vfMeasure.getVFStave();

    let yShift: number = this.rules.MetronomeMarkYShift;
    let hasExpressionsAboveStaffline: boolean = false;
    for (const expression of metronomeExpression.parentMeasure.TempoExpressions) {
      const isMetronomeExpression: boolean = expression.InstantaneousTempo?.TempoType === TempoType.metronomeMark;
      // Only tempo text at the time of the mark lies under it, so text elsewhere in the measure does not raise it.
      if (expression.getPlacementOfFirstEntry() === PlacementEnum.Above &&
          !isMetronomeExpression && expression.AbsoluteTimestamp.Equals(absoluteTimestamp)) {
        hasExpressionsAboveStaffline = true;
        break;
      }
    }
    if (hasExpressionsAboveStaffline) {
      yShift -= 1.4;
    }
    const skyline: number[] = vfMeasure.ParentStaffLine.SkyLine;

    if (metronomeExpression.metronomeNoteGroupLeft && metronomeExpression.metronomeNoteGroupRight) {
      // Complex metronome mark (note equation, e.g. swing notation)
      const noteEquation: any = this.buildNoteEquationForVexFlow(
        metronomeExpression.metronomeNoteGroupLeft,
        metronomeExpression.metronomeNoteGroupRight
      );
      (vfStave as any).setTempo({ noteEquation }, yShift * unitInPixels);
    } else {
      // Simple metronome mark: note = BPM, followed by further marks at the same time on the same line
      const tempo: any = VexFlowMusicSheetCalculator.staveTempoOfMetronomeMark(metronomeExpression);
      tempo.following = metronomeExpression.followingMetronomeMarks.map(
        following => VexFlowMusicSheetCalculator.staveTempoOfMetronomeMark(following));
      vfStave.setTempo(tempo, yShift * unitInPixels);
    }

    const index: number = vfStave.getModifiers().length - 1;
    const mark: VF.StaveTempo = vfStave.getModifiers()[index] as VF.StaveTempo;
    VexFlowConverter.setVexFlowTextFontFamily((mark as any).font, this.rules);
    let xShift: number = firstMetronomeMark ? this.rules.MetronomeMarkXShift * unitInPixels : 0;
    if (timestamp.RealValue > 0) {
      // Within the measure, place the mark at its time, like other expressions.
      const staffLine: StaffLine = vfMeasure.ParentStaffLine;
      const position: PointF2D = this.getRelativePositionInStaffLineFromTimestamp(
        metronomeExpression.ParentMultiTempoExpression.AbsoluteTimestamp,
        this.graphicalMusicSheet.MeasureList[measureIndex].indexOf(vfMeasure),
        staffLine,
        staffLine.isPartOfMultiStaffInstrument()
      );
      // StaveTempo.draw adds the beginning modifiers' width to every tempo mark.
      xShift = (position.x - vfMeasure.PositionAndShape.RelativePosition.x) * unitInPixels - vfStave.getModifierXShift(index);
    }
    mark.setShiftX(xShift);
    // Measure first, so that the existing reservation below is not treated as notation under this mark.
    this.prepareMetronomePlacement(vfMeasure, metronomeExpression, mark, index, xShift, yShift);
    vfMeasure.hasMetronomeMark = true;
    if (skyline && timestamp.RealValue <= 0) {
      // Retain the established space above a mark at the beginning of a measure.
      skyline[0] = Math.min(skyline[0], -4.5 + yShift);
    }
  }

  /** Measures the drawn mark and its clearance from the notation, before tempo text takes its space. */
  private prepareMetronomePlacement(measure: VexFlowMeasure, expression: InstantaneousTempoExpression, mark: VF.StaveTempo,
                                    index: number, xShift: number, yShift: number): void {
    const stave: VF.Stave = measure.getVFStave();
    const staffLine: StaffLine = measure.ParentStaffLine;
    const staffLineWidth: number = staffLine.PositionAndShape.Size.width;
    // Draw into a geometric context one staffline wider on each side, so that no part of the mark is clipped.
    const margin: number = staffLineWidth * unitInPixels;
    const context: GeometricSkyBottomLineContext =
      new GeometricSkyBottomLineContext(3 * margin, 300, this.rules.GeometricSkyBottomLineCaches);
    context.translate(margin + measure.PositionAndShape.RelativePosition.x * unitInPixels - stave.getX(), -stave.getYForLine(0));
    const previousContext: Vex.IRenderContext = stave.getContext();
    try {
      stave.setContext(context as any);
      mark.draw(stave, stave.getModifierXShift(index));
    } finally {
      stave.setContext(previousContext);
    }
    const columnTops: number[] = [];
    const columnBottoms: number[] = [];
    context.copyExtentsInto(columnTops, columnBottoms);
    const bounds: IMetronomeBounds = {left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity};
    columnTops.forEach((top: number, column: number): void => {
      bounds.left = Math.min(bounds.left, column - margin);
      bounds.right = Math.max(bounds.right, column + 1 - margin);
      bounds.top = Math.min(bounds.top, top);
      bounds.bottom = Math.max(bounds.bottom, columnBottoms[column]);
    });
    if (bounds.left > bounds.right) {
      return;
    }
    const atMeasureStart: boolean = expression.ParentMultiTempoExpression.AbsoluteTimestamp.lte(measure.parentSourceMeasure.AbsoluteTimestamp);
    if (!atMeasureStart) {
      // Keep a mark placed within the measure inside its staffline, like calculateLabel() does for text.
      let horizontalOffset: number = 0;
      if (bounds.right / unitInPixels > staffLineWidth) {
        horizontalOffset = staffLineWidth - this.rules.MeasureRightMargin - bounds.right / unitInPixels;
      }
      const left: number = bounds.left / unitInPixels + horizontalOffset;
      if (left < staffLine.PositionAndShape.BorderMarginLeft) {
        horizontalOffset += staffLine.PositionAndShape.BorderMarginLeft - left + this.rules.LabelXOffsetForStafflineLeftOverflowCheck;
      }
      mark.setShiftX(xShift + horizontalOffset * unitInPixels);
      bounds.left += horizontalOffset * unitInPixels;
      bounds.right += horizontalOffset * unitInPixels;
    }
    // Keep the existing position unless the drawing intersects the notation; then keep TempoYSpacing from it.
    const clearance: number = staffLine.SkyBottomLineCalculator.getSkyLineMinInRange(
      bounds.left / unitInPixels, bounds.right / unitInPixels) - bounds.bottom / unitInPixels;
    const offset: number = clearance < 0 ? clearance - this.rules.TempoYSpacing : 0;
    bounds.top += offset * unitInPixels;
    bounds.bottom += offset * unitInPixels;
    this.metronomePlacements.push({measure, expression, mark, bounds, yShift: (yShift + offset) * unitInPixels,
      existingPosition: atMeasureStart && offset === 0});
  }

  protected layoutMetronomeMarks(): void {
    const occupiedByStaffLine: Map<StaffLine, IMetronomeBounds[]> = new Map<StaffLine, IMetronomeBounds[]>();
    const padding: number = this.rules.TempoYSpacing * unitInPixels;
    for (const placement of this.metronomePlacements) {
      const staffLine: StaffLine = placement.measure.ParentStaffLine;
      let occupied: IMetronomeBounds[] = occupiedByStaffLine.get(staffLine);
      if (!occupied) {
        occupied = [];
        for (const expression of staffLine.AbstractExpressions) {
          if (!(expression instanceof GraphicalInstantaneousTempoExpression) || !expression.GraphicalLabel.Label.text) {
            continue;
          }
          // The label's border without its margin, so that a mark fitting beside the text is not stacked.
          const box: BoundingBox = expression.GraphicalLabel.PositionAndShape;
          occupied.push({
            left: (box.RelativePosition.x + box.BorderLeft) * unitInPixels,
            right: (box.RelativePosition.x + box.BorderRight) * unitInPixels,
            top: (box.RelativePosition.y + box.BorderTop) * unitInPixels,
            bottom: (box.RelativePosition.y + box.BorderBottom) * unitInPixels
          });
        }
        occupied.sort((a: IMetronomeBounds, b: IMetronomeBounds): number => b.bottom - a.bottom);
        occupiedByStaffLine.set(staffLine, occupied);
      }
      const bounds: IMetronomeBounds = placement.bounds;
      let offset: number = 0;
      // Moving only upwards allows one bottom-to-top pass, including earlier marks.
      // A mark that is not completely above a tempo text or an earlier mark beside it moves above it, also when
      //   it was below it: marks go above the tempo words. The padding applies to the resolved position.
      for (const obstacle of occupied) {
        if (bounds.left < obstacle.right && bounds.right > obstacle.left &&
            bounds.bottom + offset > obstacle.top) {
          offset = obstacle.top - padding - bounds.bottom;
        }
      }
      placement.mark.setShiftY(placement.yShift + offset);
      bounds.top += offset;
      bounds.bottom += offset;
      // Keep bottom-to-top order without sorting the whole list again; retain order for equal bottoms.
      let insertionIndex: number = 0;
      while (insertionIndex < occupied.length && occupied[insertionIndex].bottom >= bounds.bottom) {
        insertionIndex++;
      }
      occupied.splice(insertionIndex, 0, bounds);
      // A mark left at its existing position keeps the existing reservation; others reserve their drawing and
      //   TempoYSpacing above it, so that what is placed above later (e.g. the lyricist) keeps that distance.
      if (!placement.existingPosition || offset !== 0) {
        staffLine.SkyBottomLineCalculator.updateSkyLineInRange(
          bounds.left / unitInPixels, bounds.right / unitInPixels, bounds.top / unitInPixels - this.rules.TempoYSpacing);
      }
    }
  }

  /** The note, dots and number (or the <per-minute> text, e.g. "c. 108") of a simple metronome mark for VexFlow's StaveTempo. */
  private static staveTempoOfMetronomeMark(metronomeExpression: InstantaneousTempoExpression): any {
    let vexflowDuration: string = "q";
    if (metronomeExpression.beatUnit) {
      const duration: Fraction = NoteTypeHandler.getNoteDurationFromType(metronomeExpression.beatUnit);
      vexflowDuration = VexFlowConverter.durations(duration, false)[0];
    }
    return {
      bpm: metronomeExpression.perMinuteText ?? metronomeExpression.TempoInBpm,
      dots: metronomeExpression.dotted,
      duration: vexflowDuration
    };
  }


  /** Convert MetronomeNoteGroup data into the format expected by VexFlow's StaveTempo.drawNoteEquation(). */
  private buildNoteEquationForVexFlow(left: MetronomeNoteGroup, right: MetronomeNoteGroup): any {
    const convertGroup: (group: MetronomeNoteGroup) => any = (group) => {
      const notes: any[] = group.notes.map(note => {
        const duration: Fraction = NoteTypeHandler.getNoteDurationFromType(note.type);
        const vfDuration: string = VexFlowConverter.durations(duration, false)[0];
        return {
          duration: vfDuration,
          dots: note.dots,
          beam: note.beam,
          tied: note.tied,
        };
      });
      const result: any = { notes };
      if (group.tuplet) {
        result.tuplet = {
          actualNotes: group.tuplet.actualNotes,
          normalNotes: group.tuplet.normalNotes,
          bracket: group.tuplet.bracket,
          showNumber: group.tuplet.showNumber,
        };
      }
      return result;
    };
    return {
      left: convertGroup(left),
      right: convertGroup(right),
    };
  }

  protected calculateRehearsalMark(measure: SourceMeasure): void {
    const rehearsalExpression: RehearsalExpression = measure.rehearsalExpression;
    if (!rehearsalExpression) {
      return;
    }
    const firstMeasureNumber: number = this.graphicalMusicSheet.MeasureList[0][0].MeasureNumber; // 0 for pickup, 1 otherwise
    const measureNumber: number = Math.max(measure.MeasureNumber - firstMeasureNumber, 0);
    // const staffNumber: number = 0;
    for (const gMeasure of this.graphicalMusicSheet.MeasureList[measureNumber]) {
      const vfStave: VF.Stave = (gMeasure as VexFlowMeasure)?.getVFStave();
      if (!vfStave || !gMeasure.isVisible()) { // potentially multi measure rest
        continue;
      }
      let yOffset: number = -this.rules.RehearsalMarkYOffsetDefault - this.rules.RehearsalMarkYOffset;
      if (gMeasure.parentSourceMeasure.isReducedToMultiRest) {
        // we could add other conditions here where we want more offset to avoid collisions
        yOffset += this.rules.RehearsalMarkYOffsetAddedForRehearsalMarks;
      }
      let xOffset: number = this.rules.RehearsalMarkXOffsetDefault + this.rules.RehearsalMarkXOffset;
      if (measure.IsSystemStartMeasure) {
        xOffset += this.rules.RehearsalMarkXOffsetSystemStartMeasure;
      }
      // const section: VF.StaveSection = new VF.StaveSection(rehearsalExpression.label, vfStave.getX(), yOffset);
      // (vfStave as any).modifiers.push(section);
      const fontSize: number = this.rules.RehearsalMarkFontSize;

      // Lift the rehearsal mark above whatever rises above the staff under it (high notes, an Above chord
      //   symbol, ...) so it doesn't overlap them, and reserve skyline space for the lifted mark (otherwise
      //   it can collide with the system above). The mark is a fixed-offset VexFlow StaveSection that isn't
      //   part of the skyline, so without this it can sit right on top of tall notes -- which happens in
      //   normal rendering (e.g. high drum-stave notes) and in lazy/incremental rendering (the mark's measure can be
      //   drawn at a slightly different x, over taller notes, than a normal render). Only the Above chord
      //   symbol was previously considered here; now the notes under the mark are too.
      let minBottomY: number; // undefined -> no clamping in StaveSection.draw (VexFlowPatch)
      const staffLine: StaffLine = gMeasure.ParentStaffLine;
      if (staffLine) {
        // x-footprint of the rehearsal mark box (absolute units, as the skyline is indexed): VexFlow draws it after the
        //   clef, key and time signature (Stave.getModifierXShift()), xOffset further, at least 18 px wide (StaveSection.draw()).
        //   xOffset/fontSize are in px; the label width is a conservative estimate.
        let start: number = gMeasure.PositionAndShape.AbsolutePosition.x + (vfStave.getModifierXShift(0) + xOffset) / unitInPixels;
        let end: number = start + Math.max(18, rehearsalExpression.label.length * fontSize * 0.6 + fontSize) / unitInPixels;
        // also clear an Above chord symbol in the measure: it is placed (calculateChordSymbols, earlier)
        //   against the skyline and can sit right where the mark goes, possibly beyond the mark's footprint.
        const chord: GraphicalChordSymbolContainer = this.rules.RehearsalMarkAboveChordSymbol
          ? this.getFirstChordSymbolAbove(gMeasure) : undefined;
        if (chord) {
          const containerPsh: BoundingBox = chord.PositionAndShape;
          const xInUnits: number = containerPsh.Parent.AbsolutePosition.x + containerPsh.RelativePosition.x;
          start = Math.min(start, containerPsh.BorderMarginLeft + xInUnits);
          end = Math.max(end, containerPsh.BorderMarginRight + xInUnits);
        }
        // highest element above the staff line under the mark (negative = above it), read from the skyline
        //   (final by now: updated by calculateSkyBottomLines + calculateChordSymbols, both earlier).
        const topRelative: number = staffLine.SkyBottomLineCalculator.getSkyLineMinInRange(start, end);
        if (topRelative < 0) { // only lift if something actually rises above the staff here
          const marginInUnits: number = 0.5; // small gap between mark bottom and what's below it
          // StaveSection.draw (VexFlowPatch) shifts the mark up so its box bottom doesn't exceed
          //   stave.getYForLine(0) + minBottomY (px), keeping the mark above that element:
          minBottomY = (topRelative - marginInUnits) * unitInPixels;
          // reserve skyline over the range so updateStaffLineBorders/calculateSystemYLayout make room for the lifted mark
          const markHeightInUnits: number = fontSize / unitInPixels * 1.6 + marginInUnits; // conservative StaveSection box height
          staffLine.SkyBottomLineCalculator.updateSkyLineInRange(start, end, topRelative - markHeightInUnits);
        }
      }

      // fontSize and minBottomY are extra arguments from VexFlowPatch (stave.js / stavesection.js)
      (vfStave as any).setSection(rehearsalExpression.label, yOffset, xOffset, fontSize, minBottomY);
      const section: VF.StaveModifier = vfStave.getModifiers().last();
      VexFlowConverter.setVexFlowTextFontFamily((section as any).font, this.rules);
      return; // only draw one rehearsal mark at top (visible) instrument
    }
  }

  /** Returns the leftmost (smallest x) Above-placed chord symbol container in the measure, or undefined if there is none.
   *  The rehearsal mark sits at the measure start, so this is the chord it can collide with (see calculateRehearsalMark). */
  private getFirstChordSymbolAbove(gMeasure: GraphicalMeasure): GraphicalChordSymbolContainer {
    let first: GraphicalChordSymbolContainer = undefined;
    let firstX: number = Number.MAX_VALUE;
    for (const staffEntry of gMeasure.staffEntries) {
      for (const chordContainer of staffEntry.graphicalChordContainers ?? []) {
        if (chordContainer.GetChordSymbolContainer.Placement !== PlacementEnum.Above) {
          continue;
        }
        const x: number = chordContainer.PositionAndShape.AbsolutePosition.x; // x layout is final here, unlike y
        if (x < firstX) {
          firstX = x;
          first = chordContainer;
        }
      }
    }
    return first;
  }

  /**
   * Calculate a single OctaveShift for a [[MultiExpression]].
   * @param sourceMeasure
   * @param multiExpression
   * @param measureIndex
   * @param staffIndex
   */
  protected calculateSingleOctaveShift(sourceMeasure: SourceMeasure, multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void {
    // calculate absolute Timestamp and startStaffLine (and EndStaffLine if needed)
    const octaveShift: OctaveShift = multiExpression.OctaveShiftStart;

    const startTimeStamp: Fraction = octaveShift.ParentStartMultiExpression.Timestamp;
    const endTimeStamp: Fraction = octaveShift.ParentEndMultiExpression?.Timestamp;

    const minMeasureToDrawIndex: number = this.rules.MinMeasureToDrawIndex;
    const maxMeasureToDrawIndex: number = this.rules.MaxMeasureToDrawIndex;

    let startStaffLine: StaffLine = this.graphicalMusicSheet.MeasureList[measureIndex][staffIndex].ParentStaffLine;
    if (!startStaffLine) { // fix for rendering range set. all of these can probably be done cleaner.
      startStaffLine = this.graphicalMusicSheet.MeasureList[minMeasureToDrawIndex][staffIndex].ParentStaffLine;
    }

    let endMeasure: GraphicalMeasure = undefined;
    if (octaveShift.ParentEndMultiExpression) {
      endMeasure = this.graphicalMusicSheet.getGraphicalMeasureFromSourceMeasureAndIndex(octaveShift.ParentEndMultiExpression.SourceMeasureParent,
                                                                                         staffIndex);
    } else {
      endMeasure = this.graphicalMusicSheet.getLastGraphicalMeasureFromIndex(staffIndex, true); // get last rendered measure
    }
    const endIsClipped: boolean = endMeasure.MeasureNumber > maxMeasureToDrawIndex + 1;
    if (endIsClipped) { // octaveshift ends in measure not rendered
      endMeasure = this.graphicalMusicSheet.getLastGraphicalMeasureFromIndex(staffIndex, true);
    }
    let startMeasure: GraphicalMeasure = undefined;
    if (octaveShift.ParentStartMultiExpression) {
      startMeasure = this.graphicalMusicSheet.getGraphicalMeasureFromSourceMeasureAndIndex(octaveShift.ParentStartMultiExpression.SourceMeasureParent,
                                                                                           staffIndex);
    } else {
      startMeasure = this.graphicalMusicSheet.MeasureList[minMeasureToDrawIndex][staffIndex]; // first rendered measure
    }
    const startIsClipped: boolean = startMeasure.MeasureNumber < minMeasureToDrawIndex + 1;
    if (startIsClipped) { // octaveshift starts before range of measures selected to render
      startMeasure = this.graphicalMusicSheet.MeasureList[minMeasureToDrawIndex][staffIndex]; // first rendered measure
      startStaffLine = startMeasure.ParentStaffLine;
    }

    if (startMeasure.parentSourceMeasure.measureListIndex < minMeasureToDrawIndex ||
        startMeasure.parentSourceMeasure.measureListIndex > maxMeasureToDrawIndex ||
        endMeasure.parentSourceMeasure.measureListIndex < minMeasureToDrawIndex ||
        endMeasure.parentSourceMeasure.measureListIndex > maxMeasureToDrawIndex) {
      // completely out of drawing range, don't draw anything
      return;
    }

    let endStaffLine: StaffLine = endMeasure.ParentStaffLine;
    if (!endStaffLine) {
      endStaffLine = startStaffLine;
    }

    if (endMeasure && startStaffLine && endStaffLine) {
      // calculate GraphicalOctaveShift and RelativePositions
      const startNoteMeasures: GraphicalMeasure[] = startIsClipped ? startStaffLine.Measures : [startMeasure];
      const endNoteMeasures: GraphicalMeasure[] = endIsClipped ? endStaffLine.Measures : [endMeasure];
      const graphicalOctaveShift: VexFlowOctaveShift = new VexFlowOctaveShift(octaveShift, startStaffLine.PositionAndShape);
      if (!graphicalOctaveShift.startNote) { // fix for rendering range set
        const startGse: GraphicalStaffEntry = this.findBoundaryNoteEntry(startNoteMeasures);
        if (!startGse) {
          return; // couldn't find a start staffentry, don't draw the octave shift
        }
        graphicalOctaveShift.setStartNote(startGse);
        if (!graphicalOctaveShift.startNote) {
          return; // couldn't find a start note, don't draw the octave shift
        }
      }
      if (!graphicalOctaveShift.endNote) { // fix for rendering range set
        const endGse: GraphicalStaffEntry = this.findBoundaryNoteEntry(endNoteMeasures, true);
        if (!endGse) {
          // shouldn't happen, but apparently some MusicXMLs (GuitarPro/Sibelius) have measures without StaffEntries.
          graphicalOctaveShift.graphicalEndAtMeasureEnd = true;
          return;
        }
        graphicalOctaveShift.setEndNote(endGse);
        if (!graphicalOctaveShift.endNote) {
          return;
        }
      }
      // calculate RelativePosition and Dashes
      let startStaffEntry: GraphicalStaffEntry = startMeasure.findGraphicalStaffEntryFromTimestamp(startTimeStamp);
      // The depress between two staff entries (a start at a time only the other staff plays): anchor it at the entry
      //   before it and interpolate its x by time, instead of jumping to the measure's first entry.
      let depressAnchor: PedalReleaseAnchor = undefined;
      if (!startStaffEntry && !startIsClipped && startTimeStamp.RealValue > 0 &&
          startTimeStamp.lt(startMeasure.parentSourceMeasure.Duration)) {
        depressAnchor = this.findPedalReleaseAnchor(startMeasure, startTimeStamp);
        if (depressAnchor) {
          startStaffEntry = depressAnchor.entry;
        }
      }
      if (!this.hasVexFlowNote(startStaffEntry)) { // fix for rendering range set
        startStaffEntry = this.findBoundaryNoteEntry(startNoteMeasures);
        depressAnchor = undefined;
      }
      let endStaffEntry: GraphicalStaffEntry = endMeasure.findGraphicalStaffEntryFromTimestamp(endTimeStamp);
      if (!this.hasVexFlowNote(endStaffEntry) && endTimeStamp) {
        // endTimeStamp can be undefined for an unterminated octave-shift (start without stop,
        //   e.g. from OMR-generated MusicXML), see #1439 / #1376 for similar cases.
        // No exact match (e.g. pending stop with computed inclusive end).
        // Find the latest staff entry at or before the end timestamp.
        for (let i: number = endMeasure.staffEntries.length - 1; i >= 0; i--) {
          const entry: GraphicalStaffEntry = endMeasure.staffEntries[i];
          if (this.hasVexFlowNote(entry) && entry.relInMeasureTimestamp?.lte(endTimeStamp)) {
            endStaffEntry = entry;
            break;
          }
        }
      }
      if (!this.hasVexFlowNote(endStaffEntry)) { // fix for rendering range set
        endStaffEntry = this.findBoundaryNoteEntry(endNoteMeasures, true);
      }
      if (startStaffEntry) {
        graphicalOctaveShift.setStartNote(startStaffEntry);
      }

      if (endStaffLine !== startStaffLine) {
        graphicalOctaveShift.endsOnDifferentStaffLine = true;
        let lastMeasureOfFirstShift: GraphicalMeasure = this.findLastStafflineMeasure(startStaffLine);
        if (lastMeasureOfFirstShift === undefined) { // TODO handle this case correctly (e.g. when no staffentries found above or drawUpToMeasureNumber set)
          lastMeasureOfFirstShift = endMeasure;
        }
        const lastNoteOfFirstShift: GraphicalStaffEntry = this.findBoundaryNoteEntry([lastMeasureOfFirstShift], true);
        graphicalOctaveShift.setEndNote(lastNoteOfFirstShift);
        graphicalOctaveShift.graphicalEndAtMeasureEnd = true;
        graphicalOctaveShift.endMeasure = lastMeasureOfFirstShift;

        const systemsInBetweenCount: number = endStaffLine.ParentMusicSystem.Id - startStaffLine.ParentMusicSystem.Id;
        if (systemsInBetweenCount > 0) {
          //Loop through the stafflines in between to the end
          for (let i: number = startStaffLine.ParentMusicSystem.Id; i < endStaffLine.ParentMusicSystem.Id; i++) {
            const idx: number = i + 1;
            const nextShiftMusicSystem: MusicSystem = this.musicSystems[idx];
            let nextShiftStaffline: StaffLine; // not always = nextShiftMusicSystem.StaffLines[staffIndex], e.g. when first instrument invisible
            for (const staffline of nextShiftMusicSystem.StaffLines) {
              if (staffline.ParentStaff.idInMusicSheet === staffIndex) {
                nextShiftStaffline = staffline;
                break;
              }
            }
            if (!nextShiftStaffline) { // shouldn't happen
              continue;
            }
            const nextShiftFirstMeasure: GraphicalMeasure = nextShiftStaffline.Measures[0];
            // Shift starts on the first measure
            const nextOctaveShift: VexFlowOctaveShift = new VexFlowOctaveShift(octaveShift, nextShiftFirstMeasure.PositionAndShape);
            let nextShiftLastMeasure: GraphicalMeasure = this.findLastStafflineMeasure(nextShiftStaffline);
            if (!nextShiftLastMeasure) {
              // nothing on this staff in this system (e.g. a measure of only grace notes on another staff, split off to
              //   break the system): no note to draw the octave shift from, it goes on in the next system.
              continue;
            }

            if (i < endStaffLine.ParentMusicSystem.Id - 1) {
              // "in-between" staffline before the staffline where the octave shift ends: make octave shift go to end of staffline
              nextOctaveShift.endsOnDifferentStaffLine = true;
              nextOctaveShift.graphicalEndAtMeasureEnd = true;
              nextOctaveShift.endMeasure = nextShiftLastMeasure;
              // this is tested by the sample test_octaveshift_multiline_grace_notes.musicxml (see PR #1646)
            }
            // (the first measure of the system can have nothing on this staff, like the system above)
            const firstNote: GraphicalStaffEntry = this.findBoundaryNoteEntry(nextShiftStaffline.Measures);
            let lastNote: GraphicalStaffEntry = this.findBoundaryNoteEntry([nextShiftLastMeasure], true);

            //If the end measure's staffline is the ending staffline, this endMeasure is the end of the shift
            if (endMeasure.ParentStaffLine === nextShiftStaffline) {
              nextShiftLastMeasure = endMeasure;
              lastNote = endStaffEntry;
            }

            const logPrefix: string = "VexFlowMusicSheetCalculator.calculateSingleOctaveShift: ";
            if (!firstNote || !lastNote) {
              log.warn(logPrefix + (!firstNote ? "no firstNote found" : "no lastNote found"));
              continue;
            }

            if (lastNote.graphicalVoiceEntries.length === 1 &&
              lastNote.graphicalVoiceEntries[0].notes.length === 1 &&
              lastNote.graphicalVoiceEntries[0].notes[0].sourceNote.isWholeMeasureNote()
            ) {
              // also draw octaveshift until end of measure if we have a whole note that goes over the whole measure
              nextOctaveShift.graphicalEndAtMeasureEnd = true;
              nextOctaveShift.endMeasure = nextShiftLastMeasure;
            }

            if (!nextOctaveShift.setStartNote(firstNote)) {
              log.warn(logPrefix + "no start note found");
              continue;
            }
            const endIdx: number = endMeasure.ParentStaffLine === nextShiftStaffline && octaveShift.endVoiceEntryIndex > 0
              ? octaveShift.endVoiceEntryIndex : -1;
            if (!nextOctaveShift.setEndNote(lastNote, endIdx)) {
              log.warn(logPrefix + "no end note found");
              continue;
            }
            nextShiftStaffline.OctaveShifts.push(nextOctaveShift);
            this.calculateOctaveShiftSkyBottomLine(firstNote, lastNote, nextOctaveShift, nextShiftStaffline);
          }
        }

        this.calculateOctaveShiftSkyBottomLine(startStaffEntry, lastNoteOfFirstShift, graphicalOctaveShift, startStaffLine);
      } else {
        graphicalOctaveShift.setEndNote(endStaffEntry, octaveShift.endVoiceEntryIndex > 0 ? octaveShift.endVoiceEntryIndex : -1);
        this.calculateOctaveShiftSkyBottomLine(startStaffEntry, endStaffEntry, graphicalOctaveShift, startStaffLine);
      }
      startStaffLine.OctaveShifts.push(graphicalOctaveShift);
    } else {
      log.warn("End measure or staffLines for octave shift are undefined! This should not happen!");
    }
  }

  private hasVexFlowNote(entry: GraphicalStaffEntry): boolean {
    return entry?.graphicalVoiceEntries.some(voiceEntry => !!(voiceEntry as VexFlowVoiceEntry).vfStaveNote) ?? false;
  }

  /** Instruction-only entries carry key/clef changes but cannot anchor a line or bracket. */
  private findBoundaryNoteEntry(measures: GraphicalMeasure[], fromEnd: boolean = false): GraphicalStaffEntry {
    const step: number = fromEnd ? -1 : 1;
    for (let m: number = fromEnd ? measures.length - 1 : 0; m >= 0 && m < measures.length; m += step) {
      const entries: GraphicalStaffEntry[] = measures[m].staffEntries;
      for (let e: number = fromEnd ? entries.length - 1 : 0; e >= 0 && e < entries.length; e += step) {
        if (this.hasVexFlowNote(entries[e])) {
          return entries[e];
        }
      }
    }
  }

  /** Finds the last staffline measure with a note that can anchor an expression. */
  protected findLastStafflineMeasure(staffline: StaffLine): GraphicalMeasure {
    return this.findBoundaryNoteEntry(staffline.Measures, true)?.parentMeasure;
  }

  /** The staff entries around a pedal stop that falls between the entries of endMeasure: the release is drawn at the
   *  time-proportional x between the entry before it and the entry after it (or the measure end). */
  private findPedalReleaseAnchor(endMeasure: GraphicalMeasure, stop: Fraction): PedalReleaseAnchor {
    let before: GraphicalStaffEntry = undefined;
    let after: GraphicalStaffEntry = undefined;
    for (const entry of endMeasure.staffEntries) {
      if (!this.hasVexFlowNote(entry) || !entry.relInMeasureTimestamp) {
        continue;
      }
      if (entry.relInMeasureTimestamp.lt(stop)) {
        before = entry;
      } else if (entry.relInMeasureTimestamp.gt(stop) && !after) {
        after = entry;
      }
    }
    if (!before) {
      // released before the first note of the measure: in front of it
      return after ? { entry: after, after: undefined, fraction: 0 } : undefined;
    }
    const spanEnd: Fraction = after ? after.relInMeasureTimestamp : endMeasure.parentSourceMeasure.Duration;
    const span: number = Fraction.minus(spanEnd, before.relInMeasureTimestamp).RealValue;
    const fraction: number = span <= 0 ? 0 : Fraction.minus(stop, before.relInMeasureTimestamp).RealValue / span;
    return { atTime: this.otherStaffEntryAtTime(endMeasure, stop), entry: before, after: after,
             fraction: Math.min(1, Math.max(0, fraction)) };
  }

  /** A staff entry with a note at exactly the time in another visible staff of the measure's column: a pedal mark at a
   *  time only the other hand plays is drawn at that note, where the engraver puts it, not interpolated by time between
   *  its own staff's notes, which the formatter does not space in proportion (Schumann, Myrthen 24 m15, R-24-1: the * of
   *  the stop at the right hand's sixteenth was drawn after it). Same as osmd-dart. */
  private otherStaffEntryAtTime(measure: GraphicalMeasure, time: Fraction): GraphicalStaffEntry {
    const column: GraphicalMeasure[] = this.graphicalMusicSheet.MeasureList[measure.parentSourceMeasure?.measureListIndex] ?? [];
    for (const other of column) {
      if (!other || other === measure || !other.isVisible()) {
        continue;
      }
      const entry: GraphicalStaffEntry = other.staffEntries.find(se => se.relInMeasureTimestamp?.Equals(time));
      if (entry && this.hasVexFlowNote(entry)) {
        return entry;
      }
    }
    return undefined;
  }

  /** VexFlow px from anchorNote (the entry before the time) to the time-proportional point between it and the next
   *  entry (or the measure end); undefined when the anchor is the entry after the time. */
  private interpolatedPedalAnchorOffset(anchorNote: Vex.Flow.StemmableNote, anchor: PedalReleaseAnchor,
                                        measure: GraphicalMeasure): number {
    if (!anchor || (!anchor.after && anchor.fraction === 0) || !anchorNote) {
      return undefined;
    }
    const x0: number = anchorNote.getAbsoluteX();
    const atTimeNote: Vex.Flow.StemmableNote = (anchor.atTime?.graphicalVoiceEntries
      .find(gve => (gve as VexFlowVoiceEntry).vfStaveNote) as VexFlowVoiceEntry)?.vfStaveNote;
    if (atTimeNote) {
      return atTimeNote.getAbsoluteX() - x0;
    }
    let x1: number;
    if (anchor.after) {
      const afterNote: Vex.Flow.StemmableNote = (anchor.after.graphicalVoiceEntries
        .find(gve => (gve as VexFlowVoiceEntry).vfStaveNote) as VexFlowVoiceEntry)?.vfStaveNote;
      if (!afterNote) {
        return undefined;
      }
      x1 = afterNote.getAbsoluteX();
    } else {
      x1 = (measure as VexFlowMeasure).getVFStave().getNoteEndX();
    }
    return (x1 - x0) * anchor.fraction;
  }

  /** VexFlow px from the end note to an interpolated release (undefined when the release is at a note), at least a
   *  depress mark's width right of the pedal's own Ped. in the same segment. */
  private interpolatedPedalReleaseXOffset(vfPedal: VexFlowPedal, anchor: PedalReleaseAnchor, endMeasure: GraphicalMeasure,
                                          sameSegmentAsStart: boolean, endEntry: GraphicalStaffEntry = undefined): number {
    if (endEntry && anchor && endEntry !== anchor.entry) {
      return undefined;
    }
    const offset: number = this.interpolatedPedalAnchorOffset(vfPedal.endNote, anchor, endMeasure);
    if (offset === undefined) {
      return undefined;
    }
    const x0: number = vfPedal.endNote.getAbsoluteX();
    let releaseX: number = x0 + offset;
    if (sameSegmentAsStart && vfPedal.startNote) {
      const pedalMarking: any = vfPedal.getPedalMarking();
      const margin: number = pedalMarking.render_options.text_margin_right;
      // the Ped. glyph is drawn 10px left of its x, the * 2px left of its x
      const minGap: number = vfPedal.pedalSymbol === MusicSymbol.PEDAL_SYMBOL ?
        VexFlowMusicSheetCalculator.pedalDepressGlyphWidth(pedalMarking) - 10 + margin + 2 : margin;
      releaseX = Math.max(releaseX, vfPedal.startNote.getAbsoluteX() + (vfPedal.DepressXOffset ?? 0) + minGap);
    }
    return releaseX - x0;
  }

  /** The Ped. of a symbol pedal stays a text margin right of the * of the previous pedal on the staff line (an x rule,
   *  not a skyline one): a release and the next depress close together in time would otherwise be drawn over each
   *  other. Without a drawn * (a hidden release: the next Ped. retakes it, Gluck, Tu lo sai m31), right of the previous
   *  Ped. in the same measure; after a * moved past the barline (ReleaseAfterDepress), right of its overhang. A change
   *  already keeps its own gap; a release at the stave end or a release in the previous measure needs none. */
  private keepPedalDepressRightOfPreviousRelease(vfPedal: VexFlowPedal, staffLine: StaffLine): void {
    if (vfPedal.pedalSymbol !== MusicSymbol.PEDAL_SYMBOL || vfPedal.ChangeBegin || !vfPedal.startNote) {
      return;
    }
    // only within one measure: a * before the barline and the Ped. of the next measure's first note stay where they
    //   are, as engraved
    const startMeasure: GraphicalMeasure = vfPedal.startVfVoiceEntry?.parentStaffEntry?.parentMeasure;
    let previousRight: number = undefined;
    let margin: number = 0;
    for (const other of staffLine.Pedals as VexFlowPedal[]) {
      if (other.pedalSymbol !== MusicSymbol.PEDAL_SYMBOL || other.getPedal.EndsStave || !other.endNote ||
          other.endVfVoiceEntry?.parentStaffEntry?.parentMeasure !== startMeasure) {
        continue;
      }
      const marking: any = other.getPedalMarking();
      if (!other.ReleaseText) {
        previousRight = other.endNote.getAbsoluteX() + (other.ReleaseXOffset ?? 0) +
          VexFlowMusicSheetCalculator.pedalReleaseGlyphWidth(marking);
      } else if (!other.DepressText && other.startNote &&
          other.startVfVoiceEntry?.parentStaffEntry?.parentMeasure === startMeasure) {
        previousRight = VexFlowMusicSheetCalculator.pedalDepressLeft(other) + VexFlowMusicSheetCalculator.pedalDepressGlyphWidth(marking);
      } else {
        continue;
      }
      margin = marking.render_options.text_margin_right;
    }
    // a * moved past the barline after the Ped. on the last notes of the previous measure: its overhang into this
    //   measure, from the stave ends (x across measures is not final yet)
    const measureIndex: number = staffLine.Measures.indexOf(startMeasure);
    const previousMeasure: GraphicalMeasure = measureIndex > 0 ? staffLine.Measures[measureIndex - 1] : undefined;
    if (previousRight === undefined && previousMeasure instanceof VexFlowMeasure && startMeasure instanceof VexFlowMeasure) {
      for (const other of staffLine.Pedals as VexFlowPedal[]) {
        if (!other.ReleaseAfterDepress || !other.endNote ||
            other.endVfVoiceEntry?.parentStaffEntry?.parentMeasure !== previousMeasure) {
          continue;
        }
        const marking: any = other.getPedalMarking();
        const previousStave: any = previousMeasure.getVFStave();
        const overhang: number = other.endNote.getAbsoluteX() + other.ReleaseXOffset - 2 +
          VexFlowMusicSheetCalculator.pedalReleaseGlyphWidth(marking) - (previousStave.getX() + previousStave.getWidth());
        if (overhang > 0) {
          previousRight = (startMeasure.getVFStave() as any).getX() + overhang;
          margin = marking.render_options.text_margin_right;
        }
      }
    }
    if (previousRight === undefined) {
      return;
    }
    const startX: number = vfPedal.startNote.getAbsoluteX();
    // the Ped. glyph is drawn 10px left of its x
    const depressLeft: number = startX + (vfPedal.DepressXOffset ?? 0) - 10;
    const minDepressLeft: number = previousRight + margin;
    if (depressLeft < minDepressLeft) {
      vfPedal.DepressXOffset = minDepressLeft + 10 - startX;
    }
  }

  /** The * of a short pedal stays a text margin right of its own Ped. (an x rule like the one above): the Ped. is drawn
   *  at the start note and the * at the end note, or right-aligned before the barline for a release at the stave end,
   *  so a release one note later or a Ped. on the last note was drawn over the Ped. (Schumann, Myrthen 24 m14). Only
   *  within one measure, as above; a change keeps its own place. Same as osmd-dart. */
  private keepPedalReleaseRightOfItsDepress(vfPedal: VexFlowPedal): void {
    if (vfPedal.pedalSymbol !== MusicSymbol.PEDAL_SYMBOL || vfPedal.ChangeEnd || !vfPedal.startNote || !vfPedal.endNote ||
        vfPedal.startVfVoiceEntry?.parentStaffEntry?.parentMeasure !== vfPedal.endVfVoiceEntry?.parentStaffEntry?.parentMeasure) {
      return;
    }
    const marking: any = vfPedal.getPedalMarking();
    const margin: number = marking.render_options.text_margin_right;
    const minReleaseLeft: number = VexFlowMusicSheetCalculator.pedalDepressLeft(vfPedal) +
      VexFlowMusicSheetCalculator.pedalDepressGlyphWidth(marking) + margin;
    const endX: number = vfPedal.endNote.getAbsoluteX();
    // the * glyph is drawn 2px left of its x
    if (vfPedal.getPedal.EndsStave) {
      // where drawText right-aligns it before the stave end
      const atStaveEnd: number = (vfPedal.endNote.getStave() as any).getNoteEndX() + (marking.endStaveAddedWidth || 0) -
        margin - VexFlowMusicSheetCalculator.pedalReleaseGlyphWidth(marking);
      if (atStaveEnd < minReleaseLeft) {
        vfPedal.ReleaseXOffset = minReleaseLeft + 2 - endX;
        vfPedal.ReleaseAfterDepress = true;
      }
      return;
    }
    if (endX + (vfPedal.ReleaseXOffset ?? 0) - 2 < minReleaseLeft) {
      vfPedal.ReleaseXOffset = minReleaseLeft + 2 - endX;
    }
  }

  /** Where the Ped. glyph of a symbol pedal starts (drawn 10px left of its x, a change CHANGE_GAP right of it). */
  private static pedalDepressLeft(vfPedal: VexFlowPedal): number {
    const anchor: number = vfPedal.startNote.getAbsoluteX() + (vfPedal.DepressXOffset ?? 0);
    return vfPedal.ChangeBegin ? anchor + 3 : anchor - 10;
  }

  private static pedalDepressGlyphWidth(marking: any): number {
    return marking.constructor.depressGlyphWidth ? marking.constructor.depressGlyphWidth(marking.render_options.glyph_point_size) : 20;
  }

  private static pedalReleaseGlyphWidth(marking: any): number {
    return marking.constructor.releaseGlyphWidth ? marking.constructor.releaseGlyphWidth(marking.render_options.glyph_point_size) : 10;
  }

  /** OSMD-unit x where the release mark of a symbol pedal (its *) starts: the interpolated release, the stave end,
   *  or the end note. */
  /** The x of a box in a staffline (its relative positions up to the staffline), whatever its absolute position was last
   *  computed from. */
  private static xInStaffLine(box: BoundingBox, staffLine: StaffLine): number {
    let x: number = 0;
    for (let current: BoundingBox = box; current && current !== staffLine.PositionAndShape; current = current.Parent) {
      x += current.RelativePosition.x;
    }
    return x;
  }

  private pedalReleaseStartX(vfPedal: VexFlowPedal, endBbox: BoundingBox, marginXOffset: number, staffLine: StaffLine): number {
    if (vfPedal.ReleaseXOffset !== undefined && (!vfPedal.getPedal.EndsStave || vfPedal.ReleaseAfterDepress)) {
      return VexFlowMusicSheetCalculator.xInStaffLine(endBbox, staffLine) + vfPedal.ReleaseXOffset / unitInPixels - marginXOffset;
    }
    if (vfPedal.getPedal.EndsStave && vfPedal.endVfVoiceEntry) {
      const measureBox: BoundingBox = vfPedal.endVfVoiceEntry.parentStaffEntry.parentMeasure.PositionAndShape;
      return VexFlowMusicSheetCalculator.xInStaffLine(measureBox, staffLine) + measureBox.Size.width - marginXOffset - 1.5;
    }
    return VexFlowMusicSheetCalculator.xInStaffLine(endBbox, staffLine) - marginXOffset;
  }

  /** Finds the first staffline measure with a note that can anchor an expression. */
  protected findFirstStafflineMeasure(staffline: StaffLine): GraphicalMeasure {
    return this.findBoundaryNoteEntry(staffline.Measures)?.parentMeasure;
  }

  protected calculateSinglePedal(sourceMeasure: SourceMeasure, multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void {
    // calculate absolute Timestamp and startStaffLine (and EndStaffLine if needed)
    const pedal: Pedal = multiExpression.PedalStart;

    const startTimeStamp: Fraction = pedal.ParentStartMultiExpression.Timestamp;
    const endTimeStamp: Fraction = pedal.ParentEndMultiExpression?.Timestamp;

    const minMeasureToDrawIndex: number = this.rules.MinMeasureToDrawIndex;
    const maxMeasureToDrawIndex: number = this.rules.MaxMeasureToDrawIndex;

    let startStaffLine: StaffLine = this.graphicalMusicSheet.MeasureList[measureIndex][staffIndex].ParentStaffLine;
    if (!startStaffLine) { // fix for rendering range set. all of these can probably be done cleaner.
      startStaffLine = this.graphicalMusicSheet.MeasureList[minMeasureToDrawIndex][staffIndex].ParentStaffLine;
    }
    let endMeasure: GraphicalMeasure = undefined;
    if (pedal.ParentEndMultiExpression) {
      endMeasure = this.graphicalMusicSheet.getGraphicalMeasureFromSourceMeasureAndIndex(pedal.ParentEndMultiExpression.SourceMeasureParent,
                                                                                          staffIndex);
    } else {
      //return; // also possible: don't handle faulty pedal without end
      endMeasure = this.graphicalMusicSheet.getLastGraphicalMeasureFromIndex(staffIndex, true); // get last rendered measure
    }
    if (!endMeasure) { return; }
    const endIsClipped: boolean = endMeasure.MeasureNumber > maxMeasureToDrawIndex + 1;
    if (endIsClipped) { // ends in measure not rendered
      endMeasure = this.graphicalMusicSheet.getLastGraphicalMeasureFromIndex(staffIndex, true);
      if (!endMeasure || endMeasure.staffEntries.length === 0) {
        return;
      }
    }
    let startMeasure: GraphicalMeasure = undefined;
    if (pedal.ParentEndMultiExpression) {
      startMeasure = this.graphicalMusicSheet.getGraphicalMeasureFromSourceMeasureAndIndex(pedal.ParentStartMultiExpression.SourceMeasureParent,
        staffIndex);
    } else {
      startMeasure = this.graphicalMusicSheet.getGraphicalMeasureFromSourceMeasureAndIndex(
        pedal.ParentStartMultiExpression.SourceMeasureParent,
        staffIndex);
      if (!startMeasure) {
        startMeasure = this.graphicalMusicSheet.MeasureList[minMeasureToDrawIndex][staffIndex]; // first rendered measure
      }
      //console.log("no end multi expression for start measure " + startMeasure.MeasureNumber);
    }
    if (!startMeasure) { return; }
    const startIsClipped: boolean = startMeasure.MeasureNumber < minMeasureToDrawIndex + 1;
    if (startIsClipped) { // starts before range of measures selected to render
      startMeasure = this.graphicalMusicSheet.MeasureList[minMeasureToDrawIndex][staffIndex]; // first rendered measure
      if (!startMeasure) { return; }
      startStaffLine = startMeasure.ParentStaffLine;
    }

    if (startMeasure.parentSourceMeasure.measureListIndex < minMeasureToDrawIndex ||
        startMeasure.parentSourceMeasure.measureListIndex > maxMeasureToDrawIndex ||
        endMeasure.parentSourceMeasure.measureListIndex < minMeasureToDrawIndex ||
        endMeasure.parentSourceMeasure.measureListIndex > maxMeasureToDrawIndex) {
      // completely out of drawing range, don't draw anything
      return;
    }

    let endStaffLine: StaffLine = endMeasure.ParentStaffLine;
    if (!endStaffLine) {
      endStaffLine = startStaffLine;
    }
    if (endMeasure && startStaffLine && endStaffLine) {
      let openEnd: boolean = false;
      const startNoteMeasures: GraphicalMeasure[] = startIsClipped ? startStaffLine.Measures : [startMeasure];
      const endNoteMeasures: GraphicalMeasure[] = endIsClipped ? endStaffLine.Measures : [endMeasure];
      if (startStaffLine !== endStaffLine) {
        openEnd = true;
      }
      // calculate GraphicalPedal and RelativePositions
      const graphicalPedal: VexFlowPedal = new VexFlowPedal(pedal, startStaffLine.PositionAndShape, false, openEnd);
      graphicalPedal.setEndsStave(endMeasure, endTimeStamp); // unfortunately this can't already be checked in ExpressionReader
      // calculate RelativePosition
      let startStaffEntry: GraphicalStaffEntry = startMeasure.findGraphicalStaffEntryFromTimestamp(startTimeStamp);
      // The depress between two staff entries (a start at a time only the other staff plays): anchor it at the entry
      //   before it and interpolate its x by time, instead of jumping to the measure's first entry.
      let depressAnchor: PedalReleaseAnchor = undefined;
      if (!startStaffEntry && !startIsClipped && startTimeStamp.RealValue > 0 &&
          startTimeStamp.lt(startMeasure.parentSourceMeasure.Duration)) {
        depressAnchor = this.findPedalReleaseAnchor(startMeasure, startTimeStamp);
        if (depressAnchor) {
          startStaffEntry = depressAnchor.entry;
        }
      }
      if (!this.hasVexFlowNote(startStaffEntry)) { // fix for rendering range set
        startStaffEntry = this.findBoundaryNoteEntry(startNoteMeasures);
        depressAnchor = undefined;
      }
      let endStaffEntry: GraphicalStaffEntry = endMeasure.findGraphicalStaffEntryFromTimestamp(endTimeStamp);
      // The release between two staff entries (a stop with an offset, or at a time only the other staff plays):
      //   anchor it at the entry before it and interpolate its x by time, instead of jumping to the measure's last entry.
      let releaseAnchor: PedalReleaseAnchor = undefined;
      if (!endStaffEntry && endTimeStamp && !endIsClipped && endTimeStamp.lt(endMeasure.parentSourceMeasure.Duration)) {
        releaseAnchor = this.findPedalReleaseAnchor(endMeasure, endTimeStamp);
        if (releaseAnchor) {
          endStaffEntry = releaseAnchor.entry;
        }
      }
      if (!this.hasVexFlowNote(endStaffEntry)) { // fix for rendering range set
        endStaffEntry = this.findBoundaryNoteEntry(endNoteMeasures, true);
        // TODO can be undefined if no notes in end measure
        releaseAnchor = undefined;
      }
      // The next pedal starts exactly where this one ends (a sign pedal closed by the next Ped. in the reader):
      //   the next Ped. is the release, as engraved, so no * is drawn. An explicit stop+start at one time is a
      //   change (ChangeEnd) and keeps its *. A stop with sign="no" draws no * either.
      const nextPedalAtEnd: Pedal = pedal.ParentEndMultiExpression?.PedalStart;
      const hideRelease: boolean = graphicalPedal.pedalSymbol === MusicSymbol.PEDAL_SYMBOL &&
        (pedal.ReleaseHidden || nextPedalAtEnd !== undefined && nextPedalAtEnd !== pedal && !pedal.ChangeEnd);
      if (!graphicalPedal.setStartNote(startStaffEntry)){
        return;
      }
      graphicalPedal.setBeginsStave(graphicalPedal.startNote.isRest(), startTimeStamp);
      if (depressAnchor && depressAnchor.entry === startStaffEntry) {
        graphicalPedal.DepressXOffset = this.interpolatedPedalAnchorOffset(graphicalPedal.startNote, depressAnchor, startMeasure);
      }
      this.keepPedalDepressRightOfPreviousRelease(graphicalPedal, startStaffLine);

      if (endStaffLine !== startStaffLine) {
        if(graphicalPedal.pedalSymbol === MusicSymbol.PEDAL_SYMBOL){
          graphicalPedal.setEndNote(endStaffEntry);
          graphicalPedal.setEndMeasure(endMeasure);
          graphicalPedal.ReleaseText = " ";
          graphicalPedal.CalculateBoundingBox();
          this.calculatePedalSkyBottomLine(graphicalPedal.startVfVoiceEntry, graphicalPedal.endVfVoiceEntry, graphicalPedal, startStaffLine);

          const nextPedalFirstMeasure: GraphicalMeasure = endStaffLine.Measures[0];
          // pedal starts on the first measure
          const nextPedal: VexFlowPedal = new VexFlowPedal(pedal, nextPedalFirstMeasure.PositionAndShape);
          graphicalPedal.setEndsStave(endMeasure, endTimeStamp);
          // (the first measure of the system can have nothing on this staff, e.g. a measure of only grace notes on another
          //   staff, split off to break the system)
          const firstNote: GraphicalStaffEntry = this.findBoundaryNoteEntry(endStaffLine.Measures);
          if(!nextPedal.setStartNote(firstNote)){
            return;
          }
          nextPedal.setEndNote(endStaffEntry);
          nextPedal.setEndMeasure(endMeasure);
          nextPedal.ReleaseXOffset = this.interpolatedPedalReleaseXOffset(nextPedal, releaseAnchor, endMeasure, false);
          if (hideRelease) {
            nextPedal.ReleaseText = " ";
          }
          graphicalPedal.setEndMeasure(endMeasure);
          endStaffLine.Pedals.push(nextPedal);
          nextPedal.CalculateBoundingBox();
          nextPedal.DepressText = " ";
          this.calculatePedalSkyBottomLine(nextPedal.startVfVoiceEntry, nextPedal.endVfVoiceEntry, nextPedal, endStaffLine);
        } else {
          let lastMeasureOfFirstShift: GraphicalMeasure = this.findLastStafflineMeasure(startStaffLine);
          if (lastMeasureOfFirstShift === undefined) { // TODO handle this case correctly (when drawUpToMeasureNumber etc set)
            lastMeasureOfFirstShift = endMeasure;
          }
          const lastNoteOfFirstShift: GraphicalStaffEntry = this.findBoundaryNoteEntry([lastMeasureOfFirstShift], true);
          graphicalPedal.setEndNote(lastNoteOfFirstShift);
          graphicalPedal.setEndMeasure(endMeasure);
          graphicalPedal.ChangeEnd = false;

          const systemsInBetweenCount: number = endStaffLine.ParentMusicSystem.Id - startStaffLine.ParentMusicSystem.Id;
          if (systemsInBetweenCount > 0) {
            //Loop through the stafflines in between to the end
            let currentCount: number = 1;
            for (let i: number = startStaffLine.ParentMusicSystem.Id; i < endStaffLine.ParentMusicSystem.Id; i++) {
              const nextPedalMusicSystem: MusicSystem = this.musicSystems[i + 1];
              const nextPedalStaffline: StaffLine = nextPedalMusicSystem.StaffLines.find(
                (staffLine: StaffLine): boolean => staffLine.ParentStaff.idInMusicSheet === staffIndex);
              if (!nextPedalStaffline) {
                continue;
              }
              const measuresWithEntries: GraphicalMeasure[] = nextPedalStaffline.Measures.filter(
                (measure: GraphicalMeasure): boolean => measure.staffEntries.length > 0);
              if (measuresWithEntries.length === 0) {
                continue;
              }
              const nextPedalFirstMeasure: GraphicalMeasure = measuresWithEntries[0];
              let nextOpenEnd: boolean = false;
              let nextChangeEndFromParent: boolean = false;
              if (currentCount < systemsInBetweenCount) {
                nextOpenEnd = true;
              } else {
                nextChangeEndFromParent = true;
              }
              currentCount++;
              // pedal starts on the first measure
              const nextPedal: VexFlowPedal = new VexFlowPedal(pedal, nextPedalFirstMeasure.PositionAndShape, true, nextOpenEnd);
              graphicalPedal.setEndsStave(endMeasure, endTimeStamp);
              nextPedal.ChangeBegin = false;
              if(nextChangeEndFromParent){
                nextPedal.ChangeEnd = pedal.ChangeEnd;
              } else {
                nextPedal.ChangeEnd = false;
              }
              let nextPedalLastMeasure: GraphicalMeasure = this.findLastStafflineMeasure(nextPedalStaffline);
              if (!nextPedalLastMeasure) {
                // nothing on this staff in this system (e.g. a measure of only grace notes on another staff, split off to
                //   break the system): the pedal is held through it, with no note to draw a line from.
                continue;
              }
              // (the first measure of the system can have nothing on this staff, like the system above)
              const firstNote: GraphicalStaffEntry = this.findBoundaryNoteEntry(nextPedalStaffline.Measures);
              let lastNote: GraphicalStaffEntry = this.findBoundaryNoteEntry([nextPedalLastMeasure], true);

              //If the end measure's staffline is the ending staffline, this endMeasure is the end of the pedal
              if (endMeasure.ParentStaffLine === nextPedalStaffline) {
                nextPedalLastMeasure = endMeasure;
                nextPedal.setEndMeasure(endMeasure);
                lastNote = endStaffEntry;
                nextPedal.ReleaseXOffset = this.interpolatedPedalReleaseXOffset(nextPedal, releaseAnchor, endMeasure, false, lastNote);
              } else {
                nextPedal.setEndMeasure(nextPedalLastMeasure);
              }
              if(!nextPedal.setStartNote(firstNote)){
                break;
              }
              nextPedal.setEndNote(lastNote);
              graphicalPedal.setEndMeasure(endMeasure);
              nextPedalStaffline.Pedals.push(nextPedal);
              nextPedal.CalculateBoundingBox();
              this.calculatePedalSkyBottomLine(nextPedal.startVfVoiceEntry, nextPedal.endVfVoiceEntry, nextPedal, nextPedalStaffline);
            }
          }
          graphicalPedal.CalculateBoundingBox();
          this.calculatePedalSkyBottomLine(graphicalPedal.startVfVoiceEntry, graphicalPedal.endVfVoiceEntry, graphicalPedal, startStaffLine);
        }
      } else {
        graphicalPedal.setEndNote(endStaffEntry);
        graphicalPedal.setEndMeasure(endMeasure);
        graphicalPedal.ReleaseXOffset = this.interpolatedPedalReleaseXOffset(graphicalPedal, releaseAnchor, endMeasure, true);
        if (hideRelease) {
          graphicalPedal.ReleaseText = " ";
        } else {
          this.keepPedalReleaseRightOfItsDepress(graphicalPedal);
        }
        graphicalPedal.CalculateBoundingBox();
        this.calculatePedalSkyBottomLine(graphicalPedal.startVfVoiceEntry, graphicalPedal.endVfVoiceEntry, graphicalPedal, startStaffLine);
      }
      startStaffLine.Pedals.push(graphicalPedal);
    } else {
      log.warn("End measure or staffLines for pedal are undefined! This should not happen!");
    }
  }

  protected calculateSingleWavyLine(sourceMeasure: SourceMeasure, multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void {
    // calculate absolute Timestamp and startStaffLine (and EndStaffLine if needed)
    const wavyLine: WavyLine = multiExpression.WavyLineStart;

    const startTimeStamp: Fraction = wavyLine.ParentStartMultiExpression.Timestamp;
    const endTimeStamp: Fraction = wavyLine.ParentEndMultiExpression?.Timestamp;

    const minMeasureToDrawIndex: number = this.rules.MinMeasureToDrawIndex;
    const maxMeasureToDrawIndex: number = this.rules.MaxMeasureToDrawIndex;

    let startStaffLine: StaffLine = this.graphicalMusicSheet.MeasureList[measureIndex][staffIndex].ParentStaffLine;
    if (!startStaffLine) { // fix for rendering range set. all of these can probably be done cleaner.
      startStaffLine = this.graphicalMusicSheet.MeasureList[minMeasureToDrawIndex][staffIndex].ParentStaffLine;
    }
    let endMeasure: GraphicalMeasure = undefined;
    if (wavyLine.ParentEndMultiExpression) {
      endMeasure = this.graphicalMusicSheet.getGraphicalMeasureFromSourceMeasureAndIndex(wavyLine.ParentEndMultiExpression.SourceMeasureParent,
                                                                                          staffIndex);
    } else {
      endMeasure = this.graphicalMusicSheet.getLastGraphicalMeasureFromIndex(staffIndex, true); // get last rendered measure
    }
    const endIsClipped: boolean = endMeasure.MeasureNumber > maxMeasureToDrawIndex + 1;
    if (endIsClipped) { // ends in measure not rendered
      endMeasure = this.graphicalMusicSheet.getLastGraphicalMeasureFromIndex(staffIndex, true);
    }
    let startMeasure: GraphicalMeasure = undefined;
    if (wavyLine.ParentEndMultiExpression) {
      startMeasure = this.graphicalMusicSheet.getGraphicalMeasureFromSourceMeasureAndIndex(wavyLine.ParentStartMultiExpression.SourceMeasureParent,
                                                                                            staffIndex);
    } else {
      startMeasure = this.graphicalMusicSheet.MeasureList[minMeasureToDrawIndex][staffIndex]; // first rendered measure
    }
    const startIsClipped: boolean = startMeasure.MeasureNumber < minMeasureToDrawIndex + 1;
    if (startIsClipped) { // starts before range of measures selected to render
      startMeasure = this.graphicalMusicSheet.MeasureList[minMeasureToDrawIndex][staffIndex]; // first rendered measure
      startStaffLine = startMeasure.ParentStaffLine;
    }

    if (startMeasure.parentSourceMeasure.measureListIndex < minMeasureToDrawIndex ||
        startMeasure.parentSourceMeasure.measureListIndex > maxMeasureToDrawIndex ||
        endMeasure.parentSourceMeasure.measureListIndex < minMeasureToDrawIndex ||
        endMeasure.parentSourceMeasure.measureListIndex > maxMeasureToDrawIndex) {
      // completely out of drawing range, don't draw anything
      return;
    }

    let endStaffLine: StaffLine = endMeasure.ParentStaffLine;
    if (!endStaffLine) {
      endStaffLine = startStaffLine;
    }
    if (endMeasure && startStaffLine && endStaffLine) {
      const graphicalWavyLine: VexFlowVibratoBracket = new VexFlowVibratoBracket(wavyLine, startStaffLine.PositionAndShape, startMeasure.ParentStaff.isTab);
      const startNoteMeasures: GraphicalMeasure[] = startIsClipped ? startStaffLine.Measures : [startMeasure];
      const endNoteMeasures: GraphicalMeasure[] = endIsClipped ? endStaffLine.Measures : [endMeasure];
      // calculate RelativePosition
      let startStaffEntry: GraphicalStaffEntry = startMeasure.findGraphicalStaffEntryFromTimestamp(startTimeStamp);
      // The depress between two staff entries (a start at a time only the other staff plays): anchor it at the entry
      //   before it and interpolate its x by time, instead of jumping to the measure's first entry.
      let depressAnchor: PedalReleaseAnchor = undefined;
      if (!startStaffEntry && !startIsClipped && startTimeStamp.RealValue > 0 &&
          startTimeStamp.lt(startMeasure.parentSourceMeasure.Duration)) {
        depressAnchor = this.findPedalReleaseAnchor(startMeasure, startTimeStamp);
        if (depressAnchor) {
          startStaffEntry = depressAnchor.entry;
        }
      }
      if (!this.hasVexFlowNote(startStaffEntry)) { // fix for rendering range set
        startStaffEntry = this.findBoundaryNoteEntry(startNoteMeasures);
        depressAnchor = undefined;
      }
      let endStaffEntry: GraphicalStaffEntry = endMeasure.findGraphicalStaffEntryFromTimestamp(endTimeStamp);
      if (wavyLine.EndGraceVoiceEntry && !endIsClipped) {
        // it stops at a grace note: the staff entry that holds it, which a grace note after its main note (a Nachschlag)
        //   was moved to (its stop's timestamp is the main note's end)
        endStaffEntry = endMeasure.staffEntries.find((gse: GraphicalStaffEntry): boolean =>
          gse.graphicalVoiceEntries.some((gve: GraphicalVoiceEntry): boolean => gve.parentVoiceEntry === wavyLine.EndGraceVoiceEntry)
        ) ?? endStaffEntry;
      }
      if (!this.hasVexFlowNote(endStaffEntry)) { // fix for rendering range set
        endStaffEntry = this.findBoundaryNoteEntry(endNoteMeasures, true);
      }
      if (!graphicalWavyLine.setStartNote(startStaffEntry)) {
        return; // no start note found (e.g. no staff entries in the start measure), nothing to attach the wavy line to
      }

      if (endStaffLine !== startStaffLine) {
          let lastMeasureOfFirstShift: GraphicalMeasure = this.findLastStafflineMeasure(startStaffLine);
          if (lastMeasureOfFirstShift === undefined) { // e.g. when drawUpToMeasureNumber set, or no staffentries found above
            lastMeasureOfFirstShift = endMeasure;
          }
          const lastNoteOfFirstShift: GraphicalStaffEntry = this.findBoundaryNoteEntry([lastMeasureOfFirstShift], true);
          if (lastNoteOfFirstShift) {
            if (!graphicalWavyLine.setEndNote(lastNoteOfFirstShift)) {
              graphicalWavyLine.endNote = graphicalWavyLine.startNote;
              graphicalWavyLine.endVfVoiceEntry = graphicalWavyLine.startVfVoiceEntry;
            }
          }

          const systemsInBetweenCount: number = endStaffLine.ParentMusicSystem.Id - startStaffLine.ParentMusicSystem.Id;
          if (systemsInBetweenCount > 0) {
            for (let i: number = startStaffLine.ParentMusicSystem.Id; i < endStaffLine.ParentMusicSystem.Id; i++) {
              const nextWavyLineMusicSystem: MusicSystem = this.musicSystems[i + 1];
              let nextWavyLineStaffline: StaffLine; // not always = nextWavyLineMusicSystem.StaffLines[staffIndex], e.g. when first instrument invisible
              for (const staffline of nextWavyLineMusicSystem.StaffLines) {
                if (staffline.ParentStaff.idInMusicSheet === staffIndex) {
                  nextWavyLineStaffline = staffline;
                  break;
                }
              }
              if (!nextWavyLineStaffline) { // shouldn't happen
                continue;
              }
              const nextWavyLineFirstMeasure: GraphicalMeasure = nextWavyLineStaffline.Measures[0];
              // vibrato starts on the first measure
              const nextWavyLine: VexFlowVibratoBracket = new VexFlowVibratoBracket(wavyLine, nextWavyLineFirstMeasure.PositionAndShape,
                nextWavyLineStaffline.ParentStaff.isTab);
              // (the first measure of the system can have nothing on this staff, e.g. a measure of only grace notes on another
              //   staff, split off to break the system)
              const firstNote: GraphicalStaffEntry = this.findBoundaryNoteEntry(nextWavyLineStaffline.Measures);
              let lastNote: GraphicalStaffEntry = this.findBoundaryNoteEntry(nextWavyLineStaffline.Measures, true);
              //If the end measure's is the ending staffline, this endMeasure is the end of the wavy line
              if (endMeasure.ParentStaffLine === nextWavyLineStaffline) {
                lastNote = endStaffEntry;
              }

              if (!nextWavyLine.setStartNote(firstNote)) {
                continue; // no start note in this staffline (e.g. nothing on this staff in this system), skip only this segment
              }
              if (!nextWavyLine.setEndNote(lastNote)) {
                nextWavyLine.endNote = nextWavyLine.startNote;
                nextWavyLine.endVfVoiceEntry = nextWavyLine.startVfVoiceEntry;
              }
              nextWavyLineStaffline.WavyLines.push(nextWavyLine);
              nextWavyLine.CalculateBoundingBox();
              this.calculateWavyLineSkyBottomLine(nextWavyLine.startVfVoiceEntry, nextWavyLine.endVfVoiceEntry, nextWavyLine, nextWavyLineStaffline);
            }
          }
          graphicalWavyLine.CalculateBoundingBox();
          this.calculateWavyLineSkyBottomLine(graphicalWavyLine.startVfVoiceEntry, graphicalWavyLine.endVfVoiceEntry, graphicalWavyLine, startStaffLine);
      } else {
        if (!graphicalWavyLine.setEndNote(endStaffEntry)) {
          graphicalWavyLine.endNote = graphicalWavyLine.startNote;
          graphicalWavyLine.endVfVoiceEntry = graphicalWavyLine.startVfVoiceEntry;
        }
        if (wavyLine.ParentEndMultiExpression === wavyLine.ParentStartMultiExpression && !graphicalWavyLine.EndsAtGraceNote) {
          // it starts and stops at the same note, e.g. a trill line over one note from Dolet for Sibelius or MuseScore:
          //   trill-mark, wavy-line start and wavy-line stop
          graphicalWavyLine.coverEndNoteDuration();
        }
        graphicalWavyLine.CalculateBoundingBox();
        this.calculateWavyLineSkyBottomLine(graphicalWavyLine.startVfVoiceEntry, graphicalWavyLine.endVfVoiceEntry, graphicalWavyLine, startStaffLine);
      }
      startStaffLine.WavyLines.push(graphicalWavyLine);
    } else {
      log.warn("End measure or staffLines for wavy line are undefined! This should not happen!");
    }
  }
  private calculateWavyLineSkyBottomLine(startVfVoiceEntry: VexFlowVoiceEntry, endVfVoiceEntry: VexFlowVoiceEntry,
    vfVibratoBracket: VexFlowVibratoBracket, parentStaffline: StaffLine): void {
    const startStave: Vex.Flow.Stave = vfVibratoBracket.startNote.getStave();
    let endStave: Vex.Flow.Stave = vfVibratoBracket.endNote?.getStave();
    if (!endStave) { // e.g. if endNote undefined
      endStave = startStave;
      endVfVoiceEntry = startVfVoiceEntry;
      // TODO maybe not best way to handle this. sample/situation where value is undefined unclear.
    }
    //In VF Line positions, need to negate for our units
    const highestVFTopTextPosition: number = Math.max(
      startStave.options.top_text_position,
      endStave.options.top_text_position
    );

    //Whichever is higher, set the other to match
    startStave.options.top_text_position = highestVFTopTextPosition;
    endStave.options.top_text_position = highestVFTopTextPosition;
    let headroom: number = -highestVFTopTextPosition;
    let trillStartX: number = 0;
    let trillEndX: number = 0;
    let trillSkyline: number = Infinity;
    let trillWavyLineBottom: number = Infinity;
    const TRILL_HEIGHT: number = 1.85;

    let startX: number = startVfVoiceEntry.PositionAndShape.AbsolutePosition.x + startVfVoiceEntry.PositionAndShape.BorderLeft;
    if (startVfVoiceEntry.parentVoiceEntry?.OrnamentContainer?.GetOrnament === OrnamentEnum.Trill) {
      trillStartX = startX;
      //Width of trill mark
      startX += 2;
      trillEndX = startX;
      //Since the trill mark is not managed or calculated by our bounding boxes, we have to get the location this way
      //Also at this point the skyline has already been updated with the trill mark. So we can't determine if it should go lower
      //Need to trust Vexflow later on, unless the wavy line must be rendered higher
      trillSkyline = parentStaffline.SkyBottomLineCalculator.getSkyLineMinInRange(trillStartX, trillEndX);
      //height of the trill mark
      trillWavyLineBottom = trillSkyline + TRILL_HEIGHT;
    }

    let stopX: number = undefined;
    //If the end of the line is the last note in the measure, go all the way to the end of the stave
    if(vfVibratoBracket.ToEndOfStopStave) {
      //vexflow backs off by 1 unit (10 pixels) from stave edge
      stopX = endVfVoiceEntry.parentStaffEntry.parentMeasure.PositionAndShape.AbsolutePosition.x +
        endVfVoiceEntry.parentStaffEntry.parentMeasure.PositionAndShape.BorderRight - 1;
    } else if (vfVibratoBracket.nextVfVoiceEntry) {
      //Up to the next note, in front of its modifiers (in its bounding box). Vexflow backs off by 0.5 units (5 pixels)
      const nextNoteBox: BoundingBox = vfVibratoBracket.nextVfVoiceEntry.PositionAndShape;
      stopX = nextNoteBox.AbsolutePosition.x + nextNoteBox.BorderLeft - 0.5;
    } else {
      stopX = endVfVoiceEntry.PositionAndShape.AbsolutePosition.x + endVfVoiceEntry.PositionAndShape.BorderRight;
      //Take into account in-staff clefs associated with the staff entry (they modify the bounding box position)
      const vfClefBefore: Vex.Flow.ClefNote = (endVfVoiceEntry.parentStaffEntry as VexFlowStaffEntry).vfClefBefore;
      if (vfClefBefore) {
        const clefWidth: number = vfClefBefore.getWidth() / 10;
        stopX += clefWidth;
      }
    }

    headroom = parentStaffline.SkyBottomLineCalculator.getSkyLineMinInRange(startX, stopX);
    if (headroom === Infinity) { // will cause Vexflow error
      return;
    }
    //If somewhere in our wavy line path we have to render higher than where the trill mark is set...
    if (headroom < trillSkyline) {
      startStave.options.top_text_position = -headroom;
      endStave.options.top_text_position = -headroom;
      //A decent enough approximation. Better than recalculating via Canvas or SVG sampling
      parentStaffline.SkyBottomLineCalculator.updateSkyLineInRange(trillStartX, trillEndX, headroom - TRILL_HEIGHT);
    } else { //Else just render where Vexflow has set the trill mark
      vfVibratoBracket.line = -trillWavyLineBottom;
      headroom = trillWavyLineBottom;
    }
    //Update skyline to include height of the wavy line
    headroom -= vfVibratoBracket.PositionAndShape.Size.height;
    parentStaffline.SkyBottomLineCalculator.updateSkyLineInRange(startX, stopX, headroom);
  }

  /** A staff line's bottom line as it was before its first pedal mark, by the bottom line array (a new layout makes a
   *  new one). */
  private static bottomLineBeforePedals: WeakMap<number[], number[]> = new WeakMap<number[], number[]>();

  private calculatePedalSkyBottomLine(startVfVoiceEntry: VexFlowVoiceEntry, endVfVoiceEntry: VexFlowVoiceEntry,
    vfPedal: VexFlowPedal, parentStaffline: StaffLine): void {
      // The x values below are positions in the staffline (xInStaffLine()), as its sky/bottom lines. They were the boxes'
      //   absolute positions, which are relative to their measure at this point (the skyline pass computes them from the
      //   measure): the bottom line was read away from the pedal (Schumann, Myrthen 11 m48, 25 m38).
      const skyBottomLine: SkyBottomLineCalculator = parentStaffline.SkyBottomLineCalculator;
      // The pedals of a staff line are kept level (below), so a pedal clears what was there before the first pedal
      //   mark: reading the marks too, each Ped. right after the previous * went 3.5 spaces lower than it, down into the
      //   next system (Gluck, Che fiero costume, piano m6-10).
      const bottomLine: number[] = skyBottomLine.BottomLine;
      let bottomLineBeforePedals: number[] = VexFlowMusicSheetCalculator.bottomLineBeforePedals.get(bottomLine);
      if (!bottomLineBeforePedals) {
        bottomLineBeforePedals = bottomLine.slice();
        VexFlowMusicSheetCalculator.bottomLineBeforePedals.set(bottomLine, bottomLineBeforePedals);
      }
      const bottomLineMaxInRange: (start: number, end: number) => number = (start: number, end: number): number =>
        skyBottomLine.getMaxInRangeOf(bottomLineBeforePedals, start, end);
      const xOf: (box: BoundingBox) => number = (box: BoundingBox): number => VexFlowMusicSheetCalculator.xInStaffLine(box, parentStaffline);
      let endBbox: BoundingBox = endVfVoiceEntry?.PositionAndShape;
      if (!endBbox) {
        endBbox = vfPedal.endMeasure.PositionAndShape;
      }
      //Just for shorthand. Easier readability below
      const PEDAL_STYLES_ENUM: any = Vex.Flow.PedalMarking.Styles;
      const pedalMarking: any = vfPedal.getPedalMarking();
      //VF adds 3 lines to whatever the pedal line is set to.
      //VF also measures from the bottom line, whereas our bottom line is from the top staff line
      const yLineForPedalMarking: number = (pedalMarking.line + 3 + (parentStaffline.StaffLines.length - 1));
      //VF Uses a margin offset for rendering. Take this into account
      const pedalMarkingMarginXOffset: number = pedalMarking.render_options.text_margin_right / 10;
      //TODO: Most of this should be in the bounding box calculation
      let startX: number = xOf(startVfVoiceEntry.PositionAndShape) +
        (vfPedal.DepressXOffset ?? 0) / unitInPixels - pedalMarkingMarginXOffset;

      if (pedalMarking.style === PEDAL_STYLES_ENUM.MIXED ||
          pedalMarking.style === PEDAL_STYLES_ENUM.MIXED_OPEN_END ||
          pedalMarking.style === PEDAL_STYLES_ENUM.TEXT) {
        //Accomodate the Ped. sign
        startX -= 1;
      }
      let stopX: number = undefined;
      let footroom: number = (parentStaffline.StaffLines.length - 1);
      //Find the highest foot room in our staffline
      for (const otherPedal of parentStaffline.Pedals) {
        const vfOtherPedal: VexFlowPedal = otherPedal as VexFlowPedal;
        const otherPedalMarking: any = vfOtherPedal.getPedalMarking();
        const yLineForOtherPedalMarking: number = (otherPedalMarking.line + 3 + (parentStaffline.StaffLines.length - 1));
        footroom = Math.max(yLineForOtherPedalMarking, footroom);
      }
      //We have the two seperate symbols, with two bounding boxes
      if (vfPedal.EndSymbolPositionAndShape) {
        const symbolHalfHeight: number = pedalMarking.render_options.glyph_point_size / 20;
        //Width of the Ped. symbol
        stopX = startX + 3.4;
        const startX2: number = this.pedalReleaseStartX(vfPedal, endBbox, pedalMarkingMarginXOffset, parentStaffline);
        //Width of * symbol
        const stopX2: number = startX2 + 1.5;

        // The Ped. and * glyphs reach about 2 units above their baseline, which VexFlow puts 1 unit below the footroom
        //   line: the footroom of the notes was their bottom line, so a sign under a low note was drawn into it
        //   (Schumann, Myrthen 11 m48: Ped. over G1's notehead and ledger lines). Half a unit clear of them.
        const signClearance: number = 1.5;
        footroom = Math.max(bottomLineMaxInRange(startX, stopX) + signClearance, footroom);
        footroom = Math.max(yLineForPedalMarking + symbolHalfHeight * 2, footroom);
        const footroom2: number = bottomLineMaxInRange(startX2, stopX2) + signClearance;
        //If Depress text is set, means we are not rendering the begin label (we are just rendering the end one)
        if (!vfPedal.DepressText) {
          footroom = Math.max(footroom, footroom2);
        }
        vfPedal.setLine(footroom - 3 - (parentStaffline.StaffLines.length - 1));
        skyBottomLine.updateBottomLineInRange(startX, stopX, footroom + symbolHalfHeight);
        skyBottomLine.updateBottomLineInRange(startX2, stopX2, footroom + symbolHalfHeight);
      } else {
        const bracketHeight: number = pedalMarking.render_options.bracket_height / 10;

        if(pedalMarking.EndsStave){
          if(endVfVoiceEntry){
            stopX = xOf(endVfVoiceEntry.parentStaffEntry.parentMeasure.PositionAndShape) +
              endVfVoiceEntry.parentStaffEntry.parentMeasure.PositionAndShape.Size.width - pedalMarkingMarginXOffset;

          } else {
            stopX = xOf(endBbox) + endBbox.Size.width;
          }
        } else {
          switch (pedalMarking.style) {
            case PEDAL_STYLES_ENUM.BRACKET_OPEN_END:
            case PEDAL_STYLES_ENUM.BRACKET_OPEN_BOTH:
            case PEDAL_STYLES_ENUM.MIXED_OPEN_END:
              stopX = xOf(endBbox) + endBbox.BorderRight - pedalMarkingMarginXOffset;
            break;
            default:
              if (vfPedal.ReleaseXOffset !== undefined) {
                stopX = xOf(endBbox) + vfPedal.ReleaseXOffset / unitInPixels;
              } else {
                stopX = xOf(endBbox) + endBbox.BorderLeft - pedalMarkingMarginXOffset;
              }
            break;
          }
        }
        //Take into account in-staff clefs associated with the staff entry (they modify the bounding box position)
        const vfClefBefore: Vex.Flow.ClefNote = (endVfVoiceEntry?.parentStaffEntry as VexFlowStaffEntry)?.vfClefBefore;
        if (vfClefBefore) {
          const clefWidth: number = vfClefBefore.getWidth() / 10;
          stopX += clefWidth;
        }

        footroom = Math.max(bottomLineMaxInRange(startX, stopX), footroom);
        if (footroom === Infinity) { // will cause Vexflow error
          return;
        }
        //Whatever is currently lower - the set render height of the begin vf stave, the set render height of the end vf stave,
        //or the bottom line. Use that as the render height of both staves
        footroom = Math.max(footroom, yLineForPedalMarking + bracketHeight);
        vfPedal.setLine(footroom - 3 - (parentStaffline.StaffLines.length - 1));
        if (startX > stopX) { // TODO hotfix for skybottomlinecalculator after pedal no endNote fix
          const newStart: number = stopX;
          stopX = startX;
          startX = newStart;
        }
        skyBottomLine.updateBottomLineInRange(startX, stopX, footroom + bracketHeight);
      }
      //If our current pedal is below the other pedals in this staffline, set them all to this height
      for (const otherPedal of parentStaffline.Pedals) {
        const vfOtherPedal: VexFlowPedal = otherPedal as VexFlowPedal;
        const otherPedalMarking: any = vfOtherPedal.getPedalMarking();
        const yLineForOtherPedalMarking: number = (otherPedalMarking.line + 3 + (parentStaffline.StaffLines.length - 1));
        //Only do these changes if current footroom is higher
        if(footroom > yLineForOtherPedalMarking) {
          const otherPedalMarkingMarginXOffset: number = otherPedalMarking.render_options.text_margin_right / 10;
          let otherPedalStartX: number = xOf(vfOtherPedal.startVfVoiceEntry.PositionAndShape) - otherPedalMarkingMarginXOffset;
          let otherPedalStopX: number = undefined;
          vfOtherPedal.setLine(footroom - 3 - (parentStaffline.StaffLines.length - 1));
          let otherPedalEndBBox: BoundingBox = vfOtherPedal.endVfVoiceEntry?.PositionAndShape;
          if (!otherPedalEndBBox) {
            otherPedalEndBBox = vfOtherPedal.endMeasure.PositionAndShape;
          }
          if (vfOtherPedal.EndSymbolPositionAndShape) {
            const otherSymbolHalfHeight: number = pedalMarking.render_options.glyph_point_size / 20;
            //Width of the Ped. symbol
            otherPedalStopX = otherPedalStartX + 3.4;
            const otherPedalStartX2: number = xOf(otherPedalEndBBox) - otherPedalMarkingMarginXOffset;
            //Width of * symbol
            const otherPedalStopX2: number = otherPedalStartX2 + 1.5;
            skyBottomLine.updateBottomLineInRange(otherPedalStartX, otherPedalStopX, footroom + otherSymbolHalfHeight);
            skyBottomLine.updateBottomLineInRange(otherPedalStartX2, otherPedalStopX2, footroom + otherSymbolHalfHeight);
          } else {
            const otherPedalBracketHeight: number = otherPedalMarking.render_options.bracket_height / 10;

            if(otherPedalMarking.EndsStave){
                otherPedalStopX = xOf(otherPedalEndBBox) + otherPedalEndBBox.Size.width - otherPedalMarkingMarginXOffset;
            } else {
              switch (pedalMarking.style) {
                case PEDAL_STYLES_ENUM.BRACKET_OPEN_END:
                case PEDAL_STYLES_ENUM.BRACKET_OPEN_BOTH:
                case PEDAL_STYLES_ENUM.MIXED_OPEN_END:
                  otherPedalStopX = xOf(otherPedalEndBBox) + otherPedalEndBBox.BorderRight - otherPedalMarkingMarginXOffset;
                break;
                default:
                  otherPedalStopX = xOf(otherPedalEndBBox) + otherPedalEndBBox.BorderLeft - otherPedalMarkingMarginXOffset;
                break;
              }
            }
            //Take into account in-staff clefs associated with the staff entry (they modify the bounding box position)
            const vfOtherClefBefore: Vex.Flow.ClefNote = (vfOtherPedal.endVfVoiceEntry?.parentStaffEntry as VexFlowStaffEntry)?.vfClefBefore;
            if (vfOtherClefBefore) {
              const otherClefWidth: number = vfOtherClefBefore.getWidth() / 10;
              otherPedalStopX += otherClefWidth;
            }
            if (otherPedalStartX > otherPedalStopX) {
              // TODO this shouldn't happen, though this fixes the SkyBottomLineCalculator error for now (startIndex needs to be <= endIndex)
              // switch startX and stopX
              const otherStartX: number = otherPedalStartX;
              otherPedalStartX = otherPedalStopX;
              otherPedalStopX = otherStartX;
            }
            skyBottomLine.updateBottomLineInRange(otherPedalStartX, otherPedalStopX, footroom + otherPedalBracketHeight);
          }
        }
      }
  }

  private calculateOctaveShiftSkyBottomLine(startStaffEntry: GraphicalStaffEntry, endStaffEntry: GraphicalStaffEntry,
                                            vfOctaveShift: VexFlowOctaveShift, parentStaffline: StaffLine): void {
    if (!endStaffEntry) {
      log.warn("octaveshift: no endStaffEntry");
      return;
    }
    let endBbox: BoundingBox = endStaffEntry.PositionAndShape;
    if (vfOctaveShift.graphicalEndAtMeasureEnd) {
      endBbox = endStaffEntry.parentMeasure.PositionAndShape;
    }
    let startXOffset: number = startStaffEntry.PositionAndShape.Size.width;
    let endXOffset: number = endBbox.Size.width;

    //Vexflow renders differently with rests
    if (startStaffEntry.hasOnlyRests()) {
      startXOffset = -startXOffset;
    } else {
      startXOffset /= 2;
    }

    if (!vfOctaveShift.graphicalEndAtMeasureEnd) {
      if (!endStaffEntry.hasOnlyRests()) {
        endXOffset /= 2;
      } else {
        endXOffset *= 2;
      }
      if (startStaffEntry === endStaffEntry) {
        endXOffset *= 2;
      }
    }

    let startX: number = startStaffEntry.PositionAndShape.AbsolutePosition.x - startXOffset;
    let stopX: number = endBbox.AbsolutePosition.x + endXOffset;
    if (startX > stopX) {
      // very rare case of the start staffentry being before end staffentry. would lead to error in skybottomline. See #1281
      // reverse startX and endX
      const oldStartX: number = startX;
      startX = stopX;
      stopX = oldStartX;
    }

    vfOctaveShift.PositionAndShape.Size.width = stopX - startX;
    const textBracket: VF.TextBracket = vfOctaveShift.getTextBracket();
    const fontSize: number = (textBracket as any).font.size / 10;

    if ((<any>textBracket).position === VF.TextBracket.Positions.TOP) {
      // Math.ceil with a small tolerance: the geometric skyline calculation gives exact values where
      // the pixel-based one snapped to pixels (often exact integers, e.g. a note top exactly 1 unit
      // above the staff), and without the tolerance, a skyline minimum a fraction of a pixel inside
      // an integer boundary would lose a whole unit of headroom to the ceil (e.g. ceil(-0.97) = 0,
      // putting the octave bracket into the note, see test_octaveshift_extragraphicalmeasure).
      // The tolerance is smaller than the pixel-based values' granularity (0.1), so their results are unchanged.
      const headroom: number = Math.ceil(parentStaffline.SkyBottomLineCalculator.getSkyLineMinInRange(startX, stopX) - 0.05);
      if (headroom === Infinity) { // will cause Vexflow error
        return;
      }
      (textBracket.start.getStave().options as any).top_text_position = Math.abs(headroom);
      parentStaffline.SkyBottomLineCalculator.updateSkyLineInRange(startX, stopX, headroom - fontSize * 2);
    } else {
      const footroom: number = parentStaffline.SkyBottomLineCalculator.getBottomLineMaxInRange(startX, stopX);
      if (footroom === Infinity) { // will cause Vexflow error
        return;
      }
      (textBracket.start.getStave().options as any).bottom_text_position = footroom;
      //Vexflow positions top vs. bottom text in a slightly inconsistent way it seems
      parentStaffline.SkyBottomLineCalculator.updateBottomLineInRange(startX, stopX, footroom + fontSize * 1.5);
    }
  }

  /**
   * Calculate all the textual and symbolic [[RepetitionInstruction]]s (e.g. dal segno) for a single [[SourceMeasure]].
   * @param repetitionInstruction
   * @param measureIndex
   */
  protected calculateWordRepetitionInstruction(repetitionInstruction: RepetitionInstruction, measureIndex: number): void {
    const measures: VexFlowMeasure[] = <VexFlowMeasure[]>this.graphicalMusicSheet.MeasureList[measureIndex];
    if (repetitionInstruction.type === RepetitionInstructionEnum.Segno && repetitionInstruction.SymbolPlacements.length > 0 &&
        this.calculateSegnoSigns(repetitionInstruction, measures)) {
      return;
    }
    if (repetitionInstruction.type === RepetitionInstructionEnum.BackJumpLine) {
      // the renvoi sign of the repeat (see RepetitionInstructionReader.repeatOfRenvoi()), if any
      if (repetitionInstruction.SymbolPlacements.length > 0) {
        this.calculateSegnoSigns(repetitionInstruction, measures);
      }
      return;
    }
    // find first visible StaffLine
    let uppermostMeasure: VexFlowMeasure = undefined;
    for (let idx: number = 0, len: number = measures.length; idx < len; ++idx) {
      const graphicalMeasure: VexFlowMeasure = measures[idx];
      if (graphicalMeasure && graphicalMeasure.ParentStaffLine && graphicalMeasure.ParentStaff.isVisible()) {
        uppermostMeasure = <VexFlowMeasure>graphicalMeasure;
        break;
      }
    }
    // ToDo: feature/Repetitions
    // now create corresponding graphical symbol or Text in VexFlow:
    // use top measure and staffline for positioning.
    if (uppermostMeasure) {
      const repetition: VF.Repetition = uppermostMeasure.addWordRepetition(repetitionInstruction);
      this.placeWordRepetitionInSkyline(uppermostMeasure, repetition);
    }
  }

  /**
   * Draws the signs of a segno where the MusicXML puts them (RepetitionInstruction.SymbolPlacements):
   * above the staff of each sign, at the note of its timestamp (a sign at the start of the measure stays after the begin instructions).
   * @returns false if none of the staves is drawn, so that the segno is drawn above the uppermost one
   */
  protected calculateSegnoSigns(repetitionInstruction: RepetitionInstruction, measures: VexFlowMeasure[]): boolean {
    let drawn: boolean = false;
    for (const placement of repetitionInstruction.SymbolPlacements) {
      const measure: VexFlowMeasure = measures.find(m => m?.ParentStaffLine && m.ParentStaff === placement.staff && m.ParentStaff.isVisible());
      if (!measure) {
        continue;
      }
      // (the renvoi sign of a backward repeat is drawn as a segno too)
      const repetition: VF.Repetition = measure.addWordRepetition(repetitionInstruction.type === RepetitionInstructionEnum.Segno ?
        repetitionInstruction : new RepetitionInstruction(repetitionInstruction.measureIndex, RepetitionInstructionEnum.Segno));
      if (!repetition) {
        continue;
      }
      drawn = true;
      // a sign above a lower staff is between two staves: it reserves its space, so that the staves are spaced for it
      //   (and the objects below the staff above, e.g. a "Petite reprise" text, are not drawn into it)
      (repetition as any).reservesSkyline = measure !== measures.find(m => m?.ParentStaffLine && m.ParentStaff.isVisible());
      let anchorX: number = undefined;
      let atMeasureEnd: boolean = false;
      if (placement.timestamp.RealValue > 0) {
        // the first staff entry at or after the timestamp (e.g. after a rest or a grace note), else the measure end
        const entry: GraphicalStaffEntry = measure.staffEntries.find(e => e.relInMeasureTimestamp?.gte(placement.timestamp));
        atMeasureEnd = !entry;
        // the glyph is centered on the notehead (about 1.2 units wide), the sign (v8c at 30pt) is about 1.6 units wide;
        //   after the last note (a renvoi) it goes right before the end barline
        anchorX = entry ? entry.PositionAndShape.RelativePosition.x + 0.6 - 0.8 : measure.PositionAndShape.Size.width - 1.6 - 0.4;
      } else if (placement.below) {
        anchorX = measure.beginInstructionsWidth + 0.4;
      }
      let belowBaseline: number = undefined;
      if (placement.below) {
        // under what is below the staff there, and the place reserved: the glyph reaches about 2.7 units above its
        //   baseline and 0.6 below
        const left: number = measure.PositionAndShape.RelativePosition.x + anchorX;
        const calculator: SkyBottomLineCalculator = measure.ParentStaffLine.SkyBottomLineCalculator;
        let bottom: number = calculator.getBottomLineMaxInRange(left, left + 1.6);
        if (!isFinite(bottom) || bottom < 4) {
          bottom = 4;
        }
        belowBaseline = bottom + 0.5 + 2.7;
        calculator.updateBottomLineInRange(left, left + 1.6, belowBaseline + 0.6);
      }
      if (anchorX !== undefined) {
        (repetition as any).anchorX = anchorX;
        const anchorPx: number = anchorX * unitInPixels;
        (repetition as any).draw = function(stave: any): any {
          this.setRendered();
          const x: number = atMeasureEnd ? stave.getNoteEndX() - 1.6 * unitInPixels - 2 : stave.getX() + anchorPx;
          const y: number = belowBaseline !== undefined ?
            stave.getYForLine(0) + belowBaseline * unitInPixels :
            stave.getYForTopText(stave.options.num_lines) + this.y_shift + 25;
          (VF.Glyph as any).renderGlyph(stave.context, x, y, 30, "v8c", true);
          return this;
        };
      }
      if (belowBaseline === undefined) {
        this.placeWordRepetitionInSkyline(measure, repetition);
      }
    }
    return drawn;
  }

  /** The repetition instruction boxes already placed per staff line, for their mutual collision checks.
   *  (a WeakMap, so that the entries of a previous render's staff lines don't linger) */
  private placedWordRepetitionBoxes: WeakMap<StaffLine, {startX: number, endX: number, top: number}[]> = new WeakMap();

  /** The repetition instructions in their default place (placeWordRepetitionInSkyline()) reserve no skyline. */
  protected firstSystemUnreservedSymbolsTop(page: GraphicalMusicPage, left: number, right: number): number {
    const system: MusicSystem = page.MusicSystems[0];
    let top: number = undefined;
    for (const staffLine of system.StaffLines) {
      const x: number = system.PositionAndShape.RelativePosition.x + staffLine.PositionAndShape.RelativePosition.x;
      const y: number = system.PositionAndShape.RelativePosition.y + staffLine.PositionAndShape.RelativePosition.y;
      for (const box of this.placedWordRepetitionBoxes.get(staffLine) ?? []) {
        if (x + box.endX > left && x + box.startX < right) {
          top = top === undefined ? y + box.top : Math.min(top, y + box.top);
        }
      }
    }
    return top;
  }

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
  protected placeWordRepetitionInSkyline(measure: VexFlowMeasure, repetition: VF.Repetition): void {
    const staffLine: StaffLine = measure.ParentStaffLine;
    if (!repetition || !staffLine) {
      return;
    }
    const type: number = (repetition as any).symbol_type;
    const repetitionTypes: {[key: string]: number} = VF.Repetition.type as any;
    let text: string; // the texts drawn by staverepetition.js drawSymbolText()
    let hasCodaGlyphAfterText: boolean = false; // types that draw a coda glyph after the text
    switch (type) {
      case repetitionTypes.CODA_LEFT:
        text = "Coda";
        hasCodaGlyphAfterText = true;
        break;
      case repetitionTypes.TO_CODA:
        text = "To";
        hasCodaGlyphAfterText = true;
        break;
      case repetitionTypes.DC_AL_CODA:
        text = "D.C. al";
        hasCodaGlyphAfterText = true;
        break;
      case repetitionTypes.DS_AL_CODA:
        text = "D.S. al";
        hasCodaGlyphAfterText = true;
        break;
      case repetitionTypes.DC:
        text = "D.C.";
        break;
      case repetitionTypes.DC_AL_FINE:
        text = "D.C. al Fine";
        break;
      case repetitionTypes.DS:
        text = "D.S.";
        break;
      case repetitionTypes.DS_AL_FINE:
        text = "D.S. al Fine";
        break;
      case repetitionTypes.FINE:
        text = "Fine";
        break;
      default:
        text = ""; // segno/coda glyphs without text
        break;
    }
    // the words of the score, drawn instead of the text and coda glyph (see RepetitionInstruction.Words, addWordRepetition())
    const words: string = (repetition as any).text;
    if (words) {
      text = words;
      hasCodaGlyphAfterText = false;
    }
    const fontHeightUnits: number = 1.6; // staverepetition.js draws the text with a 12pt (16px) font
    let textWidthUnits: number = 0;
    if (text.length > 0 && this.rules.VexFlowTextFontFamily && MusicSheetCalculator.TextMeasurer.computeTextWidthInCssFont) {
      // measure in the CSS font that staverepetition.js draws with, whose family can also be a generic family or a list
      const measureFontSize: number = 20;
      textWidthUnits = MusicSheetCalculator.TextMeasurer.computeTextWidthInCssFont(
        text, `italic bold ${measureFontSize}px ${this.rules.VexFlowTextFontFamily}`) / measureFontSize * fontHeightUnits;
    } else if (text.length > 0) {
      // measure with the same font family string ("times") that staverepetition.js draws with,
      //   so that the measured width matches the drawn width even if the font falls back to another one
      textWidthUnits = MusicSheetCalculator.TextMeasurer.computeTextWidthToHeightRatio(
        text, Fonts.TimesNewRoman, FontStyles.BoldItalic, "times") * fontHeightUnits;
    }
    const glyphWidthUnits: number = 2.4; // coda/segno glyph width (plus the 12px gap after the text for symbol_x)
    const measureStartX: number = measure.PositionAndShape.RelativePosition.x;
    const measureWidth: number = measure.PositionAndShape.Size.width;
    let startX: number;
    let endX: number;
    if (type === repetitionTypes.SEGNO_LEFT && (repetition as any).anchorX !== undefined) {
      // a segno at a note, see calculateSegnoSigns()
      startX = measureStartX + (repetition as any).anchorX;
      endX = startX + 1.6;
    } else if (type === repetitionTypes.SEGNO_LEFT) {
      // drawSignoFixed() draws the glyph after the measure's begin instructions (clef, key, time signature):
      //   its x anchor additionally gets the stave's modifier x shift, which is the begin instructions width
      //   at draw time - and that can still change (e.g. shrink by alignment) after this calculation.
      //   So reserve a tolerant range around the begin instructions width.
      startX = measureStartX + measure.beginInstructionsWidth * 0.7;
      endX = measureStartX + measure.beginInstructionsWidth * 1.2 +
        measure.beginInstructionsWidth / unitInPixels + glyphWidthUnits;
    } else if (type === repetitionTypes.CODA_LEFT) {
      // drawn at the start of the measure (plus beginInstructionsWidth, which drawSymbolText uses as pixels)
      startX = measureStartX + measure.beginInstructionsWidth / unitInPixels;
      endX = startX + textWidthUnits + glyphWidthUnits;
    } else {
      // texts at the end of the measure, drawn right-aligned to the measure end
      //   (drawSymbolText: x_shift = -(text width + 12 + vertical_bar_width + 12), text_x = x + x_shift + vertical_bar_width,
      //   and the anchor x is the stave end minus the end barline width/padding, so roughly half a unit before the measure end)
      startX = measureStartX + measureWidth - 0.5 - textWidthUnits - 2.4;
      if (type === repetitionTypes.DC || type === repetitionTypes.DC_AL_FINE || type === repetitionTypes.DS ||
          type === repetitionTypes.DS_AL_FINE || type === repetitionTypes.FINE) {
        // these are additionally shifted to the right (only in the staffline's last measure, see addWordRepetition()),
        //   at most up to the measure's end, see xShiftAsPercentOfStaveWidth in staverepetition.js
        const shift: number = measureWidth * ((repetition as any).xShiftAsPercentOfStaveWidth ?? 0);
        startX += Math.max(0, Math.min(shift, measureStartX + measureWidth - (startX + textWidthUnits)));
      }
      endX = startX + textWidthUnits;
      if (hasCodaGlyphAfterText) {
        endX += glyphWidthUnits;
      }
    }
    // don't add a safety margin to the range: it would unnecessarily stack repetition marks
    //   that have a small gap between them. (the skyline sampling reads slightly beyond the range anyways)
    // clamp to the staffline (e.g. an end instruction of the last measure can be shifted beyond the staffline end)
    startX = Math.max(0, startX);
    endX = Math.min(staffLine.PositionAndShape.Size.width, endX);
    if (!(endX > startX)) {
      return;
    }
    // default drawing band of staverepetition.js, relative to the top staff line:
    //   the text baseline is at getYForTopText(5) + 25 + 5 = 3 units above the top staff line (plus y_shift),
    //   glyphs are anchored similarly, so the drawn objects roughly span [-4.5, -2.5] units
    const yShiftUnits: number = ((repetition as any).y_shift ?? 0) / unitInPixels; // -RepetitionSymbolsYOffset, see addWordRepetition
    const defaultTop: number = -4.5 + yShiftUnits;
    const defaultBottom: number = -2.5 + yShiftUnits;
    const skyBottomLineCalculator: SkyBottomLineCalculator = staffLine.SkyBottomLineCalculator;
    let collisionMin: number = skyBottomLineCalculator.getSkyLineMinInRange(startX, endX);
    if (collisionMin === -Infinity || collisionMin === Infinity) {
      collisionMin = 0;
    }
    // repetition instructions in their default position don't reserve skyline space (see below),
    //   so also check against the already placed repetition instructions of this staff line:
    let placedBoxes: {startX: number, endX: number, top: number}[] = this.placedWordRepetitionBoxes.get(staffLine);
    if (!placedBoxes) {
      placedBoxes = [];
      this.placedWordRepetitionBoxes.set(staffLine, placedBoxes);
    }
    for (const box of placedBoxes) {
      if (box.endX > startX && box.startX < endX) {
        collisionMin = Math.min(collisionMin, box.top);
      }
    }
    let collisionShiftUnits: number = 0;
    if (collisionMin < defaultBottom) {
      // something (e.g. a chord symbol or another repetition instruction) protrudes
      //   into the default position -> shift the repetition above it
      collisionShiftUnits = collisionMin - defaultBottom;
      repetition.setShiftY((repetition as any).y_shift + collisionShiftUnits * unitInPixels);
    }
    placedBoxes.push({ startX: startX, endX: endX, top: defaultTop + collisionShiftUnits });
    if (collisionShiftUnits < 0 || (repetition as any).reservesSkyline) {
      // only instructions that were shifted upwards (or segno signs above a lower staff, see calculateSegnoSigns())
      //   reserve their space in the skyline, so that the
      //   staffline borders (and thus the system spacing) account for them. Unshifted instructions stay
      //   in their default band close above the staff, which shouldn't increase the system spacing
      //   (as it also didn't before repetition instructions were placed via the skyline).
      skyBottomLineCalculator.updateSkyLineInRange(startX, endX, defaultTop + collisionShiftUnits);
    }
  }

  protected calculateSkyBottomLines(): void {
    const allStaffLines: StaffLine[] = CollectionUtil.flat(this.musicSystems.map(musicSystem => musicSystem.StaffLines));
    // the sky lines are measured without the previous layout's raises of ornaments over slurs (see layoutOrnament())
    for (const staffLine of allStaffLines) {
      for (const measure of staffLine.Measures) {
        (measure as VexFlowMeasure).resetOrnamentSlurClearance?.();
      }
    }

    // Lazy rendering: reuse the sky/bottom lines of stable interior systems computed in an
    // earlier growing-prefix batch, and only (re)compute the rest. The skyline pass is the dominant layout
    // cost; on a big score this turns the per-batch O(prefix) re-measure into O(new systems). The FIRST
    // system and the LAST system of the prefix are never cached/reused: empirically their lines change as
    // the prefix grows (first system) or as the last, unstretched system later becomes stretched/interior.
    // Only the geometric skyline path's side effects are replayable for reuse (see
    // SkyBottomLineCalculator.applyGeometricSkylineSideEffectsOnly); the raster path computes everything.
    const lazyCache: boolean = this.rules.LazyConsistentGraphic && this.rules.UseGeometricSkyBottomLineCalculation;
    const staffLinesToCompute: StaffLine[] = lazyCache ? [] : allStaffLines;
    const toCache: { key: string, staffLine: StaffLine }[] = [];
    // The geometric calculation formats every measure, i.e. each vertical measure once per staff, which mostly just repeats
    //   the same format: shared across the stafflines, this record of each vertical measure's last format skips the repeats.
    const lastMeasureFormats: Map<SourceMeasure, IVerticalMeasureFormat> = new Map<SourceMeasure, IVerticalMeasureFormat>();
    if (lazyCache) {
      const lastSystemIndex: number = this.musicSystems.length - 1;
      for (let si: number = 0; si < this.musicSystems.length; si++) {
        const cacheable: boolean = si !== 0 && si !== lastSystemIndex;
        const systemStaffLines: StaffLine[] = this.musicSystems[si].StaffLines;
        for (let li: number = 0; li < systemStaffLines.length; li++) {
          const staffLine: StaffLine = systemStaffLines[li];
          const key: string = this.skyBottomLineCacheKey(staffLine, li);
          const cached: { sky: number[], bottom: number[] } = key ? this.skyBottomLineCache.get(key) : undefined;
          if (cached) {
            // Replay the skyline calc's per-measure side effects (the VexFlow formatter is not idempotent,
            // so skipping them would shift later passes by ~1px), then reuse the verified byte-identical
            // cached lines instead of re-measuring extents (the expensive part).
            staffLine.SkyBottomLineCalculator.applyGeometricSkylineSideEffectsOnly(lastMeasureFormats);
            staffLine.SkyBottomLineCalculator.setLinesDirectly(cached.sky.slice(), cached.bottom.slice());
          } else {
            staffLinesToCompute.push(staffLine);
            if (cacheable && key) {
              toCache.push({ key, staffLine });
            }
          }
        }
      }
    }

    this.computeSkyBottomLinesFor(staffLinesToCompute, lastMeasureFormats);

    for (const entry of toCache) {
      this.skyBottomLineCache.set(entry.key, { sky: entry.staffLine.SkyLine.slice(), bottom: entry.staffLine.BottomLine.slice() });
    }
  }

  /** Compute (not reuse) the sky/bottom lines for the given staff lines: geometric, or the batched /
   *  per-staff-line path. This is the original calculateSkyBottomLines body, extracted so the lazy reuse
   *  path can feed it just the staff lines that actually need computing.
   *  lastMeasureFormats: for the geometric calculation, see SkyBottomLineCalculator.calculateLines(). */
  private computeSkyBottomLinesFor(staffLines: StaffLine[], lastMeasureFormats: Map<SourceMeasure, IVerticalMeasureFormat>): void {
    if (staffLines.length === 0) {
      return;
    }
    if (this.rules.UseGeometricSkyBottomLineCalculation) {
      // geometric calculation doesn't need batching: no canvas allocation or pixel readback (getImageData) is involved
      for (const staffLine of staffLines) {
        staffLine.SkyBottomLineCalculator.calculateLines(lastMeasureFormats);
      }
      return;
    }
    let numMeasures: number = 0; // number of graphical measures that are rendered
    for (const staffline of staffLines) {
      for (const measure of staffline.Measures) {
        if (measure) { // can be undefined and not rendered in multi-measure rest
          numMeasures++;
        }
      }
    }
    if (this.rules.AlwaysSetPreferredSkyBottomLineBackendAutomatically) {
      this.rules.setPreferredSkyBottomLineBackendAutomatically(numMeasures);
    }
    if (numMeasures >= this.rules.SkyBottomLineBatchMinMeasures) {
      const calculator: SkyBottomLineBatchCalculator = new SkyBottomLineBatchCalculator(
        staffLines, this.rules.PreferredSkyBottomLineBatchCalculatorBackend);
      calculator.calculateLines();
    } else {
      for (const staffLine of staffLines) {
        staffLine.SkyBottomLineCalculator.calculateLines();
      }
    }
  }

  /** Loading-path async mirror of {@link calculateSkyBottomLines}: identical lazy-cache reuse and output,
   *  but the (dominant) compute pass is chunked with event-loop yields. {@link onCellProcessed} reports
   *  (done, total) staff lines processed. */
  protected async calculateSkyBottomLinesAsync(yielder: CooperativeYielder,
                                               onCellProcessed?: (done: number, total: number) => void): Promise<void> {
    const allStaffLines: StaffLine[] = CollectionUtil.flat(this.musicSystems.map(musicSystem => musicSystem.StaffLines));

    // Same lazy reuse as calculateSkyBottomLines: reuse stable interior systems' cached lines, compute the rest.
    const lazyCache: boolean = this.rules.LazyConsistentGraphic && this.rules.UseGeometricSkyBottomLineCalculation;
    const staffLinesToCompute: StaffLine[] = lazyCache ? [] : allStaffLines;
    const toCache: { key: string, staffLine: StaffLine }[] = [];
    const lastMeasureFormats: Map<SourceMeasure, IVerticalMeasureFormat> = new Map<SourceMeasure, IVerticalMeasureFormat>();
    if (lazyCache) {
      const lastSystemIndex: number = this.musicSystems.length - 1;
      for (let si: number = 0; si < this.musicSystems.length; si++) {
        const cacheable: boolean = si !== 0 && si !== lastSystemIndex;
        const systemStaffLines: StaffLine[] = this.musicSystems[si].StaffLines;
        for (let li: number = 0; li < systemStaffLines.length; li++) {
          const staffLine: StaffLine = systemStaffLines[li];
          const key: string = this.skyBottomLineCacheKey(staffLine, li);
          const cached: { sky: number[], bottom: number[] } = key ? this.skyBottomLineCache.get(key) : undefined;
          if (cached) {
            staffLine.SkyBottomLineCalculator.applyGeometricSkylineSideEffectsOnly(lastMeasureFormats);
            staffLine.SkyBottomLineCalculator.setLinesDirectly(cached.sky.slice(), cached.bottom.slice());
          } else {
            staffLinesToCompute.push(staffLine);
            if (cacheable && key) {
              toCache.push({ key, staffLine });
            }
          }
        }
      }
    }

    await this.computeSkyBottomLinesForAsync(staffLinesToCompute, yielder, lastMeasureFormats, onCellProcessed);

    for (const entry of toCache) {
      this.skyBottomLineCache.set(entry.key, { sky: entry.staffLine.SkyLine.slice(), bottom: entry.staffLine.BottomLine.slice() });
    }
  }

  /** Async mirror of {@link computeSkyBottomLinesFor}: same computation, chunked with event-loop yields.
   *  The geometric and per-staff-line paths yield after each staff line; the batch path is a single native
   *  call, so we yield around it. */
  private async computeSkyBottomLinesForAsync(staffLines: StaffLine[], yielder: CooperativeYielder,
                                              lastMeasureFormats: Map<SourceMeasure, IVerticalMeasureFormat>,
                                              onCellProcessed?: (done: number, total: number) => void): Promise<void> {
    const total: number = staffLines.length;
    if (total === 0) {
      onCellProcessed?.(0, 0);
      return;
    }
    if (this.rules.UseGeometricSkyBottomLineCalculation) {
      let done: number = 0;
      for (const staffLine of staffLines) {
        staffLine.SkyBottomLineCalculator.calculateLines(lastMeasureFormats);
        done++;
        onCellProcessed?.(done, total);
        if (yielder.needsYield) { await yielder.yieldNow(); }
      }
      return;
    }
    let numMeasures: number = 0; // number of graphical measures that are rendered
    for (const staffline of staffLines) {
      for (const measure of staffline.Measures) {
        if (measure) {
          numMeasures++;
        }
      }
    }
    if (this.rules.AlwaysSetPreferredSkyBottomLineBackendAutomatically) {
      this.rules.setPreferredSkyBottomLineBackendAutomatically(numMeasures);
    }
    if (numMeasures >= this.rules.SkyBottomLineBatchMinMeasures) {
      if (yielder.needsYield) { await yielder.yieldNow(); }
      const calculator: SkyBottomLineBatchCalculator = new SkyBottomLineBatchCalculator(
        staffLines, this.rules.PreferredSkyBottomLineBatchCalculatorBackend);
      calculator.calculateLines();
      onCellProcessed?.(total, total);
      if (yielder.needsYield) { await yielder.yieldNow(); }
    } else {
      let done: number = 0;
      for (const staffLine of staffLines) {
        staffLine.SkyBottomLineCalculator.calculateLines();
        done++;
        onCellProcessed?.(done, total);
        if (yielder.needsYield) { await yielder.yieldNow(); }
      }
    }
  }

  /**
   * Places the words of multiExpression (see super), then stacks each new words label clear of the dynamics and wedges
   * of its staffline, see restackWordsClearOfDynamics().
   */
  protected calculateMoodAndUnknownExpression(multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void {
    const staffLine: StaffLine = this.graphicalMusicSheet.MeasureList[measureIndex]?.[staffIndex]?.ParentStaffLine;
    const known: Set<AbstractGraphicalExpression> = new Set(staffLine?.AbstractExpressions);
    super.calculateMoodAndUnknownExpression(multiExpression, measureIndex, staffIndex);
    if (!staffLine) {
      return;
    }
    const words: GraphicalUnknownExpression[] = [];
    for (const expression of staffLine.AbstractExpressions) {
      if (expression instanceof GraphicalUnknownExpression && !known.has(expression)) {
        known.add(expression);
        words.push(expression);
      }
    }
    if (words.length > 0) {
      this.restackWordsClearOfDynamics(staffLine, words);
    }
  }

  /**
   * calculateLabel() places a words label at the sky/bottom line, which the dynamics and wedges (aligned onto a common
   * baseline before, see calculateExpressionAlignements()) have raised: the label's text touches them, and its box,
   * whose top/bottom margin reaches beyond the text, overlaps theirs (Enescu, Cantabile et Presto m37-38 on one system:
   * "cédez" under the third sf of m38). Stack such words DynamicExpressionSpacer beyond the dynamics and wedges and update
   * the sky/bottom line for their new position.
   * (Same as osmd-dart's VexFlowMusicSheetCalculator._restackWordsClearOfDynamics, which runs after the alignment there.)
   */
  private restackWordsClearOfDynamics(staffLine: StaffLine, words: GraphicalUnknownExpression[]): void {
    const boxes: { placement: PlacementEnum, left: number, right: number, top: number, bottom: number }[] = [];
    for (const expression of staffLine.AbstractExpressions) {
      if (expression instanceof GraphicalInstantaneousDynamicExpression) {
        const box: BoundingBox = expression.PositionAndShape;
        boxes.push({
          bottom: box.RelativePosition.y + box.BorderMarginBottom,
          left: box.RelativePosition.x + box.BorderMarginLeft,
          placement: expression.Placement,
          right: box.RelativePosition.x + box.BorderMarginRight,
          top: box.RelativePosition.y + box.BorderMarginTop,
        });
      } else if (expression instanceof GraphicalContinuousDynamicExpression) {
        const x0: number = expression.PositionAndShape.RelativePosition.x;
        const y0: number = expression.PositionAndShape.RelativePosition.y;
        if (expression.IsVerbal) {
          // the label is placed inside the expression's box
          const box: BoundingBox = expression.Label.PositionAndShape;
          boxes.push({
            bottom: y0 + box.RelativePosition.y + box.BorderMarginBottom,
            left: x0 + box.RelativePosition.x + box.BorderMarginLeft,
            placement: expression.ContinuousDynamic.Placement,
            right: x0 + box.RelativePosition.x + box.BorderMarginRight,
            top: y0 + box.RelativePosition.y + box.BorderMarginTop,
          });
        } else if (expression.Lines.length >= 2) {
          const box: BoundingBox = expression.PositionAndShape;
          boxes.push({
            bottom: y0 + box.BorderMarginBottom,
            left: x0 + box.BorderMarginLeft,
            placement: expression.ContinuousDynamic.Placement,
            right: x0 + box.BorderMarginRight,
            top: y0 + box.BorderMarginTop,
          });
        }
      }
    }
    if (boxes.length === 0) {
      return;
    }
    for (const word of words) {
      const below: boolean = word.Placement === PlacementEnum.Below;
      if (!below && word.Placement !== PlacementEnum.Above) {
        continue;
      }
      const label: BoundingBox = word.Label.PositionAndShape;
      const left: number = label.RelativePosition.x + label.BorderMarginLeft;
      const right: number = label.RelativePosition.x + label.BorderMarginRight;
      let top: number = label.RelativePosition.y + label.BorderMarginTop;
      let bottom: number = label.RelativePosition.y + label.BorderMarginBottom;
      let shift: number = 0;
      // moving past one box can run into the next one further out
      for (let pass: number = 0; pass < boxes.length; pass++) {
        let moved: boolean = false;
        for (const box of boxes) {
          if (box.placement !== word.Placement || box.left >= right || left >= box.right ||
              box.top - this.rules.DynamicExpressionSpacer >= bottom || top >= box.bottom + this.rules.DynamicExpressionSpacer) {
            continue;
          }
          const delta: number = below ? box.bottom + this.rules.DynamicExpressionSpacer - top :
            box.top - this.rules.DynamicExpressionSpacer - bottom;
          top += delta;
          bottom += delta;
          shift += delta;
          moved = true;
        }
        if (!moved) {
          break;
        }
      }
      if (shift !== 0) {
        label.RelativePosition = new PointF2D(label.RelativePosition.x, label.RelativePosition.y + shift);
        word.updateSkyBottomLine();
      }
    }
  }

  /**
   * Re-adjust the x positioning of expressions. Update the skyline afterwards
   */
  protected calculateExpressionAlignements(): void {
    for (const musicSystem of this.musicSystems) {
      for (const staffLine of musicSystem.StaffLines) {
        try {
          (<VexFlowStaffLine>staffLine).AlignmentManager.alignDynamicExpressions();
          staffLine.AbstractExpressions.forEach(ae => {
            ae.updateSkyBottomLine();
          });
        } catch (e) {
          // TODO still necessary when calculation of expression fails, see calculateDynamicExpressionsForMultiExpression()
          //   see calculateGraphicalContinuousDynamic(), also in MusicSheetCalculator.
        }
      }
    }
  }


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
  protected handleTiedGraphicalNote(tiedGraphicalNote: GraphicalNote, beams: Beam[], activeClef: ClefInstruction,
                                    octaveShiftValue: OctaveEnum, graphicalStaffEntry: GraphicalStaffEntry, duration: Fraction,
                                    openTie: Tie, isLastTieNote: boolean): void {
    return;
  }

  /**
   * Is called if a note is part of a beam.
   * @param graphicalNote
   * @param beam
   * @param openBeams a list of all currently open beams
   */
  protected handleBeam(graphicalNote: GraphicalNote, beam: Beam, openBeams: Beam[]): void {
    (graphicalNote.parentVoiceEntry.parentStaffEntry.parentMeasure as VexFlowMeasure).handleBeam(graphicalNote, beam);
  }

  protected handleVoiceEntryLyrics(voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry, lyricWords: LyricWord[]): void {
    voiceEntry.LyricsEntries.forEach((key: string, lyricsEntry: LyricsEntry) => {
      const graphicalLyricEntry: GraphicalLyricEntry = new GraphicalLyricEntry(lyricsEntry,
                                                                               graphicalStaffEntry,
                                                                               this.rules.LyricsHeight,
                                                                               this.rules.StaffHeight);

      graphicalStaffEntry.LyricsEntries.push(graphicalLyricEntry);

      // create corresponding GraphicalLabel
      const graphicalLabel: GraphicalLabel = graphicalLyricEntry.GraphicalLabel;
      graphicalLabel.setLabelPositionAndShapeBorders();

      if (lyricsEntry.Word) {
        graphicalLyricEntry.ParentLyricWord = this.registerGraphicalLyricWord(lyricsEntry.Word, graphicalLyricEntry, lyricWords);
      }
      if (lyricsEntry.NextWord) { // the word begun by the second syllable of the entry's elision
        graphicalLyricEntry.NextLyricWord = this.registerGraphicalLyricWord(lyricsEntry.NextWord, graphicalLyricEntry, lyricWords);
      }
    });
  }

  /** Enters graphicalLyricEntry into the GraphicalLyricWord of word (created when word is new), which is kept in
   *  this.graphicalLyricWords, in step with the open lyricWords, until every syllable has its graphical entry. */
  private registerGraphicalLyricWord(word: LyricWord, graphicalLyricEntry: GraphicalLyricEntry, lyricWords: LyricWord[]): GraphicalLyricWord {
    const lyricsEntryIndex: number = word.Syllables.indexOf(graphicalLyricEntry.LyricsEntry);
    let index: number = lyricWords.indexOf(word);
    if (index === -1) {
      lyricWords.push(word);
      index = lyricWords.indexOf(word);
    }
    let graphicalLyricWord: GraphicalLyricWord;
    if (this.graphicalLyricWords.length === 0 || index > this.graphicalLyricWords.length - 1) {
      graphicalLyricWord = new GraphicalLyricWord(word);
      graphicalLyricWord.GraphicalLyricsEntries[lyricsEntryIndex] = graphicalLyricEntry;
      this.graphicalLyricWords.push(graphicalLyricWord);
    } else {
      graphicalLyricWord = this.graphicalLyricWords[index];
      graphicalLyricWord.GraphicalLyricsEntries[lyricsEntryIndex] = graphicalLyricEntry;
      if (graphicalLyricWord.isFilled()) {
        lyricWords.splice(index, 1);
        this.graphicalLyricWords.splice(this.graphicalLyricWords.indexOf(graphicalLyricWord), 1);
      }
    }
    return graphicalLyricWord;
  }

  protected handleVoiceEntryOrnaments(ornamentContainer: OrnamentContainer, voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry): void {
    return;
  }

  /**
   * Raise an ornament above the notes over a slur above that would touch it, after the slurs are laid out.
   * A slur clears an ornament under it when it can (GraphicalSlur.liftOverOrnaments()); an ornament over the
   * slur's first or last note, or one the slur would need a steep arch to clear, goes over the slur, with
   * GraphicalSlur.ornamentClearance between them (Couperin, Concerts royaux I Prelude m7: the pincé over F#5, after
   * the grace note the slur starts on). Over a slur the clearance counts from the slur's outer edge, drawn
   * GraphicalSlur.thickness over its curve. The sky line reserves the ornament's new place.
   */
  protected layoutOrnament(ornaments: OrnamentContainer, voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry): void {
    const measure: VexFlowMeasure = graphicalStaffEntry.parentMeasure as VexFlowMeasure;
    const staffLine: StaffLine = measure.ParentStaffLine;
    if (!staffLine || !measure.OrnamentInk) {
      return;
    }
    const ornamentsOfEntry: any[] = [];
    for (const gve of graphicalStaffEntry.graphicalVoiceEntries) {
      if (gve.parentVoiceEntry === voiceEntry) {
        ornamentsOfEntry.push(...((gve as VexFlowVoiceEntry).vfStaveNote as any)?.getModifiers?.() ?? []);
      }
    }
    for (const ink of measure.OrnamentInk) {
      if (ornamentsOfEntry.indexOf(ink.ornament) < 0) {
        continue;
      }
      const raise: number = VexFlowMusicSheetCalculator.raiseOverSlursAbove(ink, staffLine);
      if (raise > 0) {
        ink.ornament.slurClearanceYShift = -raise * unitInPixels;
        staffLine.SkyBottomLineCalculator.updateSkyLineInRange(ink.left, ink.right, ink.top - raise);
        this.marksRaisedOverSlurs.push({ staffLine, left: ink.left, right: ink.right, top: ink.top - raise, bottom: ink.bottom - raise });
      }
    }
    // The same below the notes (a lower voice, Couperin, Concerts royaux I Menuet en trio): an ornament a slur
    //   below would touch goes under the slur.
    for (const ink of measure.BelowOrnamentInk) {
      if (ornamentsOfEntry.indexOf(ink.ornament) < 0) {
        continue;
      }
      const drop: number = VexFlowMusicSheetCalculator.dropUnderSlursBelow(ink, staffLine);
      if (drop > 0) {
        ink.ornament.slurClearanceYShift = drop * unitInPixels;
        staffLine.SkyBottomLineCalculator.updateBottomLineInRange(ink.left, ink.right, ink.bottom + drop);
      }
    }
  }

  /** How far ink below the notes goes down to clear the slurs below that would touch it (0: none), like raiseOverSlursAbove(). */
  private static dropUnderSlursBelow(ink: { left: number, right: number, top: number, bottom: number }, staffLine: StaffLine,
                                     inside: number = GraphicalSlur.ornamentClearance - 0.1): number {
    const clearance: number = GraphicalSlur.ornamentClearance;
    const over: number = clearance + GraphicalSlur.thickness;
    let drop: number = 0;
    for (const slur of staffLine.GraphicalSlurs) {
      if (slur.placement !== PlacementEnum.Below || !slur.bezierStartPt) {
        continue;
      }
      let curveBottom: number = Number.NEGATIVE_INFINITY;
      let touches: boolean = false;
      for (let i: number = 0; i <= 128; i++) {
        const point: PointF2D = slur.calculateCurvePointAtIndex(i / 128);
        if (point.x < ink.left || point.x > ink.right) {
          continue;
        }
        curveBottom = Math.max(curveBottom, point.y);
        if (point.y > ink.top - over + 0.1 && point.y < ink.bottom + inside) {
          touches = true;
        }
      }
      if (touches) {
        drop = Math.max(drop, curveBottom + over - ink.top);
      }
    }
    return drop;
  }

  /** How far ink above the notes goes up to clear the slurs above that would touch it (0: none), see layoutOrnament().
   *  A slur over the ink clears it when it stays inside over its top (a slur lifted over an ornament clears it by the
   *  full clearance; one over a tuplet number by any space, see layoutFermatasOverSlurs()). */
  private static raiseOverSlursAbove(ink: { left: number, right: number, top: number, bottom: number }, staffLine: StaffLine,
                                     inside: number = GraphicalSlur.ornamentClearance - 0.1): number {
    const clearance: number = GraphicalSlur.ornamentClearance;
    const over: number = clearance + GraphicalSlur.thickness;
    let raise: number = 0;
    for (const slur of staffLine.GraphicalSlurs) {
      if (slur.placement !== PlacementEnum.Above || !slur.bezierStartPt) {
        continue;
      }
      let curveTop: number = Number.POSITIVE_INFINITY;
      let touches: boolean = false;
      for (let i: number = 0; i <= 128; i++) {
        const point: PointF2D = slur.calculateCurvePointAtIndex(i / 128);
        if (point.x < ink.left || point.x > ink.right) {
          continue;
        }
        curveTop = Math.min(curveTop, point.y);
        if (point.y > ink.top - inside && point.y < ink.bottom + over - 0.1) {
          touches = true;
        }
      }
      if (touches) {
        raise = Math.max(raise, ink.bottom + over - curveTop);
      }
    }
    return raise;
  }

  /**
   * A fermata above a note goes over a slur above that would touch it, like an ornament (layoutOrnament()): the slur
   * ends at its note's stem, where the fermata is (Torelli, Tu lo sai, piano m38 and m44; Giordani, Caro mio ben, voice m29:
   * the slur from the fermata's note). The sky line reserves the fermata's new place.
   */
  /** The fermatas and above-staff ornaments of the staff line's measures where they are drawn (with their raise over a slur),
   *  for the measure numbers (raiseMeasureNumbersOverRaisedMarks()). */
  protected measureMarkInk(staffLine: StaffLine): { staffLine: StaffLine, left: number, right: number, top: number, bottom: number }[] {
    const marks: { staffLine: StaffLine, left: number, right: number, top: number, bottom: number }[] = [];
    for (const measure of staffLine.Measures) {
      if (!(measure instanceof VexFlowMeasure)) {
        continue;
      }
      for (const ink of measure.FermataInk) {
        const shift: number = (ink.fermata.slurClearanceYShift ?? 0) / unitInPixels;
        marks.push({ staffLine, left: ink.left, right: ink.right, top: ink.top + shift, bottom: ink.bottom + shift });
      }
      for (const ink of measure.OrnamentInk) {
        const shift: number = (ink.ornament.slurClearanceYShift ?? 0) / unitInPixels;
        marks.push({ staffLine, left: ink.left, right: ink.right, top: ink.top + shift, bottom: ink.bottom + shift });
      }
    }
    return marks;
  }

  protected layoutFermatasOverSlurs(measure: GraphicalMeasure): void {
    const staffLine: StaffLine = measure.ParentStaffLine;
    if (!staffLine || !(measure instanceof VexFlowMeasure)) {
      return;
    }
    for (const ink of measure.FermataInk) {
      const raise: number = VexFlowMusicSheetCalculator.raiseOverSlursAbove(ink, staffLine);
      if (raise > 0) {
        ink.fermata.slurClearanceYShift = -raise * unitInPixels;
        staffLine.SkyBottomLineCalculator.updateSkyLineInRange(ink.left, ink.right, ink.top - raise);
        this.marksRaisedOverSlurs.push({ staffLine, left: ink.left, right: ink.right, top: ink.top - raise, bottom: ink.bottom - raise });
      }
    }
    // Accents and marcatos go outside a slur on their side that would touch them (GraphicalSlur.goesOutsideSlurs()): the
    //   slur starts and ends at its notes, the accent moves over (under) it. As in osmd-dart.
    for (const ink of measure.AccentInk) {
      if (ink.above) {
        const raise: number = VexFlowMusicSheetCalculator.raiseOverSlursAbove(ink, staffLine);
        if (raise > 0) {
          ink.accent.slurClearanceYShift = -raise * unitInPixels;
          staffLine.SkyBottomLineCalculator.updateSkyLineInRange(ink.left, ink.right, ink.top - raise);
          this.marksRaisedOverSlurs.push({ staffLine, left: ink.left, right: ink.right, top: ink.top - raise, bottom: ink.bottom - raise });
        }
      } else {
        const drop: number = VexFlowMusicSheetCalculator.dropUnderSlursBelow(ink, staffLine);
        if (drop > 0) {
          ink.accent.slurClearanceYShift = drop * unitInPixels;
          staffLine.SkyBottomLineCalculator.updateBottomLineInRange(ink.left, ink.right, ink.bottom + drop);
        }
      }
    }
    // A tuplet number a slur on its side would touch goes outside the slur: a bracketed tuplet with its bracket
    //   (Bellini, Torna, vezzosa Fillide m104, L'allegro marinaro m37), an unbracketed number the slur can't clear
    //   (GraphicalSlur lifts a slur over a number in its middle half when that takes a modest raise; Per pietà, bell'idol
    //   mio m58). A number under a slur that clears it at all stays inside. As in osmd-dart.
    for (const ink of measure.TupletNumberInk) {
      const options: any = ink.tuplet.options;
      if (ink.above) {
        // (over one slur it can meet another one over both: Lotti, Pur dicesti, o bocca bella m163, a slur over two
        //   triplets and one over the first two notes)
        let raise: number = 0;
        for (let pass: number = 0; pass < 3; pass++) {
          const more: number = VexFlowMusicSheetCalculator.raiseOverSlursAbove(
            { left: ink.left, right: ink.right, top: ink.top - raise, bottom: ink.bottom - raise }, staffLine, 0);
          if (more <= 0) {
            break;
          }
          raise += more;
        }
        if (raise > 0) {
          options.y_offset = (options.y_offset || 0) - raise * unitInPixels;
          staffLine.SkyBottomLineCalculator.updateSkyLineInRange(ink.left, ink.right, ink.top - raise);
          this.marksRaisedOverSlurs.push({ staffLine, left: ink.left, right: ink.right, top: ink.top - raise, bottom: ink.bottom - raise });
        }
      } else {
        let drop: number = 0;
        for (let pass: number = 0; pass < 3; pass++) {
          const more: number = VexFlowMusicSheetCalculator.dropUnderSlursBelow(
            { left: ink.left, right: ink.right, top: ink.top + drop, bottom: ink.bottom + drop }, staffLine, 0);
          if (more <= 0) {
            break;
          }
          drop += more;
        }
        if (drop > 0) {
          options.y_offset = (options.y_offset || 0) + drop * unitInPixels;
          staffLine.SkyBottomLineCalculator.updateBottomLineInRange(ink.left, ink.right, ink.bottom + drop);
        }
      }
    }
  }

  /**
   * Add articulations to the given vexflow staff entry.
   * @param articulations
   * @param voiceEntry
   * @param graphicalStaffEntry
   */
  protected handleVoiceEntryArticulations(articulations: Articulation[],
                                          voiceEntry: VoiceEntry, staffEntry: GraphicalStaffEntry): void {
    // uncomment this when implementing:
    // let vfse: VexFlowStaffEntry = (graphicalStaffEntry as VexFlowStaffEntry);

    return;
  }

  /**
   * Add technical instructions to the given vexflow staff entry.
   * @param technicalInstructions
   * @param voiceEntry
   * @param staffEntry
   */
  protected handleVoiceEntryTechnicalInstructions(technicalInstructions: TechnicalInstruction[],
                                                  voiceEntry: VoiceEntry, staffEntry: GraphicalStaffEntry): void {
    // uncomment this when implementing:
    // let vfse: VexFlowStaffEntry = (graphicalStaffEntry as VexFlowStaffEntry);
    return;
  }

  /**
   * Is called if a note is part of a tuplet.
   * @param graphicalNote
   * @param tuplet
   * @param openTuplets a list of all currently open tuplets
   */
  protected handleTuplet(graphicalNote: GraphicalNote, tuplet: Tuplet, openTuplets: Tuplet[]): void {
    (graphicalNote.parentVoiceEntry.parentStaffEntry.parentMeasure as VexFlowMeasure).handleTuplet(graphicalNote, tuplet);
  }

  /**
   * Find the Index of the item of the array of all VexFlow Slurs that holds a specified slur
   * @param gSlurs
   * @param slur
   */
  public findIndexGraphicalSlurFromSlur(gSlurs: GraphicalSlur[], slur: Slur): number {
    for (let slurIndex: number = 0; slurIndex < gSlurs.length; slurIndex++) {
      if (gSlurs[slurIndex].slur === slur) {
        return slurIndex;
      }
    }
    return -1;
  }
  public indexOfGraphicalGlissFromGliss(gGlissandi: GraphicalGlissando[], glissando: Glissando): number {
    for (let glissIndex: number = 0; glissIndex < gGlissandi.length; glissIndex++) {
      if (gGlissandi[glissIndex].Glissando === glissando) {
        return glissIndex;
      }
    }
    return -1;
  }
  /* VexFlow Version - for later use
  public findIndexVFSlurFromSlur(vfSlurs: VexFlowSlur[], slur: Slur): number {
        for (let slurIndex: number = 0; slurIndex < vfSlurs.length; slurIndex++) {
            if (vfSlurs[slurIndex].vfSlur === slur) {
                return slurIndex;
            }
        }
  }
  */

  // Generate all Graphical Slurs and attach them to the staffline
  /** Returns whether a repeat sign replaces the note's graphical measure. */
  private measureRepeatHidesNote(note: Note): boolean {
    const parentMeasure: GraphicalMeasure = this.rules.GNote(note)?.parentVoiceEntry?.parentStaffEntry?.parentMeasure;
    return parentMeasure?.NotesAreAbbreviated === true;
  }

  /**
   * Whether a slur from one staff of an instrument to the other is drawn as two pieces, one on each staff, instead of
   * one curve between the placed staves (CrossStaffCurve): when its notes are in different systems (Schumann, Myrthen 15
   * m5-7 in both platforms' layouts; the curve between two staves can't be drawn across a system break). In one system
   * the slur is one curve however far its notes are (Myrthen 14 m12-14, 15 m41-43: the curve clears the notes between
   * them, decision Q1 10-08). Same as osmd-dart.
   */
  private crossStaffSlurIsSplit(slur: Slur): boolean {
    if (!slur.isCrossed()) {
      return false;
    }
    const startMeasure: GraphicalMeasure = this.rules.GNote(slur.StartNote)?.parentVoiceEntry?.parentStaffEntry?.parentMeasure;
    const endMeasure: GraphicalMeasure = this.rules.GNote(slur.EndNote)?.parentVoiceEntry?.parentStaffEntry?.parentMeasure;
    if (!startMeasure?.ParentStaffLine || !endMeasure?.ParentStaffLine) {
      return false;
    }
    return startMeasure.ParentStaffLine.ParentMusicSystem !== endMeasure.ParentStaffLine.ParentMusicSystem;
  }

  /**
   * The CrossStaffCurve of a slur from the start entry's note to a note on another staff of the same system — or, both
   * notes on one staff, over its voice's notes on innerLine (sameStaffSlurInnerLine()) — held by the measures it spans
   * on both staves; undefined when its end note is not placed in this system.
   */
  private crossStaffCurveOf(gSlur: GraphicalSlur, startEntry: GraphicalStaffEntry, innerLine: StaffLine = undefined): CrossStaffCurve {
    const slur: Slur = gSlur.slur;
    const start: GraphicalNote = this.rules.GNote(slur.StartNote);
    const end: GraphicalNote = slur.EndNote ? this.rules.GNote(slur.EndNote) : undefined;
    const startLine: StaffLine = startEntry.parentMeasure.ParentStaffLine;
    const endLine: StaffLine = end?.parentVoiceEntry?.parentStaffEntry?.parentMeasure?.ParentStaffLine;
    const sameStaff: boolean = !!startLine && startLine === endLine;
    const otherLine: StaffLine = sameStaff ? innerLine : endLine;
    if (!start || !end || !startLine || !endLine || !otherLine || startLine === otherLine ||
        startLine.ParentMusicSystem !== endLine.ParentMusicSystem || startLine.ParentMusicSystem !== otherLine.ParentMusicSystem) {
      return undefined;
    }
    const from: number = slur.StartNote.SourceMeasure.measureListIndex;
    const to: number = slur.EndNote.SourceMeasure.measureListIndex;
    const participants: GraphicalMeasure[] = [];
    for (const line of [startLine, otherLine]) {
      for (const measure of line.Measures) {
        const index: number = measure.parentSourceMeasure?.measureListIndex;
        if (index !== undefined && index >= from && index <= to) {
          participants.push(measure);
        }
      }
    }
    const curve: CrossStaffCurve = CrossStaffCurve.slur(gSlur, start, end, participants, sameStaff ? otherLine : undefined);
    for (const measure of participants) {
      (measure as VexFlowMeasure).crossStaffCurves?.push(curve);
    }
    gSlur.crossStaffCurve = curve;
    return curve;
  }

  /** Forgets the curves between staves of the last layout: the measures are kept from one layout to the next. */
  protected clearCrossStaffCurves(): void {
    for (const measures of this.graphicalMusicSheet.MeasureList) {
      for (const measure of measures) {
        if (measure instanceof VexFlowMeasure) {
          measure.crossStaffCurves = [];
        }
      }
    }
  }

  /** A tie from one staff of an instrument to another staff of it in the same system: one curve between the placed
   *  staves (CrossStaffCurve), not a VexFlow StaveTie (it can't arch between two staves' notes: it ran nearly straight
   *  across both and the beams between them, Schumann, Myrthen 10 m72-73) nor two stubs (10-07). Held by the start and
   *  the end note's measures. Same as osmd-dart VexFlowMeasure._buildTies. */
  protected layoutCrossStaffTie(tie: GraphicalTie): void {
    if (!tie.StartNote || !tie.EndNote) {
      return;
    }
    const startMeasure: GraphicalMeasure = tie.StartNote.parentVoiceEntry.parentStaffEntry.parentMeasure;
    const endMeasure: GraphicalMeasure = tie.EndNote.parentVoiceEntry.parentStaffEntry.parentMeasure;
    const curve: CrossStaffCurve = CrossStaffCurve.tie(tie.StartNote, tie.EndNote,
                                                       tie.Tie.getTieDirection(tie.StartNote.sourceNote), [startMeasure, endMeasure]);
    for (const measure of curve.participants) {
      (measure as VexFlowMeasure).crossStaffCurves?.push(curve);
    }
  }

  /** A slur's curve between two staves is calculated with the staves' preliminary distance to reserve its outer sides
   *  (over the upper staff, under the lower one) before the expressions are placed; the drawer calculates it again
   *  between the placed staves (CrossStaffCurve). */
  protected reserveCrossStaffCurves(): void {
    for (const musicSystem of this.musicSystems) {
      const geometry: CrossStaffCurveLayoutGeometry = new CrossStaffCurveLayoutGeometry(musicSystem.PositionAndShape);
      for (const staffLine of musicSystem.StaffLines) {
        for (const gSlur of staffLine.GraphicalSlurs) {
          const curve: CrossStaffCurve = gSlur.crossStaffCurve;
          if (curve && curve.calculate(this.rules, geometry)) {
            curve.reserveOuterSides(this.rules, geometry);
          }
        }
      }
    }
  }

  /**
   * For a slur placed above whose two notes lie on one staff while its voice's notes between them lie on the staff
   * above (Bellini, Sogno d'infanzia m36 and 41 more, L'allegro marinaro m33-41: the left hand's E3 to its G3 over the
   * right hand's E4 C4 under a cross-staff beam — the source arches over the beam and those notes, an ordinary slur,
   * clearing its own staff only, ran under the beam across the stems; decision Q1 10-08, A), the staff line of those
   * notes: the slur is one curve over them and the beam as a slur between the staves (CrossStaffCurve, innerLine).
   * Undefined for an ordinary slur: its voice's notes between on its own staff or on a staff below, placed below or
   * not placed (below the left hand is right as it is), or its notes in different systems (two pieces as usual). Only
   * a note beamed with a note of the slur's staff counts — the voice itself crossing over: a voice number used on both
   * staves for two lines at once (Parisotti E03 m12: the left hand's D3-D2 under the right hand's C4s of "voice 2") or
   * a figure beamed staff by staff (Myrthen 3 m2: the left hand's run, the right hand's own beam, the source's slur
   * under the right hand) stays an ordinary slur. Same as osmd-dart.
   */
  private sameStaffSlurInnerLine(slur: Slur): StaffLine {
    const startNote: Note = slur.StartNote;
    const endNote: Note = slur.EndNote;
    if (!startNote || !endNote || slur.isCrossed() || !this.rules.SlurPlacementFromXML || slur.PlacementXml !== PlacementEnum.Above) {
      return undefined;
    }
    const start: GraphicalNote = this.rules.GNote(startNote);
    const end: GraphicalNote = this.rules.GNote(endNote);
    const startLine: StaffLine = start?.parentVoiceEntry?.parentStaffEntry?.parentMeasure?.ParentStaffLine;
    const endLine: StaffLine = end?.parentVoiceEntry?.parentStaffEntry?.parentMeasure?.ParentStaffLine;
    if (!startLine || startLine !== endLine) {
      return undefined;
    }
    const from: number = startNote.getAbsoluteTimestamp().RealValue;
    const to: number = endNote.getAbsoluteTimestamp().RealValue;
    for (const voiceEntry of startNote.ParentVoiceEntry.ParentVoice.VoiceEntries) {
      if (voiceEntry.IsGrace) {
        continue;
      }
      for (const note of voiceEntry.Notes) {
        if (note.isRest() || !note.PrintObject || note.ParentStaff === startNote.ParentStaff) {
          continue;
        }
        const time: number = note.getAbsoluteTimestamp().RealValue;
        if (time <= from || time >= to) {
          continue;
        }
        if (!note.NoteBeam?.Notes.some(beamed => beamed.ParentStaff === startNote.ParentStaff)) {
          continue;
        }
        const line: StaffLine = this.rules.GNote(note)?.parentVoiceEntry?.parentStaffEntry?.parentMeasure?.ParentStaffLine;
        if (!line || line.ParentMusicSystem !== startLine.ParentMusicSystem) {
          continue;
        }
        if (line.PositionAndShape.RelativePosition.y < startLine.PositionAndShape.RelativePosition.y) {
          return line;
        }
      }
    }
    return undefined;
  }

  /**
   * Whether a slur between two staves, drawn as two pieces (crossStaffSlurIsSplit()), runs between the staves
   * (CrossStaffCurve.runsBetweenStaves(), the same rule on the layout's boxes: placed below, ending on the lower staff
   * above its top line): its end piece on the lower staff then lies above it (GraphicalSlur.pieceSide), where the one
   * curve of the same slur in one system ends (Bellini, Torna vezzosa Fillide m2-5 on the web: over the left hand to
   * the top of its D4). Not between two notes of one beam (Myrthen 1 m8).
   */
  private slurRunsBetweenStaves(slur: Slur): boolean {
    const startNote: Note = slur.StartNote;
    const endNote: Note = slur.EndNote;
    const xml: PlacementEnum = slur.PlacementXml;
    if (!startNote || !endNote || !this.rules.SlurPlacementFromXML || xml !== PlacementEnum.Above && xml !== PlacementEnum.Below) {
      return false;
    }
    const end: GraphicalNote = this.rules.GNote(endNote);
    if (!end) {
      return false;
    }
    const endIsLower: boolean = endNote.ParentStaff.idInMusicSheet > startNote.ParentStaff.idInMusicSheet;
    if (xml !== PlacementEnum.Below || !endIsLower || startNote.NoteBeam && startNote.NoteBeam === endNote.NoteBeam) {
      return false;
    }
    return VexFlowMusicSheetCalculator.noteYOnStaffLine(end) < -0.25;
  }

  /** The note's y relative to its staff line's top line, in units (the layout's boxes). */
  private static noteYOnStaffLine(note: GraphicalNote): number {
    const line: BoundingBox = note.parentVoiceEntry?.parentStaffEntry?.parentMeasure?.ParentStaffLine?.PositionAndShape;
    let y: number = 0;
    for (let box: BoundingBox = note.PositionAndShape; box && box !== line; box = box.Parent) {
      y += box.RelativePosition.y;
    }
    return y;
  }

  /**
   * Whether the end piece of a slur drawn as two pieces needs the measure before its end note's: the end note sounds at
   * the start of its measure, which does not begin its staff line (Bellini, Torna vezzosa Fillide m2→5 on the web, m4
   * beginning the system: a piece within m5 alone would be one point; a measure beginning its system has the piece from
   * the system's start).
   */
  private endPieceNeedsMeasureBefore(slur: Slur): boolean {
    const endNote: Note = slur.EndNote;
    if (endNote.getAbsoluteTimestamp().RealValue > endNote.SourceMeasure.AbsoluteTimestamp.RealValue) {
      return false;
    }
    const measure: GraphicalMeasure = this.rules.GNote(endNote)?.parentVoiceEntry?.parentStaffEntry?.parentMeasure;
    const line: StaffLine = measure?.ParentStaffLine;
    return !!line && line.Measures[0] !== measure;
  }

  /**
   * The measure index after which a slur drawn as two pieces (see crossStaffSlurIsSplit()) changes staff: the start piece
   * goes from the start note to the end of that measure on the start note's staff, the end piece from the start of the
   * next measure to the end note on the end note's staff. The long piece goes on the staff where the start note's voice
   * has more of its notes between the two: Myrthen 14 m12-14 (voice 5 moves to the left hand: 4 notes on the right, 8 on
   * the left) changes staff after the start note's measure, the slur running under the left hand; Myrthen 15 m5-7 and
   * m41-43 (the right hand melody, all its notes on the right) before the end note's measure, the slur running over the
   * right hand and reaching the left hand's last note in the end measure. Equal counts go to the end staff. An end note
   * on the first beat of a measure within its system (Bellini, Torna vezzosa Fillide m5 on the web) takes the measure
   * before it as well (endPieceNeedsMeasureBefore()). A slur running between the staves (slurRunsBetweenStaves())
   * changes staff at the end of the start note's system: its end piece runs over the end staff from the next system's
   * start to the end note, as the one curve of that slur in one system ends (Bellini, Torna vezzosa Fillide m17-20 on
   * the web: m17 ending its system, the piece over the left hand's m18-20).
   */
  private crossStaffSlurSplitMeasureIndex(slur: Slur): number {
    const startIndex: number = slur.StartNote.SourceMeasure.measureListIndex;
    const endIndex: number = slur.EndNote.SourceMeasure.measureListIndex;
    if (this.slurRunsBetweenStaves(slur)) {
      const startLine: StaffLine = this.rules.GNote(slur.StartNote)?.parentVoiceEntry?.parentStaffEntry?.parentMeasure?.ParentStaffLine;
      const last: number = startLine?.Measures[startLine.Measures.length - 1]?.parentSourceMeasure?.measureListIndex;
      if (last !== undefined && last >= startIndex && last < endIndex) {
        return last;
      }
    }
    const from: number = slur.StartNote.getAbsoluteTimestamp().RealValue;
    const to: number = slur.EndNote.getAbsoluteTimestamp().RealValue;
    let onStartStaff: number = 0;
    let onEndStaff: number = 0;
    for (const voiceEntry of slur.StartNote.ParentVoiceEntry.ParentVoice.VoiceEntries) {
      const note: Note = voiceEntry.Notes.find(n => !n.isRest());
      const time: number = note?.getAbsoluteTimestamp().RealValue;
      if (!note || time <= from || time >= to) {
        continue;
      }
      if (note.ParentStaff === slur.StartNote.ParentStaff) {
        onStartStaff++;
      } else if (note.ParentStaff === slur.EndNote.ParentStaff) {
        onEndStaff++;
      }
    }
    const before: number = this.endPieceNeedsMeasureBefore(slur) ? 2 : 1;
    return onStartStaff > onEndStaff ? Math.max(startIndex, endIndex - before) : startIndex;
  }

  /**
   * The volta (ending) of each measure, by measure index: the index of the volta's first measure and its ending numbers
   * (as calculateWordRepetitionInstructions() tracks them). Undefined for a measure outside a volta.
   */
  private voltaOfMeasures(): ({ start: number, endings: number[] } | undefined)[] {
    const result: ({ start: number, endings: number[] } | undefined)[] = [];
    const active: { start: number, endings: number[] }[] = [];
    const sourceMeasures: SourceMeasure[] = this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures;
    for (let i: number = 0; i < sourceMeasures.length; i++) {
      for (const instruction of sourceMeasures[i].FirstRepetitionInstructions) {
        if (instruction.type === RepetitionInstructionEnum.Ending && instruction.alignment === AlignmentType.Begin) {
          active.push({ start: i, endings: instruction.endingIndices ?? [] });
        }
      }
      result.push(active[active.length - 1]);
      for (const instruction of sourceMeasures[i].LastRepetitionInstructions) {
        if (instruction.type === RepetitionInstructionEnum.Ending && active.length > 0 &&
            (instruction.alignment === AlignmentType.End || instruction.alignment === AlignmentType.Discontinue)) {
          active.pop();
          break;
        }
      }
    }
    return result;
  }

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
  private splitSlursIntoVoltas(): void {
    const voltas: ({ start: number, endings: number[] } | undefined)[] = this.voltaOfMeasures();
    if (!voltas.some(volta => volta)) {
      return;
    }
    const indexOf: (note: Note) => number = (note: Note): number => note.SourceMeasure.measureListIndex;
    for (const musicSystem of this.musicSystems) {
      for (const staffLine of musicSystem.StaffLines) {
        for (const gSlur of staffLine.GraphicalSlurs.slice()) {
          const slur: Slur = gSlur.slur;
          if (!slur.StartNote || !slur.EndNote || slur.isCrossed() || gSlur.crossStaffCurve || gSlur.staffEntries.length === 0) {
            continue;
          }
          const startIndex: number = indexOf(slur.StartNote);
          const volta: { start: number, endings: number[] } = voltas[indexOf(slur.EndNote)];
          if (!volta || volta.endings.length === 0 || Math.min(...volta.endings) < 2 || startIndex >= volta.start ||
              !voltas[volta.start - 1] || voltas[volta.start - 1] === volta) {
            continue; // not into a later ending past an earlier one
          }
          const alternative: boolean = slur.StartNote.ParentVoiceEntry.Notes.some(note => note.NoteSlurs.some(other =>
            other !== slur && other.StartNote?.ParentVoiceEntry === slur.StartNote.ParentVoiceEntry && other.EndNote &&
            indexOf(other.EndNote) >= startIndex && indexOf(other.EndNote) < volta.start));
          const before: GraphicalStaffEntry[] = gSlur.staffEntries.filter(entry =>
            entry.parentMeasure.parentSourceMeasure?.measureListIndex < volta.start);
          const after: GraphicalStaffEntry[] = gSlur.staffEntries.filter(entry => before.indexOf(entry) < 0);
          if (after.length > 0) {
            gSlur.staffEntries = after;
            gSlur.isVoltaPiece = true;
          }
          if (before.length > 0 && !alternative) {
            const piece: GraphicalSlur = after.length > 0 ? new GraphicalSlur(slur, this.rules) : gSlur;
            piece.staffEntries = before;
            piece.isVoltaPiece = true;
            if (piece !== gSlur) {
              staffLine.addSlurToStaffline(piece);
            }
          } else if (after.length === 0) {
            staffLine.GraphicalSlurs.splice(staffLine.GraphicalSlurs.indexOf(gSlur), 1);
          }
        }
      }
    }
  }

  protected calculateSlurs(): void {
    const openSlursDict: { [staffId: number]: GraphicalSlur[] } = {};
    for (const graphicalMeasure of this.graphicalMusicSheet.MeasureList[0]) { //let i: number = 0; i < this.graphicalMusicSheet.MeasureList[0].length; i++) {
      openSlursDict[graphicalMeasure.ParentStaff.idInMusicSheet] = [];
    }
    // the end pieces of the slurs between staves drawn as two pieces (see crossStaffSlurIsSplit()), by the staff of their
    //   end note: they start in the measure after the start note's measure
    const crossStaffEndPieces: { [staffId: number]: { slur: Slur, fromMeasureIndex: number }[] } = {};
    // the measure index after which each of these slurs changes staff (see crossStaffSlurSplitMeasureIndex())
    const crossStaffSplitAfter: Map<Slur, number> = new Map<Slur, number>();
    // the side of the end piece of those running between the staves (see slurRunsBetweenStaves()): facing the start staff
    const crossStaffPieceSide: Map<Slur, PlacementEnum> = new Map<Slur, PlacementEnum>();
    for (const musicSystem of this.musicSystems) {
      for (const staffLine of musicSystem.StaffLines) {
        for (const graphicalMeasure of staffLine.Measures) {
          for (const graphicalStaffEntry of graphicalMeasure.staffEntries) {
            for (const graphicalVoiceEntry of graphicalStaffEntry.graphicalVoiceEntries) {
              for (const graphicalNote of graphicalVoiceEntry.notes) {
                for (const slur of graphicalNote.sourceNote.NoteSlurs) {
                  if (slur.StartNote !== graphicalNote.sourceNote || !slur.EndNote || !this.crossStaffSlurIsSplit(slur)) {
                    continue;
                  }
                  const endStaffId: number = this.rules.GNote(slur.EndNote).parentVoiceEntry.parentStaffEntry.parentMeasure.ParentStaff.idInMusicSheet;
                  const splitAfter: number = this.crossStaffSlurSplitMeasureIndex(slur);
                  crossStaffSplitAfter.set(slur, splitAfter);
                  // (the end piece from the measure after the start piece's last — from the measure before an end note
                  //   on its first beat at the latest, see crossStaffSlurSplitMeasureIndex())
                  const endIndex: number = slur.EndNote.SourceMeasure.measureListIndex;
                  const fromMeasureIndex: number = this.endPieceNeedsMeasureBefore(slur) ? Math.min(splitAfter + 1, endIndex - 1) : splitAfter + 1;
                  (crossStaffEndPieces[endStaffId] ??= []).push({ slur, fromMeasureIndex });
                  if (this.slurRunsBetweenStaves(slur)) {
                    crossStaffPieceSide.set(slur, slur.PlacementXml === PlacementEnum.Below ? PlacementEnum.Above : PlacementEnum.Below);
                  }
                }
              }
            }
          }
        }
      }
    }

    /* VexFlow Version - for later use
    // Generate an empty dictonary to index an array of VexFlowSlur classes
    const vfOpenSlursDict: { [staffId: number]: VexFlowSlur[]; } = {}; //VexFlowSlur[]; } = {};
    // use first SourceMeasure to get all graphical measures to know how many staves are currently visible in this musicsheet
    // foreach stave: create an empty array. It can later hold open slurs.
    // Measure how many staves are visible and reserve space for them.
    for (const graphicalMeasure of this.graphicalMusicSheet.MeasureList[0]) { //let i: number = 0; i < this.graphicalMusicSheet.MeasureList[0].length; i++) {
        vfOpenSlursDict[graphicalMeasure.ParentStaff.idInMusicSheet] = [];
    }
    */

    for (const musicSystem of this.musicSystems) {
        for (const staffLine of musicSystem.StaffLines) {
          // if a graphical slur reaches out of the last musicsystem, we have to create another graphical slur reaching into this musicsystem
          // (one slur needs 2 graphical slurs)
          const openGraphicalSlurs: GraphicalSlur[] = openSlursDict[staffLine.ParentStaff.idInMusicSheet];
          for (let slurIndex: number = 0; slurIndex < openGraphicalSlurs.length; slurIndex++) {
            const oldGSlur: GraphicalSlur = openGraphicalSlurs[slurIndex];
            const newGSlur: GraphicalSlur = new GraphicalSlur(oldGSlur.slur, this.rules); //Graphicalslur.createFromSlur(oldSlur);
            newGSlur.isCrossStaffPiece = oldGSlur.isCrossStaffPiece;
            newGSlur.pieceSide = oldGSlur.pieceSide;
            staffLine.addSlurToStaffline(newGSlur); // every VFSlur is added to the array in the VFStaffline!
            openGraphicalSlurs[slurIndex] = newGSlur;
          }

          /* VexFlow Version - for later use
          const vfOpenSlurs: VexFlowSlur[] = vfOpenSlursDict[staffLine.ParentStaff.idInMusicSheet];
          const vfStaffLine: VexFlowStaffLine = <VexFlowStaffLine> staffLine;
          for (let slurIndex: number = 0; slurIndex < vfOpenSlurs.length; slurIndex++) {
              const oldVFSlur: VexFlowSlur = vfOpenSlurs[slurIndex];
              const newVFSlur: VexFlowSlur = VexFlowSlur.createFromVexflowSlur(oldVFSlur);
              newVFSlur.vfStartNote = undefined;
              vfStaffLine.addVFSlurToVFStaffline(newVFSlur); // every VFSlur is added to the array in the VFStaffline!
              vfOpenSlurs[slurIndex] = newVFSlur;
          }
          */

          // add reference of slur array to the VexFlowStaffline class
          for (const graphicalMeasure of staffLine.Measures) {
            // the end piece of a slur between staves starts at the first measure after the start note's measure
            //   (a measure without source measure, e.g. an extra graphical measure, starts none)
            const measureIndex: number = graphicalMeasure.parentSourceMeasure?.measureListIndex;
            const endPieces: { slur: Slur, fromMeasureIndex: number }[] = crossStaffEndPieces[staffLine.ParentStaff.idInMusicSheet] ?? [];
            for (let pieceIndex: number = endPieces.length - 1; pieceIndex >= 0; pieceIndex--) {
              if (measureIndex === undefined || endPieces[pieceIndex].fromMeasureIndex > measureIndex) {
                continue;
              }
              const endPiece: GraphicalSlur = new GraphicalSlur(endPieces[pieceIndex].slur, this.rules);
              endPiece.isCrossStaffPiece = true;
              endPiece.pieceSide = crossStaffPieceSide.get(endPieces[pieceIndex].slur);
              staffLine.addSlurToStaffline(endPiece);
              openGraphicalSlurs.push(endPiece);
              endPieces.splice(pieceIndex, 1);
            }
            for (const graphicalStaffEntry of graphicalMeasure.staffEntries) {
              // loop over "normal" notes (= no gracenotes)
              for (const graphicalVoiceEntry of graphicalStaffEntry.graphicalVoiceEntries) {
                for (const graphicalNote of graphicalVoiceEntry.notes) {
                  for (const slur of graphicalNote.sourceNote.NoteSlurs) {
                    // extra check for some MusicSheets that have openSlurs (because only the first Page is available -> Recordare files)
                    if (!slur.StartNote || (!slur.EndNote && !slur.HasUnattachedEnd)) {
                      continue;
                    }
                    if (!slur.EndNote && graphicalMeasure.staffEntries[graphicalMeasure.staffEntries.length - 1] !== graphicalStaffEntry) {
                      // a slur without end note is only drawn to the barline from the measure's last note (see Slur.HasUnattachedEnd):
                      //   from an earlier note, where it ended is unknown, and it would be drawn over the rest of the measure
                      continue;
                    }
                    // Hidden endpoints must not contribute a slur curve to the skyline.
                    if (this.measureRepeatHidesNote(slur.StartNote) && this.measureRepeatHidesNote(slur.EndNote)) {
                      continue;
                    }
                    // add new VexFlowSlur to List
                    if (slur.StartNote === graphicalNote.sourceNote) {
                      // TODO the following seems to have been intended to prevent unnecessary slurs that overlap ties,
                      //   but it simply leads to correct slurs being left out where the tie end note is the slur start note.
                      //   visual regression tests simply show valid slurs being left out in 4 samples.
                      // if (graphicalNote.sourceNote.NoteTie) {
                      //   if (graphicalNote.parentVoiceEntry.parentStaffEntry.getAbsoluteTimestamp() !==
                      //     graphicalNote.sourceNote.NoteTie.StartNote.getAbsoluteTimestamp()) {
                      //     break;
                      //   }
                      // }

                      // Add a Graphical Slur to the staffline, if the recent note is the Startnote of a slur
                      const gSlur: GraphicalSlur = new GraphicalSlur(slur, this.rules);
                      staffLine.addSlurToStaffline(gSlur);
                      if (crossStaffSplitAfter.has(slur)) {
                        // the start piece of a slur between staves drawn as two pieces: closed where it changes staff
                        gSlur.isCrossStaffPiece = true;
                        openGraphicalSlurs.push(gSlur);
                      } else if (slur.isCrossed()) {
                        // A cross-staff slur (e.g. left hand to right hand) ends on a different staff, so it
                        // would never be closed by the per-staff open/close mechanism below - which would leave
                        // it open and spawn phantom continuation slurs on every following staffline. Keep it out
                        // of openGraphicalSlurs; its curve is calculated separately at draw time (spanning both
                        // stafflines, CrossStaffCurve). It still needs a staffEntry for GraphicalSlur.Compare's sorting.
                        gSlur.staffEntries = [graphicalStaffEntry];
                        this.crossStaffCurveOf(gSlur, graphicalStaffEntry);
                      } else {
                        // a slur on one staff over its voice's notes on the staff above: one curve over them and the
                        //   beam, as between staves (see sameStaffSlurInnerLine())
                        const innerLine: StaffLine = this.sameStaffSlurInnerLine(slur);
                        if (innerLine) {
                          gSlur.staffEntries = [graphicalStaffEntry];
                          this.crossStaffCurveOf(gSlur, graphicalStaffEntry, innerLine);
                        } else {
                          openGraphicalSlurs.push(gSlur);
                        }
                      }

                      /* VexFlow Version - for later use
                      const vfSlur: VexFlowSlur = new VexFlowSlur(slur);
                      vfOpenSlurs.push(vfSlur); //add open... adding / removing is JUST DONE in the open... array
                      vfSlur.vfStartNote = (graphicalVoiceEntry as VexFlowVoiceEntry).vfStaveNote;
                      vfStaffLine.addVFSlurToVFStaffline(vfSlur); // every VFSlur is added to the array in the VFStaffline!
                      */
                    }
                    if (slur.EndNote === graphicalNote.sourceNote) {
                      // Remove the Graphical Slur from the staffline if the note is the Endnote of a slur
                      const index: number = this.findIndexGraphicalSlurFromSlur(openGraphicalSlurs, slur);
                      if (index >= 0) {
                        // save Voice Entry in VFSlur and then remove it from array of open VFSlurs
                        const gSlur: GraphicalSlur = openGraphicalSlurs[index];
                        if (gSlur.staffEntries.indexOf(graphicalStaffEntry) === -1) {
                          gSlur.staffEntries.push(graphicalStaffEntry);
                        }

                        openGraphicalSlurs.splice(index, 1);
                      }

                      /* VexFlow Version - for later use
                      const vfIndex: number = this.findIndexVFSlurFromSlur(vfOpenSlurs, slur);
                      if (vfIndex !== undefined) {
                          // save Voice Entry in VFSlur and then remove it from array of open VFSlurs
                          const vfSlur: VexFlowSlur = vfOpenSlurs[vfIndex];
                          vfSlur.vfEndNote = (graphicalVoiceEntry as VexFlowVoiceEntry).vfStaveNote;
                          vfSlur.createVexFlowCurve();
                          vfOpenSlurs.splice(vfIndex, 1);
                      }
                      */
                    }
                  }
                }
              }

              //add the present Staffentry to all open slurs that don't contain this Staffentry already
              for (const gSlur of openGraphicalSlurs) {
                if (gSlur.staffEntries.indexOf(graphicalStaffEntry) === -1) {
                  gSlur.staffEntries.push(graphicalStaffEntry);
                }
              }
            } // loop over StaffEntries

            // a slur without end note, drawn from the measure's last note to the barline, ends here (see Slur.HasUnattachedEnd),
            //   as the start piece of a slur between staves drawn as two pieces where it changes staff (see crossStaffSlurIsSplit())
            for (let slurIndex: number = openGraphicalSlurs.length - 1; slurIndex >= 0; slurIndex--) {
              const openSlur: GraphicalSlur = openGraphicalSlurs[slurIndex];
              if (!openSlur.slur.EndNote ||
                  openSlur.isCrossStaffPiece && staffLine.ParentStaff === openSlur.slur.StartNote.ParentStaff &&
                  crossStaffSplitAfter.get(openSlur.slur) === graphicalMeasure.parentSourceMeasure?.measureListIndex) {
                openGraphicalSlurs.splice(slurIndex, 1);
              }
            }
          } // loop over Measures

          // a slur carried over into this staffline that got no staff entry has nothing on this staff in this system to
          //   draw a curve along (e.g. a measure of only grace notes on another staff, split off to break the system):
          //   it is only drawn in the other systems, and stays open for the next one.
          for (const gSlur of openGraphicalSlurs) {
            if (gSlur.staffEntries.length === 0) {
              staffLine.GraphicalSlurs.splice(staffLine.GraphicalSlurs.indexOf(gSlur), 1);
            }
          }
        } // loop over StaffLines

        // Attach vfSlur array to the vfStaffline to be drawn
        //vfStaffLine.SlursInVFStaffLine = vfSlurs;
      } // loop over MusicSystems

    this.splitSlursIntoVoltas();

    // order slurs that were saved to the Staffline
    for (const musicSystem of this.musicSystems) {
      for (const staffLine of musicSystem.StaffLines) {
        // what is drawn at the notes (their articulations) before the slurs are placed, see GraphicalSlur.calculateStartAndEnd()
        staffLine.SkyLineBeforeSlurs = staffLine.SkyLine.slice();
        staffLine.BottomLineBeforeSlurs = staffLine.BottomLine.slice();
        // Sort all gSlurs in the staffline using the Compare function in class GraphicalSlurSorter
        const sortedGSlurs: GraphicalSlur[] = staffLine.GraphicalSlurs.sort(GraphicalSlur.Compare);
        for (const gSlur of sortedGSlurs) {
            // crossed slurs will be handled later (unless drawn as a piece on each staff): see reserveCrossStaffCurves()
            if (gSlur.slur.isCrossed() && !gSlur.isCrossStaffPiece || gSlur.crossStaffCurve) {
                continue;
            }
            gSlur.calculateCurve(this.rules);
        }
      }
    }
  }

  public calculateGlissandi(): void {
    const openGlissDict: { [staffId: number]: GraphicalGlissando[] } = {};
    for (const graphicalMeasure of this.graphicalMusicSheet.MeasureList[0]) { //let i: number = 0; i < this.graphicalMusicSheet.MeasureList[0].length; i++) {
      openGlissDict[graphicalMeasure.ParentStaff.idInMusicSheet] = [];
    }

    for (const musicSystem of this.musicSystems) {
        for (const staffLine of musicSystem.StaffLines) {
          // if a glissando reaches out of the last musicsystem, we have to create another glissando reaching into this musicsystem
          // (one gliss needs 2 graphical gliss)
          // const isTab: boolean = staffLine.ParentStaff.isTab;
          const openGlissandi: GraphicalGlissando[] = openGlissDict[staffLine.ParentStaff.idInMusicSheet];
          for (let glissIndex: number = 0; glissIndex < openGlissandi.length; glissIndex++) {
            const oldGliss: GraphicalGlissando = openGlissandi[glissIndex];
            const newGliss: GraphicalGlissando = new VexFlowGlissando(oldGliss.Glissando);
            staffLine.addGlissandoToStaffline(newGliss);
            openGlissandi[glissIndex] = newGliss;
          }

          // add reference of gliss array to the VexFlowStaffline class
          for (const graphicalMeasure of staffLine.Measures) {
            for (const graphicalStaffEntry of graphicalMeasure.staffEntries) {
              // loop over "normal" notes (= no gracenotes)
              for (const graphicalVoiceEntry of graphicalStaffEntry.graphicalVoiceEntries) {
                for (const graphicalNote of graphicalVoiceEntry.notes) {
                  // Remove the glissandi that end on this note from the open ones. A note that ends a glissando and
                  //   starts the next one only has the next one as NoteGlissando.
                  for (let index: number = openGlissandi.length - 1; index >= 0; index--) {
                    const gGliss: GraphicalGlissando = openGlissandi[index];
                    if (gGliss.Glissando.EndNote === graphicalNote.sourceNote) {
                      // save Voice Entry in gliss and then remove it from array of open glissandi
                      if (gGliss.staffEntries.indexOf(graphicalStaffEntry) === -1) {
                        gGliss.staffEntries.push(graphicalStaffEntry);
                      }
                      openGlissandi.splice(index, 1);
                    }
                  }
                  const gliss: Glissando = graphicalNote.sourceNote.NoteGlissando;
                  // extra check for some MusicSheets that have openSlurs (because only the first Page is available -> Recordare files)
                  if (!gliss?.EndNote || !gliss?.StartNote) {
                    continue;
                  }
                  // Hidden endpoints must not contribute a glissando to the staff line.
                  if (this.measureRepeatHidesNote(gliss.StartNote) && this.measureRepeatHidesNote(gliss.EndNote)) {
                    continue;
                  }
                  // add new VexFlowGlissando to List
                  if (gliss.StartNote === graphicalNote.sourceNote) {
                    // Add a Graphical Glissando to the staffline, if the recent note is the Startnote of a slur
                    const gGliss: GraphicalGlissando = new VexFlowGlissando(gliss);
                    openGlissandi.push(gGliss);
                    //gGliss.staffEntries.push(graphicalStaffEntry);
                    staffLine.addGlissandoToStaffline(gGliss);
                  }
                }
              }

              // probably unnecessary, as a gliss only has 2 staffentries
              //add the present Staffentry to all open slurs that don't contain this Staffentry already
              for (const gGliss of openGlissandi) {
                if (gGliss.staffEntries.indexOf(graphicalStaffEntry) === -1) {
                  gGliss.staffEntries.push(graphicalStaffEntry);
                }
              }
            } // loop over StaffEntries
          } // loop over Measures

          // like for slurs (see calculateSlurs()): a glissando carried over into this staffline that got no staff entry has
          //   nothing on this staff in this system to draw a line to. It stays open for the next system.
          for (const gGliss of openGlissandi) {
            if (gGliss.staffEntries.length === 0) {
              staffLine.GraphicalGlissandi.splice(staffLine.GraphicalGlissandi.indexOf(gGliss), 1);
            }
          }
        } // loop over StaffLines
      } // loop over MusicSystems

      for (const musicSystem of this.musicSystems) {
        for (const staffLine of musicSystem.StaffLines) {
        // order glissandi that were saved to the Staffline
        // TODO? Sort all gSlurs in the staffline using the Compare function in class GraphicalSlurSorter
        //const sortedGSlurs: GraphicalSlur[] = staffLine.GraphicalSlurs.sort(GraphicalSlur.Compare);
        for (const gGliss of staffLine.GraphicalGlissandi) {
          const isTab: boolean = staffLine.ParentStaff.isTab;
          if (isTab) {
            const startNote: TabNote = <TabNote> gGliss.Glissando.StartNote;
            const endNote: TabNote = <TabNote> gGliss.Glissando.EndNote;
            const vfStartNote: VexFlowGraphicalNote = gGliss.staffEntries[0].findGraphicalNoteFromNote(startNote) as VexFlowGraphicalNote;
            const vfEndNote: VexFlowGraphicalNote = gGliss.staffEntries.last().findGraphicalNoteFromNote(endNote) as VexFlowGraphicalNote;
            if (!vfStartNote && !vfEndNote) {
              continue; // otherwise causes Vexflow error. continue, not return: that would skip all following slides
            }

            let slideDirection: number = 1;
            if (startNote.FretNumber > endNote.FretNumber) {
              slideDirection = -1;
            }
            let first_indices: number[] = undefined;
            let last_indices: number[] = undefined;
            let startStemmableNote: VF.StemmableNote  = undefined;
            // let startNoteIndexInTie: number = 0;
            if (vfStartNote && vfStartNote.vfnote && vfStartNote.vfnote.length >= 2) {
              startStemmableNote = vfStartNote.vfnote[0]; // otherwise needs to be undefined in TabSlide constructor!
              first_indices = [0];
              // startNoteIndexInTie = vfStartNote.vfnote[1];
            }
            let endStemmableNote: VF.StemmableNote  = undefined;
            // let endNoteIndexInTie: number = 0;
            if (vfEndNote && vfEndNote.vfnote && vfEndNote.vfnote.length >= 2) {
              endStemmableNote = vfEndNote.vfnote[0];
              last_indices = [0];
              // endNoteIndexInTie = vfEndNote.vfnote[1];
            }
            const vfTie: VF.TabSlide = new VF.TabSlide(
              {
                first_indices: first_indices,
                first_note: startStemmableNote,
                last_indices: last_indices,
                last_note: endStemmableNote,
              },
              slideDirection
            );
            VexFlowConverter.setVexFlowTextFontFamily((vfTie as any).font, this.rules);

            const startMeasure: VexFlowMeasure = (vfStartNote?.parentVoiceEntry.parentStaffEntry.parentMeasure as VexFlowMeasure);
            if (startMeasure) {
              startMeasure.vfTies.push(vfTie);
              (gGliss as VexFlowGlissando).vfTie = vfTie;
            }
            const endMeasure: VexFlowMeasure = (vfEndNote?.parentVoiceEntry.parentStaffEntry.parentMeasure as VexFlowMeasure);
            if (endMeasure) {
              endMeasure.vfTies.push(vfTie);
              (gGliss as VexFlowGlissando).vfTie = vfTie;
            }
          } else {
            //gGliss.calculateLine(this.rules);
          }
        }
      }
    }
  }
}
