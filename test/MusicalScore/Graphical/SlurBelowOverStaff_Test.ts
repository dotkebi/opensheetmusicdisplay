import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { PointF2D } from "../../../src/Common/DataObjects/PointF2D";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A slur below between notes over the staff stays under its notes, in the staff, instead of sagging to the staff's
 * bottom line (Schubert, Ganymed piano m120-121: the slur under the B-flat 5 whole note and the A5 half note, the staff's
 * bottom line an obstacle like ink). Notes inside the staff between its ends are still passed under.
 * Same as osmd-dart test/slur_below_over_staff_test.dart.
 */
describe("A slur below between notes over the staff", () => {
    function note(pitch: string, type: string, duration: number, stem: string = "", slur: string = ""): string {
        return `<note><pitch><step>${pitch[0]}</step>${pitch.length > 2 ? "<alter>-1</alter>" : ""}` +
            `<octave>${pitch.substring(pitch.length - 1)}</octave></pitch>` +
            `<duration>${duration}</duration><voice>1</voice><type>${type}</type>` +
            `${stem ? `<stem>${stem}</stem>` : ""}${slur ? `<notations>${slur}</notations>` : ""}</note>`;
    }

    function score(measures: string): string {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\">" +
            "<part-list><score-part id=\"P1\"><part-name>Piano</part-name></score-part></part-list><part id=\"P1\">" +
            "<measure number=\"1\"><attributes><divisions>2</divisions><key><fifths>-1</fifths></key><time><beats>4</beats>" +
            "<beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>" +
            `${measures}</part></score-partwise>`;
    }

    const start: string = "<slur type=\"start\" number=\"1\" placement=\"below\"/>";
    const stop: string = "<slur type=\"stop\" number=\"1\"/>";
    /** the Ganymed m120-121 right hand's slur below: B-flat 5 whole note to A5 half note, stem down */
    const ganymed: string = score(`${note("Bb5", "whole", 8, "", start)}</measure>` +
        `<measure number="2">${note("A5", "half", 4, "down", stop)}` +
        "<note><rest/><duration>4</duration><voice>1</voice><type>half</type></note></measure>");
    /** whole notes G5 B4 G5 under one slur below: the B4 inside the staff */
    const inside: string = score(`${note("G5", "whole", 8, "", start)}</measure>` +
        `<measure number="2">${note("B4", "whole", 8)}</measure>` +
        `<measure number="3">${note("G5", "whole", 8, "", stop)}</measure>`);

    async function slurOf(xml: string): Promise<GraphicalSlur> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(xml);
        osmd.render();
        const systems: any[] = osmd.GraphicSheet.MusicPages[0].MusicSystems;
        expect(systems.length).to.equal(1);
        expect(systems[0].StaffLines[0].GraphicalSlurs.length).to.equal(1);
        return systems[0].StaffLines[0].GraphicalSlurs[0];
    }

    /** the curve's lowest point (largest y) and its y at x */
    function curve(slur: GraphicalSlur, x?: number): { lowest: number, atX: number } {
        let lowest: number = -Infinity;
        let atX: number;
        let previous: PointF2D = slur.calculateCurvePointAtIndex(0);
        for (let i: number = 1; i <= 400; i++) {
            const p: PointF2D = slur.calculateCurvePointAtIndex(i / 400);
            lowest = Math.max(lowest, p.y);
            if (x !== undefined && atX === undefined && previous.x <= x && p.x >= x) {
                atX = p.y;
            }
            previous = p;
        }
        return { lowest, atX };
    }

    it("stays in the staff", async () => {
        const slur: GraphicalSlur = await slurOf(ganymed);
        const lowest: number = curve(slur).lowest;
        // the end at the A5's down stem, at 3; the staff's bottom line at 4
        expect(lowest, `the curve sags to ${lowest}, to the staff's bottom line`).to.be.lessThan(3.6);
    });

    it("passes under a note inside the staff between its ends", async () => {
        const slur: GraphicalSlur = await slurOf(inside);
        const middle: GraphicalStaffEntry = slur.staffEntries[1];
        const x: number = middle.parentMeasure.PositionAndShape.RelativePosition.x + middle.PositionAndShape.RelativePosition.x;
        const box: BoundingBox = middle.graphicalVoiceEntries[0].PositionAndShape;
        const noteBottom: number = box.RelativePosition.y + box.BorderBottom;
        const atX: number = curve(slur, x + box.BorderRight / 2).atX;
        expect(atX).not.to.equal(undefined);
        expect(atX, `the curve at the B4 is at ${atX}, its notehead's bottom at ${noteBottom}`).to.be.greaterThan(noteBottom + 0.2);
    });
});
