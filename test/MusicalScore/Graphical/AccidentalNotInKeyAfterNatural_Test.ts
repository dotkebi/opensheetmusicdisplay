import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { AccidentalEnum } from "../../../src/Common/DataObjects/Pitch";

/**
 * A sharp on a pitch that the key signature leaves natural, after the natural of that pitch in the measure
 * (Couperin, Concerts royaux IV, Allemande m13 in G major: D5 natural, D#5 with its sharp, D#5).
 * The explicit sharp was taken for a return to the key signature (#1564), which removed the D from the measure's
 * alterations, so the next D#5 got a sharp that the score doesn't have.
 *
 * Sample: G major, measure 1: D5 (parenthesized natural), D#5 (sharp), D#5, E5. Measure 2: D#5 (sharp), D#5.
 */
describe("Accidental of a pitch that the key leaves natural, after its natural", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_accidental_after_natural_not_in_key.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    function drawnAccidentals(measureIndex: number): string[] {
        const measure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[measureIndex][0];
        return measure.staffEntries.map(entry => {
            const accidental: AccidentalEnum = entry.graphicalVoiceEntries[0].notes[0].DrawnAccidental;
            return accidental === undefined || accidental === AccidentalEnum.NONE ? "-" : AccidentalEnum[accidental];
        });
    }

    it("draws only the accidentals of the score", () => {
        expect(drawnAccidentals(0)).to.deep.equal(["NATURAL", "SHARP", "-", "-"]);
        expect(drawnAccidentals(1)).to.deep.equal(["SHARP", "-"]);
    });
});
