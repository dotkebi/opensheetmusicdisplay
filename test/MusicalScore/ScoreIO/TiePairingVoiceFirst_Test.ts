import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { Note } from "../../../src/MusicalScore/VoiceData/Note";
import { SourceMeasure } from "../../../src/MusicalScore/VoiceData/SourceMeasure";

/**
 * Which open tie a tie stop ends (reader, VoiceGenerator.findOpenTie()): a tie whose last note is not later than the
 * stop, the same voice first, then the same staff, then the nearest last note. A stop that finds no tie of its voice
 * waits for the end of the measure (PendingTieStops), since voices are read one after the other.
 *
 * Upstream took the first open tie of the pitch, the lowest key of the voice's staff (Schumann, Myrthen,
 * Die Hochländer-Wittwe m72-73: the RH voice 2 G3 tie from m72 was continued by voice 1's G3 eighth in m73 and ended
 * at voice 2's G3 at the measure's start, 10-07 R-10-1).
 *
 * Fixture (synthetic, piano, 4/4), test_tie_pairing_voice_first.musicxml (the same file as the Dart port's):
 * (1) m1->m2 voice 2 G3 staff 1 -> staff 2, voice 1 (read first in m2) ties its own G3 from beat 2 on into m3;
 * (2) m4->m5 voices 1 and 2 of staff 1 tie A4, read in the opposite orders; (3) m6 voice 2 D5 beat 3 -> voice 1 D5
 * beat 4, voice 1 read first (Du bist wie eine Blume m19); (4) m7->m8 C5 start, C5 start (stop left out), C5 stop;
 * (5) m9->m10 voice 2 F4 -> voice 1 F4 stop+start (read first) -> F4; (6) m11 B4 tied through two chords, the second
 * chord's Bb4 tied from the first (Basie, Straight Ahead m87); (7) m12 a whole E5 tied to the grace E5 after it (an
 * after-grace, at the same timestamp in the model).
 */
describe("Tie pairing, voice first", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    before(async () => {
        container = TestUtils.getDivElement(document);
        container.style.width = "1400px";
        osmd = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore("test_tie_pairing_voice_first.musicxml"));
        osmd.render();
    });
    after(() => {
        osmd.clear();
        container.remove();
    });

    /** The note of the voice at the timestamp (fraction of the whole note) in XML measure measureNumber, the index-th
     *  of its chord. */
    function note(measureNumber: number, voiceId: number, timestamp: number, index: number = 0): Note {
        const measure: SourceMeasure = osmd.Sheet.SourceMeasures[measureNumber - 1];
        for (const verticalContainer of measure.VerticalSourceStaffEntryContainers) {
            for (const staffEntry of verticalContainer.StaffEntries) {
                if (!staffEntry || staffEntry.Timestamp.RealValue !== timestamp) {
                    continue;
                }
                for (const entry of staffEntry.VoiceEntries) {
                    if (entry.ParentVoice.VoiceId !== voiceId) {
                        continue;
                    }
                    const notes: Note[] = entry.Notes.filter(n => !n.isRest());
                    if (notes.length > index) {
                        return notes[index];
                    }
                }
            }
        }
        throw new Error(`no note of voice ${voiceId} at ${timestamp} in m${measureNumber}`);
    }

    /** The notes as "m<measure>@<timestamp>v<voice>" (comparing the notes themselves would print them on failure). */
    function ids(notes: Note[]): string[] {
        return (notes ?? []).map(n => `m${n.SourceMeasure.MeasureNumberXML}@${n.ParentStaffEntry.Timestamp.RealValue}` +
            `v${n.ParentVoiceEntry.ParentVoice.VoiceId}`);
    }

    it("(1) a voice 2 tie across the staves ends at voice 2, not at voice 1", () => {
        const m1g: Note = note(1, 2, 0.75);
        const m2g2: Note = note(2, 2, 0);
        expect(ids(m1g.NoteTie?.Notes)).to.deep.equal(ids([m1g, m2g2]));
        const v1: Note[] = [note(2, 1, 0.25), note(2, 1, 0.5), note(3, 1, 0)];
        expect(ids(v1[0].NoteTie?.Notes)).to.deep.equal(ids(v1));
    });

    it("(2) two voices of one staff each end their own tie", () => {
        const v1: Note[] = [note(4, 1, 0.5), note(5, 1, 0)];
        const v2: Note[] = [note(4, 2, 0.75), note(5, 2, 0)];
        expect(ids(v1[0].NoteTie?.Notes)).to.deep.equal(ids(v1));
        expect(ids(v2[0].NoteTie?.Notes)).to.deep.equal(ids(v2));
    });

    it("(3) a stop read before its tie starts in another voice ends it", () => {
        const start: Note = note(6, 2, 0.5);
        const stop: Note = note(6, 1, 0.75);
        expect(ids(start.NoteTie?.Notes)).to.deep.equal(ids([start, stop]));
    });

    it("(4) a start without a stop is not continued: the stop ends the nearest tie of its voice", () => {
        const a: Note = note(7, 1, 0.5);
        const b: Note = note(7, 1, 0.75);
        const c: Note = note(8, 1, 0);
        expect(ids(b.NoteTie?.Notes)).to.deep.equal(ids([b, c]));
        expect(ids(a.NoteTie?.Notes), "no stop at b").to.deep.equal(ids([a]));
    });

    it("(5) a stop+start of another voice continues the tie through it", () => {
        const notes: Note[] = [note(9, 2, 0.75), note(10, 1, 0), note(10, 1, 0.25)];
        expect(ids(notes[0].NoteTie?.Notes)).to.deep.equal(ids(notes));
    });

    it("(6) a tie never joins two notes of one chord", () => {
        const b4: Note[] = [note(11, 1, 0), note(11, 1, 0.25, 1), note(11, 1, 0.5, 1)];
        const bb4: Note[] = [note(11, 1, 0.25), note(11, 1, 0.5)];
        expect(ids(b4[0].NoteTie?.Notes)).to.deep.equal(ids(b4));
        expect(ids(bb4[0].NoteTie?.Notes)).to.deep.equal(ids(bb4));
    });

    it("(7) a main note is tied to the grace note after it", () => {
        const notes: Note[] = [];
        for (const verticalContainer of osmd.Sheet.SourceMeasures[11].VerticalSourceStaffEntryContainers) {
            for (const staffEntry of verticalContainer.StaffEntries) {
                for (const entry of staffEntry?.VoiceEntries ?? []) {
                    if (entry.ParentVoice.VoiceId === 1) {
                        notes.push(...entry.Notes);
                    }
                }
            }
        }
        const main: Note = notes.find(n => !n.ParentVoiceEntry.IsGrace);
        const grace: Note = notes.find(n => n.ParentVoiceEntry.IsGrace);
        expect(ids(main.NoteTie?.Notes)).to.deep.equal(ids([main, grace]));
    });
});
