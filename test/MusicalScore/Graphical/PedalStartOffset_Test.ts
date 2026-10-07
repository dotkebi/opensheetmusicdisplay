import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowPedal } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowPedal";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A Ped. with a positive <offset> is drawn at the note of that time (Gluck, Intorno all'idol mio m16: the Ped. of beat
 * 3, written before the first note with <offset>2 quarters</offset>, was drawn at beat 1 — the pedal start was read
 * with the division offset ignored). Same as osmd-dart test/pedal_start_offset_test.dart.
 */
describe("Pedal start with a positive offset", () => {
    const note: (step: string) => string = (step: string): string =>
        `<note><pitch><step>${step}</step><octave>3</octave></pitch><duration>2</duration><voice>1</voice>` +
        "<type>quarter</type></note>";
    const xml: string = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list>" +
        "<score-part id=\"P1\"><part-name>Piano</part-name></score-part></part-list><part id=\"P1\"><measure number=\"1\">" +
        "<attributes><divisions>2</divisions><time><beats>3</beats><beat-type>4</beat-type></time>" +
        "<clef><sign>F</sign><line>4</line></clef></attributes>" +
        "<direction placement=\"below\"><direction-type><pedal type=\"start\" line=\"no\" sign=\"yes\"/></direction-type>" +
        "<offset>4</offset></direction>" +
        "<direction placement=\"below\"><direction-type><pedal type=\"stop\" line=\"no\" sign=\"yes\"/></direction-type>" +
        "<offset>5</offset></direction>" +
        note("C") + note("E") + note("G") + "</measure></part></score-partwise>";

    it("starts the pedal at the note on beat 3", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(xml);
        osmd.render();
        const pedal: VexFlowPedal = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0].Pedals[0] as VexFlowPedal;
        expect(pedal.getPedal.ParentStartMultiExpression.Timestamp.RealValue).to.equal(0.5);
        expect(pedal.startVfVoiceEntry.parentStaffEntry.relInMeasureTimestamp.RealValue).to.equal(0.5);
    });
});
