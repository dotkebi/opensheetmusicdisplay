import {expect} from "chai";
import {OpenSheetMusicDisplay} from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import {GraphicalLabel} from "../../../src/MusicalScore/Graphical/GraphicalLabel";
import {Label} from "../../../src/MusicalScore/Label";
import {TestUtils} from "../../Util/TestUtils";

/** Heading labels of scores without page layout: a subtitle credit with the movement title, independent first-page
 *  credits, arrangers and the copyright. Same rules as osmd-dart's test/first_page_credits_arranger_rights_test.dart.
 */
describe("First-page credits, arrangers and rights (Opusis)", (): void => {
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    const measures: string = `<measure number="1"><attributes><divisions>1</divisions>
            <time><beats>2</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
            <note><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>half</type></note></measure>
        <measure number="2"><note><pitch><step>F</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice>
            <type>half</type></note></measure>`;
    const internalRights: string = "<rights>Music rights: public domain — composer died 1921</rights>";

    function score(identification: string = "", credits: string = ""): string {
        return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0">
            <work><work-title>Sonata, Op. 168</work-title></work>
            <movement-title>I. Allegretto moderato</movement-title>
            <identification><creator type="composer">Camille Saint-Saëns</creator>${identification}</identification>
            ${credits}
            <part-list><score-part id="P1"><part-name>Bassoon</part-name></score-part></part-list>
            <part id="P1">${measures}</part></score-partwise>`;
    }
    function credit(words: string, type?: string, justify: string = "center"): string {
        return `<credit page="1">${type ? `<credit-type>${type}</credit-type>` : ""}` +
            `<credit-words justify="${justify}">${words}</credit-words></credit>`;
    }

    beforeEach((): void => {
        div = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        osmd = TestUtils.createOpenSheetMusicDisplay(div);
    });

    afterEach((): void => {
        osmd.clear();
        div.remove();
    });

    it("reads first-page credits by default", (): void => {
        expect(osmd.EngravingRules.ReadFirstPageCreditWords).to.equal(true);
        expect(osmd.EngravingRules.ReadIdentificationRights).to.equal(false);
    });

    it("keeps the movement title under a subtitle credit", async (): Promise<void> => {
        await osmd.load(score("", credit("pour Basson avec accompagnement de Piano", "subtitle")));
        expect(osmd.Sheet.Subtitle.text).to.equal("pour Basson avec accompagnement de Piano\nI. Allegretto moderato");
    });

    it("doesn't repeat a movement title the subtitle credit already gives", async (): Promise<void> => {
        await osmd.load(score("", credit("I.  Allegretto moderato", "subtitle")));
        expect(osmd.Sheet.Subtitle.text).to.equal("I.  Allegretto moderato");
    });

    it("draws an untyped first-page credit under the subtitle", async (): Promise<void> => {
        await osmd.load(score("", credit("À Monsieur Léon Letellier", undefined, "left")));
        expect(osmd.Sheet.FirstPageCreditWords.map((label: Label): string => label.text)).to.deep.equal(["À Monsieur Léon Letellier"]);
        osmd.render();
        const credits: GraphicalLabel[] = osmd.GraphicSheet.FirstPageCreditWords;
        expect(credits).to.have.length(1);
        const subtitle: GraphicalLabel = osmd.GraphicSheet.Subtitle;
        expect(credits[0].PositionAndShape.RelativePosition.y + credits[0].PositionAndShape.BorderTop)
            .to.be.greaterThan(subtitle.PositionAndShape.RelativePosition.y + subtitle.PositionAndShape.BorderBottom);
    });

    it("puts an arranger under the composer unless a credit shows it", async (): Promise<void> => {
        await osmd.load(score(`<creator type="arranger">Arranged by J. Rozemond</creator>`));
        expect(osmd.Sheet.ComposerString).to.equal("Camille Saint-Saëns\nArranged by J. Rozemond");
        await osmd.load(score(`<creator type="arranger">J. Rozemond</creator>`, credit("Arranged by J. Rozemond", undefined, "right")));
        expect(osmd.Sheet.ComposerString).to.equal("Camille Saint-Saëns");
    });

    it("doesn't read <identification><rights> as the copyright unless asked to", async (): Promise<void> => {
        await osmd.load(score(internalRights));
        expect(osmd.Sheet.Copyright).to.equal(undefined);
        osmd.EngravingRules.ReadIdentificationRights = true;
        await osmd.load(score(internalRights));
        expect(osmd.Sheet.CopyrightString).to.equal("Music rights: public domain — composer died 1921");
    });

    it("reads a rights credit as the copyright and draws it with drawCredits", async (): Promise<void> => {
        osmd.setOptions({ drawCredits: true });
        await osmd.load(score(internalRights, credit("© 1963 Ernst Eulenburg &amp; Co GmbH", "rights")));
        expect(osmd.Sheet.CopyrightString).to.equal("© 1963 Ernst Eulenburg & Co GmbH");
        osmd.render();
        const pages: { Labels: GraphicalLabel[] }[] = osmd.GraphicSheet.MusicPages;
        expect(pages[pages.length - 1].Labels).to.include(osmd.GraphicSheet.Copyright);
    });
});
