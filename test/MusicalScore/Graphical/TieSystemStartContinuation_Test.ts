import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";

/**
 * The part of a tie continued at the start of the next system runs from after the clef and key signature to its note
 * (24 Italian Songs and Arias, Medium High, 23 Pietà, Signore, review MH23-H05 1: at app width 834 the ties into the
 * chord of m110 were a small curl in the narrow gap behind the flat).
 *
 * Vexflow draws that part from the stave's note start x, the right edge of the key signature's box, to the left edge of
 * the note head: 1.2 staff spaces at the start of a system, touching the key signature. Same rule as osmd-dart
 * (fitTieContinuationToSystemStart).
 *
 * Fixture test_tie_system_start_continuation.musicxml (3 flats, a new system at m2, m4, m6): m1-m2 B-flat4 (stem down,
 * tie above), m3-m4 chord E-flat4/G4 (stem up, ties below and above), m5-m6 chord C5/E-flat5 (stem down, ties below
 * and above).
 */
describe("Tie continued at the start of a system", () => {
    interface ContinuationGeometry {
        vexflowStart: number; vexflowEnd: number; drawnStart: number; drawnEnd: number; direction: number; stemDirection: number;
        glyphsEnd: number; headBegin: number; headCentre: number; space: number;
    }

    /** The ties without a first note (continued from the previous system) of measure [measureNumber], as drawn. */
    async function continuationsOf(measureNumber: number): Promise<ContinuationGeometry[]> {
        const container: HTMLElement = TestUtils.getDivElement(document);
        container.style.width = "1024px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg", newSystemFromXML: true });
        try {
            await osmd.load(TestUtils.getScore("test_tie_system_start_continuation.musicxml"));
            osmd.render();
            const measure: VexFlowMeasure = osmd.GraphicSheet.MeasureList[measureNumber - 1][0] as VexFlowMeasure;
            expect(measure.MeasureNumber).to.equal(measureNumber);
            expect(measure.ParentStaffLine.Measures[0], "precondition: the first measure of its system").to.equal(measure);
            const stave: any = measure.getVFStave();
            // the right edge of the clef's and the key signature's boxes
            const glyphsEnd: number = Math.max(...stave.getModifiers().filter((m: any) => m.getCategory() !== "barlines" && m.getPosition() === 5)
                .map((m: any) => m.getX() + m.getWidth()));
            return (measure.vfTies as any[]).filter((t: any) => !t.first_note).map((tie: any): ContinuationGeometry => {
                const last: any = tie.last_note;
                const vexflowStart: number = stave.getTieStartX();
                const vexflowEnd: number = last.getTieLeftX();
                return {
                    vexflowStart, vexflowEnd,
                    drawnStart: vexflowStart + tie.render_options.first_x_shift,
                    drawnEnd: vexflowEnd + tie.render_options.last_x_shift,
                    direction: tie.direction ? tie.direction : last.getStemDirection(),
                    stemDirection: last.getStemDirection(),
                    glyphsEnd,
                    headBegin: last.getNoteHeadBeginX(),
                    headCentre: (last.getNoteHeadBeginX() + last.getNoteHeadEndX()) / 2,
                    space: stave.getSpacingBetweenLines(),
                };
            });
        } finally {
            osmd.clear();
            container.remove();
        }
    }

    /** Vexflow's part: from the key signature's box to the note head, short. */
    function expectVexflowPartShort(tie: ContinuationGeometry): void {
        expect(tie.vexflowStart, "precondition: Vexflow starts at the key signature").to.be.closeTo(tie.glyphsEnd, 1e-6);
        expect(tie.vexflowEnd - tie.vexflowStart, "precondition: Vexflow's part is short").to.be.lessThan(1.5 * tie.space);
    }

    it("(a) a single note: from 0.3 spaces after the key signature's accidentals to the middle of the note head", async () => {
        const ties: ContinuationGeometry[] = await continuationsOf(2);
        expect(ties.length).to.equal(1);
        const tie: ContinuationGeometry = ties[0];
        expectVexflowPartShort(tie);
        // Vexflow leaves 1 px (0.1 spaces) after each accidental of a key signature
        expect(tie.drawnStart).to.be.closeTo(tie.glyphsEnd + 0.2 * tie.space, 1e-6);
        expect(tie.drawnEnd).to.be.closeTo(tie.headCentre, 1e-6);
        expect(tie.drawnEnd - tie.drawnStart, "at least 1.5 spaces").to.be.at.least(1.5 * tie.space);
    });

    it("(b) a chord: each tie, above and below the stem-up chord, runs to the middle of its note head", async () => {
        const ties: ContinuationGeometry[] = await continuationsOf(4);
        expect(ties.map(t => t.direction).sort()).to.deep.equal([-1, 1]);
        for (const tie of ties) {
            expectVexflowPartShort(tie);
            expect(tie.drawnStart).to.be.closeTo(tie.glyphsEnd + 0.2 * tie.space, 1e-6);
            expect(tie.drawnEnd).to.be.closeTo(tie.headCentre, 1e-6);
            expect(tie.drawnEnd - tie.drawnStart).to.be.at.least(1.5 * tie.space);
        }
    });

    it("(c) a stem-down chord: the tie below ends before the stem, with room for 1.5 spaces, and so does the tie above", async () => {
        const ties: ContinuationGeometry[] = await continuationsOf(6);
        const below: ContinuationGeometry = ties.find(t => t.direction === 1);
        const above: ContinuationGeometry = ties.find(t => t.direction === -1);
        expect(below.stemDirection).to.equal(-1);
        expect(below.drawnStart).to.be.closeTo(below.glyphsEnd + 0.2 * below.space, 1e-6);
        expect(below.drawnEnd, "the stem is on the tie's side").to.be.closeTo(below.headBegin, 1e-6);
        // the measure makes room before its notes for that (TieSystemStartRoom_Test): 1.5 spaces, and as long
        //   the tie above, which keeps Vexflow's end then
        expect(below.drawnEnd - below.drawnStart).to.be.closeTo(1.5 * below.space, 1e-6);
        expect(above.drawnStart).to.be.closeTo(above.glyphsEnd + 0.2 * above.space, 1e-6);
        expect(above.drawnEnd).to.be.closeTo(above.vexflowEnd, 1e-6);
        expect(above.drawnEnd - above.drawnStart).to.be.closeTo(1.5 * above.space, 1e-6);
    });

    it("(d) the part at the end of the previous system keeps Vexflow's ends", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        container.style.width = "1024px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg", newSystemFromXML: true });
        try {
            await osmd.load(TestUtils.getScore("test_tie_system_start_continuation.musicxml"));
            osmd.render();
            for (const measureNumber of [1, 3, 5]) {
                const measure: VexFlowMeasure = osmd.GraphicSheet.MeasureList[measureNumber - 1][0] as VexFlowMeasure;
                const parts: any[] = (measure.vfTies as any[]).filter((t: any) => t.first_note && !t.last_note);
                expect(parts.length, `m${measureNumber}`).to.be.greaterThan(0);
                for (const tie of parts) {
                    expect(tie.render_options.first_x_shift).to.equal(0);
                    expect(tie.render_options.last_x_shift).to.equal(0);
                }
            }
        } finally {
            osmd.clear();
            container.remove();
        }
    });
});
