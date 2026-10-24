import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { SourceMeasure } from "../../../src/MusicalScore/VoiceData/SourceMeasure";
import { AbstractGraphicalExpression } from "../../../src/MusicalScore/Graphical/AbstractGraphicalExpression";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";

/**
 * A second words at the same time as another marking is printed too, on its own side: a verbal dynamic ("dim.", "cresc.")
 * is an entry of its multi expression and the words label of its side carries it ("dim. poco rall.", Nielsen, Clarinet
 * Concerto m399); a verbal dynamic alone on its side is drawn as a dynamic while the words of the other side get their own
 * label ("allarg." above, "cresc." below: Bowen, Viola Sonata Op. 22 III m277; ":" above, "cresc." below: Saint-Saëns,
 * Violin Concerto No. 3 m731). The verbal dynamic went into the words label of the other side ("allarg. cresc." above,
 * "cresc. :" below). Same as osmd-dart's words_same_time_second_test.dart.
 */
describe("Words at the same time as another marking", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    interface Labels { above: string[], below: string[] }

    before(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_words_same_time_second.musicxml"));
        osmd.render();
    });
    after(() => {
        osmd.clear();
        container.remove();
    });

    /** The expression labels of the first staff line, by measure and side, in x order. */
    function labelsByMeasure(): Labels[] {
        const measures: GraphicalMeasure[] = osmd.GraphicSheet.MeasureList.map(column => column[0]);
        const result: Labels[] = measures.map((): Labels => ({ above: [], below: [] }));
        const found: { x: number, index: number, above: boolean, text: string }[] = [];
        for (const expression of measures[0].ParentStaffLine.AbstractExpressions as AbstractGraphicalExpression[]) {
            const text: string = expression.Label?.Label?.text;
            if (!text || text.trim().length === 0) {
                continue;
            }
            const x: number = expression.Label.PositionAndShape.AbsolutePosition.x;
            let index: number = measures.length - 1;
            for (let i: number = 0; i < measures.length; i++) {
                const left: number = measures[i].PositionAndShape.AbsolutePosition.x;
                if (x < left + measures[i].PositionAndShape.Size.width) {
                    index = i;
                    break;
                }
            }
            found.push({ x, index, above: expression.Placement === PlacementEnum.Above, text });
        }
        found.sort((a, b) => a.x - b.x);
        for (const label of found) {
            (label.above ? result[label.index].above : result[label.index].below).push(label.text);
        }
        return result;
    }

    it("keeps another part's tempo word at the time of a longer one", async () => {
        // the piano's "tempo" (plain words) at the clarinet's "a tempo" (Nielsen, Clarinet Concerto m425): osmd-dart dropped it
        //   as a doublette of the tempo mark because that text contains it
        const other: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await other.load(TestUtils.getScore("test_tempo_words_other_part.musicxml"));
        const m2: SourceMeasure = other.Sheet.SourceMeasures[1];
        expect(m2.TempoExpressions.map(multi => multi.EntriesList.map(e => e.label).join("+"))).to.deep.equal(["a tempo"]);
        // (the p at the same time is a multi expression of its own, an entry without a label)
        expect(m2.StaffLinkedExpressions[1].map(multi => multi.EntriesList.map(e => e.label).filter(l => l).join("+")).filter(l => l))
            .to.deep.equal(["tempo"]);
        other.clear();
    });

    it("draws every words of a time, one label per side", () => {
        const labels: Labels[] = labelsByMeasure();
        // m1: mf with espressivo beside it below (Tranquillo is a tempo label, not an expression of the staff line)
        expect(labels[0].below.join(" ")).to.contain("espressivo");
        // m2: dim. (a verbal dynamic) and poco rall. below, one label
        expect(labels[1].above).to.deep.equal([]);
        expect(labels[1].below).to.deep.equal(["dim. poco rall."]);
        // m3: allarg. above; cresc. (a verbal dynamic alone on its side) below, drawn as a dynamic: on a row of its own, not
        //   beside the f of the same time (81sabo B rows, user decision 10-25: two rows, as the dynamics alignment places them)
        expect(labels[2].above).to.deep.equal(["allarg."]);
        expect(labels[2].below).to.include("cresc.");
        expect(labels[2].below.join(" ")).to.not.contain("allarg.");
        const m3Left: number = osmd.GraphicSheet.MeasureList[2][0].PositionAndShape.RelativePosition.x;
        const m3: AbstractGraphicalExpression[] = (osmd.GraphicSheet.MeasureList[0][0].ParentStaffLine.AbstractExpressions as AbstractGraphicalExpression[])
            .filter(e => e.Label?.Label?.text?.trim().length > 0 && e.PositionAndShape.RelativePosition.x >= m3Left);
        const f: AbstractGraphicalExpression = m3.find(e => e.Label.Label.text === "f");
        const cresc: AbstractGraphicalExpression = m3.find(e => e.Label.Label.text === "cresc.");
        const fBox: { top: number, bottom: number } = { top: f.PositionAndShape.RelativePosition.y + f.PositionAndShape.BorderMarginTop,
                                                       bottom: f.PositionAndShape.RelativePosition.y + f.PositionAndShape.BorderMarginBottom };
        const crescBox: { top: number, bottom: number } = {
            top: cresc.PositionAndShape.RelativePosition.y + cresc.PositionAndShape.BorderMarginTop,
            bottom: cresc.PositionAndShape.RelativePosition.y + cresc.PositionAndShape.BorderMarginBottom };
        expect(crescBox.top >= fBox.bottom - 0.01 || fBox.top >= crescBox.bottom - 0.01,
               `f ${JSON.stringify(fBox)} and cresc. ${JSON.stringify(crescBox)} on two rows`).to.equal(true);
        // m4: the bold colon above, cresc. below
        expect(labels[3].above).to.deep.equal([":"]);
        expect(labels[3].below).to.deep.equal(["cresc."]);
    });
});
