import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalUnknownExpression } from "../../../src/MusicalScore/Graphical/GraphicalUnknownExpression";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Words that are only an opening bracket at the time of a note are engraved right before the note, at the height of its
 * noteheads (Nielsen, Clarinet Concerto Op.57 m561: the tambourine's cue "(" before its eighth, on a staff without lines,
 * went onto the note's stem and flag). As osmd-dart.
 */
describe("Opening bracket words", () => {
    const score: (words: string, note: string) => string = (words: string, note: string) => `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Tamb.</part-name></score-part></part-list><part id="P1">
<measure number="1"><attributes><divisions>48</divisions><time><beats>2</beats><beat-type>4</beat-type></time>
<clef><sign>G</sign><line>2</line></clef></attributes>
<direction placement="above"><direction-type><words>${words}</words></direction-type><offset>48</offset></direction>
<note print-object="no"><rest/><duration>48</duration><voice>1</voice><type>quarter</type></note>
${note}
<note><rest/><duration>24</duration><voice>1</voice><type>eighth</type></note></measure>
</part></score-partwise>`;
    const eighth: string = "<note><pitch><step>C</step><octave>5</octave></pitch><duration>24</duration><voice>1</voice>" +
        "<type>eighth</type><stem>up</stem></note>";
    const sharpEighth: string = "<note><pitch><step>C</step><alter>1</alter><octave>5</octave></pitch><duration>24</duration>" +
        "<voice>1</voice><type>eighth</type><accidental>sharp</accidental><stem>up</stem></note>";

    async function render(words: string, note: string): Promise<StaffLine> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1024px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(score(words, note));
        osmd.render();
        return osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
    }

    function labelBox(line: StaffLine): BoundingBox {
        return (line.AbstractExpressions.find(e => e instanceof GraphicalUnknownExpression) as GraphicalUnknownExpression)
            .Label.PositionAndShape;
    }

    for (const [name, note] of [["a note", eighth], ["a note with an accidental", sharpEighth]]) {
        it(`puts "(" at the time of ${name} right before it, at its notehead`, async () => {
            const line: StaffLine = await render("(", note);
            const label: BoundingBox = labelBox(line);
            const measure: any = line.Measures[0];
            const entry: BoundingBox = measure.staffEntries[1].PositionAndShape;
            const entryLeft: number = measure.PositionAndShape.RelativePosition.x + entry.RelativePosition.x + entry.BorderMarginLeft;
            const labelRight: number = label.RelativePosition.x + label.BorderMarginRight;
            expect(labelRight, "left of the note").to.be.lessThan(entryLeft);
            expect(labelRight, "next to it").to.be.greaterThan(entryLeft - 1);
            expect(label.RelativePosition.y, "at the height of the note").to.be.within(
                entry.RelativePosition.y + entry.BorderMarginTop, entry.RelativePosition.y + entry.BorderMarginBottom);
        });
    }

    it("keeps other words at the time of a note above it", async () => {
        const label: BoundingBox = labelBox(await render("dolce", eighth));
        expect(label.RelativePosition.y + label.BorderMarginBottom, "over the staff").to.be.at.most(0);
    });
});
