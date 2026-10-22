import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { VexFlowOctaveShift } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowOctaveShift";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { TestUtils } from "../../Util/TestUtils";

/**
 * An octave shift's bracket keeps EngravingRules.OctaveShiftClearance (half a space, user decision 10-22: a slur and an 8va
 * do not overlap) between the skyline and its text: the skyline has a slur's middle line, and the upstream rounding
 * (ceil(min - 0.05)) put the 8 on the slur (Prokofiev Op. 19). Brackets starting on one stave share its top text position:
 * both go at the higher one (Prokofiev Op. 19 III full score m98 in osmd-dart, where the later one overwrote it). Same rules as
 * osmd-dart test/octave_shift_skyline_test.dart.
 */
describe("Octave shift skyline", () => {
    function note(step: string, octave: number, duration: number = 1, type: string = "16th", slur: string = ""): string {
        return `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${duration}</duration>` +
            `<voice>1</voice><type>${type}</type>${slur ? `<notations>${slur}</notations>` : ""}</note>`;
    }
    function octave(type: string, num: number = 1): string {
        return `<direction placement="above"><direction-type><octave-shift number="${num}" size="8" type="${type}"/>` +
            "</direction-type></direction>";
    }
    function scoreXml(measures: string): string {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list><score-part id=\"P1\">" +
            `<part-name>Violin</part-name></score-part></part-list><part id="P1">${measures}</part></score-partwise>`;
    }
    const attributes: string = "<attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>2</beats>" +
        "<beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>";
    function render(source: string, width: number): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = `${width}px`;
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        return osmd.load(source).then(() => {
            osmd.render();
            return osmd;
        });
    }
    function slurTop(slur: GraphicalSlur, x0: number, x1: number): number {
        let top: number = undefined;
        for (let i: number = 0; i <= 400; i++) {
            const p: any = slur.calculateCurvePointAtIndex(i / 400);
            if (p.x < x0 || p.x > x1) {
                continue;
            }
            top = top === undefined ? p.y : Math.min(top, p.y);
        }
        return top;
    }

    it("goes over the slur under it by the clearance, a rehearsal mark over it", () => {
        // the Prokofiev Op. 19 III m140 figure, a step higher each measure: 8va from the first note, sixteenths G6 B6 B5 D6
        //   (written an octave lower), a slur over the first four, a rehearsal mark
        const steps: string[] = ["C", "D", "E", "F", "G", "A", "B"];
        const up: (p: [string, number], by: number) => [string, number] = (p, by) => {
            const i: number = steps.indexOf(p[0]) + by;
            return [steps[i % 7], p[1] + Math.floor(i / 7)];
        };
        let measures: string = "";
        for (let m: number = 1; m <= 12; m++) {
            const figure: [string, number][] = [["G", 5], ["B", 5], ["B", 4], ["D", 5]].map(p => up(p as [string, number], m - 1));
            measures += `<measure number="${m}">${m === 1 ? attributes : ""}<direction placement="above"><direction-type>` +
                `<rehearsal>${String.fromCharCode(64 + m)}</rehearsal></direction-type></direction>${octave("down")}`;
            for (let i: number = 0; i < 8; i++) {
                const [step, oct] = figure[i % 4];
                measures += note(step, oct, 1, "16th",
                                 i === 0 ? "<slur number=\"1\" type=\"start\"/>" : i === 3 ? "<slur number=\"1\" type=\"stop\"/>" : "");
            }
            measures += `${octave("stop")}</measure>`;
        }
        return render(scoreXml(measures), 700).then(osmd => {
            const clearance: number = 0.5;
            expect(osmd.EngravingRules.OctaveShiftClearance).to.equal(clearance);
            let brackets: number = 0;
            for (const page of osmd.GraphicSheet.MusicPages) {
                for (const system of page.MusicSystems) {
                    for (const line of system.StaffLines) {
                        for (const shift of line.OctaveShifts as VexFlowOctaveShift[]) {
                            brackets++;
                            const stave: any = shift.startNote.getStave();
                            const textBottom: number = -(1 + stave.options.top_text_position);
                            for (const slur of line.GraphicalSlurs) {
                                const top: number = slurTop(slur, shift.skylineStartX, shift.skylineStopX);
                                if (top !== undefined) {
                                    expect(textBottom).to.be.at.most(top - clearance + 1e-9);
                                }
                            }
                            const sections: any[] = stave.getModifiers().filter((m: any) => m.getCategory() === "stavesection");
                            if (sections.length > 0) {
                                expect(sections[0].minBottomY).to.be.at.most((textBottom - 1.5) * 10);
                            }
                        }
                    }
                }
            }
            expect(brackets).to.equal(12);
        });
    });

    it("shares the higher top text position among brackets starting on one stave", () => {
        // m1: an 8va over high notes stopping after the third, then another from the last (low) note going on into m2
        const source: string = scoreXml(`<measure number="1">${attributes}${octave("down", 1)}${note("A", 7, 4, "quarter")}` +
            `${note("G", 7, 2, "eighth")}${note("F", 7)}${octave("stop", 1)}${octave("down", 2)}${note("C", 6)}</measure>` +
            `<measure number="2">${note("C", 6, 8, "half")}${octave("stop", 2)}</measure>`);
        return render(source, 700).then(osmd => {
            const line: any = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
            const stave: any = (osmd.GraphicSheet.MeasureList[0][0] as VexFlowMeasure).getVFStave();
            const onStave: VexFlowOctaveShift[] = (line.OctaveShifts as VexFlowOctaveShift[]).filter(s => s.startNote.getStave() === stave);
            expect(onStave.length).to.equal(2);
            const position: number = stave.options.top_text_position;
            expect(onStave.map(s => s.topTextPosition)).to.deep.equal([position, position]);
            expect(position).to.be.at.least(4);
        });
    });
});
