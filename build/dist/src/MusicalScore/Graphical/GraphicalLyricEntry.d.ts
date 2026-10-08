import { LyricsEntry } from "../VoiceData/Lyrics/LyricsEntry";
import { GraphicalLyricWord } from "./GraphicalLyricWord";
import { GraphicalLabel } from "./GraphicalLabel";
import { GraphicalStaffEntry } from "./GraphicalStaffEntry";
/**
 * The graphical counterpart of a [[LyricsEntry]]
 */
export declare class GraphicalLyricEntry {
    private lyricsEntry;
    private graphicalLyricWord;
    private graphicalLabel;
    private graphicalStaffEntry;
    /** The relative position of the label before the first layout calculation, see resetPosition(). */
    private initialLabelRelativePosition;
    /** The label's x relative to its staff entry from the alignment alone (optically left-aligned lyrics start 1 unit left
     *  of the entry, short syllables are shifted right), before any grace note placement, see placeAtGraceNote(). */
    private labelXOffset;
    /** How far the label is moved from its staff entry to the grace note the syllable is sung on, 0 for a syllable on a
     *  main note, see placeAtGraceNote(). */
    private graceXShift;
    constructor(lyricsEntry: LyricsEntry, graphicalStaffEntry: GraphicalStaffEntry, lyricsHeight: number, staffHeight: number);
    /**
     * Places the label at the grace note the syllable is sung on: x units from the staff entry (which is at the main note
     * the grace note belongs to), with the same alignment as at a main note. A syllable on a grace note was placed at the
     * staff entry like one on the main note, and the two overlapped (Legrenzi, Che fiero costume m18: "in" on the grace note
     * and "me" on the main note read as a bold "ine"). Called after each formatting (VexFlowStaffEntry.calculateXPosition()),
     * the placement is absolute, so a re-render doesn't add it up.
     */
    placeAtGraceNote(x: number): void;
    get GraceXShift(): number;
    /**
     * Puts the label back where it was before the first layout calculation, called before each calculation.
     * MusicSheetCalculator.calculateSingleStaffLineLyricsPosition() moves the label below the staffline, but the bounding box
     * of the staff entry is calculated from its children (including the label) before that, e.g. in
     * VexFlowStaffEntry.calculateXPosition(). Without the reset, a re-render would include the previous render's position of
     * the label there, where the first render included the initial one - e.g. after a resize, a staff entry whose lyrics were
     * lower in the previous layout kept that lower bottom border, making the page taller.
     * The first call takes the snapshot of the initial position.
     */
    resetPosition(): void;
    hasDashFromLyricWord(): boolean;
    get LyricsEntry(): LyricsEntry;
    get ParentLyricWord(): GraphicalLyricWord;
    /** The word this entry begins with the second syllable of its elision (LyricsEntry.NextWord), if any. */
    NextLyricWord: GraphicalLyricWord;
    set ParentLyricWord(value: GraphicalLyricWord);
    get GraphicalLabel(): GraphicalLabel;
    set GraphicalLabel(value: GraphicalLabel);
    get StaffEntryParent(): GraphicalStaffEntry;
    set StaffEntryParent(value: GraphicalStaffEntry);
}
