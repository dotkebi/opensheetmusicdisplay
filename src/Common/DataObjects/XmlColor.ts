const hex8: RegExp = /^#[0-9a-fA-F]{8}$/;

/**
 * MusicXML `color` attributes are `#RRGGBB` or `#AARRGGBB` (alpha first).
 * OSMD options, the model and the renderer use CSS colors, where 8-digit hex is `#RRGGBBAA` (alpha last),
 * because the strings are handed to SVG/canvas as is.
 *
 * Converts `#AARRGGBB` to `#RRGGBBAA`. Any other string (incl. `#RRGGBB`, named colors, undefined) is returned unchanged.
 */
export function musicXmlColorToCss(color: string): string {
    if (!color || !hex8.test(color)) {
        return color;
    }
    return "#" + color.substring(3) + color.substring(1, 3);
}
