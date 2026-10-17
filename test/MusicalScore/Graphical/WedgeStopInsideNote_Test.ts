import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalContinuousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalContinuousDynamicExpression";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A wedge stopped inside a held note (Mozart, Oboe Concerto K.314 I, Oboe m71: a crescendo over a whole note, its stop at the
 * half with an <offset>; the print ends it before the piano's second half). The stop is after the last note of the staff in the
 * measure, so the drawn end went to the end of the measure; it goes to the x of the stop in score time, from the notes of all
 * staves of the system, WedgeHorizontalMargin before it. A stop at the end of the measure (m146: the crescendo over the whole
 * measure) keeps the end of the measure. Same as osmd-dart test/wedge_stop_inside_note_test.dart.
 */
describe("Wedge stopped inside a held note", () => {
    const head: string = `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><part-list>` +
        `<score-part id="P1"><part-name>Oboe</part-name></score-part>` +
        `<score-part id="P2"><part-name>Piano</part-name></score-part></part-list>`;
    const attributes: string = `<attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time>` +
        `<clef><sign>G</sign><line>2</line></clef></attributes>`;
    const wedgeXml: (type: string, offset?: number) => string = (type, offset) =>
        `<direction placement="below"><direction-type><wedge type="${type}" number="1"/></direction-type>` +
        `${offset === undefined ? "" : `<offset>${offset}</offset>`}</direction>`;
    const whole: string = `<note><pitch><step>G</step><octave>5</octave></pitch><duration>16</duration><voice>1</voice>` +
        `<type>whole</type></note>`;
    const quarter: string = `<note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice>` +
        `<type>quarter</type></note>`;
    // m1: crescendo 0 to the half (stop with offset 8) over a whole note; m2: crescendo over the whole measure; m3: closing
    const oboe: string = `<part id="P1"><measure number="1">${attributes}${wedgeXml("crescendo")}${wedgeXml("stop", 8)}${whole}` +
        `</measure><measure number="2">${wedgeXml("crescendo")}${whole}${wedgeXml("stop")}</measure>` +
        `<measure number="3">${whole}</measure></part>`;
    const piano: string = `<part id="P2">` + [1, 2, 3].map(m =>
        `<measure number="${m}">${m === 1 ? attributes : ""}${quarter}${quarter}${quarter}${quarter}</measure>`).join("") +
        `</part>`;
    const duo: string = `${head}${oboe}${piano}</score-partwise>`;
    const solo: string = head.replace(/<score-part id="P2">.*<\/score-part><\/part-list>/, "</part-list>") +
        `${oboe}</score-partwise>`;

    function render(source: string): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        return osmd.load(source).then(() => {
            osmd.render();
            return osmd;
        });
    }
    function wedgeIn(osmd: OpenSheetMusicDisplay, measureNumber: number): GraphicalContinuousDynamicExpression {
        const found: GraphicalContinuousDynamicExpression[] = [];
        for (const system of osmd.GraphicSheet.MusicPages[0].MusicSystems) {
            for (const staffLine of system.StaffLines) {
                for (const expression of staffLine.AbstractExpressions) {
                    if (expression instanceof GraphicalContinuousDynamicExpression && !expression.IsVerbal &&
                        expression.ContinuousDynamic.StartMultiExpression.SourceMeasureParent.MeasureNumberXML === measureNumber &&
                        !found.includes(expression)) {
                        found.push(expression);
                    }
                }
            }
        }
        expect(found.length).to.equal(1);
        return found[0];
    }
    function right(w: GraphicalContinuousDynamicExpression): number {
        return Math.max(...w.Lines.map(l => Math.max(l.Start.x, l.End.x)));
    }
    function measure(osmd: OpenSheetMusicDisplay, index: number, staff: number): GraphicalMeasure {
        return osmd.GraphicSheet.MeasureList[index][staff];
    }
    function entryX(m: GraphicalMeasure, timestamp: number): number {
        const entry: GraphicalStaffEntry = m.staffEntries.find(e => Math.abs(e.relInMeasureTimestamp.RealValue - timestamp) < 1e-9);
        return m.PositionAndShape.RelativePosition.x + entry.PositionAndShape.RelativePosition.x;
    }
    function measureEnd(m: GraphicalMeasure): number {
        return m.PositionAndShape.RelativePosition.x + m.PositionAndShape.BorderRight;
    }

    it("ends a wedge stopped inside a held note before the time of its stop", async () => {
        const osmd: OpenSheetMusicDisplay = await render(duo);
        const margin: number = osmd.EngravingRules.WedgeHorizontalMargin;
        const pianoHalf: number = entryX(measure(osmd, 0, 1), 0.5);
        expect(right(wedgeIn(osmd, 1))).to.be.closeTo(pianoHalf - margin, 0.05,
            `measure end ${measureEnd(measure(osmd, 0, 0))}`);
    });

    it("keeps the end of the measure for a wedge stopped there", async () => {
        const osmd: OpenSheetMusicDisplay = await render(duo);
        const margin: number = osmd.EngravingRules.WedgeHorizontalMargin;
        expect(right(wedgeIn(osmd, 2))).to.be.closeTo(measureEnd(measure(osmd, 1, 0)) - margin, 0.05);
    });

    it("places the stop in time to the measure end when the staff is alone on its system", async () => {
        const osmd: OpenSheetMusicDisplay = await render(solo);
        const margin: number = osmd.EngravingRules.WedgeHorizontalMargin;
        const m: GraphicalMeasure = measure(osmd, 0, 0);
        const noteX: number = entryX(m, 0);
        expect(right(wedgeIn(osmd, 1))).to.be.closeTo(noteX + (measureEnd(m) - noteX) / 2 - margin, 0.05);
        expect(right(wedgeIn(osmd, 2))).to.be.closeTo(measureEnd(measure(osmd, 1, 0)) - margin, 0.05);
    });
});
