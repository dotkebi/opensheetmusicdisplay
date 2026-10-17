import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalContinuousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalContinuousDynamicExpression";
import { GraphicalLine } from "../../../src/MusicalScore/Graphical/GraphicalLine";
import { ContDynamicEnum } from "../../../src/MusicalScore/VoiceData/Expressions/ContinuousExpressions/ContinuousDynamicExpression";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Wedges that follow each other in time share a baseline however far apart they are drawn: the second starts where the
 * first stops or at most a beat after it, without an instantaneous dynamic of the staff in between (Parisotti, Bononcini
 * Deh piu a me, piano m17: "<" over two beats and ">" over the fourth, the "<" 2 lower over the low notes; Canto m4: ">" a
 * sixteenth after "<", 0.75 lower in the app; P04-X3c). Not with a dynamic between them or a gap longer than a beat. Same as
 * osmd-dart test/wedge_chain_align_test.dart.
 */
describe("Wedge chain alignment", () => {
    const pianoPart: string = "<part-list><score-part id=\"P1\"><part-name>Piano</part-name></score-part></part-list>";
    function note(step: string, octave: number): string {
        return `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>1</duration><voice>1</voice>` +
            "<type>16th</type><stem>up</stem></note>";
    }
    function wedge(type: string): string {
        return `<direction placement="below"><direction-type><wedge type="${type}" number="1"/></direction-type></direction>`;
    }
    /** 4/4 in sixteenths: the first two beats low (under the staff), the last two high; "<" from the start, stopped at stop
     *  sixteenths, ">" from start to the end, below the staff; a p at pAt if given. */
    function measure(stop: number, start: number, pAt?: number): string {
        let notes: string = "";
        for (let i: number = 0; i < 16; i++) {
            if (i === 0) {
                notes += wedge("crescendo");
            }
            if (i === stop) {
                notes += wedge("stop");
            }
            if (i === pAt) {
                notes += "<direction placement=\"below\"><direction-type><dynamics><p/></dynamics></direction-type></direction>";
            }
            if (i === start) {
                notes += wedge("diminuendo");
            }
            notes += i < 8 ? note(i % 2 === 0 ? "G" : "A", 3) : note(i % 2 === 0 ? "D" : "E", 5);
        }
        notes += wedge("stop");
        return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">${pianoPart}<part id="P1">
<measure number="1"><attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
<clef><sign>G</sign><line>2</line></clef></attributes>${notes}</measure>
<measure number="2"><note><rest/><duration>16</duration><voice>1</voice><type>whole</type></note></measure>
</part></score-partwise>`;
    }

    async function wedges(xml: string): Promise<GraphicalContinuousDynamicExpression[]> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(xml);
        osmd.render();
        const all: GraphicalContinuousDynamicExpression[] = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0].AbstractExpressions
            .filter(e => e instanceof GraphicalContinuousDynamicExpression && !e.IsVerbal) as GraphicalContinuousDynamicExpression[];
        return [all.find(w => w.ContinuousDynamic.DynamicType === ContDynamicEnum.crescendo),
                all.find(w => w.ContinuousDynamic.DynamicType === ContDynamicEnum.diminuendo)];
    }
    const y: (w: GraphicalContinuousDynamicExpression) => number = w =>
        w.Lines.reduce((sum: number, l: GraphicalLine) => sum + l.Start.y + l.End.y, 0) / (2 * w.Lines.length);
    const gap: (a: GraphicalContinuousDynamicExpression, b: GraphicalContinuousDynamicExpression) => number = (a, b) =>
        Math.min(...b.Lines.map(l => Math.min(l.Start.x, l.End.x))) - Math.max(...a.Lines.map(l => Math.max(l.Start.x, l.End.x)));

    it("aligns wedges a beat apart in time (m17)", async () => {
        const [cresc, dim] = await wedges(measure(8, 12));
        const reason: string = `y ${y(cresc)} ${y(dim)}, gap ${gap(cresc, dim)}`;
        expect(gap(cresc, dim), reason).to.be.greaterThan(2);
        expect(y(cresc), reason).to.be.closeTo(y(dim), 0.01);
    });

    it("aligns wedges a sixteenth apart in time (Canto m4)", async () => {
        const [cresc, dim] = await wedges(measure(8, 9));
        const reason: string = `y ${y(cresc)} ${y(dim)}, gap ${gap(cresc, dim)}`;
        expect(gap(cresc, dim), reason).to.be.greaterThan(2);
        expect(y(cresc), reason).to.be.closeTo(y(dim), 0.01);
    });

    it("keeps wedges with a dynamic between them apart", async () => {
        const [cresc, dim] = await wedges(measure(6, 10, 8));
        expect(Math.abs(y(cresc) - y(dim)), `y ${y(cresc)} ${y(dim)}`).to.be.greaterThan(0.5);
    });

    it("keeps wedges more than a beat apart in time apart", async () => {
        const [cresc, dim] = await wedges(measure(6, 11));
        expect(Math.abs(y(cresc) - y(dim)), `y ${y(cresc)} ${y(dim)}`).to.be.greaterThan(0.5);
    });
});
