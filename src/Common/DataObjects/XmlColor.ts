const hex8: RegExp = /^#[0-9a-fA-F]{8}$/;

/**
 * MusicXML `color` attributes are `#RRGGBB` or `#AARRGGBB` (alpha first).
 * OSMD options, the model and the renderer use CSS colors, where 8-digit hex is `#RRGGBBAA` (alpha last),
 * because the strings are handed to SVG/canvas as is.
 *
 * Converts `#AARRGGBB` to `#RRGGBBAA`. Any other string (incl. `#RRGGBB`, named colors, undefined) is returned unchanged.
 * With `alphaLast` (see [[musicXmlColorsAreAlphaLast]]), 8-digit colors are already `#RRGGBBAA` and are returned unchanged too.
 */
export function musicXmlColorToCss(color: string, alphaLast: boolean = false): string {
    if (alphaLast || !color || !hex8.test(color)) {
        return color;
    }
    return "#" + color.substring(3) + color.substring(1, 3);
}

/**
 * Whether the file's 8-digit colors are `#RRGGBBAA` (alpha last) instead of MusicXML's `#AARRGGBB`.
 *
 * MuseScore 4 exports a color with alpha != 255 as `#RRGGBBAA`, against the MusicXML spec:
 * its `Color::toString()` (muse::draw / muse_framework `rgb2hex`) appends the alpha after RGB.
 * Checked in the sources of v4.0, v4.2.0, v4.6.0 and main (2026-10). Its own MusicXML import reads 8 digits as
 * `#AARRGGBB` (`Color::fromString`), so MuseScore 4 doesn't read its own colors back correctly either.
 * MuseScore 3 exports `QColor::name()`, i.e. `#RRGGBB` only, so it is not affected.
 * Example: OSMD's test_note_notehead_color_transparent.musicxml (MuseScore 4.5.2), `color="#0102B300"` = transparent #0102B3.
 *
 * Only MuseScore 4.x is matched: `<software>` is "MuseScore 4.x" up to 4.4 and "MuseScore Studio 4.x" from 4.5/4.6 on
 * (v4.6.0 exportmusicxml.cpp: "MuseScore Studio " + version). MuseScore main still writes alpha last,
 * so check again when MuseScore 5 appears.
 *
 * @param software the `<identification><encoding><software>` values of the file
 */
export function musicXmlColorsAreAlphaLast(software: string[]): boolean {
    return software.some(name => /^\s*MuseScore (Studio )?4(\.|\s|$)/i.test(name ?? ""));
}
