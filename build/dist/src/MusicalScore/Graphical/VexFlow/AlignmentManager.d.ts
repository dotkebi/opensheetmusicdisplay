import { StaffLine } from "../StaffLine";
export declare class AlignmentManager {
    private parentStaffline;
    private rules;
    constructor(staffline: StaffLine);
    alignDynamicExpressions(): void;
    /**
     * Whether two expressions that aren't wedges overlap horizontally, comparing their text without the margins.
     * Aligning them would draw one on the other, e.g. "p cresc." from one direction: "cresc." starts at the p's center and
     * is placed below it. A wedge is squeezed away from its neighbors in the group instead, see alignDynamicExpressions().
     * @param a First expression
     * @param b Second expression
     */
    private textsOverlap;
    /**
     * Limits the shift of a group member away from the staff, so that it stops at an expression placed further out at the same
     * x that isn't in the group, e.g. at the "dim." placed above the ff of "ff dim." when the ff moves up to an expression before it.
     * @param expression The group member
     * @param shiftY The shift towards the group's y position (negative: up)
     * @param group The members of the group, which move together
     */
    private limitShift;
    /** Whether the expression is a crescendo or decrescendo wedge (a continuous dynamic without text). */
    private isWedge;
    /**
     * Get distance between two bounding boxes
     * @param a First bounding box
     * @param b Second bounding box
     */
    private getDistance;
    /**
     * Get overlap of two bounding boxes
     * @param a First bounding box
     * @param b Second bounding box
     */
    private getOverlap;
}
