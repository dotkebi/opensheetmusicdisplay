import { Note } from "./Note";
import { Fraction } from "../../Common/DataObjects/Fraction";
import { Pitch } from "../../Common/DataObjects/Pitch";
import { TieTypes } from "../../Common/Enums/";
import { PlacementEnum } from "../VoiceData/Expressions/AbstractExpression";
/**
 * A [[Tie]] connects two notes of the same sounding pitch, indicating that they have to be played as a single note.
 */
export declare class Tie {
    constructor(note: Note, type: TieTypes);
    private notes;
    private type;
    TieNumber: number;
    TieDirection: PlacementEnum;
    /** Can contain tie directions at certain note indices.
     *  For example, if it contains {2: PlacementEnum.Below}, then
     *  the tie should go downwards from Tie.Notes[2] onwards,
     *  even if tie.TieDirection is PlacementEnum.Above (tie starts going up on Notes[0]).
     */
    NoteIndexToTieDirection: NoteIndexToPlacementEnum;
    /**
     * Gets the direction of the tie from the given note to the next one: the direction given at that note,
     * or at the last note before it that gives one (see NoteIndexToTieDirection), else TieDirection.
     * @param startNote The note of the tie that the part starts at. Without it, TieDirection.
     * @returns The direction, PlacementEnum.NotYetDefined if none is given.
     */
    getTieDirection(startNote?: Note): PlacementEnum;
    get Notes(): Note[];
    get Type(): TieTypes;
    get StartNote(): Note;
    get Duration(): Fraction;
    get Pitch(): Pitch;
    AddNote(note: Note): void;
}
export interface NoteIndexToPlacementEnum {
    [key: number]: PlacementEnum;
}
