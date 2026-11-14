import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { GraphicalContinuousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalContinuousDynamicExpression";
import { GraphicalInstantaneousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalInstantaneousDynamicExpression";
import { TestUtils } from "../../Util/TestUtils";

/** Dynamics kept inside their measure and their system (81sabo A2 rows, 11-14; fixtures cut from the 81sabo
 *  transcription of Sibelius Op.47 III):
 *  - the piano's m263 "mp" with a crescendo from it is centred at its note's left border, at the first note of the
 *    measure half over the barline into m262: it is kept inside its measure, the crescendo after it
 *    (SIB3C-WP-RENDER-03; same as osmd-dart's expression_measure_start_test);
 *  - the violin's m217 "cresc." at the last eighth of the system went past the staff line's end
 *    (SIB3C-WP-RENDER-04; osmd-dart already keeps it inside). */
describe("Dynamics inside their measure and system", () => {
    const divs: HTMLElement[] = [];
    afterEach(() => {
        divs.splice(0).forEach(d => d.remove());
    });
    async function render(file: string, width: number): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = `${width}px`;
        divs.push(div);
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore(file));
        osmd.render();
        return osmd;
    }

    for (const width of [700, 820, 1024]) {
        it(`keeps the "mp" of m263 after its barline (width ${width})`, async () => {
            const osmd: OpenSheetMusicDisplay = await render("test_dynamic_wedge_measure_start.musicxml", width);
            const m263: GraphicalMeasure = osmd.GraphicSheet.MeasureList[2][0];
            const line: StaffLine = m263.ParentStaffLine;
            const mp: GraphicalInstantaneousDynamicExpression[] = line.AbstractExpressions
                .filter(e => e instanceof GraphicalInstantaneousDynamicExpression &&
                    (e as any).SourceExpression?.ParentMultiExpression?.SourceMeasureParent === m263.parentSourceMeasure &&
                    (e as any).Label?.Label?.text === "mp") as GraphicalInstantaneousDynamicExpression[];
            expect(mp.length).to.equal(1);
            const box: any = mp[0].PositionAndShape;
            expect(box.AbsolutePosition.x + box.BorderMarginLeft).to.be.at.least(m263.PositionAndShape.AbsolutePosition.x - 1e-6);
        });

        it(`keeps the "cresc." of the last eighth inside the staff line (width ${width})`, async () => {
            const osmd: OpenSheetMusicDisplay = await render("test_verbal_dynamic_system_end.musicxml", width);
            const lines: StaffLine[] = osmd.GraphicSheet.MusicPages.flatMap(p => p.MusicSystems).flatMap(s => s.StaffLines);
            const cresc: GraphicalContinuousDynamicExpression[] = lines.flatMap(l => l.AbstractExpressions)
                .filter(e => e instanceof GraphicalContinuousDynamicExpression && (e as GraphicalContinuousDynamicExpression).IsVerbal) as
                GraphicalContinuousDynamicExpression[];
            expect(cresc.length).to.equal(1);
            const line: StaffLine = cresc[0].ParentStaffLine;
            const box: any = cresc[0].PositionAndShape;
            expect(box.RelativePosition.x + box.BorderMarginRight).to.be.at.most(line.PositionAndShape.Size.width + 1e-6);
        });
    }
});
