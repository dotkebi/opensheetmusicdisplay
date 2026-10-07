import { WavyLine } from "../../VoiceData/Expressions/ContinuousExpressions/WavyLine";
import { BoundingBox } from "../BoundingBox";
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";
import { GraphicalWavyLine } from "../GraphicalWavyLine";
import { VexFlowVoiceEntry } from "./VexFlowVoiceEntry";
import Vex from "vexflow";
export declare class VexFlowVibratoBracket extends GraphicalWavyLine {
    /** Defines the note where the bracket starts */
    startNote: Vex.Flow.StemmableNote;
    /** Defines the note where the bracket ends */
    endNote: Vex.Flow.StemmableNote;
    startVfVoiceEntry: VexFlowVoiceEntry;
    endVfVoiceEntry: VexFlowVoiceEntry;
    /** The voice entry after the end note in its voice, which the bracket ends in front of when it covers the end note's
     *  whole duration (see coverEndNoteDuration()). */
    nextVfVoiceEntry: VexFlowVoiceEntry;
    line: number;
    private isVibrato;
    private toEndOfStopStave;
    get ToEndOfStopStave(): boolean;
    constructor(wavyLine: WavyLine, parentBBox: BoundingBox, tabVibrato?: boolean);
    /**
     * Set a start note using a staff entry
     * @param graphicalStaffEntry the staff entry that holds the start note
     */
    setStartNote(graphicalStaffEntry: GraphicalStaffEntry): boolean;
    /**
     * Set an end note using a staff entry
     * @param graphicalStaffEntry the staff entry that holds the end note
     */
    setEndNote(graphicalStaffEntry: GraphicalStaffEntry): boolean;
    /**
     * Lets the bracket cover the whole duration of its end note: it ends in front of the next note in the end note's voice,
     * or at the end of the measure if the end note is the last one of its voice there.
     * Otherwise it ends at the end of the end note. A bracket that starts and stops at the same note then ends left of the end
     * of the note's trill mark, where its wavy line starts, so it is drawn as a stub or not at all.
     */
    coverEndNoteDuration(): void;
    /**
     * Finds the voice entry that follows a voice entry in its voice and measure. Grace notes before a main note are skipped:
     * the main note is found instead, its left edge includes them. Grace notes after the voice entry's note count, e.g. a
     * Nachschlag ending a trill, which shares the note's staff entry.
     * @param voiceEntry the voice entry to find the next one of
     */
    private findNextVoiceEntryInVoice;
    /**
     * Finds the voice entry of the note in a staff entry that the wavy line attaches to: the first one with a Vexflow note,
     * preferring a main note to a grace note. Grace notes before their main note share its staff entry and come first,
     * e.g. an acciaccatura before a trill, but the trill mark and its wavy line belong to the main note.
     * @param graphicalStaffEntry the staff entry that holds the note
     */
    private findNoteVoiceEntry;
    CalculateBoundingBox(): void;
    getVibratoBracket(): Vex.Flow.VibratoBracket;
}
