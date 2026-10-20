import { PlacementEnum } from "./Expressions/AbstractExpression";

/** The hand a keyboard hand bracket assigns its note to. */
export enum KeyboardHand {
    Left = "left",
    Right = "right",
}

/**
 * A MusicXML `<technical><other-technical>` of a note: a technical indication without its own MusicXML element,
 * named by its SMuFL glyph (`smufl` attribute) and/or given as text.
 * Only the keyboard hand brackets (SMuFL keyboardPlayWithLH, keyboardPlayWithRH) are drawn
 * (GraphicalKeyboardHandBracket). The others are kept in the model, so they aren't lost, but not drawn.
 */
export class OtherTechnical {
    constructor(smufl: string, text: string, placement: PlacementEnum) {
        this.Smufl = smufl;
        this.Text = text;
        this.Placement = placement;
    }

    /** SMuFL glyph name from the `smufl` attribute, undefined if there is none. */
    public Smufl: string;
    /** Text content of the element, "" if there is none. */
    public Text: string;
    public Placement: PlacementEnum;

    /** The hand of a keyboard hand bracket, undefined for other indications.
     *  The end glyphs (keyboardPlayWithLHEnd, keyboardPlayWithRHEnd) end a bracket spanning several notes, which isn't drawn. */
    public get KeyboardHand(): KeyboardHand {
        switch (this.Smufl) {
            case "keyboardPlayWithLH":
                return KeyboardHand.Left;
            case "keyboardPlayWithRH":
                return KeyboardHand.Right;
            default:
                return undefined;
        }
    }
}
