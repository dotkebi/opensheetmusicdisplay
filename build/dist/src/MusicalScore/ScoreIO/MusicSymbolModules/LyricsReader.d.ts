import { VoiceEntry } from "../../VoiceData/VoiceEntry";
import { IXmlElement } from "../../../Common/FileIO/Xml";
import { MusicSheet } from "../../MusicSheet";
export declare class LyricsReader {
    private openLyricWords;
    private currentLyricWord;
    private musicSheet;
    constructor(musicSheet: MusicSheet);
    /**
     * This method adds a single LyricEntry to a VoiceEntry
     * @param {IXmlElement[]} lyricNodeList
     * @param {VoiceEntry} currentVoiceEntry
     */
    addLyricEntry(lyricNodeList: IXmlElement[], currentVoiceEntry: VoiceEntry): void;
    /**
     * Returns the language of a lyric: the xml:lang of its text, else the sheet's default language for its number or name,
     * else the sheet's default language for all lyrics (MusicSheet.LyricLanguages, from <defaults><lyric-language>).
     */
    private readLanguage;
}
