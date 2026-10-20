import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalKeyboardHandBracket } from "../../../src/MusicalScore/Graphical/GraphicalKeyboardHandBracket";
import { GraphicalUnknownExpression } from "../../../src/MusicalScore/Graphical/GraphicalUnknownExpression";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { VexFlowGraphicalNote } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { vexFlowVoiceLeadingGuideAnchor } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceLeadingGuideAnchor";
import { VoiceLeadingGuideAnchor } from "../../../src/MusicalScore/Graphical/GraphicalVoiceLeadingGuide";
import { Note } from "../../../src/MusicalScore/VoiceData/Note";
import { KeyboardHand } from "../../../src/MusicalScore/VoiceData/OtherTechnical";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { PointF2D } from "../../../src/Common/DataObjects/PointF2D";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Keyboard hand brackets: SMuFL keyboardPlayWithLH/RH, read from MusicXML other-technical
 * (Mozart K.314 III piano m161–163, B&H 16417).
 * The fixture has four of them in the upper staff: m1 A4 left hand with "l.h." below at its time,
 * m2 the middle note of a chord right hand without text, m3 F#4 (accidental) left hand without text,
 * m4 F5 right hand with "r.h." above at its time over a second voice. And two other-technicals that aren't drawn:
 * an end glyph (keyboardPlayWithLHEnd) and a text-only one.
 * (halftone in the descriptions below: OSMD half tones, C4 = 48)
 */
describe("Keyboard hand brackets", () => {
    const withBrackets: string = "test_keyboard_hand_brackets.musicxml";
    const withoutBrackets: string = "test_keyboard_hand_brackets_without_brackets.musicxml";

    function getXML(name: string): string {
        return new XMLSerializer().serializeToString(TestUtils.getScore(name));
    }

    async function load(name: string): Promise<{ osmd: OpenSheetMusicDisplay, div: HTMLElement }> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1200px";
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

    function describeNote(note: Note): string {
        return `m${note.SourceMeasure.MeasureNumber} halftone${note.Pitch.getHalfTone()}`;
    }

    function brackets(osmd: OpenSheetMusicDisplay): [StaffLine, GraphicalKeyboardHandBracket][] {
        const result: [StaffLine, GraphicalKeyboardHandBracket][] = [];
        for (const page of osmd.GraphicSheet.MusicPages) {
            for (const system of page.MusicSystems) {
                for (const staffLine of system.StaffLines) {
                    for (const bracket of staffLine.KeyboardHandBrackets) {
                        result.push([staffLine, bracket]);
                    }
                }
            }
        }
        return result;
    }

    function bracketPaths(div: HTMLElement): string[] {
        return Array.from(div.querySelectorAll("g.vf-keyboard-hand-bracket path")).map(path => path.getAttribute("d"));
    }

    /** The text of the hand at the bracket's note (l.h. / r.h.), relative to the staffline like the bracket. */
    function handText(staffLine: StaffLine, bracket: GraphicalKeyboardHandBracket): { left: number, top: number, bottom: number } {
        for (const expression of staffLine.AbstractExpressions) {
            if (!(expression instanceof GraphicalUnknownExpression)) {
                continue;
            }
            const text: string = expression.Label.Label.text;
            if ((text !== "l.h." && text !== "r.h.") ||
                expression.sourceMultiExpression.SourceMeasureParent.MeasureNumber !== bracket.Note.SourceMeasure.MeasureNumber) {
                continue;
            }
            const box: BoundingBox = expression.Label.PositionAndShape;
            return {
                bottom: box.RelativePosition.y + box.BorderMarginBottom,
                left: box.RelativePosition.x + box.BorderMarginLeft,
                top: box.RelativePosition.y + box.BorderMarginTop,
            };
        }
        return undefined;
    }

    it("reads other-technical: SMuFL name, text and placement", async () => {
        const { osmd } = await load(withBrackets);
        const read: string[] = [];
        for (const note of allNotes(osmd)) {
            for (const technical of note.OtherTechnicals) {
                read.push(`${describeNote(note)} ${technical.Smufl} "${technical.Text}" ${PlacementEnum[technical.Placement]} ${technical.KeyboardHand}`);
            }
        }
        expect(read).to.deep.equal([
            "m1 halftone57 keyboardPlayWithLH \"\" Below left",
            "m2 halftone64 keyboardPlayWithRH \"\" Above right",
            "m3 halftone54 keyboardPlayWithLH \"\" Below left",
            // kept, not drawn
            "m3 halftone55 keyboardPlayWithLHEnd \"\" Below undefined",
            "m3 halftone57 undefined \"○\" Above undefined",
            "m4 halftone65 keyboardPlayWithRH \"\" Above right",
        ]);
    });

    it("draws a hook at the notehead and a line towards the hand", async () => {
        const { osmd } = await load(withBrackets);
        osmd.render();
        const drawn: [StaffLine, GraphicalKeyboardHandBracket][] = brackets(osmd);
        expect(drawn.map(([, bracket]) => `${describeNote(bracket.Note)} ${bracket.Hand}`)).to.deep.equal([
            "m1 halftone57 left",
            "m2 halftone64 right",
            "m3 halftone54 left",
            "m4 halftone65 right",
        ]);
        const rules: any = osmd.EngravingRules;
        for (const [staffLine, bracket] of drawn) {
            const reason: string = describeNote(bracket.Note);
            const origin: PointF2D = staffLine.PositionAndShape.AbsolutePosition;
            const anchor: VoiceLeadingGuideAnchor = vexFlowVoiceLeadingGuideAnchor(rules.GNote(bracket.Note));
            const lineRight: number = bracket.LineX + bracket.LineWidth / 2;

            // the hook encloses the notehead: at its top edge (left hand, line down) or bottom edge (right hand, line up), pointing at it
            expect(bracket.Direction).to.equal(bracket.Hand === KeyboardHand.Left ? 1 : -1);
            expect(bracket.HookY, reason).to.be.closeTo(anchor.center.y - origin.y - bracket.Direction * 0.5, 0.01);
            expect(bracket.HookEndX - bracket.LineX, reason).to.be.closeTo(rules.KeyboardHandBracketHookLength, 1e-9);
            expect((bracket.EndY - bracket.HookY) * bracket.Direction, `${reason}: the line goes towards the hand`)
                .to.be.at.least(rules.KeyboardHandBracketHookLength);

            // left of every notehead of the chord where it is drawn, and of the accidental
            for (const other of bracket.Note.ParentVoiceEntry.Notes) {
                const graphical: VexFlowGraphicalNote = rules.GNote(other) as VexFlowGraphicalNote;
                const head: any = (graphical.vfnote[0] as any).note_heads[graphical.vfnoteIndex];
                expect(lineRight, `${reason}: chord note ${describeNote(other)}`)
                    .to.be.at.most(head.getAbsoluteX() / 10 - origin.x - rules.KeyboardHandBracketNoteGap + 0.01);
                expect(bracket.HookEndX, `${reason}: hook short of ${describeNote(other)}`).to.be.lessThan(head.getAbsoluteX() / 10 - origin.x);
            }
            for (const box of anchor.boxes) {
                expect(lineRight, `${reason}: accidental`).to.be.at.most(box.x - box.halfWidth - origin.x - rules.KeyboardHandBracketNoteGap + 0.01);
            }

            // reaches its hand's text (to its near edge, beside it), else the default length
            const text: { left: number, top: number, bottom: number } = handText(staffLine, bracket);
            if (!text) {
                expect(Math.abs(bracket.EndY - bracket.HookY), reason).to.be.closeTo(rules.KeyboardHandBracketLength, 1e-9);
            } else {
                expect(bracket.EndY, `${reason}: to the text`).to.be.closeTo(bracket.Direction > 0 ? text.top : text.bottom, 1e-9);
                expect(lineRight < text.left || (bracket.Direction > 0 ? bracket.EndY <= text.top : bracket.EndY >= text.bottom),
                       `${reason}: not into the text`).to.equal(true);
            }

            // reserved: nothing placed later on its side runs into the line
            const from: number = bracket.LineX - bracket.LineWidth / 2;
            const to: number = bracket.LineX + bracket.LineWidth / 2;
            if (bracket.Direction > 0) {
                expect(staffLine.SkyBottomLineCalculator.getBottomLineMaxInRange(from, to), reason).to.be.at.least(bracket.EndY - 1e-9);
            } else {
                expect(staffLine.SkyBottomLineCalculator.getSkyLineMinInRange(from, to), reason).to.be.at.most(bracket.EndY + 1e-9);
            }
        }
        const withText: [StaffLine, GraphicalKeyboardHandBracket][] = drawn.filter(([staffLine, bracket]) => handText(staffLine, bracket));
        expect(withText.length).to.equal(2);
        expect(withText[0][1].EndY, "l.h. below the staff").to.be.greaterThan(4);
        expect(withText[1][1].EndY, "r.h. above the staff").to.be.lessThan(0);
    });

    it("draws each bracket as one filled path, hook and line", async () => {
        const { osmd, div } = await load(withBrackets);
        osmd.render();
        const drawn: [StaffLine, GraphicalKeyboardHandBracket][] = brackets(osmd);
        const paths: string[] = bracketPaths(div);
        expect(paths.length).to.equal(drawn.length);
        const fills: Element[] = Array.from(div.querySelectorAll("g.vf-keyboard-hand-bracket path"));
        for (const [index, [staffLine, bracket]] of drawn.entries()) {
            expect(fills[index].getAttribute("fill")).to.not.equal("none");
            expect(paths[index]).to.not.match(/NaN|Infinity|undefined/);
            // drawn where it was laid out: the outline's points, in pixels
            const origin: PointF2D = staffLine.PositionAndShape.AbsolutePosition;
            const numbers: number[] = paths[index].match(/-?[\d.]+/g).map(Number);
            const outline: PointF2D[] = bracket.outline();
            expect(numbers.length).to.equal(outline.length * 2);
            for (const [pointIndex, point] of outline.entries()) {
                expect(numbers[pointIndex * 2]).to.be.closeTo((origin.x + point.x) * 10, 0.01);
                expect(numbers[pointIndex * 2 + 1]).to.be.closeTo((origin.y + point.y) * 10, 0.01);
            }
            // hook from the line to the right, at the hook's end of the line
            expect(Math.max(...outline.map(p => p.x))).to.be.closeTo(bracket.HookEndX, 1e-9);
            expect(Math.min(...outline.map(p => p.x))).to.be.closeTo(bracket.LineX - bracket.LineWidth / 2, 1e-9);
        }
    });

    it("draws nothing for a score without hand brackets or when disabled", async () => {
        const { osmd, div } = await load(withoutBrackets);
        osmd.render();
        expect(brackets(osmd).length).to.equal(0);
        expect(bracketPaths(div).length).to.equal(0);

        const disabled: { osmd: OpenSheetMusicDisplay, div: HTMLElement } = await load(withBrackets);
        disabled.osmd.EngravingRules.RenderKeyboardHandBrackets = false;
        disabled.osmd.render();
        expect(brackets(disabled.osmd).length).to.equal(0);
        expect(bracketPaths(disabled.div).length).to.equal(0);
    });

    it("is laid out and drawn the same by renderAsync", async () => {
        const sync: { osmd: OpenSheetMusicDisplay, div: HTMLElement } = await load(withBrackets);
        sync.osmd.render();
        const async: { osmd: OpenSheetMusicDisplay, div: HTMLElement } = await load(withBrackets);
        await async.osmd.renderAsync();
        const describe: (osmd: OpenSheetMusicDisplay) => string[] = (osmd: OpenSheetMusicDisplay) =>
            brackets(osmd).map(([, b]) => `${b.LineX} ${b.HookEndX} ${b.HookY} ${b.EndY}`);
        expect(describe(async.osmd).length).to.equal(4);
        expect(describe(async.osmd)).to.deep.equal(describe(sync.osmd));
        expect(bracketPaths(async.div)).to.deep.equal(bracketPaths(sync.div));
    });
});
