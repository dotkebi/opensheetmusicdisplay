import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalContinuousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalContinuousDynamicExpression";
import { ContDynamicEnum } from "../../../src/MusicalScore/VoiceData/Expressions/ContinuousExpressions/ContinuousDynamicExpression";
import { GraphicalLine } from "../../../src/MusicalScore/Graphical/GraphicalLine";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Wedge ends (Schumann, Myrthen): a stop read after another voice ends under the last note of the wedge's staff before it,
 * not under the start of the last note read (17 m34: a diminuendo over the second beat was drawn as a short ">" at the
 * measure start, because a held half note in voice 2 was read last); and the second half of a wedge split at a system break
 * keeps its shape when it is aligned with a dynamic (21 m35: its lines crossed into an X).
 * Same as osmd-dart test/wedge_ends_test.dart.
 */
describe("Wedge ends", () => {
    const pianoPart: string = "<part-list><score-part id=\"P1\"><part-name>Piano</part-name></score-part></part-list>";

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
        for (const system of osmd.GraphicSheet.MusicPages[0].MusicSystems) {
            for (const staffLine of system.StaffLines) {
                for (const expression of staffLine.AbstractExpressions) {
                    if (expression instanceof GraphicalContinuousDynamicExpression && !expression.IsVerbal && !result.includes(expression)) {
                        result.push(expression);
                    }
                }
            }
        }
        return result;
    }

    function triplet(step: string, octave: number): string {
        return `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>2</duration><voice>1</voice>` +
            "<type>eighth</type><time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification></note>";
    }
    function above(wedge: string): string {
        return `<direction placement="above"><direction-type>${wedge}</direction-type></direction>`;
    }

    /** 17 m34: two eighth triplets in voice 1 (< on the first, > on the second), a half note in voice 2, and the > stop
     *  after the half note at the end of the measure */
    const stopAfterOtherVoice: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">${pianoPart}<part id="P1"><measure number="1">
<attributes><divisions>6</divisions><time><beats>2</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
${above("<wedge type=\"crescendo\" number=\"1\"/>")}${triplet("B", 4)}${triplet("A", 4)}${triplet("C", 5)}
${above("<wedge type=\"stop\" number=\"1\"/>")}${above("<wedge type=\"diminuendo\" number=\"1\"/>")}${triplet("E", 5)}${triplet("C", 5)}${triplet("A", 4)}
<backup><duration>12</duration></backup>
<note><pitch><step>D</step><octave>4</octave></pitch><duration>12</duration><voice>2</voice><type>half</type><stem>down</stem></note>
${above("<wedge type=\"stop\" number=\"1\"/>")}
</measure></part></score-partwise>`;

    it("ends a stop read after another voice under the last note of its staff before it", async () => {
        const osmd: OpenSheetMusicDisplay = await render(stopAfterOtherVoice);
        const all: GraphicalContinuousDynamicExpression[] = wedges(osmd);
        const crescendo: GraphicalContinuousDynamicExpression = all.find(w => w.ContinuousDynamic.DynamicType === ContDynamicEnum.crescendo);
        const diminuendo: GraphicalContinuousDynamicExpression = all.find(w => w.ContinuousDynamic.DynamicType === ContDynamicEnum.diminuendo);
        expect(crescendo).to.not.equal(undefined);
        expect(diminuendo).to.not.equal(undefined);
        // the last triplet eighth (A4) starts at 5/12
        expect(diminuendo.ContinuousDynamic.EndMultiExpression.Timestamp.RealValue).to.be.closeTo(5 / 12, 1e-9);
        const width: (w: GraphicalContinuousDynamicExpression) => number = w =>
            Math.max(...w.Lines.map(l => Math.max(l.Start.x, l.End.x))) - Math.min(...w.Lines.map(l => Math.min(l.Start.x, l.End.x)));
        // as long as the crescendo over the first triplet, not a short ">" at its end
        expect(width(diminuendo)).to.be.greaterThan(0.8 * width(crescendo));
        const crescendoRight: number = Math.max(...crescendo.Lines.map(l => l.End.x));
        expect(Math.min(...diminuendo.Lines.map(l => l.End.x))).to.be.greaterThan(crescendoRight - 0.01);
    });

    /** 21 m34-35 (the stop moved after the first note of the next system: a stop at the measure start ends the wedge at the
     *  barline, see WedgeOffset_Test.ts): a crescendo from the last eighth of a system over the first note of the next,
     *  which continues with a short crescendo into pp, so the split second half is aligned with the pp */
    const splitCrescendoBeforePp: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">${pianoPart}<part id="P1">
<measure number="1"><attributes><divisions>2</divisions><time><beats>3</beats><beat-type>4</beat-type></time>
<clef><sign>G</sign><line>2</line></clef></attributes>
<note><pitch><step>A</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
<note><pitch><step>A</step><octave>4</octave></pitch><duration>3</duration><voice>1</voice><type>quarter</type><dot/></note>
<direction placement="below"><direction-type><wedge type="crescendo" number="3"/></direction-type></direction>
<note><pitch><step>E</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
</measure>
<measure number="2"><print new-system="yes"/>
<note><pitch><step>A</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
<direction placement="below"><direction-type><wedge type="stop" number="3"/></direction-type></direction>
<direction placement="below"><direction-type><wedge type="crescendo" number="7"/></direction-type></direction>
<note><rest/><duration>1</duration><voice>1</voice><type>eighth</type></note>
<direction placement="below"><direction-type><dynamics><pp/></dynamics></direction-type></direction>
<direction placement="below"><direction-type><wedge type="stop" number="7"/></direction-type></direction>
<note><pitch><step>A</step><octave>3</octave></pitch><duration>3</duration><voice>1</voice><type>quarter</type><dot/></note>
<note><chord/><pitch><step>E</step><octave>4</octave></pitch><duration>3</duration><voice>1</voice><type>quarter</type><dot/></note>
</measure></part></score-partwise>`;

    it("keeps the shape of a split wedge's second half when it is aligned", async () => {
        const osmd: OpenSheetMusicDisplay = await render(splitCrescendoBeforePp, true);
        expect(osmd.GraphicSheet.MusicPages[0].MusicSystems.length).to.equal(2);
        const halves: GraphicalContinuousDynamicExpression[] = wedges(osmd).filter(w =>
            w.ContinuousDynamic.NumberXml === 3 && w.ParentStaffLine.ParentMusicSystem === osmd.GraphicSheet.MusicPages[0].MusicSystems[1]);
        expect(halves.length).to.equal(1);
        const [upper, lower]: GraphicalLine[] = halves[0].Lines;
        // a crescendo opening: both lines start at the same x, the upper one above the lower one, and they widen
        expect(upper.Start.x).to.be.closeTo(lower.Start.x, 1e-6);
        expect(upper.End.x).to.be.closeTo(lower.End.x, 1e-6);
        expect(upper.Start.y).to.be.lessThan(lower.Start.y);
        expect(lower.Start.y - upper.Start.y).to.be.lessThan(lower.End.y - upper.End.y);
        expect((upper.Start.y + lower.Start.y) / 2).to.be.closeTo((upper.End.y + lower.End.y) / 2, 1e-6);
    });
});
