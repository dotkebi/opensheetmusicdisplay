import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";

/**
 * Room before the first notes of a system for the part of a tie continued into them (24 Italian Songs and Arias,
 * Medium High, review MH23-H05 1, follow-up of TieSystemStartContinuation_Test).
 *
 * The part starts 0.3 staff spaces after the key signature and runs to the middle of its note head, but where the note's
 * stem is on the tie's side (a stem-down note under a tie below) or the chord has a displaced (second-interval) head it
 * ends at the head's edge: in the gap Vexflow leaves at the start of a system that was 1 staff space, a small curl behind
 * the key signature. The first measure of the system makes room for 1.5 staff spaces, on all its staves; a part that
 * is 1.5 spaces long then keeps Vexflow's end. A measure that no tie continues into stays as it was. Same rule as osmd-dart (reserveSystemStartTieRoom).
 *
 * Fixture test_tie_system_start_room.musicxml (piano, 3 flats, a new system at m2, m4, m6; the left hand without ties):
 * m1-m2 chord C5/E-flat5 (stem down, ties below and above), m3-m4 chord F4/G4 (stem up, a second: the G4 is displaced,
 * ties below and above), m6 no tie.
 */
describe("Room for a tie continued at the start of a system", () => {
    interface Part {
        drawnStart: number; drawnEnd: number; vexflowEnd: number; direction: number; stemDirection: number;
        headBegin: number; headCentre: number; space: number;
    }
    interface SystemStart {
        measures: VexFlowMeasure[];
        parts: Part[];
    }

    /** The measures of both staves of measure [measureNumber], the first of its system, and the parts of ties continued into them. */
    async function systemStart(measureNumber: number): Promise<SystemStart> {
        const container: HTMLElement = TestUtils.getDivElement(document);
        container.style.width = "1024px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg", newSystemFromXML: true });
        try {
            await osmd.load(TestUtils.getScore("test_tie_system_start_room.musicxml"));
            osmd.render();
            const measures: VexFlowMeasure[] = osmd.GraphicSheet.MeasureList[measureNumber - 1] as VexFlowMeasure[];
            expect(measures.length).to.equal(2);
            for (const measure of measures) {
                expect(measure.MeasureNumber).to.equal(measureNumber);
                expect(measure.ParentStaffLine.Measures[0], "precondition: the first measure of its system").to.equal(measure);
            }
            const parts: Part[] = [];
            for (const measure of measures) {
                for (const tie of (measure.vfTies as any[]).filter((t: any) => !t.first_note)) {
                    const last: any = tie.last_note;
                    const vexflowStart: number = measure.getVFStave().getTieStartX();
                    const vexflowEnd: number = last.getTieLeftX();
                    parts.push({
                        drawnStart: vexflowStart + tie.render_options.first_x_shift,
                        drawnEnd: vexflowEnd + tie.render_options.last_x_shift,
                        vexflowEnd,
                        direction: tie.direction ? tie.direction : last.getStemDirection(),
                        stemDirection: last.getStemDirection(),
                        headBegin: last.getNoteHeadBeginX(),
                        headCentre: (last.getNoteHeadBeginX() + last.getNoteHeadEndX()) / 2,
                        space: measure.getVFStave().getSpacingBetweenLines(),
                    });
                }
            }
            return { measures, parts };
        } finally {
            osmd.clear();
            container.remove();
        }
    }

    /** The right edge of the last box of the begin modifiers (clef, key signature) of the measure's stave. */
    function modifiersEnd(measure: VexFlowMeasure): number {
        const stave: any = measure.getVFStave();
        return Math.max(...stave.getModifiers().filter((m: any) => m.getPosition() === 5).map((m: any) => m.getX() + m.getWidth()));
    }

    /** The notes of both staves start at the same x, with the same room, further right than the begin modifiers. */
    function expectRoomOnBothStaves(start: SystemStart): void {
        const [upper, lower] = start.measures;
        expect(upper.firstNoteRoom).to.be.greaterThan(0);
        expect(lower.firstNoteRoom).to.equal(upper.firstNoteRoom);
        expect(lower.getVFStave().getNoteStartX()).to.be.closeTo(upper.getVFStave().getNoteStartX(), 1e-6);
        for (const measure of start.measures) {
            expect(measure.getVFStave().getNoteStartX() - modifiersEnd(measure)).to.be.closeTo(measure.firstNoteRoom * 10, 1e-6);
        }
    }

    it("(a) a stem-down chord: the tie below, at the stem, gets 1.5 spaces, the left hand moves along", async () => {
        const start: SystemStart = await systemStart(2);
        expect(start.parts.length).to.equal(2);
        const below: Part = start.parts.find(p => p.direction === 1);
        const above: Part = start.parts.find(p => p.direction === -1);
        expect(below.stemDirection).to.equal(-1);
        expect(below.drawnEnd, "the stem is on the tie's side").to.be.closeTo(below.headBegin, 1e-6);
        expect(below.drawnEnd - below.drawnStart, "1.5 spaces").to.be.closeTo(1.5 * below.space, 1e-6);
        // the room makes the tie above 1.5 spaces long too: it keeps Vexflow's end, as a part that long does
        expect(above.drawnEnd).to.be.closeTo(above.vexflowEnd, 1e-6);
        expect(above.drawnEnd - above.drawnStart).to.be.closeTo(1.5 * above.space, 1e-6);
        expectRoomOnBothStaves(start);
    });

    it("(b) a chord with a displaced head: both ties end at Vexflow's end and get 1.5 spaces", async () => {
        const start: SystemStart = await systemStart(4);
        expect(start.parts.map(p => p.direction).sort()).to.deep.equal([-1, 1]);
        for (const part of start.parts) {
            expect(part.stemDirection).to.equal(1);
            expect(part.drawnEnd).to.be.closeTo(part.vexflowEnd, 1e-6);
            expect(part.drawnEnd - part.drawnStart).to.be.closeTo(1.5 * part.space, 1e-6);
        }
        expectRoomOnBothStaves(start);
    });

    it("(c) without a tie into the system the notes start where Vexflow starts them", async () => {
        const start: SystemStart = await systemStart(6);
        expect(start.parts.length).to.equal(0);
        for (const measure of start.measures) {
            expect(measure.firstNoteRoom).to.equal(0);
            expect(measure.getVFStave().getNoteStartX()).to.be.closeTo(modifiersEnd(measure), 1e-6);
            expect(measure.PositionAndShape.Size.width).to.be.closeTo(measure.beginInstructionsWidth +
                measure.minimumStaffEntriesWidth * measure.staffEntriesScaleFactor + measure.endInstructionsWidth, 1e-6);
        }
    });
});
