import { expect } from "chai";
import { TestUtils } from "../../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { MusicSheet } from "../../../../src/MusicalScore/MusicSheet";
import { Pedal } from "../../../../src/MusicalScore/VoiceData/Expressions/ContinuousExpressions/Pedal";
import { StaffLine } from "../../../../src/MusicalScore/Graphical/StaffLine";
import { VexFlowPedal } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowPedal";
import { VexFlowMeasure } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";

/**
 * Pedals written as Ped./* signs (line="no" sign="yes"), as the Schumann Myrthen scores of 81sabo are (DS-PEDAL review
 * 2026-10-05): a sign pedal without a stop used to run to the end of the piece with Ped./* in every system (the reader
 * only closed line pedals at the next start), a stop at a time with no staff entry jumped to the measure's last note,
 * and a stop+start at one time drew the * over the Ped.
 */
describe("Pedal signs: termination, release position and changes", () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1400px";
        document.body.appendChild(container);
    });
    afterEach(() => {
        container.remove();
    });

    async function load(sample: string, newSystemFromXML: boolean = false): Promise<OpenSheetMusicDisplay> {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        if (newSystemFromXML) {
            osmd.setOptions({ newSystemFromXML: true });
        }
        await osmd.load(TestUtils.getScore(sample));
        osmd.render();
        return osmd;
    }

    /** Source pedals of the bass staff (staff index 1), in reading order. */
    function sourcePedals(sheet: MusicSheet, staffIndex: number = 1): Pedal[] {
        return sheet.SourceMeasures.flatMap(measure => measure.StaffLinkedExpressions[staffIndex] ?? [])
            .filter(multi => multi.PedalStart).map(multi => multi.PedalStart);
    }

    function bassStaffLines(osmd: OpenSheetMusicDisplay): StaffLine[] {
        return osmd.GraphicSheet.MusicPages.flatMap(page => page.MusicSystems).map(system => system.StaffLines[1]);
    }

    function graphicalPedals(osmd: OpenSheetMusicDisplay): VexFlowPedal[] {
        return bassStaffLines(osmd).flatMap(staffLine => staffLine.Pedals as VexFlowPedal[]);
    }

    it("ends a sign pedal without a stop at the next Ped., without a *", async () => {
        const osmd: OpenSheetMusicDisplay = await load("pedal_sign_start_without_stop.musicxml");
        const pedals: Pedal[] = sourcePedals(osmd.Sheet);
        expect(pedals.length).to.equal(2);
        const [first, second]: Pedal[] = pedals;
        expect(first.ParentEndMultiExpression, "the m2 start closes the m1 pedal").to.not.equal(undefined);
        expect(first.ParentEndMultiExpression.SourceMeasureParent.MeasureNumber).to.equal(2);
        expect(first.ParentEndMultiExpression.Timestamp.RealValue).to.equal(0);
        expect(first.ParentEndMultiExpression, "the release and the next start share one expression")
            .to.equal(second.ParentStartMultiExpression);
        expect(first.ChangeEnd, "not a change: no explicit stop").to.equal(false);
        expect(second.ChangeBegin).to.equal(false);
        expect(second.ParentEndMultiExpression.Timestamp.RealValue).to.equal(0.5);

        const graphical: VexFlowPedal[] = graphicalPedals(osmd);
        expect(graphical.length, "one system, one segment each").to.equal(2);
        expect(graphical[0].DepressText, "Ped. is drawn").to.equal(undefined);
        expect(graphical[0].ReleaseText, "the next Ped. is the release: no * is drawn").to.equal(" ");
        expect(graphical[0].endNote).to.equal(graphical[1].startNote);
        expect(graphical[1].DepressText).to.equal(undefined);
        expect(graphical[1].ReleaseText, "its explicit stop draws *").to.equal(undefined);
    });

    it("draws the last pedal without any stop with Ped. once and * once, nothing in the systems between", async () => {
        const osmd: OpenSheetMusicDisplay = await load("pedal_sign_unterminated_three_systems.musicxml", true);
        const staffLines: StaffLine[] = bassStaffLines(osmd);
        expect(staffLines.length).to.be.greaterThanOrEqual(3);
        // upstream draws Ped. in the first system and * in the last; the systems between have no segment
        const first: VexFlowPedal = staffLines[0].Pedals[0] as VexFlowPedal;
        const last: VexFlowPedal = staffLines[staffLines.length - 1].Pedals[0] as VexFlowPedal;
        expect(first, "Ped. segment").to.not.equal(undefined);
        expect(last, "* segment").to.not.equal(undefined);
        expect(first.DepressText).to.equal(undefined);
        expect(first.ReleaseText).to.equal(" ");
        expect(last.DepressText).to.equal(" ");
        expect(last.ReleaseText).to.equal(undefined);
        for (const staffLine of staffLines.slice(1, -1)) {
            expect(staffLine.Pedals.length, "systems between").to.equal(0);
        }
        expect(last.getPedal.EndsStave, "released at the last note, not the stave end").to.equal(false);
        expect(sourcePedals(osmd.Sheet)[0].ParentEndMultiExpression).to.equal(undefined);
    });

    it("releases a stop between two staff entries at the time-proportional x", async () => {
        const osmd: OpenSheetMusicDisplay = await load("pedal_sign_stop_between_entries.musicxml");
        const pedals: VexFlowPedal[] = graphicalPedals(osmd);
        expect(pedals.length).to.equal(6);

        // m1: stop at beat 3 by <offset>, between the half note (beat 2) and the measure end
        const m1: VexFlowPedal = pedals[0];
        expect(m1.getPedal.ParentEndMultiExpression.Timestamp.RealValue, "the stop offset is kept").to.be.closeTo(3 / 4, 1e-9);
        expect(m1.getPedal.EndsStave).to.equal(false);
        const m1Half: number = m1.endNote.getAbsoluteX();
        const m1StaveEnd: number = (m1.endVfVoiceEntry.parentStaffEntry.parentMeasure as VexFlowMeasure).getVFStave().getNoteEndX();
        expect(m1Half + m1.ReleaseXOffset, "halfway between the half note and the measure end").to.be.closeTo((m1Half + m1StaveEnd) / 2, 0.01);
        expect((m1.getPedalMarking() as any).ReleaseX).to.be.closeTo((m1Half + m1StaveEnd) / 2, 0.01);

        // m2: stop at beat 1.5, where only the treble staff has an entry
        const m2: VexFlowPedal = pedals[1];
        expect(m2.getPedal.EndsStave).to.equal(false);
        const m2Entries: number[] = m2.endVfVoiceEntry.parentStaffEntry.parentMeasure.staffEntries
            .map(entry => (entry.graphicalVoiceEntries[0] as VexFlowVoiceEntry).vfStaveNote.getAbsoluteX());
        expect(m2.endNote.getAbsoluteX(), "anchored at the beat-2 note before the stop").to.equal(m2Entries[1]);
        const m2Release: number = m2.endNote.getAbsoluteX() + m2.ReleaseXOffset;
        expect(m2Release, "halfway between beat 2 and beat 3").to.be.closeTo((m2Entries[1] + m2Entries[2]) / 2, 0.01);
        expect(m2Release).to.be.greaterThan(m2.startNote.getAbsoluteX());

        // m3: stop at the measure end releases at the stave end
        const m3: VexFlowPedal = pedals[2];
        expect(m3.getPedal.EndsStave).to.equal(true);
        expect(m3.ReleaseXOffset).to.equal(undefined);
        expect((m3.getPedalMarking() as any).EndsStave).to.equal(true);

        // m4: start at beat 1.5, where only the treble staff has an entry, over two half notes: Ped. three quarters of
        //   the way from beat 1 to beat 3
        const m4: VexFlowPedal = pedals[3];
        const m4Entries: number[] = m4.startVfVoiceEntry.parentStaffEntry.parentMeasure.staffEntries
            .map(entry => (entry.graphicalVoiceEntries[0] as VexFlowVoiceEntry).vfStaveNote.getAbsoluteX());
        expect(m4.startNote.getAbsoluteX(), "anchored at the half note before the start").to.equal(m4Entries[0]);
        expect(m4Entries[0] + m4.DepressXOffset).to.be.closeTo(m4Entries[0] + (m4Entries[1] - m4Entries[0]) * 0.75, 0.01);
        expect((m4.getPedalMarking() as any).DepressX).to.be.closeTo(m4Entries[0] + (m4Entries[1] - m4Entries[0]) * 0.75, 0.01);
        expect(m4.getPedal.EndsStave).to.equal(true);

        // m5: released at beat 1.5 and pressed again at beat 1.75 over two half notes: the second Ped. stays right of
        //   the * (x rule, Blume m15)
        const m5a: VexFlowPedal = pedals[4];
        const m5b: VexFlowPedal = pedals[5];
        expect(m5a.ReleaseText).to.equal(undefined);
        const m5Release: number = m5a.endNote.getAbsoluteX() + m5a.ReleaseXOffset;
        const m5Marking: any = m5a.getPedalMarking();
        const releaseWidth: number = m5Marking.constructor.releaseGlyphWidth(m5Marking.render_options.glyph_point_size);
        // the Ped. glyph's left edge is 10px left of its x
        const m5DepressLeft: number = m5b.startNote.getAbsoluteX() + m5b.DepressXOffset - 10;
        expect(m5DepressLeft).to.be.greaterThanOrEqual(m5Release + releaseWidth + 6 - 0.01);
        expect((m5b.getPedalMarking() as any).DepressX).to.be.closeTo(m5DepressLeft + 10, 0.01);
    });

    it("reads a stop and a start at one time as a change: * left, Ped. right", async () => {
        const osmd: OpenSheetMusicDisplay = await load("pedal_sign_change_same_time.musicxml");
        const source: Pedal[] = sourcePedals(osmd.Sheet);
        expect(source.length).to.equal(4);
        // m1: explicit stop + start at beat 3
        expect(source[0].ChangeEnd).to.equal(true);
        expect(source[1].ChangeBegin).to.equal(true);
        expect(source[0].ParentEndMultiExpression).to.equal(source[1].ParentStartMultiExpression);
        // m2: explicit <pedal type="change"/> on a sign pedal
        expect(source[2].ChangeEnd).to.equal(true);
        expect(source[3].ChangeBegin).to.equal(true);
        expect(source[3].ParentEndMultiExpression.Timestamp.RealValue).to.equal(1);

        const pedals: VexFlowPedal[] = graphicalPedals(osmd);
        expect(pedals.length).to.equal(4);
        for (const [released, depressed] of [[pedals[0], pedals[1]], [pedals[2], pedals[3]]]) {
            expect(released.ReleaseText, "a change keeps its *").to.equal(undefined);
            expect(released.endNote).to.equal(depressed.startNote);
            const releaseMarking: any = released.getPedalMarking();
            const depressMarking: any = depressed.getPedalMarking();
            expect(releaseMarking.ChangeEnd).to.equal(true);
            expect(depressMarking.ChangeBegin).to.equal(true);
            // drawn: * right-aligned at x - gap, Ped. left-aligned at x + gap
            expect(releaseMarking.constructor.CHANGE_GAP).to.be.greaterThan(0);
        }
    });

    it("ends a pedal at a stop written before its start (other voice first)", async () => {
        // Widmung m9/m37 (81sabo): the treble voice carries <pedal type="stop"/> at beat 4, then <backup/> and the bass
        //   voice starts the pedal at beat 1
        const osmd: OpenSheetMusicDisplay = await load("pedal_sign_stop_before_start_in_xml.musicxml");
        const source: Pedal[] = sourcePedals(osmd.Sheet);
        expect(source.length).to.equal(2);
        expect(source[0].ParentEndMultiExpression).to.not.equal(undefined);
        expect(source[0].ParentEndMultiExpression.SourceMeasureParent.MeasureNumber).to.equal(1);
        expect(source[0].ParentEndMultiExpression.Timestamp.RealValue).to.be.closeTo(3 / 4, 1e-9);
        expect(source[0].ChangeEnd).to.equal(false);
        const graphical: VexFlowPedal[] = graphicalPedals(osmd);
        expect(graphical.length).to.equal(2);
        expect(graphical[0].ReleaseText, "its * is drawn").to.equal(undefined);
        expect(graphical[0].endNote.getAbsoluteX()).to.be.lessThan(graphical[1].startNote.getAbsoluteX());
    });

    it("keeps the Beethoven sign pedals (test_pedal_signs) with their explicit stops", async () => {
        const osmd: OpenSheetMusicDisplay = await load("test_pedal_signs.musicxml");
        const pedals: Pedal[] = [0, 1].flatMap(staffIndex => sourcePedals(osmd.Sheet, staffIndex));
        expect(pedals.length).to.be.greaterThan(0);
        for (const pedal of pedals) {
            expect(pedal.ParentEndMultiExpression, "every pedal has an end").to.not.equal(undefined);
            expect(pedal.ChangeEnd).to.equal(false);
        }
        const drawn: VexFlowPedal[] = osmd.GraphicSheet.MusicPages.flatMap(page => page.MusicSystems)
            .flatMap(system => system.StaffLines).flatMap(staffLine => staffLine.Pedals as VexFlowPedal[]);
        expect(drawn.length).to.be.greaterThan(0);
        for (const pedal of drawn) {
            expect(pedal.ReleaseText, "the release of an explicitly stopped pedal is drawn").to.not.equal(" ");
        }
    });
});
