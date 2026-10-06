import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../Util/TestUtils";

/**
 * The lyricist label above the first system keeps clear of a segno above the staff (Schumann, Myrthen 5: "Aus dem
 * Schenkenbuch im Westöstlichen Divan von W. von Goethe." over the segno of m2). A segno in its default place reserves no
 * skyline, so the label, placed above the skyline, didn't see it. Same as osmd-dart test/credit_labels_segno_test.dart.
 */
describe("Credit labels and a segno above the first system", () => {
    function measure(n: number, segno: boolean = false): string {
        return `<measure number="${n}">` +
            (n === 1 ? "<attributes><divisions>1</divisions><time><beats>2</beats><beat-type>4</beat-type></time>" +
                "<clef><sign>G</sign><line>2</line></clef></attributes>" : "") +
            (segno ? "<direction placement=\"above\"><direction-type><segno/></direction-type></direction>" : "") +
            "<note><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>half</type></note>" +
            "</measure>";
    }
    const xml: string = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\">" +
        "<work><work-title>Myrthen, Op. 25</work-title></work>" +
        "<movement-title>5. Lieder aus dem Schenkenbuch im Westöstlichen Divan I</movement-title>" +
        "<identification><creator type=\"composer\">Robert Schumann</creator>" +
        "<creator type=\"lyricist\">Aus dem Schenkenbuch im Westöstlichen Divan von W. von Goethe.</creator></identification>" +
        "<part-list><score-part id=\"P1\"><part-name>Piano</part-name></score-part></part-list><part id=\"P1\">" +
        [1, 2, 3, 4, 5, 6].map(n => measure(n, n === 2)).join("") + "</part></score-partwise>";

    it("keeps the lyricist label clear of the segno under it", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(xml);
        osmd.render();
        const graphic: any = osmd.GraphicSheet;
        const page: any = graphic.MusicPages[0];
        const lyricist: any = graphic.Lyricist.PositionAndShape;
        const top: number = graphic.GetCalculator.firstSystemUnreservedSymbolsTop(page,
            lyricist.RelativePosition.x + lyricist.BorderLeft, lyricist.RelativePosition.x + lyricist.BorderRight);
        expect(top, "the segno is under the lyricist label").not.to.equal(undefined);
        const bottom: number = lyricist.RelativePosition.y + lyricist.BorderBottom;
        expect(bottom, `lyricist bottom ${bottom}, segno top ${top}`).to.be.at.most(top);
    });
});
