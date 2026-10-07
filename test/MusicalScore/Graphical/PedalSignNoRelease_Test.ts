import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowPedal } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowPedal";
import { Pedal } from "../../../src/MusicalScore/VoiceData/Expressions/ContinuousExpressions/Pedal";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A stop without its sign (sign="no") draws no * and is no change (Gluck, Tu lo sai m31-32, Ricordi: `Ped. Ped. Ped. *`
 * written as stop sign="no" + start at one note, the last stop with its sign). The stop's sign was not read: every pair
 * became a change (`* Ped.`). Same as osmd-dart test/pedal_sign_termination_test.dart, fixture
 * pedal_sign_stop_without_sign.musicxml.
 */
describe("Pedal stop without its sign", () => {
    const note: (step: string, octave: number, staff: number) => string = (step: string, octave: number, staff: number): string =>
        `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>4</duration>` +
        `<voice>${staff === 1 ? 1 : 5}</voice><type>quarter</type><staff>${staff}</staff></note>`;
    const pedalXml: (type: string, sign: string) => string = (type: string, sign: string): string =>
        `<direction placement="below"><direction-type><pedal type="${type}" line="no" sign="${sign}" number="1"/>` +
        "</direction-type><staff>2</staff></direction>";
    const treble: string = note("C", 5, 1) + note("D", 5, 1) + note("E", 5, 1) + "<backup><duration>12</duration></backup>";
    const xml: string = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list>" +
        "<score-part id=\"P1\"><part-name>Piano</part-name></score-part></part-list><part id=\"P1\">" +
        "<measure number=\"1\"><attributes><divisions>4</divisions><time><beats>3</beats><beat-type>4</beat-type></time>" +
        "<staves>2</staves><clef number=\"1\"><sign>G</sign><line>2</line></clef><clef number=\"2\"><sign>F</sign><line>4</line>" +
        "</clef></attributes>" + treble +
        pedalXml("start", "yes") + note("C", 3, 2) + pedalXml("stop", "no") + pedalXml("start", "yes") + note("G", 3, 2) + note("E", 3, 2) +
        "</measure><measure number=\"2\">" + treble +
        pedalXml("stop", "no") + pedalXml("start", "yes") + note("C", 3, 2) + note("G", 3, 2) + pedalXml("stop", "yes") + note("E", 3, 2) +
        "</measure></part></score-partwise>";

    it("draws every Ped. and only the last *", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(xml);
        osmd.render();
        const source: Pedal[] = [];
        for (const measure of osmd.Sheet.SourceMeasures) {
            for (const staffExpressions of measure.StaffLinkedExpressions) {
                for (const multi of staffExpressions) {
                    if (multi.PedalStart && source.indexOf(multi.PedalStart) < 0) {
                        source.push(multi.PedalStart);
                    }
                }
            }
        }
        expect(source.map(pedal => pedal.ReleaseHidden)).to.deep.equal([true, true, false]);
        expect(source.some(pedal => pedal.ChangeBegin || pedal.ChangeEnd)).to.equal(false);
        const pedals: VexFlowPedal[] = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[1].Pedals as VexFlowPedal[];
        expect(pedals.length).to.equal(3);
        expect(pedals.map(pedal => pedal.DepressText), "every Ped. is drawn").to.deep.equal([undefined, undefined, undefined]);
        expect(pedals.map(pedal => pedal.ReleaseText), "only the last * is drawn").to.deep.equal([" ", " ", undefined]);
    });
});
