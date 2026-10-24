import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../Util/TestUtils";

/**
 * The sounding pitch comes from <alter>; <accidental> is the printed sign. A printed sign that disagrees with <alter>
 * is drawn as printed, and the measure keeps the sounding alteration: Eccles, Violin Sonata in G minor (1720 engraving)
 * Largo m4, a sharp before a key-signature E flat cancels the flat (sounds E natural; 81sabo encodes <alter> 0 +
 * <accidental>sharp). Before, the sharp was drawn as a natural. Same as osmd-dart test/accidental_alter_mismatch_test.dart.
 */
describe("Printed accidental that disagrees with <alter>", () => {
    function note(step: string, accidental?: string, alter?: string): string {
        return `<note><pitch><step>${step}</step>${alter ? `<alter>${alter}</alter>` : ""}<octave>5</octave></pitch>` +
            `<duration>1</duration><voice>1</voice><type>eighth</type>${accidental ? `<accidental>${accidental}</accidental>` : ""}</note>`;
    }
    function score(fifths: number, notes: string): string {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\">" +
            "<part-list><score-part id=\"P1\"><part-name>Violin</part-name></score-part></part-list><part id=\"P1\"><measure number=\"1\">" +
            `<attributes><divisions>2</divisions><key><fifths>${fifths}</fifths></key><time><beats>2</beats><beat-type>4</beat-type></time>` +
            "<clef><sign>G</sign><line>2</line></clef></attributes>" + notes + "</measure></part></score-partwise>";
    }
    async function drawn(xml: string): Promise<{ glyphs: string[], halfTones: number[] }> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(xml);
        osmd.render();
        const measure: any = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0].Measures[0];
        const glyphs: string[] = [];
        const halfTones: number[] = [];
        for (const entry of measure.staffEntries) {
            for (const gve of entry.graphicalVoiceEntries) {
                for (const gn of gve.notes) {
                    const accidentals: any[] = gn.vfnote[0].getModifiers().filter((m: any) => m.getCategory() === "accidentals");
                    glyphs.push(accidentals.map((a: any) => a.type).join("") || "-");
                    halfTones.push(gn.sourceNote.Pitch.getHalfTone());
                }
            }
        }
        return { glyphs, halfTones };
    }

    it("draws a historical sharp as printed and sounds E natural (Eccles)", async () => {
        const { glyphs, halfTones } = await drawn(score(-2, note("D") + note("E", "sharp") + note("E") + note("D")));
        expect(glyphs).to.deep.equal(["-", "#", "-", "-"]);
        expect(halfTones[1]).to.equal(halfTones[2]);
    });

    it("draws an exported sign without <alter> as printed", async () => {
        const { glyphs } = await drawn(score(1, note("C", "sharp") + note("C") + note("B", "flat") + note("B")));
        expect(glyphs).to.deep.equal(["#", "-", "b", "-"]);
    });
});
