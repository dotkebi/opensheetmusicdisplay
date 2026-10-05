import { VoiceEntry } from "./VoiceEntry";
import { Note } from "./Note";
export declare class Arpeggio {
    constructor(parentVoiceEntry: VoiceEntry, type?: ArpeggioType);
    /** The voice entry the arpeggio was read with (first in XML order). Its notes may belong to other voice entries
     *  of the same staff entry, or of another staff of the instrument (see VoiceGenerator: <arpeggiate number>). */
    parentVoiceEntry: VoiceEntry;
    notes: Note[];
    type: ArpeggioType;
    /** MusicXML <arpeggiate number="n">, undefined if not given. Only used while reading, to group the notes. */
    XmlNumber: string;
    addNote(note: Note): void;
}
/** Corresponds to VF.Stroke.Type for now. But we don't want VexFlow as a dependency here. */
export declare enum ArpeggioType {
    BRUSH_DOWN = 1,
    BRUSH_UP = 2,
    ROLL_DOWN = 3,
    ROLL_UP = 4,
    RASQUEDO_DOWN = 5,
    RASQUEDO_UP = 6,
    ARPEGGIO_DIRECTIONLESS = 7
}
