import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { RhythmInstruction } from "../../../src/MusicalScore/VoiceData/Instructions/RhythmInstruction";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import Vex from "vexflow";
import VF = Vex.Flow;

/**
 * A time signature is copied to another part only when that part has never written a <time> of its own
 * (Vieuxtemps, Grand Concerto Op. 31 m178-208: the piano in 12/8, the solo violin in common time; individual 32 fix D,
 * user decision 4 of 2026-10-11). Only the drawing: the measures stay as long as before.
 * Same as osmd-dart test/time_per_part_own_test.dart.
 */
describe("Time signatures per part", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    async function render(sample: string): Promise<void> {
        await osmd.load(TestUtils.getScore(sample));
        osmd.render();
    }

    beforeEach(() => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    function timesOf(measure: number): string[] {
        const entries: any[] = osmd.Sheet.SourceMeasures[measure].FirstInstructionsStaffEntries;
        // (an array with holes: a staff without first instructions has none)
        return Array.from({ length: entries.length }, (unused, staff) => {
            const rhythm: RhythmInstruction = entries[staff]?.Instructions
                .find(instruction => instruction instanceof RhythmInstruction) as RhythmInstruction;
            return rhythm ? `${rhythm.Rhythm.Numerator}/${rhythm.Rhythm.Denominator}` : "-";
        });
    }

    function drawnCounts(measure: number): number[] {
        return osmd.GraphicSheet.MeasureList[measure].map(graphical => {
            const stave: VF.Stave = (graphical as VexFlowMeasure).getVFStave();
            return (stave as any).getModifiers(VF.StaveModifier.Position.BEGIN, (VF.TimeSignature as any).CATEGORY).length;
        });
    }

    /** test_time_per_part_own.musicxml: violin (staff 0) 3/4, 6/8 from m2, 2/4 from m4; piano (staves 1-2) 3/4, 6/8 from
     * m3, 3/4 from m4; every bar lasts 3/4. */
    describe("parts that write their own time signatures", () => {
        beforeEach(async () => {
            await render("test_time_per_part_own.musicxml");
        });

        it("keep their own: another part's is not copied to them", () => {
            expect(timesOf(0)).to.deep.equal(["3/4", "3/4", "3/4"]);
            expect(timesOf(1), "violin only").to.deep.equal(["6/8", "-", "-"]);
            expect(timesOf(2), "piano only").to.deep.equal(["-", "6/8", "6/8"]);
            expect(timesOf(3), "the violin's smaller one stays").to.deep.equal(["2/4", "3/4", "3/4"]);
            expect(timesOf(4)).to.deep.equal(["-", "-", "-"]);
        });

        it("draw only their own", () => {
            expect(drawnCounts(1)).to.deep.equal([1, 0, 0]);
            expect(drawnCounts(2)).to.deep.equal([0, 1, 1]);
            expect(drawnCounts(3)).to.deep.equal([1, 1, 1]);
        });

        it("the measures stay as long as before", () => {
            const measures: any[] = osmd.Sheet.SourceMeasures;
            expect(measures.map(m => m.Duration.RealValue)).to.deep.equal([0.75, 0.75, 0.75, 0.75, 0.75]);
            expect(measures.map(m => m.ImplicitMeasure)).to.deep.equal([false, false, false, false, false]);
            expect(measures.map(m => m.MeasureNumber)).to.deep.equal([1, 2, 3, 4, 5]);
            // the largest time signature written in the measure, as before
            expect(measures.map(m => m.ActiveTimeSignature.RealValue)).to.deep.equal([0.75, 0.75, 0.75, 0.75, 0.75]);
        });
    });

    /** test_time_part_without_time.musicxml: flute 3/4, 2/4 from m3; the cello never writes a <time>. */
    it("a part without any <time> of its own takes the others'", async () => {
        await render("test_time_part_without_time.musicxml");
        expect(timesOf(0)).to.deep.equal(["3/4", "3/4"]);
        expect(timesOf(2)).to.deep.equal(["2/4", "2/4"]);
        expect(drawnCounts(2)).to.deep.equal([1, 1]);
        expect(osmd.Sheet.SourceMeasures.map(m => m.Duration.RealValue)).to.deep.equal([0.75, 0.75, 0.5, 0.5]);
    });
});
