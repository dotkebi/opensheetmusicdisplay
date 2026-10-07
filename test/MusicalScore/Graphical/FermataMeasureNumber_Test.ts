import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";

/**
 * A fermata raised over the slur from its note (layoutFermatasOverSlurs()) at a measure's first note went into the
 * measure number there, which is placed before the ornaments (Giordani, Caro mio ben, voice m29, solo vocal review
 * E04-F03). The number goes over the fermata. Same as the osmd-dart test/fermata_measure_number_test.dart.
 */
describe("Measure number over a fermata raised over a slur", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_fermata_slur_measure_number.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    it("puts the measure's number over the raised fermata", () => {
        const m29: VexFlowMeasure = osmd.GraphicSheet.MeasureList[2][0] as VexFlowMeasure;
        const staffLine: StaffLine = m29.ParentStaffLine;
        const [ink] = m29.FermataInk;
        const shift: number = ink.fermata.slurClearanceYShift / 10;
        expect(shift, "fermata raised over the slur").to.be.lessThan(0);
        // the number "1029" (every second measure from the fixture's first, 1027) at its barline: four digits reach
        // over the fermata on the web too
        const labels: BoundingBox[] = staffLine.ParentMusicSystem.MeasureNumberLabels
            .filter(label => label.Label.text === "1029").map(label => label.PositionAndShape);
        expect(labels.length, "m1029's number").to.equal(1);
        const box: BoundingBox = labels[0];
        const left: number = box.RelativePosition.x + box.BorderMarginLeft - staffLine.PositionAndShape.RelativePosition.x;
        const right: number = box.RelativePosition.x + box.BorderMarginRight - staffLine.PositionAndShape.RelativePosition.x;
        expect(left < ink.right && right > ink.left, `number ${left}..${right} over the fermata ${ink.left}..${ink.right}`)
            .to.equal(true);
        const labelBottom: number = box.RelativePosition.y + box.BorderMarginBottom;
        const fermataTop: number = ink.top + shift;
        expect(labelBottom, `number bottom ${labelBottom}, fermata top ${fermataTop}`).to.be.lessThan(fermataTop);
    });
});
