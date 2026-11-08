import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A heavy-heavy barline (bar-style heavy-heavy, SystemLinesEnum.DoubleBold) of a part with several staves is drawn twice: each
 * stave's end barline becomes Barline.type.DOUBLE_HEAVY (8, VexFlowPatch), and a StaveConnector joins the staves at it. The
 * connector type comes from VexFlowConverter.line(), which had no case for DoubleBold: the connector kept VexFlow's default type
 * DOUBLE and drew a heavy line 5px left of the measure's start, so a piano's last measure started with a heavy double line while
 * its heavy-heavy end barlines were not joined between the staves. Now the connector is DOUBLE_HEAVY_RIGHT (9, VexFlowPatch),
 * two heavy lines at the right of the staves, exactly over the staves' end barlines.
 */
describe("Heavy-heavy barline of a part with two staves", () => {
    const DOUBLE: number = 2; // VF.StaveConnector.type.DOUBLE, VexFlow's default
    const DOUBLE_HEAVY_RIGHT: number = 9; // VexFlowPatch
    const BARLINE_DOUBLE_HEAVY: number = 8; // VF.Barline.type.DOUBLE_HEAVY, VexFlowPatch
    const heavyMeasures: number[] = [3, 6];

    function scoreXml(): string {
        let measures: string = "";
        for (let m: number = 1; m <= 6; m++) {
            measures += `<measure number="${m}">`;
            if (m === 1) {
                measures += "<attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>2</beats>" +
                    "<beat-type>4</beat-type></time><staves>2</staves>" +
                    "<clef number=\"1\"><sign>G</sign><line>2</line></clef><clef number=\"2\"><sign>F</sign><line>4</line></clef>" +
                    "</attributes>";
            }
            measures += "<note><pitch><step>B</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice>" +
                "<type>half</type><staff>1</staff></note><backup><duration>2</duration></backup>" +
                "<note><pitch><step>D</step><octave>3</octave></pitch><duration>2</duration><voice>2</voice>" +
                "<type>half</type><staff>2</staff></note>";
            if (heavyMeasures.includes(m)) {
                measures += "<barline location=\"right\"><bar-style>heavy-heavy</bar-style></barline>";
            }
            measures += "</measure>";
        }
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list><score-part id=\"P1\">" +
            "<part-name>Piano</part-name><part-abbreviation>Pno.</part-abbreviation></score-part></part-list>" +
            `<part id="P1">${measures}</part></score-partwise>`;
    }
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    function render(source: string): Promise<void> {
        container = TestUtils.getDivElement(document);
        container.style.width = "800px";
        osmd = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
        return osmd.load(source).then(() => osmd.render());
    }
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    function systems(): MusicSystem[] {
        return osmd.GraphicSheet.MusicPages.reduce((all, page) => all.concat(page.MusicSystems), [] as MusicSystem[]);
    }

    it("joins the staves with two heavy lines at the right of the measure, over the staves' heavy-heavy end barlines", () => {
        return render(scoreXml()).then(() => {
            let heavyConnectors: number = 0;
            for (const system of systems()) {
                expect(system.StaffLines.length, `system ${system.Id}: stafflines`).to.equal(2);
                const top: VexFlowMeasure[] = system.StaffLines[0].Measures as VexFlowMeasure[];
                const bottom: VexFlowMeasure[] = system.StaffLines[1].Measures as VexFlowMeasure[];
                const connectors: any[] = [];
                for (const measure of bottom) {
                    connectors.push(...measure.Connectors);
                }
                // a barline after each measure and the system's left line
                expect(connectors.length, `system ${system.Id}: connectors`).to.equal(top.length + 1);
                for (const connector of connectors) {
                    expect(connector.type, `system ${system.Id}: no connector left at VexFlow's default type`).to.not.equal(DOUBLE);
                }
                top.forEach((measure, i) => {
                    const measureNumber: number = measure.MeasureNumber;
                    const isHeavy: boolean = heavyMeasures.includes(measureNumber);
                    for (const vfMeasure of [measure, bottom[i]]) {
                        const endBarType: number = (vfMeasure.getVFStave() as any).modifiers[1].type;
                        expect(endBarType === BARLINE_DOUBLE_HEAVY, `measure ${measureNumber}: stave end barline double heavy`)
                            .to.equal(isHeavy);
                    }
                    const atMeasure: any[] = connectors.filter(connector => connector.top_stave === measure.getVFStave() &&
                        connector.type !== 1 && connector.type !== 5); // not the system's left line
                    expect(atMeasure.length, `measure ${measureNumber}: one connector at its end`).to.equal(1);
                    expect(atMeasure[0].type === DOUBLE_HEAVY_RIGHT, `measure ${measureNumber}: connector double heavy`)
                        .to.equal(isHeavy);
                    if (isHeavy) {
                        heavyConnectors++;
                    }
                });
            }
            expect(heavyConnectors, "both heavy-heavy barlines joined").to.equal(heavyMeasures.length);
        });
    });
});
