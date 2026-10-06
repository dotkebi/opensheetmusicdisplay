import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { VexFlowGraphicalNote } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { VexFlowStaffEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowStaffEntry";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { ClefEnum, ClefInstruction } from "../../../src/MusicalScore/VoiceData/Instructions/ClefInstruction";
import Vex from "vexflow";
const VF: any = Vex.Flow;

/**
 * A <clef> after the grace notes of a measure's start (Schumann, Myrthen Op. 25 No. 24 m17, right hand: a grace chord in
 * the G clef, then the F clef, then the chords). The clef was taken as the clef of the measure's start: it was drawn at the
 * end of the previous measure and the grace chord was drawn in the F clef (many ledger lines). It is an in-staff clef
 * between the grace notes and the main note now; m2 starts a system, with the G clef. m4 has an ordinary clef change.
 * Same as osmd-dart test/clef_after_grace_notes_test.dart.
 */
describe("Clef after grace notes", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.EngravingRules.NewSystemAtXMLNewSystemAttribute = true;
        await osmd.load(TestUtils.getScore("test_clef_after_grace_notes.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });
    function measure(index: number): VexFlowMeasure {
        return osmd.GraphicSheet.MeasureList[index][0] as VexFlowMeasure;
    }
    function clefTypes(gMeasure: VexFlowMeasure, position: number): string[] {
        return gMeasure.getVFStave().getModifiers()
            .filter((modifier: any) => modifier.getCategory() === "clefs" && modifier.getPosition() === position)
            .map((modifier: any) => modifier.type);
    }

    it("reads the clef as an in-staff clef of the grace notes' entry", () => {
        const sheet: any = osmd.Sheet;
        expect(sheet.SourceMeasures[0].LastInstructionsStaffEntries.filter((entry: any) => entry?.Instructions.some(
            (instruction: any) => instruction instanceof ClefInstruction)).length).to.equal(0);
        const clefs: ClefInstruction[] = sheet.SourceMeasures[1].VerticalSourceStaffEntryContainers[0].StaffEntries[0]
            .Instructions.filter((instruction: any) => instruction instanceof ClefInstruction);
        expect(clefs.map(clef => `${ClefEnum[clef.ClefType]}/${clef.AfterGraceNotes}`)).to.deep.equal(["F/true"]);
    });

    it("keeps the grace notes in the previous clef and draws the clef after them", () => {
        expect(clefTypes(measure(0), VF.StaveModifier.Position.END)).to.deep.equal([]);
        expect(measure(1).ParentMusicSystem).not.to.equal(measure(0).ParentMusicSystem);
        expect(clefTypes(measure(1), VF.StaveModifier.Position.BEGIN)).to.deep.equal(["treble"]);
        const graceClefs: ClefEnum[] = [];
        const mainClefs: ClefEnum[] = [];
        for (const staffEntry of measure(1).staffEntries) {
            for (const gve of staffEntry.graphicalVoiceEntries) {
                for (const note of gve.notes) {
                    (gve.parentVoiceEntry.IsGrace ? graceClefs : mainClefs).push((note as VexFlowGraphicalNote).Clef().ClefType);
                }
            }
        }
        expect(graceClefs).to.deep.equal([ClefEnum.G, ClefEnum.G, ClefEnum.G]);
        expect(mainClefs.every(clef => clef === ClefEnum.F)).to.equal(true);
        for (const index of [2, 3]) {
            const clef: ClefEnum = index === 2 ? ClefEnum.F : ClefEnum.G;
            for (const staffEntry of measure(index).staffEntries) {
                for (const note of staffEntry.graphicalVoiceEntries[0].notes) {
                    expect((note as VexFlowGraphicalNote).Clef().ClefType).to.equal(clef);
                }
            }
        }
        // drawn left to right: the grace chord, the clef, the main chord
        const entry: VexFlowStaffEntry = measure(1).staffEntries[0] as VexFlowStaffEntry;
        const clefNote: any = entry.vfClefBefore;
        const grace: any = (entry.graphicalVoiceEntries.find(gve => gve.parentVoiceEntry.IsGrace) as VexFlowVoiceEntry).vfStaveNote;
        const main: any = (entry.graphicalVoiceEntries.find(gve => !gve.parentVoiceEntry.IsGrace) as VexFlowVoiceEntry).vfStaveNote;
        const graceRight: number = grace.getAbsoluteX() + grace.getGlyphWidth();
        expect(clefNote.getAbsoluteX(), "the clef starts after the grace chord").to.be.at.least(graceRight);
        expect(clefNote.getAbsoluteX() + clefNote.getWidth(), "the clef ends before the main chord").to.be.at.most(main.getAbsoluteX());
    });
});
