import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalLabel } from "../../../src/MusicalScore/Graphical/GraphicalLabel";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A staff the MusicXML hides in a whole system (<staff-details print-object="no">) is taken out of the system after the
 * measure numbers and rehearsal marks are placed. Taking it out set the x of the stafflines left to 0, dropping the indent of
 * the part labels: the staves and the rehearsal boxes moved left, the measure numbers (children of the system) stayed, so a
 * system's first number was drawn in the rehearsal box after the clef (Glière, Horn Concerto Op. 91 piano m30, Saint-Saëns
 * Op. 61, Vieuxtemps Op. 31). The stafflines keep their x now. The measure numbers reserve their sky line space on the
 * staffline they are drawn on (the first one drawn), not on the hidden first one, so a rehearsal box over a number is lifted
 * above it. A rehearsal mark reading the measure's number (Glière numbers its boxes by the measure) takes the place of the
 * measure number. Same rules as osmd-dart test/hidden_staff_measure_number_test.dart.
 */
describe("Measure numbers with a staff hidden in the system", () => {
    const letters: { [measure: number]: string } = { 3: "A", 5: "B", 7: "C", 9: "D", 11: "E", 13: "F" };

    function scoreXml(hideStaff1: boolean, rehearsals: { [measure: number]: string }): string {
        let measures: string = "";
        for (let m: number = 1; m <= 16; m++) {
            measures += `<measure number="${m}">`;
            if (m === 1) {
                measures += "<attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats>" +
                    "<beat-type>4</beat-type></time><staves>2</staves><clef number=\"1\"><sign>G</sign><line>2</line></clef>" +
                    "<clef number=\"2\"><sign>F</sign><line>4</line></clef>" +
                    (hideStaff1 ? "<staff-details number=\"1\" print-object=\"no\"/>" : "") + "</attributes>";
            }
            if (rehearsals[m] !== undefined) {
                measures += `<direction placement="above"><direction-type><rehearsal>${rehearsals[m]}</rehearsal>` +
                    "</direction-type><staff>2</staff></direction>";
            }
            measures += `<note${hideStaff1 ? " print-object=\"no\"" : ""}><rest/><duration>4</duration><voice>1</voice>` +
                "<type>whole</type><staff>1</staff></note><backup><duration>4</duration></backup><note><pitch><step>C</step>" +
                "<octave>4</octave></pitch><duration>4</duration><voice>5</voice><type>whole</type><staff>2</staff></note>" +
                "</measure>";
        }
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list><score-part id=\"P1\">" +
            "<part-name>Piano</part-name><part-abbreviation>Pno.</part-abbreviation></score-part></part-list>" +
            `<part id="P1">${measures}</part></score-partwise>`;
    }
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    function render(source: string): Promise<void> {
        container = TestUtils.getDivElement(document);
        container.style.width = "700px";
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
    interface NumberLabel { label: GraphicalLabel, measure: GraphicalMeasure, staffLine: StaffLine }
    function numbers(): NumberLabel[] {
        const found: NumberLabel[] = [];
        for (const system of systems()) {
            const staffLine: StaffLine = system.StaffLines[0];
            for (const label of system.MeasureNumberLabels) {
                const measure: GraphicalMeasure = staffLine.Measures.find(m => `${m.MeasureNumber}` === label.Label.text);
                found.push({ label, measure, staffLine });
            }
        }
        return found;
    }
    function box(measure: GraphicalMeasure): any {
        return (measure as VexFlowMeasure).getVFStave().getModifiers().find((m: any) => m.getCategory() === "stavesection");
    }

    it("keeps the part label indent of the stafflines, and the measure numbers stay at their measures", () => {
        return render(scoreXml(true, letters)).then(() => {
            expect(systems().length).to.be.greaterThan(1);
            for (const system of systems()) {
                expect(system.StaffLines.length, "staff 1 taken out").to.equal(1);
                expect(system.StaffLines[0].PositionAndShape.RelativePosition.x, `system ${system.Id}: indent of "Piano"/"Pno."`)
                    .to.be.closeTo(system.MaxLabelLength + osmd.EngravingRules.SystemLabelsRightMargin, 1e-6);
            }
            expect(numbers().length).to.be.greaterThan(0);
            for (const n of numbers()) {
                const shape: any = n.label.PositionAndShape;
                // the number's left, from the measure's start (0, or the MeasureNumberLabelXOffset of -0.5 within a line)
                const fromMeasureStart: number = shape.RelativePosition.x + shape.BorderMarginLeft -
                    (n.staffLine.PositionAndShape.RelativePosition.x + n.measure.PositionAndShape.RelativePosition.x);
                expect(fromMeasureStart, `m${n.measure.MeasureNumber}`).to.be.within(-0.5 - 1e-6, 1e-6);
            }
        });
    });

    it("lifts a rehearsal box over a measure number above it", () => {
        return render(scoreXml(true, letters)).then(() => {
            let checked: number = 0;
            for (const n of numbers()) {
                const mark: any = box(n.measure);
                if (!mark) {
                    continue;
                }
                checked++;
                const numberTop: number = n.label.PositionAndShape.RelativePosition.y + n.label.PositionAndShape.BorderMarginTop -
                    n.staffLine.PositionAndShape.RelativePosition.y;
                expect(mark.minBottomY, `m${n.measure.MeasureNumber}: the number is in the sky line under the box`)
                    .to.not.equal(undefined);
                expect(mark.minBottomY / 10, `m${n.measure.MeasureNumber}: box bottom over the number top ${numberTop}`)
                    .to.be.at.most(numberTop + 1e-6);
            }
            expect(checked).to.be.at.least(4);
        });
    });

    for (const hideStaff1 of [true, false]) {
        it(`draws a rehearsal mark reading the measure number in place of the number (staff 1 ${hideStaff1 ? "hidden" : "shown"})`,
           () => {
            return render(scoreXml(hideStaff1, { ...letters, 11: "11", 13: "12" })).then(() => {
                const drawn: string[] = numbers().map(n => n.label.Label.text);
                expect(drawn, "box \"11\" at m11").to.not.include("11");
                expect(drawn, "box \"12\" at m13 is not m13").to.include("13");
                expect(drawn, "letter boxes keep their numbers").to.include.members(["3", "5", "7", "9"]);
            });
        });
    }
});
