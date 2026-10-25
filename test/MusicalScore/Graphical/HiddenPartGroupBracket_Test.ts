import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { VexFlowInstrumentBracket } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowInstrumentBracket";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A part group's bracket joins the group's first staffline in the system to its last one there (the last staff of a piano
 * at the end, see GroupBracketShape_Test.ts). A staff the MusicXML hides in a whole system (<staff-details
 * print-object="no">) is taken out of the system before the bracket is made; the bracket was only made when the first staff
 * of the group's first and last parts were both in the system, so a hidden first or last part took the whole bracket with
 * it, as did a hidden top staff of a piano at either end, or a nested group hidden at either end. With two or more parts
 * left it joins them now; with one left there is none. Same as osmd-dart test/hidden_part_group_bracket_test.dart.
 */
describe("Part group bracket of the parts left when a part is hidden in the system", () => {
    const names: { [abbr: string]: string } = { Hn: "Horn", Vn: "Violin", Vc: "Violoncello", Fl: "Flute", Ob: "Oboe", Va: "Viola", Pno: "Piano" };
    /** layout: part abbreviations, "[" starts a group (numbered by nesting), "]" stops the innermost one; hidden: part -> staff. */
    function scoreXml(layout: string[], hidden: { [abbr: string]: number }): string {
        let partList: string = "";
        let parts: string = "";
        const open: number[] = [];
        for (const token of layout) {
            if (token === "[") {
                open.push(open.length + 1);
                partList += `<part-group type="start" number="${open[open.length - 1]}"><group-symbol>bracket</group-symbol>` +
                    "<group-barline>yes</group-barline></part-group>";
                continue;
            }
            if (token === "]") {
                partList += `<part-group type="stop" number="${open.pop()}"/>`;
                continue;
            }
            partList += `<score-part id="P_${token}"><part-name>${names[token]}</part-name></score-part>`;
            const clefs: string[] = token === "Pno" ? ["G", "F"] : ["G"];
            const staff: (i: number) => string = (i: number): string => clefs.length > 1 ? `<staff>${i + 1}</staff>` : "";
            let measures: string = "";
            for (let m: number = 1; m <= 24; m++) {
                measures += `<measure number="${m}">`;
                if (m === 1) {
                    measures += "<attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>2</beats>" +
                        `<beat-type>4</beat-type></time>${clefs.length > 1 ? `<staves>${clefs.length}</staves>` : ""}` +
                        clefs.map((sign, i) => `<clef${clefs.length > 1 ? ` number="${i + 1}"` : ""}><sign>${sign}</sign>` +
                            `<line>${sign === "G" ? 2 : 4}</line></clef>`).join("") +
                        (hidden[token] ? `<staff-details${clefs.length > 1 ? ` number="${hidden[token]}"` : ""} print-object="no"/>` : "") +
                        "</attributes>";
                }
                measures += clefs.map((sign, i) => i + 1 === hidden[token] ?
                    `<note print-object="no"><rest measure="yes"/><duration>2</duration><voice>${i + 1}</voice>${staff(i)}</note>` :
                    `<note><pitch><step>${sign === "G" ? "B" : "D"}</step><octave>${sign === "G" ? 4 : 3}</octave></pitch>` +
                    `<duration>2</duration><voice>${i + 1}</voice><type>half</type>${staff(i)}</note>`)
                    .join("<backup><duration>2</duration></backup>");
                measures += "</measure>";
            }
            parts += `<part id="P_${token}">${measures}</part>`;
        }
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\">" +
            `<part-list>${partList}</part-list>${parts}</score-partwise>`;
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

    // name, layout, hidden staves, stafflines left in each system, the group brackets [top, bottom staffline] in each system
    const cases: [string, string[], { [abbr: string]: number }, number, number[][]][] = [
        ["none hidden", ["[", "Hn", "Vn", "Pno", "]"], {}, 4, [[0, 3]]],
        ["first part hidden", ["[", "Hn", "Vn", "Pno", "]"], { Hn: 1 }, 3, [[0, 2]]],
        ["middle part hidden", ["[", "Vn", "Hn", "Pno", "]"], { Hn: 1 }, 3, [[0, 2]]],
        ["last part hidden", ["[", "Vn", "Pno", "Hn", "]"], { Hn: 1 }, 3, [[0, 2]]],
        ["first part's top staff hidden", ["[", "Pno", "Vn", "Vc", "]"], { Pno: 1 }, 3, [[0, 2]]],
        ["last part's top staff hidden", ["[", "Vn", "Vc", "Pno", "]"], { Pno: 1 }, 3, [[0, 2]]],
        ["nested, none hidden", ["[", "Fl", "Ob", "[", "Vn", "Va", "]", "]"], {}, 4, [[0, 3], [2, 3]]],
        ["nested group's last part hidden", ["[", "Fl", "Ob", "[", "Vn", "Va", "]", "]"], { Va: 1 }, 3, [[0, 2]]],
        ["nested group hidden, first", ["[", "[", "Vn", "Va", "]", "Fl", "Ob", "]"], { Vn: 1, Va: 1 }, 2, [[0, 1]]],
        ["one part left", ["[", "Hn", "Vn", "]"], { Hn: 1 }, 1, []],
        ["group of one part", ["[", "Vn", "]", "[", "Vc", "Pno", "]"], {}, 4, [[1, 3]]],
    ];
    for (const [name, layout, hidden, left, brackets] of cases) {
        it(brackets.length ? `brackets the parts left (${name})` : `has no bracket for the one part left (${name})`, () => {
            return render(scoreXml(layout, hidden)).then(() => {
                expect(systems().length).to.be.greaterThan(1);
                for (const system of systems()) {
                    expect(system.StaffLines.length, `system ${system.Id}: stafflines left`).to.equal(left);
                    const index: (stave: any) => number = (stave: any): number =>
                        system.StaffLines.findIndex(line => (line.Measures[0] as VexFlowMeasure).getVFStave() === stave);
                    const spans: number[][] = system.GroupBrackets.map(bracket => {
                        const connector: any = (bracket as VexFlowInstrumentBracket).vexflowConnector;
                        return [index(connector.top_stave), index(connector.bottom_stave)];
                    });
                    expect(spans, `system ${system.Id}: group brackets [top, bottom staffline]`).to.deep.equal(brackets);
                }
            });
        });
    }
});
