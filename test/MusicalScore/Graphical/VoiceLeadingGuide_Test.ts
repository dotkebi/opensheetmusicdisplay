import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalVoiceLeadingGuide, VoiceLeadingGuidePart } from "../../../src/MusicalScore/Graphical/GraphicalVoiceLeadingGuide";
import { GraphicalNote } from "../../../src/MusicalScore/Graphical/GraphicalNote";
import { vexFlowVoiceLeadingGuideAnchor } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceLeadingGuideAnchor";
import { Note } from "../../../src/MusicalScore/VoiceData/Note";
import { VoiceLeadingGuide, VoiceLeadingGuideLineType } from "../../../src/MusicalScore/VoiceData/VoiceLeadingGuide";
import { PointF2D } from "../../../src/Common/DataObjects/PointF2D";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Voice leading guides: visual lines from notehead to notehead, read from MusicXML other-notation.
 * The fixture has six of them: from the middle note of a chord, to the upper note of a chord in the other staff,
 * chained on one note, to a note with an accidental, with the stop before the start in document order,
 * dashed, from a dotted note, and one with print-object="no".
 * (halftone in the descriptions below: OSMD half tones, C4 = 48)
 */
describe("Voice leading guides", () => {
    const withGuides: string = "test_voice_leading_guides.musicxml";
    const withoutGuides: string = "test_voice_leading_guides_without_guides.musicxml";

    function getXML(name: string): string {
        return new XMLSerializer().serializeToString(TestUtils.getScore(name));
    }

    async function load(name: string, width: number = 1200): Promise<{ osmd: OpenSheetMusicDisplay, div: HTMLElement }> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = width + "px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(getXML(name));
        return { div, osmd };
    }

    function allNotes(osmd: OpenSheetMusicDisplay): Note[] {
        const notes: Note[] = [];
        for (const measure of osmd.Sheet.SourceMeasures) {
            for (const container of measure.VerticalSourceStaffEntryContainers) {
                for (const staffEntry of container.StaffEntries) {
                    for (const voiceEntry of staffEntry?.VoiceEntries ?? []) {
                        notes.push(...voiceEntry.Notes);
                    }
                }
            }
        }
        return notes;
    }

    function guidesOf(osmd: OpenSheetMusicDisplay): VoiceLeadingGuide[] {
        const guides: VoiceLeadingGuide[] = [];
        for (const note of allNotes(osmd)) {
            for (const guide of note.VoiceLeadingGuides) {
                if (guide.StartNote === note) {
                    guides.push(guide);
                }
            }
        }
        return guides;
    }

    function describeNote(note: Note): string {
        return `m${note.SourceMeasure.MeasureNumber} staff${note.ParentStaff.idInMusicSheet} halftone${note.Pitch.getHalfTone()}`;
    }

    function drawnLines(osmd: OpenSheetMusicDisplay): GraphicalVoiceLeadingGuide[] {
        const lines: GraphicalVoiceLeadingGuide[] = [];
        for (const page of osmd.GraphicSheet.MusicPages) {
            for (const system of page.MusicSystems) {
                lines.push(...system.VoiceLeadingGuides);
            }
        }
        return lines;
    }

    /** Center of the notehead of exactly this note (not of its chord). */
    function noteheadCenter(osmd: OpenSheetMusicDisplay, note: Note): PointF2D {
        const graphicalNote: GraphicalNote = osmd.EngravingRules.GNote(note);
        return vexFlowVoiceLeadingGuideAnchor(graphicalNote).center;
    }

    function distanceToNotehead(osmd: OpenSheetMusicDisplay, note: Note, point: PointF2D): number {
        const center: PointF2D = noteheadCenter(osmd, note);
        return Math.hypot(center.x - point.x, center.y - point.y);
    }

    /** Distance of the notehead center from the (infinitely extended) line. */
    function distanceFromLine(osmd: OpenSheetMusicDisplay, note: Note, line: GraphicalVoiceLeadingGuide): number {
        const center: PointF2D = noteheadCenter(osmd, note);
        const dx: number = line.End.x - line.Start.x;
        const dy: number = line.End.y - line.Start.y;
        return Math.abs(dy * (center.x - line.Start.x) - dx * (center.y - line.Start.y)) / Math.hypot(dx, dy);
    }

    function expectAttachedToItsNotes(osmd: OpenSheetMusicDisplay, line: GraphicalVoiceLeadingGuide): void {
        const gap: number = osmd.EngravingRules.VoiceLeadingGuideNoteGap;
        for (const [note, point] of [[line.Guide.StartNote, line.Start], [line.Guide.EndNote, line.End]] as [Note, PointF2D][]) {
            const distance: number = distanceToNotehead(osmd, note, point);
            // outside of the notehead (half height 0.5) plus gap, but right next to it (accidental/dots: a bit further)
            expect(distance, describeNote(note)).to.be.greaterThan(0.5 + gap - 0.01);
            expect(distance, describeNote(note)).to.be.lessThan(3);
            // points exactly at its own notehead, and not at another note of the same chord
            expect(distanceFromLine(osmd, note, line), describeNote(note)).to.be.lessThan(0.01);
            for (const other of note.ParentVoiceEntry.Notes) {
                if (other !== note) {
                    expect(distanceFromLine(osmd, other, line), "other chord note of " + describeNote(note)).to.be.greaterThan(0.3);
                }
            }
        }
    }

    it("reads start and end note, line type and print-object from other-notation", async () => {
        const { osmd } = await load(withGuides);
        expect(osmd.Sheet.HasVoiceLeadingGuides).to.equal(true);
        const guides: VoiceLeadingGuide[] = guidesOf(osmd);
        expect(guides.map(guide => `${describeNote(guide.StartNote)} -> ${describeNote(guide.EndNote)} ${guide.LineType} ${guide.PrintObject}`))
            .to.deep.equal([
                "m1 staff0 halftone53 -> m2 staff1 halftone43 dotted true", // chord middle note -> upper chord note, other staff
                "m2 staff1 halftone43 -> m3 staff0 halftone54 dotted true", // chained on one note
                "m3 staff1 halftone38 -> m3 staff0 halftone59 dotted true", // stop before start in document order
                "m4 staff0 halftone60 -> m5 staff1 halftone40 dashed true",
                "m5 staff1 halftone41 -> m6 staff0 halftone48 dotted true", // line type omitted: dotted
                "m6 staff0 halftone48 -> m6 staff1 halftone36 dotted false",
            ]);
        expect(guides[3].LineType).to.equal(VoiceLeadingGuideLineType.Dashed);
    });

    it("doesn't change notes, ties, slurs, glissandi or timing", async () => {
        const musicalData: (sheet: OpenSheetMusicDisplay) => string[] = (sheet: OpenSheetMusicDisplay) => allNotes(sheet).map(note => [
            describeNote(note), note.getAbsoluteTimestamp().toString(), note.Length.toString(), note.ParentVoiceEntry.ParentVoice.VoiceId,
            note.NoteTie !== undefined, note.NoteSlurs.length, note.NoteGlissando !== undefined, note.isRest(),
        ].join(" "));
        const { osmd } = await load(withGuides);
        const reference: OpenSheetMusicDisplay = (await load(withoutGuides)).osmd;
        expect(reference.Sheet.HasVoiceLeadingGuides).to.equal(false);
        expect(musicalData(osmd)).to.deep.equal(musicalData(reference));
        expect(osmd.Sheet.SourceMeasures.map(measure => measure.Duration.toString()))
            .to.deep.equal(reference.Sheet.SourceMeasures.map(measure => measure.Duration.toString()));
    });

    it("draws each printed guide from its start notehead to its end notehead", async () => {
        const { osmd, div } = await load(withGuides);
        osmd.render();
        const lines: GraphicalVoiceLeadingGuide[] = drawnLines(osmd);
        expect(lines.length).to.equal(5); // the sixth is print-object="no"
        for (const line of lines) {
            expect(line.Part).to.equal(VoiceLeadingGuidePart.Full);
            expectAttachedToItsNotes(osmd, line);
            expect(line.SVGElement, "drawn").to.not.equal(undefined);
        }
        // cross-staff: the first guide goes down from the upper to the lower staff
        expect(lines[0].End.y).to.be.greaterThan(lines[0].Start.y + 2);
        const groups: NodeListOf<Element> = div.querySelectorAll("g.vf-voice-leading-guide");
        expect(groups.length).to.equal(5);
        expect(groups[0].querySelectorAll("path").length, "dots of a dotted line").to.be.greaterThan(5);
        expect(groups[3].querySelectorAll("path").length, "dashes of a dashed line").to.be.greaterThan(2);
        for (const path of Array.from(div.querySelectorAll("g.vf-voice-leading-guide path"))) {
            expect(path.getAttribute("d")).to.not.match(/NaN|Infinity|undefined/);
        }
    });

    it("draws nothing (and the same as before) for a score without guides", async () => {
        const { osmd, div } = await load(withoutGuides);
        osmd.render();
        expect(drawnLines(osmd).length).to.equal(0);
        expect(div.querySelectorAll("g.vf-voice-leading-guide").length).to.equal(0);

        const withGuidesDisabled: { osmd: OpenSheetMusicDisplay, div: HTMLElement } = await load(withGuides);
        withGuidesDisabled.osmd.EngravingRules.RenderVoiceLeadingGuides = false;
        withGuidesDisabled.osmd.render();
        expect(withGuidesDisabled.div.querySelectorAll("g.vf-voice-leading-guide").length).to.equal(0);
        // the guides take part in nothing but their own drawing: everything else is drawn identically
        expect(withGuidesDisabled.div.querySelectorAll("path").length).to.equal(div.querySelectorAll("path").length);
    });

    it("splits a guide at a system break and keeps both parts inside their system", async () => {
        const { osmd } = await load(withGuides, 420);
        osmd.render();
        const lines: GraphicalVoiceLeadingGuide[] = drawnLines(osmd);
        const broken: GraphicalVoiceLeadingGuide[] = lines.filter(line => line.Part !== VoiceLeadingGuidePart.Full);
        expect(broken.length, "guides interrupted by a system break").to.be.greaterThan(0);
        for (const page of osmd.GraphicSheet.MusicPages) {
            for (const system of page.MusicSystems) {
                const left: number = system.StaffLines[0].PositionAndShape.AbsolutePosition.x;
                const right: number = left + system.StaffLines[0].PositionAndShape.Size.width;
                const top: number = system.PositionAndShape.AbsolutePosition.y + system.PositionAndShape.BorderTop;
                const bottom: number = system.PositionAndShape.AbsolutePosition.y + system.PositionAndShape.BorderBottom;
                for (const line of system.VoiceLeadingGuides) {
                    for (const point of [line.Start, line.End]) {
                        expect(Number.isFinite(point.x) && Number.isFinite(point.y)).to.equal(true);
                        expect(point.x).to.be.within(left, right);
                        expect(point.y).to.be.within(top - 1, bottom + 1);
                    }
                    if (line.Part === VoiceLeadingGuidePart.Full) {
                        expectAttachedToItsNotes(osmd, line);
                    } else if (line.Part === VoiceLeadingGuidePart.BeforeBreak) {
                        expect(distanceToNotehead(osmd, line.Guide.StartNote, line.Start)).to.be.lessThan(3);
                        expect(line.End.x).to.be.closeTo(right - osmd.EngravingRules.VoiceLeadingGuideSystemBreakInset, 0.01);
                    } else {
                        expect(distanceToNotehead(osmd, line.Guide.EndNote, line.End)).to.be.lessThan(3);
                    }
                }
            }
        }
    });

    it("follows its notes after zoom and relayout", async () => {
        const { osmd, div } = await load(withGuides);
        osmd.render();
        const before: GraphicalVoiceLeadingGuide[] = drawnLines(osmd);
        osmd.Zoom = 1.7;
        osmd.render();
        const zoomed: GraphicalVoiceLeadingGuide[] = drawnLines(osmd);
        expect(zoomed.length).to.be.greaterThan(0);
        expect(zoomed[0]).to.not.equal(before[0]); // recalculated, not reused
        for (const line of zoomed.filter(guide => guide.Part === VoiceLeadingGuidePart.Full)) {
            expectAttachedToItsNotes(osmd, line);
        }
        div.style.width = "700px";
        osmd.Zoom = 1;
        osmd.render();
        const relayouted: GraphicalVoiceLeadingGuide[] = drawnLines(osmd);
        expect(relayouted.length).to.be.greaterThan(0);
        for (const line of relayouted.filter(guide => guide.Part === VoiceLeadingGuidePart.Full)) {
            expectAttachedToItsNotes(osmd, line);
        }
        expect(div.querySelectorAll("g.vf-voice-leading-guide").length).to.equal(relayouted.length);
    });

    it("is drawn the same by renderAsync", async () => {
        const sync: { osmd: OpenSheetMusicDisplay, div: HTMLElement } = await load(withGuides);
        sync.osmd.render();
        const async: { osmd: OpenSheetMusicDisplay, div: HTMLElement } = await load(withGuides);
        await async.osmd.renderAsync();
        const paths: (div: HTMLElement) => string[] = (div: HTMLElement) =>
            Array.from(div.querySelectorAll("g.vf-voice-leading-guide path")).map(path => path.getAttribute("d"));
        expect(paths(async.div).length).to.be.greaterThan(0);
        expect(paths(async.div)).to.deep.equal(paths(sync.div));
    });
});
