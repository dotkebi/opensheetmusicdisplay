import {Instrument} from "./Instrument";
import {MidiInstrument} from "./VoiceData/Instructions/ClefInstruction";
import log from "loglevel";

/** Broad family suitable for grouping MusicXML score parts in a UI. */
export enum InstrumentFamily {
    Unknown = "unknown",
    Strings = "strings",
    Woodwind = "woodwind",
    Brass = "brass",
    Percussion = "percussion",
    Keyboard = "keyboard",
    Voice = "voice",
    Other = "other"
}

export class SubInstrument {

    constructor(parentInstrument: Instrument) {
        this.parentInstrument = parentInstrument;
        this.fixedKey = -1;
        this.name = this.parseMidiInstrument(this.parentInstrument.Name);
        this.midiInstrumentID = SubInstrument.midiInstrument[this.name];
        if (this.name !== "unnamed") {
            this.family = SubInstrument.familyFromMidiInstrument(this.midiInstrumentID);
        }
        this.volume = 1.0;
    }

    private static midiInstrument: { [key: string]: MidiInstrument } = {
        "alt": MidiInstrument.Synth_Voice,
        "alto": MidiInstrument.Synth_Voice,
        "banjo": MidiInstrument.Banjo,
        "bariton": MidiInstrument.Synth_Voice,
        "baritone": MidiInstrument.Synth_Voice,
        "bass": MidiInstrument.Synth_Voice,
        "blockfloete": MidiInstrument.Recorder,
        "brass": MidiInstrument.Trombone,
        "bratsche": MidiInstrument.Viola,
        "cello": MidiInstrument.Cello,
        "clarinet": MidiInstrument.Clarinet,
        "contrabass": MidiInstrument.Contrabass,
        "drums": MidiInstrument.Percussion,
        "flute": MidiInstrument.Flute,
        "floete": MidiInstrument.Flute,
        "frenchhorn": MidiInstrument.French_Horn,
        "gitarre": MidiInstrument.Acoustic_Guitar_nylon,
        "guitar": MidiInstrument.Acoustic_Guitar_nylon,
        "harfe": MidiInstrument.Orchestral_Harp,
        "harp": MidiInstrument.Orchestral_Harp,
        "klarinette": MidiInstrument.Clarinet,
        "klavier": MidiInstrument.Acoustic_Grand_Piano,
        "kontrabass": MidiInstrument.Contrabass,
        "oboe": MidiInstrument.Oboe,
        "organ": MidiInstrument.Church_Organ,
        "orgel": MidiInstrument.Church_Organ,
        "orgue": MidiInstrument.Church_Organ,
        "percussion": MidiInstrument.Percussion,
        "piano": MidiInstrument.Acoustic_Grand_Piano,
        "piccolo": MidiInstrument.Piccolo,
        "posaune": MidiInstrument.Trombone,
        "recorder": MidiInstrument.Recorder,
        "sax": MidiInstrument.Tenor_Sax,
        "schlagwerk": MidiInstrument.Percussion,
        "schlagzeug": MidiInstrument.Percussion,
        "sopran": MidiInstrument.Synth_Voice,
        "steeldrum": MidiInstrument.Steel_Drums,
        "streicher": MidiInstrument.String_Ensemble_1,
        "strings": MidiInstrument.String_Ensemble_1,
        "tenor": MidiInstrument.Synth_Voice,
        "tpt": MidiInstrument.Trumpet,
        "trombone": MidiInstrument.Trombone,
        "trompete": MidiInstrument.Trumpet,
        "trumpet": MidiInstrument.Trumpet,
        "tuba": MidiInstrument.Tuba,
        "unnamed": MidiInstrument.Acoustic_Grand_Piano,
        "viola": MidiInstrument.Viola,
        "violin": MidiInstrument.Violin,
        "violon-c": MidiInstrument.Cello,
        "violon.": MidiInstrument.Violin,
        "voice": MidiInstrument.Synth_Voice,
        "woodblock": MidiInstrument.Woodblock
    };

    public idString: string;
    public midiInstrumentID: MidiInstrument;
    public volume: number;
    public pan: number;
    public fixedKey: number;
    public name: string;
    private instrumentSound: string = "";
    private family: InstrumentFamily = InstrumentFamily.Unknown;

    private parentInstrument: Instrument;

    public get ParentInstrument(): Instrument {
        return this.parentInstrument;
    }
    /** Raw MusicXML score-instrument/instrument-sound value. */
    public get InstrumentSound(): string {
        return this.instrumentSound;
    }
    public get Family(): InstrumentFamily {
        return this.family;
    }
    public static isPianoInstrument(instrument: MidiInstrument): boolean {
        return (instrument === MidiInstrument.Acoustic_Grand_Piano
          || instrument === MidiInstrument.Bright_Acoustic_Piano
          || instrument === MidiInstrument.Electric_Grand_Piano
          || instrument === MidiInstrument.Electric_Piano_1
          || instrument === MidiInstrument.Electric_Piano_2);
    }
    public setMidiInstrument(instrumentType: string): void {
        const parsedName: string = this.parseMidiInstrument(instrumentType);
        this.midiInstrumentID = SubInstrument.midiInstrument[parsedName];
        if (!this.instrumentSound && parsedName !== "unnamed") {
            this.family = SubInstrument.familyFromMidiInstrument(this.midiInstrumentID);
        }
    }

    public setInstrumentSound(instrumentSound: string): void {
        this.instrumentSound = instrumentSound ? instrumentSound.trim() : "";
        this.family = SubInstrument.familyFromInstrumentSound(this.instrumentSound);
    }

    public setMidiProgram(program: number): void {
        this.midiInstrumentID = <MidiInstrument>Math.max(0, program - 1);
        if (!this.instrumentSound) {
            this.family = SubInstrument.familyFromMidiInstrument(this.midiInstrumentID);
        }
    }

    public setPercussion(): void {
        this.midiInstrumentID = MidiInstrument.Percussion;
        this.family = InstrumentFamily.Percussion;
    }

    private static familyFromInstrumentSound(instrumentSound: string): InstrumentFamily {
        if (!instrumentSound) {
            return InstrumentFamily.Unknown;
        }
        const root: string = instrumentSound.toLowerCase().split(".")[0];
        switch (root) {
            case "strings":
            case "pluck":
                return InstrumentFamily.Strings;
            case "wind":
                return InstrumentFamily.Woodwind;
            case "brass":
                return InstrumentFamily.Brass;
            case "drum":
            case "metal":
            case "percussion":
                return InstrumentFamily.Percussion;
            case "keyboard":
                return InstrumentFamily.Keyboard;
            case "voice":
                return InstrumentFamily.Voice;
            default:
                return InstrumentFamily.Other;
        }
    }

    private static familyFromMidiInstrument(instrument: MidiInstrument): InstrumentFamily {
        const program: number = instrument as number;
        if (program < 0) {
            return InstrumentFamily.Unknown;
        }
        if (program === MidiInstrument.Percussion || (program >= 8 && program <= 15)
            || program === 47 || program === 108 || (program >= 112 && program <= 119)) {
            return InstrumentFamily.Percussion;
        }
        if ((program >= 0 && program <= 7) || (program >= 16 && program <= 20)) {
            return InstrumentFamily.Keyboard;
        }
        if ((program >= 21 && program <= 23) || (program >= 64 && program <= 79)
            || program === 109 || program === 111) {
            return InstrumentFamily.Woodwind;
        }
        if ((program >= 24 && program <= 46) || (program >= 48 && program <= 51)
            || (program >= 104 && program <= 107) || program === 110) {
            return InstrumentFamily.Strings;
        }
        if (program >= 52 && program <= 54) {
            return InstrumentFamily.Voice;
        }
        if (program >= 56 && program <= 63) {
            return InstrumentFamily.Brass;
        }
        return InstrumentFamily.Other;
    }

    private parseMidiInstrument(instrumentType: string): string {
        // FIXME: test this function
        try {
            // find the best match for the given instrumentType:
            if (instrumentType) {
                const tmpName: string = instrumentType.toLowerCase().trim();
                for (const key in SubInstrument.midiInstrument) {
                    if (tmpName.indexOf(key) !== -1) {
                        return key;
                    }
                }
            }
            // if the instrumentType didn't work, use the name:
            if (this.parentInstrument.Name) {
                const tmpName: string = this.parentInstrument.Name.toLowerCase().trim();
                for (const key in SubInstrument.midiInstrument) {
                    if (tmpName.indexOf(key) !== -1) {
                        return key;
                    }
                }
            }
        } catch (e) {
            log.error("Error parsing MIDI Instrument. Default to Grand Piano.");
        }
        return "unnamed";
    }

}
