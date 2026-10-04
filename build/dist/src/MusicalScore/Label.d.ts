import { TextAlignmentEnum } from "../Common/Enums/TextAlignment";
import { OSMDColor } from "../Common/DataObjects/OSMDColor";
import { Fonts } from "../Common/Enums/Fonts";
import { FontStyles } from "../Common/Enums/FontStyles";
/**
 * A text label on the graphical music sheet.
 * It is used e.g. for titles, composer names, instrument names and dynamic instructions.
 */
export declare class Label {
    constructor(text?: string, alignment?: TextAlignmentEnum, font?: Fonts, print?: boolean);
    text: string;
    print: boolean;
    color: OSMDColor;
    colorDefault: string;
    font: Fonts;
    fontFamily: string;
    fontStyle: FontStyles;
    fontHeight: number;
    /** The language of the text as a BCP 47 tag, e.g. "ja" or "zh-CN", read from MusicXML's xml:lang (undefined if not given).
     * It is drawn as the text's language, so that e.g. a browser draws kanji with Japanese instead of Chinese glyphs. */
    language: string;
    textAlignment: TextAlignmentEnum;
    IsCreditLabel: boolean;
    ToString(): string;
}
