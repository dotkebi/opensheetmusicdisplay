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
 * shape). VexFlow 1.2.93's font has no tick or salzedo breath mark: the tick is drawn from OSMD's check mark outline,
 * the size of the SMuFL tick the app draws (Leo, Dal tuo soglio luminoso has 63 of them), the salzedo stays a comma.
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

    it("reads each value and draws the comma, the tick or the upbow glyph", () => {
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
        expect(codes).to.deep.equal(["v6c", "v6c", "osmdBreathMarkTick", "v75", "v6c"]);
    });

    it("draws the tick about 1.5 staff spaces wide and high, above its note", () => {
        const ticks: any[] = [];
        for (const row of osmd.GraphicSheet.MeasureList) {
            for (const staffEntry of row[0].staffEntries) {
                for (const gve of staffEntry.graphicalVoiceEntries) {
                    for (const modifier of ((gve as VexFlowVoiceEntry).vfStaveNote as any).getModifiers()) {
                        if (modifier.getCategory() === "articulations" && modifier.type === "abrv") {
                            ticks.push(modifier);
                        }
                    }
                }
            }
        }
        expect(ticks.length).to.equal(1);
        const ink: any = ticks[0].drawnInk;
        const space: number = ticks[0].note.getStave().getSpacingBetweenLines();
        const width: number = (ink.right - ink.left) / space;
        const height: number = (ink.bottom - ink.top) / space;
        expect(width, `width ${width}`).to.be.within(1.3, 1.7);
        expect(height, `height ${height}`).to.be.within(1.3, 1.7);
        expect(ink.bottom, "above the note").to.be.at.most(Math.min(...ticks[0].note.getYs()));
        // the comma's width in the spacing, so the tick doesn't widen the measure
        const comma: any = new (ticks[0].constructor as any)("abr");
        expect(ticks[0].getWidth(), "spacing width").to.equal(comma.getWidth());
    });
});
