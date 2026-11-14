import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { VexFlowThumbPositionGlyph } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowThumbPositionGlyph";
import { ClefInstruction } from "../../../src/MusicalScore/VoiceData/Instructions/ClefInstruction";
import { Note } from "../../../src/MusicalScore/VoiceData/Note";
import { SourceMeasure } from "../../../src/MusicalScore/VoiceData/SourceMeasure";
import { GraphicalLabel } from "../../../src/MusicalScore/Graphical/GraphicalLabel";

/**
 * Small symbols drawn as in the prints (2026-11-14), each with a synthetic fixture shaped like the case it fixes. Same
 * fixtures and checks as osmd-dart test/render_small_symbols_test.dart (the text signs ♭♯♮‿ are drawn in the app only:
 * the browser falls back on a system font).
 *
 * - test_clef_changes_at_measure_end: piano m2 with an F clef before its last beat and a G clef at its end, both after
 *   <forward>s (Vieuxtemps, Grand Concerto Op. 31, piano m104). The G clef was lost.
 * - test_measure_rest_senza_misura: <rest measure="yes"> in a measure without a time signature (Haydn, Cello Concerto
 *   Hob. VIIb:2 I, cadenza): a whole rest, not a dotted half rest.
 * - test_marcato_thumb_double_stem: a thumb position over a fingering, and notes with <stem>double</stem>.
 * - test_beam_across_barline: sixteenths beamed from m1 into m2 (Saint-Saëns, Bassoon Sonata Op. 168 II m46-47).
 * - test_lyric_extend_over_rests: a melisma carried over rests by <extend type="continue"/> (Handel, Care selve).
 */
describe("Small symbols", () => {
    const notesOf: (measure: SourceMeasure) => Note[] = (measure: SourceMeasure) => {
        const notes: Note[] = [];
        for (const verticalContainer of measure.VerticalSourceStaffEntryContainers) {
            for (const entry of verticalContainer.StaffEntries) {
                for (const voiceEntry of entry?.VoiceEntries ?? []) {
                    notes.push(...voiceEntry.Notes);
                }
            }
        }
        return notes;
    };
    const clefName: (clef: ClefInstruction) => string = (clef: ClefInstruction) => `${clef.ClefType}${clef.Line}`;
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    const render: (fixture: string) => Promise<void> = async (fixture: string) => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore(fixture));
        osmd.render();
    };
    afterEach(() => {
        osmd?.clear();
        container?.remove();
    });

    it("a clef at the end of a measure after a clef before its last beat is kept: the next measure is in that clef", async () => {
        await render("test_clef_changes_at_measure_end.musicxml");
        const m2: SourceMeasure = osmd.Sheet.SourceMeasures[1];
        const mid: string[] = [];
        for (const verticalContainer of m2.VerticalSourceStaffEntryContainers) {
            for (const instruction of verticalContainer.StaffEntries[0]?.Instructions ?? []) {
                if (instruction instanceof ClefInstruction) {
                    mid.push(`${verticalContainer.Timestamp.RealValue}:${clefName(instruction)}`);
                }
            }
        }
        const G: string = clefName(new ClefInstruction());
        const F4: string = mid.length === 1 ? mid[0].split(":")[1] : "";
        expect(mid, "the F clef at its time, before the D3").to.deep.equal([`0.75:${F4}`]);
        expect(F4).to.not.equal(G);
        const end: string[] = m2.LastInstructionsStaffEntries[0].Instructions
            .filter(i => i instanceof ClefInstruction).map(i => clefName(i as ClefInstruction));
        expect(end, "the G clef at the end of m2").to.deep.equal([G]);
        const m3: VexFlowMeasure = osmd.GraphicSheet.MeasureList[2][0] as VexFlowMeasure;
        expect(clefName(m3.InitiallyActiveClef), "m3 in the treble clef").to.equal(G);
    });

    it("<rest measure=\"yes\"> is a whole measure rest, also in a measure without a time signature: a whole rest without a dot", async () => {
        await render("test_measure_rest_senza_misura.musicxml");
        for (const index of [1, 2]) {
            const rests: Note[] = notesOf(osmd.Sheet.SourceMeasures[index]);
            expect(rests.length).to.equal(1);
            expect(rests[0].IsWholeMeasureRest, `m${index + 1}`).to.equal(true);
            const measure: VexFlowMeasure = osmd.GraphicSheet.MeasureList[index][0] as VexFlowMeasure;
            const gve: VexFlowVoiceEntry = measure.staffEntries[0].graphicalVoiceEntries[0] as VexFlowVoiceEntry;
            const note: any = gve.vfStaveNote;
            expect(note.getDuration(), `m${index + 1}: a whole rest`).to.equal("w");
            expect(note.getModifiers().filter((m: any) => m.getCategory() === "dots").length, `m${index + 1}: no dot`).to.equal(0);
        }
    });

    it("a thumb position is drawn over the note's fingering", async () => {
        await render("test_marcato_thumb_double_stem.musicxml");
        const measure: VexFlowMeasure = osmd.GraphicSheet.MeasureList[0][0] as VexFlowMeasure;
        const labels: GraphicalLabel[] = measure.staffEntries[1].FingeringEntries;
        expect(labels.map(l => l.Label.text)).to.deep.equal(["2", VexFlowThumbPositionGlyph.LabelText]);
        const fingeringTop: number = labels[0].PositionAndShape.RelativePosition.y + labels[0].PositionAndShape.BorderTop;
        const thumb: any = labels[1].PositionAndShape;
        // stacked on the fingering like a second fingering (at the stacking distance from its top)
        expect(thumb.RelativePosition.y).to.be.closeTo(fingeringTop - osmd.EngravingRules.FingeringPaddingY, 1e-9);
        expect(thumb.BorderBottom - thumb.BorderTop).to.be.closeTo(VexFlowThumbPositionGlyph.Height, 1e-9);
        // drawn as the glyph, not as text
        expect(container.innerHTML.includes(VexFlowThumbPositionGlyph.LabelText), "no text of the sign").to.equal(false);
    });

    it("a note with <stem>double</stem> has stems up and down", async () => {
        await render("test_marcato_thumb_double_stem.musicxml");
        // the vertical path segments drawn by the measure (stems: "M x y L x y2", about 3.5 staff spaces)
        const stems: (measureIndex: number, entryIndex: number) => number = (measureIndex: number, entryIndex: number) => {
            const measure: VexFlowMeasure = osmd.GraphicSheet.MeasureList[measureIndex][0] as VexFlowMeasure;
            const note: any = (measure.staffEntries[entryIndex].graphicalVoiceEntries[0] as VexFlowVoiceEntry).vfStaveNote;
            const left: number = note.getAbsoluteX() - 3;
            const right: number = note.getAbsoluteX() + note.getGlyphWidth() + 3;
            let count: number = 0;
            for (const path of Array.from(container.querySelectorAll("path"))) {
                const match: RegExpMatchArray = (path.getAttribute("d") ?? "").trim()
                    .match(/^M\s*([-\d.]+)[\s,]+([-\d.]+)\s*L\s*([-\d.]+)[\s,]+([-\d.]+)\s*$/);
                if (!match) {
                    continue;
                }
                const [x1, y1, x2, y2] = match.slice(1).map(Number);
                const length: number = Math.abs(y2 - y1);
                if (Math.abs(x1 - x2) < 0.01 && length >= 25 && length <= 45 && x1 >= left && x1 <= right) {
                    count++;
                }
            }
            return count;
        };
        expect(stems(0, 0), "m1 A4: one stem").to.equal(1);
        expect(stems(0, 2), "m1 D5: double").to.equal(2);
        expect(stems(1, 0), "m2 C4: double").to.equal(2);
    });

    it("a beam carried over the barline is drawn in each measure, its notes beamed, not flagged", async () => {
        await render("test_beam_across_barline.musicxml");
        for (const index of [0, 1]) {
            const notes: Note[] = notesOf(osmd.Sheet.SourceMeasures[index]);
            expect(notes.length).to.equal(12);
            const beams: Set<any> = new Set(notes.map(n => n.NoteBeam));
            expect(beams.size, `m${index + 1}: one beam`).to.equal(1);
            expect([...beams][0], `m${index + 1}: beamed`).to.not.equal(undefined);
            const measure: VexFlowMeasure = osmd.GraphicSheet.MeasureList[index][0] as VexFlowMeasure;
            for (const entry of measure.staffEntries) {
                const note: any = (entry.graphicalVoiceEntries[0] as VexFlowVoiceEntry).vfStaveNote;
                expect(note.beam, `m${index + 1}: no flag`).to.not.equal(undefined);
                expect(note.beam).to.not.equal(null);
            }
        }
    });

    it("a lyric extend carried over rests by <extend type=\"continue\"/> goes on to its stop note", async () => {
        await render("test_lyric_extend_over_rests.musicxml");
        const line: any = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
        expect(line.LyricLines.length).to.equal(1);
        const m2: any = osmd.GraphicSheet.MeasureList[1][0];
        const stopEntry: any = m2.staffEntries[m2.staffEntries.length - 1];
        const stopX: number = m2.PositionAndShape.RelativePosition.x + stopEntry.PositionAndShape.RelativePosition.x;
        expect(line.LyricLines[0].End.x, "past the rests, under the stop note (m2 C5)").to.be.greaterThan(stopX);
    });
});
