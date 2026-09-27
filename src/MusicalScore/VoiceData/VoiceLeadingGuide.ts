import { Note } from "./Note";

export enum VoiceLeadingGuideLineType {
    Dotted = "dotted",
    Dashed = "dashed",
    Solid = "solid",
}

/**
 * A purely visual line that connects two noteheads to show where a voice continues,
 * typically across the staves of a keyboard part (e.g. an inner voice handed from the right to the left hand).
 *
 * It is not a slur, tie, slide or glissando: it has no effect on pitches, durations, voices or playback,
 * and is deliberately kept out of [[Note.NoteSlurs]], [[Note.NoteTie]] and [[Note.NoteGlissando]].
 *
 * MusicXML has no dedicated element for this, so it is read from
 * `<notations><other-notation type="start|stop" number="n">voice-leading-guide line-type=dotted</other-notation>`
 * on the two notes it connects (see VoiceLeadingGuideReader).
 */
export class VoiceLeadingGuide {
    /** Text content of the other-notation element that marks a voice leading guide. */
    public static readonly XmlToken: string = "voice-leading-guide";

    constructor(startNote: Note, endNote: Note, lineType: VoiceLeadingGuideLineType = VoiceLeadingGuideLineType.Dotted) {
        this.StartNote = startNote;
        this.EndNote = endNote;
        this.LineType = lineType;
    }

    public StartNote: Note;
    public EndNote: Note;
    public LineType: VoiceLeadingGuideLineType;
    public XMLNumber: number = 1;
    /** Color as given in the XML (e.g. #000000), undefined = default. */
    public Color: string;
    /** false for print-object="no": the connection is kept in the model, but not drawn. */
    public PrintObject: boolean = true;
}
