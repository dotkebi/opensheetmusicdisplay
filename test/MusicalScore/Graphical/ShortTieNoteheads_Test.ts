import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";

/**
 * Ties between close notes run over the note heads (Couperin, Concerts Royaux, 1722 edition, review N-R6 and R01).
 *
 * In a tightly spaced system Vexflow's tie, from the right side of its first note to the left side of its last, shrinks
 * to a dot or a caret: in the app layout I/3 m21 (F#4 eighth -> F#4 quarter, the notes touch) and II/2 m15 (B5 eighth ->
 * B5 eighth) read as a dot or a staccato, and III/4 m23 (voice 2 A4 -> voice 3 chord F#4/A4) ran behind the chord's
 * sharp. The web layout is wider there, but III/4 m21 showed the same caret. Same rule as osmd-dart (fitShortTieToNoteheads).
 *
 * Fixture test_short_tie_noteheads.musicxml: m1 = I/3 m21, m2 = II/2 m15, m3 = III/4 m23 (both staves, 81sabo 6a26018).
 * The container widths give the layouts where the gaps are short (asserted first).
 */
describe("Short tie over note heads", () => {
    interface TieGeometry {
        firstX: number; lastX: number; drawnStart: number; drawnEnd: number; direction: number;
        headWidth: number; firstHeadCentre: number; lastHeadCentre: number; lastHeadBegin: number; accidentalSpace: number;
    }

    /** The full tie of measure [measureIndex] (staff 1) as drawn at container [width]. */
    async function tieOf(width: number, measureIndex: number): Promise<TieGeometry> {
        const container: HTMLElement = TestUtils.getDivElement(document);
        container.style.width = `${width}px`;
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
        try {
            await osmd.load(TestUtils.getScore("test_short_tie_noteheads.musicxml"));
            osmd.render();
            const measure: VexFlowMeasure = osmd.GraphicSheet.MeasureList[measureIndex][0] as VexFlowMeasure;
            const tie: any = (measure.vfTies as any[]).find((t: any) => t.first_note && t.last_note);
            expect(tie, "a full tie").to.not.equal(undefined);
            const first: any = tie.first_note;
            const last: any = tie.last_note;
            const firstX: number = first.getTieRightX();
            const lastX: number = last.getTieLeftX();
            return {
                firstX, lastX,
                drawnStart: firstX + tie.render_options.first_x_shift,
                drawnEnd: lastX + tie.render_options.last_x_shift,
                direction: tie.direction ? tie.direction : last.getStemDirection(),
                headWidth: first.getGlyphWidth(),
                firstHeadCentre: (first.getNoteHeadBeginX() + first.getNoteHeadEndX()) / 2,
                lastHeadCentre: (last.getNoteHeadBeginX() + last.getNoteHeadEndX()) / 2,
                lastHeadBegin: last.getNoteHeadBeginX(),
                accidentalSpace: (VexFlowMeasure as any).accidentalSpace(last),
            };
        } finally {
            osmd.clear();
            container.remove();
        }
    }

    it("(a) I/3 m21: notes that touch, the tie runs from head middle to head middle", async () => {
        const tie: TieGeometry = await tieOf(500, 0);
        expect(tie.lastX - tie.firstX, "precondition: short gap").to.be.lessThan(10);
        expect(tie.drawnStart).to.be.closeTo(tie.firstHeadCentre, 1e-6);
        expect(tie.drawnEnd).to.be.closeTo(tie.lastHeadCentre, 1e-6);
        expect(tie.drawnEnd - tie.drawnStart, "longer than a note head, not a dot").to.be.greaterThan(tie.headWidth);
    });

    it("(b) II/2 m15: a short gap after a note with a pince", async () => {
        const tie: TieGeometry = await tieOf(450, 1);
        expect(tie.lastX - tie.firstX, "precondition: short gap").to.be.lessThan(10);
        expect(tie.drawnStart).to.be.closeTo(tie.firstHeadCentre, 1e-6);
        expect(tie.drawnEnd).to.be.closeTo(tie.lastHeadCentre, 1e-6);
        expect(tie.drawnEnd - tie.drawnStart).to.be.greaterThan(tie.headWidth);
    });

    it("(c) III/4 m23: the chord's sharp in the gap counts; the end stays left of the down stem", async () => {
        const tie: TieGeometry = await tieOf(350, 2);
        expect(tie.lastX - tie.firstX, "precondition: only the sharp makes it short").to.be.at.least(10);
        expect(tie.lastX - tie.accidentalSpace - tie.firstX).to.be.lessThan(10);
        expect(tie.direction, "below").to.equal(1);
        expect(tie.drawnStart).to.be.closeTo(tie.firstHeadCentre, 1e-6);
        expect(tie.drawnEnd, "a tie below ends before its last note's down stem").to.be.closeTo(tie.lastHeadBegin, 1e-6);
    });

    it("(d) ties with room keep Vexflow's ends", async () => {
        for (const measureIndex of [0, 1, 2]) {
            const tie: TieGeometry = await tieOf(1000, measureIndex);
            expect(tie.lastX - tie.accidentalSpace - tie.firstX, `m${measureIndex + 1}`).to.be.at.least(10);
            expect(tie.drawnStart).to.equal(tie.firstX);
            expect(tie.drawnEnd).to.equal(tie.lastX);
        }
    });
});
