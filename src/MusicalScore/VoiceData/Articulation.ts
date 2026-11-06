import { PlacementEnum } from "./Expressions/AbstractExpression";
import { ArticulationEnum } from "./VoiceEntry";

export class Articulation {
    public placement: PlacementEnum;
    // TODO distinguish and save both placementXML and placementRendered
    public articulationEnum: ArticulationEnum;
    /** The `<breath-mark>` value of a breath mark (comma otherwise). */
    public breathMark: BreathMarkValue = BreathMarkValue.comma;
    /** False for an articulation of a `<notations print-object="no">`: played, not drawn. */
    public printObject: boolean = true;

    constructor(articulationEnum: ArticulationEnum, placement: PlacementEnum) {
        this.articulationEnum = articulationEnum;
        this.placement = placement; // undefined by default, to not restrict placement
    }

    public Equals(otherArticulation: Articulation): boolean {
        return otherArticulation.articulationEnum === this.articulationEnum && otherArticulation.placement === this.placement &&
            otherArticulation.breathMark === this.breathMark && otherArticulation.printObject === this.printObject;
    }
}

/** MusicXML breath-mark-value: an empty `<breath-mark/>` is a comma. */
export enum BreathMarkValue {
    comma,
    tick,
    upbow,
    salzedo,
}

export function breathMarkValueFromXml(value: string): BreathMarkValue {
    switch (value?.trim()) {
        case "tick": return BreathMarkValue.tick;
        case "upbow": return BreathMarkValue.upbow;
        case "salzedo": return BreathMarkValue.salzedo;
        default: return BreathMarkValue.comma;
    }
}
