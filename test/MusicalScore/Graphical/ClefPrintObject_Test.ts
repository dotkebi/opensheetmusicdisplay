import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { VexFlowGraphicalNote } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { VexFlowStaffEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowStaffEntry";
import { ClefEnum, ClefInstruction } from "../../../src/MusicalScore/VoiceData/Instructions/ClefInstruction";
import Vex from "vexflow";
const VF: any = Vex.Flow;

/**
 * `<clef print-object="no">` (Schumann, Myrthen Op. 25 No. 18 m31–33): the left hand changes to the G clef in m31;
 * a courtesy F clef at the end of m32 is printed for the repeat back to the beginning, and the hidden G at the start
 * of m33 only positions the notes. The reader used to ignore print-object, and the hidden G replaced the courtesy F
 * (a G was drawn at the end of m32 instead of the F).
 */
describe("Hidden clef (print-object=\"no\")", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    async function render(file: string): Promise<void> {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.EngravingRules.NewSystemAtXMLNewSystemAttribute = true;
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
    function clefTypes(gMeasure: VexFlowMeasure, position: number): string[] {
        return gMeasure.getVFStave().getModifiers()
            .filter((modifier: any) => modifier.getCategory() === "clefs" && modifier.getPosition() === position)
            .map((modifier: any) => modifier.type);
    }
    function noteClefTypes(gMeasure: VexFlowMeasure): ClefEnum[] {
        const types: ClefEnum[] = [];
        for (const staffEntry of gMeasure.staffEntries) {
            for (const voiceEntry of staffEntry.graphicalVoiceEntries) {
                for (const note of voiceEntry.notes) {
                    types.push((note as VexFlowGraphicalNote).Clef().ClefType);
                }
            }
        }
        return types;
    }
    function inStaffClefs(gMeasure: VexFlowMeasure): number {
        return gMeasure.staffEntries.filter((staffEntry) => (staffEntry as VexFlowStaffEntry).vfClefBefore !== undefined).length;
    }

    it("(a) keeps the courtesy clef before a hidden clef and draws the hidden clef nowhere", async () => {
        await render("test_clef_print_object_hidden.musicxml");
        const m2Lower: VexFlowMeasure = measure(1, 1);
        const m2Upper: VexFlowMeasure = measure(1, 0);
        const m3Lower: VexFlowMeasure = measure(2, 1);
        // the F stays at the end of m2 — one end clef, the bass clef; the other staff gets its alignment copy only
        expect(clefTypes(m2Lower, VF.StaveModifier.Position.END)).to.deep.equal(["bass"]);
        expect(clefTypes(m2Upper, VF.StaveModifier.Position.END)).to.deep.equal(["bass"]);
        expect(m2Lower.endInstructionsWidth).to.be.greaterThan(0.5);
        // m3 starts without a clef, in the staff nothing is drawn, but its notes sit on the G clef
        expect(clefTypes(m3Lower, VF.StaveModifier.Position.BEGIN)).to.deep.equal([]);
        expect(inStaffClefs(m3Lower)).to.equal(0);
        expect(m3Lower.InitiallyActiveClef.ClefType).to.equal(ClefEnum.G);
        expect(noteClefTypes(m3Lower)).to.satisfy((types: ClefEnum[]) => types.length > 0 && types.every(t => t === ClefEnum.G));
        // the model: the courtesy F first, the hidden G after it, same slot
        const clefs: ClefInstruction[] = osmd.Sheet.SourceMeasures[1].LastInstructionsStaffEntries[1].Instructions
            .filter((instruction) => instruction instanceof ClefInstruction) as ClefInstruction[];
        expect(clefs.map((clef) => `${ClefEnum[clef.ClefType]}/${clef.PrintObject}`)).to.deep.equal(["F/true", "G/false"]);
    });

    it("(c) draws the hidden clef as the active clef at the start of a new system", async () => {
        await render("test_clef_print_object_hidden.musicxml");
        const m3Lower: VexFlowMeasure = measure(2, 1);
        const m4Lower: VexFlowMeasure = measure(3, 1);
        expect(m4Lower.ParentMusicSystem, "m4 starts a new system").to.not.equal(m3Lower.ParentMusicSystem);
        expect(clefTypes(m4Lower, VF.StaveModifier.Position.BEGIN)).to.deep.equal(["treble"]);
        expect(noteClefTypes(m4Lower)).to.satisfy((types: ClefEnum[]) => types.length > 0 && types.every(t => t === ClefEnum.G));
    });

    it("(b) a hidden clef alone draws nothing and reserves no width", async () => {
        await render("test_clef_print_object_hidden_only.musicxml");
        const m1Lower: VexFlowMeasure = measure(0, 1);
        const m2Lower: VexFlowMeasure = measure(1, 1);
        const m2Upper: VexFlowMeasure = measure(1, 0);
        const m3Lower: VexFlowMeasure = measure(2, 1);
        expect(clefTypes(m2Lower, VF.StaveModifier.Position.END)).to.deep.equal([]);
        expect(clefTypes(m2Upper, VF.StaveModifier.Position.END)).to.deep.equal([]);
        // no more end-instruction width than a measure without any end instruction (the builder's base 0.5)
        expect(m2Lower.endInstructionsWidth).to.equal(m1Lower.endInstructionsWidth);
        expect(m2Lower.endInstructionsWidth).to.be.at.most(0.5);
        expect(clefTypes(m3Lower, VF.StaveModifier.Position.BEGIN)).to.deep.equal([]);
        expect(inStaffClefs(m3Lower)).to.equal(0);
        expect(m3Lower.InitiallyActiveClef.ClefType).to.equal(ClefEnum.G);
        expect(noteClefTypes(m3Lower)).to.satisfy((types: ClefEnum[]) => types.length > 0 && types.every(t => t === ClefEnum.G));
    });
});
