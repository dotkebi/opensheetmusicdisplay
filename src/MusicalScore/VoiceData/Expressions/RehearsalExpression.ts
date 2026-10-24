import { AbstractExpression, PlacementEnum } from "./AbstractExpression";

export class RehearsalExpression extends AbstractExpression {
    /** @param staffIndex the staff the mark was read on, as an index into MusicSheet.Staves (the column index of
     *  GraphicalMusicSheet.MeasureList); undefined = the system's first staff. */
    constructor(label: string, placement: PlacementEnum, staffIndex?: number) {
        super(placement);
        this.label = label;
        this.staffIndex = staffIndex;
    }

    public label: string;
    /** The staff the mark belongs to (index into MusicSheet.Staves). The mark is drawn above that staff's part, as printed
     *  (user decision 10-24: Weber Op. 74 III piano 28-52, Haydn Hob. VIIg:C1 I piano A-C, Saint-Saëns Op. 61 piano D/F),
     *  not hoisted to the system's first staff. */
    public staffIndex: number;
}
