import { PlacementEnum } from "./Expressions/AbstractExpression";
import { ArticulationEnum } from "./VoiceEntry";
export declare class Articulation {
    placement: PlacementEnum;
    articulationEnum: ArticulationEnum;
    /** The `<breath-mark>` value of a breath mark (comma otherwise). */
    breathMark: BreathMarkValue;
    constructor(articulationEnum: ArticulationEnum, placement: PlacementEnum);
    Equals(otherArticulation: Articulation): boolean;
}
/** MusicXML breath-mark-value: an empty `<breath-mark/>` is a comma. */
export declare enum BreathMarkValue {
    comma = 0,
    tick = 1,
    upbow = 2,
    salzedo = 3
}
export declare function breathMarkValueFromXml(value: string): BreathMarkValue;
