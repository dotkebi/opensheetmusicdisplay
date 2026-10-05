import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";

/**
 * A slur ran through an ornament over a note under it (Couperin, Concerts royaux I Prelude m7: the pincé over F#5,
 * with a slur from the grace note before it). Where an ornament goes is decided before the slurs; then a slur
 * clears an ornament in its middle when that takes a modest raise, and any ornament a slur would still touch, e.g.
 * one over the note the slur starts or ends on, goes over the slur.
 *
 * Sample: m1, a trill on the note a slur starts on (as in Beethoven, Symphony 5, iv, m340); m2, a mordent over a
 * high note in the middle of a slur; m3, a slur ending on a note with a mordent.
 */
describe("Ornaments and slurs", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_ornament_slur_clearance.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    it("keeps every slur clear of the ornaments", () => {
        let ornamentsUnderSlurs: number = 0;
        for (const column of osmd.GraphicSheet.MeasureList) {
            const measure: VexFlowMeasure = column[0] as VexFlowMeasure;
            const inks: { left: number, right: number, top: number, bottom: number, ornament: any }[] = measure.OrnamentInk;
            expect(inks.length, `ornaments in m${measure.MeasureNumber}`).to.equal(1);
            for (const ink of inks) {
                const shift: number = ink.ornament.slurClearanceYShift / 10;
                for (const slur of measure.ParentStaffLine.GraphicalSlurs) {
                    if ((slur as GraphicalSlur).placement !== PlacementEnum.Above) {
                        continue;
                    }
                    let curveTop: number = Number.POSITIVE_INFINITY;
                    let curveBottom: number = Number.NEGATIVE_INFINITY;
                    for (let i: number = 0; i <= 256; i++) {
                        const point: any = slur.calculateCurvePointAtIndex(i / 256);
                        if (point.x >= ink.left && point.x <= ink.right) {
                            curveTop = Math.min(curveTop, point.y);
                            curveBottom = Math.max(curveBottom, point.y);
                        }
                    }
                    if (curveTop === Number.POSITIVE_INFINITY) {
                        continue;
                    }
                    ornamentsUnderSlurs++;
                    const inside: boolean = curveBottom < ink.top + shift - 0.2;
                    const outside: boolean = curveTop > ink.bottom + shift + 0.2;
                    expect(inside || outside,
                           `m${measure.MeasureNumber}: ornament ${ink.top + shift}..${ink.bottom + shift}, slur ${curveTop}..${curveBottom}`)
                        .to.equal(true);
                }
            }
        }
        expect(ornamentsUnderSlurs).to.equal(3);
    });

    it("raises the trill on the note a slur starts on over the slur, and draws it there", () => {
        const measure: VexFlowMeasure = osmd.GraphicSheet.MeasureList[0][0] as VexFlowMeasure;
        const trill: any = measure.OrnamentInk[0].ornament;
        expect(trill.slurClearanceYShift).to.be.lessThan(0);
        // drawn where the layout put it: the ink recorded when drawn excludes the raise, the drawing includes it
        const recordedTop: number = trill.layoutInk.top;
        osmd.render();
        expect(trill.layoutInk.top).to.be.closeTo(recordedTop, 0.01);
    });
});

/**
 * Two treble voices folded onto one staff (Couperin, Concerts royaux I Menuet en trio, 1722 source, m2 and m21):
 * the lower voice's ornaments and slurs are below the staff, and its slur ran through the ornament on its first
 * note. The same rules hold below the notes: a slur below passes under an ornament in its middle, and an ornament
 * it would still touch goes down under it.
 */
describe("Ornaments and slurs below a lower voice", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_ornament_slur_clearance_lower_voice.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    it("keeps every slur below clear of the ornaments below", () => {
        let ornamentsAtSlurs: number = 0;
        for (const column of osmd.GraphicSheet.MeasureList) {
            const measure: VexFlowMeasure = column[0] as VexFlowMeasure;
            for (const ink of measure.BelowOrnamentInk) {
                const shift: number = ink.ornament.slurClearanceYShift / 10;
                for (const slur of measure.ParentStaffLine.GraphicalSlurs) {
                    if ((slur as GraphicalSlur).placement !== PlacementEnum.Below) {
                        continue;
                    }
                    let curveTop: number = Number.POSITIVE_INFINITY;
                    let curveBottom: number = Number.NEGATIVE_INFINITY;
                    for (let i: number = 0; i <= 256; i++) {
                        const point: any = slur.calculateCurvePointAtIndex(i / 256);
                        if (point.x >= ink.left && point.x <= ink.right) {
                            curveTop = Math.min(curveTop, point.y);
                            curveBottom = Math.max(curveBottom, point.y);
                        }
                    }
                    if (curveTop === Number.POSITIVE_INFINITY) {
                        continue;
                    }
                    ornamentsAtSlurs++;
                    const inside: boolean = curveTop > ink.bottom + shift + 0.2;
                    const outside: boolean = curveBottom < ink.top + shift - 0.2;
                    expect(inside || outside,
                           `m${measure.MeasureNumber}: ornament ${ink.top + shift}..${ink.bottom + shift}, slur ${curveTop}..${curveBottom}`)
                        .to.equal(true);
                }
            }
        }
        expect(ornamentsAtSlurs).to.equal(3);
    });

    it("drops the mordent on the note a slur below starts on under the slur", () => {
        const measure: VexFlowMeasure = osmd.GraphicSheet.MeasureList[0][0] as VexFlowMeasure;
        const mordent: any = measure.BelowOrnamentInk[0].ornament;
        expect(mordent.slurClearanceYShift).to.be.greaterThan(0);
    });
});
