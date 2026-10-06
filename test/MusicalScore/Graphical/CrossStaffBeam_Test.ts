import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { CrossStaffBeam } from "../../../src/MusicalScore/Graphical/VexFlow/CrossStaffBeam";
import Vex from "vexflow";
import VF = Vex.Flow;

/**
 * Beams across the two staves of a piano part (Schumann, Myrthen 1 Widmung, 25 Aus den östlichen Rosen;
 * PLAN-cross-staff-beam). Each staff's measure used to beam only its own notes, so a beam over both staves fell apart
 * into a beam on one staff and a lone flag on the other (Myrthen 6 m10). The beam's notes in one measure are one beam
 * now (CrossStaffBeam), formatted and drawn by the drawer once the staves are placed. Same fixture and checks as
 * osmd-dart test/cross_staff_beam_test.dart.
 *
 * Fixture (synthetic, piano, 4/4): m1 XML stems mixed (A3 on staff 2 up, the staff-1 notes down); m2 no <stem>;
 * m3 all stems down in the XML (centred by EngravingRules.CrossStaffBeamsCenterUniformXmlStems, followed without);
 * m4 four 16ths, then dotted 8th + 16th with a hook back on staff 2; m5→m6 a beam over the barline at a forced system
 * break (the reader closes it: as before); m7 two cross-staff beams.
 */
describe("Cross-staff beams", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    const render: (centerUniform: boolean) => Promise<void> = async (centerUniform: boolean) => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.EngravingRules.NewSystemAtXMLNewSystemAttribute = true;
        osmd.EngravingRules.CrossStaffBeamsCenterUniformXmlStems = centerUniform;
        await osmd.load(TestUtils.getScore("test_cross_staff_beams.musicxml"));
        osmd.render();
    };
    afterEach(() => {
        osmd.clear();
        container.remove();
    });
    const measureAt: (index: number, staff: number) => VexFlowMeasure =
        (index: number, staff: number) => osmd.GraphicSheet.MeasureList[index][staff] as VexFlowMeasure;
    const notesOf: (beam: CrossStaffBeam) => VF.StemmableNote[] = (beam: CrossStaffBeam) => (beam as any).notes;

    /** The primary beam line at every stem lies between the upper staff's bottom line and the lower staff's top line. */
    function expectBetweenStaves(beam: CrossStaffBeam, index: number): void {
        const upperBottom: number = (measureAt(index, 0).getVFStave() as any).getYForLine(4);
        const lowerTop: number = (measureAt(index, 1).getVFStave() as any).getYForLine(0);
        const x0: number = notesOf(beam)[0].getStemX();
        for (const note of notesOf(beam)) {
            const y: number = beam.getBeamYToDraw() + (beam as any).slope * (note.getStemX() - x0);
            expect(y, "below the upper staff").to.be.greaterThan(upperBottom);
            expect(y, "above the lower staff").to.be.lessThan(lowerTop);
        }
    }

    /** Every stem ends on the beam: at the primary line, or across its own beam lines. */
    function expectStemsReachBeam(beam: CrossStaffBeam): void {
        const x0: number = notesOf(beam)[0].getStemX();
        for (const note of notesOf(beam)) {
            const line: number = beam.getBeamYToDraw() + (beam as any).slope * (note.getStemX() - x0);
            const tip: number = (note.getStemExtents() as any).topY;
            const stack: number = 5 * (1 + (Math.max(1, (note as any).getBeamCount()) - 1) * 1.5);
            const distance: number = Math.min(...[line, line + stack, line - stack].map(c => Math.abs(c - tip)));
            expect(distance, `stem tip ${tip}, beam line ${line}`).to.be.lessThan(1.5);
            // drawn at the note (not where the note was in the skyline pass, before its staff was placed)
            expect((note.getStem() as any).x_begin, "stem x").to.be.closeTo(note.getStemX(), 0.01);
        }
    }

    it("beams the notes of both staves under one beam, listed in both measures, mixed XML stems centred", async () => {
        await render(true);
        const beams: CrossStaffBeam[] = measureAt(0, 1).crossStaffBeams;
        expect(beams.length).to.equal(1);
        const beam: CrossStaffBeam = beams[0];
        expect(measureAt(0, 0).crossStaffBeams).to.deep.equal([beam]);
        expect(notesOf(beam).length).to.equal(4);
        expect(notesOf(beam).map(n => n.getStave())).to.deep.equal(
            [measureAt(0, 1).getVFStave(), measureAt(0, 0).getVFStave(), measureAt(0, 0).getVFStave(), measureAt(0, 0).getVFStave()]);
        for (const note of notesOf(beam)) {
            expect((note as any).beam === beam, "no flag: every note is beamed by the cross-staff beam").to.equal(true);
        }
        expect(beam.isMixed).to.equal(true);
        expect(notesOf(beam).map(n => n.getStemDirection())).to.deep.equal([VF.Stem.UP, VF.Stem.DOWN, VF.Stem.DOWN, VF.Stem.DOWN]);
        expectBetweenStaves(beam, 0);
        expectStemsReachBeam(beam);
        expect((beam as any).rendered, "drawn by the drawer").to.equal(true);
    });

    it("centres a beam without XML stems and (by default) one whose XML stems all go down", async () => {
        await render(true);
        for (const index of [1, 2]) {
            const beam: CrossStaffBeam = measureAt(index, 1).crossStaffBeams[0];
            expect(beam.isMixed, `m${index + 1}`).to.equal(true);
            expect(notesOf(beam).map(n => n.getStemDirection())).to.deep.equal([VF.Stem.UP, VF.Stem.DOWN, VF.Stem.DOWN, VF.Stem.DOWN]);
            expectBetweenStaves(beam, index);
            expectStemsReachBeam(beam);
        }
    });

    it("follows XML stems all down when CrossStaffBeamsCenterUniformXmlStems is off", async () => {
        await render(false);
        const beam: CrossStaffBeam = measureAt(2, 1).crossStaffBeams[0];
        expect(beam.isMixed).to.equal(false);
        expect(notesOf(beam).every(n => n.getStemDirection() === VF.Stem.DOWN)).to.equal(true);
        const a3: VF.StemmableNote = notesOf(beam)[0];
        expect(beam.getBeamYToDraw(), "below the A3 on staff 2").to.be.greaterThan(Math.max(...a3.getYs()) + 20);
        expectStemsReachBeam(beam);
        expect(measureAt(0, 1).crossStaffBeams[0].isMixed, "m1 (XML stems mixed) either way").to.equal(true);
    });

    it("draws two cross-staff beams in one measure", async () => {
        await render(true);
        const beams: CrossStaffBeam[] = measureAt(6, 1).crossStaffBeams;
        expect(beams.length).to.equal(2);
        for (const beam of beams) {
            expectBetweenStaves(beam, 6);
            expectStemsReachBeam(beam);
        }
    });
});
