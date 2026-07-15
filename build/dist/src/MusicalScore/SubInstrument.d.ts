import { Instrument } from "./Instrument";
import { MidiInstrument } from "./VoiceData/Instructions/ClefInstruction";
/** Broad family suitable for grouping MusicXML score parts in a UI. */
export declare enum InstrumentFamily {
    Unknown = "unknown",
    Strings = "strings",
    Woodwind = "woodwind",
    Brass = "brass",
    Percussion = "percussion",
    Keyboard = "keyboard",
    Voice = "voice",
    Other = "other"
}
export declare class SubInstrument {
    constructor(parentInstrument: Instrument);
    private static midiInstrument;
    idString: string;
    midiInstrumentID: MidiInstrument;
    volume: number;
    pan: number;
    fixedKey: number;
    name: string;
    private instrumentSound;
    private family;
    private parentInstrument;
    get ParentInstrument(): Instrument;
    /** Raw MusicXML score-instrument/instrument-sound value. */
    get InstrumentSound(): string;
    get Family(): InstrumentFamily;
    static isPianoInstrument(instrument: MidiInstrument): boolean;
    setMidiInstrument(instrumentType: string): void;
    setInstrumentSound(instrumentSound: string): void;
    setMidiProgram(program: number): void;
    setPercussion(): void;
    private static familyFromInstrumentSound;
    private static familyFromMidiInstrument;
    private parseMidiInstrument;
}
