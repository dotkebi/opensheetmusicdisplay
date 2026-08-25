import { expect } from "chai";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";

describe("GraphicalSlur", () => {
    it("ignores unresolved articulation placement when the VexFlow note is empty", () => {
        const rules: any = {
            SlurPlacementUseSkyBottomLine: false,
            SlurEndArticulationYOffset: 1
        };
        const graphicalSlur: GraphicalSlur = new GraphicalSlur({
            startNoteHasMoreStartingSlurs: () => false,
            endNoteHasMoreEndingSlurs: () => false,
            isSlurLonger: () => false
        } as any, rules);
        graphicalSlur.placement = PlacementEnum.Above;
        graphicalSlur.graceEnd = false;

        const endNote: any = {
            PositionAndShape: { RelativePosition: { x: 1 } },
            parentVoiceEntry: {
                PositionAndShape: {
                    RelativePosition: { y: 4 },
                    BorderTop: -1,
                    BorderBottom: 1
                },
                parentStaffEntry: {
                    PositionAndShape: { RelativePosition: { x: 2 } },
                    parentMeasure: {
                        PositionAndShape: { RelativePosition: { x: 3 } }
                    }
                },
                parentVoiceEntry: {
                    Articulations: [{ placement: PlacementEnum.NotYetDefined }]
                }
            },
            vfnote: []
        };

        const result: { endX: number, endY: number } =
            (graphicalSlur as any).calculateStartAndEnd(undefined, endNote, undefined, rules, undefined);

        expect(result.endX).to.equal(6);
        expect(result.endY).to.equal(1.5);
    });
});
