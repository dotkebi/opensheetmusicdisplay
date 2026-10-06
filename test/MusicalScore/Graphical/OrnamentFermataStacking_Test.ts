import { expect } from "chai";
import Vex from "vexflow";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { VexFlowVoiceEntry } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { VexFlowConverter } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowConverter";
import VF = Vex.Flow;

/**
 * A fermata on the side of a note where it has an ornament goes beyond the ornament, not between it and the note
 * (Couperin, Concerts royaux I Menuet en trio m8-9, as in the 1722 print; the aspiration of IV Rigaudon m22 is a host's
 * custom articulation, stacked with VexFlowConverter.stackOutsideOrnament()). VexFlow formats the articulations before
 * the ornaments, so they were always next to the note. Other articulations (a staccato) stay next to the note. Two
 * voices on one staff with a fermata on the same side at the same time get one fermata: the Menuet's two upper voices
 * were drawn as two arcs.
 */
describe("Fermata stacked outside an ornament", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_ornament_fermata_stacking.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    function measure(index: number): VexFlowMeasure {
        return osmd.GraphicSheet.MeasureList[index][0] as VexFlowMeasure;
    }

    /** The first note of a voice of a measure. */
    function note(measureIndex: number, voice: number = 1): any {
        for (const gve of measure(measureIndex).staffEntries[0].graphicalVoiceEntries) {
            if (gve.parentVoiceEntry.ParentVoice.VoiceId === voice) {
                return (gve as VexFlowVoiceEntry).vfStaveNote;
            }
        }
        return undefined;
    }

    function articulations(vfNote: any, type: string): any[] {
        return vfNote.getModifiers().filter((m: any) => m instanceof VF.Articulation && (m as any).type === type);
    }

    function ornament(vfNote: any): any {
        return vfNote.getModifiers().find((m: any) => m instanceof VF.Ornament);
    }

    /** The trill's own ink (px): its layout ink is the ornament's and the articulations' beyond it. */
    function trillInk(vfNote: any): { top: number, bottom: number } {
        const orn: any = ornament(vfNote);
        const stave: any = vfNote.getStave();
        const bottom: number = orn.layoutInk.bottom + orn.slurClearanceYShift + stave.getYForLine(0);
        return { top: bottom - orn.glyph.getMetrics().height, bottom };
    }

    it("puts a fermata beyond the ornament on its side", () => {
        const vfNote: any = note(0);
        const fermata: any = articulations(vfNote, "a@a")[0];
        const trill: { top: number, bottom: number } = trillInk(vfNote);
        expect(fermata.drawnInk.bottom).to.be.lessThan(trill.top);
        const space: number = vfNote.getStave().getSpacingBetweenLines();
        expect((trill.top - fermata.drawnInk.bottom) / space).to.be.closeTo(0.75, 0.05);
        // the ornament's ink in the layout (sky line, slurs) covers the fermata
        const orn: any = ornament(vfNote);
        expect(orn.layoutInk.top + vfNote.getStave().getYForLine(0)).to.be.closeTo(fermata.drawnInk.top, 0.01);
    });

    it("keeps a staccato between the note and the ornament", () => {
        const vfNote: any = note(2);
        const staccato: any = articulations(vfNote, "a.")[0];
        expect(staccato.drawnInk.top).to.be.greaterThan(trillInk(vfNote).bottom);
    });

    it("draws one fermata for two voices with a fermata above at the same time", () => {
        expect(articulations(note(0, 1), "a@a").length).to.equal(1);
        expect(articulations(note(0, 2), "a@a").length).to.equal(0);
        expect(ornament(note(0, 2)).getPosition()).to.equal(VF.Modifier.Position.BELOW);
    });

    it("leaves a fermata with no ornament next to the note", () => {
        const vfNote: any = note(3);
        const fermata: any = articulations(vfNote, "a@a")[0];
        expect(fermata.stackedOutsideOrnament).to.not.equal(true);
        const space: number = vfNote.getStave().getSpacingBetweenLines();
        // just over the staff
        expect((fermata.drawnInk.bottom - vfNote.getStave().getYForLine(0)) / space).to.be.greaterThan(-2);
    });

    it("keeps the fermata over an ornament on a slur's first note clear of the slur", () => {
        const vfNote: any = note(4);
        const fermata: any = articulations(vfNote, "a@a")[0];
        const trill: { top: number, bottom: number } = trillInk(vfNote);
        expect(fermata.drawnInk.bottom).to.be.lessThan(trill.top);
        const staffLine: any = measure(4).ParentStaffLine;
        const origin: any = staffLine.PositionAndShape.AbsolutePosition;
        for (const slur of staffLine.GraphicalSlurs) {
            for (let i: number = 0; i <= 256; i++) {
                const point: any = slur.calculateCurvePointAtIndex(i / 256);
                const x: number = (point.x + origin.x) * 10;
                if (x < fermata.drawnInk.left || x > fermata.drawnInk.right) {
                    continue;
                }
                const y: number = (point.y + origin.y) * 10;
                expect(y < fermata.drawnInk.top - 1 || y > Math.max(fermata.drawnInk.bottom, trill.bottom) + 1,
                       `slur at ${y} through the fermata ${JSON.stringify(fermata.drawnInk)}`).to.equal(true);
            }
        }
    });

    it("stacks a host's custom articulation on the ornament's side", () => {
        const vfNote: any = note(1);
        const art: any = new VF.Articulation("av");
        art.setPosition(VF.Modifier.Position.ABOVE);
        const gve: any = measure(1).staffEntries[0].graphicalVoiceEntries[0];
        VexFlowConverter.stackOutsideOrnament(art, gve.notes[0]);
        expect(art.stackedOutsideOrnament).to.equal(true);
        const below: any = new VF.Articulation("av");
        below.setPosition(VF.Modifier.Position.BELOW);
        VexFlowConverter.stackOutsideOrnament(below, gve.notes[0]);
        expect(below.stackedOutsideOrnament).to.not.equal(true);
        expect(vfNote).to.not.equal(undefined);
    });
});
