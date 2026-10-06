import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { AccidentalEnum } from "../../../src/Common/DataObjects/Pitch";
import { TestUtils } from "../../Util/TestUtils";

/**
 * The continued note of a tie draws the accidental the XML writes on it (<accidental> on the tie stop: the engraver
 * repeats it, Schumann, Myrthen 9 m8). Without <accidental> it stays implied. Same as osmd-dart
 * test/display_misc_myrthen_test.dart.
 */
describe("Tie stop with an XML accidental", () => {
    function aSharp(tie: string, accidental: boolean = true): string {
        return "<note><pitch><step>A</step><alter>1</alter><octave>4</octave></pitch><duration>1</duration>" +
            `<tie type="${tie}"/><voice>1</voice><type>eighth</type>${accidental ? "<accidental>sharp</accidental>" : ""}` +
            `<notations><tied type="${tie}"/></notations></note>`;
    }
    const xml: string = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\">" +
        "<part-list><score-part id=\"P1\"><part-name>Piano</part-name></score-part></part-list><part id=\"P1\"><measure number=\"1\">" +
        "<attributes><divisions>2</divisions><time><beats>2</beats><beat-type>4</beat-type></time>" +
        "<clef><sign>G</sign><line>2</line></clef></attributes>" +
        aSharp("start") + aSharp("stop") + aSharp("start") + aSharp("stop", false) +
        "</measure></part></score-partwise>";

    it("draws the XML accidental of a continued note", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(xml);
        osmd.render();
        const measure: any = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0].Measures[0];
        const drawn: AccidentalEnum[] = [];
        for (const entry of measure.staffEntries) {
            for (const gve of entry.graphicalVoiceEntries) {
                for (const note of gve.notes) {
                    drawn.push(note.DrawnAccidental);
                }
            }
        }
        expect(drawn).to.deep.equal([AccidentalEnum.SHARP, AccidentalEnum.SHARP, AccidentalEnum.SHARP, AccidentalEnum.NONE]);
    });
});
