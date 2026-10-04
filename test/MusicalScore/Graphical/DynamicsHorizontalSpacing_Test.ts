import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { GraphicalInstantaneousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalInstantaneousDynamicExpression";
import { GraphicalContinuousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalContinuousDynamicExpression";
import { GraphicalUnknownExpression } from "../../../src/MusicalScore/Graphical/GraphicalUnknownExpression";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Dynamics at different timestamps in a measure at its minimum width (Enescu, Cantabile et Presto m38: "sf > sf > sf >"
 * with "cédez" under the third sf): their wedges keep WedgeMinLength, the dynamics DynamicExpressionSpacer,
 * and words stay clear of them, also after the dynamics are aligned onto a common baseline. Same as osmd-dart test/dynamics_horizontal_spacing_test.dart.
 */
describe("Dynamics: horizontal spacing", () => {
    function note(step: string, octave: number, duration: number, type: string, dot: boolean = false): string {
        return `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${duration}</duration>` +
            `<voice>1</voice><type>${type}</type>${dot ? "<dot/>" : ""}</note>`;
    }
    function below(directionType: string): string {
        return `<direction placement="below"><direction-type>${directionType}</direction-type></direction>`;
    }
    /** one cello staff in 3/4; measures are the contents of measures 1, 2, ... */
    function score(...measures: string[]): string {
        const body: string = measures.map((measure, i) => `<measure number="${i + 1}">` +
            (i === 0 ? "<attributes><divisions>4</divisions><time><beats>3</beats><beat-type>4</beat-type></time>" +
                "<clef><sign>C</sign><line>4</line></clef></attributes>" : "") +
            `${measure}</measure>`).join("");
        return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Cello</part-name></score-part></part-list>
  <part id="P1">${body}</part>
</score-partwise>`;
    }

    /** six eighths, sf on the 1st, 3rd and 5th, a word below on the 4th */
    const eighthsWithDynamics: string = score([
        below("<dynamics><sf/></dynamics>"), note("C", 4, 2, "eighth"), note("D", 4, 2, "eighth"),
        below("<dynamics><sf/></dynamics>"), note("E", 4, 2, "eighth"),
        below("<words>dolce</words>"), note("F", 4, 2, "eighth"),
        below("<dynamics><sf/></dynamics>"), note("G", 4, 2, "eighth"), note("A", 4, 2, "eighth"),
    ].join("\n"));

    /** sf > sf > sf > on dotted-eighth/sixteenth pairs, "cédez" below on the third beat together with the third sf */
    const sforzandoChainNotes: string = [
        below("<dynamics><sf/></dynamics>"), below("<wedge type=\"diminuendo\" number=\"1\"/>"),
        note("C", 4, 3, "eighth", true), note("B", 3, 1, "16th"),
        below("<dynamics><sf/></dynamics>"), below("<wedge type=\"stop\" number=\"1\"/>"), below("<wedge type=\"diminuendo\" number=\"2\"/>"),
        note("F", 4, 3, "eighth", true), note("E", 4, 1, "16th"),
        below("<words>cédez</words>"), below("<dynamics><sf/></dynamics>"),
        below("<wedge type=\"stop\" number=\"2\"/>"), below("<wedge type=\"diminuendo\" number=\"3\"/>"),
        note("B", 4, 3, "eighth", true), note("A", 4, 1, "16th"),
        below("<wedge type=\"stop\" number=\"3\"/>"),
    ].join("\n");
    const sforzandoChain: string = score(sforzandoChainNotes);

    /** the same after a measure whose crescendo runs under low notes into the first sf (m37-38 on one system, as in the app
     *  at zoom 0.6): the dynamics' baseline is pulled down to the crescendo's after the word was placed */
    const sforzandoChainAfterLowCrescendo: string = score([
        below("<wedge type=\"crescendo\" number=\"1\"/>"),
        ...([["G", 3], ["F", 3], ["E", 3], ["D", 3], ["C", 3], ["B", 2], ["A", 2], ["G", 2], ["F", 2], ["E", 2]] as [string, number][])
            .map(([step, octave]) => note(step, octave, 1, "16th")),
        note("D", 2, 2, "eighth"),
        below("<wedge type=\"stop\" number=\"1\"/>"),
    ].join("\n"), sforzandoChainNotes);

    /** sf > sf > sf on three eighths: tighter than m38 in both renderers */
    const sforzandoEighths: string = score([
        below("<dynamics><sf/></dynamics>"), below("<wedge type=\"diminuendo\" number=\"1\"/>"), note("C", 4, 2, "eighth"),
        below("<dynamics><sf/></dynamics>"), below("<wedge type=\"stop\" number=\"1\"/>"), below("<wedge type=\"diminuendo\" number=\"2\"/>"),
        note("D", 4, 2, "eighth"),
        below("<dynamics><sf/></dynamics>"), below("<wedge type=\"stop\" number=\"2\"/>"), note("E", 4, 2, "eighth"),
        note("F", 4, 2, "eighth"), note("G", 4, 2, "eighth"), note("A", 4, 2, "eighth"),
    ].join("\n"));

    interface Box {
        name: string;
        left: number;
        right: number;
        top: number;
        bottom: number;
    }

    function absolute(name: string, box: BoundingBox): Box {
        return {
            bottom: box.AbsolutePosition.y + box.BorderMarginBottom,
            left: box.AbsolutePosition.x + box.BorderMarginLeft,
            name,
            right: box.AbsolutePosition.x + box.BorderMarginRight,
            top: box.AbsolutePosition.y + box.BorderMarginTop,
        };
    }
    function overlaps(a: Box, b: Box): boolean {
        return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    }
    function describeBox(b: Box): string {
        return `${b.name}[${b.left.toFixed(2)}, ${b.right.toFixed(2)}] x [${b.top.toFixed(2)}, ${b.bottom.toFixed(2)}]`;
    }

    /** text boxes (dynamics, words) and wedge boxes, left to right */
    function expressionBoxes(staffLine: StaffLine): { labels: Box[], wedges: Box[] } {
        const labels: Box[] = [];
        const wedges: Box[] = [];
        for (const expression of new Set(staffLine.AbstractExpressions)) {
            if (expression instanceof GraphicalInstantaneousDynamicExpression) {
                labels.push(absolute(expression.Label.Label.text, expression.PositionAndShape));
            } else if (expression instanceof GraphicalUnknownExpression) {
                labels.push(absolute(expression.Label.Label.text, expression.Label.PositionAndShape));
            } else if (expression instanceof GraphicalContinuousDynamicExpression && !expression.IsVerbal) {
                wedges.push(absolute("wedge", expression.PositionAndShape));
            }
        }
        labels.sort((a, b) => a.left - b.left);
        wedges.sort((a, b) => a.left - b.left);
        return { labels, wedges };
    }

    async function render(xml: string, maximumDynamicsElongationFactor?: number): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        const rules: any = osmd.EngravingRules;
        // 02front / 03app density rules
        rules.VoiceSpacingMultiplierVexflow = 0.85;
        rules.VoiceSpacingAddendVexflow = 3.0;
        // the last (here: only) system is not justified beyond this factor: keep the measure at its minimum width,
        // as in a full system (Cantabile et Presto m38 in the app)
        rules.LastSystemMaxScalingFactor = 1.0;
        if (maximumDynamicsElongationFactor !== undefined) {
            rules.MaximumDynamicsElongationFactor = maximumDynamicsElongationFactor;
        }
        await osmd.load(xml);
        osmd.render();
        return osmd;
    }

    function firstStaffLine(osmd: OpenSheetMusicDisplay): StaffLine {
        return osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
    }

    it("keeps the spacer between dynamics at different beats, and words clear of them", async () => {
        const osmd: OpenSheetMusicDisplay = await render(eighthsWithDynamics);
        const labels: Box[] = expressionBoxes(firstStaffLine(osmd)).labels;
        expect(labels.map(b => b.name)).to.deep.equal(["sf", "sf", "dolce", "sf"]);
        const dynamics: Box[] = labels.filter(b => b.name === "sf");
        for (let i: number = 1; i < dynamics.length; i++) {
            expect(dynamics[i].left - dynamics[i - 1].right, `${describeBox(dynamics[i - 1])} and ${describeBox(dynamics[i])}`)
                .to.be.at.least(osmd.EngravingRules.DynamicExpressionSpacer - 0.01);
        }
        const word: Box = labels.find(b => b.name === "dolce");
        for (const dynamic of dynamics) {
            expect(overlaps(word, dynamic), `${describeBox(word)} overlaps ${describeBox(dynamic)}`).to.equal(false);
        }
    });

    for (const [name, xml] of [["m38", sforzandoChain], ["eighths", sforzandoEighths]]) {
        it(`leaves room for a wedge between two dynamics (${name})`, async () => {
            const osmd: OpenSheetMusicDisplay = await render(xml);
            const rules: any = osmd.EngravingRules;
            const boxes: { labels: Box[], wedges: Box[] } = expressionBoxes(firstStaffLine(osmd));
            const dynamics: Box[] = boxes.labels.filter(b => b.name === "sf");
            expect(dynamics.length).to.equal(3);
            for (let i: number = 1; i < dynamics.length; i++) {
                expect(dynamics[i].left - dynamics[i - 1].right,
                       `no room for the wedge between ${describeBox(dynamics[i - 1])} and ${describeBox(dynamics[i])}`)
                    .to.be.at.least(rules.WedgeMinLength + 2 * rules.DynamicExpressionSpacer - 0.01);
                // How the wedge uses that room is up to calculateGraphicalContinuousDynamic(): its end follows the notes
                // ((next note - end note) / WedgeEndDistanceBetweenTimestampsFactor), so a wedge to the next eighth stays short.
                // (osmd-dart extends it towards the next dynamic and checks its length too.)
                const wedges: Box[] = boxes.wedges.filter(w => w.left >= dynamics[i - 1].right - 0.01 && w.right <= dynamics[i].left + 0.01);
                expect(wedges.length).to.equal(1);
            }
        });
    }

    // m38 at the minimum width (no reserved room), as when a measure is too short for MaximumDynamicsElongationFactor
    for (const [name, xml, maximumFactor] of [["m38", sforzandoChain, 1.0], ["m37-38", sforzandoChainAfterLowCrescendo, undefined]] as
        [string, string, number][]) {
        it(`keeps a word under a later dynamic below the dynamics and wedges (${name})`, async () => {
            const osmd: OpenSheetMusicDisplay = await render(xml, maximumFactor);
            const boxes: { labels: Box[], wedges: Box[] } = expressionBoxes(firstStaffLine(osmd));
            const word: Box = boxes.labels.find(b => b.name === "cédez");
            for (const other of [...boxes.labels.filter(b => b !== word), ...boxes.wedges]) {
                expect(overlaps(word, other), `${describeBox(word)} overlaps ${describeBox(other)}`).to.equal(false);
            }
        });
    }
});
