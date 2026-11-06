import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { ClefEnum } from "../../../src/MusicalScore/VoiceData/Instructions/ClefInstruction";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Saint-Saens, Bassoon Sonata Op. 168 II m70-72: the tenor clef at the end of a multirest given in the XML was never drawn
 * and the notes after it were placed for the bass clef. Dragonetti, Concerto in G I, wind parts: a rehearsal mark inside an
 * automatic multirest was lost. Same as osmd-dart test/multirest_end_clef_rehearsal_test.dart.
 */
describe("Multirests: the clef at the end, a rehearsal mark inside", () => {
    let osmd: OpenSheetMusicDisplay;
    before(async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1200px";
        osmd = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg", autoGenerateMultipleRestMeasuresFromRestMeasures: true });
        await osmd.load(TestUtils.getScore("test_multirest_end_clef_rehearsal.musicxml"));
        osmd.render();
    });
    it("ends the multirest given in the XML with its last measure's clef, active after it", () => {
        const list: any[][] = osmd.GraphicSheet.MeasureList;
        const multiRest: any = list[1][0];
        expect(multiRest.parentSourceMeasure.multipleRestMeasures, "m2-4 one multirest").to.equal(3);
        expect((multiRest.getVFStave() as any).endClef, "a clef at its end").to.equal("tenor");
        const m5: any = list[4][0];
        expect(m5.InitiallyActiveClef.ClefType, "m5 starts in the C clef").to.equal(ClefEnum.C);
        expect(m5.staffEntries[0].graphicalVoiceEntries[0].notes[0].Clef().ClefType, "its note placed for it").to.equal(ClefEnum.C);
        expect(m5.staffEntries[0].graphicalVoiceEntries[0].notes[0].Clef().Line, "on the 4th line").to.equal(4);
    });
    it("starts a new automatic multirest at a rehearsal mark", () => {
        const multis: number[] = osmd.Sheet.SourceMeasures.map(m => m.multipleRestMeasures ?? 0);
        expect(multis[5], "m6-7").to.equal(2);
        expect(multis[7], "m8-9, from the rehearsal mark").to.equal(2);
        expect(osmd.GraphicSheet.MeasureList[7][0], "m8 drawn").to.not.equal(undefined);
    });
});
