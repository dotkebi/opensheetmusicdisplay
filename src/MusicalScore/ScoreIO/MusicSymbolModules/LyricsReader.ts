import {LyricWord} from "../../VoiceData/Lyrics/LyricsWord";
import {VoiceEntry} from "../../VoiceData/VoiceEntry";
import {IXmlElement} from "../../../Common/FileIO/Xml";
import {LyricsEntry} from "../../VoiceData/Lyrics/LyricsEntry";
import {ITextTranslation} from "../../Interfaces/ITextTranslation";
import {LyricLanguage, MusicSheet} from "../../MusicSheet";

export class LyricsReader {
    private openLyricWords: { [_: number]: LyricWord } = {};
    private currentLyricWord: LyricWord;
    private musicSheet: MusicSheet;

    constructor(musicSheet: MusicSheet) {
        this.musicSheet = musicSheet;
    }
    /**
     * This method adds a single LyricEntry to a VoiceEntry
     * @param {IXmlElement[]} lyricNodeList
     * @param {VoiceEntry} currentVoiceEntry
     */
    public addLyricEntry(lyricNodeList: IXmlElement[], currentVoiceEntry: VoiceEntry): void {
        if (lyricNodeList) {
            const lyricNodeListArr: IXmlElement[] = lyricNodeList;
            for (let idx: number = 0, len: number = lyricNodeListArr.length; idx < len; ++idx) {
                const lyricNode: IXmlElement = lyricNodeListArr[idx];
                try {
                    let syllabic: string = "single"; // Single as default
                    if (lyricNode.element("text")) {
                        let textNode: IXmlElement = lyricNode.element("text");
                        if (lyricNode.element("syllabic")) {
                            syllabic = lyricNode.element("syllabic").value;
                        }
                        // an elision joins syllables of different words on one note ("ve a-mi-che"): the last
                        //   <syllabic> says whether a word is open after this note
                        const syllabics: string[] = lyricNode.elements("syllabic").map((node: IXmlElement) => node.value);
                        const lastSyllabic: string = syllabics.length > 0 ? syllabics[syllabics.length - 1] : syllabic;
                        const hasElision: boolean = lyricNode.element("elision") !== undefined;
                        if (textNode) {
                            let text: string = "";
                            const textAndElisionNodes: IXmlElement[] = lyricNode.elements();
                            for (const node of textAndElisionNodes) {
                                if (node.name === "text" || node.name === "elision") {
                                    text += node.value;
                                }
                            }
                            text = text.replace("  ", " "); // filter multiple spaces from concatenating e.g. text "a " with elision " "
                            // <elision> separates Multiple syllabels on a single LyricNote
                            // "-" text indicating separated syllabel should be ignored
                            // we calculate the Dash element much later
                            if (lyricNode.element("elision") !== undefined && text === "-") {
                                const lyricNodeChildren: IXmlElement[] = lyricNode.elements();
                                let elisionIndex: number = 0;
                                for (let i: number = 0; i < lyricNodeChildren.length; i++) {
                                    const child: IXmlElement = lyricNodeChildren[i];
                                    if (child.name === "elision") {
                                        elisionIndex = i;
                                        break;
                                    }
                                }
                                let nextText: IXmlElement = undefined;
                                let nextSyllabic: IXmlElement = undefined;
                                // read the next nodes
                                if (elisionIndex > 0) {
                                    for (let i: number = elisionIndex; i < lyricNodeChildren.length; i++) {
                                        const child: IXmlElement = lyricNodeChildren[i];
                                        if (child.name === "text") {
                                            nextText = child;
                                        }
                                        if (child.name === "syllabic") {
                                            nextSyllabic = child;
                                        }
                                    }
                                }
                                if (nextText !== undefined && nextSyllabic) {
                                    textNode = nextText;
                                    syllabic = "middle";
                                }
                            }
                            let currentLyricVerseNumber: string = "1";
                            if (lyricNode.attributes() !== undefined && lyricNode.attribute("number")) {
                                currentLyricVerseNumber = lyricNode.attribute("number").value;
                            }
                            let lyricsEntry: LyricsEntry = undefined;
                            if (syllabic === "single" || syllabic === "end") {
                                if (this.openLyricWords[currentLyricVerseNumber]) { // word end given or some word still open
                                    this.currentLyricWord = this.openLyricWords[currentLyricVerseNumber];
                                    const syllableNumber: number = this.currentLyricWord.Syllables.length;
                                    lyricsEntry = new LyricsEntry(text, currentLyricVerseNumber, this.currentLyricWord, currentVoiceEntry, syllableNumber);
                                    this.currentLyricWord.Syllables.push(lyricsEntry);
                                    delete this.openLyricWords[currentLyricVerseNumber];
                                    this.currentLyricWord = undefined;
                                } else { // single syllable given or end given while no word has been started
                                    lyricsEntry = new LyricsEntry(text, currentLyricVerseNumber, undefined, currentVoiceEntry);
                                }
                                lyricsEntry.extend = lyricNode.element("extend") !== undefined;
                            } else if (syllabic === "begin") { // first finishing, if a word already is open (can only happen, when wrongly given)
                                if (this.openLyricWords[currentLyricVerseNumber]) {
                                    delete this.openLyricWords[currentLyricVerseNumber];
                                    this.currentLyricWord = undefined;
                                }
                                this.currentLyricWord = new LyricWord();
                                this.openLyricWords[currentLyricVerseNumber] = this.currentLyricWord;
                                lyricsEntry = new LyricsEntry(text, currentLyricVerseNumber, this.currentLyricWord, currentVoiceEntry, 0);
                                this.currentLyricWord.Syllables.push(lyricsEntry);
                            } else if (syllabic === "middle") {
                                if (this.openLyricWords[currentLyricVerseNumber]) {
                                    this.currentLyricWord = this.openLyricWords[currentLyricVerseNumber];
                                    const syllableNumber: number = this.currentLyricWord.Syllables.length;
                                    lyricsEntry = new LyricsEntry(text, currentLyricVerseNumber, this.currentLyricWord, currentVoiceEntry, syllableNumber);
                                    this.currentLyricWord.Syllables.push(lyricsEntry);
                                } else {
                                    // in case the wrong syllabel information is given, create a single Entry and add it to currentVoiceEntry
                                    lyricsEntry = new LyricsEntry(text, currentLyricVerseNumber, undefined, currentVoiceEntry);
                                }
                            }
                            // the second syllable of an elision begins a new word (Parisotti, Selve amiche m5
                            //   "Sel-ve a-mi-che": "ve" ends a word, "a" begins the next, both on one note): the entry
                            //   is the last syllable of the one and the first of the other, which gets the dashes
                            //   to "mi" and "che"
                            if (lyricsEntry && hasElision && syllabics.length > 1 && lastSyllabic !== syllabic &&
                                (lastSyllabic === "begin" || (lastSyllabic === "middle" && (syllabic === "single" || syllabic === "end")))) {
                                if (this.openLyricWords[currentLyricVerseNumber]) { // "begin" after a "begin"/"middle": the open word ends here
                                    delete this.openLyricWords[currentLyricVerseNumber];
                                }
                                const nextWord: LyricWord = new LyricWord();
                                nextWord.Syllables.push(lyricsEntry);
                                lyricsEntry.NextWord = nextWord;
                                this.openLyricWords[currentLyricVerseNumber] = nextWord;
                                this.currentLyricWord = nextWord;
                            }
                            // add each LyricEntry to currentVoiceEntry
                            if (lyricsEntry) {
                                lyricsEntry.syllabic = syllabic;
                                lyricsEntry.language = this.readLanguage(lyricNode, currentLyricVerseNumber);
                                // only add the lyric entry if not another entry has already been given:
                                if (!currentVoiceEntry.LyricsEntries[currentLyricVerseNumber]) {
                                    currentVoiceEntry.LyricsEntries.setValue(currentLyricVerseNumber, lyricsEntry);
                                    if (currentVoiceEntry.ParentSourceStaffEntry?.VerticalContainerParent?.ParentMeasure) {
                                        currentVoiceEntry.ParentSourceStaffEntry.VerticalContainerParent.ParentMeasure.hasLyrics = true;
                                        // currentVoiceEntry.ParentSourceStaffEntry.ParentStaff.hasLyrics = true; // TODO enable, though rarely lyrics on rests
                                    }
                                }
                                // save in currentInstrument the verseNumber (only once)
                                if (!currentVoiceEntry.ParentVoice.Parent.LyricVersesNumbers.includes(currentLyricVerseNumber)) {
                                    currentVoiceEntry.ParentVoice.Parent.LyricVersesNumbers.push(currentLyricVerseNumber);
                                }
                            }
                        }
                    }
                } catch (err) {
                    const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/LyricError", "Error while reading lyric entry.");
                    this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                    continue;
                }
            }
        }
    }

    /**
     * Returns the language of a lyric: the xml:lang of its text, else the sheet's default language for its number or name,
     * else the sheet's default language for all lyrics (MusicSheet.LyricLanguages, from <defaults><lyric-language>).
     */
    private readLanguage(lyricNode: IXmlElement, verseNumber: string): string {
        const language: string = lyricNode.element("text")?.attribute("xml:lang")?.value;
        if (language) {
            return language;
        }
        const name: string = lyricNode.attribute("name")?.value;
        const defaults: LyricLanguage[] = this.musicSheet.LyricLanguages;
        const lyricDefault: LyricLanguage =
            defaults.find((entry: LyricLanguage): boolean => entry.number !== undefined && entry.number === verseNumber ||
                entry.name !== undefined && entry.name === name) ??
            defaults.find((entry: LyricLanguage): boolean => entry.number === undefined && entry.name === undefined);
        return lyricDefault?.language;
    }
}
