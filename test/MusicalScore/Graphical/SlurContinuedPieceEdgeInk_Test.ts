import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { PointF2D } from "../../../src/Common/DataObjects/PointF2D";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A slur from a low note over rising beamed sixteenths to the end of the system, continued on the next one: its piece
 * ends at the system edge over the last notes and their beam, not inside them (Weber, Clarinet Concerto 2 III m216 at
 * 820, 834 and 1024: the piece ended 1 unit above its start note's height, in the staff, and ran into the beam of the
 * last notes). The piece continued on the next system, from over a high note down to a low one, starts over that note
 * likewise. Same as osmd-dart test/slur_continued_piece_edge_ink_test.dart.
 */
describe("A slur piece at a system edge", () => {
    function sixteenths(pitches: string[], startSlur: string = "", stopSlur: string = ""): string {
        return pitches.map((pitch, i) => {
            const slur: string = i === 0 && startSlur ? startSlur : i === pitches.length - 1 && stopSlur ? stopSlur : "";
            const beam: string = i % 4 === 0 ? "begin" : i % 4 === 3 ? "end" : "continue";
            return `<note><pitch><step>${pitch[0]}</step><octave>${pitch.substring(1)}</octave></pitch>` +
                "<duration>1</duration><voice>1</voice><type>16th</type>" +
                `<beam number="1">${beam}</beam><beam number="2">${beam}</beam>` +
                `${slur ? `<notations>${slur}</notations>` : ""}</note>`;
        }).join("");
    }

    function score(placement: string): string {
        const below: boolean = placement === "below";
        const up: string[] = ["G3", "A3", "B3", "C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5", "E5", "F5", "G5", "A5"];
        const down: string[] = ["D6", "C6", "B5", "A5", "G5", "F5", "E5", "D5", "C5", "B4", "A4", "G4", "F4", "E4", "D4", "C4"];
        const m1: string[] = below ? down : up;
        const m2: string[] = below ? up.slice().reverse() : down;
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\">" +
            "<part-list><score-part id=\"P1\"><part-name>Clarinet</part-name></score-part></part-list><part id=\"P1\">" +
            "<measure number=\"1\"><attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>4</beats>" +
            "<beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>" +
            sixteenths(m1, `<slur type="start" number="1" placement="${placement}"/>`) +
            "</measure><measure number=\"2\"><print new-system=\"yes\"/>" +
            sixteenths(m2, "", "<slur type=\"stop\" number=\"1\"/>") +
            "</measure></part></score-partwise>";
    }

    async function render(placement: string): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg", newSystemFromXML: true });
        await osmd.load(score(placement));
        osmd.render();
        return osmd;
    }

    /** the piece's height at its end (else start) and how far it lies out of the notes' ink (the sky or bottom line
     *  before the slurs) from its note at that edge to the edge: positive when clear of it */
    function edge(line: StaffLine, piece: GraphicalSlur, atEnd: boolean, below: boolean): { y: number, clear: number } {
        const p: PointF2D = atEnd ? piece.bezierEndPt : piece.bezierStartPt;
        const entry: GraphicalStaffEntry = atEnd ? piece.staffEntries[piece.staffEntries.length - 1] : piece.staffEntries[0];
        const noteX: number = entry.parentMeasure.PositionAndShape.RelativePosition.x + entry.PositionAndShape.RelativePosition.x;
        const left: number = atEnd ? noteX : p.x;
        const right: number = atEnd ? p.x : noteX + entry.PositionAndShape.BorderRight;
        const lines: number[] = below ? line.BottomLineBeforeSlurs : line.SkyLineBeforeSlurs;
        const samplingUnit: number = 3; // samples per staff space in both engines
        let ink: number = below ? -Infinity : Infinity;
        for (let i: number = Math.floor(left * samplingUnit); i <= Math.ceil(right * samplingUnit) && i < lines.length; i++) {
            if (i < 0 || !Number.isFinite(lines[i])) {
                continue;
            }
            ink = below ? Math.max(ink, lines[i]) : Math.min(ink, lines[i]);
        }
        return { y: p.y, clear: below ? p.y - ink : ink - p.y };
    }

    for (const placement of ["above", "below"]) {
        const below: boolean = placement === "below";
        it(`ends the piece to the system end out of the last notes' ink (${placement})`, async () => {
            const osmd: OpenSheetMusicDisplay = await render(placement);
            const systems: any[] = osmd.GraphicSheet.MusicPages[0].MusicSystems;
            expect(systems.length).to.equal(2);
            const line: StaffLine = systems[0].StaffLines[0];
            expect(line.GraphicalSlurs.length).to.equal(1);
            const r: { y: number, clear: number } = edge(line, line.GraphicalSlurs[0], true, below);
            expect(r.clear, `the piece ends at ${r.y}, ${-r.clear} into the ink`).to.be.at.least(0.3);
        });

        it(`starts the piece from the system start out of the first notes' ink (${placement})`, async () => {
            const osmd: OpenSheetMusicDisplay = await render(placement);
            const line: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[1].StaffLines[0];
            expect(line.GraphicalSlurs.length).to.equal(1);
            const r: { y: number, clear: number } = edge(line, line.GraphicalSlurs[0], false, below);
            expect(r.clear, `the piece starts at ${r.y}, ${-r.clear} into the ink`).to.be.at.least(0.3);
        });
    }
});
