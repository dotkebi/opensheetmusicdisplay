import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { GraphicalNote } from "../../../src/MusicalScore/Graphical/GraphicalNote";
import { CrossStaffCurve } from "../../../src/MusicalScore/Graphical/VexFlow/CrossStaffCurve";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { PointF2D } from "../../../src/Common/DataObjects/PointF2D";

/**
 * Slurs between the two staves of a piano part. In one system a slur is one curve between the placed staves, over
 * (under) the notes between its ends (CrossStaffCurve, PLAN-cross-staff-beam (4), decision Q1 10-08: however far apart its
 * notes are). Over a system break it is two pieces, one on each staff (decision 10-07): the long piece on the staff where
 * the start note's voice has more of its notes between the two notes. Same as osmd-dart
 * test/slur_across_staves_pieces_test.dart.
 *
 * Fixture test_slur_across_staves_pieces.musicxml (synthetic, piano, 4/4): slur 1 m1 RH -> m3 LH below, its voice on the
 * left hand in m2 (Myrthen 14 m12-14); slur 2 m4 RH -> m6 LH above, the right hand melody rising in m5 (Myrthen 15
 * m41-43); slur 3 LH -> RH in m7; slur 4 m8 RH -> m9 LH over a system break.
 */
describe("Slurs across staves: one curve in a system, two pieces at a system break", () => {
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

    /** the curve's y at x (the sample nearest to it) */
    function curveYAt(curve: CrossStaffCurve, x: number): number {
        let best: PointF2D = curve.sample()[0];
        for (const point of curve.sample()) {
            if (Math.abs(point.x - x) < Math.abs(best.x - x)) {
                best = point;
            }
        }
        return best.y;
    }

    function notesOf(measureIndex: number, staff: number): GraphicalNote[] {
        const notes: GraphicalNote[] = [];
        for (const entry of osmd.GraphicSheet.MeasureList[measureIndex][staff].staffEntries) {
            for (const gve of entry.graphicalVoiceEntries) {
                notes.push(...gve.notes.filter(note => !note.sourceNote.isRest()));
            }
        }
        return notes;
    }

    it("a slur whose voice moves to the other staff: one curve under it", () => {
        const slur1: Piece[] = pieces[1];
        expect(slur1.length, "one slur in one system").to.equal(1);
        expect(slur1[0].isPiece).to.equal(false);
        const curve: CrossStaffCurve = slur1[0].slur.crossStaffCurve;
        expect(curve.placement).to.equal(PlacementEnum.Below);
        expect(curve.unclearedObstacles).to.equal(0);
        // under the left hand's notes of m2 (its voice), by the clearance
        for (const note of notesOf(1, 1)) {
            const position: PointF2D = note.PositionAndShape.AbsolutePosition;
            expect(curveYAt(curve, position.x + 0.6), `under ${note.sourceNote.Pitch.ToString()}`).to.be.greaterThan(position.y + 0.5);
        }
        expect(curve.startPoint.y).to.be.lessThan(osmd.GraphicSheet.MeasureList[1][1].ParentStaffLine.PositionAndShape.AbsolutePosition.y);
    });

    it("a melody slur ending on the other staff: one curve over the melody", () => {
        const slur2: Piece[] = pieces[4];
        expect(slur2.length).to.equal(1);
        expect(slur2[0].isPiece).to.equal(false);
        const curve: CrossStaffCurve = slur2[0].slur.crossStaffCurve;
        expect(curve.placement).to.equal(PlacementEnum.Above);
        expect(curve.unclearedObstacles).to.equal(0);
        for (const note of notesOf(4, 0)) {
            const position: PointF2D = note.PositionAndShape.AbsolutePosition;
            expect(curveYAt(curve, position.x + 0.6), `over ${note.sourceNote.Pitch.ToString()}`).to.be.lessThan(position.y - 0.5);
        }
        // down to the left hand's C3 at its end: its up stem's end (the stem points to the slur's side)
        const c3: PointF2D = notesOf(5, 1)[0].PositionAndShape.AbsolutePosition;
        expect(curve.endPoint.y).to.be.closeTo(c3.y - 4, 0.6);
        expect(Math.abs(curve.endPoint.x - c3.x)).to.be.lessThan(2);
    });

    it("a slur to the other staff in one measure stays one curve", () => {
        expect(pieces[7].length).to.equal(1);
        expect(pieces[7][0].isPiece).to.equal(false);
        expect(pieces[7][0].slur.crossStaffCurve).to.not.equal(undefined);
    });

    it("a slur over a system break into the other staff: a piece each", () => {
        const slur4: Piece[] = pieces[8];
        expect(slur4.every(p => p.isPiece)).to.equal(true);
        expect(slur4.map(p => `${p.system}:${p.staff}:${p.measures}`)).to.deep.equal(["0:0:8", "1:1:9"]);
    });
});
