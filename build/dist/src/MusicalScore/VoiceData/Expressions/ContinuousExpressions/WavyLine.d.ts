import { AbstractExpression, PlacementEnum } from "../AbstractExpression";
import { MultiExpression } from "../MultiExpression";
import { VoiceEntry } from "../../VoiceEntry";
export declare class WavyLine extends AbstractExpression {
    constructor(placement: PlacementEnum);
    ParentStartMultiExpression: MultiExpression;
    ParentEndMultiExpression: MultiExpression;
    /** The grace note's voice entry that the wavy line stops at, if its `<wavy-line type="stop">` is on a grace note, e.g. the
     *  first note of a Nachschlag ending a trill (Legrenzi, Che fiero costume, piano m16: the stop is on grace note E5 before G5).
     *  A grace note shares its main note's timestamp and staff entry, so ParentEndMultiExpression alone can't tell it from a stop
     *  on the main note. Undefined if the wavy line stops at a main note (or doesn't stop).
     */
    EndGraceVoiceEntry: VoiceEntry;
}
