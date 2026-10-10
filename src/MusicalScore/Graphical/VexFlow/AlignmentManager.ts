import { StaffLine } from "../StaffLine";
import { BoundingBox } from "../BoundingBox";
import { VexFlowContinuousDynamicExpression } from "./VexFlowContinuousDynamicExpression";
import { AbstractGraphicalExpression } from "../AbstractGraphicalExpression";
import { PointF2D } from "../../../Common/DataObjects/PointF2D";
import { EngravingRules } from "../EngravingRules";
import { PlacementEnum } from "../../VoiceData/Expressions/AbstractExpression";
import { InstantaneousDynamicExpression } from "../../VoiceData/Expressions/InstantaneousDynamicExpression";
import { GraphicalContinuousDynamicExpression } from "../GraphicalContinuousDynamicExpression";
import { GraphicalInstantaneousDynamicExpression } from "../GraphicalInstantaneousDynamicExpression";

export class AlignmentManager {
    private parentStaffline: StaffLine;
    private rules: EngravingRules;

    constructor(staffline: StaffLine) {
        this.parentStaffline = staffline;
        this.rules = this.parentStaffline.ParentMusicSystem.rules;
    }

    public alignDynamicExpressions(): void {
        // Find close expressions along the staffline. Group them into tuples
        const groups: AbstractGraphicalExpression[][] = [];
        let tmpList: AbstractGraphicalExpression[] = new Array<AbstractGraphicalExpression>();
        // A dynamic written inside a wedge lies under (over) the wedge or beyond it (MusicSheetCalculator.dynamicsInsideWedges()):
        //   aligned with the wedge, the wedge was squeezed to a stub before or after it (Cesti, Intorno all'idol mio, Piano m49:
        //   the p near the end of the dim. wedge, overlapping it; it was left out only while overlapping boxes weren't neighbours).
        //   Same as osmd-dart.
        const expressions: AbstractGraphicalExpression[] = this.parentStaffline.AbstractExpressions.filter(e =>
            !(e instanceof GraphicalInstantaneousDynamicExpression && e.InsideWedge));
        for (let aeIdx: number = 0; aeIdx < expressions.length - 1; aeIdx++) {
            const currentExpression: AbstractGraphicalExpression = expressions[aeIdx];
            const nextExpression: AbstractGraphicalExpression = expressions[aeIdx + 1];

            const currentExpressionPlacement: PlacementEnum = currentExpression?.SourceExpression?.Placement;
            const nextExpressionPlacement: PlacementEnum = nextExpression?.SourceExpression?.Placement;

            // TODO this shifts dynamics in An die Ferne Geliebte, showing that there's something wrong with the RelativePositions etc with wedges
            // if (currentExpression instanceof GraphicalContinuousDynamicExpression) {
            //     currentExpression.calcPsi();
            // }
            // if (nextExpression instanceof GraphicalContinuousDynamicExpression) {
            //     nextExpression.calcPsi();
            // }

            if (currentExpressionPlacement === nextExpressionPlacement) {
                // if ((currentExpression as any).label?.label?.text?.startsWith("dim") ||
                //     (nextExpression as any).label?.label?.text?.startsWith("dim")) {
                //         console.log("here");
                //     }
                // Overlapping boxes are neighbours (gap 0): with the gap as Math.abs of the signed distance, a wedge overlapping the
                //   next one by more than DynamicExpressionMaxDistance was not grouped, so it was neither squeezed nor aligned, and the
                //   second wedge stayed stacked above the first (Parisotti, Traetta Ombra cara Canto m67: the crescendo stopping at the
                //   note where the diminuendo starts, from its border left). Same as osmd-dart (AlignmentManager._isClose).
                const gap: number = this.getHorizontalGap(currentExpression.PositionAndShape, nextExpression.PositionAndShape);
                if (gap < this.rules.DynamicExpressionMaxDistance && !this.textsOverlap(currentExpression, nextExpression) &&
                    !this.textInsideWedge(currentExpression, nextExpression)) {
                    // Prevent last found expression to be added twice. e.g. p<f as three close expressions
                    if (tmpList.indexOf(currentExpression) === -1) {
                        tmpList.push(currentExpression);
                    }
                    tmpList.push(nextExpression);
                } else {
                    groups.push(tmpList);
                    tmpList = new Array<AbstractGraphicalExpression>();
                }
            } else {
                // A group only has expressions of one placement, see yIdeal below.
                //   Otherwise e.g. two close expressions above the staff and the next two below it formed one group.
                groups.push(tmpList);
                tmpList = new Array<AbstractGraphicalExpression>();
            }
        }
        // If expressions are colliding at end, we need to add them too
        groups.push(tmpList);

        for (const aes of groups) {
            if (aes.length > 0) {
                // Shift all group members to the y position of the member farthest from the staff:
                //   the highest one above the staff, the lowest one below it.
                //   Each one was placed at the sky/bottom line, so moving away from the staff keeps it clear of the notes,
                //   while moving towards the staff (e.g. to the lowest one above it) put expressions onto the notes.
                const centerYs: number[] = aes.map(expr => expr.PositionAndShape.Center.y);
                // TODO this may not give the right position for wedges (GraphicalContinuousDynamic, !isVerbal())
                const isAbove: boolean = aes[0].SourceExpression?.Placement === PlacementEnum.Above;
                const yIdeal: number = isAbove ? Math.min(...centerYs) : Math.max(...centerYs);
                // for (const ae of aes) { // debug
                //     if (ae.PositionAndShape.Center.y > 6) {
                //         // dynamic positioned at edge of skybottomline
                //         console.log(`max expression in measure ${ae.SourceExpression.parentMeasure.MeasureNumber}: `);
                //         console.dir(aes);
                //     }
                // }

                for (let exprIdx: number = 0; exprIdx < aes.length; exprIdx++) {
                    const expr: AbstractGraphicalExpression = aes[exprIdx];
                    const centerOffset: number = centerYs[exprIdx] - yIdeal;
                    // FIXME: Expressions should not behave differently.
                    // TODO: The 0.8 are because the letters are a bit too far done
                    // The halves of a wedge split at a system break after the first one are plain GraphicalContinuousDynamicExpressions
                    //   (MusicSheetCalculator.calculateGraphicalContinuousDynamic()). Their box position is the first line's start point,
                    //   so moving it like a label moved only that point and crossed the lines into an X (Schumann, Myrthen 21 m35).
                    const isContinuous: boolean = expr instanceof GraphicalContinuousDynamicExpression;
                    const shift: number = this.limitShift(expr, isContinuous ? -centerOffset : -centerOffset * 0.8, aes);
                    if (isContinuous) {
                        (expr as GraphicalContinuousDynamicExpression).shiftYPosition(shift);
                        (expr as GraphicalContinuousDynamicExpression).calcPsi();
                    } else {
                        expr.PositionAndShape.RelativePosition.y += shift;
                        // note: verbal GraphicalContinuousDynamicExpressions have a label, nonverbal ones don't.
                        // take care to update and take the right bounding box for skyline.
                        expr.PositionAndShape.calculateBoundingBox();
                    }
                    // Squeeze wedges
                    if ((expr as VexFlowContinuousDynamicExpression).squeeze) {
                        const nextExpression: AbstractGraphicalExpression = exprIdx < aes.length - 1 ? aes[exprIdx + 1] : undefined;
                        const prevExpression: AbstractGraphicalExpression = exprIdx > 0 ? aes[exprIdx - 1] : undefined;
                        // Only a neighbour that overlaps the wedge or is closer than DynamicExpressionSpacer squeezes it: with a gap
                        //   wider than the spacer the "overlap" is negative, and squeezing by it shortened the wedge by the gap
                        //   (Parisotti, Martini Piacer d'amor Canto m45: the diminuendo after the crescendo ending at the barline
                        //   lost 2.4 of its length; renderer leftovers 2, decision C-6). Same as osmd-dart.
                        // The side of a neighbour is that of its time when the times differ: a wedge written with an <offset> before
                        //   the dynamic at the note it starts after came first in the staff line's list, and was squeezed to a stub
                        //   before the dynamic as if it were its right neighbour (Pergolesi, Stizzoso mio stizzoso Canto m26: the
                        //   crescendo written with an <offset> to the f's note). osmd-dart places the dynamic first and starts the
                        //   wedge after it there.
                        const before: AbstractGraphicalExpression[] = [];
                        const after: AbstractGraphicalExpression[] = [];
                        for (const [neighbour, listedBefore] of [[prevExpression, true], [nextExpression, false]] as [AbstractGraphicalExpression, boolean][]) {
                            if (!neighbour) {
                                continue;
                            }
                            const order: number = this.timeOrder(neighbour, expr);
                            (order < 0 || order === 0 && listedBefore ? before : after).push(neighbour);
                        }
                        for (const neighbour of after) {
                            const overlapRight: PointF2D = this.getOverlap(expr.PositionAndShape, neighbour.PositionAndShape);
                            if (overlapRight.x + this.rules.DynamicExpressionSpacer > 0) {
                                (expr as VexFlowContinuousDynamicExpression).squeeze(-(overlapRight.x + this.rules.DynamicExpressionSpacer));
                            }
                        }
                        for (const neighbour of before) {
                            const overlapLeft: PointF2D = this.getOverlap(neighbour.PositionAndShape, expr.PositionAndShape);
                            if (overlapLeft.x + this.rules.DynamicExpressionSpacer > 0) {
                                (expr as VexFlowContinuousDynamicExpression).squeeze(overlapLeft.x + this.rules.DynamicExpressionSpacer);
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Whether two expressions that aren't wedges overlap horizontally, comparing their text without the margins.
     * Aligning them would draw one on the other, e.g. "p cresc." from one direction: "cresc." starts at the p's center and
     * is placed below it. A wedge is squeezed away from its neighbors in the group instead, see alignDynamicExpressions().
     * @param a First expression
     * @param b Second expression
     */
    private textsOverlap(a: AbstractGraphicalExpression, b: AbstractGraphicalExpression): boolean {
        if (this.isWedge(a) || this.isWedge(b)) {
            return false;
        }
        // the borders of an instantaneous or verbal dynamic's box are its label's borders (at (0, 0) in the box)
        const boxA: BoundingBox = a.PositionAndShape;
        const boxB: BoundingBox = b.PositionAndShape;
        return boxA.RelativePosition.x + boxA.BorderLeft < boxB.RelativePosition.x + boxB.BorderRight &&
            boxB.RelativePosition.x + boxB.BorderLeft < boxA.RelativePosition.x + boxA.BorderRight;
    }

    /**
     * Limits the shift of a group member away from the staff, so that it stops at an expression placed further out at the same
     * x that isn't in the group, e.g. at the "dim." placed above the ff of "ff dim." when the ff moves up to an expression before it.
     * @param expression The group member
     * @param shiftY The shift towards the group's y position (negative: up)
     * @param group The members of the group, which move together
     */
    private limitShift(expression: AbstractGraphicalExpression, shiftY: number, group: AbstractGraphicalExpression[]): number {
        const box: BoundingBox = expression.PositionAndShape;
        const left: number = box.RelativePosition.x + box.BorderMarginLeft;
        const right: number = box.RelativePosition.x + box.BorderMarginRight;
        let limitedShift: number = shiftY;
        for (const other of this.parentStaffline.AbstractExpressions) {
            const otherBox: BoundingBox = other.PositionAndShape;
            if (group.includes(other) ||
                otherBox.RelativePosition.x + otherBox.BorderMarginRight <= left || otherBox.RelativePosition.x + otherBox.BorderMarginLeft >= right) {
                continue;
            }
            // the space between the member and the other expression, if the other one is in the direction of the shift
            if (shiftY < 0) {
                const space: number = box.RelativePosition.y + box.BorderMarginTop - (otherBox.RelativePosition.y + otherBox.BorderMarginBottom);
                if (space >= 0) {
                    limitedShift = Math.max(limitedShift, -space);
                }
            } else if (shiftY > 0) {
                const space: number = otherBox.RelativePosition.y + otherBox.BorderMarginTop - (box.RelativePosition.y + box.BorderMarginBottom);
                if (space >= 0) {
                    limitedShift = Math.min(limitedShift, space);
                }
            }
        }
        return limitedShift;
    }

    /**
     * Whether a verbal continuous dynamic ("cres.") starts inside a wedge, after its start and before its stop: the print has them on two rows
     * (Parisotti, A. Scarlatti Se Florindo è fedele Piano m4: "cres." over a crescendo from its second eighth). Aligned into one row,
     * the wedge was squeezed to the text's start (a stub "<" before "cres.") or the text lay on the wedge's lines. Each keeps the row it
     * was placed in, clear of the other by the bottom/sky line. Same as osmd-dart.
     * @param a First expression
     * @param b Second expression
     */
    private textInsideWedge(a: AbstractGraphicalExpression, b: AbstractGraphicalExpression): boolean {
        const wedge: AbstractGraphicalExpression = this.isWedge(a) ? a : this.isWedge(b) ? b : undefined;
        const text: AbstractGraphicalExpression = wedge === a ? b : a;
        if (!wedge || !(text instanceof GraphicalContinuousDynamicExpression) || !text.IsVerbal) {
            return false;
        }
        return GraphicalContinuousDynamicExpression.textStartsInsideWedge(text.ContinuousDynamic,
                                                                         (wedge as GraphicalContinuousDynamicExpression).ContinuousDynamic);
    }

    /** Negative if a starts before b, positive if after, 0 if at the same time or a time is unknown (only dynamics have one here).
     *  At the same time a dynamic comes before a wedge. */
    private timeOrder(a: AbstractGraphicalExpression, b: AbstractGraphicalExpression): number {
        const time: (e: AbstractGraphicalExpression) => number = e => {
            if (e instanceof GraphicalContinuousDynamicExpression) {
                return e.ContinuousDynamic.StartMultiExpression?.AbsoluteTimestamp?.RealValue;
            }
            if (e instanceof GraphicalInstantaneousDynamicExpression) {
                return (e.SourceExpression as InstantaneousDynamicExpression)?.ParentMultiExpression?.AbsoluteTimestamp?.RealValue;
            }
            return undefined;
        };
        const ta: number = time(a);
        const tb: number = time(b);
        if (ta === undefined || tb === undefined) {
            return 0;
        }
        if (Math.abs(ta - tb) < 1e-9) {
            // a dynamic at a wedge's start is the level the wedge starts from: "f <"
            const isDynamic: (e: AbstractGraphicalExpression) => boolean = e => e instanceof GraphicalInstantaneousDynamicExpression;
            return isDynamic(a) && this.isWedge(b) ? -1 : this.isWedge(a) && isDynamic(b) ? 1 : 0;
        }
        return ta < tb ? -1 : 1;
    }

    /** Whether the expression is a crescendo or decrescendo wedge (a continuous dynamic without text). */
    private isWedge(expression: AbstractGraphicalExpression): boolean {
        return expression instanceof GraphicalContinuousDynamicExpression && !expression.IsVerbal;
    }

    /**
     * The horizontal gap between two bounding boxes, 0 if they overlap.
     * @param a First bounding box
     * @param b Second bounding box
     */
    private getHorizontalGap(a: BoundingBox, b: BoundingBox): number {
        const leftA: number = a.RelativePosition.x + a.BorderMarginLeft;
        const rightA: number = a.RelativePosition.x + a.BorderMarginRight;
        const leftB: number = b.RelativePosition.x + b.BorderMarginLeft;
        const rightB: number = b.RelativePosition.x + b.BorderMarginRight;
        if (rightA < leftB) {
            return leftB - rightA;
        }
        if (rightB < leftA) {
            return leftA - rightB;
        }
        return 0;
    }

    /**
     * Get overlap of two bounding boxes
     * @param a First bounding box
     * @param b Second bounding box
     */
    private getOverlap(a: BoundingBox, b: BoundingBox): PointF2D {
        return new PointF2D((a.RelativePosition.x + a.BorderMarginRight) - (b.RelativePosition.x + b.BorderMarginLeft),
                            (a.RelativePosition.y + a.BorderMarginBottom) - (b.RelativePosition.y + b.BorderMarginTop));
    }
}
