import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowPedal } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowPedal";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A row of Ped./* signs released just before the next Ped. stays on one line under the notes, in its own system
 * (Gluck, Che fiero costume, piano: the app drew the pedal row of a system in the treble staff of the next one). Each
 * Ped. read the bottom line the previous * had just raised, so every pedal went 3.5 spaces lower than the one before.
 * Same as osmd-dart test/pedal_row_no_cascade_test.dart.
 */
describe("Pedal row released just before each Ped.", () => {
    const measure: (n: number) => string = (n: number): string => {
        let measureXml: string = `<measure number="${n}">`;
        if (n === 1) {
            measureXml += "<attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time>" +
                "<staves>2</staves><clef number=\"1\"><sign>G</sign><line>2</line></clef>" +
                "<clef number=\"2\"><sign>F</sign><line>4</line></clef></attributes>";
        }
        for (let beat: number = 0; beat < 4; beat++) {
            measureXml += "<note><pitch><step>E</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice>" +
                "<type>quarter</type><staff>1</staff></note>";
        }
        measureXml += "<backup><duration>8</duration></backup>";
        for (let beat: number = 0; beat < 4; beat++) {
            if (n > 1 || beat > 0) {
                // released an eighth before the next Ped., as in the score
                measureXml += "<direction placement=\"below\"><direction-type><pedal type=\"stop\" line=\"no\" sign=\"yes\"/>" +
                    "</direction-type><offset>-1</offset><staff>2</staff></direction>";
            }
            measureXml += "<direction placement=\"below\"><direction-type><pedal type=\"start\" line=\"no\" sign=\"yes\"/>" +
                "</direction-type><staff>2</staff></direction>" +
                "<note><pitch><step>D</step><octave>3</octave></pitch><duration>2</duration><voice>5</voice>" +
                "<type>quarter</type><staff>2</staff></note>";
        }
        if (n === 6) {
            measureXml += "<direction placement=\"below\"><direction-type><pedal type=\"stop\" line=\"no\" sign=\"yes\"/>" +
                "</direction-type><staff>2</staff></direction>";
        }
        return measureXml + "</measure>";
    };
    const xml: string = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list>" +
        "<score-part id=\"P1\"><part-name>Piano</part-name></score-part></part-list><part id=\"P1\">" +
        [1, 2, 3, 4, 5, 6].map(measure).join("") + "</part></score-partwise>";

    it("keeps every system's Ped./* row level under the notes, above the next system", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "700px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(xml);
        osmd.render();
        const systems: MusicSystem[] = [].concat(...osmd.GraphicSheet.MusicPages.map(page => page.MusicSystems));
        expect(systems.length).to.be.greaterThan(1);
        systems.forEach((system, index) => {
            const bass: any = system.StaffLines[system.StaffLines.length - 1];
            const pedals: VexFlowPedal[] = bass.Pedals as VexFlowPedal[];
            expect(pedals.length).to.be.greaterThan(2);
            const lines: number[] = pedals.map(pedal => (pedal.getPedalMarking() as any).line);
            // notes inside the staff: no pedal needs more than the minimum line, as a lone pedal gets
            for (const line of lines) {
                expect(line, `system ${index}: pedal lines ${lines}`).to.be.at.most(1);
            }
            if (index + 1 < systems.length) {
                const last: VexFlowPedal = pedals[pedals.length - 1];
                const stave: any = last.startVfVoiceEntry.vfStaveNote.getStave();
                const baseline: number = stave.getYForBottomText((last.getPedalMarking() as any).line + 3) / 10;
                const nextTop: number = systems[index + 1].StaffLines[0].PositionAndShape.AbsolutePosition.y;
                expect(baseline, `system ${index} pedal baseline ${baseline}, next system top ${nextTop}`).to.be.lessThan(nextTop);
            }
        });
    });
});
