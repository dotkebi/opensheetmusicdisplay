import { expect } from "chai";
import Vex from "vexflow";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../Util/TestUtils";
import VF = Vex.Flow;

/**
 * Ties arch by their length (VexFlowPatch stavetie.js): VexFlow's fixed control points (8 and 12 px) bulge every tie by
 * about 0.6 staff spaces, so a long tie was nearly a straight line on the staff (Schumann, Myrthen 3 m53) and a short
 * one hugged the noteheads (Myrthen 24 m15). The outer edge rises by 0.36 + 0.082 x length staff spaces, between 0.4
 * and 1.5 (ties measured in the Breitkopf Myrthen). Same formula as vexflow-dart StaveTie.curveControlPoints.
 */
describe("Tie arch by length", () => {
    const xml: string = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\">" +
        "<part-list><score-part id=\"P1\"><part-name>P</part-name></score-part></part-list><part id=\"P1\">" +
        "<measure number=\"1\"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>" +
        "<clef><sign>G</sign><line>2</line></clef></attributes>" +
        "<note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><tie type=\"start\"/><voice>1</voice>" +
        "<type>whole</type><notations><tied type=\"start\"/></notations></note></measure>" +
        "<measure number=\"2\"><note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration>" +
        "<tie type=\"stop\"/><voice>1</voice><type>whole</type><notations><tied type=\"stop\"/></notations></note></measure>" +
        "</part></score-partwise>";

    it("control points follow the length, clamped to 0.4..1.5 spaces", () => {
        const cps: (length: number) => number[] = (VF.StaveTie as any).curveControlPoints;
        expect(cps(0)).to.deep.equal([4, 8]);
        expect(cps(100)[1]).to.be.closeTo(2 * (3.6 + 8.2), 1e-9);
        expect(cps(1000)).to.deep.equal([26, 30]);
        const short: number[] = cps(15);
        expect(short[1] - short[0], "VexFlow's thickness kept").to.equal(4);
    });

    it("draws a long tie well above its ends", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(xml);
        osmd.render();
        const path: Element = div.querySelector(".vf-stavetie path");
        expect(path, "the tie's path").to.not.equal(null);
        // M x0 y0 Q cpx cp1y x1 y1 Q cpx cp2y x0 y0 Z
        const numbers: number[] = (path.getAttribute("d").match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
        const [x0, y0, , cp1y, x1, , , cp2y] = numbers;
        const length: number = Math.abs(x1 - x0);
        expect(length, "a long tie").to.be.greaterThan(60);
        const outer: number = y0 - cp2y;
        expect(outer, "more than VexFlow's 12 px").to.be.greaterThan(12);
        expect(outer / 2).to.be.closeTo(Math.min(15, 3.6 + 0.082 * length), 0.01);
        expect(y0 - cp1y).to.be.closeTo(outer - 4, 0.01);
        osmd.clear();
        div.remove();
    });
});
