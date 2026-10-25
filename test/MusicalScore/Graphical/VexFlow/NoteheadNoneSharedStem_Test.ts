import { expect } from "chai";
import { TestUtils } from "../../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import Vex from "vexflow";
import VF = Vex.Flow;

/**
 * A note with notehead none and an XML <stem> on the visible head of another voice's unison note keeps its stem, beamed
 * or not (81sabo Mozart K.313 I Piano m33, beat 4: a quarter A4 stem up on the A4 of a stem-down chord). The stem was
 * transparent unless the note was in a drawn beam (drawnAsSharedUnisonNote), in the app too. A print-object="no" note
 * stays hidden. Same fixture and checks as osmd-dart test/notehead_none_shared_stem_test.dart.
 */
describe("Notehead none with an XML stem on a shared head", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    before(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_notehead_none_shared_stem.musicxml"));
        osmd.render();
    });
    after(() => {
        osmd.clear();
        container.remove();
    });
    const stemColorOfHiddenA4: (measureIndex: number) => string = (measureIndex: number) => {
        const measure: any = osmd.GraphicSheet.MeasureList[measureIndex][0];
        const staffEntries: any[] = measure.staffEntries;
        const entry: VexFlowVoiceEntry = staffEntries[staffEntries.length - 1].graphicalVoiceEntries
            .find((g: VexFlowVoiceEntry) => g.parentVoiceEntry.ParentVoice.VoiceId === 2);
        const note: any = entry.vfStaveNote;
        expect(note.getStemDirection()).to.equal(VF.Stem.UP);
        return note.getStem().getStyle()?.strokeStyle;
    };

    it("m1: notehead none with <stem>up</stem> on a shared head: stem drawn", () => {
        expect(stemColorOfHiddenA4(0)).to.not.equal("#00000000");
    });

    it("m2: print-object=\"no\": stem stays hidden", () => {
        expect(stemColorOfHiddenA4(1)).to.equal("#00000000");
    });
});
