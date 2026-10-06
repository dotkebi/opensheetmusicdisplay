import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { Note } from "../../../src/MusicalScore/VoiceData/Note";
import { CrossStaffCurve } from "../../../src/MusicalScore/Graphical/VexFlow/CrossStaffCurve";

/**
 * Ties between the two staves of a piano part (Schumann, Myrthen).
 *
 * B1 (layout): a tie from one staff to the other in the same system is one curve between the placed staves, drawn by
 * the drawer (CrossStaffCurve, PLAN-cross-staff-beam (4), 10-08), not a VexFlow StaveTie (it can't arch between two
 * staves' notes: the 10-06 rule ran nearly straight across both staves and the beams, 10-07 recheck R-10-1) nor two
 * stubs (the 10-07 rule). At a system break it stays two stubs.
 * B2 (reader): a tie whose stop is in another voice on the other staff found no open tie, since each staff keeps
 * its own open-tie dictionary (Aus den hebräischen Gesängen m79-80: RH C4 half -> LH C4 whole). The stop now looks
 * in the other staves of the instrument.
 *
 * Fixture (synthetic, piano, 4/4), test_tie_across_staves.musicxml: m1->m2 same voice staff 1->2 (B3);
 * m3->m4 voice 2 staff 1 -> voice 5 staff 2 (C4); m5->m6 staff 1->2 across a forced system break (E4);
 * m8->m9->m10 two voices of staff 1 tie the same B3 across the barlines (voice 2 m8->m9, voice 1 m9->m10):
 * voices are read one after the other, so voice 1's start late in m9 is read before voice 2's stop at m9's start;
 * the open-tie bookkeeping must keep both ties apart (the Dart port is aligned to this behaviour).
 */
describe("Tie across staves", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    interface Ties { full: any[], stubs: any[] }

    before(async () => {
        container = TestUtils.getDivElement(document);
        container.style.width = "1400px";
        osmd = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg", newSystemFromXML: true });
        await osmd.load(TestUtils.getScore("test_tie_across_staves.musicxml"));
        osmd.render();
    });
    after(() => {
        osmd.clear();
        container.remove();
    });

    /** The VexFlow ties held by the measure (both staves): full (two notes) and one-sided stubs. */
    function tiesIn(measureIndex: number): Ties {
        const result: Ties = { full: [], stubs: [] };
        for (let staff: number = 0; staff < 2; staff++) {
            const measure: VexFlowMeasure = osmd.GraphicSheet.MeasureList[measureIndex][staff] as VexFlowMeasure;
            for (const tie of measure.vfTies as any[]) {
                if (tie.first_note && tie.last_note) {
                    result.full.push(tie);
                } else {
                    result.stubs.push(tie);
                }
            }
        }
        return result;
    }

    function note(measureIndex: number, staff: number, voiceId: number): Note {
        for (const staffEntry of osmd.GraphicSheet.MeasureList[measureIndex][staff].staffEntries) {
            for (const gve of staffEntry.graphicalVoiceEntries) {
                if (gve.parentVoiceEntry.ParentVoice.VoiceId === voiceId) {
                    const found: Note = gve.parentVoiceEntry.Notes.find((n) => !n.isRest());
                    if (found) {
                        return found;
                    }
                }
            }
        }
        throw new Error(`no note of voice ${voiceId} in m${measureIndex + 1} staff ${staff}`);
    }

    /** the curves between staves held by the measures (both staves) at the index */
    function curvesIn(measureIndex: number): CrossStaffCurve[] {
        const curves: CrossStaffCurve[] = [];
        for (let staff: number = 0; staff < 2; staff++) {
            for (const curve of (osmd.GraphicSheet.MeasureList[measureIndex][staff] as VexFlowMeasure).crossStaffCurves) {
                if (curves.indexOf(curve) < 0) {
                    curves.push(curve);
                }
            }
        }
        return curves;
    }

    it("(a) same voice, staff 1 -> staff 2 in one system: one curve", () => {
        const startLine: any = osmd.GraphicSheet.MeasureList[0][0].ParentStaffLine;
        const endLine: any = osmd.GraphicSheet.MeasureList[1][1].ParentStaffLine;
        expect(startLine.ParentMusicSystem, "m1 and m2 in one system").to.equal(endLine.ParentMusicSystem);
        expect(tiesIn(0).full.length + tiesIn(0).stubs.length, "no stub from B3").to.equal(0);
        expect(tiesIn(1).full.length + tiesIn(1).stubs.length, "no stub into B3").to.equal(0);
        const curves: CrossStaffCurve[] = curvesIn(1).filter(c => c.isTie);
        expect(curves.length).to.equal(1);
        expect(curves[0].startNote.sourceNote).to.equal(note(0, 0, 1));
        expect(curves[0].endNote.sourceNote).to.equal(note(1, 1, 1));
        expect(curvesIn(0)).to.include(curves[0]);
        expect(curves[0].segments.length).to.equal(1);
        expect(curves[0].endPoint.y).to.be.greaterThan(endLine.PositionAndShape.AbsolutePosition.y - 2);
        expect(curves[0].endPoint.x).to.be.greaterThan(curves[0].startPoint.x);
    });

    it("(b) different voices on different staves: the reader connects the tie", () => {
        const start: Note = note(2, 0, 2);
        const stop: Note = note(3, 1, 5);
        expect(start.NoteTie, "tie of the RH C4").to.not.equal(undefined);
        expect(start.NoteTie.Notes).to.deep.equal([start, stop]);
        expect(stop.NoteTie).to.equal(start.NoteTie);
        expect(tiesIn(3).full.length).to.equal(0);
        expect(tiesIn(3).stubs.length).to.equal(0);
        expect(tiesIn(2).stubs.length).to.equal(0);
        const curves: CrossStaffCurve[] = curvesIn(3).filter(c => c.isTie);
        expect(curves.length).to.equal(1);
        expect(curves[0].startNote.sourceNote).to.equal(start);
        expect(curves[0].endNote.sourceNote).to.equal(stop);
    });

    it("(c) staff 1 -> staff 2 across a system break: two stubs as before", () => {
        expect(osmd.GraphicSheet.MusicPages[0].MusicSystems.length, "<print new-system> before m6").to.be.greaterThanOrEqual(2);
        const outgoing: Ties = tiesIn(4);
        const incoming: Ties = tiesIn(5);
        expect(outgoing.full.length).to.equal(0);
        expect(outgoing.stubs.length, "stub from E4 to the system end").to.equal(1);
        expect(incoming.full.length).to.equal(0);
        expect(incoming.stubs.length, "stub into the E4 of staff 2").to.equal(1);
    });

    it("(e) two voices tying the same pitch across barlines keep their own ties", () => {
        const v2Start: Note = note(7, 0, 2);
        const v2Stop: Note = note(8, 0, 2);
        const v1Start: Note = note(8, 0, 1);
        const v1Stop: Note = note(9, 0, 1);
        expect(v2Start.NoteTie?.Notes).to.deep.equal([v2Start, v2Stop]);
        expect(v1Start.NoteTie?.Notes).to.deep.equal([v1Start, v1Stop]);
        expect(tiesIn(8).full.length).to.equal(1);
        expect(tiesIn(9).full.length).to.equal(1);
    });

    it("open ties are not left behind in any staff", () => {
        for (const instrument of osmd.Sheet.Instruments) {
            for (const staff of instrument.Staves) {
                expect(Object.keys(staff.openTieDict).length, `staff ${staff.Id}`).to.equal(0);
            }
        }
    });
});
