import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";

/**
 * The rests of a staff with several voices were put above the other voices' notes for voice 1 (or 5) only.
 * The rest of another voice that is the upper one by its stems and its notes was put below the other voice's note,
 * under its stem (Couperin, Concerts royaux II, Prelude m1-2: the quarter rest of voice 6, far below the left hand's D3).
 *
 * Synthetic sample: bass clef, voice 1 E3 dotted half (stem down), voice 2 quarter rest and G3 half (stem up),
 * voice 3 hidden half rest and B3 quarter (stem up).
 */
describe("Rest on the side of its voice", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_rest_side_of_its_voice.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    it("puts the rest of the upper voice above the other voice's note", () => {
        const measure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[0][0];
        const entries: VexFlowVoiceEntry[] = measure.staffEntries[0].graphicalVoiceEntries as VexFlowVoiceEntry[];
        const lowerNote: any = entries.find(gve => !gve.notes[0].sourceNote.isRest()).vfStaveNote;
        const rest: any = entries.find(gve => gve.notes[0].sourceNote.isRest() && gve.notes[0].sourceNote.PrintObject).vfStaveNote;
        const restLine: number = rest.getKeyProps()[0].line;
        const lowerLine: number = lowerNote.getKeyProps()[0].line;
        // a quarter rest reaches about 1.5 lines below its line: it's above the lower notehead, not below its stem
        expect(restLine, `rest line ${restLine}, lower note line ${lowerLine}`).to.be.greaterThan(lowerLine + 2);
    });
});
