import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalUnknownExpression } from "../../../src/MusicalScore/Graphical/GraphicalUnknownExpression";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";

/**
 * "Fin" written after the last note of a piece, or with an offset to the end of the last measure, has no following
 * staff entry to anchor to. It fell back to the start of the last system instead of staying in the final measure
 * (Couperin, Concerts royaux I Allemande m19, I Sarabande m30, IV Rigaudon m43).
 */
describe("Words after the last note of the piece", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1300px";
        document.body.appendChild(container);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
    });
    afterEach(() => {
        container.remove();
    });

    for (const score of ["test_words_after_last_note_offset.musicxml", "test_words_after_last_note.musicxml"]) {
        it(`stay under the last note of the final measure (${score})`, async () => {
            await osmd.load(TestUtils.getScore(score));
            osmd.render();
            const staffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
            const fin: GraphicalUnknownExpression[] = staffLine.AbstractExpressions
                .filter(expression => expression instanceof GraphicalUnknownExpression) as GraphicalUnknownExpression[];
            expect(fin.map(label => label.Label.Label.text)).to.deep.equal(["Fin"]);
            const lastMeasure: GraphicalMeasure = staffLine.Measures[staffLine.Measures.length - 1];
            const lastEntry: GraphicalStaffEntry = lastMeasure.staffEntries[lastMeasure.staffEntries.length - 1];
            expect(fin[0].Label.PositionAndShape.RelativePosition.x).to.be.closeTo(
                lastMeasure.PositionAndShape.RelativePosition.x + lastEntry.PositionAndShape.RelativePosition.x, 0.001);
        });
    }
});
