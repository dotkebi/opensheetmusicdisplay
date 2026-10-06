import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalContinuousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalContinuousDynamicExpression";
import { ContDynamicEnum } from "../../../src/MusicalScore/VoiceData/Expressions/ContinuousExpressions/ContinuousDynamicExpression";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { MultiExpression } from "../../../src/MusicalScore/VoiceData/Expressions/MultiExpression";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Wedge <offset>s and stops at a measure start (Schumann, Myrthen):
 * - 16 m43: a wedge start with <offset> is at its position plus the offset (the reader multiplied the offset by the
 *   previous note's length);
 * - 18 m30-31: a stop and the next wedge's start at the same time share a MultiExpression, so the end offset belongs to the
 *   wedge, not to it (the second wedge's stop offset lengthened the first one);
 * - 19 m5-6: a stop at the start of a measure ends the wedge at the end of the previous measure, not under the first note of
 *   the next measure (and in the next system at a system break).
 * Same as osmd-dart test/wedge_offset_measure_stop_test.dart.
 */
describe("Wedge offsets and stops at a measure start", () => {
    const pianoPart: string = "<part-list><score-part id=\"P1\"><part-name>Piano</part-name></score-part></part-list>";
    const attributes: string = "<attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time>" +
        "<clef><sign>G</sign><line>2</line></clef></attributes>";

    function render(xml: string, newSystemFromXml: boolean = false): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg", newSystemFromXML: newSystemFromXml });
        return osmd.load(xml).then(() => {
            osmd.render();
            return osmd;
        });
    }

    function wedges(osmd: OpenSheetMusicDisplay): GraphicalContinuousDynamicExpression[] {
        const result: GraphicalContinuousDynamicExpression[] = [];
        for (const page of osmd.GraphicSheet.MusicPages) {
            for (const system of page.MusicSystems) {
                for (const staffLine of system.StaffLines) {
                    for (const expression of staffLine.AbstractExpressions) {
                        if (expression instanceof GraphicalContinuousDynamicExpression && !expression.IsVerbal && !result.includes(expression)) {
                            result.push(expression);
                        }
                    }
                }
            }
        }
        return result;
    }
    function left(w: GraphicalContinuousDynamicExpression): number {
        return Math.min(...w.Lines.map(l => Math.min(l.Start.x, l.End.x)));
    }
    function right(w: GraphicalContinuousDynamicExpression): number {
        return Math.max(...w.Lines.map(l => Math.max(l.Start.x, l.End.x)));
    }
    function measures(osmd: OpenSheetMusicDisplay): GraphicalMeasure[] {
        return osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0].Measures;
    }
    /** x of the staff entry at `timestamp` (in the measure) of the measure with index `measureIndex` in the first system */
    function entryX(osmd: OpenSheetMusicDisplay, measureIndex: number, timestamp: number): number {
        const measure: GraphicalMeasure = measures(osmd)[measureIndex];
        const entry: GraphicalStaffEntry = measure.staffEntries.find(e => Math.abs(e.relInMeasureTimestamp.RealValue - timestamp) < 1e-9);
        return entry.PositionAndShape.RelativePosition.x + measure.PositionAndShape.RelativePosition.x;
    }

    function below(wedgeXml: string, offset: number = undefined): string {
        return `<direction placement="below"><direction-type>${wedgeXml}</direction-type>` +
            `${offset === undefined ? "" : `<offset>${offset}</offset>`}</direction>`;
    }
    function note(step: string, octave: number, duration: number, type: string, chord: boolean = false): string {
        return `<note>${chord ? "<chord/>" : ""}<pitch><step>${step}</step><octave>${octave}</octave></pitch>` +
            `<duration>${duration}</duration><voice>1</voice><type>${type}</type></note>`;
    }
    function rest(duration: number, type: string): string {
        return `<note><rest/><duration>${duration}</duration><voice>1</voice><type>${type}</type></note>`;
    }
    const wedge: (type: string) => string = type => `<wedge type="${type}" number="1"/>`;

    /** 16 m43: < from the measure start to beat 2, > from beat 2 to beat 3; the stops and the > start are written after
     *  the chords with offset -1 eighth */
    const negativeOffsetPair: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">${pianoPart}<part id="P1"><measure number="1">${attributes}
${below(wedge("crescendo"))}${rest(1, "eighth")}${note("B", 4, 2, "quarter")}${note("E", 5, 2, "quarter", true)}
${below(wedge("stop"), -1)}${below(wedge("diminuendo"), -1)}${note("D", 5, 2, "quarter")}${note("A", 5, 2, "quarter", true)}
${below(wedge("stop"), -1)}${note("E", 5, 1, "eighth")}${rest(1, "eighth")}${note("E", 5, 2, "quarter")}
</measure></part></score-partwise>`;

    it("starts a wedge with <offset> at its position plus the offset", async () => {
        const osmd: OpenSheetMusicDisplay = await render(negativeOffsetPair);
        const all: GraphicalContinuousDynamicExpression[] = wedges(osmd);
        const crescendo: GraphicalContinuousDynamicExpression = all.find(w => w.ContinuousDynamic.DynamicType === ContDynamicEnum.crescendo);
        const diminuendo: GraphicalContinuousDynamicExpression = all.find(w => w.ContinuousDynamic.DynamicType === ContDynamicEnum.diminuendo);
        // written after the first chord (1/8 + 1/4) with offset -1/8: beat 2
        expect(diminuendo.ContinuousDynamic.StartMultiExpression.Timestamp.RealValue).to.be.closeTo(1 / 4, 1e-9);
        expect(crescendo.ContinuousDynamic.EndOffsetFraction.RealValue).to.be.closeTo(-1 / 8, 1e-9);
        expect(diminuendo.ContinuousDynamic.EndOffsetFraction.RealValue).to.be.closeTo(-1 / 8, 1e-9);
        // the > starts between the two chords, not at the second one
        const chord1: number = entryX(osmd, 0, 1 / 8);
        const chord2: number = entryX(osmd, 0, 3 / 8);
        expect(left(diminuendo)).to.be.lessThan(chord2 - 0.25 * (chord2 - chord1));
        expect(left(diminuendo)).to.be.greaterThan(right(crescendo) - 0.01);
    });

    /** 18 m30-31: a crescendo to the barline, then a crescendo from the barline whose stop is written after the first note
     *  with offset +3 eighths */
    const stopStartAtBarline: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">${pianoPart}<part id="P1">
<measure number="1">${attributes}
${note("D", 5, 2, "quarter")}${note("D", 5, 2, "quarter")}${below(wedge("crescendo"))}${note("C", 5, 2, "quarter")}${note("D", 5, 2, "quarter")}
</measure>
<measure number="2">
${below(wedge("stop"))}${below(wedge("crescendo"))}${note("E", 5, 4, "half")}${below(wedge("stop"), 3)}${note("C", 5, 4, "half")}
</measure></part></score-partwise>`;

    it("keeps the end offset of a stop and of the next wedge's stop apart", async () => {
        const osmd: OpenSheetMusicDisplay = await render(stopStartAtBarline);
        const all: GraphicalContinuousDynamicExpression[] = wedges(osmd);
        expect(all.length).to.equal(2);
        const first: GraphicalContinuousDynamicExpression =
            all.find(w => w.ContinuousDynamic.StartMultiExpression.SourceMeasureParent.MeasureNumberXML === 1);
        const second: GraphicalContinuousDynamicExpression = all.find(w => w !== first);
        expect(first.ContinuousDynamic.EndOffsetFraction?.RealValue ?? 0).to.be.closeTo(0, 1e-9);
        expect(second.ContinuousDynamic.EndOffsetFraction.RealValue).to.be.closeTo(3 / 8, 1e-9);
        // the first ends at the barline (in measure 1), the second follows it
        expect(first.ContinuousDynamic.EndMultiExpression.SourceMeasureParent.MeasureNumberXML).to.equal(1);
        expect(right(first)).to.be.lessThan(left(second) + 0.01);
        expect(right(first)).to.be.at.most(measures(osmd)[1].PositionAndShape.RelativePosition.x + 0.01);
    });

    /** 19 m5-6: a crescendo over a whole measure, stopped at the start of the next one (optionally on a new system) */
    function stopAtMeasureStart(newSystem: boolean = false, offset: number = undefined): string {
        return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">${pianoPart}<part id="P1">
<measure number="1">${attributes}
${below(wedge("crescendo"))}${note("B", 4, 2, "quarter")}${note("B", 4, 2, "quarter")}${note("B", 4, 2, "quarter")}${note("C", 5, 2, "quarter")}
</measure>
<measure number="2">${newSystem ? "<print new-system=\"yes\"/>" : ""}
${below(wedge("stop"), offset)}${note("D", 5, 8, "whole")}
</measure>
<measure number="3">${note("D", 5, 8, "whole")}</measure>
</part></score-partwise>`;
    }

    it("ends a wedge stopped at a measure start at the previous measure's end", async () => {
        const osmd: OpenSheetMusicDisplay = await render(stopAtMeasureStart());
        const all: GraphicalContinuousDynamicExpression[] = wedges(osmd);
        expect(all.length).to.equal(1);
        const end: MultiExpression = all[0].ContinuousDynamic.EndMultiExpression;
        expect(end.SourceMeasureParent.MeasureNumberXML).to.equal(1);
        expect(end.Timestamp.RealValue).to.be.closeTo(3 / 4, 1e-9);
        expect(right(all[0])).to.be.at.most(measures(osmd)[1].PositionAndShape.RelativePosition.x + 0.01);
        expect(right(all[0])).to.be.greaterThan(entryX(osmd, 0, 3 / 4));
    });

    it("leaves a wedge stopped at the start of a new system on its system", async () => {
        const osmd: OpenSheetMusicDisplay = await render(stopAtMeasureStart(true), true);
        expect(osmd.GraphicSheet.MusicPages[0].MusicSystems.length).to.be.at.least(2);
        const all: GraphicalContinuousDynamicExpression[] = wedges(osmd);
        expect(all.length).to.equal(1);
        expect(all[0].ParentStaffLine.ParentMusicSystem).to.equal(osmd.GraphicSheet.MusicPages[0].MusicSystems[0]);
        expect(all[0].IsSplittedPart).to.equal(false);
    });

    it("keeps a stop at a measure start with a later offset in its measure", async () => {
        const osmd: OpenSheetMusicDisplay = await render(stopAtMeasureStart(false, 2));
        const all: GraphicalContinuousDynamicExpression[] = wedges(osmd);
        expect(all[0].ContinuousDynamic.EndMultiExpression.SourceMeasureParent.MeasureNumberXML).to.equal(2);
    });
});
