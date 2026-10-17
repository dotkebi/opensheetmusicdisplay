import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalInstantaneousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalInstantaneousDynamicExpression";
import { GraphicalUnknownExpression } from "../../../src/MusicalScore/Graphical/GraphicalUnknownExpression";
import { GraphicalLabel } from "../../../src/MusicalScore/Graphical/GraphicalLabel";
import { FontStyles } from "../../../src/Common/Enums/FontStyles";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Words whose whole text is a MusicXML dynamic's name in lower case ("p", "sf", "fp"; "rfz" in 81sabo, printed as a
 * dynamic in the sources) are drawn like a dynamic: bold italic, the dynamics' height. Other words of the same letters
 * ("R", "rfz portando") stay words. User decision B (2026-10-18). Same fixture as osmd-dart
 * test/dynamic_letter_text_glyphs_test.dart, which draws them with its dynamics' glyphs: m1 <dynamics><p/> and the lyric
 * "s", m2 words "p", m3 words "sf" and "R", m4 fingerings p and m, m5 <other-dynamics>sfmp, m6 chord names F and Fm,
 * m7 rehearsal "F" and words "rfz portando", m8 <dynamics><sfz/> and words "fp" beside it.
 */
describe("Words that are a dynamic's name", () => {
    const file: string = "test_dynamic_letter_text.musicxml";

    it("are drawn like a dynamic, other words of the same letters as words", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1600px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore(file));
        osmd.render();

        const words: GraphicalUnknownExpression[] = [];
        const dynamics: GraphicalInstantaneousDynamicExpression[] = [];
        for (const system of osmd.GraphicSheet.MusicPages[0].MusicSystems) {
            for (const staffLine of system.StaffLines) {
                for (const expression of staffLine.AbstractExpressions) {
                    if (expression instanceof GraphicalUnknownExpression) {
                        words.push(expression);
                    } else if (expression instanceof GraphicalInstantaneousDynamicExpression) {
                        dynamics.push(expression);
                    }
                }
            }
        }
        const label: (text: string) => GraphicalLabel = text => words.find(w => w.Label.Label.text === text)?.Label;
        expect(words.map(w => w.Label.Label.text)).to.have.members(["p", "sf", "R", "rfz portando", "fp"]);
        const dynamicHeight: number = dynamics[0].Label.Label.fontHeight;
        for (const text of ["p", "sf", "fp"]) {
            expect(label(text).Label.fontStyle, text).to.equal(FontStyles.BoldItalic);
            expect(label(text).Label.fontHeight, text).to.equal(dynamicHeight);
        }
        for (const text of ["R", "rfz portando"]) {
            expect(label(text).Label.fontStyle, text).to.not.equal(FontStyles.BoldItalic);
            expect(label(text).Label.fontHeight, text).to.equal(osmd.EngravingRules.UnknownTextHeight);
        }
        expect(words.find(w => w.Label.Label.text === "fp").besideDynamic, "fp beside the sfz").to.equal(true);
    });
});
