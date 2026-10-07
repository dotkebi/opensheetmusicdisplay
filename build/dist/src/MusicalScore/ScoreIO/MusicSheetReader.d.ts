import { MusicSheet } from "../MusicSheet";
import { InstrumentReader } from "./InstrumentReader";
import { IXmlElement } from "../../Common/FileIO/Xml";
import { IAfterSheetReadingModule } from "../Interfaces/IAfterSheetReadingModule";
import { EngravingRules } from "../Graphical/EngravingRules";
import { ReaderPluginManager } from "./ReaderPluginManager";
export declare class MusicSheetReader {
    constructor(afterSheetReadingModules?: IAfterSheetReadingModule[], rules?: EngravingRules);
    private repetitionInstructionReader;
    private repetitionCalculator;
    private afterSheetReadingModules;
    private musicSheet;
    private completeNumberOfStaves;
    private currentMeasure;
    private previousMeasure;
    private currentFraction;
    private pluginManager;
    rules: EngravingRules;
    get PluginManager(): ReaderPluginManager;
    get CompleteNumberOfStaves(): number;
    /** All <identification><encoding><software> values (a file can name several programs). */
    private static readEncodingSoftware;
    static doCalculationsAfterDurationHasBeenSet(instrumentReaders: InstrumentReader[]): void;
    /**
     * Read a music XML file and saves the values in the MusicSheet class.
     * @param root
     * @param path
     * @returns {MusicSheet}
     */
    createMusicSheet(root: IXmlElement, path: string): MusicSheet;
    private _removeFromArray;
    private trimString;
    private _lastElement;
    private _createMusicSheet;
    /**
     * Re-links lyric word chains whose syllables are split across voices of the same
     * staff (e.g. the soprano holds a note while the alto carries the next syllable
     * of the word). Each voice is parsed by its own LyricsReader, so a "begin" syllable
     * in one voice never meets its "end" in another and no dash is drawn between them.
     * Only verses that contain broken chains are rebuilt (in timestamp order); verses
     * with well-formed words — including voices carrying genuinely different lyrics —
     * are left untouched. Each staff has its own lyrics lines, so words are never linked
     * across staves, e.g. a tenor's words in the lower staff of a two-staff choir part.
     */
    private relinkLyricWordsAcrossVoices;
    /** A verse needs re-linking when a non-single syllable has no word (orphan)
     *  or a word chain does not start with "begin" and finish with "end" (or "single",
     *  with which LyricsReader also ends a word).
     *
     *  Only verses whose syllables are in more than one voice qualify:
     *  a verse sung by one voice can't have a word split across voices. */
    private hasBrokenLyricWordChains;
    private initializeReading;
    /**
     * Check if all (should there be any apart from the first Measure) [[RhythmInstruction]]s in the [[SourceMeasure]] are the same.
     *
     * If not, then the max [[RhythmInstruction]] (Fraction) is set to all staves.
     * Also, if it happens to have the same [[RhythmInstruction]]s in RealValue but given in Symbol AND Fraction, then the Fraction prevails.
     * @param instrumentReaders
     */
    private checkIfRhythmInstructionsAreSetAndEqual;
    /**
     * True in case of 4/4 and COMMON TIME (or 2/2 and CUT TIME)
     * @param rhythmInstructions
     * @returns {boolean}
     */
    private areRhythmInstructionsMixed;
    /**
     * Set the [[Measure]]'s duration taking into account the longest [[Instrument]] duration and the active Rhythm read from XML.
     * @param instrumentReaders
     * @param sourceMeasureCounter
     * @returns {number}
     */
    private setSourceMeasureDuration;
    /**
     * Check the Fractions for Equivalence and if so, sets maxInstrumentDuration's members accordingly.
     * *
     * Example: if maxInstrumentDuration = 1/1 and sourceMeasureDuration = 4/4, maxInstrumentDuration becomes 4/4.
     * @param maxInstrumentDuration
     * @param activeRhythm
     */
    private checkFractionsForEquivalence;
    /**
     * Handle the case of an implicit [[SourceMeasure]].
     * @param maxInstrumentDuration
     * @param activeRhythm
     * @returns {boolean}
     */
    private checkIfMeasureIsImplicit;
    /**
     * Check the Duration of all the given Instruments.
     * @param instrumentsDurations
     * @param maxInstrumentDuration
     * @returns {boolean}
     */
    private allInstrumentsHaveSameDuration;
    private graphicalMeasureIsEmpty;
    /**
     * Check a [[SourceMeasure]] for possible empty / undefined entries ([[VoiceEntry]], [[SourceStaffEntry]], VerticalContainer)
     * (caused from TieAlgorithm removing EndTieNote) and removes them if completely empty / null
     */
    private checkSourceMeasureForNullEntries;
    /**
     * Read the XML file and creates the main sheet Labels.
     * @param root
     * @param filePath
     */
    private pushSheetLabels;
    /** Reads the default languages of the lyrics, <defaults><lyric-language xml:lang="..."> (MusicSheet.LyricLanguages). */
    private readLyricLanguages;
    /** Reads first-page credits without inferring a role from position or alignment. */
    private readFirstPageCreditWords;
    private presentAttrsWithValue;
    private readComposer;
    private readCopyright;
    private readTitleAndComposerFromCredits;
    /** Joins <credit-words> in document order and returns a type only for exactly one <credit-type>, and the xml:lang of
     * the first <credit-words>. Untyped and multi-type credits retain their text without a type.
     */
    private getCreditTypeTextAndLanguage;
    /** @deprecated Old OSMD < 1.8.6 way of parsing composer + subtitles,
     * ignores multiline composer + subtitles, uses XML identification tags instead.
     * Will probably be removed soon.
     */
    private readTitleAndComposerFromCreditsLegacy;
    private computeSystemYCoordinates;
    private readTitle;
    /**
     * Build the [[InstrumentalGroup]]s and [[Instrument]]s.
     * @param entryList
     * @returns {{}}
     */
    private createInstrumentGroups;
    private countInstrumentsInGroup;
    private groupNumbersAreProperlyNested;
    /**
     * Returns the part-list entries with the part-group starts and stops between two parts in nesting order:
     * stops before starts, an inner group's stop first, an outer group's start first.
     * The part-list may give them in any order, e.g. Finale starts a bracket after a brace starting at the same part.
     * Groups whose parts overlap stay crossed.
     */
    private orderPartGroupsByNesting;
    /**
     * Read from each xmlInstrumentPart the first xmlMeasure in order to find out the [[Instrument]]'s number of Staves
     * @param partInst
     * @returns {number} - Complete number of Staves for all Instruments.
     */
    private getCompleteNumberOfStavesFromXml;
    /**
     * Read from XML for a single [[Instrument]] the first xmlMeasure in order to find out the Instrument's number of Staves.
     * @param partNode
     * @returns {number}
     */
    private getInstrumentNumberOfStavesFromXml;
}
