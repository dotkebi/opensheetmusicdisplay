import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { Note } from "../../../src/MusicalScore/VoiceData/Note";

/**
 * A tie of the first voice without an XML direction goes above when another voice plays in the measure (Schumann,
 * Myrthen 3 m64-65: VexFlow's own choice from the stem put the G4 half notes' tie below, into the sixteenths; the source
 * ties them above). Alone it keeps VexFlow's choice. Upstream already puts the second voice's tie below.
 * Same as osmd-dart test/tie_upper_voice_direction_test.dart.
 *
 * Fixture test_tie_upper_voice_direction.musicxml (synthetic): m1->m2 voice 1 G4 tied over voice 2 quarters; m3->m4 the
 * same G4 alone.
 */
describe("Tie direction of an upper voice", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    before(async () => {
        container = TestUtils.getDivElement(document);
        container.style.width = "1400px";
        osmd = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore("test_tie_upper_voice_direction.musicxml"));
        osmd.render();
    });
    after(() => {
        osmd.clear();
        container.remove();
    });

    function firstNote(measureIndex: number): Note {
        return osmd.GraphicSheet.MeasureList[measureIndex][0].staffEntries[0].graphicalVoiceEntries[0].notes[0].sourceNote;
    }

    it("goes above with another voice in the measure", () => {
        const ties: any[] = (osmd.GraphicSheet.MeasureList[1][0] as VexFlowMeasure).vfTies;
        expect(ties.length).to.equal(1);
        expect(ties[0].direction, "- is up in VexFlow").to.equal(-1);
        expect(firstNote(0).NoteTie.TieDirection).to.equal(PlacementEnum.Above);
    });

    it("alone keeps VexFlow's choice from the stem", () => {
        expect(firstNote(2).NoteTie.TieDirection).to.equal(PlacementEnum.NotYetDefined);
    });
});
