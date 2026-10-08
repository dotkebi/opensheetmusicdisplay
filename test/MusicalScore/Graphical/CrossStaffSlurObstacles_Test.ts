import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { CrossStaffCurve, CrossStaffCurveDrawGeometry, CrossStaffCurveNote } from "../../../src/MusicalScore/Graphical/VexFlow/CrossStaffCurve";
import { GraphicalNote } from "../../../src/MusicalScore/Graphical/GraphicalNote";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { PointF2D } from "../../../src/Common/DataObjects/PointF2D";
import { Pitch } from "../../../src/Common/DataObjects/Pitch";

/**
 * Slurs of a piano part whose obstacles lie on the other staff (Bellini, PROMPT-bellini-fix-c R6·R7). Same fixture and
 * checks as osmd-dart test/cross_staff_slur_obstacles_test.dart.
 *
 * Fixture test_cross_staff_slur_obstacles.musicxml (synthetic, piano, 4/4): m1 a slur placed above from the left hand's
 * E3 to its G3 whose voice's E4 C4 between lie on the right hand under a cross-staff beam (Sogno d'infanzia m36): one
 * curve over the beam and those notes, from stem end to stem end on the beam (R6, decision Q1 A); m2 the control, the same slur with
 * all its notes on the left hand: an ordinary slur; m3->m5 a slur placed below from the right hand's A4 to the left
 * hand's D4 on the first beat of m5, on a ledger line between the staves, its voice's F4 E4 D#4 half notes (stems up,
 * ledger lines) on the left hand between (Torna, vezzosa Fillide m2->5): the curve runs between the staves, under the
 * right hand and over those notes, to the top of the D4 (R7); m6->m9 the same over a system break before m7 (the web
 * layout of Torna m17->20): the start piece within m6, the end piece on the left hand from m7, above it, to the D4 (R7,
 * web).
 */
describe("Slurs whose obstacles lie on the other staff", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    before(async () => {
        container = TestUtils.getDivElement(document);
        container.style.width = "1600px";
        osmd = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg", newSystemFromXML: true });
        await osmd.load(TestUtils.getScore("test_cross_staff_slur_obstacles.musicxml"));
        osmd.render();
    });
    after(() => {
        osmd.clear();
        container.remove();
    });

    const measureAt: (index: number, staff: number) => VexFlowMeasure =
        (index: number, staff: number) => osmd.GraphicSheet.MeasureList[index][staff] as VexFlowMeasure;
    const notesOf: (index: number, staff: number, voice?: number) => GraphicalNote[] = (index: number, staff: number, voice?: number) => {
        const notes: GraphicalNote[] = [];
        for (const entry of measureAt(index, staff).staffEntries) {
            for (const gve of entry.graphicalVoiceEntries) {
                for (const note of gve.notes) {
                    if (!note.sourceNote.isRest() && (voice === undefined || note.sourceNote.ParentVoiceEntry.ParentVoice.VoiceId === voice)) {
                        notes.push(note);
                    }
                }
            }
        }
        return notes;
    };
    const noteOf: (index: number, staff: number, pitch: string, voice?: number) => GraphicalNote =
        (index: number, staff: number, pitch: string, voice?: number) => {
            const note: GraphicalNote = notesOf(index, staff, voice).find(n => n.sourceNote.Pitch.ToStringShort(Pitch.OctaveXmlDifference) === pitch);
            expect(note, `${pitch} in measure ${index + 1}`).to.not.equal(undefined);
            return note;
        };
    const slursStartingIn: (index: number) => GraphicalSlur[] = (index: number) => {
        const slurs: GraphicalSlur[] = [];
        for (const system of osmd.GraphicSheet.MusicPages[0].MusicSystems) {
            for (const line of system.StaffLines) {
                for (const gSlur of line.GraphicalSlurs) {
                    if (gSlur.slur.StartNote.SourceMeasure.measureListIndex === index) {
                        slurs.push(gSlur);
                    }
                }
            }
        }
        return slurs;
    };
    const curveStartingIn: (index: number) => CrossStaffCurve = (index: number) => {
        const curves: CrossStaffCurve[] = [];
        for (const curve of [...measureAt(index, 0).crossStaffCurves, ...measureAt(index, 1).crossStaffCurves]) {
            if (curves.indexOf(curve) < 0 && curve.startNote.sourceNote.SourceMeasure.measureListIndex === index) {
                curves.push(curve);
            }
        }
        expect(curves.length, `one curve from measure ${index + 1}`).to.equal(1);
        return curves[0];
    };
    /** the curve's y at x (the sample nearest to it) */
    const yAt: (curve: CrossStaffCurve, x: number) => number = (curve: CrossStaffCurve, x: number) => {
        let best: PointF2D = curve.sample()[0];
        for (const point of curve.sample(64)) {
            if (Math.abs(point.x - x) < Math.abs(best.x - x)) {
                best = point;
            }
        }
        return best.y;
    };
    /** the drawn notehead (the curves' frame: absolute units) */
    const head: (note: GraphicalNote) => CrossStaffCurveNote = (note: GraphicalNote) => new CrossStaffCurveDrawGeometry(10).note(note);
    const headX: (note: GraphicalNote) => number = (note: GraphicalNote) => (head(note).headLeft + head(note).headRight) / 2;
    const headY: (note: GraphicalNote) => number = (note: GraphicalNote) => head(note).headY;

    it("lays the fixture out as expected", () => {
        expect(osmd.GraphicSheet.MusicPages[0].MusicSystems.length, "m1-m6 and m7-m8").to.equal(2);
        expect(measureAt(0, 1).crossStaffBeams.length, "m1: one cross-staff beam").to.equal(1);
    });

    it("a slur on one staff over its voice's notes on the other: one curve over the beam and those notes, from stem end to stem end", () => {
        const gSlur: GraphicalSlur = slursStartingIn(0)[0];
        expect(gSlur.crossStaffCurve).to.not.equal(undefined);
        const curve: CrossStaffCurve = curveStartingIn(0);
        expect(curve.placement).to.equal(PlacementEnum.Above);
        expect(curve.unclearedObstacles).to.equal(0);
        // over the right hand's E4 and C4
        for (const note of notesOf(0, 0)) {
            expect(yAt(curve, headX(note)), `over ${note.sourceNote.Pitch.ToString()}`).to.be.lessThan(headY(note) - 0.5);
        }
        // over the beam between the staves, at every stem
        for (const vfNote of (measureAt(0, 1).crossStaffBeams[0] as any).notes as any[]) {
            if (!vfNote.getStem?.()) {
                continue;
            }
            const x: number = vfNote.getStemX() / 10;
            const tip: number = vfNote.getStemExtents().topY / 10;
            if (x <= curve.startPoint.x + 0.5 || x >= curve.endPoint.x - 0.5) {
                continue;
            }
            expect(yAt(curve, x), `over the beam at ${x}`).to.be.lessThan(tip - 0.2);
        }
        // from the end of the E3's up stem to the end of the G3's, on the beam (the source's slur over the beam)
        const lh: GraphicalNote[] = notesOf(0, 1);
        const ends: [CrossStaffCurveNote, PointF2D][] = [[head(noteOf(0, 1, "E3")), curve.startPoint], [head(lh[lh.length - 1]), curve.endPoint]];
        for (const [note, point] of ends) {
            expect(note.stem).to.equal(1);
            expect(Math.abs(point.x - note.stemX)).to.be.lessThan(0.5);
            expect(Math.abs(point.y - note.stemTip)).to.be.lessThan(1.0);
        }
    });

    it("a slur on one staff with all its voice's notes on that staff stays an ordinary slur", () => {
        const gSlur: GraphicalSlur = slursStartingIn(1)[0];
        expect(gSlur.crossStaffCurve).to.equal(undefined);
        expect(gSlur.isCrossStaffPiece).to.equal(false);
        expect(gSlur.placement).to.equal(PlacementEnum.Above);
        expect(measureAt(1, 1).crossStaffCurves.length).to.equal(0);
        expect(measureAt(1, 0).crossStaffCurves.length).to.equal(0);
    });

    it("a slur placed toward its end staff, ending on a note between the staves: between them, over the end staff's notes of its " +
       "voice, to the top of the end note", () => {
        const curve: CrossStaffCurve = curveStartingIn(2);
        expect(curve.placement).to.equal(PlacementEnum.Below);
        // under the right hand
        for (const note of [...notesOf(2, 0), ...notesOf(3, 0)]) {
            expect(yAt(curve, headX(note)), `under ${note.sourceNote.Pitch.ToString()}`).to.be.greaterThan(headY(note) + 0.5);
        }
        // over the left hand's F4, E4, D#4 of its voice
        for (const note of [...notesOf(2, 1, 6), ...notesOf(3, 1, 6)]) {
            expect(yAt(curve, headX(note)), `over ${note.sourceNote.Pitch.ToString()}`).to.be.lessThan(headY(note) - 0.4);
            // and over their up stems, as in the source
            const h: CrossStaffCurveNote = head(note);
            expect(h.stem).to.equal(1);
            expect(yAt(curve, h.stemX), `over the stem of ${note.sourceNote.Pitch.ToString()}`).to.be.lessThan(h.stemTip - 0.1);
        }
        // to the top of the D4 (its stem points up, the curve comes from above: the end of its stem)
        const d4: GraphicalNote = noteOf(4, 1, "D4", 6);
        expect(curve.endPoint.y).to.be.lessThan(headY(d4) - 0.3);
        expect(Math.abs(curve.endPoint.x - headX(d4))).to.be.lessThan(1.5);
    });

    it("such a slur over a system break: the start piece to the end of its system, the end piece on the end staff from the next " +
       "system's start, above it, to the end note", () => {
        const pieces: GraphicalSlur[] = slursStartingIn(5);
        const where: (gSlur: GraphicalSlur) => string = (gSlur: GraphicalSlur) => {
            const staffLine: StaffLine = gSlur.staffEntries[0].parentMeasure.ParentStaffLine;
            const s: number = osmd.GraphicSheet.MusicPages[0].MusicSystems.indexOf(staffLine.ParentMusicSystem);
            const l: number = staffLine.ParentMusicSystem.StaffLines.indexOf(staffLine);
            const measures: number[] = [];
            for (const entry of gSlur.staffEntries) {
                if (measures.indexOf(entry.parentMeasure.MeasureNumber) < 0) {
                    measures.push(entry.parentMeasure.MeasureNumber);
                }
            }
            return `${s}:${l}:${measures.join(",")}`;
        };
        expect(pieces.map(where)).to.deep.equal(["0:0:6", "1:1:7,8,9"]);
        const endPiece: GraphicalSlur = pieces[pieces.length - 1];
        expect(endPiece.isCrossStaffPiece).to.equal(true);
        expect(endPiece.placement).to.equal(PlacementEnum.Above);
        const d4: GraphicalNote = noteOf(8, 1, "D4", 6);
        const line: StaffLine = endPiece.staffEntries[0].parentMeasure.ParentStaffLine;
        const d4X: number = headX(d4) - line.PositionAndShape.AbsolutePosition.x;
        expect(Math.abs(endPiece.bezierEndPt.x - d4X), "to the D4").to.be.lessThan(1.5);
        expect(endPiece.bezierStartPt.x, "from the system start").to.be.lessThan(d4X - 10);
        expect(endPiece.bezierEndPt.y, "to the top of the D4").to.be.lessThan(headY(d4) - line.PositionAndShape.AbsolutePosition.y - 0.3);
    });
});
