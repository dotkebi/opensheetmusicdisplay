import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Rests of a lower voice under another voice's note (Schumann, Myrthen):
 * - 6 m11, left hand (voices 1, 5, 6): the 8th rest of voice 5 (the lower voice) at the time of voice 6's E3 (stem up).
 *   VexFlow's rest collisions took the first of the rest and the note as the upper voice and moved the rest up onto
 *   the E3; it is below it now, as engraved.
 * - 12 m28: voice 1 has no stems in the MusicXML (D3, then a quarter rest) and the other voice's F3 (stem down) is at the
 *   rest's time: the rest goes by its voice's notes, below (it was put above by the voice number, between the staves).
 * Same as osmd-dart test/rest_below_other_voice_test.dart.
 */
describe("Rest below another voice's note", () => {
    function score(body: string): string {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\">" +
            "<part-list><score-part id=\"P1\"><part-name>Piano</part-name></score-part></part-list><part id=\"P1\">" +
            "<measure number=\"1\"><attributes><divisions>4</divisions><time><beats>3</beats><beat-type>4</beat-type></time>" +
            "<clef><sign>F</sign><line>4</line></clef></attributes>" + body + "</measure></part></score-partwise>";
    }
    function note(step: string, octave: number, duration: number, voice: number, type: string, stem: string): string {
        return `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${duration}</duration>` +
            `<voice>${voice}</voice><type>${type}</type>${stem ? `<stem>${stem}</stem>` : ""}</note>`;
    }
    function rest(duration: number, voice: number, type: string, hidden: boolean = false): string {
        return `<note${hidden ? " print-object=\"no\"" : ""}><rest/><duration>${duration}</duration><voice>${voice}</voice>` +
            `<type>${type}</type></note>`;
    }
    // 6 m11, left hand (simplified): voice 1 up to the 8th before the end, voice 5 C3 ... E2 and an 8th rest, voice 6 hidden
    //   rests and E3 at the end
    const threeVoices: string = score(
        note("C", 4, 4, 1, "quarter", "up") + note("E", 3, 6, 1, "quarter", "up").replace("</type>", "</type><dot/>") +
        "<backup><duration>10</duration></backup>" +
        note("C", 3, 4, 5, "quarter", "down") + note("E", 2, 6, 5, "quarter", "down").replace("</type>", "</type><dot/>") +
        rest(2, 5, "eighth") +
        "<backup><duration>12</duration></backup>" + rest(8, 6, "half", true) + rest(2, 6, "eighth", true) +
        note("E", 3, 2, 6, "eighth", "up"));
    // 12 m28, left hand (simplified): voice 1 without stems D3 and a quarter rest, voice 2 F3 D3 (stems down) at the rest
    const stemlessVoice: string = score(
        note("D", 3, 4, 1, "quarter", "") + rest(4, 1, "quarter") + rest(4, 1, "quarter") +
        "<backup><duration>12</duration></backup>" + rest(4, 2, "quarter", true) +
        note("F", 3, 2, 2, "eighth", "down") + note("D", 3, 2, 2, "eighth", "down") + rest(4, 2, "quarter", true));

    async function render(xml: string): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "800px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(xml);
        osmd.render();
        return osmd;
    }
    /** the key lines of the visible rest and the visible note of the given staff entry */
    function lines(osmd: OpenSheetMusicDisplay, entryIndex: number): { rest: number, note: number } {
        const entries: VexFlowVoiceEntry[] = osmd.GraphicSheet.MeasureList[0][0].staffEntries[entryIndex]
            .graphicalVoiceEntries as VexFlowVoiceEntry[];
        const visible: VexFlowVoiceEntry[] = entries.filter(e => e.notes[0].sourceNote.PrintObject);
        const restNote: any = visible.find(e => e.notes[0].sourceNote.isRest()).vfStaveNote;
        const other: any = visible.find(e => !e.notes[0].sourceNote.isRest()).vfStaveNote;
        return { rest: restNote.getKeyProps()[0].line, note: other.getKeyProps()[0].line };
    }

    it("puts the 8th rest of the lower voice below the upper voice's note", async () => {
        const osmd: OpenSheetMusicDisplay = await render(threeVoices);
        const { rest: restLine, note: noteLine } = lines(osmd, osmd.GraphicSheet.MeasureList[0][0].staffEntries.length - 1);
        expect(restLine, `rest line ${restLine}, note line ${noteLine}`).to.be.at.most(noteLine - 1.5);
    });

    it("puts the rest of a voice without stems on the side of its notes", async () => {
        const osmd: OpenSheetMusicDisplay = await render(stemlessVoice);
        const { rest: restLine, note: noteLine } = lines(osmd, 1);
        expect(restLine, `rest line ${restLine}, note line ${noteLine}`).to.be.lessThan(noteLine);
    });
});
