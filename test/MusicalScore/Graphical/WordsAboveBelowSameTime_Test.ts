import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalUnknownExpression } from "../../../src/MusicalScore/Graphical/GraphicalUnknownExpression";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";

/**
 * Words directions of a staff at the same time share one MultiExpression. calculateMoodAndUnknownExpression() joined
 * all their texts into one label at the placement of the first one, so "Majeur" (above) and "(fort)" (below) were
 * drawn as "Majeur (fort)" above the staff (Couperin, Concerts royaux III Chaconne légère m57, m70, m111).
 */
describe("Words above and below a staff at the same time", () => {
    let container: HTMLElement;
    let words: {text: string, placement: PlacementEnum, y: number}[];
    before(async () => {
        container = document.createElement("div");
        container.style.width = "1300px";
        document.body.appendChild(container);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_words_above_below_same_time.musicxml"));
        osmd.render();
        const staffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
        words = staffLine.AbstractExpressions
            .filter(expression => expression instanceof GraphicalUnknownExpression)
            .map(expression => {
                const label: GraphicalUnknownExpression = expression as GraphicalUnknownExpression;
                return {text: label.Label.Label.text, placement: label.Placement,
                        y: label.Label.PositionAndShape.RelativePosition.y};
            });
    });
    after(() => {
        container.remove();
    });

    function word(text: string): {text: string, placement: PlacementEnum, y: number} {
        const found: {text: string, placement: PlacementEnum, y: number} = words.find(w => w.text === text);
        expect(found, `"${text}" among ${JSON.stringify(words.map(w => w.text))}`).to.not.equal(undefined);
        return found;
    }

    it("draws each placement's words as its own label", () => {
        expect(words.map(w => w.text)).to.deep.equal(["Majeur", "(fort)", "(Rondeau)", "fort", "poco espress."]);
    });

    it("draws the above words above the staff and the below words below it", () => {
        for (const text of ["Majeur", "(Rondeau)"]) {
            expect(word(text).placement, text).to.equal(PlacementEnum.Above);
            expect(word(text).y, `${text} (label bottom)`).to.be.at.most(0); // on or above the top staff line
        }
        for (const text of ["(fort)", "fort"]) {
            expect(word(text).placement, text).to.equal(PlacementEnum.Below);
            expect(word(text).y, `${text} (label top)`).to.be.at.least(4); // on or below the bottom staff line
        }
        expect(word("poco espress.").placement).to.equal(PlacementEnum.Above);
    });
});
