import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { TestUtils } from "../../Util/TestUtils";

/**
 * The barlines joining the staves of a part are StaveConnectors drawn with the part's bottom measure from the stave of its top
 * measure. A staff the MusicXML hides in a whole system (<staff-details print-object="no">) is taken out of the system after they
 * are made. A hidden top staff, whose stave is never drawn and so never placed, drew each barline of the system from the page top
 * (Glière, Horn Concerto Op. 91, piano: its top staff is shown in m85-93 only); a hidden bottom staff took the barlines between
 * the other staves with it. They join the first and last staff left now. Same as osmd-dart test/hidden_staff_connectors_test.dart.
 */
describe("Barlines between the staves left when a staff is hidden in the system", () => {
    function scoreXml(staves: number, hiddenStaff: number): string {
        const clefs: string[] = staves === 3 ? ["G", "G", "F"] : ["G", "F"];
        let measures: string = "";
        for (let m: number = 1; m <= 24; m++) {
            measures += `<measure number="${m}">`;
            if (m === 1) {
                measures += "<attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>2</beats>" +
                    `<beat-type>4</beat-type></time><staves>${staves}</staves>` +
                    clefs.map((sign, i) => `<clef number="${i + 1}"><sign>${sign}</sign><line>${sign === "G" ? 2 : 4}</line></clef>`)
                        .join("") +
                    (hiddenStaff ? `<staff-details number="${hiddenStaff}" print-object="no"/>` : "") + "</attributes>";
            }
            measures += clefs.map((sign, i) => i + 1 === hiddenStaff ?
                `<note print-object="no"><rest measure="yes"/><duration>2</duration><voice>${i + 1}</voice><staff>${i + 1}</staff></note>` :
                `<note><pitch><step>${sign === "G" ? "B" : "D"}</step><octave>${sign === "G" ? 4 : 3}</octave></pitch>` +
                `<duration>2</duration><voice>${i + 1}</voice><type>half</type><staff>${i + 1}</staff></note>`)
                .join("<backup><duration>2</duration></backup>");
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

    for (const [staves, hiddenStaff, left] of [[3, 0, 3], [3, 1, 2], [3, 2, 2], [3, 3, 2], [2, 1, 1], [2, 2, 1]]) {
        const name: string = hiddenStaff ? `staff ${hiddenStaff} of ${staves} hidden` : `${staves} staves, none hidden`;
        it(`joins the staves left at each barline and at the system start (${name})`, () => {
            return render(scoreXml(staves, hiddenStaff)).then(() => {
                expect(systems().length).to.be.greaterThan(1);
                for (const system of systems()) {
                    expect(system.StaffLines.length, `system ${system.Id}: stafflines left`).to.equal(left);
                    const top: VexFlowMeasure[] = system.StaffLines[0].Measures as VexFlowMeasure[];
                    const bottom: VexFlowMeasure[] = system.StaffLines[left - 1].Measures as VexFlowMeasure[];
                    const connectors: any[] = [];
                    for (const staffLine of system.StaffLines) {
                        for (const measure of staffLine.Measures as VexFlowMeasure[]) {
                            connectors.push(...measure.Connectors);
                        }
                    }
                    if (left < 2) {
                        expect(connectors.length, `system ${system.Id}: one staff, no line between staves`).to.equal(0);
                        continue;
                    }
                    // a barline after each measure and the system's left line
                    expect(connectors.length, `system ${system.Id}: connectors`).to.equal(top.length + 1);
                    connectors.forEach((connector, i) => {
                        const index: number = top.findIndex(measure => measure.getVFStave() === connector.top_stave);
                        expect(index, `system ${system.Id}, connector ${i}: from a stave of the first staffline left`)
                            .to.be.at.least(0);
                        expect(connector.bottom_stave, `system ${system.Id}, connector ${i}: to the same measure of the last one`)
                            .to.equal(bottom[index].getVFStave());
                        expect(connector.top_stave.getYForLine(0), `system ${system.Id}, connector ${i}: from where its stave is drawn`)
                            .to.be.closeTo((top[index].PositionAndShape.AbsolutePosition.y + 0) * 10, 1e-3);
                    });
                }
            });
        });
    }
});
