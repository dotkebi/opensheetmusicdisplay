import { PointF2D } from "../../../Common/DataObjects/PointF2D";
import { GraphicalNote } from "../GraphicalNote";
import { VoiceLeadingGuideAnchor, VoiceLeadingGuideBox } from "../GraphicalVoiceLeadingGuide";
import { unitInPixels } from "./VexFlowMusicSheetDrawer";
import { VexFlowGraphicalNote } from "./VexFlowGraphicalNote";

/** Half the height of a notehead, in units (a notehead is one staff space high). */
const noteheadHalfHeight: number = 0.5;
/** Extent of an accidental above and below the center of its notehead, in units. */
const accidentalHalfHeight: number = 1.35;
const dotHalfHeight: number = 0.3;
/** VexFlow positions further away than this from the layout position of the note aren't final (in units). */
const maxDistanceToLayoutPosition: number = 1.5;

/**
 * Where a voice leading guide attaches to a note, taken from the formatted VexFlow note:
 * the exact notehead of a chord (also when it is displaced), plus its accidental and augmentation dots.
 * Falls back to the layout position of the GraphicalNote if there is no VexFlow notehead, or if the VexFlow
 * note doesn't have its final position yet: VexFlow staves are moved to their place when their measure is
 * drawn, so the notes of a system that wasn't drawn yet (the other side of a system break) only have a layout position.
 */
export function vexFlowVoiceLeadingGuideAnchor(graphicalNote: GraphicalNote): VoiceLeadingGuideAnchor {
    const fallback: VoiceLeadingGuideAnchor = {
        boxes: [],
        center: new PointF2D(graphicalNote.PositionAndShape.AbsolutePosition.x, graphicalNote.PositionAndShape.AbsolutePosition.y),
        headHalfHeight: noteheadHalfHeight,
        headHalfWidth: 0.6,
    };
    const vfGraphicalNote: VexFlowGraphicalNote = graphicalNote as VexFlowGraphicalNote;
    const vfNote: any = vfGraphicalNote.vfnote?.[0];
    const index: number = vfGraphicalNote.vfnote?.[1];
    const notehead: any = vfNote?.note_heads?.[index];
    if (!notehead) {
        return fallback;
    }
    try {
        const headX: number = notehead.getAbsoluteX();
        const headY: number = notehead.getY();
        const headWidth: number = notehead.getWidth();
        if (!Number.isFinite(headX) || !Number.isFinite(headY) || !(headWidth > 0)) {
            return fallback;
        }
        const anchor: VoiceLeadingGuideAnchor = {
            boxes: [],
            center: new PointF2D((headX + headWidth / 2) / unitInPixels, headY / unitInPixels),
            headHalfHeight: noteheadHalfHeight,
            headHalfWidth: headWidth / 2 / unitInPixels,
        };
        if (Math.abs(anchor.center.x - fallback.center.x) > maxDistanceToLayoutPosition ||
            Math.abs(anchor.center.y - fallback.center.y) > maxDistanceToLayoutPosition) {
            return fallback;
        }
        for (const modifier of vfNote.modifiers ?? []) {
            if (modifier.getIndex?.() !== index) {
                continue;
            }
            const category: string = modifier.getCategory?.();
            if (category !== "accidentals" && category !== "dots") {
                continue;
            }
            const start: { x: number, y: number } = vfNote.getModifierStartXY(modifier.getPosition(), index);
            const width: number = modifier.getWidth();
            let box: VoiceLeadingGuideBox;
            if (category === "accidentals") {
                // drawn right-aligned at start.x + x_shift
                const right: number = start.x + modifier.x_shift;
                box = {
                    halfHeight: accidentalHalfHeight,
                    halfWidth: width / 2 / unitInPixels,
                    x: (right - width / 2) / unitInPixels,
                    y: start.y / unitInPixels,
                };
            } else {
                const left: number = start.x + modifier.x_shift;
                const lineSpacing: number = vfNote.getStave?.()?.getSpacingBetweenLines?.() ?? unitInPixels;
                box = {
                    halfHeight: dotHalfHeight,
                    halfWidth: width / 2 / unitInPixels,
                    x: (left + width / 2) / unitInPixels,
                    y: (start.y + (modifier.dot_shiftY ?? 0) * lineSpacing) / unitInPixels,
                };
            }
            if (Number.isFinite(box.x) && Number.isFinite(box.y) && box.halfWidth > 0) {
                anchor.boxes.push(box);
            }
        }
        return anchor;
    } catch (err) {
        return fallback; // e.g. note not formatted
    }
}
