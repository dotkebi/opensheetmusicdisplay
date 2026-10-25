import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";

/**
 * Mozart, Bassoon Concerto K.191 (Besozzi/Richault 17178R), II-III, the measures the 10-24 review left to the renderers
 * (81sabo followup_20261024_k191_ii_iii_holds, R1-R9), cut from the score with their numbers: staff 0 the bassoon, 1 and 2
 * the piano. The crossed voices of m194, m195, m241 and m309 carry the stems 02front's crossed-voice-stems patch gives them
 * (osmd-dart re-stems them itself: test/k191_ii_iii_followup_test.dart).
 */
describe("Mozart K.191 II-III renderer follow-up", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    before(async () => {
        // (VexFlowPatch: run `npm run prebuildVexflow` before this test after changing stavenote.js)
        container = TestUtils.getDivElement(document);
        container.style.width = "1024px";
        osmd = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore("test_k191_ii_iii_followup_restemmed.musicxml"));
        osmd.render();
    });
    after(() => {
        osmd.clear();
        container.remove();
    });

    function measure(number: number, staff: number): GraphicalMeasure {
        for (const row of osmd.GraphicSheet.MeasureList) {
            for (const m of row) {
                if (m?.parentSourceMeasure.MeasureNumberXML === number && m.ParentStaff.idInMusicSheet === staff) {
                    return m;
                }
            }
        }
        throw new Error(`no measure ${number} on staff ${staff}`);
    }
    /** the VexFlow note of a voice at a time (in wholes) in the measure */
    function note(number: number, staff: number, voice: number, time: number): any {
        for (const entry of measure(number, staff).staffEntries) {
            if (Math.abs(entry.relInMeasureTimestamp.RealValue - time) > 1e-6) {
                continue;
            }
            const gve: VexFlowVoiceEntry = entry.graphicalVoiceEntries.find(e => !e.parentVoiceEntry.IsGrace &&
                e.parentVoiceEntry.ParentVoice.VoiceId === voice) as VexFlowVoiceEntry;
            if (gve) {
                return gve.vfStaveNote;
            }
        }
        throw new Error(`no voice ${voice} at ${time} in ${number}`);
    }
    function slurs(number: number, staff: number): GraphicalSlur[] {
        const found: GraphicalSlur[] = [];
        for (const page of osmd.GraphicSheet.MusicPages) {
            for (const system of page.MusicSystems) {
                for (const line of system.StaffLines) {
                    if (line.ParentStaff.idInMusicSheet !== staff) {
                        continue;
                    }
                    found.push(...line.GraphicalSlurs.filter(s => s.slur.StartNote?.SourceMeasure?.MeasureNumberXML === number));
                }
            }
        }
        return found;
    }

    it("R8: a slur from voice 3 up to voice 2 down goes above (III m309 LH)", () => {
        expect(slurs(309, 2).map(s => s.placement)).to.deep.equal([PlacementEnum.Above]);
    });

    it("R1: slurs between the voices stay at their notes (II m195 LH)", () => {
        for (const slur of slurs(195, 2)) {
            const ends: number[] = [slur.bezierStartPt.y, slur.bezierEndPt.y];
            if (slur.placement === PlacementEnum.Below) { // voice 3, stems up: under its notes on the top line
                expect(Math.max(...ends), `voice 3 slur ends ${ends}`).to.be.lessThan(2);
            } else if (slur.slur.StartNote.ParentVoiceEntry.Timestamp.RealValue === 0) {
                // voice 2's A2-B-flat2, stems down: over its notes at the bottom of the staff
                expect(Math.min(...ends), `voice 2 slur ends ${ends}`).to.be.at.least(2); // its heads: 3 and 3.5
            }
        }
    });

    it("R1: voice 3's first rest goes up with its notes (II m195 LH)", () => {
        expect(note(195, 2, 3, 0).getKeyLine(0)).to.be.greaterThan(3);
    });

    it("R3: voice 1's eighth rest goes over voice 2's 16th rest (II m200 RH)", () => {
        for (const time of [0, 0.5]) {
            const upper: any = note(200, 1, 1, time);
            const lower: any = note(200, 1, 2, time);
            const upperBottom: number = upper.getKeyLine(0) - upper.glyph.line_below;
            const lowerTop: number = lower.getKeyLine(0) + lower.glyph.line_above;
            expect(upperBottom, `rests at ${time}`).to.be.at.least(lowerTop + 0.25);
        }
    });

    it("R2: voice 2's quarter rest stays under voice 3's A3 (II m194 LH)", () => {
        const rest: any = note(194, 2, 2, 0.75);
        const a3: any = note(194, 2, 3, 0.75);
        expect(rest.getKeyLine(0) + rest.glyph.line_above).to.be.lessThan(a3.getKeyLine(0));
    });

    it("R5: the second voice's whole-measure rest stays in the staff under cue notes (III bassoon m245)", () => {
        expect(note(245, 0, 2, 0).getKeyLine(0)).to.be.at.most(4);
    });

    it("R6: the slur under two grace notes over the staff stays over it (III bassoon m270)", () => {
        const slur: GraphicalSlur = slurs(270, 0).find(s => s.slur.StartNote.IsGraceNote);
        expect(slur.bezierStartPt.y, "start").to.be.at.most(0.5);
        expect(slur.bezierEndPt.y, "end").to.be.at.most(0.5);
    });

    it("R7: the short strokes run along the line of the stem tips (III m380)", () => {
        const number: number = measure(380, 1).MeasureNumber;
        const groups: Element[] = Array.from(container.querySelectorAll(`g[id^="vf-tremoloBetweenNotes-${number}-"]`));
        expect(groups.length).to.equal(2);
        const thickness: number = osmd.EngravingRules.TremoloBetweenNotesStrokeThickness;
        for (const group of groups) {
            const ys: number[] = (group.querySelector("path")?.getAttribute("d") ?? "").split(/[MLZ]/)
                .filter(part => part.trim().length > 0).map(part => Number(part.trim().split(/[ ,]+/)[1]) / 10);
            const rise: number = Math.max(...ys) - Math.min(...ys) - thickness;
            expect(rise, `stroke rises ${rise}`).to.be.lessThan(0.6);
        }
    });

    it("R9: the slur under the stems ends without hooking back (III m248 RH)", () => {
        const slur: GraphicalSlur = slurs(248, 1).find(s => s.placement === PlacementEnum.Below);
        expect(slur.bezierEndControlPt.x).to.be.lessThan(slur.bezierEndPt.x);
        expect(slur.bezierStartControlPt.x).to.be.greaterThan(slur.bezierStartPt.x);
    });
});
