import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalInstantaneousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalInstantaneousDynamicExpression";
import { GraphicalLabel } from "../../../src/MusicalScore/Graphical/GraphicalLabel";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Lyric line height vs. what is above the lyric text (O cessate di piagarmi, Canto m2): a p below the first note
 * starts together with a crescendo wedge, so it sits at the staff entry's left border. The lyric "O" is left-aligned
 * and shifted one unit left of the staff entry, so the p is above the lyric's left half.
 */
describe("Lyric bottom line check under the shifted label", () => {
    const score: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Canto</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>2</divisions>
        <time><beats>6</beats><beat-type>8</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <direction placement="below"><direction-type><dynamics default-x="-36"><p/></dynamics></direction-type><staff>1</staff></direction>
      <direction placement="above"><direction-type><wedge type="crescendo" number="1"/></direction-type><staff>1</staff></direction>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type>
        <lyric number="1"><syllabic>single</syllabic><text>O</text></lyric></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type>
        <lyric number="1"><syllabic>begin</syllabic><text>ces</text></lyric></note>
      <direction placement="above"><direction-type><wedge type="stop" number="1"/></direction-type><staff>1</staff></direction>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type>
        <lyric number="1"><syllabic>middle</syllabic><text>sa</text></lyric></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type>
        <lyric number="1"><syllabic>end</syllabic><text>te</text></lyric></note>
    </measure>
  </part>
</score-partwise>`;

    let osmd: OpenSheetMusicDisplay;
    let staffLine: StaffLine;
    let measure: GraphicalMeasure;
    let staffEntry: GraphicalStaffEntry;
    let label: GraphicalLabel;

    beforeEach(async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        osmd = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(score);
        osmd.render();
        staffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
        measure = staffLine.Measures[0];
        staffEntry = measure.staffEntries[0];
        label = staffEntry.LyricsEntries[0].GraphicalLabel;
    });

    it("checks the bottom line where the lyric text is", () => {
        const rules: { StaffHeight: number } = osmd.EngravingRules;
        const staffEntryX: number = staffEntry.PositionAndShape.RelativePosition.x + measure.PositionAndShape.RelativePosition.x;
        const labelLeft: number = staffEntryX + label.PositionAndShape.RelativePosition.x + label.PositionAndShape.BorderMarginLeft;
        const unshiftedLeft: number = staffEntryX + label.PositionAndShape.BorderMarginLeft;
        expect(unshiftedLeft - labelLeft, "LeftBottom lyrics are moved one unit left of the staff entry").to.be.greaterThan(0.5);

        // something low under the label's left part only, left of where the label would start without its shift
        const obstacleBottom: number = 9;
        const sky: any = staffLine.SkyBottomLineCalculator;
        // (setBottomLineWithValue assigns to the forEach parameter and changes nothing)
        const bottomLine: number[] = sky.BottomLine;
        for (let i: number = 0; i < bottomLine.length; i++) {
            bottomLine[i] = rules.StaffHeight;
        }
        sky.updateBottomLineInRange(labelLeft + 0.1, unshiftedLeft - 0.4, obstacleBottom);

        (osmd.GraphicSheet.GetCalculator as any).calculateSingleStaffLineLyricsPosition(
            staffLine, staffLine.ParentStaff.ParentInstrument.LyricVersesNumbers);

        const labelTop: number = label.PositionAndShape.RelativePosition.y + label.PositionAndShape.BorderMarginTop;
        expect(labelTop, "the lyric must go below what is above its own glyphs").to.be.at.least(obstacleBottom);
    });

    it("keeps a p at the staff entry left border above the lyric", () => {
        const dynamic: GraphicalInstantaneousDynamicExpression = staffLine.AbstractExpressions
            .find(e => e instanceof GraphicalInstantaneousDynamicExpression) as GraphicalInstantaneousDynamicExpression;
        expect(dynamic, "the p").to.not.equal(undefined);
        const d: any = dynamic.PositionAndShape;
        const l: any = label.PositionAndShape;
        expect(d.AbsolutePosition.x + d.BorderRight, "the p is over the lyric").to.be.greaterThan(l.AbsolutePosition.x + l.BorderLeft);
        expect(d.AbsolutePosition.x + d.BorderLeft).to.be.lessThan(l.AbsolutePosition.x + l.BorderRight);
        expect(l.AbsolutePosition.y + l.BorderTop).to.be.at.least(d.AbsolutePosition.y + d.BorderBottom);
    });
});
