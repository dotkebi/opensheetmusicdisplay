import { MusicSheet } from "./MusicSheet";
export declare class InstrumentalGroup {
    constructor(name: string, musicSheet: MusicSheet, parent: InstrumentalGroup);
    private name;
    private number;
    private abbreviation;
    private groupSymbol;
    private musicSheet;
    private parent;
    private instrumentalGroups;
    get InstrumentalGroups(): InstrumentalGroup[];
    get Parent(): InstrumentalGroup;
    get Name(): string;
    set Name(value: string);
    /** MusicXML part-group number. Empty for instruments and unnamed groups. */
    get Number(): string;
    set Number(value: string);
    get Abbreviation(): string;
    set Abbreviation(value: string);
    get GroupSymbol(): string;
    set GroupSymbol(value: string);
    get GetMusicSheet(): MusicSheet;
}
