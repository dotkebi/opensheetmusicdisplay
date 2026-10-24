import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A rehearsal mark is drawn above the part it is written in, as printed (user decision 10-24: Weber Op. 74 III, where the
 * boxed 28-52 stand over the piano; Haydn Hob. VIIg:C1 I piano A-C; Saint-Saëns Op. 61 piano D/F). It used to be drawn on the
 * system's first visible staff whichever part's <direction> held it. A mark the XML repeats on a part's second staff is one
 * mark (Sibelius Op. 47 III piano); marks of different parts at the same measure are each drawn (Prokofiev Op. 19 full score);
 * a part hidden in the system gives its mark to the system's first visible staff, as before. Same rule as osmd-dart
 * test/rehearsal_mark_part_test.dart.
 */
describe("Rehearsal mark part", () => {
    const divisions: number = 4;
    function rehearsal(label: string, staff: number): string {
        return `<direction placement="above"><direction-type><rehearsal>${label}</rehearsal></direction-type>` +
            `<staff>${staff}</staff></direction>`;
    }
    /** A whole note (not a rest: rest measures would be reduced to a multi measure rest). */
    function whole(step: string, octave: number, staff: number, voice: number): string {
        return `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${4 * divisions}</duration>` +
            `<voice>${voice}</voice><type>whole</type><staff>${staff}</staff></note>`;
    }
    function attributes(staves: number, clefs: string): string {
        return `<attributes><divisions>${divisions}</divisions><key><fifths>0</fifths></key><time><beats>4</beats>` +
            `<beat-type>4</beat-type></time><staves>${staves}</staves>${clefs}</attributes>`;
    }
    const trebleClef: string = "<clef number=\"1\"><sign>G</sign><line>2</line></clef>";
    const bassClef: string = "<clef number=\"2\"><sign>F</sign><line>4</line></clef>";
    /** Flute (one staff) over Piano (two staves), 5 measures: m1 piano "A"; m2 flute "B"; m3 flute "C" and piano "C";
     *  m4 piano "D" on both staves; m5 nothing. */
    function scoreXml(): string {
        const fluteMarks: string[] = ["", rehearsal("B", 1), rehearsal("C", 1), "", ""];
        const pianoMarks: string[] = [rehearsal("A", 1), "", rehearsal("C", 1), rehearsal("D", 1) + rehearsal("D", 2), ""];
        let flute: string = "";
        let piano: string = "";
        for (let m: number = 1; m <= 5; m++) {
            flute += `<measure number="${m}">${m === 1 ? attributes(1, trebleClef) : ""}${fluteMarks[m - 1]}${whole("C", 5, 1, 1)}</measure>`;
            piano += `<measure number="${m}">${m === 1 ? attributes(2, trebleClef + bassClef) : ""}${pianoMarks[m - 1]}` +
                `${whole("C", 5, 1, 1)}<backup><duration>${4 * divisions}</duration></backup>${whole("C", 3, 2, 5)}</measure>`;
        }
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list>" +
            "<score-part id=\"P1\"><part-name>Flute</part-name></score-part>" +
            "<score-part id=\"P2\"><part-name>Piano</part-name></score-part></part-list>" +
            `<part id="P1">${flute}</part><part id="P2">${piano}</part></score-partwise>`;
    }
    function load(): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "900px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        return osmd.load(scoreXml()).then(() => osmd);
    }
    /** The rehearsal labels on each staff of measure index measureIndex (flute, piano right hand, piano left hand). */
    function labels(osmd: OpenSheetMusicDisplay, measureIndex: number): string[][] {
        return osmd.GraphicSheet.MeasureList[measureIndex].map((gMeasure: GraphicalMeasure) => {
            const stave: any = (gMeasure as VexFlowMeasure)?.getVFStave?.();
            if (!stave) {
                return [];
            }
            return stave.getModifiers().filter((m: any) => m.getCategory() === "stavesection").map((m: any) => m.section as string);
        });
    }

    it("reads one mark per part, with the staff it is written on", () => {
        return load().then(osmd => {
            const measures: any[] = osmd.Sheet.SourceMeasures;
            expect(measures[0].rehearsalExpressions.map((e: any) => [e.label, e.staffIndex])).to.deep.equal([["A", 1]]);
            expect(measures[1].rehearsalExpressions.map((e: any) => [e.label, e.staffIndex])).to.deep.equal([["B", 0]]);
            expect(measures[2].rehearsalExpressions.map((e: any) => [e.label, e.staffIndex])).to.deep.equal([["C", 0], ["C", 1]]);
            // the piano's second-staff copy of "D" is not a second mark
            expect(measures[3].rehearsalExpressions.map((e: any) => [e.label, e.staffIndex])).to.deep.equal([["D", 1]]);
            expect(measures[4].rehearsalExpressions).to.deep.equal([]);
            // the first mark still answers rehearsalExpression (measure number logic, OSB)
            expect(measures[0].rehearsalExpression.label).to.equal("A");
            expect(measures[4].rehearsalExpression).to.equal(undefined);
        });
    });

    it("draws each mark above its own part, once", () => {
        return load().then(osmd => {
            osmd.render();
            expect(labels(osmd, 0)).to.deep.equal([[], ["A"], []]); // the piano's mark stays over the piano
            expect(labels(osmd, 1)).to.deep.equal([["B"], [], []]); // the first part's mark as before
            expect(labels(osmd, 2)).to.deep.equal([["C"], ["C"], []]); // both parts' marks, each over its part
            expect(labels(osmd, 3)).to.deep.equal([[], ["D"], []]); // one box for the piano, over its first staff
            expect(labels(osmd, 4)).to.deep.equal([[], [], []]);
        });
    });

    it("reserves the box below the first staff so the staff above keeps clear of it", () => {
        return load().then(osmd => {
            osmd.render();
            // nothing rises above either staff (whole notes inside the staff), so the piano's boxes stand in the staff
            //   distance: reserved on the right hand's skyline (box bottom 1.5 spaces up, box 1.6 + 0.5 spaces high).
            //   (The flute's boxes are lifted over its measure numbers, so its skyline says nothing about this.)
            const system: any = osmd.GraphicSheet.MusicPages[0].MusicSystems[0];
            expect(Math.min(...system.StaffLines[1].SkyLine)).to.be.below(-3);
        });
    });

    it("gives a hidden part's mark to the system's first visible staff", () => {
        return load().then(osmd => {
            osmd.Sheet.Instruments[1].Visible = false;
            osmd.render();
            expect(labels(osmd, 0)[0]).to.deep.equal(["A"]);
            expect(labels(osmd, 2)[0]).to.deep.equal(["C"]); // flute's and the hidden piano's "C" draw once
            expect(labels(osmd, 3)[0]).to.deep.equal(["D"]);
        });
    });
});
