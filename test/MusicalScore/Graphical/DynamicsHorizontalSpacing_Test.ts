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
 * and words that run into them sideways are stacked below them, not on their row. Same as osmd-dart test/dynamics_horizontal_spacing_test.dart.
 */
describe("Dynamics: horizontal spacing", () => {
    function note(step: string, octave: number, duration: number, type: string, dot: boolean = false): string {
        return `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${duration}</duration>` +
            `<voice>1</voice><type>${type}</type>${dot ? "<dot/>" : ""}</note>`;
    }
    function below(directionType: string): string {
        return `<direction placement="below"><direction-type>${directionType}</direction-type></direction>`;
    }
    function score(measure: string): string {
        return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Cello</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions><time><beats>3</beats><beat-type>4</beat-type></time>
        <clef><sign>C</sign><line>4</line></clef></attributes>
      ${measure}
    </measure>
  </part>
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
    const sforzandoChain: string = score([
        below("<dynamics><sf/></dynamics>"), below("<wedge type=\"diminuendo\" number=\"1\"/>"),
        note("C", 4, 3, "eighth", true), note("B", 3, 1, "16th"),
        below("<dynamics><sf/></dynamics>"), below("<wedge type=\"stop\" number=\"1\"/>"), below("<wedge type=\"diminuendo\" number=\"2\"/>"),
        note("F", 4, 3, "eighth", true), note("E", 4, 1, "16th"),
        below("<words>cédez</words>"), below("<dynamics><sf/></dynamics>"),
        below("<wedge type=\"stop\" number=\"2\"/>"), below("<wedge type=\"diminuendo\" number=\"3\"/>"),
        note("B", 4, 3, "eighth", true), note("A", 4, 1, "16th"),
        below("<wedge type=\"stop\" number=\"3\"/>"),
    ].join("\n"));

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
    /** a word below that runs into a dynamic or wedge sideways must be stacked under it, not on its row */
    function onSameRow(word: Box, other: Box): boolean {
        return word.left < other.right && other.left < word.right && word.top < (other.top + other.bottom) / 2;
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

    it("keeps the spacer between dynamics at different beats, and stacks words below them", async () => {
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
            expect(onSameRow(word, dynamic), `${describeBox(word)} runs into ${describeBox(dynamic)}`).to.equal(false);
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

    it("stacks a word under a later dynamic below the dynamics and wedges", async () => {
        // at the minimum width (no reserved room), as when a measure is too short for MaximumDynamicsElongationFactor
        const osmd: OpenSheetMusicDisplay = await render(sforzandoChain, 1.0);
        const boxes: { labels: Box[], wedges: Box[] } = expressionBoxes(firstStaffLine(osmd));
        const word: Box = boxes.labels.find(b => b.name === "cédez");
        for (const other of [...boxes.labels.filter(b => b !== word), ...boxes.wedges]) {
            expect(onSameRow(word, other), `${describeBox(word)} runs into ${describeBox(other)}`).to.equal(false);
        }
    });
});
