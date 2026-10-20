import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A tie without a placement split at a system break: both pieces take the side of the whole tie, which VexFlow takes
 * from the end note's stem (StaveTie.draw). The first piece has no end note and took its start note's stem instead
 * (Mozart, Bassoon Concerto K.191 I m95-96: the F4 whole note's stem up from its grace slur below, the next F4's down -
 * the tie bowed below at the break, above within a system; the print ties above).
 * Same as osmd-dart test/split_tie_unset_direction_test.dart.
 */
describe("Split tie without a placement", () => {
    function half(step: string, octave: number, stem: string, extra: string): string {
        return `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>2</duration><voice>1</voice>` +
            `<type>half</type><stem>${stem}</stem>${extra}</note>` +
            "<note><rest/><duration>2</duration><voice>1</voice><type>half</type></note>";
    }
    function score(measures: string[], breakBetween: boolean): string {
        const body: string = measures.map((measure, i) => `<measure number="${i + 1}">` +
            (i === 0 ? "<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>" +
                "<clef><sign>F</sign><line>4</line></clef></attributes>" : breakBetween ? "<print new-system=\"yes\"/>" : "") +
            `${measure}</measure>`).join("");
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\">" +
            `<part-list><score-part id="P1"><part-name>Bassoon</part-name></score-part></part-list><part id="P1">${body}</part></score-partwise>`;
    }
    /** F4 with its stem up tied to F4 with its stem down, no tie placement */
    function tie(breakBetween: boolean): string {
        return score([
            half("F", 4, "up", "<tie type=\"start\"/><notations><tied type=\"start\"/></notations>"),
            half("F", 4, "down", "<tie type=\"stop\"/><notations><tied type=\"stop\"/></notations>"),
        ], breakBetween);
    }

    /** the side each drawn tie piece bows to, as StaveTie.draw takes it (-1: above) */
    async function tieDirections(xml: string): Promise<number[]> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg", newSystemFromXML: true });
        await osmd.load(xml);
        osmd.render();
        const directions: number[] = [];
        for (const system of osmd.GraphicSheet.MusicPages[0].MusicSystems) {
            for (const measure of system.StaffLines[0].Measures) {
                for (const vfTie of (measure as VexFlowMeasure).vfTies) {
                    const t: any = vfTie;
                    directions.push(t.direction ?? (t.last_note ?? t.first_note).getStemDirection());
                }
            }
        }
        return directions;
    }

    it("takes the end note's stem within a system: above", async () => {
        expect(await tieDirections(tie(false))).to.deep.equal([-1]);
    });

    it("draws both pieces of the tie split at a system break above too", async () => {
        expect(await tieDirections(tie(true))).to.deep.equal([-1, -1]);
    });
});
