import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A slur broken by a system break: its piece on the next system starts after that system's clef and key signature, not at
 * the staff line's start across them (Sibelius, Violin Concerto III m42-43 in the app at 820 and 1366: the nonuplet's slur,
 * continued to m43, started over the clef and the two sharps).
 * Same as osmd-dart test/slur_continued_piece_start_test.dart.
 */
describe("A slur piece continued on the next system", () => {
    function notes(pitches: string[], startSlur: string = "", stopSlur: string = ""): string {
        return pitches.map((pitch, i) => {
            const slur: string = i === 0 && startSlur ? startSlur : i === pitches.length - 1 && stopSlur ? stopSlur : "";
            return `<note><pitch><step>${pitch[0]}</step><octave>${pitch.substring(1)}</octave></pitch>` +
                "<duration>1</duration><voice>1</voice><type>quarter</type>" +
                `${slur ? `<notations>${slur}</notations>` : ""}</note>`;
        }).join("");
    }

    function score(placement: string, toFirstNote: boolean = false): string {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\">" +
            "<part-list><score-part id=\"P1\"><part-name>Violin</part-name></score-part></part-list><part id=\"P1\">" +
            "<measure number=\"1\"><attributes><divisions>1</divisions><key><fifths>2</fifths></key><time><beats>4</beats>" +
            "<beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>" +
            notes(["D5", "E5", "F5", "G5"], `<slur type="start" number="1" placement="${placement}"/>`) +
            "</measure><measure number=\"2\"><print new-system=\"yes\"/>" +
            (toFirstNote ? notes(["A5"], "", "<slur type=\"stop\" number=\"1\"/>") + notes(["G5", "F5", "E5"]) :
                notes(["A5", "G5", "F5", "E5"], "", "<slur type=\"stop\" number=\"1\"/>")) +
            "</measure></part></score-partwise>";
    }

    async function render(placement: string, toFirstNote: boolean = false): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg", newSystemFromXML: true });
        await osmd.load(score(placement, toFirstNote));
        osmd.render();
        return osmd;
    }

    for (const placement of ["above", "below"]) {
        it(`starts after the clef and key signature (${placement})`, async () => {
            const osmd: OpenSheetMusicDisplay = await render(placement);
            const systems: any[] = osmd.GraphicSheet.MusicPages[0].MusicSystems;
            expect(systems.length).to.equal(2);
            const line: StaffLine = systems[1].StaffLines[0];
            expect(line.GraphicalSlurs.length).to.equal(1);
            const piece: GraphicalSlur = line.GraphicalSlurs[0];
            const measure: GraphicalMeasure = line.Measures[0];
            const instructionsEnd: number = measure.PositionAndShape.RelativePosition.x + measure.beginInstructionsWidth;
            // the clef and two sharps take more than 3 staff spaces
            expect(measure.beginInstructionsWidth).to.be.greaterThan(3);
            expect(piece.bezierStartPt.x, `the piece starts before the end of the clef and key signature at ${instructionsEnd}`)
                .to.be.at.least(instructionsEnd - 0.01);
            // and still ends at its note, right of its start
            expect(piece.bezierEndPt.x).to.be.greaterThan(piece.bezierStartPt.x + 2);
        });
    }

    it("keeps a visible length for a piece to the first note", async () => {
        const osmd: OpenSheetMusicDisplay = await render("above", true);
        const line: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[1].StaffLines[0];
        expect(line.GraphicalSlurs.length).to.equal(1);
        const piece: GraphicalSlur = line.GraphicalSlurs[0];
        expect(piece.bezierEndPt.x - piece.bezierStartPt.x).to.be.at.least(GraphicalSlur.continuedPieceMinLength - 1e-9);
        expect(piece.bezierStartPt.x).to.be.at.least(0);
    });
});
