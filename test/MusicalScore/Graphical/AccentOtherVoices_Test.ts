import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { TestUtils } from "../../Util/TestUtils";
import Vex from "vexflow";
import VF = Vex.Flow;

/**
 * The accent of a lower voice placed above (placement="above": without one, two voices put it on its stem side, below,
 * see ArticulationVoicesOutside_Test). When another voice's notes are there, it goes above them and their stem
 * (Schumann, Myrthen 11 m12, left hand: the accent of F#3 was drawn inside the upper voice's chord A3-F#4). And the
 * accent at the start of a slur below no longer moves down when it is above the note (it was pushed further into the
 * chord). Same as osmd-dart test/accent_other_voices_test.dart.
 */
describe("Accent clear of the other voices", () => {
    function score(lowerVoice: string, upper: string): string {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\">" +
            "<part-list><score-part id=\"P1\"><part-name>Piano</part-name></score-part></part-list><part id=\"P1\">" +
            "<measure number=\"1\"><attributes><divisions>2</divisions><time><beats>2</beats><beat-type>4</beat-type></time>" +
            "<clef><sign>F</sign><line>4</line></clef></attributes>" + lowerVoice +
            (upper ? "<backup><duration>4</duration></backup>" + upper : "") + "</measure></part></score-partwise>";
    }
    // 11 m12, left hand: voice 5 F#3 (down stem, accent, slur below to B2), voice 6 the chord A3 B3 D#4 F#4 (up stem)
    const lower: string =
        "<note><pitch><step>F</step><alter>1</alter><octave>3</octave></pitch><duration>3</duration><voice>5</voice><type>quarter</type>" +
        "<dot/><stem>down</stem><notations><articulations><accent placement=\"above\"/></articulations>" +
        "<slur type=\"start\" number=\"1\" placement=\"below\"/>" +
        "</notations></note>" +
        "<note><pitch><step>B</step><octave>2</octave></pitch><duration>1</duration><voice>5</voice><type>eighth</type><stem>down</stem>" +
        "<notations><slur type=\"stop\" number=\"1\"/></notations></note>";
    const chord: string = [["A", 0, 3], ["B", 0, 3], ["D", 1, 4], ["F", 1, 4]].map(([step, alter, octave], i) =>
        `<note>${i > 0 ? "<chord/>" : ""}<pitch><step>${step}</step><alter>${alter}</alter><octave>${octave}</octave></pitch>` +
        `<duration>4</duration><voice>6</voice><type>half</type>${i === 0 ? "<stem>up</stem>" : ""}</note>`).join("");

    /** the y of the last drawn accent glyph (the final draw, after the skyline's), recorded while rendering */
    let drawnY: number;
    async function render(xml: string): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "800px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        // (the VexFlow notes and their articulations are created at load)
        const proto: any = (VF as any).Articulation.prototype;
        const draw: any = proto.draw;
        proto.draw = function (): void {
            const glyphRender: any = this.glyph.render;
            this.glyph.render = (ctx: any, x: number, y: number): void => { drawnY = y; glyphRender.call(this.glyph, ctx, x, y); };
            try { draw.call(this); } finally { this.glyph.render = glyphRender; }
        };
        try {
            await osmd.load(xml);
            osmd.render();
        } finally {
            proto.draw = draw;
        }
        return osmd;
    }
    /** the accent's drawn y (its glyph's anchor) and the notes of the first staff entry */
    function accent(osmd: OpenSheetMusicDisplay): { y: number, accented: any, other: any } {
        const entries: VexFlowVoiceEntry[] = osmd.GraphicSheet.MeasureList[0][0].staffEntries[0].graphicalVoiceEntries as VexFlowVoiceEntry[];
        const accented: any = entries.find(e => e.parentVoiceEntry.ParentVoice.VoiceId === 5).vfStaveNote;
        const other: any = entries.find(e => e.parentVoiceEntry.ParentVoice.VoiceId === 6)?.vfStaveNote;
        return { y: drawnY, accented, other };
    }

    it("puts the accent of the lower voice above the upper voice's chord and stem", async () => {
        const osmd: OpenSheetMusicDisplay = await render(score(lower, chord));
        const { y, other } = accent(osmd);
        const stem: any = other.getStemExtents();
        expect(y, `accent at ${y}, chord stem tip at ${stem.topY}`).to.be.lessThan(stem.topY);
    });

    it("keeps the accent next to its note without another voice, also at a slur below", async () => {
        const osmd: OpenSheetMusicDisplay = await render(score(lower, ""));
        const { y, accented } = accent(osmd);
        const head: number = Math.min(...accented.getYs());
        const space: number = accented.getStave().getSpacingBetweenLines();
        // a space above the notehead at least (not pushed down by the slur below), and not moved away (one and a half at most)
        expect(head - y, `accent ${head - y}px above the notehead`).to.be.at.least(space - 0.01);
        expect(head - y).to.be.lessThan(1.6 * space);
    });
});
