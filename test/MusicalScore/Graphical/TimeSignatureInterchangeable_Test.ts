import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { RhythmInstruction } from "../../../src/MusicalScore/VoiceData/Instructions/RhythmInstruction";
import { MusicSheet } from "../../../src/MusicalScore/MusicSheet";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import Vex from "vexflow";
import VF = Vex.Flow;

/**
 * test_time_per_staff_interchangeable.musicxml (after Wagner, Siegmunds Liebeslied m1, integrated review R166-V01
 * follow-up): violin (staff 0) and piano right hand (staff 1) 9/8 with 3/4 printed next to it (<interchangeable>),
 * piano left hand (staff 2) 3/4 by <time number="2">; each bar lasts 3/4; m3 is 3/4 on every staff.
 * Each staff draws its own time signature, the measure is as long as the lowest staff number's.
 * Same as osmd-dart test/time_per_staff_interchangeable_test.dart.
 */
describe("Time signatures per staff and interchangeable time signatures", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_time_per_staff_interchangeable.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    function timeOf(sheet: MusicSheet, measure: number, staff: number): string {
        const rhythm: RhythmInstruction = sheet.SourceMeasures[measure].FirstInstructionsStaffEntries[staff]?.Instructions
            .find(instruction => instruction instanceof RhythmInstruction) as RhythmInstruction;
        if (!rhythm) {
            return "-";
        }
        const interchangeable: string = rhythm.Interchangeable ?
            `+${rhythm.Interchangeable.Numerator}/${rhythm.Interchangeable.Denominator}` : "";
        return `${rhythm.Rhythm.Numerator}/${rhythm.Rhythm.Denominator}${interchangeable}`;
    }

    function timesOf(measure: number): string[] {
        return [0, 1, 2].map(staff => timeOf(osmd.Sheet, measure, staff));
    }

    function drawnTimes(measure: number, staff: number): VF.TimeSignature[] {
        const stave: VF.Stave = (osmd.GraphicSheet.MeasureList[measure][staff] as VexFlowMeasure).getVFStave();
        return (stave as any).getModifiers(VF.StaveModifier.Position.BEGIN, (VF.TimeSignature as any).CATEGORY);
    }

    it("each staff keeps its own time signature and the interchangeable one", () => {
        expect(timesOf(0)).to.deep.equal(["9/8+3/4", "9/8+3/4", "3/4"]);
        expect(timesOf(1)).to.deep.equal(["-", "-", "-"]);
        expect(timesOf(2)).to.deep.equal(["3/4", "3/4", "3/4"]);
    });

    it("a first bar as long as the other time signature is no pickup", () => {
        expect(osmd.Sheet.SourceMeasures[0].ImplicitMeasure).to.equal(false);
        expect(osmd.Sheet.SourceMeasures.map(measure => measure.MeasureNumber)).to.deep.equal([1, 2, 3, 4]);
    });

    it("draws the interchangeable time signature right of the main one", () => {
        expect(drawnTimes(0, 0).length).to.equal(2);
        expect(drawnTimes(0, 1).length).to.equal(2);
        expect(drawnTimes(0, 2).length).to.equal(1);
        expect(drawnTimes(2, 2).length).to.equal(1);
        const times: VF.TimeSignature[] = drawnTimes(0, 1);
        const main: any = times[0];
        const interchangeable: any = times[1];
        expect(interchangeable.getX(), "right of the main one").to.be.greaterThan(main.getX() + main.getWidth() - 1);
        // aligned with the left hand's time signature, in its place after the clef (VexFlowPatch
        // Stave.formatBegModifiers moved every time signature to the x of the interchangeable one)
        expect(main.getX()).to.equal((drawnTimes(0, 2)[0] as any).getX());
        const stave: any = (osmd.GraphicSheet.MeasureList[0][1] as VexFlowMeasure).getVFStave();
        const clef: any = stave.getModifiers(VF.StaveModifier.Position.BEGIN, (VF.Clef as any).CATEGORY)[0];
        expect(main.getX() - (clef.getX() + clef.getWidth()), "after the clef").to.be.lessThan(
            interchangeable.getX() - main.getX());
    });
});
