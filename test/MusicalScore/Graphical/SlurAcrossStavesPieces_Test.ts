import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";

/**
 * Slurs between the two staves of a piano part drawn as two pieces, one on each staff (decision 10-07, until slurs
 * between staves are drawn in system coordinates with the cross-staff beams): a slur whose notes are in different
 * systems (was left out) or more than a barline apart (one bow between the two notes cut through the notes between them:
 * Schumann, Myrthen 14 m12-14). A slur to the other staff in the same or the next measure stays one curve. The long piece
 * goes on the staff where the start note's voice has more of its notes between the two notes.
 * Same as osmd-dart test/slur_across_staves_pieces_test.dart.
 *
 * Fixture test_slur_across_staves_pieces.musicxml (synthetic, piano, 4/4): slur 1 m1 RH -> m3 LH, its voice on the left
 * hand in m2 (Myrthen 14); slur 2 m4 RH -> m6 LH, the right hand melody in m5 (Myrthen 15 m5-7); slur 3 LH -> RH in m7
 * (one curve); slur 4 m8 RH -> m9 LH over a system break.
 */
describe("Slurs across staves drawn as two pieces", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    interface Piece { system: number, staff: number, measures: string, isPiece: boolean, slur: GraphicalSlur }
    const pieces: { [startMeasure: number]: Piece[] } = {};

    before(async () => {
        container = TestUtils.getDivElement(document);
        container.style.width = "1600px";
        osmd = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg", newSystemFromXML: true });
        await osmd.load(TestUtils.getScore("test_slur_across_staves_pieces.musicxml"));
        osmd.render();
        osmd.GraphicSheet.MusicPages[0].MusicSystems.forEach((system, s) => system.StaffLines.forEach((line, l) => {
            for (const slur of line.GraphicalSlurs) {
                const start: number = slur.slur.StartNote.SourceMeasure.MeasureNumberXML;
                const measures: number[] = [];
                for (const entry of slur.staffEntries) {
                    if (measures.indexOf(entry.parentMeasure.MeasureNumber) < 0) {
                        measures.push(entry.parentMeasure.MeasureNumber);
                    }
                }
                (pieces[start] ??= []).push({ system: s, staff: l, measures: measures.join(","), isPiece: slur.isCrossStaffPiece, slur });
            }
        }));
    });
    after(() => {
        osmd.clear();
        container.remove();
    });

    it("lays the fixture out as expected", () => {
        expect(osmd.GraphicSheet.MusicPages[0].MusicSystems.length, "m1-m8 and m9").to.equal(2);
        for (const start of [1, 4, 7, 8]) {
            expect(pieces[start], `slur from m${start}`).to.not.equal(undefined);
        }
    });

    it("a slur whose voice moves to the other staff: the long piece there", () => {
        const slur1: Piece[] = pieces[1];
        expect(slur1.every(p => p.isPiece)).to.equal(true);
        expect(slur1.map(p => `${p.staff}:${p.measures}`)).to.deep.equal(["0:1", "1:2,3"]);
        // the start piece ends at its measure's end, the end piece starts at the next measure, not at the staff line's ends
        const m1: GraphicalMeasure = osmd.GraphicSheet.MeasureList[0][0];
        const m2: GraphicalMeasure = osmd.GraphicSheet.MeasureList[1][1];
        expect(slur1[0].slur.bezierEndPt.x).to.be.closeTo(m1.PositionAndShape.RelativePosition.x + m1.PositionAndShape.Size.width, 1.5);
        expect(slur1[1].slur.bezierStartPt.x).to.be.greaterThan(m2.PositionAndShape.RelativePosition.x - 0.5);
        expect(slur1[1].slur.bezierStartPt.x).to.be.lessThan(m2.PositionAndShape.RelativePosition.x + 2);
    });

    it("a melody slur ending on the other staff: the long piece on its own staff", () => {
        const slur2: Piece[] = pieces[4];
        expect(slur2.every(p => p.isPiece)).to.equal(true);
        expect(slur2.map(p => `${p.staff}:${p.measures}`)).to.deep.equal(["0:4,5", "1:6"]);
    });

    it("a slur to the other staff in one measure stays one curve", () => {
        expect(pieces[7].length).to.equal(1);
        expect(pieces[7][0].isPiece).to.equal(false);
    });

    it("a slur over a system break into the other staff: a piece each", () => {
        const slur4: Piece[] = pieces[8];
        expect(slur4.every(p => p.isPiece)).to.equal(true);
        expect(slur4.map(p => `${p.system}:${p.staff}:${p.measures}`)).to.deep.equal(["0:0:8", "1:1:9"]);
    });
});
