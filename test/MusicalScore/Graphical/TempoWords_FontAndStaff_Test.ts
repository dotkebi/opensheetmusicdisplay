import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { GraphicalInstantaneousTempoExpression } from "../../../src/MusicalScore/Graphical/GraphicalInstantaneousTempoExpression";
import { FontStyles } from "../../../src/Common/Enums/FontStyles";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Tempo words such as "rit." (O cessate di piagarmi, Canto m17 and Piano m23):
 * - the words keep the font of their XML font-style/font-weight (bold only when the XML gives nothing),
 * - words written for a lower staff of an instrument (<staff>2</staff>) with a placement are drawn at that staff,
 * - so are words written above an instrument below the top one (Schumann, Myrthen Op. 25: the piano's "ritard." under the
 *   voice), while a piano score alone, words without a placement and main tempo marks stay above the system.
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

    it("keeps tempo words without a staff, for staff 1, without a placement, or main tempo marks above the first staff in bold", async () => {
        for (const [placement, staff] of [[" placement=\"below\"", ""], [" placement=\"below\"", "<staff>1</staff>"], ["", "<staff>2</staff>"],
            [" placement=\"above\"", "<staff>2</staff>"]]) {
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

    it("draws a tempo change written below the first staff (placement=\"below\") below that staff", async () => {
        // Enescu, Cantabile et Presto m44: "rit." placement="below", no <staff>
        const ritBelow: string = "<direction placement=\"below\"><direction-type><words font-style=\"italic\">rit.</words></direction-type>" +
            "<offset>-1</offset></direction>";
        let osmd: OpenSheetMusicDisplay = await render(singleStaffScore(m17Notes.replace("__WORDS__", ritBelow)));
        let line: StaffLine = staffLines(osmd)[0];
        let labels: GraphicalInstantaneousTempoExpression[] = tempoLabels(line);
        expect(labels.map((l) => l.Label.Label.text)).to.deep.equal(["rit."]);
        let box: { RelativePosition: { y: number }, BorderTop: number, BorderBottom: number } = labels[0].Label.PositionAndShape;
        expect(box.RelativePosition.y + box.BorderTop, "below the staff").to.be.at.least(line.StaffHeight - 0.001);
        // default-y < 0 is a placement too (MuseScore exports)
        const ritDefaultY: string = "<direction><direction-type><words default-y=\"-40\" font-style=\"italic\">rit.</words></direction-type>" +
            "<offset>-1</offset></direction>";
        osmd = await render(singleStaffScore(m17Notes.replace("__WORDS__", ritDefaultY)));
        line = staffLines(osmd)[0];
        box = tempoLabels(line)[0].Label.PositionAndShape;
        expect(box.RelativePosition.y + box.BorderTop, "default-y below").to.be.at.least(line.StaffHeight - 0.001);
        // no placement: above the system as before
        const ritNoPlacement: string = "<direction><direction-type><words font-style=\"italic\">rit.</words></direction-type>" +
            "<offset>-1</offset></direction>";
        osmd = await render(singleStaffScore(m17Notes.replace("__WORDS__", ritNoPlacement)));
        line = staffLines(osmd)[0];
        expect(tempoLabels(line)[0].Label.PositionAndShape.RelativePosition.y, "no placement: above").to.be.lessThan(0);
        // piano, staff 1 below: between the staves, under the right hand
        const ritStaff1Below: string = "<direction placement=\"below\"><direction-type><words font-style=\"italic\">rit.</words></direction-type>" +
            "<staff>1</staff></direction>";
        osmd = await render(pianoScore(ritStaff1Below));
        const [upper, lower] = staffLines(osmd);
        expect(tempoLabels(lower).length).to.equal(0);
        labels = tempoLabels(upper);
        expect(labels.map((l) => l.Label.Label.text)).to.deep.equal(["rit."]);
        box = labels[0].Label.PositionAndShape;
        expect(box.RelativePosition.y + box.BorderTop, "below the right hand").to.be.at.least(upper.StaffHeight - 0.001);
        const gap: number = lower.PositionAndShape.RelativePosition.y - upper.PositionAndShape.RelativePosition.y;
        expect(box.RelativePosition.y + box.BorderBottom, "above the left hand").to.be.lessThan(gap);
    });

    describe("tempo changes of an instrument below the top one", () => {
        const pianoAttributes: string = `<attributes><divisions>2</divisions><time><beats>3</beats><beat-type>4</beat-type></time><staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>`;
        const cantoMeasure1: string = `<attributes><divisions>2</divisions><time><beats>3</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef></attributes>
        <note><pitch><step>G</step><octave>4</octave></pitch><duration>6</duration><type>half</type><dot/></note>`;
        const quarter: string = "<note><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice>" +
            "<type>quarter</type><staff>1</staff></note>";

        /** a measure of the piano: directions before the right hand's quarters */
        function pianoMeasure(directions: string, stop: string = ""): string {
            return `${directions}${quarter}${quarter}${stop}${quarter}<backup><duration>6</duration></backup>
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>6</duration><voice>5</voice><type>half</type><dot/><staff>2</staff></note>`;
        }

        function songScore(cantoDirections: string, pianoDirections: string, pianoStop: string = ""): string {
            return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Canto</part-name></score-part>
    <score-part id="P2"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">${cantoMeasure1}</measure>
    <measure number="2">${cantoDirections}<note><pitch><step>G</step><octave>4</octave></pitch><duration>6</duration><type>half</type><dot/></note></measure>
  </part>
  <part id="P2">
    <measure number="1">${pianoAttributes}${pianoMeasure("")}</measure>
    <measure number="2">${pianoMeasure(pianoDirections, pianoStop)}</measure>
  </part>
</score-partwise>`;
        }

        function pianoAloneScore(pianoDirections: string): string {
            return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P2"><part-name>Piano</part-name></score-part></part-list>
  <part id="P2">
    <measure number="1">${pianoAttributes}${pianoMeasure("")}</measure>
    <measure number="2">${pianoMeasure(pianoDirections)}</measure>
  </part>
</score-partwise>`;
        }

        function words(text: string, placement: string = " placement=\"above\"", staff: string = "<staff>1</staff>"): string {
            return `<direction${placement}><direction-type><words font-style="italic">${text}</words></direction-type>${staff}</direction>`;
        }

        function tempoTexts(staffLine: StaffLine): string[] {
            return tempoLabels(staffLine).map((l) => l.Label.Label.text);
        }

        it("draws the piano's \"ritard.\" above the piano, not above the voice", async () => {
            for (const ritard of [words("ritard."), words("ritard.", " placement=\"above\"", "")]) {
                const osmd: OpenSheetMusicDisplay = await render(songScore("", ritard));
                const lines: StaffLine[] = staffLines(osmd);
                expect(lines.length).to.equal(3);
                expect(tempoTexts(lines[0]), "nothing above the voice").to.deep.equal([]);
                expect(tempoTexts(lines[1])).to.deep.equal(["ritard."]);
                expect(tempoTexts(lines[2])).to.deep.equal([]);
                const box: { RelativePosition: { y: number }, BorderTop: number, BorderBottom: number } =
                    tempoLabels(lines[1])[0].Label.PositionAndShape;
                expect(box.RelativePosition.y + box.BorderBottom, "above the right hand").to.be.at.most(0.001);
                const gap: number = lines[1].PositionAndShape.RelativePosition.y - lines[0].PositionAndShape.RelativePosition.y -
                    lines[0].StaffHeight;
                expect(box.RelativePosition.y + box.BorderTop, "between the voice and the piano").to.be.greaterThan(-gap);
            }
        });

        it("draws the voice's and the piano's \"ritard.\" at the same moment once each, above their own staff", async () => {
            const osmd: OpenSheetMusicDisplay = await render(songScore(words("ritard.", " placement=\"above\"", ""), words("ritard.")));
            const lines: StaffLine[] = staffLines(osmd);
            expect(tempoTexts(lines[0])).to.deep.equal(["ritard."]);
            expect(tempoTexts(lines[1])).to.deep.equal(["ritard."]);
            expect(tempoTexts(lines[2])).to.deep.equal([]);
        });

        it("keeps the \"ritard.\" of a piano score alone above the system", async () => {
            const osmd: OpenSheetMusicDisplay = await render(pianoAloneScore(words("ritard.")));
            const lines: StaffLine[] = staffLines(osmd);
            expect(lines.length).to.equal(2);
            expect(tempoTexts(lines[0])).to.deep.equal(["ritard."]);
            expect(tempoTexts(lines[1])).to.deep.equal([]);
            expect(tempoLabels(lines[0])[0].Label.PositionAndShape.RelativePosition.y).to.be.lessThan(0);
        });

        it("keeps a main tempo mark or words without a placement in the piano above the system", async () => {
            for (const direction of [words("Allegro"), words("Allegro", " placement=\"above\"", ""), words("ritard.", "")]) {
                const osmd: OpenSheetMusicDisplay = await render(songScore("", direction));
                const lines: StaffLine[] = staffLines(osmd);
                expect(tempoTexts(lines[0]).length, direction).to.equal(1);
                expect(tempoTexts(lines[1]), direction).to.deep.equal([]);
                expect(tempoTexts(lines[2]), direction).to.deep.equal([]);
            }
        });

        it("draws the dashes of the piano's \"ritard.\" above the piano", async () => {
            // Raethsel m16: "ritard. - - -" above the right hand
            const ritardDashes: string = words("ritard.").replace("</direction-type>",
                "</direction-type><direction-type><dashes type=\"start\" number=\"1\"/></direction-type>");
            const stop: string = "<direction placement=\"above\"><direction-type><dashes type=\"stop\" number=\"1\"/></direction-type>" +
                "<staff>1</staff></direction>";
            const osmd: OpenSheetMusicDisplay = await render(songScore("", ritardDashes, stop));
            const lines: StaffLine[] = staffLines(osmd);
            expect(tempoTexts(lines[1])).to.deep.equal(["ritard."]);
            expect(lines[0].ExpressionDashes.length).to.equal(0);
            expect(lines[2].ExpressionDashes.length).to.equal(0);
            expect(lines[1].ExpressionDashes.length).to.equal(1);
            const label: { RelativePosition: { x: number }, BorderMarginLeft: number } = tempoLabels(lines[1])[0].Label.PositionAndShape;
            const dashes: { Start: { x: number, y: number }, End: { x: number } } = lines[1].ExpressionDashes[0];
            expect(dashes.Start.x, "after the words").to.be.greaterThan(label.RelativePosition.x + label.BorderMarginLeft);
            expect(dashes.End.x).to.be.greaterThan(dashes.Start.x);
            expect(dashes.Start.y, "above the right hand").to.be.lessThan(0);
        });
    });
});
