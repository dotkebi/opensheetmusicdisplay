import { MusicSheet } from "./MusicSheet";

export class InstrumentalGroup {

    constructor(name: string, musicSheet: MusicSheet, parent: InstrumentalGroup) {
        this.name = name;
        this.musicSheet = musicSheet;
        this.parent = parent;
    }

    private name: string;
    private number: string = "";
    private abbreviation: string = "";
    private groupSymbol: string = "";
    private musicSheet: MusicSheet;
    private parent: InstrumentalGroup;
    private instrumentalGroups: InstrumentalGroup[] = [];

    public get InstrumentalGroups(): InstrumentalGroup[] {
        return this.instrumentalGroups;
    }
    public get Parent(): InstrumentalGroup {
        return this.parent;
    }
    public get Name(): string {
        return this.name;
    }
    public set Name(value: string) {
        this.name = value;
    }
    /** MusicXML part-group number. Empty for instruments and unnamed groups. */
    public get Number(): string {
        return this.number;
    }
    public set Number(value: string) {
        this.number = value;
    }
    public get Abbreviation(): string {
        return this.abbreviation;
    }
    public set Abbreviation(value: string) {
        this.abbreviation = value;
    }
    public get GroupSymbol(): string {
        return this.groupSymbol;
    }
    public set GroupSymbol(value: string) {
        this.groupSymbol = value;
    }
    public get GetMusicSheet(): MusicSheet {
        return this.musicSheet;
    }

}
