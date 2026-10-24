import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowPedal } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowPedal";
import { Pedal } from "../../../src/MusicalScore/VoiceData/Expressions/ContinuousExpressions/Pedal";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { TestUtils } from "../../Util/TestUtils";

/**
 * 81sabo review, D bundle (2026-10-24): pedals as engraved (user decision 2026-10-24 B1-SOURCE-DEFAULT). The reader dropped
 * the direction's placement="above" (Schumann Op.47 IV m199–274, Viotti No.22 I·III: Ped./* over the bass staff),
 * <pedal relative-x> (Viotti I m45, III: a release between two notes) and a stop that closed no pedal (Viotti III m244·m259,
 * Schumann Op.47 II m260: the engraver's * alone). Same fixture as osmd-dart test/pedal_placement_relativex_release_only_test.dart
 * (test/fixtures/pedal_above_relativex_release_only.musicxml).
 */
describe("Pedal placement above, relative-x and a stop that closed nothing", () => {
    const note: (step: string, octave: number, staff: number) => string = (step: string, octave: number, staff: number): string =>
        `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>4</duration>` +
        `<voice>${staff === 1 ? 1 : 5}</voice><type>quarter</type><staff>${staff}</staff></note>`;
    const pedalXml: (type: string, placement: string, relativeX?: number) => string =
        (type: string, placement: string, relativeX?: number): string =>
        `<direction placement="${placement}"><direction-type><pedal type="${type}" line="no" sign="yes"` +
        (relativeX !== undefined ? ` relative-x="${relativeX}"` : "") + "/></direction-type><staff>2</staff></direction>";
    const treble: string = note("C", 5, 1) + note("D", 5, 1) + note("E", 5, 1) + "<backup><duration>12</duration></backup>";
    const xml: string = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list>" +
        "<score-part id=\"P1\"><part-name>Piano</part-name></score-part></part-list><part id=\"P1\">" +
        "<measure number=\"1\"><attributes><divisions>4</divisions><time><beats>3</beats><beat-type>4</beat-type></time>" +
        "<staves>2</staves><clef number=\"1\"><sign>G</sign><line>2</line></clef><clef number=\"2\"><sign>F</sign><line>4</line>" +
        "</clef></attributes>" + treble +
        pedalXml("start", "above", -5) + note("C", 3, 2) + note("G", 3, 2) + pedalXml("stop", "above", 12) + note("E", 3, 2) +
        "</measure><measure number=\"2\">" + treble +
        note("C", 3, 2) + note("G", 3, 2) + pedalXml("stop", "below") + note("E", 3, 2) +
        "</measure><measure number=\"3\">" + treble +
        pedalXml("start", "below") + note("C", 3, 2) + note("G", 3, 2) + note("E", 3, 2) + pedalXml("stop", "below", -6) +
        "</measure></part></score-partwise>";

    async function render(): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(xml);
        osmd.render();
        return osmd;
    }
    function sourcePedals(osmd: OpenSheetMusicDisplay): Pedal[] {
        const source: Pedal[] = [];
        for (const measure of osmd.Sheet.SourceMeasures) {
            for (const multi of measure.StaffLinkedExpressions[1]) {
                if (multi.PedalStart && source.indexOf(multi.PedalStart) < 0) {
                    source.push(multi.PedalStart);
                }
            }
        }
        return source;
    }

    it("reads placement, relative-x and a stop that closed nothing", async () => {
        const osmd: OpenSheetMusicDisplay = await render();
        const source: Pedal[] = sourcePedals(osmd);
        expect(source.map(p => `${p.ParentStartMultiExpression.SourceMeasureParent.MeasureNumber}@${p.ParentStartMultiExpression.Timestamp}` +
            `-${p.ParentEndMultiExpression.SourceMeasureParent.MeasureNumber}@${p.ParentEndMultiExpression.Timestamp}` +
            ` ${PlacementEnum[p.Placement]} rx=${p.RelativeX} rrx=${p.ReleaseRelativeX}${p.ReleaseOnly ? " releaseOnly" : ""}`))
            .to.deep.equal([
                "1@0/1-1@1/2 Above rx=-5 rrx=12",
                "2@1/2-2@1/2 Below rx=0 rrx=0 releaseOnly",
                "3@0/1-3@3/4 Below rx=0 rrx=-6",
            ]);
        expect(source[1].ParentStartMultiExpression).to.equal(source[1].ParentEndMultiExpression);
    });

    it("draws the pedal above the staff, clearing its skyline, and the others below", async () => {
        const osmd: OpenSheetMusicDisplay = await render();
        const staffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[1];
        const pedals: VexFlowPedal[] = staffLine.Pedals as VexFlowPedal[];
        expect(pedals.length).to.equal(3);
        const above: VexFlowPedal = pedals[0];
        expect(above.getPedal.Placement).to.equal(PlacementEnum.Above);
        const numLines: number = staffLine.StaffLines.length;
        // VexFlow draws the baseline at getYForLine(line + 3 + numLines): above the top staff line (0)
        const line: number = (above.getPedalMarking() as any).line;
        const baseline: number = line + 3 + numLines;
        expect(baseline, "baseline above the top staff line").to.be.at.most(-0.8);
        const stave: any = above.startNote.getStave();
        expect(stave.getYForBottomText(line + 3)).to.be.below(stave.getYForLine(0));
        for (const below of pedals.slice(1)) {
            expect(below.getPedal.Placement).to.equal(PlacementEnum.Below);
            expect((below.getPedalMarking() as any).line + 3 + numLines, "below the staff").to.be.at.least(numLines - 1 + 1.5);
        }
        const pedX: number = above.startVfVoiceEntry.PositionAndShape.AbsolutePosition.x - staffLine.PositionAndShape.AbsolutePosition.x +
            (above.DepressXOffset ?? 0) / 10;
        expect(staffLine.SkyBottomLineCalculator.getSkyLineMinInRange(pedX - 1.6, pedX + 3.4), "skyline raised over the Ped.")
            .to.be.at.most(baseline - 2 + 1e-9);
    });

    it("moves the Ped. and the * by relative-x, also a release at the stave end", async () => {
        const osmd: OpenSheetMusicDisplay = await render();
        const pedals: VexFlowPedal[] = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[1].Pedals as VexFlowPedal[];
        expect(pedals[0].DepressXOffset, "Ped. 5 px left of its note").to.be.closeTo(-5, 1e-9);
        expect(pedals[0].ReleaseXOffset, "* 12 px right of its note").to.be.closeTo(12, 1e-9);
        const last: VexFlowPedal = pedals[2];
        expect(last.getPedal.EndsStave).to.equal(true);
        expect(last.ReleaseAfterDepress, "a moved release at the stave end is drawn at its offset").to.equal(true);
        const marking: any = last.getPedalMarking();
        const releaseWidth: number = marking.constructor.releaseGlyphWidth(marking.render_options.glyph_point_size);
        const atStaveEnd: number = (last.endNote.getStave() as any).getNoteEndX() + (marking.endStaveAddedWidth || 0) -
            marking.render_options.text_margin_right - releaseWidth;
        // the * glyph is drawn 2px left of its x
        expect(last.endNote.getAbsoluteX() + last.ReleaseXOffset - 2).to.be.closeTo(atStaveEnd - 6, 1e-6);
    });

    it("draws the * of a stop that closed nothing alone", async () => {
        const osmd: OpenSheetMusicDisplay = await render();
        const pedals: VexFlowPedal[] = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[1].Pedals as VexFlowPedal[];
        const alone: VexFlowPedal = pedals[1];
        expect(alone.getPedal.ReleaseOnly).to.equal(true);
        expect(alone.DepressText, "no Ped.").to.equal(" ");
        expect(alone.ReleaseText, "the * is drawn").to.equal(undefined);
        expect(alone.startNote, "anchored at the note at its time (m2 beat 3)").to.equal(alone.endNote);
        expect(alone.startVfVoiceEntry.parentStaffEntry.parentMeasure.MeasureNumber).to.equal(2);
        expect(alone.ReleaseXOffset).to.equal(undefined);
    });
    it("keeps the * of a stop between the first two notes after a Ped. in the previous measure between them", async () => {
        // Mozart K.313 I piano m152–153: the clamp that keeps a * right of its own Ped. compared x across measures before
        //   the layout was final and pushed the * near beat 3. Same fixture as osmd-dart
        //   test/fixtures/pedal_stop_between_notes_after_previous_measure_ped.musicxml.
        const bass: (step: string, octave: number, duration: number, type: string) => string =
            (step: string, octave: number, duration: number, type: string): string =>
            `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${duration}</duration>` +
            `<voice>5</voice><type>${type}</type><staff>2</staff></note>`;
        const whole: string = "<note><pitch><step>C</step><octave>5</octave></pitch><duration>16</duration><voice>1</voice>" +
            "<type>whole</type><staff>1</staff></note><backup><duration>16</duration></backup>";
        const crossXml: string = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list>" +
            "<score-part id=\"P1\"><part-name>Piano</part-name></score-part></part-list><part id=\"P1\">" +
            "<measure number=\"1\"><attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time>" +
            "<staves>2</staves><clef number=\"1\"><sign>G</sign><line>2</line></clef><clef number=\"2\"><sign>F</sign><line>4</line>" +
            "</clef></attributes>" + whole + bass("C", 3, 4, "quarter") + bass("E", 3, 4, "quarter") + bass("G", 3, 2, "eighth") +
            pedalXml("start", "below") + bass("B", 3, 2, "eighth") + bass("C", 4, 2, "eighth") + bass("D", 4, 2, "eighth") +
            "</measure><measure number=\"2\"><direction placement=\"below\"><direction-type><pedal type=\"stop\" line=\"no\" " +
            "sign=\"yes\"/></direction-type><offset>1</offset><staff>2</staff></direction>" + whole + bass("G", 2, 4, "quarter") +
            bass("D", 3, 2, "eighth").repeat(6) + "</measure></part></score-partwise>";
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(crossXml);
        osmd.render();
        const pedals: VexFlowPedal[] = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[1].Pedals as VexFlowPedal[];
        expect(pedals.length).to.equal(1);
        const pedal: VexFlowPedal = pedals[0];
        const endMeasure: any = pedal.endVfVoiceEntry.parentStaffEntry.parentMeasure;
        expect(endMeasure.MeasureNumber).to.equal(2);
        const xOf: (index: number) => number = (index: number): number =>
            (endMeasure.staffEntries[index].graphicalVoiceEntries[0] as any).vfStaveNote.getAbsoluteX();
        const releaseX: number = pedal.endNote.getAbsoluteX() + (pedal.ReleaseXOffset ?? 0);
        expect(releaseX).to.be.above(xOf(0));
        expect(releaseX, "the * is before the second note, as the stop time").to.be.below(xOf(1));
    });
    it("puts the Ped. after a release in time order, at the other staff's note over a rest, and keeps a change's gap", async () => {
        // m1, as Fauré Fantaisie Op.79 piano m1: stops and starts with <offset> in reverse time order. m2, as Enesco
        //   Concertstück piano m68: a bass staff of only a whole-measure rest, Ped. at 0, a change at beat 2, the stop at
        //   the end. Same fixture as osmd-dart test/fixtures/pedal_reverse_order_and_rest_staff.musicxml.
        const ped: (type: string, offset: number) => string = (type: string, offset: number): string =>
            `<direction placement="below"><direction-type><pedal type="${type}" line="no" sign="yes"/></direction-type>` +
            (offset ? `<offset>${offset}</offset>` : "") + "<staff>2</staff></direction>";
        const bassNotes: string = note("C", 3, 2) + note("G", 3, 2) + note("E", 3, 2);
        const orderXml: string = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list>" +
            "<score-part id=\"P1\"><part-name>Piano</part-name></score-part></part-list><part id=\"P1\">" +
            "<measure number=\"1\"><attributes><divisions>4</divisions><time><beats>3</beats><beat-type>4</beat-type></time>" +
            "<staves>2</staves><clef number=\"1\"><sign>G</sign><line>2</line></clef><clef number=\"2\"><sign>F</sign><line>4</line>" +
            "</clef></attributes>" + ped("stop", 7) + ped("start", 4) + ped("stop", 3) + ped("start", 0) + treble + bassNotes +
            "</measure><measure number=\"2\">" + ped("start", 0) + ped("stop", 4) + ped("start", 4) + ped("stop", 12) + treble +
            "<note><rest measure=\"yes\"/><duration>12</duration><voice>5</voice><staff>2</staff></note>" +
            "</measure></part></score-partwise>";
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(orderXml);
        osmd.render();
        const pedals: VexFlowPedal[] = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[1].Pedals as VexFlowPedal[];
        expect(pedals.length).to.equal(4);
        const depressX: (p: VexFlowPedal) => number = (p: VexFlowPedal): number => p.startNote.getAbsoluteX() + (p.DepressXOffset ?? 0);
        const releaseX: (p: VexFlowPedal) => number = (p: VexFlowPedal): number => p.endNote.getAbsoluteX() + (p.ReleaseXOffset ?? 0);
        const noteX: (measure: number, staff: number, index: number) => number = (measure: number, staff: number, index: number): number =>
            (osmd.GraphicSheet.MeasureList[measure - 1][staff].staffEntries[index].graphicalVoiceEntries[0] as any).vfStaveNote.getAbsoluteX();
        const inMeasure: (m: number) => VexFlowPedal[] = (m: number): VexFlowPedal[] =>
            pedals.filter(p => p.startVfVoiceEntry.parentStaffEntry.parentMeasure.MeasureNumber === m).sort((a, b) => depressX(a) - depressX(b));
        const m1: VexFlowPedal[] = inMeasure(1);
        expect(m1.length).to.equal(2);
        expect(depressX(m1[0]), "not pushed right of the * of the later pedal").to.be.closeTo(noteX(1, 1, 0), 1e-6);
        expect(releaseX(m1[0])).to.be.below(depressX(m1[1]));
        const m2: VexFlowPedal[] = inMeasure(2);
        expect(m2.length).to.equal(2);
        expect(depressX(m2[0]), "the Ped. at 0 at the treble note at 0").to.be.closeTo(noteX(2, 0, 0), 1e-6);
        expect(m2[0].getPedal.BeginsStave).to.equal(false);
        const beat2: number = noteX(2, 0, 1);
        const marking: any = m2[0].getPedalMarking();
        const releaseWidth: number = marking.constructor.releaseGlyphWidth(marking.render_options.glyph_point_size);
        expect(m2[0].ChangeEnd).to.equal(true);
        // the * glyph is drawn 2px left of its x
        expect(releaseX(m2[0]) - 2 + releaseWidth, "the * ends left of beat 2").to.be.at.most(beat2 - 3 + 1e-6);
        expect(depressX(m2[1])).to.be.closeTo(beat2, 1e-6);
        expect(m2[1].ChangeBegin).to.equal(true);
    });
});
