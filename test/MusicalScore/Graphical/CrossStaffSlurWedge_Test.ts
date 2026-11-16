import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { CrossStaffCurve } from "../../../src/MusicalScore/Graphical/VexFlow/CrossStaffCurve";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { PointF2D } from "../../../src/Common/DataObjects/PointF2D";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A slur from the left hand up to the right hand, under the left hand's rising eighths (their beam ending on the right
 * hand's D4) and on to the end of the right hand's last stem, over a crescendo under the right hand's beam (Bowen, Viola
 * Sonata No. 2 m141-142: the slur from the left hand's A2 to the right hand's A5 went through both lines of the
 * crescendo; the print has the crescendo under the slur, user decision 2026-11-16; and in the app the slur ended under
 * the A5's notehead, around its stem from the right, where the print ends it at the stem's end).
 * Same as osmd-dart test/cross_staff_slur_wedge_test.dart.
 */
describe("A crescendo under a slur between the staves", () => {
    function note(step: string, octave: number, alter: number = 0, staff: number = 1, voice: number = 1,
                  stem: string = "down", beam: string = "", notations: string = ""): string {
        return `<note><pitch><step>${step}</step>${alter !== 0 ? `<alter>${alter}</alter>` : ""}<octave>${octave}</octave>` +
            `</pitch><duration>1</duration><voice>${voice}</voice><type>eighth</type>` +
            `${alter === 1 ? "<accidental>sharp</accidental>" : ""}<stem>${stem}</stem><staff>${staff}</staff>` +
            (beam ? `<beam number="1">${beam}</beam>` : "") + (notations ? `<notations>${notations}</notations>` : "") + "</note>";
    }

    function chord(pitches: string[]): string {
        return pitches.map((pitch, i) => `<note>${i > 0 ? "<chord/>" : ""}<pitch><step>${pitch[0]}</step>` +
            `<octave>${pitch.substring(1)}</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type>` +
            "<stem>up</stem><staff>1</staff></note>").join("");
    }

    function score(): string {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list>" +
            "<score-part id=\"P1\"><part-name>Piano</part-name></score-part></part-list><part id=\"P1\">" +
            "<measure number=\"1\"><attributes><divisions>2</divisions><key><fifths>-1</fifths></key><time><beats>3</beats>" +
            "<beat-type>4</beat-type></time><staves>2</staves><clef number=\"1\"><sign>G</sign><line>2</line></clef>" +
            "<clef number=\"2\"><sign>F</sign><line>4</line></clef></attributes>" +
            chord(["A3", "C4", "E4", "A4"]) +
            "<note><rest/><duration>2</duration><voice>1</voice><type>quarter</type><staff>1</staff></note>" +
            "<note><rest/><duration>2</duration><voice>1</voice><type>quarter</type><staff>1</staff></note>" +
            "<backup><duration>6</duration></backup>" +
            note("A", 2, 0, 2, 5, "up", "begin", "<slur number=\"1\" type=\"start\" placement=\"below\"/>") +
            note("D", 3, 1, 2, 5, "up", "continue") +
            note("E", 3, 0, 2, 5, "up", "continue") +
            note("A", 3, 0, 2, 5, "up", "continue") +
            note("C", 4, 0, 2, 5, "up", "continue") +
            note("D", 4, 0, 1, 5, "down", "end") +
            "</measure><measure number=\"2\">" +
            note("D", 4, 1, 1, 1, "down", "begin") +
            "<direction placement=\"below\"><direction-type><wedge type=\"crescendo\" number=\"1\"/></direction-type>" +
            "<staff>1</staff></direction>" +
            note("E", 4, 0, 1, 1, "down", "continue") +
            note("A", 4, 0, 1, 1, "down", "continue") +
            note("C", 5, 0, 1, 1, "down", "continue") +
            note("E", 5, 0, 1, 1, "down", "continue") +
            "<direction placement=\"below\"><direction-type><wedge type=\"stop\" number=\"1\"/></direction-type>" +
            "<offset>1</offset><staff>1</staff></direction>" +
            note("A", 5, 0, 1, 1, "down", "end", "<slur number=\"1\" type=\"stop\" placement=\"below\"/>") +
            "<backup><duration>6</duration></backup>" +
            "<note><rest/><duration>6</duration><voice>5</voice><type>half</type><dot/><staff>2</staff></note>" +
            "</measure></part></score-partwise>";
    }

    async function render(width: number): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = `${width}px`;
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(score());
        osmd.render();
        return osmd;
    }

    function curveOf(system: MusicSystem): CrossStaffCurve {
        const curves: CrossStaffCurve[] = system.StaffLines.flatMap(line => line.GraphicalSlurs)
            .map(slur => slur.crossStaffCurve).filter(curve => curve && !curve.isTie);
        expect(curves.length).to.equal(1);
        return curves[0];
    }

    for (const width of [700, 1000]) {
        it(`puts the crescendo under the slur, above the left hand (${width})`, async () => {
            const osmd: OpenSheetMusicDisplay = await render(width);
            const system: MusicSystem = osmd.GraphicSheet.MusicPages[0].MusicSystems[0];
            const upper: any = system.StaffLines[0];
            const lower: any = system.StaffLines[1];
            const curve: CrossStaffCurve = curveOf(system);
            const wedges: any[] = upper.AbstractExpressions.filter((e: any) => e.Lines?.length >= 2 && !e.IsVerbal);
            expect(wedges.length).to.equal(1);
            const wedge: any = wedges[0];
            const dy: number = (osmd as any).drawer.CrossStaffWedgeOffsets.get(wedge) ?? 0;
            const origin: PointF2D = upper.PositionAndShape.AbsolutePosition;
            const xs: number[] = wedge.Lines.flatMap((l: any) => [l.Start.x, l.End.x]);
            const ys: number[] = wedge.Lines.flatMap((l: any) => [l.Start.y, l.End.y]);
            const left: number = origin.x + Math.min(...xs);
            const right: number = origin.x + Math.max(...xs);
            const top: number = origin.y + Math.min(...ys) + dy;
            const bottom: number = origin.y + Math.max(...ys) + dy;
            const heights: number[] = curve.sample(200).filter(p => p.x >= left && p.x <= right).map(p => p.y);
            expect(heights.length).to.be.greaterThan(0);
            const lowest: number = Math.max(...heights);
            expect(lowest, `the slur reaches ${lowest}, the crescendo's top is ${top}`).to.be.at.most(top - 0.4);
            // above the left hand's staff
            expect(bottom).to.be.lessThan(lower.PositionAndShape.AbsolutePosition.y - 0.2);
        });
    }

    it("ends the slur at the end of the last stem, not around it", async () => {
        const osmd: OpenSheetMusicDisplay = await render(1000);
        const system: MusicSystem = osmd.GraphicSheet.MusicPages[0].MusicSystems[0];
        const curve: CrossStaffCurve = curveOf(system);
        const end: PointF2D = curve.endPoint;
        // no point of the curve right of its end (it came around the stem)
        expect(Math.max(...curve.sample(200).map(p => p.x))).to.be.at.most(end.x + 0.05);
        // at the stem's end: under the A5's notehead, the stem down, by the beam's height at least
        const entries: any[] = system.StaffLines[0].Measures[1].staffEntries;
        const head: any = entries[entries.length - 1].graphicalVoiceEntries[0].notes[0];
        expect(end.y).to.be.greaterThan(head.PositionAndShape.AbsolutePosition.y + 2.5);
    });
});
