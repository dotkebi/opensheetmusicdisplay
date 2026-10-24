import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import Vex from "vexflow";
const VF: any = Vex.Flow;

/**
 * A tuplet whose notes cross the staves of a piano (Enesco, Concertstück piano m51-54; Bruch, Scottish Fantasy piano
 * m68/394) is one group: one number and one bracket over all its notes, placed by the tuplet's placement (above: above
 * the upper staff, below: below the lower staff). Each staff drew its own share of the notes as a tuplet of its own, so
 * the number appeared twice (and the brackets were split). Same as osmd-dart's cross_staff_tuplet_number_test.dart.
 */
describe("Cross-staff tuplet: one number and bracket", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    before(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_cross_staff_tuplet_number.musicxml"));
        osmd.render();
    });
    after(() => {
        osmd.clear();
        container.remove();
    });

    function measure(measureIndex: number, staffIndex: number): VexFlowMeasure {
        return osmd.GraphicSheet.MeasureList[measureIndex][staffIndex] as VexFlowMeasure;
    }
    function vfTuplets(gMeasure: VexFlowMeasure): any[] {
        const result: any[] = [];
        const vftuplets: { [voiceID: number]: any[] } = (gMeasure as any).vftuplets;
        for (const voiceID in vftuplets) {
            if (vftuplets.hasOwnProperty(voiceID)) {
                result.push(...vftuplets[voiceID].filter((t: any) => t !== undefined));
            }
        }
        return result;
    }
    function noteCounts(gMeasure: VexFlowMeasure): number[] {
        return vfTuplets(gMeasure).map((t: any) => t.notes.length);
    }

    it("draws the crossing sextuplet once, in the staff of its placement", () => {
        // m1: the crossing sextuplet (placement above) and the upper-staff sextuplet, both in the upper staff
        expect(noteCounts(measure(0, 0))).to.deep.equal([6, 6]);
        expect(noteCounts(measure(0, 1))).to.deep.equal([]);
        // m2: the crossing sextuplet (placement below) in the lower staff
        expect(noteCounts(measure(1, 0))).to.deep.equal([]);
        expect(noteCounts(measure(1, 1))).to.deep.equal([6]);
        expect(vfTuplets(measure(0, 0))[0].location).to.equal(VF.Tuplet.LOCATION_TOP);
        expect(vfTuplets(measure(1, 1))[0].location).to.equal(VF.Tuplet.LOCATION_BOTTOM);
    });

    it("spans the crossing tuplet from its first note (lower staff) to its last (upper staff)", () => {
        const crossing: any = vfTuplets(measure(0, 0))[0];
        const lowerFirst: VexFlowVoiceEntry = measure(0, 1).staffEntries[0].graphicalVoiceEntries
            .find(gve => gve.parentVoiceEntry.ParentVoice.VoiceId === 1) as VexFlowVoiceEntry;
        const upperLast: VexFlowVoiceEntry = measure(0, 0).staffEntries[2].graphicalVoiceEntries[0] as VexFlowVoiceEntry;
        // (identity as booleans: chai would stringify the circular VexFlow notes on a mismatch)
        expect(crossing.notes[0] === lowerFirst.vfStaveNote).to.equal(true);
        expect(crossing.notes[5] === upperLast.vfStaveNote).to.equal(true);
        expect(crossing.x_pos).to.be.lessThan(upperLast.vfStaveNote.getAbsoluteX());
        expect(crossing.x_pos + crossing.width).to.be.greaterThan(upperLast.vfStaveNote.getAbsoluteX());
    });

    it("places the number beyond the staff on its side, whichever staff the first note is in", () => {
        // m1: the number above goes over the upper staff (the first note is in the lower staff)
        const upperStave: any = measure(0, 0).getVFStave();
        const above: any = vfTuplets(measure(0, 0))[0];
        expect(above.y_pos).to.be.at.most(upperStave.getYForLine(0) - 15);
        // m2: the number below goes under the lower staff (the first note is in the upper staff: VexFlowPatch tuplet.js
        //   took the first note's staff as the base and drew it inside the lower staff, Enesco Concertstück piano m52)
        const lowerStave: any = measure(1, 1).getVFStave();
        const below: any = vfTuplets(measure(1, 1))[0];
        expect(below.y_pos).to.be.at.least(lowerStave.getYForLine(4) + 20);
    });
});
