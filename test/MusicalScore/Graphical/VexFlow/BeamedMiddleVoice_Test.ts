/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { TestUtils } from "../../../Util/TestUtils";

function note(step: string, alter: number, octave: number, duration: number, type: string, voice: number, stem: string,
              beams: string[] = []): string {
    return `<note><pitch><step>${step}</step>${alter ? `<alter>${alter}</alter>` : ""}<octave>${octave}</octave></pitch>` +
        `<duration>${duration}</duration><voice>${voice}</voice><type>${type}</type><stem>${stem}</stem>` +
        beams.map((b, i) => `<beam number="${i + 1}">${b}</beam>`).join("") + "</note>";
}

/**
 * Bowen, viola sonata No. 2, the piano's right hand in m817 (2/4): the upper voice's D5 F5 eighths beamed with their
 * stems down, over the lower voice's Bb4 A4 eighths beamed with their stems down too.
 */
const BOWEN: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>P</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>-1</fifths></key>
        <time><beats>2</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
${[
    note("A", 0, 5, 2, "eighth", 1, "up"),
    note("D", 0, 5, 2, "eighth", 1, "down", ["begin"]),
    note("F", 0, 5, 2, "eighth", 1, "down", ["end"]),
    note("D", 0, 5, 1, "16th", 1, "up", ["begin", "begin"]),
    note("E", 0, 5, 1, "16th", 1, "up", ["end", "end"]),
    "<backup><duration>8</duration></backup>",
    note("C", 0, 5, 2, "eighth", 2, "down"),
    note("B", -1, 4, 2, "eighth", 2, "down", ["begin"]),
    note("A", 0, 4, 2, "eighth", 2, "down", ["end"]),
    note("A", -1, 4, 2, "eighth", 2, "down"),
].join("\n")}
    </measure>
  </part>
</score-partwise>`;

/**
 * Two voices with their stems the same way, the upper one beamed over the lower one's heads (81sabo renderer row
 * BOWEN-B-RENDER-WEB817, user decision 2026-11-15). VexFlow's StaveNote.format() shortened the upper voice's stems to
 * end above the lower voice's heads and left both at one x; the beam then set the stems again and ran through the
 * lower voice's heads. VexFlowPatch (BEAMED_MIDDLE_VOICE) keeps the beamed upper voice's stems and moves it right of
 * the lower voice instead, as VexFlow 5 does (osmd-dart).
 */
describe("Beamed upper voice over a lower voice with stems the same way", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(() => {
        container = TestUtils.getDivElement(document);
        container.style.width = "1024px";
        osmd = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    async function render(): Promise<VexFlowMeasure> {
        await osmd.load(BOWEN);
        osmd.render();
        return osmd.GraphicSheet.MeasureList[0][0] as VexFlowMeasure;
    }

    /** the StaveNotes of a voice at the staff entries of the beamed eighths (the second and third eighth) */
    function beamedNotes(measure: VexFlowMeasure, voiceId: number): any[] {
        return [0.125, 0.25].map((timestamp) => {
            const entry: any = measure.staffEntries.find((se) => Math.abs(se.sourceStaffEntry.Timestamp.RealValue - timestamp) < 1e-6);
            expect(entry, `a staff entry at ${timestamp}`).to.not.be.undefined;
            const gve: VexFlowVoiceEntry = (entry.graphicalVoiceEntries as VexFlowVoiceEntry[]).find(
                (g) => g.parentVoiceEntry.ParentVoice.VoiceId === voiceId);
            expect(gve, `voice ${voiceId} at ${timestamp}`).to.not.be.undefined;
            return (gve as any).vfStaveNote;
        });
    }

    it("moves the beamed upper voice right of the lower voice's heads", async () => {
        const measure: VexFlowMeasure = await render();
        const upper: any[] = beamedNotes(measure, 1);
        const lower: any[] = beamedNotes(measure, 2);
        for (let i: number = 0; i < 2; i++) {
            const lowerRight: number = lower[i].getNoteHeadEndX();
            expect(upper[i].getNoteHeadBeginX(), `the upper head ${upper[i].getKeys()} right of ${lower[i].getKeys()}`)
                .to.be.at.least(lowerRight - 1);
        }
    });

    it("keeps the upper voice's beam off the lower voice's heads", async () => {
        const measure: VexFlowMeasure = await render();
        const upper: any[] = beamedNotes(measure, 1);
        const lower: any[] = beamedNotes(measure, 2);
        const beam: any = upper[0].beam;
        expect(beam, "the upper voice's D5 F5 are beamed").to.not.be.undefined;
        const space: number = measure.getVFStave().getSpacingBetweenLines();
        const firstX: number = beam.getNotes()[0].getStemX();
        const lastX: number = beam.getNotes()[beam.getNotes().length - 1].getStemX();
        const width: number = beam.render_options.beam_width;
        for (const n of lower) {
            const left: number = n.getNoteHeadBeginX();
            const right: number = n.getNoteHeadEndX();
            if (right <= firstX || left >= lastX) {
                continue;
            }
            const headY: number = n.getYs()[0];
            for (const x of [Math.max(left, firstX), Math.min(right, lastX)]) {
                const line: number = beam.getSlopeY(x, firstX, beam.getBeamYToDraw(), beam.slope);
                // stems down: the beam block is from line - width to line
                const overlap: boolean = line > headY - space / 2 && line - width < headY + space / 2;
                expect(overlap, `the beam at x=${x.toFixed(1)} through the head ${n.getKeys()}`).to.equal(false);
            }
        }
    });
});
