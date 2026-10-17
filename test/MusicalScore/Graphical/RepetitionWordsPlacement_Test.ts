import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { RepetitionInstruction, RepetitionInstructionEnum } from "../../../src/MusicalScore/VoiceData/Instructions/RepetitionInstruction";
import { MusicPartManagerIterator } from "../../../src/MusicalScore/MusicParts/MusicPartManagerIterator";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { unitInPixels } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";

/**
 * The words of a repetition instruction are drawn at the staff of their direction, below it if placed below
 * (Schirmer, Twenty-Four Italian Songs and Arias, Pur dicesti m111: "D.S. al Fine" below the left hand). They were all drawn
 * above the top staff.
 *
 * Sample (piano, two staves): m2 "Fine" without placement and staff, m3 "D.C." below the right hand, m4 "To Coda" above the
 * left hand, m5 "D.S. al Fine" below the left hand (the segno above the right hand).
 */
describe("Repetition instruction words placement and staff", () => {
    const file: string = "test_repetition_words_placement_staff.musicxml";
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.setOptions({ newSystemFromXML: true }); // m4 starts the second system
        await osmd.load(TestUtils.getScore(file));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    /** the staff index and the below baseline (px, undefined above the staff) of each drawn repetition of the type in the measure */
    function drawn(measureIndex: number, symbolType: number): {staff: number, belowY: number}[] {
        const result: {staff: number, belowY: number}[] = [];
        osmd.GraphicSheet.MeasureList[measureIndex].forEach((measure: GraphicalMeasure, staff: number) => {
            for (const repetition of (measure as any).vfRepetitionWords as any[]) {
                if (repetition.symbol_type === symbolType) {
                    result.push({ staff: staff, belowY: repetition.belowY });
                }
            }
        });
        return result;
    }

    it("keeps the staff and placement of the words", () => {
        const instruction: RepetitionInstruction = osmd.Sheet.SourceMeasures[4].LastRepetitionInstructions
            .find(i => i.type === RepetitionInstructionEnum.DalSegnoAlFine);
        expect(instruction.SymbolPlacements.map(p => `${p.staff.idInMusicSheet}${p.below ? " below" : ""}`)).to.deep.equal(["1 below"]);
    });

    it("draws words without placement and staff above the top staff, as before", () => {
        expect(drawn(1, 12)).to.deep.equal([{ staff: 0, belowY: undefined }]); // FINE
    });

    it("draws words placed below under their staff", () => {
        const dc: {staff: number, belowY: number}[] = drawn(2, 6); // DC
        expect(dc.map(d => d.staff)).to.deep.equal([0]);
        expect(dc[0].belowY / unitInPixels, "below the right hand").to.be.within(5, 9);
        const ds: {staff: number, belowY: number}[] = drawn(4, 11); // DS_AL_FINE
        expect(ds.map(d => d.staff)).to.deep.equal([1]);
        expect(ds[0].belowY / unitInPixels, "below the left hand").to.be.within(5, 9);
        expect(drawn(4, 4).map(d => d.staff), "the segno above the right hand").to.deep.equal([0]); // SEGNO_LEFT
    });

    it("doesn't shift words between the staves onto the end barline of the last measure of the staffline", () => {
        expect(osmd.GraphicSheet.MeasureList[2][0].ParentStaffLine.Measures.slice(-1)[0], "m3 ends the first system")
            .to.equal(osmd.GraphicSheet.MeasureList[2][0]);
        const dc: any = ((osmd.GraphicSheet.MeasureList[2][0] as any).vfRepetitionWords as any[]).find(r => r.symbol_type === 6);
        expect(dc.xShiftAsPercentOfStaveWidth, "D.C. below the right hand").to.equal(undefined);
        const ds: any = ((osmd.GraphicSheet.MeasureList[4][1] as any).vfRepetitionWords as any[]).find(r => r.symbol_type === 11);
        expect(ds.xShiftAsPercentOfStaveWidth, "D.S. al Fine below the bottom staff, as above the top staff").to.be.greaterThan(0);
    });

    it("draws words placed above a lower staff above it", () => {
        expect(drawn(3, 13)).to.deep.equal([{ staff: 1, belowY: undefined }]); // TO_CODA
    });

    it("draws the words below the staff in the SVG", () => {
        const text: SVGTextElement = Array.from(container.querySelectorAll("text")).find(t => t.textContent === "D.S. al Fine");
        expect(text, "the D.S. al Fine text").to.not.equal(undefined);
        const stave: any = (osmd.GraphicSheet.MeasureList[4][1] as any).getVFStave();
        expect(parseFloat(text.getAttribute("y")), "below the bottom line of the left hand").to.be.greaterThan(stave.getYForLine(4));
    });

    it("plays as without placement and staff", async () => {
        const order: (score: Document) => Promise<number[]> = async (score: Document): Promise<number[]> => {
            const other: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
            await other.load(score);
            const measures: number[] = [];
            const iterator: MusicPartManagerIterator = other.Sheet.MusicPartManager.getIterator();
            while (!iterator.EndReached) {
                if (iterator.CurrentMeasureIndex !== measures[measures.length - 1] || iterator.JumpOccurred) {
                    measures.push(iterator.CurrentMeasureIndex);
                }
                iterator.moveToNext();
            }
            return measures;
        };
        const stripped: Document = TestUtils.getScore(file).cloneNode(true) as Document;
        for (const direction of Array.from(stripped.getElementsByTagName("direction"))) {
            direction.removeAttribute("placement");
            for (const staff of Array.from(direction.getElementsByTagName("staff"))) {
                staff.remove();
            }
        }
        expect(await order(TestUtils.getScore(file))).to.deep.equal(await order(stripped));
    });
});
