import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { VexFlowInstrumentBracket } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowInstrumentBracket";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { TestUtils } from "../../Util/TestUtils";

/**
 * The shape and place of a part group's bracket (decided 10-24, research RESEARCH-group-bracket-end-and-shape-20261024): a
 * MusicXML square bracket is a thin line with right-angled hooks and a line a thin line, not VexFlow's bracket; a group
 * nested in another stands left of it, also a bracket (VexFlow leaves a bracket's x shift out, so it stood on top of the
 * outer one); the brace of a piano inside a group stands left of the group's bracket; and the labels move left by as much as
 * the brackets reach further than a part brace. Same as osmd-dart test/group_bracket_shape_test.dart.
 */
describe("Part group bracket shape and place", () => {
    const names: { [abbr: string]: string } = { Vn: "Violin", Va: "Viola", Fl: "Flute", Ob: "Oboe", Pno: "Piano" };
    /** layout: part abbreviations, "[symbol" starts a group (numbered by nesting) with that group-symbol, "]" stops the innermost one. */
    function scoreXml(layout: string[]): string {
        let partList: string = "";
        let parts: string = "";
        const open: number[] = [];
        for (const token of layout) {
            if (token.startsWith("[")) {
                open.push(open.length + 1);
                partList += `<part-group type="start" number="${open[open.length - 1]}"><group-symbol>${token.substring(1)}` +
                    "</group-symbol><group-barline>yes</group-barline></part-group>";
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
            for (let m: number = 1; m <= 8; m++) {
                measures += `<measure number="${m}">`;
                if (m === 1) {
                    measures += "<attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>2</beats>" +
                        `<beat-type>4</beat-type></time>${clefs.length > 1 ? "<staves>2</staves>" : ""}` +
                        clefs.map((sign, i) => `<clef${clefs.length > 1 ? ` number="${i + 1}"` : ""}><sign>${sign}</sign>` +
                            `<line>${sign === "G" ? 2 : 4}</line></clef>`).join("") +
                        "</attributes>";
                }
                measures += clefs.map((sign, i) =>
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
    const rendered: { container: HTMLElement, osmd: OpenSheetMusicDisplay }[] = [];
    function firstSystem(layout: string[]): Promise<MusicSystem> {
        const container: HTMLElement = TestUtils.getDivElement(document);
        container.style.width = "800px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
        rendered.push({ container, osmd });
        return osmd.load(scoreXml(layout)).then(() => {
            osmd.render();
            return osmd.GraphicSheet.MusicPages[0].MusicSystems[0];
        });
    }
    afterEach(() => {
        for (const { container, osmd } of rendered.splice(0)) {
            osmd.clear();
            container.remove();
        }
    });

    /** The rectangles a group bracket draws, [x from its top stave, width]; the rest of the drawing is ignored. */
    function drawn(bracket: VexFlowInstrumentBracket): number[][] {
        const rects: number[][] = [];
        const ctx: any = new Proxy({}, {
            get: (target, name): (...args: any[]) => any => name === "fillRect" ?
                (rectX: number, rectY: number, width: number): number => rects.push([rectX, width]) :
                (): any => ctx,
        });
        bracket.draw(ctx);
        const staveX: number = bracket.vexflowConnector.top_stave.getX();
        return rects.map(([rectX, width]) => [rectX - staveX, width]);
    }

    it("draws a square bracket as a thin line with right-angled hooks", () => {
        return firstSystem(["[square", "Vn", "Va", "]"]).then(system => {
            const bracket: VexFlowInstrumentBracket = system.GroupBrackets[0] as VexFlowInstrumentBracket;
            expect(system.GroupBrackets.length).to.equal(1);
            expect(bracket.Shape).to.equal("square");
            // the line, then the hooks reaching right
            expect(drawn(bracket)).to.deep.equal([[-5, 1.5], [-5, 5], [-5, 5]]);
        });
    });

    it("draws a line as a thin line", () => {
        return firstSystem(["[line", "Vn", "Va", "]"]).then(system => {
            const bracket: VexFlowInstrumentBracket = system.GroupBrackets[0] as VexFlowInstrumentBracket;
            expect(bracket.Shape).to.equal("line");
            expect(drawn(bracket)).to.deep.equal([[-5, 1.5]]);
        });
    });

    it("draws a bracket as VexFlow does", () => {
        return firstSystem(["[bracket", "Vn", "Va", "]"]).then(system => {
            const bracket: VexFlowInstrumentBracket = system.GroupBrackets[0] as VexFlowInstrumentBracket;
            expect(bracket.Shape).to.equal("");
            expect(drawn(bracket)).to.deep.equal([[-5, 3]]);
        });
    });

    const nested: [string, number[][]][] = [
        ["square", [[-10, 1.5], [-10, 5], [-10, 5]]],
        ["bracket", [[-10, 3]]],
    ];
    for (const [symbol, inner] of nested) {
        it(`draws a nested ${symbol} left of the outer bracket`, () => {
            return firstSystem(["[bracket", "Fl", "Ob", `[${symbol}`, "Vn", "Va", "]", "]"]).then(system => {
                const brackets: VexFlowInstrumentBracket[] = system.GroupBrackets as VexFlowInstrumentBracket[];
                expect(brackets.length).to.equal(2);
                expect(drawn(brackets[0])).to.deep.equal([[-5, 3]]);
                expect(drawn(brackets[1])).to.deep.equal(inner);
            });
        });
    }

    // layout, the group brackets [top, bottom staffline], the x shift of the piano's brace (px)
    const pianos: [string[], number[][], number][] = [
        [["[bracket", "Vn", "Pno", "]"], [[0, 2]], -5],
        [["[square", "Pno", "Vn", "]"], [[0, 2]], -5],
        [["[bracket", "Fl", "[bracket", "Vn", "Pno", "]", "]"], [[0, 3], [1, 3]], -10],
        [["Vn", "Pno"], [], 0],
    ];
    for (const [layout, spans, braceShift] of pianos) {
        it(`brackets the piano to its last staff, its brace left of the bracket (${layout.join(" ")})`, () => {
            return firstSystem(layout).then(system => {
                const index: (stave: any) => number = (stave: any): number =>
                    system.StaffLines.findIndex(line => (line.Measures[0] as VexFlowMeasure).getVFStave() === stave);
                expect(system.GroupBrackets.map(bracket => {
                    const connector: any = (bracket as VexFlowInstrumentBracket).vexflowConnector;
                    return [index(connector.top_stave), index(connector.bottom_stave)];
                })).to.deep.equal(spans);
                expect(system.InstrumentBrackets.length).to.equal(1);
                expect((system.InstrumentBrackets[0] as VexFlowInstrumentBracket).vexflowConnector.x_shift).to.equal(braceShift);
            });
        });
    }

    // layout, how much further right the staves start than without the groups' brackets (units): as far as the piano's
    // brace moves left beyond its place
    const rooms: [string[], number][] = [
        [["[bracket", "Vn", "Pno", "]"], 0.5],
        [["[bracket", "Fl", "[bracket", "Vn", "Pno", "]", "]"], 1.0],
        [["[bracket", "Fl", "Ob", "[square", "Vn", "Va", "]", "]"], 0],
        [["[bracket", "Vn", "Va", "]", "Pno"], 0],
    ];
    for (const [layout, room] of rooms) {
        it(`moves the labels left of the brackets (${layout.join(" ")})`, () => {
            const none: string[] = layout.map(token => token.startsWith("[") ? "[none" : token);
            return firstSystem(layout).then(withBrackets =>
                firstSystem(none).then(without => {
                    expect(withBrackets.Labels.length).to.be.greaterThan(0);
                    expect(withBrackets.StaffLines[0].PositionAndShape.RelativePosition.x -
                        without.StaffLines[0].PositionAndShape.RelativePosition.x).to.be.closeTo(room, 1e-9);
                }));
        });
    }
});
