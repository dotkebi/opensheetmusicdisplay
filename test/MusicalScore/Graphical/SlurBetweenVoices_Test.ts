import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Scarlatti, Se Florindo è fedele (Parisotti), piano m61 (P06-X2): a slur below the upper voice's sixteenths (stems up)
 * over the lower voice's B♭3 goes between the voices, right under the sixteenths, as in Ricordi's print; it went under
 * the B♭3 and its tie to the next measure. Without room between the voices (the lower voice's F4 right under them) it
 * goes around the other voice's note as before. Same as osmd-dart test/slur_between_voices_test.dart.
 */
describe("Slur below an upper voice over a lower voice", () => {
    async function slurs(): Promise<Map<number, GraphicalSlur>> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore("test_slur_between_voices.musicxml"));
        osmd.render();
        const byMeasure: Map<number, GraphicalSlur> = new Map();
        for (const system of osmd.GraphicSheet.MusicPages[0].MusicSystems) {
            for (const line of system.StaffLines) {
                for (const slur of line.GraphicalSlurs) {
                    byMeasure.set(slur.slur.StartNote.SourceMeasure.MeasureNumber, slur);
                }
            }
        }
        return byMeasure;
    }

    /** The lowest point of the curve (its greatest y, staff line units). */
    function lowest(slur: GraphicalSlur): number {
        let y: number = -Infinity;
        for (let i: number = 0; i <= 64; i++) {
            y = Math.max(y, slur.calculateCurvePointAtIndex(i / 64).y);
        }
        return y;
    }

    it("goes between the voices, over the lower voice's B♭3", async () => {
        const slur: GraphicalSlur = (await slurs()).get(1);
        // the sixteenths' noteheads reach down to 3.5 (G4); the B♭3's top is at 5, its tie under it
        expect(lowest(slur)).to.be.lessThan(5);
        expect(lowest(slur)).to.be.greaterThan(3.5);
        expect(slur.IsBetweenVoices).to.equal(true);
    });

    it("goes around the other voice's note without room between", async () => {
        const slur: GraphicalSlur = (await slurs()).get(3);
        expect(slur.IsBetweenVoices).to.equal(false);
        // under the F4 (its notehead's bottom at 4)
        expect(lowest(slur)).to.be.greaterThan(4.5);
    });
});
