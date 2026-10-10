import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { MusicSheet } from "../../../src/MusicalScore/MusicSheet";

/**
 * Individual 32 P1 fix C, user decision 3 (2026-10-11): an ossia (a staff with <staff-type>ossia</staff-type>, a part named
 * "Ossia...") is not played: its notes are Note.IsPlaybackCueNote, which the players (02front, 03app) skip.
 * test_ossia_playback.musicxml: a cello, an ossia staff shown in measure 2 only, a part named "Ossia".
 * Same as osmd-dart test/ossia_playback_test.dart.
 */
describe("Ossia playback", () => {
    function notes(sheet: MusicSheet, instrument: number): string[] {
        const result: string[] = [];
        for (const voice of sheet.Instruments[instrument].Voices) {
            for (const entry of voice.VoiceEntries) {
                for (const note of entry.Notes) {
                    if (!note.isRest()) {
                        result.push(note.IsPlaybackCueNote ? `(${note.Pitch.ToStringShort()})` : note.Pitch.ToStringShort());
                    }
                }
            }
        }
        return result;
    }

    it("doesn't play an ossia staff or a part named Ossia", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_ossia_playback.musicxml"));
        expect(notes(osmd.Sheet, 0).some(note => note.startsWith("(")), "the cello is played").to.equal(false);
        expect(notes(osmd.Sheet, 1).length).to.equal(1);
        expect(notes(osmd.Sheet, 1).every(note => note.startsWith("(")), "the ossia staff").to.equal(true);
        expect(notes(osmd.Sheet, 2).length).to.equal(2);
        expect(notes(osmd.Sheet, 2).every(note => note.startsWith("(")), "the part named Ossia").to.equal(true);
        container.remove();
    });
});
