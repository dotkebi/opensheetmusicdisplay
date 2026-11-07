import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

/**
 * Vivaldi, Concerto Op. 44 No. 11 (Eulenburg): the editor's dotted slurs and ties (line-type="dotted") were drawn as solid
 * curves. A dashed or dotted slur or tie is one stroked curve with a dash pattern; a solid one stays a filled curve.
 * Same fixture as osmd-dart test/slur_tie_line_type_test.dart.
 */
describe("Dashed and dotted slurs and ties", () => {
    it("reads the line types and strokes those curves with dashes", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore("test_slur_tie_line_type.musicxml"));
        osmd.render();
        const notes: any[] = osmd.Sheet.SourceMeasures.map(m => m.VerticalSourceStaffEntryContainers
            .map(c => c.StaffEntries[0].VoiceEntries[0].Notes[0]));
        expect(notes[0][0].NoteSlurs[0].LineType, "m1 dotted slur").to.equal("dotted");
        expect(notes[0][2].NoteTie.LineType, "m1 dotted tie").to.equal("dotted");
        expect(notes[1][1].NoteSlurs[0].LineType, "m2 dashed slur").to.equal("dashed");
        expect(notes[2][0].NoteSlurs[0].LineType, "m3 solid slur").to.equal(undefined);
        const svg: SVGElement = div.querySelector("svg");
        const dashed: Element[] = Array.from(svg.querySelectorAll("g.vf-curve path, g.vf-stavetie path"))
            .filter(p => p.getAttribute("stroke-dasharray") && p.getAttribute("stroke-dasharray") !== "none");
        // the dotted slur, the dotted tie's two halves at the line break or one tie, the dashed slur
        expect(dashed.length, "stroked dashed paths").to.be.at.least(3);
        expect(dashed.every(p => p.getAttribute("fill") === "none"), "stroked, not filled").to.equal(true);
        const solidSlurs: Element[] = Array.from(svg.querySelectorAll("g.vf-curve path"))
            .filter(p => !p.getAttribute("stroke-dasharray") || p.getAttribute("stroke-dasharray") === "none");
        expect(solidSlurs.length, "the solid slur filled").to.equal(1);
    });
});
