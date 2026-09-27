import { GraphicalNote } from "../GraphicalNote";
import { VoiceLeadingGuideAnchor } from "../GraphicalVoiceLeadingGuide";
/**
 * Where a voice leading guide attaches to a note, taken from the formatted VexFlow note:
 * the exact notehead of a chord (also when it is displaced), plus its accidental and augmentation dots.
 * Falls back to the layout position of the GraphicalNote if there is no VexFlow notehead, or if the VexFlow
 * note doesn't have its final position yet: VexFlow staves are moved to their place when their measure is
 * drawn, so the notes of a system that wasn't drawn yet (the other side of a system break) only have a layout position.
 */
export declare function vexFlowVoiceLeadingGuideAnchor(graphicalNote: GraphicalNote): VoiceLeadingGuideAnchor;
