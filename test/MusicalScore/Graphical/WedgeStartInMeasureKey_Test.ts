import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalContinuousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalContinuousDynamicExpression";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A wedge starting at a note after a key signature change inside the measure starts at the note (its accidentals), not under the
 * key signature: the key signature is attached to the note as a VexFlow modifier and widened the staff entry's left border, which
 * a wedge's start takes (GraphicalStaffEntry.ExpressionBorderLeft; Schubert, Ganymed D 544, Piano m46 q1: the diminuendo began
 * 10 spaces left of the note, under the new key signature, on the web and in the app).
 * Same as osmd-dart test/wedge_start_in_measure_key_test.dart.
 */
describe("Wedge starting at a note after an in-measure key change", () => {
    function note(step: string, octave: number): string {
        return `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>2</duration><voice>1</voice>` +
            "<type>quarter</type></note>";
    }
    function wedge(type: string): string {
        return `<direction placement="below"><direction-type><wedge type="${type}"/></direction-type></direction>`;
    }
    const xml: string = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list><score-part id=\"P1\">" +
        "<part-name>Piano</part-name></score-part></part-list><part id=\"P1\"><measure number=\"1\"><attributes><divisions>2" +
        "</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign>" +
        "<line>2</line></clef></attributes>" + note("C", 5) + "<attributes><key><fifths>4</fifths></key></attributes>" +
        wedge("diminuendo") + note("E", 5) + note("E", 5) + wedge("stop") + note("E", 5) + "</measure>" +
        "<measure number=\"2\">" + note("C", 5) + wedge("diminuendo") + note("E", 5) + note("E", 5) + wedge("stop") + note("E", 5) +
        "</measure></part></score-partwise>";

    it("starts the wedge at the note, not under the key signature", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(xml);
        osmd.render();
        const staffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
        const wedges: GraphicalContinuousDynamicExpression[] =
            staffLine.AbstractExpressions.filter(e => e instanceof GraphicalContinuousDynamicExpression) as GraphicalContinuousDynamicExpression[];
        expect(wedges.length).to.equal(2);
        const left: (w: GraphicalContinuousDynamicExpression) => number =
            (w: GraphicalContinuousDynamicExpression): number => Math.min(...w.Lines.map(l => Math.min(l.Start.x, l.End.x)));
        const secondEntry: (measureIndex: number) => GraphicalStaffEntry =
            (measureIndex: number): GraphicalStaffEntry => staffLine.Measures[measureIndex].staffEntries[1];
        const entryX: (measureIndex: number) => number = (measureIndex: number): number =>
            staffLine.Measures[measureIndex].PositionAndShape.RelativePosition.x + secondEntry(measureIndex).PositionAndShape.RelativePosition.x;
        // the key signature widens the entry's border (the modifier), not its expression border
        const keyed: GraphicalStaffEntry = secondEntry(0);
        expect(keyed.PositionAndShape.BorderLeft).to.be.lessThan(-4);
        expect(keyed.ExpressionBorderLeft).to.be.greaterThan(-1.5);
        expect(keyed.ExpressionBorderLeft).to.be.at.most(0);
        expect(left(wedges[0])).to.be.closeTo(entryX(0) + keyed.ExpressionBorderLeft, 0.05);
        // without a key change the start is the entry's border as before
        const plain: GraphicalStaffEntry = secondEntry(1);
        expect(plain.ExpressionBorderLeft).to.equal(plain.PositionAndShape.BorderLeft);
        expect(left(wedges[1])).to.be.closeTo(entryX(1) + plain.PositionAndShape.BorderLeft, 0.05);
    });
});
