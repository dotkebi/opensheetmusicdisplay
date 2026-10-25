import { MultiExpression } from "../MultiExpression";
import { PlacementEnum } from "../AbstractExpression";

export class Pedal {
    constructor(line: boolean = false, sign: boolean = true) {
        this.line = line;
        this.sign = sign;
    }

    private line: boolean;
    private sign: boolean;
    public StaffNumber: number;
    public ParentStartMultiExpression: MultiExpression;
    public ParentEndMultiExpression: MultiExpression;
    public ChangeEnd: boolean = false;
    public ChangeBegin: boolean = false;
    /** Whether the stop has sign="no": the pedal is released without a release sign (*), e.g. retaken by the next Ped.
     *  alone */
    public ReleaseHidden: boolean = false;
    /** Whether the pedal ends at the stave end (and not before the endNote) */
    public EndsStave: boolean = false;
    /** Whether the pedal begins at the stave beginning (and not before the startNote - e.g. for whole measure rest) */
    public BeginsStave: boolean = false;
    /** The direction's placement: a pedal with placement="above" is drawn above its staff, as engraved (Schumann Op.47 IV
     *  m199–274, Viotti No.22 I·III: Ped. and * over the bass staff). Below by default. */
    public Placement: PlacementEnum = PlacementEnum.Below;
    /** <pedal relative-x> of the start, in tenths: the Ped. moves by it from where its time puts it. */
    public RelativeX: number = 0;
    /** <pedal relative-x> of the stop, in tenths: the * moves by it from where its time puts it (Viotti No.22 I m45,
     *  III: a release between two notes). */
    public ReleaseRelativeX: number = 0;
    /** A stop that closed no pedal: the engraver's * without a Ped. before it (Viotti No.22 III m244 after a pedal already
     *  released, Schumann Op.47 II m260). Only the * is drawn, at the stop; start and end expression are one. */
    public ReleaseOnly: boolean = false;

    public get IsLine(): boolean {
        return this.line;
    }
    public get IsSign(): boolean {
        return this.sign;
    }
}
