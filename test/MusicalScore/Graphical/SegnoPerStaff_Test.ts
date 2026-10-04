import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { RepetitionInstruction, RepetitionInstructionEnum } from "../../../src/MusicalScore/VoiceData/Instructions/RepetitionInstruction";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";

/**
 * A segno above each hand, at different notes (Couperin, Concerts royaux III, Allemande m17: "Petite reprise").
 * The two were one segno at the start of the measure above the top staff.
 *
 * Sample: measure 2 has a segno above the right hand at its second eighth (1/8) and one above the left hand after its rest (3/8).
 */
describe("Segno signs per staff", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_segno_per_staff_offset.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    function segno(): RepetitionInstruction {
        return osmd.Sheet.SourceMeasures[1].FirstRepetitionInstructions.find(i => i.type === RepetitionInstructionEnum.Segno);
    }

    it("keeps the staff and the timestamp of each sign", () => {
        const placements: string[] = segno().SymbolPlacements.map(p => `${p.staff.idInMusicSheet}@${p.timestamp.toString()}`);
        expect(placements).to.deep.equal(["0@1/8", "1@3/8"]);
    });

    it("draws each sign above its staff, at its note", () => {
        const measures: GraphicalMeasure[] = osmd.GraphicSheet.MeasureList[1];
        for (const [staff, noteIndex] of [[0, 1], [1, 2]]) {
            const measure: GraphicalMeasure = measures[staff];
            const repetitions: any[] = (measure as any).vfRepetitionWords;
            expect(repetitions.length, `segnos of staff ${staff}`).to.equal(1);
            const noteX: number = measure.staffEntries[noteIndex].PositionAndShape.RelativePosition.x;
            expect(repetitions[0].anchorX, `segno of staff ${staff} at its note`).to.be.within(noteX - 1, noteX + 0.5);
        }
    });
});
