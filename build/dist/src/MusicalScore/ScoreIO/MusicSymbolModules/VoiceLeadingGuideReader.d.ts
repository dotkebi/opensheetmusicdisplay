import { IXmlElement } from "../../../Common/FileIO/Xml";
import { MusicSheet } from "../../MusicSheet";
import { Note } from "../../VoiceData/Note";
/**
 * Reads voice leading guides (see [[VoiceLeadingGuide]]) from the other-notation elements of a note.
 * One reader is shared by all voices and staves of an instrument, because a guide typically starts in one
 * voice/staff and ends in another.
 */
export declare class VoiceLeadingGuideReader {
    private musicSheet;
    private openStartDict;
    /** Stops that were read before their start. MusicXML writes the upper staff of a measure first, so a guide
     *  from the lower to the upper staff within one measure has its stop before its start in document order.
     *  Such a stop is only valid for a start within the same measure. */
    private stopBeforeStartDict;
    constructor(musicSheet: MusicSheet);
    /** Whether this other-notation element marks a voice leading guide (and not some other extension). */
    static isGuideNode(node: IXmlElement): boolean;
    addGuides(otherNotationNodes: IXmlElement[], currentNote: Note): void;
    private addStart;
    private addStop;
    private createGuide;
    private readEnd;
    private readNumber;
    private static tokens;
}
