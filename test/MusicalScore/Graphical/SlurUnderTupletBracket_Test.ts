import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A slur between notes with staccatos in a tuplet whose bracket is over them goes under the bracket, past the staccatos
 * only; the bracket goes over the slur, as at notes without articulations (Gliere, Horn Concerto III m226: a triplet from
 * an eighth rest, the slur from F5 to Db5, staccatos on both, went over the bracket; the print has it under; user decision
 * 11-14). An unbracketed number stays under the slur, as before.
 * Same as osmd-dart test/slur_under_tuplet_bracket_test.dart.
 */
describe("A slur in a bracketed tuplet", () => {
    function note(step: string, octave: number, alter: number = 0, beam: string = "", notations: string = ""): string {
        return `<note><pitch><step>${step}</step>${alter !== 0 ? `<alter>${alter}</alter>` : ""}<octave>${octave}</octave>` +
            "</pitch><duration>2</duration><type>eighth</type><time-modification><actual-notes>3</actual-notes>" +
            "<normal-notes>2</normal-notes></time-modification><stem>down</stem>" +
            (beam ? `<beam number="1">${beam}</beam>` : "") + (notations ? `<notations>${notations}</notations>` : "") + "</note>";
    }

    function score(bracket: boolean, staccatos: boolean): string {
        const staccato: string = staccatos ? "<articulations><staccato/></articulations>" : "";
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\">" +
            "<part-list><score-part id=\"P1\"><part-name>Horn</part-name></score-part></part-list><part id=\"P1\">" +
            "<measure number=\"1\"><attributes><divisions>3</divisions><key><fifths>1</fifths></key><time><beats>2</beats>" +
            "<beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>" +
            "<note><rest/><duration>2</duration><type>eighth</type><time-modification><actual-notes>3</actual-notes>" +
            "<normal-notes>2</normal-notes></time-modification><notations>" +
            `<tuplet bracket="${bracket ? "yes" : "no"}" number="1" placement="above" type="start" show-number="actual"/>` +
            "</notations></note>" +
            note("F", 5, 0, "begin", `<slur number="1" type="start" placement="above"/>${staccato}`) +
            note("D", 5, -1, "end", `<slur number="1" type="stop"/>${staccato}<tuplet number="1" type="stop"/>`) +
            note("E", 5, -1, "begin",
                 "<tuplet bracket=\"no\" number=\"1\" placement=\"above\" type=\"start\" show-number=\"none\"/>") +
            note("B", 4, -1, "continue") +
            note("G", 4, 0, "end", "<tuplet number=\"1\" type=\"stop\"/>") +
            "</measure></part></score-partwise>";
    }

    async function render(bracket: boolean, staccatos: boolean): Promise<VexFlowMeasure> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1024px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(score(bracket, staccatos));
        osmd.render();
        return osmd.GraphicSheet.MeasureList[0][0] as VexFlowMeasure;
    }

    /** The top of the slur's curve (the least y of its points) between left and right. */
    function curveTop(slur: GraphicalSlur, left: number, right: number): number {
        let top: number = Infinity;
        for (let i: number = 0; i <= 64; i++) {
            const point: any = slur.calculateCurvePointAtIndex(i / 64);
            if (point.x >= left && point.x <= right && point.y < top) {
                top = point.y;
            }
        }
        return top;
    }

    for (const staccatos of [true, false]) {
        it(`goes under the bracket, the bracket over it (staccatos: ${staccatos})`, async () => {
            const measure: VexFlowMeasure = await render(true, staccatos);
            const inks: any[] = measure.TupletNumberInk;
            expect(inks.length).to.equal(1);
            const bracket: any = inks[0];
            expect(bracket.bracketed).to.equal(true);
            const slur: GraphicalSlur = measure.ParentStaffLine.GraphicalSlurs[0];
            expect(slur.bezierStartPt.x).to.be.lessThan(bracket.right);
            // the whole curve under the bracket, its ticks included
            expect(curveTop(slur, bracket.left, bracket.right), `the slur reaches over the bracket's bottom at ${bracket.bottom}`)
                .to.be.greaterThan(bracket.bottom);
            // the bracket went over the slur
            expect(measure.TupletNumberSlurRaiseTrace.get(bracket.tuplet)?.length ?? 0).to.be.greaterThan(0);
        });
    }

    it("still starts over the staccato", async () => {
        const slur: GraphicalSlur = (await render(true, true)).ParentStaffLine.GraphicalSlurs[0];
        const without: GraphicalSlur = (await render(true, false)).ParentStaffLine.GraphicalSlurs[0];
        // (a staccato over F5 in the top space: the slur starts higher than at the head alone)
        expect(slur.bezierStartPt.y).to.be.lessThan(without.bezierStartPt.y - 0.5);
    });

    it("keeps an unbracketed number under the slur", async () => {
        const measure: VexFlowMeasure = await render(false, true);
        const inks: any[] = measure.TupletNumberInk;
        expect(inks.length).to.equal(1);
        const number: any = inks[0];
        expect(number.bracketed).to.equal(false);
        const slur: GraphicalSlur = measure.ParentStaffLine.GraphicalSlurs[0];
        expect(measure.TupletNumberSlurRaiseTrace.get(number.tuplet)?.length ?? 0).to.equal(0);
        expect(curveTop(slur, number.left, number.right)).to.be.lessThan(number.top);
    });
});
