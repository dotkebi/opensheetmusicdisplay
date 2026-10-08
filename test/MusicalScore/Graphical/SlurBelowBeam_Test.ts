import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { GraphicalNote } from "../../../src/MusicalScore/Graphical/GraphicalNote";
import { VexFlowGraphicalNote } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { unitInPixels } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";

/**
 * A slur below a beamed group of stem-down notes starts and ends just under the beam, at the stem tips (by
 * SlurNoteHeadYOffset). Guards the web against what osmd-dart did: it gave the voice entry of a beamed stem-down note
 * 1.5 units below its stem tip "for the beam thickness", so such a slur started 2 units under the beam and looked like a
 * separate small curve (Paisiello, Nel cor più non mi sento, piano m2; A. Scarlatti, O cessate di piagarmi, piano m5).
 * test_slur_below_beamed_stem_down: the fixture of osmd-dart (slur_below_beamed_stem_down_test.dart).
 */
describe("Slur below a beamed group of stem-down notes", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_slur_below_beamed_stem_down.musicxml"));
    });

    /** The y of the tip of the note's down stem as drawn in the SVG, i.e. where the beam is, relative to its staff line. */
    function drawnStemTipY(note: GraphicalNote, staffLine: StaffLine): number {
        const box: DOMRect = ((note as VexFlowGraphicalNote).getStemSVG() as unknown as SVGGraphicsElement).getBBox();
        return (box.y + box.height) / unitInPixels - staffLine.PositionAndShape.AbsolutePosition.y;
    }

    it("starts and ends the slurs just under the beam, on every render", () => {
        for (const render of ["first render", "re-render"]) {
            osmd.render();
            const staffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
            const slurs: GraphicalSlur[] = staffLine.GraphicalSlurs;
            expect(slurs.length, render).to.equal(3);
            for (const slur of slurs) {
                expect(slur.placement, render).to.equal(PlacementEnum.Below);
                const startNote: GraphicalNote = slur.staffEntries[0].findGraphicalNoteFromNote(slur.slur.StartNote);
                const endNote: GraphicalNote = slur.staffEntries[slur.staffEntries.length - 1].findGraphicalNoteFromNote(slur.slur.EndNote);
                const ends: [string, number, GraphicalNote][] = [["start", slur.bezierStartPt.y, startNote], ["end", slur.bezierEndPt.y, endNote]];
                for (const [what, y, note] of ends) {
                    const tip: number = drawnStemTipY(note, staffLine);
                    // (positive y is down)
                    expect(y, `${render}: ${what} of the slur below the beam`).to.be.above(tip);
                    expect(y - tip, `${render}: ${what} of the slur just under the beam (slur at ${y}, stem tip at ${tip})`).to.be.at.most(0.75);
                }
            }
        }
    });
});
