import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { VexFlowStaffEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowStaffEntry";
import { TestUtils } from "../../../Util/TestUtils";
import Vex from "vexflow";
const VF: any = Vex.Flow;

function score(clef: string, notes: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>P</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>20</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        ${clef}
      </attributes>
${notes}
    </measure>
  </part>
</score-partwise>`;
}

function note(step: string, octave: number, duration: number, type: string, stem: string,
              options: { chord?: boolean, beams?: string[], tuplet?: string, quintuplet?: boolean } = {}): string {
    const beams: string = options.chord ? "" : (options.beams ?? []).map((b, i) => `<beam number="${i + 1}">${b}</beam>`).join("");
    return `<note>${options.chord ? "<chord/>" : ""}<pitch><step>${step}</step><octave>${octave}</octave></pitch>` +
        `<duration>${duration}</duration><voice>1</voice><type>${type}</type>` +
        (options.quintuplet ? "<time-modification><actual-notes>5</actual-notes><normal-notes>4</normal-notes></time-modification>" : "") +
        (options.chord ? "" : `<stem>${stem}</stem>`) + beams +
        (options.tuplet ? `<notations><tuplet type="${options.tuplet}"/></notations>` : "") + "</note>";
}

const G_CLEF: string = "<attributes><clef><sign>G</sign><line>2</line></clef></attributes>";
const F_CLEF: string = "<attributes><clef><sign>F</sign><line>4</line></clef></attributes>";
const HALF_REST: string = "<note><rest/><duration>40</duration><voice>1</voice><type>half</type></note>";

/** Sibelius III m202, the bass: F1 beamed to a chord in the G clef (stems up), then a chord beamed to F2 in the F clef. */
const SIBELIUS: string = score("<clef><sign>F</sign><line>4</line></clef>", [
    note("F", 1, 10, "eighth", "up", { beams: ["begin"] }),
    G_CLEF,
    note("D", 4, 10, "eighth", "up", { beams: ["end"] }),
    note("A", 4, 10, "eighth", "up", { chord: true }),
    note("D", 4, 10, "eighth", "up", { beams: ["begin"] }),
    note("A", 4, 10, "eighth", "up", { chord: true }),
    F_CLEF,
    note("F", 2, 10, "eighth", "up", { beams: ["end"] }),
    HALF_REST,
].join("\n"));

/** Enescu m109, the viola: sixteenths (quintuplets) with their stems down in the C clef, the G clef before the eighth note. */
const ENESCU: string = score("<clef><sign>C</sign><line>3</line></clef>", [
    HALF_REST,
    ...[["E", 4], ["F", 4], ["G", 4], ["A", 4], ["B", 4], ["C", 5], ["D", 5], ["E", 5], ["F", 5], ["G", 5]].map(([step, octave], i) =>
        (i === 7 ? G_CLEF : "") + note(step as string, octave as number, 4, "16th", "down", {
            beams: i === 0 ? ["begin", "begin"] : i === 9 ? ["end", "end"] : ["continue", "continue"],
            tuplet: i === 0 || i === 5 ? "start" : i === 4 || i === 9 ? "stop" : undefined,
            quintuplet: true,
        })),
].join("\n"));

/**
 * A beam over an in-staff clef between its notes (81sabo renderer rows 2026-11-14: Sibelius violin concerto III piano
 * m202/m204, the F clef in the bass under the beam from F1 up to a chord in the G clef; Enescu, Konzertstück, viola m109,
 * the G clef in the quintuplets above the beam of stems down). VexFlow places a beam from its notes only, so the beam ran
 * through the clef. VexFlowMeasure.moveBeamClearOfInStaffClefs() moves such a beam outward (by its stem direction) until
 * it clears the clef's box by BeamInStaffClefClearance staff spaces; its stems follow. Same as osmd-dart
 * test/beam_in_staff_clef_clearance_test.dart.
 */
describe("Beam over an in-staff clef", () => {
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

    async function render(xml: string): Promise<VexFlowMeasure> {
        await osmd.load(xml);
        osmd.render();
        return osmd.GraphicSheet.MeasureList[0][0] as VexFlowMeasure;
    }

    /** For each in-staff clef between the first and last stem of a beam: the smallest vertical distance from the clef's
     *  box to the beam block over the clef (negative: they overlap), in staff spaces; and whether the stems reach the beam. */
    function clefGaps(measure: VexFlowMeasure): number[] {
        const stave: any = measure.getVFStave();
        const space: number = stave.getSpacingBetweenLines();
        const beams: any[] = [];
        for (const voiceID in (measure as any).vfbeams) {
            if ((measure as any).vfbeams.hasOwnProperty(voiceID)) {
                beams.push(...(measure as any).vfbeams[voiceID]);
            }
        }
        const gaps: number[] = [];
        for (const entry of measure.staffEntries as VexFlowStaffEntry[]) {
            const clef: any = entry.vfClefBefore;
            if (!clef) {
                continue;
            }
            const box: any = clef.glyph.bbox;
            const left: number = clef.getAbsoluteX() + box.getX();
            const right: number = left + box.getW();
            const top: number = stave.getYForLine(clef.clef.line) + box.getY();
            const bottom: number = top + box.getH();
            for (const beam of beams) {
                const notes: any[] = beam.getNotes();
                const firstX: number = notes[0].getStemX();
                const lastX: number = notes[notes.length - 1].getStemX();
                if (right <= firstX || left >= lastX) {
                    continue;
                }
                const width: number = beam.render_options.beam_width;
                const thickness: number = width + (beam.getBeamCount() - 1) * width * 1.5;
                let gap: number = Infinity;
                for (const x of [Math.max(left, firstX), Math.min(right, lastX)]) {
                    // as drawBeamLines(): from the first stem's (extended) tip along the slope
                    const line: number = beam.getSlopeY(x, firstX, beam.getBeamYToDraw(), beam.slope);
                    const beamTop: number = beam.stem_direction === VF.Stem.UP ? line : line - thickness;
                    const beamBottom: number = beam.stem_direction === VF.Stem.UP ? line + thickness : line;
                    const g: number = beamBottom <= top ? top - beamBottom : beamTop >= bottom ? beamTop - bottom :
                        -Math.min(beamBottom - top, bottom - beamTop);
                    gap = Math.min(gap, g / space);
                }
                gaps.push(gap);
                for (const n of notes) {
                    const line: number = beam.getSlopeY(n.getStemX(), firstX, beam.getBeamYToDraw(), beam.slope);
                    expect(n.getStemExtents().topY, `the stem of ${n.getKeys()} ends at the beam`).to.be.closeTo(line, 0.6);
                }
            }
        }
        return gaps;
    }

    it("passes above an F/G clef between notes with their stems up", async () => {
        const gaps: number[] = clefGaps(await render(SIBELIUS));
        expect(gaps.length, "two clefs inside two beams").to.equal(2);
        for (const gap of gaps) {
            expect(gap).to.be.at.least(VexFlowMeasure.BeamInStaffClefClearance - 0.01);
        }
    });

    it("passes below a G clef between notes with their stems down", async () => {
        const gaps: number[] = clefGaps(await render(ENESCU));
        expect(gaps.length).to.equal(1);
        expect(gaps[0]).to.be.at.least(VexFlowMeasure.BeamInStaffClefClearance - 0.01);
    });
});
