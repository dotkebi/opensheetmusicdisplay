import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowPedal } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowPedal";
import { TestUtils } from "../../Util/TestUtils";

/**
 * The Ped. sign clears a low note at its start (Schumann, Myrthen 11 m48: G1 with ledger lines under the Ped. sign).
 * The sign's footroom was the notes' bottom line, but the glyph reaches about 2 spaces above its baseline, 1 below the
 * footroom: it was drawn into the note. (Also, the bottom line was read at absolute x values, about the system's left
 * margin to the right of the pedal.) Same as osmd-dart test/pedal_start_low_note_test.dart.
 */
describe("Pedal sign under a low note", () => {
    const xml: string = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\">" +
        "<part-list><score-part id=\"P1\"><part-name>Piano</part-name></score-part></part-list><part id=\"P1\">" +
        "<measure number=\"1\"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>" +
        "<clef><sign>F</sign><line>4</line></clef></attributes>" +
        "<direction placement=\"below\"><direction-type><pedal type=\"start\" line=\"no\" sign=\"yes\"/></direction-type></direction>" +
        [["G", 1, "up"], ["D", 3, "down"], ["F", 3, "down"]].map(([step, octave, stem]) =>
            `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>1</duration><voice>1</voice>` +
            `<type>quarter</type><stem>${stem}</stem></note>`).join("") +
        "<direction placement=\"below\"><direction-type><pedal type=\"stop\" line=\"no\" sign=\"yes\"/></direction-type></direction>" +
        "<note><pitch><step>A</step><octave>3</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type>" +
        "<stem>down</stem></note></measure></part></score-partwise>";

    it("puts the Ped. sign's top half a space below the low note", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(xml);
        osmd.render();
        const pedal: VexFlowPedal = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0].Pedals[0] as VexFlowPedal;
        const marking: any = pedal.getPedalMarking();
        const note: any = pedal.startVfVoiceEntry.vfStaveNote;
        const stave: any = note.getStave();
        const space: number = stave.getSpacingBetweenLines();
        const baseline: number = stave.getYForBottomText(marking.line + 3);
        const low: number = Math.max(...note.getYs());
        // the glyph reaches about 2 spaces above its baseline, the notehead half a space below its y
        expect(baseline - 2 * space, `Ped. baseline ${baseline}, G1 at ${low} (line ${marking.line})`).to.be.at.least(low + space - 0.05 * space);
    });
});
