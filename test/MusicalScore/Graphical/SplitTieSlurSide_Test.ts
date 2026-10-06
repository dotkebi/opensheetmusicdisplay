import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Ties and slurs split at system breaks keep their side (Schumann, Myrthen): both halves of a tie the XML places above are
 * drawn above (2 m18-19: they were drawn below, from the stem), and the middle piece of a slur below - with neither note on
 * its system - is below the staff (11 m36: it started in the staff lines at the clef and crossed the staff).
 * Same as osmd-dart test/split_tie_slur_side_test.dart.
 */
describe("Split ties and slurs keep their side", () => {
    function note(step: string, octave: number, extra: string, stem: string = "up"): string {
        return `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>2</duration><voice>1</voice>` +
            `<type>half</type><stem>${stem}</stem>${extra}</note>` +
            "<note><rest/><duration>2</duration><voice>1</voice><type>half</type></note>";
    }
    function score(measures: string[]): string {
        const body: string = measures.map((measure, i) => `<measure number="${i + 1}">` +
            (i === 0 ? "<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>" +
                "<clef><sign>F</sign><line>4</line></clef></attributes>" : "<print new-system=\"yes\"/>") +
            `${measure}</measure>`).join("");
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\">" +
            `<part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1">${body}</part></score-partwise>`;
    }
    /** a B2 half note with an upward stem (VexFlow's own choice: a tie below) tied over a system break, the tie placed above */
    const tieAboveOverBreak: string = score([
        note("B", 2, "<tie type=\"start\"/><notations><tied type=\"start\" placement=\"above\" orientation=\"over\"/></notations>"),
        note("B", 2, "<tie type=\"stop\"/><notations><tied type=\"stop\"/></notations>"),
    ]);
    /** a slur below from the first to the third system */
    const slurBelowOverThreeSystems: string = score([
        note("D", 3, "<notations><slur type=\"start\" number=\"1\" placement=\"below\"/></notations>", "down"),
        note("E", 3, "", "down"),
        note("F", 3, "<notations><slur type=\"stop\" number=\"1\"/></notations>", "down"),
    ]);

    async function render(xml: string): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg", newSystemFromXML: true });
        await osmd.load(xml);
        osmd.render();
        return osmd;
    }

    it("draws both halves of a tie placed above above", async () => {
        const osmd: OpenSheetMusicDisplay = await render(tieAboveOverBreak);
        const systems: any[] = osmd.GraphicSheet.MusicPages[0].MusicSystems;
        expect(systems.length).to.equal(2);
        const directions: number[] = [];
        for (const system of systems) {
            for (const measure of system.StaffLines[0].Measures) {
                for (const tie of (measure as VexFlowMeasure).vfTies) {
                    directions.push((tie as any).direction);
                }
            }
        }
        expect(directions).to.deep.equal([-1, -1]);
    });

    it("keeps the middle piece of a slur below below the staff", async () => {
        const osmd: OpenSheetMusicDisplay = await render(slurBelowOverThreeSystems);
        const systems: any[] = osmd.GraphicSheet.MusicPages[0].MusicSystems;
        expect(systems.length).to.equal(3);
        const line: StaffLine = systems[1].StaffLines[0];
        expect(line.GraphicalSlurs.length).to.equal(1);
        const slur: GraphicalSlur = line.GraphicalSlurs[0];
        for (const point of [slur.bezierStartPt, slur.bezierEndPt]) {
            expect(point.y).to.be.greaterThan(line.StaffHeight, `end point ${point.y} within or above the staff`);
        }
    });
});
