import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";

/**
 * The stems of a tremolo between two notes end on one line, like beamed stems, and the short strokes lie between them in the
 * stem region both share (Mozart, Bassoon Concerto K.191 I, Besozzi/Richault piano LH m1-4: a B-flat2/F3 chord and B-flat3 in
 * half notes, stems down - the B-flat3 stem ended in the staff, 3.5 spaces above the chord's, and the stroke slanted from beside
 * the B-flat2 notehead up to it). Stems of about the same length are not changed.
 * Same as osmd-dart's test/tremolo_between_notes_stem_line_test.dart.
 */
describe("Tremolo between notes: stems on one line", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        container.style.width = "1000px";
        osmd = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore("test_tremolo_between_notes_stem_line.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    interface IStemmedNote { tip: number, innerHead: number, stemLength: number }
    /** the stem tip, the notehead nearest it (stems down) and the stem length, in units */
    function notes(measureNumber: number): IStemmedNote[] {
        const measure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[measureNumber - 1][0];
        return measure.staffEntries.flatMap(e => e.graphicalVoiceEntries.map(gve => {
            const note: any = (gve as VexFlowVoiceEntry).vfStaveNote;
            const extents: {topY: number, baseY: number} = note.getStemExtents();
            return { tip: extents.topY / 10, innerHead: Math.max(...note.getYs()) / 10, stemLength: Math.abs(extents.topY - extents.baseY) / 10 };
        }));
    }
    /** (top, bottom) in units of the tremolo strokes of the measure */
    function strokes(measureNumber: number): [number, number][] {
        const result: [number, number][] = [];
        // one group per stroke (its fill path first, then its outline)
        for (const group of Array.from(container.querySelectorAll(`g[id^="vf-tremoloBetweenNotes-${measureNumber}-"]`))) {
            const ys: number[] = (group.querySelector("path")?.getAttribute("d") ?? "").split(/[MLZ]/).filter(part => part.trim().length > 0)
                .map(part => parseFloat(part.trim().split(" ")[1]));
            result.push([Math.min(...ys) / 10, Math.max(...ys) / 10]);
        }
        return result;
    }

    it("ends the stems of a chord and a high note on one line", () => {
        const n: IStemmedNote[] = notes(1);
        expect(n.length).to.equal(4);
        for (let i: number = 0; i < 4; i += 2) {
            expect(Math.abs(n[i].tip - n[i + 1].tip), `tips ${n[i].tip} and ${n[i + 1].tip}`)
                .to.be.at.most(osmd.EngravingRules.TremoloBetweenNotesMaxSlant + 0.01);
        }
    });

    it("puts the stroke between the stems below the lower notehead", () => {
        const n: IStemmedNote[] = notes(1);
        const found: [number, number][] = strokes(1);
        expect(found.length).to.equal(2);
        found.forEach(([top, bottom], i) => {
            const lowerHead: number = n[2 * i].innerHead; // the chord's B-flat2
            const shorterTip: number = Math.min(n[2 * i].tip, n[2 * i + 1].tip);
            expect(top, `stroke ${top}..${bottom} beside the notehead at ${lowerHead}`).to.be.greaterThan(lowerHead + 0.5);
            expect(bottom, `stroke ${top}..${bottom} beyond the tip at ${shorterTip}`).to.be.at.most(shorterTip + 0.01);
        });
    });

    it("keeps the length of stems of about the same length", () => {
        for (const note of notes(2)) {
            expect(note.stemLength).to.be.closeTo(3.5, 0.05);
        }
    });
});
