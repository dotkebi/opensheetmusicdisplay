import { expect } from "vitest";
import Vex from "vexflow";
import VF = Vex.Flow;
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalContinuousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalContinuousDynamicExpression";
import { GraphicalInstantaneousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalInstantaneousDynamicExpression";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { ClearanceBox, CrossStaffExpressionClearance } from "../../../src/MusicalScore/Graphical/VexFlow/CrossStaffExpressionClearance";
import { VexFlowGraphicalNote } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { VexFlowMusicSheetDrawer } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";

/**
 * A dynamic between the staves at the start of a tremolo between the staves goes before the stem that crosses the room between
 * them, and the wedge after it starts after the stem (81sabo: Sibelius, Violin Concerto III piano m261-264, "mp" and "mf" under
 * the right hand's staff at the left hand's chords, stems up through the room between the staves to the strokes; the print,
 * S.9336, has the dynamics before the stems, the chords moved right, and the hairpins after them). The dynamics lay on the stems:
 * their measure's start, or its clef and key signature, left them no room before the stem (VexFlowMeasure.reserveFirstNoteRoom())
 * (test_tremolo_cross_staff_dynamic_room.musicxml). Same as osmd-dart's test/tremolo_cross_staff_dynamic_room_test.dart.
 */
describe("Dynamic before the stem of a tremolo between the staves", () => {
    for (const width of [600, 834, 1024, 1366]) {
        it(`puts the dynamics before the stems, the wedges after them (${width})`, async () => {
            const container: HTMLElement = TestUtils.getDivElement(document);
            container.style.width = `${width}px`;
            const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
            await osmd.load(TestUtils.getScore("test_tremolo_cross_staff_dynamic_room.musicxml"));
            osmd.render();
            const reach: number = VexFlowMusicSheetDrawer.CrossStaffTremoloStemReach;
            const margin: number = osmd.EngravingRules.WedgeHorizontalMargin;
            for (let m: number = 1; m <= 4; m++) {
                const upper: GraphicalMeasure = osmd.GraphicSheet.MeasureList[m - 1][0];
                const lower: GraphicalMeasure = osmd.GraphicSheet.MeasureList[m - 1][1];
                const vfNote: any = (lower.staffEntries[0].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote).vfnote[0];
                expect(vfNote.getStemDirection()).to.equal(VF.Stem.UP);
                const stemX: number = vfNote.getStemX() / 10;
                const line: StaffLine = upper.ParentStaffLine;
                const dynamic: GraphicalInstantaneousDynamicExpression = line.AbstractExpressions.find(e =>
                    e instanceof GraphicalInstantaneousDynamicExpression &&
                    (e.SourceExpression as any).ParentMultiExpression.SourceMeasureParent === upper.parentSourceMeasure
                ) as GraphicalInstantaneousDynamicExpression;
                const label: any = dynamic.Label;
                const box: BoundingBox = label.PositionAndShape;
                const dx: number = osmd.Drawer.CrossStaffExpressionShifts.get(label) ?? 0;
                const glyphs: ClearanceBox = CrossStaffExpressionClearance.dynamicBox(
                    new ClearanceBox(box.AbsolutePosition.x + box.BorderLeft + dx, 0, box.AbsolutePosition.x + box.BorderRight + dx, 1),
                    label.Label.text);
                // clear of the stem's ink (its reach) by the clearance
                expect(glyphs.right, `m${m} ${label.Label.text} glyphs ${glyphs.left}..${glyphs.right}, stem ${stemX}`)
                    .to.be.at.most(stemX - reach - CrossStaffExpressionClearance.Clearance + 1e-6);
                // in its measure, after its clef and key signature
                const stave: any = (upper as VexFlowMeasure).getVFStave();
                let measureStart: number = stave.getX() / 10;
                for (const modifier of stave.getModifiers(VF.StaveModifier.Position.BEGIN)) {
                    if (!(modifier instanceof VF.Barline)) {
                        measureStart = Math.max(measureStart, (modifier.getX() + modifier.getWidth()) / 10);
                    }
                }
                expect(glyphs.left, `m${m} ${label.Label.text} glyphs left ${glyphs.left}, measure start ${measureStart}`)
                    .to.be.at.least(measureStart);
                const wedge: GraphicalContinuousDynamicExpression = line.AbstractExpressions.find(e =>
                    e instanceof GraphicalContinuousDynamicExpression && e.StartMeasure === upper) as GraphicalContinuousDynamicExpression;
                const wedgeStart: number = line.PositionAndShape.AbsolutePosition.x +
                    Math.min(...wedge.Lines.map(l => Math.min(l.Start.x, l.End.x)));
                expect(wedgeStart, `m${m} wedge start ${wedgeStart}, stem ${stemX}`).to.be.at.least(stemX + margin - 0.01);
            }
            osmd.clear();
            container.remove();
        });
    }
});
