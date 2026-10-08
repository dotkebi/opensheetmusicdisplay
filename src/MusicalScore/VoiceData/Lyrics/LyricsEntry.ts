import {LyricWord} from "./LyricsWord";
import {VoiceEntry} from "../VoiceEntry";
import { FontStyles } from "../../../Common/Enums/FontStyles";

export class LyricsEntry {
    constructor(text: string, verseNumber: string, word: LyricWord, parent: VoiceEntry, syllableNumber: number = -1) {
        this.text = text;
        this.word = word;
        this.parent = parent;
        this.verseNumber = verseNumber;
        if (syllableNumber >= 0) {
            this.syllableIndex = syllableNumber;
        }
    }
    private text: string;
    private word: LyricWord;
    private nextWord: LyricWord;
    private parent: VoiceEntry;
    private verseNumber: string;
    private syllableIndex: number;
    public extend: boolean;
    /** The syllabic value read from the XML (single/begin/middle/end).
     *  Kept to allow re-linking word chains across voices after reading. */
    public syllabic: string = "single";
    /** Whether the syllable is joined to the next one of its verse by an elision across the two notes (<elision/> followed by
     *  an empty <text/>, Se tu m'ami m21 "te‿a"): the elision curve is drawn from this syllable to the next
     *  (MusicSheetCalculator.calculateLyricElisionToNext()). */
    public elisionToNext: boolean = false;
    /** The language of the text: its xml:lang or the sheet's default for the lyric (MusicSheet.LyricLanguages), see Label.language. */
    public language: string;

    public get Text(): string {
        return this.text;
    }
    public set Text(value: string) {
        this.text = value;
    }
    public get Word(): LyricWord {
        return this.word;
    }
    public set Word(value: LyricWord) {
        this.word = value;
    }
    /** The word this entry begins when its text has an elision whose second syllable begins a word ("ve a-mi-che":
     *  "ve" ends one word, "a" begins the next, both on this note): this entry is the first syllable of NextWord
     *  as well as the last of Word, and gets the dash to the next syllable of NextWord. */
    public get NextWord(): LyricWord {
        return this.nextWord;
    }
    public set NextWord(value: LyricWord) {
        this.nextWord = value;
    }
    public get Parent(): VoiceEntry {
        return this.parent;
    }
    public set Parent(value: VoiceEntry) {
        this.parent = value;
    }

    public get VerseNumber(): string {
        return this.verseNumber;
    }

    public get SyllableIndex(): number {
        return this.syllableIndex;
    }
    public set SyllableIndex(value: number) {
        this.syllableIndex = value;
    }

    public get IsTranslation(): boolean {
        return this.VerseNumber.endsWith("translation");
    }

    public get IsChorus(): boolean {
        return this.VerseNumber.startsWith("chorus");
    }

    public get FontStyle(): FontStyles {
        return this.IsChorus || this.IsTranslation ? FontStyles.Italic : FontStyles.Regular;
    }
}
