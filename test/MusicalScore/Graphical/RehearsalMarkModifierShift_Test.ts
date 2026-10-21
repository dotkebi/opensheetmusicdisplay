import { expect } from "chai";
import Vex from "vexflow";
import VF = Vex.Flow;
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { TestUtils } from "../../Util/TestUtils";
import { VexFlowMusicSheetCalculator } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import { SkyBottomLineCalculator } from "../../../src/MusicalScore/Graphical/SkyBottomLineCalculator";

/**
 * A rehearsal mark is lifted above what is under its box, read from the skyline over the box's x-footprint, which starts
 * after the clef, key and time signature (Stave.getModifierXShift()), where VexFlow draws the box. osmd-dart started it at
 * the measure's left (Mozart K. 313 III Flute m84, Stamitz Op. 29 III Piano m167, Glière Op. 91 III Piano m300). The
 * footprint is read with the half-space margin kept under the box on either side too, so that a slur rising beside the box
 * does not meet its corner (Glière m145). Same rules as osmd-dart test/rehearsal_mark_modifier_shift_test.dart.
 */
describe("Rehearsal mark footprint", () => {
    const letters: string = "ABCDEFGHIJKLMNOPQRSTUVWX";
    function note(step: string, octave: number, duration: number, type: string): string {
        return `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${duration}</duration>` +
            `<voice>1</voice><type>${type}</type></note>`;
    }
    function scoreXml(measures: string): string {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list><score-part id=\"P1\">" +
            `<part-name>Flute</part-name></score-part></part-list><part id="P1">${measures}</part></score-partwise>`;
    }
    const attributes: string = "<attributes><divisions>4</divisions><key><fifths>1</fifths></key><time><beats>4</beats>" +
        "<beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>";
    function rehearsal(label: string): string {
        return `<direction><direction-type><rehearsal>${label}</rehearsal></direction-type></direction>`;
    }
    function render(source: string, width: number): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = `${width}px`;
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        return osmd.load(source).then(() => {
            osmd.render();
            return osmd;
        });
    }
    function section(measure: VexFlowMeasure): any {
        const found: any[] = measure.getVFStave().getModifiers().filter((m: any) => m.getCategory() === "stavesection");
        expect(found.length).to.equal(1);
        return found[0];
    }

    it("clears the high notes under it at line starts and key changes", () => {
        // 24 measures of A6 G6 F6 E6, a mark in every measure, a key change every third measure
        let measures: string = "";
        for (let m: number = 1; m <= 24; m++) {
            const key: string = m === 1 ? attributes :
                m % 3 === 0 ? `<attributes><key><fifths>${Math.floor(m / 3) % 2 === 1 ? 2 : 1}</fifths></key></attributes>` : "";
            measures += `<measure number="${m}">${key}${rehearsal(letters[m - 1])}` +
                ["A", "G", "F", "E"].map(s => note(s, 6, 4, "quarter")).join("") + "</measure>";
        }
        return render(scoreXml(measures), 700).then(osmd => {
            let lineStarts: number = 0;
            let keyChangesInLine: number = 0;
            for (const measures2 of osmd.GraphicSheet.MeasureList) {
                const measure: VexFlowMeasure = measures2[0] as VexFlowMeasure;
                const stave: VF.Stave = measure.getVFStave();
                const lineStart: boolean = measure.ParentStaffLine.Measures[0] === measure;
                if (lineStart) {
                    lineStarts++;
                } else if (stave.getModifierXShift(0) > 0) {
                    keyChangesInLine++;
                }
                // the box is drawn over the first note (A6): its top, relative to the top staff line, in px
                const firstNote: VF.StaveNote = (measure as any).vfVoices[1].getTickables()[0] as VF.StaveNote;
                const noteTop: number = Math.min(...firstNote.getYs()) - stave.getYForLine(0) - 5;
                const mark: any = section(measure);
                expect(mark.minBottomY, `m${measure.MeasureNumber}`).to.not.equal(undefined);
                expect(mark.minBottomY, `m${measure.MeasureNumber}`).to.be.at.most(noteTop);
                // the system-start x offset
                expect(mark.x - stave.getX(), `m${measure.MeasureNumber}`).to.equal(lineStart ? -10 : 10);
            }
            expect(lineStarts).to.be.greaterThan(1);
            expect(keyChangesInLine).to.be.greaterThan(0);
        });
    });

    it("reads the skyline over the drawn box and half a space on either side", () => {
        // VexFlow 1.2's spacing puts no note just beside the box, so the footprint is checked where it is read
        const ranges: number[][] = [];
        const calculator: any = VexFlowMusicSheetCalculator.prototype;
        const skyline: any = SkyBottomLineCalculator.prototype;
        const calculateRehearsalMark: (...args: any[]) => any = calculator.calculateRehearsalMark;
        const getSkyLineMinInRange: (start: number, end: number) => number = skyline.getSkyLineMinInRange;
        let inMark: boolean = false;
        calculator.calculateRehearsalMark = function (...args: any[]): any {
            inMark = true;
            try {
                return calculateRehearsalMark.apply(this, args);
            } finally {
                inMark = false;
            }
        };
        skyline.getSkyLineMinInRange = function (start: number, end: number): number {
            if (inMark) {
                ranges.push([start, end]);
            }
            return getSkyLineMinInRange.call(this, start, end);
        };
        const measures: string = `<measure number="1">${attributes}${note("C", 5, 16, "whole")}</measure>` +
            `<measure number="2">${rehearsal("K")}${["A", "G", "F", "E"].map(s => note(s, 6, 4, "quarter")).join("")}</measure>`;
        return render(scoreXml(measures), 700).then(osmd => {
            // one letter (estimated at 0.6 font size + font size, at least 18 px) and half a space on either side
            const fontSize: number = osmd.EngravingRules.RehearsalMarkFontSize;
            expect(ranges.length).to.equal(1);
            expect(ranges[0][1] - ranges[0][0]).to.be.closeTo(Math.max(18, fontSize * 0.6 + fontSize) / 10 + 2 * 0.5, 1e-6);
        }).finally(() => {
            calculator.calculateRehearsalMark = calculateRehearsalMark;
            skyline.getSkyLineMinInRange = getSkyLineMinInRange;
        });
    });
});
