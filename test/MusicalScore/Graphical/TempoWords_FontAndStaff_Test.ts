import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { GraphicalInstantaneousTempoExpression } from "../../../src/MusicalScore/Graphical/GraphicalInstantaneousTempoExpression";
import { FontStyles } from "../../../src/Common/Enums/FontStyles";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Tempo words such as "rit." (O cessate di piagarmi, Canto m17 and Piano m23):
 * - the words keep the font of their XML font-style/font-weight (bold only when the XML gives nothing),
 * - words written for a lower staff of an instrument (<staff>2</staff>) with a placement are drawn at that staff.
 */
describe("Tempo words: font and staff", () => {
    const attributes: string = `<attributes><divisions>4</divisions><time><beats>6</beats><beat-type>8</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef></attributes>`;
    // a quarter B4 tied to a 16th B4, a 16th A4 and a dotted quarter G4 (Canto m17)
    const m17Notes: string = `
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      __WORDS__
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><type>16th</type></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><type>16th</type></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>6</duration><type>quarter</type><dot/></note>`;
    const filler: string = "<note><pitch><step>G</step><octave>4</octave></pitch><duration>12</duration><type>half</type><dot/></note>";

    function singleStaffScore(measure2: string, leadingDirections: string = "", extraMeasures: string = ""): string {
        return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Canto</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">${attributes}${filler}</measure>
    <measure number="2">${leadingDirections}${measure2}</measure>
    ${extraMeasures}
  </part>
</score-partwise>`;
    }

    function pianoScore(wordsDirection: string): string {
        return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions><time><beats>3</beats><beat-type>4</beat-type></time><staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>6</duration><voice>1</voice><type>half</type><dot/><staff>1</staff></note>
      <backup><duration>6</duration></backup>
      ${wordsDirection}
      <note><pitch><step>B</step><octave>2</octave></pitch><duration>6</duration><voice>5</voice><type>half</type><dot/><staff>2</staff></note>
    </measure>
  </part>
</score-partwise>`;
    }

    async function render(xml: string, configure?: (osmd: OpenSheetMusicDisplay) => void): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        configure?.(osmd);
        await osmd.load(xml);
        osmd.render();
        return osmd;
    }

    function staffLines(osmd: OpenSheetMusicDisplay, system: number = 0): StaffLine[] {
        return osmd.GraphicSheet.MusicPages[0].MusicSystems[system].StaffLines;
    }

    function tempoLabels(staffLine: StaffLine): GraphicalInstantaneousTempoExpression[] {
        return Array.from(new Set(staffLine.AbstractExpressions.filter(
            (expression) => expression instanceof GraphicalInstantaneousTempoExpression) as GraphicalInstantaneousTempoExpression[]));
    }

    const italicRit: string = "<direction placement=\"above\"><direction-type><words font-style=\"italic\">rit.</words></direction-type>" +
        "<offset>-1</offset></direction>";

    it("uses the italic font the XML gives for tempo words, and bold when it gives none", async () => {
        let osmd: OpenSheetMusicDisplay = await render(singleStaffScore(m17Notes.replace("__WORDS__", italicRit)));
        expect(tempoLabels(staffLines(osmd)[0])[0].Label.Label.fontStyle).to.equal(FontStyles.Italic);
        const plainRit: string = "<direction placement=\"above\"><direction-type><words>rit.</words></direction-type></direction>";
        osmd = await render(singleStaffScore(m17Notes.replace("__WORDS__", plainRit)));
        expect(tempoLabels(staffLines(osmd)[0])[0].Label.Label.fontStyle).to.equal(FontStyles.Bold);
        const boldAllegro: string = "<direction placement=\"above\"><direction-type><words font-weight=\"bold\">Allegro</words></direction-type></direction>";
        osmd = await render(singleStaffScore(boldAllegro + filler));
        expect(tempoLabels(staffLines(osmd)[0])[0].Label.Label.fontStyle).to.equal(FontStyles.Bold);
    });

    it("draws tempo words written for the second staff of a piano part above that staff", async () => {
        const ritAssai: string = "<direction placement=\"above\"><direction-type><words font-style=\"italic\">rit. assai</words></direction-type>" +
            "<staff>2</staff></direction>";
        const osmd: OpenSheetMusicDisplay = await render(pianoScore(ritAssai));
        const [upper, lower] = staffLines(osmd);
        expect(tempoLabels(upper).length, "nothing above the right hand").to.equal(0);
        const labels: GraphicalInstantaneousTempoExpression[] = tempoLabels(lower);
        expect(labels.map((l) => l.Label.Label.text)).to.deep.equal(["rit. assai"]);
        const box: { RelativePosition: { y: number }, BorderBottom: number } = labels[0].Label.PositionAndShape;
        expect(box.RelativePosition.y + box.BorderBottom, "above the left hand staff").to.be.at.most(0.001);
        const gap: number = lower.PositionAndShape.RelativePosition.y - upper.PositionAndShape.RelativePosition.y - upper.StaffHeight;
        expect(box.RelativePosition.y, "between the staves").to.be.greaterThan(-gap);
        expect(labels[0].Label.Label.fontStyle).to.equal(FontStyles.Italic);
    });

    it("keeps tempo words without a staff, for staff 1, or without a placement above the first staff in bold", async () => {
        for (const [placement, staff] of [[" placement=\"below\"", ""], [" placement=\"below\"", "<staff>1</staff>"], ["", "<staff>2</staff>"]]) {
            const allegro: string = `<direction${placement}><direction-type><words>Allegro</words></direction-type>${staff}</direction>`;
            const osmd: OpenSheetMusicDisplay = await render(pianoScore(allegro));
            const [upper, lower] = staffLines(osmd);
            expect(tempoLabels(lower).length).to.equal(0);
            const labels: GraphicalInstantaneousTempoExpression[] = tempoLabels(upper);
            expect(labels.map((l) => l.Label.Label.text)).to.deep.equal(["Allegro"]);
            expect(labels[0].Label.PositionAndShape.RelativePosition.y, "above the first staff").to.be.lessThan(0);
            expect(labels[0].Label.Label.fontStyle).to.equal(FontStyles.Bold);
        }
    });
});
