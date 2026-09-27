import log from "loglevel";
import { IXmlElement } from "../../../Common/FileIO/Xml";
import { MusicSheet } from "../../MusicSheet";
import { Note } from "../../VoiceData/Note";
import { VoiceLeadingGuide, VoiceLeadingGuideLineType } from "../../VoiceData/VoiceLeadingGuide";

interface PendingGuideEnd {
    note: Note;
    lineType: VoiceLeadingGuideLineType;
    color: string;
    printObject: boolean;
}

/**
 * Reads voice leading guides (see [[VoiceLeadingGuide]]) from the other-notation elements of a note.
 * One reader is shared by all voices and staves of an instrument, because a guide typically starts in one
 * voice/staff and ends in another.
 */
export class VoiceLeadingGuideReader {
    private musicSheet: MusicSheet;
    private openStartDict: { [_: number]: PendingGuideEnd } = {};
    /** Stops that were read before their start. MusicXML writes the upper staff of a measure first, so a guide
     *  from the lower to the upper staff within one measure has its stop before its start in document order.
     *  Such a stop is only valid for a start within the same measure. */
    private stopBeforeStartDict: { [_: number]: PendingGuideEnd } = {};

    constructor(musicSheet: MusicSheet) {
        this.musicSheet = musicSheet;
    }

    /** Whether this other-notation element marks a voice leading guide (and not some other extension). */
    public static isGuideNode(node: IXmlElement): boolean {
        return VoiceLeadingGuideReader.tokens(node)[0] === VoiceLeadingGuide.XmlToken;
    }

    public addGuides(otherNotationNodes: IXmlElement[], currentNote: Note): void {
        if (!otherNotationNodes || !currentNote) {
            return;
        }
        try {
            const guideNodes: IXmlElement[] = otherNotationNodes.filter(node => VoiceLeadingGuideReader.isGuideNode(node));
            // Stops first: a note that ends one guide and starts the next one can use the same number for both.
            const stopNodes: IXmlElement[] = guideNodes.filter(node => node.attribute("type")?.value === "stop");
            const startNodes: IXmlElement[] = guideNodes.filter(node => node.attribute("type")?.value === "start");
            for (const node of stopNodes) {
                this.addStop(node, currentNote);
            }
            for (const node of startNodes) {
                this.addStart(node, currentNote);
            }
        } catch (ex) {
            log.info("VoiceLeadingGuideReader.addGuides: ", ex);
        }
    }

    private addStart(node: IXmlElement, note: Note): void {
        const number: number = this.readNumber(node);
        const start: PendingGuideEnd = this.readEnd(node, note);
        const earlyStop: PendingGuideEnd = this.stopBeforeStartDict[number];
        delete this.stopBeforeStartDict[number];
        if (earlyStop && earlyStop.note.SourceMeasure === note.SourceMeasure) {
            this.createGuide(start, earlyStop, number);
            return;
        }
        this.openStartDict[number] = start; // an unfinished earlier start of this number is dropped
    }

    private addStop(node: IXmlElement, note: Note): void {
        const number: number = this.readNumber(node);
        const stop: PendingGuideEnd = this.readEnd(node, note);
        const start: PendingGuideEnd = this.openStartDict[number];
        if (start) {
            delete this.openStartDict[number];
            this.createGuide(start, stop, number);
            return;
        }
        this.stopBeforeStartDict[number] = stop;
    }

    private createGuide(start: PendingGuideEnd, stop: PendingGuideEnd, number: number): void {
        if (start.note === stop.note) {
            return;
        }
        const guide: VoiceLeadingGuide = new VoiceLeadingGuide(start.note, stop.note, start.lineType);
        guide.XMLNumber = number;
        guide.Color = start.color ?? stop.color;
        guide.PrintObject = start.printObject && stop.printObject;
        start.note.VoiceLeadingGuides.push(guide);
        stop.note.VoiceLeadingGuides.push(guide);
        this.musicSheet.HasVoiceLeadingGuides = true;
    }

    private readEnd(node: IXmlElement, note: Note): PendingGuideEnd {
        let lineType: VoiceLeadingGuideLineType = VoiceLeadingGuideLineType.Dotted;
        for (const token of VoiceLeadingGuideReader.tokens(node).slice(1)) {
            const [key, value] = token.split("=");
            if (key !== "line-type") {
                continue;
            }
            if (value === VoiceLeadingGuideLineType.Dashed) {
                lineType = VoiceLeadingGuideLineType.Dashed;
            } else if (value === VoiceLeadingGuideLineType.Solid) {
                lineType = VoiceLeadingGuideLineType.Solid;
            }
        }
        return {
            color: node.attribute("color")?.value,
            lineType: lineType,
            note: note,
            printObject: node.attribute("print-object")?.value !== "no",
        };
    }

    private readNumber(node: IXmlElement): number {
        const parsed: number = parseInt(node.attribute("number")?.value, 10);
        return Number.isFinite(parsed) ? parsed : 1;
    }

    private static tokens(node: IXmlElement): string[] {
        return (node?.value ?? "").trim().toLowerCase().split(/\s+/);
    }
}
