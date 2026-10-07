import { AbstractExpression, PlacementEnum } from "../AbstractExpression";
import { MultiExpression } from "../MultiExpression";
import { VoiceEntry } from "../../VoiceEntry";
//Represents the wavy-line element in musicxml
//Technically not an expression, but an ornament... But behaves very much like an expression line.
export class WavyLine extends AbstractExpression {
    constructor(placement: PlacementEnum) {
        super(placement);
    }

    public ParentStartMultiExpression: MultiExpression;
    public ParentEndMultiExpression: MultiExpression;
    /** The grace note's voice entry that the wavy line stops at, if its `<wavy-line type="stop">` is on a grace note, e.g. the
     *  first note of a Nachschlag ending a trill (Legrenzi, Che fiero costume, piano m16: the stop is on grace note E5 before G5).
     *  A grace note shares its main note's timestamp and staff entry, so ParentEndMultiExpression alone can't tell it from a stop
     *  on the main note. Undefined if the wavy line stops at a main note (or doesn't stop).
     */
    public EndGraceVoiceEntry: VoiceEntry;
}
