import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { PointF2D } from "../../../src/Common/DataObjects/PointF2D";
import { unitInPixels } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";

/**
 * An unbracketed tuplet number on the noteheads' side of its notes (under up-stems, over down-stems) is centred on the
 * noteheads, where its own slur on that side starts and ends, so the number is in the slur's middle and goes inside it
 * (Leo, Dal tuo soglio luminoso, piano m7, m78, m81, Ricordi edition: stem-up sixteenth chord triplets, the 3 and the slur
 * below). Vexflow centred the number between the stems, half a head towards them (the number at 0.62 of the slur on the
 * web, 0.8 in osmd-dart, whose slurs ended at the heads' left edges). Same as the osmd-dart
 * test/tuplet_number_notehead_side_slur_test.dart.
 */
describe("Tuplet number on the noteheads' side", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        container.style.width = "1024px";
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_tuplet_number_notehead_side_slur.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    it("centres the number on the noteheads, inside the slur from the first head's centre to the last's", () => {
        for (const index of [0, 1]) {
            const m: string = `m${index + 1}`;
            const measure: VexFlowMeasure = osmd.GraphicSheet.MeasureList[index][0] as VexFlowMeasure;
            const inks: any[] = measure.TupletNumberInk;
            expect(inks.length, `${m} numbers`).to.equal(1);
            const ink: any = inks[0];
            // m1: up-stems, number and slur below; m2: down-stems, both above
            expect(ink.above, `${m} above`).to.equal(index === 1);
            expect(ink.bracketed).to.equal(false);
            const notes: any[] = ink.tuplet.getNotes();
            const stave: any = notes[0].getStave();
            const x: number = measure.PositionAndShape.RelativePosition.x;
            const headCentre: (note: any) => number = (note: any): number =>
                x + (note.getCenterGlyphX() - stave.getX()) / unitInPixels;
            const first: number = headCentre(notes[0]);
            const last: number = headCentre(notes[notes.length - 1]);
            expect((ink.left + ink.right) / 2, `${m}: the number at the middle of the noteheads`).to.be.closeTo((first + last) / 2, 0.02);
            const slurs: GraphicalSlur[] = measure.ParentStaffLine.GraphicalSlurs.filter(s => s.staffEntries[0].parentMeasure === measure);
            expect(slurs.length, `${m} slurs`).to.equal(1);
            const slur: GraphicalSlur = slurs[0];
            expect(slur.bezierStartPt.x, `${m}: the slur starts at the first head's centre`).to.be.closeTo(first, 0.02);
            expect(slur.bezierEndPt.x, `${m}: the slur ends at the last head's centre`).to.be.closeTo(last, 0.02);
            for (let i: number = 0; i <= 128; i++) {
                const point: PointF2D = slur.calculateCurvePointAtIndex(i / 128);
                if (point.x < ink.left || point.x > ink.right) {
                    continue;
                }
                if (ink.above) {
                    expect(point.y + GraphicalSlur.thickness, `${m}: the slur over the number at ${point.x}`).to.be.lessThan(ink.top);
                } else {
                    expect(point.y - GraphicalSlur.thickness, `${m}: the slur under the number at ${point.x}`).to.be.greaterThan(ink.bottom);
                }
            }
        }
    });
});
