import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { VexFlowStaffEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowStaffEntry";
import { VexFlowGraphicalNote } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { ClefEnum } from "../../../src/MusicalScore/VoiceData/Instructions/ClefInstruction";
import Vex from "vexflow";
const VF: any = Vex.Flow;

/**
 * Clef and key changes in the middle of a measure (81sabo rows R1-RENDER-P53-CLEF, RENDER-KEY-46): (a) a clef at a time
 * where another voice already put a note on the staff (Enesco, Concertstück piano m53)
 * goes to that staff entry (it was left pending and the staff kept the old clef); (b) a key change inside a measure
 * (Schubert, Ganymed m46) starts the next systems (right here before, wrong in osmd-dart). (A wedge starting at a note after
 * an in-staff clef or key change — Schumann, Piano Quartet Op. 47 IV m38; Ganymed m46 — is the E batch's
 * fix/sabo-e-wedge-end-20261024, GraphicalStaffEntry.ExpressionBorderLeft.) Same as osmd-dart's in_measure_clef_key_test.dart.
 */
describe("Clef and key changes inside a measure", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    async function render(file: string, newSystemFromXml: boolean = false): Promise<void> {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.EngravingRules.NewSystemAtXMLNewSystemAttribute = newSystemFromXml;
        await osmd.load(TestUtils.getScore(file));
        osmd.render();
    }
    afterEach(() => {
        osmd.clear();
        container.remove();
    });
    function measure(measureIndex: number, staffIndex: number): VexFlowMeasure {
        return osmd.GraphicSheet.MeasureList[measureIndex][staffIndex] as VexFlowMeasure;
    }
    function inStaffClefTimes(gMeasure: VexFlowMeasure): number[] {
        return gMeasure.staffEntries.filter(e => (e as VexFlowStaffEntry).vfClefBefore !== undefined).map(e => e.relInMeasureTimestamp.RealValue);
    }
    function beginKeySpecs(gMeasure: VexFlowMeasure): string[] {
        return gMeasure.getVFStave().getModifiers()
            .filter((modifier: any) => modifier.getCategory() === "keysignatures" && modifier.getPosition() === VF.StaveModifier.Position.BEGIN)
            .map((modifier: any) => modifier.keySpec);
    }
    it("(a) a clef at the time of another voice's note goes to that entry", async () => {
        await render("test_clef_shared_staff_entry.musicxml");
        expect(inStaffClefTimes(measure(0, 1))).to.deep.equal([0.25]);
        expect(inStaffClefTimes(measure(1, 1))).to.deep.equal([0.25]);
        const clefsByTime: Map<number, Set<ClefEnum>> = new Map<number, Set<ClefEnum>>();
        for (const entry of measure(0, 1).staffEntries) {
            for (const gve of entry.graphicalVoiceEntries) {
                for (const note of gve.notes) {
                    const time: number = entry.relInMeasureTimestamp.RealValue;
                    if (!clefsByTime.has(time)) {
                        clefsByTime.set(time, new Set<ClefEnum>());
                    }
                    clefsByTime.get(time).add((note as VexFlowGraphicalNote).Clef().ClefType);
                }
            }
        }
        expect([...clefsByTime.get(0)]).to.deep.equal([ClefEnum.F]);
        expect([...clefsByTime.get(0.25)]).to.deep.equal([ClefEnum.G]);
        expect([...clefsByTime.get(0.5)]).to.deep.equal([ClefEnum.G]);
        expect([...clefsByTime.get(0.75)]).to.deep.equal([ClefEnum.G]);
    });

    it("(b) a key change inside a measure starts the next system", async () => {
        await render("test_key_change_mid_measure_next_system.musicxml", true);
        expect(measure(2, 0).ParentMusicSystem === measure(1, 0).ParentMusicSystem).to.equal(false, "m3 starts a system");
        expect(beginKeySpecs(measure(2, 0))).to.deep.equal(["E"]);
        expect(beginKeySpecs(measure(2, 1))).to.deep.equal(["E"]);
        expect(beginKeySpecs(measure(0, 0))).to.deep.equal(["Ab"]);
    });
});
