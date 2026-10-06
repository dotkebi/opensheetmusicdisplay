import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalVoiceEntry } from "../../../src/MusicalScore/Graphical/GraphicalVoiceEntry";
import { StemDirectionType } from "../../../src/MusicalScore/VoiceData/VoiceEntry";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Couperin, Concerts royaux II Air tendre m37 (1722 review R01): grace notes with no stem in the XML, slurred to their
 * main notes above, get a down stem, opposite the slur, as in the 1722 print: with the up stem OSMD gave them, the arc
 * ran through their stems and flags. A slur below gives an up stem; a stem in the XML is kept.
 * Same as osmd-dart test/grace_stem_away_from_slur_test.dart.
 */
describe("Grace note stem away from its slur", () => {
    it("points the stem of a grace note with no stem in the XML away from its slur", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore("test_grace_stem_away_from_slur.musicxml"));
        osmd.render();
        const graces: StemDirectionType[] = [];
        for (const entry of osmd.GraphicSheet.MeasureList[0][0].staffEntries) {
            for (const gve of entry.graphicalVoiceEntries as GraphicalVoiceEntry[]) {
                if (gve.parentVoiceEntry.IsGrace) {
                    graces.push(gve.parentVoiceEntry.StemDirection);
                }
            }
        }
        expect(graces).to.deep.equal([StemDirectionType.Down, StemDirectionType.Down, StemDirectionType.Down,
            StemDirectionType.Up, StemDirectionType.Up]);
    });
});
