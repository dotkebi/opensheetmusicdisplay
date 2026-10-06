import { expect } from "chai";
import { TestUtils } from "../../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { Arpeggio } from "../../../../src/MusicalScore/VoiceData/Arpeggio";

/**
 * An arpeggio whose notes are spread over several voice entries (a chord written voice by voice, <arpeggiate> on each
 * note; Schumann, Myrthen: Jemand m33, Talismane m28/30, Lied der Suleika m41, Lieder der Braut I m47/48) is drawn once,
 * as one wavy line on the voice entry it was read with, spanning the notes of all participating voices - and, with the
 * same <arpeggiate number>, the notes on the other staff of the instrument. Before, the stroke was only drawn when that
 * first voice entry itself had two or more notes, so these arpeggios were not drawn at all.
 *
 * Fixture (synthetic, 2 staves, 4/4), see test_arpeggio_across_voices.musicxml:
 *  m1 staff 1: v1 D5 + v2 E4 (both arpeggiate 1), v3 C6 without arpeggio
 *  m2 staff 1: v1 A5 + v2 chord B3 F4 G4 (all arpeggiate)
 *  m3 staff 1 v1 F#4 (arpeggiate 1) + staff 2 v5 chord D3 F#3 C4 (arpeggiate 1)
 *  m4 staff 1: v1 chord C4 E4 G4 (arpeggiate), one voice
 *  m5 staff 1 v1 chord G4 B4 (arpeggiate) + staff 2 v5 chord C3 E3 (arpeggiate), no number
 *  m6 staff 1 v1 chord G4 B4 (arpeggiate 2) + staff 2 v5 chord C3 E3 (arpeggiate 2)
 *
 * Across the staves, the same number links the arpeggios only when one staff holds a single note (m3; it is no
 * arpeggio by itself). Two chords with the same number (m6; Schumann, Jemand m10/20/21) stay two wavy lines, as engraved.
 */
describe("Arpeggio across voices and staves", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    interface FoundStroke { stroke: any, voiceId: number, staff: number }

    before(async () => {
        container = TestUtils.getDivElement(document);
        container.style.width = "1400px";
        osmd = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore("test_arpeggio_across_voices.musicxml"));
        osmd.render();
    });
    after(() => {
        osmd.clear();
        container.remove();
    });

    function strokesIn(measureIndex: number): FoundStroke[] {
        const found: FoundStroke[] = [];
        for (let staff: number = 0; staff < 2; staff++) {
            const measure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[measureIndex][staff];
            for (const staffEntry of measure.staffEntries) {
                for (const gve of staffEntry.graphicalVoiceEntries) {
                    const note: any = (gve as VexFlowVoiceEntry).vfStaveNote;
                    if (!note) {
                        continue;
                    }
                    for (const modifier of note.getModifiers()) {
                        if (modifier.getCategory() === "strokes") {
                            found.push({ stroke: modifier, voiceId: gve.parentVoiceEntry.ParentVoice.VoiceId, staff });
                        }
                    }
                }
            }
        }
        return found;
    }

    /** Sorted VexFlow y values (top first) of the first non-rest voice entry of voiceId in the measure, on staff. */
    function ys(measureIndex: number, staff: number, voiceId: number): number[] {
        const measure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[measureIndex][staff];
        for (const staffEntry of measure.staffEntries) {
            for (const gve of staffEntry.graphicalVoiceEntries) {
                const note: any = (gve as VexFlowVoiceEntry).vfStaveNote;
                if (gve.parentVoiceEntry.ParentVoice.VoiceId === voiceId && note && !gve.parentVoiceEntry.Notes[0].isRest()) {
                    return (note.getYs() as number[]).slice().sort((a, b) => a - b);
                }
            }
        }
        throw new Error(`no voice ${voiceId} in measure ${measureIndex} staff ${staff}`);
    }

    it("(a) two single-note voices share one stroke covering both notes", () => {
        const strokes: FoundStroke[] = strokesIn(0);
        expect(strokes.length).to.equal(1);
        expect(strokes[0].voiceId, "drawn on the first voice read").to.equal(1);
        expect(strokes[0].staff).to.equal(0);
        expect(strokes[0].stroke.drawn_top_y, "top: D5 of voice 1").to.equal(ys(0, 0, 1)[0]);
        expect(strokes[0].stroke.drawn_bot_y, "bottom: E4 of voice 2").to.equal(ys(0, 0, 2)[0]);
    });

    it("(d) a third voice at the same time without arpeggio is not spanned", () => {
        const stroke: any = strokesIn(0)[0].stroke;
        expect(ys(0, 0, 3)[0], "C6 of voice 3 lies above the wavy line").to.be.lessThan(stroke.drawn_top_y);
    });

    it("(b) a single note and a chord in another voice share one stroke", () => {
        const strokes: FoundStroke[] = strokesIn(1);
        expect(strokes.length).to.equal(1);
        const stroke: any = strokes[0].stroke;
        expect(stroke.drawn_top_y, "top: A5").to.equal(ys(1, 0, 1)[0]);
        const chord: number[] = ys(1, 0, 2);
        expect(stroke.drawn_bot_y, "bottom: B3 of the chord").to.equal(chord[chord.length - 1]);
        expect(stroke.getSpanNotes().length).to.equal(1);
    });

    it("(c) the same numbered arpeggio on both staves is one wavy line", () => {
        const strokes: FoundStroke[] = strokesIn(2);
        expect(strokes.length, "no second stroke on staff 2").to.equal(1);
        expect(strokes[0].staff).to.equal(0);
        const stroke: any = strokes[0].stroke;
        expect(stroke.drawn_top_y, "top: F#4 on staff 1").to.equal(ys(2, 0, 1)[0]);
        const chord: number[] = ys(2, 1, 5);
        expect(stroke.drawn_bot_y, "bottom: D3 on staff 2").to.equal(chord[chord.length - 1]);
        expect(stroke.drawn_bot_y - stroke.drawn_top_y, "spans into the lower staff (px)").to.be.greaterThan(60);
    });

    it("(c) the part of the line in the other staff is not in this staff's bottom line", () => {
        const measure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[2][0];
        const x: number = measure.PositionAndShape.RelativePosition.x;
        const width: number = measure.PositionAndShape.Size.width;
        const bottom: number = measure.ParentStaffLine.SkyBottomLineCalculator.getBottomLineMaxInRange(x, x + width);
        // staff 2 starts about 6.5 units below staff 1's top; its D3 is lower still.
        expect(bottom, "bottom line of staff 1 in m3 stays above staff 2").to.be.lessThan(6.5);
    });

    it("(e) a chord arpeggio in one voice is unchanged: one stroke, its notes", () => {
        const strokes: FoundStroke[] = strokesIn(3);
        expect(strokes.length).to.equal(1);
        const stroke: any = strokes[0].stroke;
        const chord: number[] = ys(3, 0, 1);
        expect(stroke.drawn_top_y).to.equal(chord[0]);
        expect(stroke.drawn_bot_y).to.equal(chord[chord.length - 1]);
        expect(stroke.getSpanNotes().length).to.equal(0);
    });

    it("(f) arpeggios on both staves without a number stay two wavy lines", () => {
        const strokes: FoundStroke[] = strokesIn(4);
        expect(strokes.length).to.equal(2);
        expect(strokes.map(s => s.staff).sort()).to.deep.equal([0, 1]);
        for (const found of strokes) {
            expect(found.stroke.getSpanNotes().length).to.equal(0);
        }
    });

    it("(g) two chords with the same number on both staves stay two wavy lines", () => {
        const strokes: FoundStroke[] = strokesIn(5);
        expect(strokes.length).to.equal(2);
        expect(strokes.map(s => s.staff).sort()).to.deep.equal([0, 1]);
        for (const found of strokes) {
            expect(found.stroke.getSpanNotes().length).to.equal(0);
            expect(found.stroke.drawn_bot_y - found.stroke.drawn_top_y, "each wavy line covers only its own third (one line space)").to.equal(10);
        }
    });

    it("all participating notes belong to one Arpeggio model object", () => {
        const arpeggios: Set<Arpeggio> = new Set<Arpeggio>();
        for (const verticalContainer of osmd.Sheet.SourceMeasures[2].VerticalSourceStaffEntryContainers) {
            for (const staffEntry of verticalContainer.StaffEntries) {
                for (const voiceEntry of staffEntry?.VoiceEntries ?? []) {
                    for (const note of voiceEntry.Notes) {
                        if (note.Arpeggio) {
                            arpeggios.add(note.Arpeggio);
                        }
                    }
                }
            }
        }
        expect(arpeggios.size).to.equal(1);
        expect([...arpeggios][0].notes.length).to.equal(4);
    });
});
