import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { VexFlowInstrumentBrace } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowInstrumentBrace";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A part's brace joins its first staffline in the system to its last one. A staff the MusicXML hides in a whole system
 * (<staff-details print-object="no">) is taken out of the system before the brace is made; the brace was only made when the
 * part's first and last staves were both in the system, so a hidden top or bottom staff took it away (Glière, Horn Concerto
 * Op. 91, piano: the horn staff above the piano's two is shown in m85-93 only, 64 of 70 systems had no brace). With two or more
 * staves left it joins the first and last of them now; with one left there is none. Same as osmd-dart
 * test/hidden_staff_brace_test.dart.
 */
describe("Brace of the staves left when a staff is hidden in the system", () => {
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

    for (const [staves, hiddenStaff, left] of [[3, 0, 3], [3, 1, 2], [3, 2, 2], [3, 3, 2], [2, 0, 2], [2, 1, 1], [2, 2, 1]]) {
        const name: string = hiddenStaff ? `staff ${hiddenStaff} of ${staves} hidden` : `${staves} staves, none hidden`;
        it(left > 1 ? `braces the first to the last staff left (${name})` : `has no brace for the one staff left (${name})`, () => {
            return render(scoreXml(staves, hiddenStaff)).then(() => {
                expect(systems().length).to.be.greaterThan(1);
                for (const system of systems()) {
                    expect(system.StaffLines.length, `system ${system.Id}: stafflines left`).to.equal(left);
                    if (left < 2) {
                        expect(system.InstrumentBrackets.length, `system ${system.Id}: one staff, no brace`).to.equal(0);
                        continue;
                    }
                    expect(system.InstrumentBrackets.length, `system ${system.Id}: braces`).to.equal(1);
                    const brace: VexFlowInstrumentBrace = system.InstrumentBrackets[0] as VexFlowInstrumentBrace;
                    expect(brace.vexflowConnector.top_stave, `system ${system.Id}: from the first staffline left`)
                        .to.equal((system.StaffLines[0].Measures[0] as VexFlowMeasure).getVFStave());
                    expect(brace.vexflowConnector.bottom_stave, `system ${system.Id}: to the last staffline left`)
                        .to.equal((system.StaffLines[left - 1].Measures[0] as VexFlowMeasure).getVFStave());
                }
            });
        });
    }
});
