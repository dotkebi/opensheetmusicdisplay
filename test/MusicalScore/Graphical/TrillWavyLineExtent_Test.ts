import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowVibratoBracket } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVibratoBracket";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { Pitch } from "../../../src/Common/DataObjects/Pitch";
import Vex from "vexflow";

/**
 * A trill's wavy line runs from its main note to where it stops (Legrenzi, Che fiero costume, piano m16 and m32,
 * solo vocal review E12-F05): `<wavy-line type="start">` is on the chord note F#5 over D5, which was read at the
 * time after the chord (the reader's current time had passed it), so the line started at the grace notes before the
 * next note. Same as the osmd-dart test/trill_wavy_line_extent_test.dart.
 */
describe("Trill wavy line extent", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_trill_wavy_line_extent.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    function brackets(): VexFlowVibratoBracket[] {
        const result: VexFlowVibratoBracket[] = [];
        for (const page of osmd.GraphicSheet.MusicPages) {
            for (const system of page.MusicSystems) {
                for (const staffLine of system.StaffLines as StaffLine[]) {
                    result.push(...(staffLine.WavyLines as VexFlowVibratoBracket[]));
                }
            }
        }
        return result;
    }
    function where(bracket: VexFlowVibratoBracket, start: boolean): string {
        const entry: any = (start ? bracket.startVfVoiceEntry : bracket.endVfVoiceEntry).parentStaffEntry;
        return `m${entry.parentMeasure.MeasureNumber}@${entry.relInMeasureTimestamp.toString()}`;
    }

    it("starts at the trill's note, also a chord note, and ends at its stop", () => {
        // one span per wavy line: from its first piece's start to its last piece's end (a system break splits it)
        const spans: string[] = [];
        let previous: VexFlowVibratoBracket = undefined;
        for (const bracket of brackets()) {
            if (previous?.getWavyLine === bracket.getWavyLine) {
                spans[spans.length - 1] = spans[spans.length - 1].split("-")[0] + "-" + where(bracket, false);
            } else {
                spans.push(`${where(bracket, true)}-${where(bracket, false)}`);
            }
            previous = bracket;
        }
        expect(spans).to.deep.equal([
            "m1@1/4-m1@5/8", // chord note F#5 (D5 at 1/4) to the grace notes' entry (G5)
            "m2@1/4-m2@5/8",
            "m3@3/4-m4@0/1", // into the next measure
        ]);
    });
});

/**
 * A trill's wavy line that stops on a grace note ends at that grace note (Legrenzi, Che fiero costume, piano m16·17·32·33,
 * solo vocal review E12/E13: the stop is on grace note E5, the first note of the Nachschlag before G5, and the source score's
 * line ends there). A grace note has its main note's timestamp and staff entry, and since upstream 2ba42039 a wavy line
 * attaches to a staff entry's main note, so the line went on to the end of G5. Start behaviour stays upstream's (main note
 * first). Same as the osmd-dart test/trill_wavy_line_extent_test.dart.
 */
describe("Trill wavy line stopping on a grace note", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_wavy_line_grace_stop.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    function brackets(): VexFlowVibratoBracket[] {
        const result: VexFlowVibratoBracket[] = [];
        for (const page of osmd.GraphicSheet.MusicPages) {
            for (const system of page.MusicSystems) {
                for (const staffLine of system.StaffLines as StaffLine[]) {
                    result.push(...(staffLine.WavyLines as VexFlowVibratoBracket[]));
                }
            }
        }
        return result;
    }
    /** e.g. "F#5", or "grace En5" (E natural) */
    function noteName(voiceEntry: VexFlowVoiceEntry): string {
        const pitch: Pitch = voiceEntry.notes[voiceEntry.notes.length - 1].sourceNote.Pitch;
        return `${voiceEntry.parentVoiceEntry.IsGrace ? "grace " : ""}${pitch.ToStringShort(3)}`;
    }
    /** where VexFlowPatch vibratobracket.js ends a bracket that ends at its end note: the end of the note */
    function endOfNote(note: Vex.Flow.StemmableNote): number {
        const metrics: any = (note as any).getMetrics();
        return note.getAbsoluteX() + note.getWidth() - metrics.modLeftPx - metrics.extraLeftPx;
    }

    it("ends at the grace note it stops on, and at the main note otherwise", () => {
        const lines: string[] = brackets().map((bracket: VexFlowVibratoBracket): string => {
            let end: string = "at the end of the end note";
            if (bracket.ToEndOfStopStave) {
                end = "at the end of the measure";
            } else if (bracket.nextVfVoiceEntry) {
                end = `in front of ${noteName(bracket.nextVfVoiceEntry)}`;
            }
            const measureNumber: number = bracket.startVfVoiceEntry.parentStaffEntry.parentMeasure.MeasureNumber;
            return `m${measureNumber} ${noteName(bracket.startVfVoiceEntry)}-${noteName(bracket.endVfVoiceEntry)}, ${end}`;
        });
        expect(lines, lines.join("; ")).to.deep.equal([
            "m1 F#5-grace En5, at the end of the end note", // the stop's grace note, not G5 (upstream 2ba42039)
            "m2 F#5-G5, at the end of the end note", // a stop on the main note after the grace notes: upstream's
            "m3 F#5-grace F#5, at the end of the end note", // the second grace note
            "m4 B4-grace A4, at the end of the end note", // a Nachschlag at the end of the measure: not to the measure's end
        ]);
    });

    it("draws the line from the trill mark to the end of the grace note, in front of the main note after it", () => {
        for (const bracket of brackets().filter((b: VexFlowVibratoBracket): boolean => b.EndsAtGraceNote)) {
            const where: string = `m${bracket.startVfVoiceEntry.parentStaffEntry.parentMeasure.MeasureNumber}`;
            const grace: Vex.Flow.StemmableNote = bracket.endNote;
            expect(grace instanceof Vex.Flow.GraceNote, `${where} end note is a Vexflow grace note`).to.equal(true);
            const stopX: number = endOfNote(grace);
            expect(stopX, `${where} stop right of the grace note's x`).to.be.greaterThan(grace.getAbsoluteX());
            const mainNote: Vex.Flow.StemmableNote = bracket.endVfVoiceEntry.parentStaffEntry.graphicalVoiceEntries
                .map((gve: VexFlowVoiceEntry) => gve.vfStaveNote)
                .find((note: Vex.Flow.StemmableNote) => note && !(note instanceof Vex.Flow.GraceNote));
            if (!bracket.endVfVoiceEntry.parentVoiceEntry.GraceAfterMainNote) {
                expect(stopX, `${where} stop ${stopX} in front of the main note at ${mainNote.getAbsoluteX()}`)
                    .to.be.lessThan(mainNote.getAbsoluteX());
            } else {
                expect(stopX, `${where} stop ${stopX} right of the main note at ${mainNote.getAbsoluteX()}`)
                    .to.be.greaterThan(mainNote.getAbsoluteX());
            }
            const startNote: any = bracket.startNote;
            expect(stopX, `${where} stop ${stopX} right of the start note`).to.be.greaterThan(startNote.getNoteHeadEndX());
        }
    });
});
