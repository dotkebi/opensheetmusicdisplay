import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";

/**
 * The measure that draws a tuplet crossing the staves (crossStaffTupletOwner()) makes its VexFlow tuplet only when the other
 * staff's notes exist, after its own voice was built with the notes' ticks set from their graphical length (2048/3 for a
 * sextuplet 16th). The tuplet gave them its multiplier again, unreduced (4096/6): the formatter keys its tick contexts by
 * numerators over the voices' common denominator, so the two staves' contexts came apart and the upper staff's notes from the
 * sextuplet's second one on were drawn right of the lower staff's later notes (Lili Boulanger, D'un matin de printemps,
 * harp m81; the web playback cursor moved back there).
 */
describe("Cross-staff tuplet: the notes keep their ticks", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    before(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_cross_staff_tuplet_ticks.musicxml"));
        osmd.render();
    });
    after(() => {
        osmd.clear();
        container.remove();
    });

    function tupletNotes(staffIndex: number): VexFlowVoiceEntry[] {
        const gMeasure: VexFlowMeasure = osmd.GraphicSheet.MeasureList[0][staffIndex] as VexFlowMeasure;
        const result: VexFlowVoiceEntry[] = [];
        for (const staffEntry of gMeasure.staffEntries) {
            for (const gve of staffEntry.graphicalVoiceEntries) {
                if (gve.notes[0]?.sourceNote.NoteTuplet) {
                    result.push(gve as VexFlowVoiceEntry);
                }
            }
        }
        return result;
    }

    it("draws the notes of both staves in time order", () => {
        const notes: VexFlowVoiceEntry[] = [...tupletNotes(0), ...tupletNotes(1)]
            .sort((a, b) => a.parentVoiceEntry.Timestamp.RealValue - b.parentVoiceEntry.Timestamp.RealValue);
        expect(notes.length).to.equal(20);
        const outOfOrder: string[] = [];
        for (let i: number = 1; i < notes.length; i++) {
            const previousX: number = notes[i - 1].vfStaveNote.getAbsoluteX();
            const x: number = notes[i].vfStaveNote.getAbsoluteX();
            if (x <= previousX) {
                outOfOrder.push(`${notes[i].parentVoiceEntry.Timestamp.RealValue.toFixed(4)}: ${x.toFixed(1)} <= ${previousX.toFixed(1)}`);
            }
        }
        expect(outOfOrder).to.deep.equal([]);
    });

    it("gives the drawing staff's notes the reduced ticks of their graphical length", () => {
        // the upper staff draws the three tuplets: 3 septuplet, 3 sextuplet, 3 septuplet 16ths
        const ticks: string[] = tupletNotes(0).map(gve => {
            const fraction: any = gve.vfStaveNote.getTicks();
            return `${fraction.numerator}/${fraction.denominator}`;
        });
        expect(ticks).to.deep.equal([
            "4096/7", "4096/7", "4096/7",
            "2048/3", "2048/3", "2048/3",
            "4096/7", "4096/7", "4096/7"
        ]);
    });
});

describe("Cross-staff tuplet drawn by the lower staff: the upper staff's notes keep their ticks", () => {
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

    it("keeps the reduced ticks of the upper staff's notes, whose voice was built before the lower staff made the tuplet", () => {
        // m2: the crossing sextuplet (placement below) is made by the lower staff, after the upper staff's voice
        const gMeasure: VexFlowMeasure = osmd.GraphicSheet.MeasureList[1][0] as VexFlowMeasure;
        const ticks: string[] = [];
        for (const staffEntry of gMeasure.staffEntries) {
            for (const gve of staffEntry.graphicalVoiceEntries) {
                if (gve.notes[0]?.sourceNote.NoteTuplet) {
                    const fraction: any = (gve as VexFlowVoiceEntry).vfStaveNote.getTicks();
                    ticks.push(`${fraction.numerator}/${fraction.denominator}`);
                }
            }
        }
        expect(ticks).to.deep.equal(["2048/3", "2048/3", "2048/3"]);
    });
});
