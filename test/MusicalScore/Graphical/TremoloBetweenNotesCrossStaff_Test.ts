import { expect } from "vitest";
import Vex from "vexflow";
import VF = Vex.Flow;
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { VexFlowGraphicalNote } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";

/**
 * A tremolo between two notes in the two staves of a piano part is drawn like a beam between the two stems: the strokes from one
 * stem to the other, the stems lengthened to them (81sabo: Sibelius, Violin Concerto III piano m261-264, a chord in the left
 * hand's staff, stem up, to one in the right hand's, stem down, two strokes under the right hand's staff; Vieuxtemps, Op. 31
 * piano m86, D4 in the right hand's staff to F3 in the left hand's, both stems up, three strokes at the right hand's stem tip).
 * They were not drawn at all: the strokes were only drawn between notes of one staffline. The layout reserves them under the
 * upper staff, so the dynamic and the wedge below it go under them (test_tremolo_between_notes_cross_staff.musicxml).
 * Same as osmd-dart's test/tremolo_between_notes_cross_staff_test.dart.
 */
describe("Tremolo between notes across the staves of a system", () => {
    for (const width of [834, 1024]) {
        it(`draws the strokes from stem to stem, the stems to the strokes (${width})`, async () => {
            const container: HTMLElement = TestUtils.getDivElement(document);
            container.style.width = `${width}px`;
            const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
            await osmd.load(TestUtils.getScore("test_tremolo_between_notes_cross_staff.musicxml"));
            osmd.render();
            type Box = {left: number, right: number, top: number, bottom: number};
            // the strokes as drawn, in units, by measure (ids osmd-trem<measureListIndex>-<staffIdInMusicSheet>-<n>)
            const strokes: Map<number, Box[]> = new Map<number, Box[]>();
            for (const group of Array.from(container.querySelectorAll("g[id^=\"osmd-trem\"]"))) {
                const measure: number = parseInt(group.id.substring("osmd-trem".length).split("-")[0], 10);
                const points: number[][] = (group.querySelector("path")?.getAttribute("d") ?? "").split(/[MLZ]/)
                    .filter(part => part.trim().length > 0).map(part => part.trim().split(" ").map(parseFloat));
                const list: Box[] = strokes.get(measure) ?? [];
                list.push({left: Math.min(...points.map(p => p[0])) / 10, right: Math.max(...points.map(p => p[0])) / 10,
                           top: Math.min(...points.map(p => p[1])) / 10, bottom: Math.max(...points.map(p => p[1])) / 10});
                strokes.set(measure, list);
            }
            const keys: number[] = Array.from(strokes.keys()).sort((a, b) => a - b);
            expect(keys.length, `strokes ${JSON.stringify(Array.from(strokes.entries()))}`).to.equal(2);
            expect(strokes.get(keys[0]).length).to.equal(2);
            expect(strokes.get(keys[1]).length).to.equal(3);

            const noteOf = (measure: number, staff: number): any =>
                (osmd.GraphicSheet.MeasureList[measure][staff].staffEntries[0].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote)
                    .vfnote[0];
            for (const [index, startStaff, stopStaff] of [[0, 1, 0], [1, 0, 1]]) {
                const start: any = noteOf(index, startStaff);
                const stop: any = noteOf(index, stopStaff);
                const group: Box[] = strokes.get(keys[index]);
                const top: number = Math.min(...group.map(s => s.top));
                const bottom: number = Math.max(...group.map(s => s.bottom));
                for (const s of group) {
                    // from the start note's stem to the stop note's
                    expect(s.left).to.be.closeTo(start.getStemX() / 10, 0.1);
                    expect(s.right).to.be.closeTo(stop.getStemX() / 10, 0.1);
                }
                for (const note of [start, stop]) {
                    // each stem ends at the strokes
                    const tip: number = note.getStemExtents().topY / 10;
                    expect(tip, `m${index + 1} stem tip ${tip}, strokes ${top}..${bottom} (${note.getStemDirection() === VF.Stem.UP ? "up" : "down"})`)
                        .to.be.within(top - 0.05, bottom + 0.05);
                }
            }

            // m1: under the upper staff, the dynamic below it under the strokes
            const upper: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
            const m1Bottom: number = Math.max(...strokes.get(keys[0]).map(s => s.bottom));
            expect(strokes.get(keys[0])[0].top).to.be.greaterThan(upper.PositionAndShape.AbsolutePosition.y + 4);
            const mp: BoundingBox = upper.AbstractExpressions.find(e => e.Label?.Label?.text === "mp").Label.PositionAndShape;
            const mpTop: number = mp.AbsolutePosition.y + mp.BorderMarginTop;
            // (the drawn path is rounded to hundredths of a pixel)
            expect(mpTop, `mp top ${mpTop}, strokes bottom ${m1Bottom}`).to.be.at.least(m1Bottom - 0.02);
            osmd.clear();
            container.remove();
        });
    }
});
