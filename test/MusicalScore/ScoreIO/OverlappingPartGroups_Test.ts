import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { Instrument } from "../../../src/MusicalScore/Instrument";
import { InstrumentalGroup } from "../../../src/MusicalScore/InstrumentalGroup";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { VexFlowInstrumentBracket } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowInstrumentBracket";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A part-group stop closes the open group of its number. Groups whose parts cross (OpenScore Bach BWV 1049/3: 1 start,
 * Principal Violin, 2 start, Flute 1, 1 stop, Flute 2, 2 stop) nest: the earlier group reaches the later group's end and the
 * later one stays inside it, as the other movements write them. Before, a stop closed the innermost group whatever its number,
 * which cut the later group off at the earlier one's stop (leaving one part here, so the square was gone). Same as osmd-dart
 * test/overlapping_part_groups_test.dart.
 * A group around one part is dissolved, as before; a group around one group (the same parts: a bracket and a brace on the
 * horns of Beach, Gaelic Symphony/2) stays, so both are drawn. Before, it was dissolved too and the bracket was gone.
 */
describe("Crossing and enclosing part groups", () => {
    /** tokens: "P" a part, "1:bracket" group 1 starts with that symbol, "/1" group 1 stops */
    function scoreXml(tokens: string[]): string {
        let partList: string = "";
        let parts: string = "";
        let part: number = 0;
        for (const token of tokens) {
            if (token === "P") {
                part++;
                partList += `<score-part id="P${part}"><part-name>Part ${part}</part-name></score-part>`;
                parts += `<part id="P${part}"><measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key>` +
                    "<time><beats>2</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>" +
                    "<note><pitch><step>B</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>half</type></note>" +
                    "</measure></part>";
            } else if (token.startsWith("/")) {
                partList += `<part-group type="stop" number="${token.substring(1)}"/>`;
            } else {
                const [number, symbol] = token.split(":");
                partList += `<part-group type="start" number="${number}"><group-symbol>${symbol}</group-symbol></part-group>`;
            }
        }
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\">" +
            `<part-list>${partList}</part-list>${parts}</score-partwise>`;
    }
    function tree(groups: InstrumentalGroup[]): string {
        return groups.map((group: InstrumentalGroup): string => group instanceof Instrument ? group.IdString :
            `${group.GroupSymbol}${group.Number}[${tree(group.InstrumentalGroups)}]`).join(" ");
    }
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    // name, part-list, group tree, the group brackets [top, bottom staffline, nesting depth] of the first system
    const cases: [string, string[], string, number[][]][] = [
        ["sharing one part (BWV 1049/3)", ["1:bracket", "P", "2:square", "P", "/1", "P", "/2", "P"],
            "bracket1[P1 square2[P2 P3]] P4", [[0, 2, 0], [1, 2, 1]]],
        ["the later group ending after the earlier one (Beach, Gaelic Symphony/2)", ["1:bracket", "P", "P", "2:brace", "P", "/1", "P", "/2"],
            "bracket1[P1 P2 brace2[P3 P4]]", [[0, 3, 0], [2, 3, 1]]],
        ["sharing two parts", ["1:bracket", "P", "P", "2:square", "P", "P", "/1", "P", "P", "/2", "P"],
            "bracket1[P1 P2 square2[P3 P4 P5 P6]] P7", [[0, 5, 0], [2, 5, 1]]],
        ["three crossing", ["1:bracket", "P", "2:square", "P", "3:brace", "P", "/1", "P", "/2", "P", "/3"],
            "bracket1[P1 square2[P2 brace3[P3 P4 P5]]]", [[0, 4, 0], [1, 4, 1], [2, 4, 2]]],
        ["nested", ["1:bracket", "P", "2:square", "P", "P", "/2", "/1", "P"],
            "bracket1[P1 square2[P2 P3]] P4", [[0, 2, 0], [1, 2, 1]]],
        ["one after the other, the same number", ["1:bracket", "P", "P", "/1", "1:square", "P", "P", "/1"],
            "bracket1[P1 P2] square1[P3 P4]", [[0, 1, 0], [2, 3, 0]]],
        ["a stop of another number inside a group", ["1:bracket", "P", "/2", "P", "/1", "P"],
            "bracket1[P1 P2] P3", [[0, 1, 0]]],
        ["a group around a group of the same parts (Beach, Gaelic Symphony/2, the horns)",
            ["1:bracket", "2:brace", "P", "P", "/2", "/1", "P"], "bracket1[brace2[P1 P2]] P3", [[0, 1, 0], [0, 1, 1]]],
        ["a group around one part", ["1:bracket", "P", "/1", "2:bracket", "P", "P", "/2"], "P1 bracket2[P2 P3]", [[1, 2, 0]]],
    ];
    for (const [name, tokens, expectedTree, expectedBrackets] of cases) {
        it(`reads and brackets them (${name})`, async () => {
            container = TestUtils.getDivElement(document);
            container.style.width = "1600px";
            osmd = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
            await osmd.load(scoreXml(tokens));
            osmd.render();
            expect(tree(osmd.Sheet.InstrumentalGroups), "group tree").to.equal(expectedTree);
            const system: MusicSystem = osmd.GraphicSheet.MusicPages[0].MusicSystems[0];
            const index: (stave: any) => number = (stave: any): number => system.StaffLines.findIndex(
                line => (line.Measures[0] as VexFlowMeasure).getVFStave() === stave);
            const brackets: number[][] = system.GroupBrackets.map((bracket): number[] => {
                const connector: any = (bracket as VexFlowInstrumentBracket).vexflowConnector;
                return [index(connector.top_stave), index(connector.bottom_stave), Math.round(-connector.x_shift / 5)];
            });
            expect(brackets, "group brackets [top, bottom staffline, depth]").to.deep.equal(expectedBrackets);
        });
    }
});
