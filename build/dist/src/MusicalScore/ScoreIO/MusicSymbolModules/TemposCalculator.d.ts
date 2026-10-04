import { IAfterSheetReadingModule } from "../../Interfaces";
import { MusicSheet } from "../../MusicSheet";
import { MultiTempoExpression } from "../../VoiceData/Expressions/MultiTempoExpression";
/** Process the TempoExpressions of a MusicSheet
 *
 * \details This class exposes one method: #calculate
 * to implement #IAfterSheetReadingModule
 */
export declare class TemposCalculator implements IAfterSheetReadingModule {
    /** This is the method exposed for #IAfterSheetReadingModule */
    calculate(musicSheet: MusicSheet): void;
    /** This is where the work is done.
     *
     * - [1] all MultiTempoExpressions are read from the MusicSheet
     * - they are sorted in priority order (#myTempoSorter.Compare)
     * - [2] all Inst Tempos are given a BPM if needed
     * - all Inst and Cont tempos for a single TimeStamp are consolidated
     * - [3] ContinuousTempo values are calculated
     */
    private static processTempoExpressions;
    /** Clean the start of the  expressions list and return the TempoPrimo BPM.
     *
     * Use the initial setting until the first playback instruction, or resolve an instruction at time zero.
     * Return that BPM for TempoPrimo; a later instruction must not become the starting tempo.
     */
    private static cleanExpListStartingEntry;
}
export declare class TempoSorter {
    /** Sort for processing
     *
     * \details Sort by AbsoluteTimeStamp, followed by metronomeMark, Inst, atempo, tempoprimo, Cont
     */
    static Compare(x: MultiTempoExpression, y: MultiTempoExpression): number;
    static calcSortPriority(z: MultiTempoExpression): number;
    static CompareNumber(a: number, b: number): number;
}
