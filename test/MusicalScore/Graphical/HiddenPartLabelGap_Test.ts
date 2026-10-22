import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalLabel } from "../../../src/MusicalScore/Graphical/GraphicalLabel";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A part the MusicXML hides in a whole system (<staff-details print-object="no"> in all its measures there) is taken out of
 * the system, and so is its label. The room for the labels before the staves was still reserved from all parts, so a hidden
 * part with a longer name than the parts left drew an empty column before the staves (Nielsen, Clarinet Concerto Op. 57: the
 * first system indented 9.2 units by the names of the percussion staves hidden in it, the later ones by "Tamb."). The system
 * is labelled again from the parts left before it is stretched, so its staves start after the widest label drawn and still end
 * at the right edge (the line breaks don't change). A single staff left in a system keeps its part abbreviation, as when the
 * hidden staves were there. Same rules as osmd-dart test/hidden_part_label_gap_test.dart.
 */
describe("Part labels of a system with a part hidden in it", () => {
    const measureCount: number = 24;
    const all: number[] = Array.from({ length: measureCount }, (_, i) => i + 1);

    function partXml(id: string, hidden: number[]): string {
        let measures: string = "";
        for (let m: number = 1; m <= measureCount; m++) {
            measures += `<measure number="${m}">`;
            const details: string = hidden.includes(m) ? "<staff-details print-object=\"no\"/>" : "";
            if (m === 1) {
                measures += "<attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats>" +
                    `<beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef>${details}</attributes>`;
            } else if (details) {
                measures += `<attributes>${details}</attributes>`;
            }
            if (hidden.includes(m)) {
                // (only a staff without drawn notes is hidden)
                measures += "<note print-object=\"no\"><rest measure=\"yes\"/><duration>4</duration><voice>1</voice></note>";
            } else {
                measures += ("<note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice>" +
                    "<type>quarter</type></note>").repeat(4);
            }
            measures += "</measure>";
        }
        return `<part id="${id}">${measures}</part>`;
    }

    /** Clarinet, Oboe and a long named percussion part hidden in the measures [hidden]. */
    function scoreXml(hidden: number[], withOboe: boolean = true): string {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list>" +
            "<score-part id=\"P1\"><part-name>Clarinet</part-name><part-abbreviation>Cl.</part-abbreviation></score-part>" +
            (withOboe ? "<score-part id=\"P2\"><part-name>Oboe</part-name><part-abbreviation>Ob.</part-abbreviation></score-part>" : "") +
            "<score-part id=\"P3\"><part-name>Tamburo piccolo (source cue)</part-name>" +
            "<part-abbreviation>Tamb. picc.</part-abbreviation></score-part></part-list>" +
            partXml("P1", []) + (withOboe ? partXml("P2", []) : "") + partXml("P3", hidden) + "</score-partwise>";
    }

    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    function render(source: string): Promise<MusicSystem[]> {
        container = TestUtils.getDivElement(document);
        container.style.width = "700px";
        osmd = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
        return osmd.load(source).then(() => {
            osmd.render();
            return osmd.GraphicSheet.MusicPages.reduce((systems, page) => systems.concat(page.MusicSystems), [] as MusicSystem[]);
        });
    }
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    function labelsOf(system: MusicSystem): GraphicalLabel[] {
        return (system as any).labels.values();
    }
    function texts(system: MusicSystem): string[] {
        return labelsOf(system).map(label => label.Label.text);
    }
    /** Right end of the widest label drawn, from the system's left. */
    function labelEnd(system: MusicSystem): number {
        return Math.max(0, ...labelsOf(system).map(label =>
            label.PositionAndShape.RelativePosition.x + label.PositionAndShape.Size.width));
    }
    function staffX(system: MusicSystem): number {
        return system.StaffLines[0].PositionAndShape.RelativePosition.x;
    }
    /** Right end of the system's last measure, from the system's left. */
    function end(system: MusicSystem): number {
        const measures: any[] = system.StaffLines[0].Measures;
        const last: any = measures[measures.length - 1].PositionAndShape;
        return staffX(system) + last.RelativePosition.x + last.Size.width;
    }

    it("leaves no room for the label of a part hidden in the whole score", () => {
        let shownX: number[];
        return render(scoreXml([])).then(systems => {
            shownX = systems.map(staffX);
            osmd.clear();
            container.remove();
            return render(scoreXml(all));
        }).then(systems => {
            const margin: number = osmd.EngravingRules.SystemLabelsRightMargin;
            expect(systems.length).to.be.greaterThan(2);
            systems.forEach((system, i) => {
                expect(texts(system), `system ${system.Id}`).to.deep.equal(i === 0 ? ["Clarinet", "Oboe"] : ["Cl.", "Ob."]);
                expect(system.StaffLines.length).to.equal(2);
                expect(staffX(system), `system ${system.Id}: no empty label column`).to.be.closeTo(labelEnd(system) + margin, 1e-6);
                expect(staffX(system), `system ${system.Id}: indented less than with the part`).to.be.lessThan(shownX[i]);
                if (i < systems.length - 1) {
                    expect(end(system), `system ${system.Id}: stretched to the right edge`).to.be.closeTo(end(systems[0]), 1e-6);
                }
            });
        });
    });

    it("keeps the label of the part in the systems it is shown in", () => {
        return render(scoreXml([1, 2, 3, 4, 5, 6, 7, 8])).then(systems => {
            const margin: number = osmd.EngravingRules.SystemLabelsRightMargin;
            const hiddenIn: MusicSystem[] = systems.filter(system => system.StaffLines.length === 2);
            expect(hiddenIn.length).to.be.greaterThan(0);
            expect(hiddenIn.length).to.be.lessThan(systems.length);
            systems.forEach((system, i) => {
                const hidden: boolean = system.StaffLines.length === 2;
                const expected: string[] = hidden
                    ? (i === 0 ? ["Clarinet", "Oboe"] : ["Cl.", "Ob."])
                    : (i === 0 ? ["Clarinet", "Oboe", "Tamburo piccolo (source cue)"] : ["Cl.", "Ob.", "Tamb. picc."]);
                expect(texts(system), `system ${system.Id}`).to.deep.equal(expected);
                expect(staffX(system), `system ${system.Id}`).to.be.closeTo(labelEnd(system) + margin, 1e-6);
            });
        });
    });

    it("keeps the part abbreviation of a single staff left in a system", () => {
        return render(scoreXml(all, false)).then(systems => {
            const margin: number = osmd.EngravingRules.SystemLabelsRightMargin;
            expect(systems.length).to.be.greaterThan(2);
            for (const system of systems.slice(1)) {
                expect(system.StaffLines.length).to.equal(1);
                expect(texts(system), `system ${system.Id}`).to.deep.equal(["Cl."]);
                expect(staffX(system), `system ${system.Id}`).to.be.closeTo(labelEnd(system) + margin, 1e-6);
            }
        });
    });
});
