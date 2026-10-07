import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { RhythmInstruction } from "../../../src/MusicalScore/VoiceData/Instructions/RhythmInstruction";
import Vex from "vexflow";
const VF: any = Vex.Flow;

/**
 * `<time print-object="no">` (Gluck, O del mio dolce ardor m12–13, solo vocal review E10-F03): m12 starts a new
 * system with a hidden `<senza-misura/>`, m13 has a hidden 4/4. The web drew 4/4 at m12: a senza-misura was read
 * as a visible 4/4, and RhythmInstruction.clone() (the copy onto missing staves) dropped PrintObject.
 */
describe("Hidden time signature (print-object=\"no\", senza-misura)", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.EngravingRules.NewSystemAtXMLNewSystemAttribute = true;
        await osmd.load(TestUtils.getScore("test_time_print_object_hidden.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    function timeSignatures(measureIndex: number, staffIndex: number, position: number): number {
        const gMeasure: VexFlowMeasure = osmd.GraphicSheet.MeasureList[measureIndex][staffIndex] as VexFlowMeasure;
        return gMeasure.getVFStave().getModifiers()
            .filter((modifier: any) => modifier.getCategory() === "timesignatures" && modifier.getPosition() === position)
            .length;
    }

    it("draws a hidden time signature nowhere and a visible one at its measure", () => {
        // measure index 0..4 = m1..m5, staff 0 = voice, 1·2 = piano
        for (let staff: number = 0; staff < 3; staff++) {
            expect(timeSignatures(0, staff, VF.StaveModifier.Position.BEGIN), `m1 staff ${staff}`).to.equal(1);
            expect(timeSignatures(1, staff, VF.StaveModifier.Position.BEGIN), `m2 hidden senza-misura, staff ${staff}`).to.equal(0);
            expect(timeSignatures(2, staff, VF.StaveModifier.Position.BEGIN), `m3 hidden 4/4, staff ${staff}`).to.equal(0);
            expect(timeSignatures(3, staff, VF.StaveModifier.Position.BEGIN), `m4 visible 3/4, staff ${staff}`).to.equal(1);
            expect(timeSignatures(4, staff, VF.StaveModifier.Position.BEGIN), `m5 senza-misura, staff ${staff}`).to.equal(0);
            // no courtesy time signature at the end of a measure
            for (let m: number = 0; m < 5; m++) {
                expect(timeSignatures(m, staff, VF.StaveModifier.Position.END)).to.equal(0);
            }
        }
    });

    it("keeps the beats: a senza-misura measure is 4/4", () => {
        const m2Rhythm: RhythmInstruction = osmd.Sheet.SourceMeasures[1].FirstInstructionsStaffEntries[0].Instructions
            .find((instruction) => instruction instanceof RhythmInstruction) as RhythmInstruction;
        expect(m2Rhythm.PrintObject).to.equal(false);
        expect(`${m2Rhythm.Rhythm.Numerator}/${m2Rhythm.Rhythm.Denominator}`).to.equal("4/4");
        expect(osmd.Sheet.SourceMeasures[1].ActiveTimeSignature.RealValue).to.equal(1);
        // every staff has the hidden copy
        for (let staff: number = 0; staff < 3; staff++) {
            const rhythms: RhythmInstruction[] = osmd.Sheet.SourceMeasures[2].FirstInstructionsStaffEntries[staff].Instructions
                .filter((instruction) => instruction instanceof RhythmInstruction) as RhythmInstruction[];
            expect(rhythms.map((rhythm) => rhythm.PrintObject), `m3 staff ${staff}`).to.deep.equal([false]);
        }
    });
});
