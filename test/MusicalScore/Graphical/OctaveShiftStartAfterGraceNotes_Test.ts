import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { GraphicalVoiceEntry } from "../../../src/MusicalScore/Graphical/GraphicalVoiceEntry";
import { VexFlowGraphicalNote } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { VexFlowOctaveShift } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowOctaveShift";
import { OctaveEnum } from "../../../src/MusicalScore/VoiceData/Expressions/ContinuousExpressions/OctaveShift";

/**
 * Widmung (Schumann/Auer, violin m45, integrated review R219-D01): 26 grace notes, then `<octave-shift type="down">`,
 * then G6. Grace notes have no duration, so they share the start's timestamp, and every voice entry at that timestamp
 * was put under the 8va: the grace notes were drawn an octave lower and the bracket began at the first grace note.
 * The voice entries read before the start direction (OctaveShift.startVoiceEntryIndex) are not covered when they are
 * grace notes. Fixture test_octaveshift_start_after_grace_notes.musicxml (the same file as osmd-dart's):
 * m1 C5 half, D5 quarter, graces E4 F4 G4, 8va start, A6 quarter; m2 B6 whole, stop.
 */
describe("Octave shift start after grace notes", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    before(async () => {
        container = TestUtils.getDivElement(document);
        container.style.width = "900px";
        osmd = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore("test_octaveshift_start_after_grace_notes.musicxml"));
        osmd.render();
    });
    after(() => {
        osmd.clear();
        container.remove();
    });

    function shifts(measureIndex: number): string[] {
        const result: string[] = [];
        for (const staffEntry of osmd.GraphicSheet.MeasureList[measureIndex][0].staffEntries) {
            for (const gve of staffEntry.graphicalVoiceEntries) {
                const note: VexFlowGraphicalNote = gve.notes[0] as VexFlowGraphicalNote;
                result.push(`${gve.parentVoiceEntry.IsGrace ? "grace " : ""}${note.sourceNote.Pitch.ToStringShort()}:` +
                    `${OctaveEnum[note.octaveShift]}`);
            }
        }
        return result;
    }

    it("leaves the grace notes before the start unshifted", () => {
        expect(osmd.Sheet.SourceMeasures[0].StaffLinkedExpressions[0]
            .find(multi => multi.OctaveShiftStart)?.OctaveShiftStart.startVoiceEntryIndex).to.equal(3);
        // OSMD octave numbers: C5 = C2
        expect(shifts(0)).to.deep.equal(["C2:NONE", "D2:NONE", "grace E1:NONE", "grace F1:NONE", "grace G1:NONE", "A3:VA8"]);
        expect(shifts(1)).to.deep.equal(["B3:VA8"]);
    });

    it("starts the bracket at the main note", () => {
        const shift: VexFlowOctaveShift = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0].OctaveShifts[0] as VexFlowOctaveShift;
        const staffEntries: GraphicalStaffEntry[] = osmd.GraphicSheet.MeasureList[0][0].staffEntries;
        const entries: GraphicalVoiceEntry[] = staffEntries[staffEntries.length - 1].graphicalVoiceEntries;
        const mainNote: VexFlowVoiceEntry = entries[entries.length - 1] as VexFlowVoiceEntry;
        expect(mainNote.parentVoiceEntry.IsGrace).to.equal(false);
        expect(shift.startNote).to.equal(mainNote.vfStaveNote);
    });
});
