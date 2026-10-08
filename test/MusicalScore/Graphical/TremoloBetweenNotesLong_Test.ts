import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";

/**
 * The strokes of a tremolo between two notes written as quarters or longer are short and centred between the stems, clear of
 * them (EngravingRules.TremoloBetweenNotesLongNoteStrokeFactor): between half notes they ran like beams, almost from stem to
 * stem (Bellini, L'abbandono, piano m103-104, review B04-F04). The strokes between eighths keep their beam-like length.
 * Same as osmd-dart's test/tremolo_between_notes_long_test.dart.
 */
describe("Tremolo strokes between long notes", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        container.style.width = "1000px";
        osmd = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore("test_tremolo_between_notes_long.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    /** (left, right) in units of the tremolo strokes of the measure */
    function strokes(measureNumber: number): [number, number][] {
        const result: [number, number][] = [];
        // one group per stroke (its fill path first, then its outline)
        for (const group of Array.from(container.querySelectorAll(`g[id^="vf-tremoloBetweenNotes-${measureNumber}-"]`))) {
            const xs: number[] = (group.querySelector("path")?.getAttribute("d") ?? "").split(/[MLZ]/).filter(part => part.trim().length > 0)
                .map(part => parseFloat(part.trim().split(" ")[0]));
            result.push([Math.min(...xs) / 10, Math.max(...xs) / 10]);
        }
        return result;
    }
    /** the x (units, absolute) of the stems of the notes of the measure */
    function entryXs(measureNumber: number): number[] {
        const measure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[measureNumber - 1][0];
        return measure.staffEntries.flatMap(e => e.graphicalVoiceEntries.map(gve => (gve as VexFlowVoiceEntry).vfStaveNote.getStemX() / 10));
    }

    it("between half notes the strokes are short and centred", () => {
        const xs: number[] = entryXs(1);
        const gap: number = xs[1] - xs[0];
        const found: [number, number][] = strokes(1);
        expect(found.length, "two tremolos of three strokes").to.equal(6);
        for (const [left, right] of found.slice(0, 3)) {
            const length: number = right - left;
            expect(length / gap, `stroke ${left}..${right} (${length}) in a gap of ${gap}`)
                .to.be.at.most(osmd.EngravingRules.TremoloBetweenNotesLongNoteStrokeFactor + 0.02);
            expect(length).to.be.at.least(1.0);
            expect((left + right) / 2, "centred between the stems").to.be.closeTo((xs[0] + xs[1]) / 2, 0.3);
        }
    });

    it("between eighths the strokes keep their beam-like length", () => {
        const xs: number[] = entryXs(2);
        const gap: number = xs[1] - xs[0];
        const found: [number, number][] = strokes(2);
        expect(found.length, "two tremolos of one stroke").to.equal(2);
        const [left, right] = found[0];
        expect((right - left) / gap, `stroke ${left}..${right} in a gap of ${gap}`)
            .to.be.greaterThan(osmd.EngravingRules.TremoloBetweenNotesLongNoteStrokeFactor + 0.05);
    });
});
