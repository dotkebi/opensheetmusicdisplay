import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { BreathMarkValue } from "../../../src/MusicalScore/VoiceData/Articulation";
import { ArticulationEnum } from "../../../src/MusicalScore/VoiceData/VoiceEntry";

/**
 * `<breath-mark>` values (MusicXML breath-mark-value: "", comma, tick, upbow, salzedo). Gluck, O del mio dolce ardor
 * m21 (solo vocal review E10-F10) has `<breath-mark placement="above">upbow</breath-mark>`, which was drawn as a
 * comma like every breath mark. The upbow breath mark is now the up-bow glyph (v75, the SMuFL breathMarkUpbow
 * shape). VexFlow 1.2.93's font has no tick or salzedo breath mark, they stay commas (the app draws the SMuFL tick).
 * Same as the osmd-dart test/breath_mark_value_test.dart.
 */
describe("Breath mark values", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_breath_mark_values.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    it("reads each value and draws the comma or the upbow glyph", () => {
        const values: BreathMarkValue[] = [];
        const codes: string[] = [];
        for (const row of osmd.GraphicSheet.MeasureList) {
            for (const staffEntry of row[0].staffEntries) {
                for (const gve of staffEntry.graphicalVoiceEntries) {
                    for (const articulation of gve.parentVoiceEntry.Articulations) {
                        if (articulation.articulationEnum === ArticulationEnum.breathmark) {
                            values.push(articulation.breathMark);
                        }
                    }
                    for (const modifier of ((gve as VexFlowVoiceEntry).vfStaveNote as any).getModifiers()) {
                        if (modifier.getCategory() === "articulations") {
                            codes.push(modifier.articulation.code);
                        }
                    }
                }
            }
        }
        expect(values).to.deep.equal([
            BreathMarkValue.comma, BreathMarkValue.comma, BreathMarkValue.tick, BreathMarkValue.upbow, BreathMarkValue.salzedo,
        ]);
        expect(codes).to.deep.equal(["v6c", "v6c", "v6c", "v75", "v6c"]);
    });
});
