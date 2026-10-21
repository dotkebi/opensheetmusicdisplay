import { expect } from "chai";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { StemDirectionType } from "../../../src/MusicalScore/VoiceData/VoiceEntry";

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
            (graphicalSlur as any).calculateStartAndEnd(undefined, endNote, { StaffHeight: 4 }, rules, undefined);

        expect(result.endX).to.equal(6);
        expect(result.endY).to.equal(1.5);
    });

    describe("placement over mixed stems", () => {
        // A slur from a stem-up note to a stem-down note goes above unless the ink
        // reaches at least mixedStemsAboveMargin (0.25 units) further above the
        // staff than below it (Davydov Op. 11 m257 in osmd-dart: 1.564 above,
        // 1.556 below, the slur hung below a long beam).
        function placementFor(above: number, below: number): PlacementEnum {
            const graphicalSlur: GraphicalSlur = new GraphicalSlur({} as any, { SlurPlacementFromXML: false } as any);
            const staffEntry: (stemDirection: StemDirectionType) => any = (stemDirection) => ({
                parentMeasure: {
                    hasMultipleVoices: () => false,
                    PositionAndShape: { RelativePosition: { x: 0 } }
                },
                LyricsEntries: [],
                graphicalVoiceEntries: [{ parentVoiceEntry: { StemDirection: stemDirection } }],
                PositionAndShape: { BorderLeft: 0, BorderRight: 1, RelativePosition: { x: 0 } }
            });
            graphicalSlur.staffEntries = [staffEntry(StemDirectionType.Up), staffEntry(StemDirectionType.Down)];
            graphicalSlur.placement = PlacementEnum.NotYetDefined;
            const skyBottomLineCalculator: any = {
                getSkyLineMinInRange: () => -above,
                getBottomLineMaxInRange: () => below + 4
            };
            (graphicalSlur as any).calculatePlacement(skyBottomLineCalculator, { StaffHeight: 4 });
            return graphicalSlur.placement;
        }

        it("goes above when the ink reaches a little higher above than below", () => {
            expect(placementFor(1.564, 1.556)).to.equal(PlacementEnum.Above);
            expect(placementFor(1.5, 1.5)).to.equal(PlacementEnum.Above);
            expect(placementFor(1.74, 1.5)).to.equal(PlacementEnum.Above);
        });

        it("goes below when the ink reaches a quarter unit or more higher above", () => {
            expect(placementFor(1.8, 1.5)).to.equal(PlacementEnum.Below);
            expect(placementFor(2.5, 1)).to.equal(PlacementEnum.Below);
        });

        it("goes above when the ink reaches further below", () => {
            expect(placementFor(1, 2)).to.equal(PlacementEnum.Above);
        });
    });
});
