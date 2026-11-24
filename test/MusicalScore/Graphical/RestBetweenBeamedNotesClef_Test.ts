import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A rest between two notes of one beam goes a third below the note before it ("pause rest encircled by two beamed notes").
 * Its StaveNote has no clef, so its key is read on the treble lines; the line a third below the note is the same on every clef.
 * Upstream's two octaves for every C and F clef put it an octave too high on the alto clef
 * (Wolf, Italian Serenade, viola m16: B3 eighth - eighth rest - B3 eighth, stems up, the rest above the staff in the beam),
 * a third too high on the bass clef (on the note before it).
 * Same as osmd-dart test/rest_between_beamed_notes_test.dart.
 */
describe("Rest between beamed notes on any clef", () => {
    const xml: (sign: string, line: number, step: string, octave: number) => string = (sign, line, step, octave) => `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>X</part-name></score-part></part-list>
<part id="P1"><measure number="1">
<attributes><divisions>2</divisions><time><beats>3</beats><beat-type>8</beat-type></time><clef><sign>${sign}</sign><line>${line}</line></clef></attributes>
<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><beam number="1">begin</beam></note>
<note><rest/><duration>1</duration><voice>1</voice><type>eighth</type><beam number="1">continue</beam></note>
<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><beam number="1">end</beam></note>
</measure></part></score-partwise>`;

    const cases: [string, number, string, number, number, number][] = [
        ["G", 2, "B", 4, 3.0, 2.0],
        ["C", 3, "B", 3, 2.5, 1.5], // alto
        ["C", 3, "C", 4, 3.0, 2.0],
        ["C", 4, "B", 3, 3.5, 2.5], // tenor
        ["F", 4, "D", 3, 3.0, 2.0], // bass
        ["F", 4, "G", 2, 1.0, 0.0],
    ];
    for (const [sign, line, step, octave, noteLine, restLine] of cases) {
        it(`${sign} clef on line ${line}: the rest after ${step}${octave} is a third below it`, async () => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            div.style.width = "600px";
            const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
            await osmd.load(xml(sign, line, step, octave));
            osmd.render();
            const m1: GraphicalMeasure = osmd.GraphicSheet.MeasureList[0][0];
            const entries: VexFlowVoiceEntry[] = m1.staffEntries.map(e => e.graphicalVoiceEntries[0] as VexFlowVoiceEntry);
            const note: any = entries.find(gve => !gve.notes[0].sourceNote.isRest()).vfStaveNote;
            const rest: any = entries.find(gve => gve.notes[0].sourceNote.isRest()).vfStaveNote;
            expect(note.getKeyProps()[0].line).to.equal(noteLine);
            expect(rest.getKeyProps()[0].line).to.equal(restLine);
        });
    }
});
