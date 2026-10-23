import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A rehearsal mark over a slur keeps its half space from the slur's ink (user decision 10-24): the skyline has the
 * slur's middle line, and the drawer gives the slur an outer edge 0.05 (ends) to 0.3 (control points) further out;
 * the box's 2 px line also reaches 1 px under its bottom. With the gap read from the skyline the ink was 0.1-0.27
 * spaces apart (Glière Op. 91 III Piano m195, touching in osmd-dart at 834). Same rule as osmd-dart
 * test/rehearsal_slur_ink_margin_test.dart.
 */
describe("Rehearsal mark over a slur", () => {
    const steps: string[] = ["C", "D", "E", "F", "G", "A", "B"];
    // 12 measures, a rehearsal mark in each, sixteenths rising from the first note under a slur over the first four,
    //   a step higher each measure so the slur's top passes the staff top at several heights
    function scoreXml(): string {
        let measures: string = "";
        for (let m: number = 1; m <= 12; m++) {
            measures += `<measure number="${m}">`;
            if (m === 1) {
                measures += "<attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>2</beats>" +
                    "<beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>";
            }
            measures += `<direction placement="above"><direction-type><rehearsal>${String.fromCharCode(64 + m)}` +
                "</rehearsal></direction-type></direction>";
            for (let i: number = 0; i < 8; i++) {
                const index: number = steps.indexOf("D") + m - 1 + (i % 4) * 2;
                const slur: string = i === 0 ? "<notations><slur number=\"1\" type=\"start\" placement=\"above\"/></notations>"
                    : i === 3 ? "<notations><slur number=\"1\" type=\"stop\"/></notations>" : "";
                measures += `<note><pitch><step>${steps[index % 7]}</step><octave>${5 + Math.floor(index / 7)}</octave>` +
                    `</pitch><duration>1</duration><voice>1</voice><type>16th</type><stem>down</stem>${slur}</note>`;
            }
            measures += "</measure>";
        }
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list><score-part id=\"P1\">" +
            `<part-name>Violin</part-name></score-part></part-list><part id="P1">${measures}</part></score-partwise>`;
    }
    // the highest point of the slur's drawn outer edge between x0 and x1
    function outerTop(slur: GraphicalSlur, x0: number, x1: number): number {
        const p: any[] = [slur.bezierStartPt, slur.bezierStartControlPt, slur.bezierEndControlPt, slur.bezierEndPt];
        const out: number[] = [0.05, 0.3, 0.3, 0.05];
        let top: number = undefined;
        for (let i: number = 0; i <= 4000; i++) {
            const t: number = i / 4000;
            const u: number = 1 - t;
            const b: number[] = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
            let x: number = 0;
            let y: number = 0;
            for (let k: number = 0; k < 4; k++) {
                x += b[k] * p[k].x;
                y += b[k] * (p[k].y - out[k]);
            }
            if (x < x0 || x > x1) {
                continue;
            }
            top = top === undefined ? y : Math.min(top, y);
        }
        return top;
    }

    it("keeps half a space from the ink of the slur under it", () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "700px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        return osmd.load(scoreXml()).then(() => {
            osmd.render();
            const rules: any = osmd.EngravingRules;
            let checked: number = 0;
            for (const measures of osmd.GraphicSheet.MeasureList) {
                const measure: VexFlowMeasure = measures[0] as VexFlowMeasure;
                const stave: any = measure.getVFStave();
                const section: any = stave.getModifiers().filter((m: any) => m.getCategory() === "stavesection")[0];
                // the box's x-footprint, as calculateRehearsalMark reads it (relative to the staff line, as the skyline
                //   and the slur's points: the measure's absolute position includes the page margin by now), with the
                //   half space kept on either side
                let xOffset: number = rules.RehearsalMarkXOffsetDefault + rules.RehearsalMarkXOffset;
                if (measure.parentSourceMeasure.IsSystemStartMeasure) {
                    xOffset += rules.RehearsalMarkXOffsetSystemStartMeasure;
                }
                const start: number = measure.PositionAndShape.RelativePosition.x + (stave.getModifierXShift(0) + xOffset) / 10;
                const end: number = start + Math.max(18, rules.RehearsalMarkFontSize * 0.6 + rules.RehearsalMarkFontSize) / 10;
                let slurTop: number = undefined;
                for (const slur of measure.ParentStaffLine.GraphicalSlurs) {
                    if (slur.placement !== PlacementEnum.Above) {
                        continue;
                    }
                    const top: number = outerTop(slur, start - 0.5, end + 0.5);
                    if (top !== undefined) {
                        slurTop = slurTop === undefined ? top : Math.min(slurTop, top);
                    }
                }
                if (slurTop === undefined || slurTop >= 0) {
                    continue;
                }
                checked++;
                expect(section.minBottomY, `measure ${measure.MeasureNumber}`).to.not.equal(undefined);
                // the box line's outer edge (1 px under minBottomY) half a space over the slur's ink
                //   (to 0.01: the layout samples the curve every 0.02)
                expect((section.minBottomY + 1) / 10, `measure ${measure.MeasureNumber}`).to.be.at.most(slurTop - 0.5 + 0.01);
            }
            expect(checked).to.be.at.least(5);
        });
    });
});
