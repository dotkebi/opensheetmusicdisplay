import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";

/**
 * test_staff_hidden_per_measure.musicxml: a cello part (staff 0) and an ossia part O1 with an empty name (staff 1), hidden by
 * <staff-details print-object="no"> in measures 1-4 and 6-8 and shown in measure 5; a new system at measures 3, 5 and 7
 * (the ossia of Wagner, Siegmunds Liebeslied m51-52). The ossia staff is drawn only in the system of measure 5.
 */
describe("A staff the MusicXML hides in some measures", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.setOptions({ newSystemFromXML: true });
        await osmd.load(TestUtils.getScore("test_staff_hidden_per_measure.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    function systems(): MusicSystem[] {
        return osmd.GraphicSheet.MusicPages.reduce((all, page) => all.concat(page.MusicSystems), [] as MusicSystem[]);
    }

    it("reads the staves hidden in each measure", () => {
        expect(osmd.Sheet.SourceMeasures.map(measure => measure.HiddenStaffIndices)).to.deep.equal(
            [[1], [1], [1], [1], [], [1], [1], [1]]);
    });

    it("is drawn only in the systems where it is shown", () => {
        expect(systems().map(system => system.StaffLines.map(line => line.ParentStaff.idInMusicSheet))).to.deep.equal(
            [[0], [0], [0, 1], [0]]);
        expect(osmd.GraphicSheet.MeasureList[0][1].isVisible(), "a hidden measure").to.equal(false);
        expect(osmd.GraphicSheet.MeasureList[4][1].isVisible(), "the shown measure").to.equal(true);
    });

    it("draws no placeholder name for the empty part name", () => {
        const texts: string[] = Array.from(container.querySelectorAll("text")).map(element => element.textContent);
        expect(texts.filter(text => text.startsWith("Instr")).length).to.equal(0);
    });
});
