import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { AbstractGraphicalExpression } from "../../../src/MusicalScore/Graphical/AbstractGraphicalExpression";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { unitInPixels } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";

/**
 * Beams across staves: one beam with the notes of both staves of a piano.
 * Upstream OSMD 2.3.1's test of its own cross-staff beams (PR #1977, #1978, EngravingRules.RenderCrossStaffBeams), which the fork
 * doesn't take: the fork draws them with CrossStaffBeam (see CrossStaffBeam_Test), as osmd-dart. The check of upstream's switch
 * (the measure widths with and without it) is dropped with the switch; the check of what lies between the staves is kept.
 */
describe("Cross-staff beams", () => {
    // A beam between the staves goes below the upper staff's notes, where its room is reserved, so that what is placed below the
    //   upper staff goes below the beam: here the pp of Mandoline m.2, under the beam of the right hand's chord (stem down) and the
    //   left hand's chord (stem up). Elsewhere, with nothing placed between the staves, the beam stays midway between them.
    // Before fix: the room was reserved half below the upper staff and half above the lower one, and the beam drawn midway, so
    //   the pp, placed below the upper staff's half, was on the beam.
    it("keeps what is placed between the staves off the beam", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("Debussy_Mandoline.xml"));
        osmd.render();
        const staffLines: StaffLine[] = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines;
        const expressions: AbstractGraphicalExpression[] = staffLines.flatMap(staffLine => staffLine.AbstractExpressions);
        // between the piano's staves (the last two of the system)
        const upperPianoStaff: BoundingBox = staffLines[staffLines.length - 2].PositionAndShape;
        const lowerPianoStaff: BoundingBox = staffLines[staffLines.length - 1].PositionAndShape;
        const pp: BoundingBox = expressions.find(expression => expression.Label?.Label.text === "pp")?.Label.PositionAndShape;
        expect(pp !== undefined, "the pp of m.2").to.equal(true);
        const [left, right] = [pp.AbsolutePosition.x + pp.BorderLeft, pp.AbsolutePosition.x + pp.BorderRight];
        const top: number = pp.AbsolutePosition.y + pp.BorderTop;
        // the drawn beams over the pp's width, in units
        const beams: DOMRect[] = (Array.from(container.querySelectorAll("path.vf-beam, .vf-beam path")) as SVGGraphicsElement[])
            .map(element => element.getBBox())
            .filter(box => box.x / unitInPixels < right && (box.x + box.width) / unitInPixels > left &&
                box.y / unitInPixels > upperPianoStaff.AbsolutePosition.y && box.y / unitInPixels < lowerPianoStaff.AbsolutePosition.y);
        expect(beams.length, "beams over the pp").to.be.greaterThan(0);
        for (const beam of beams) {
            const beamBottom: number = (beam.y + beam.height) / unitInPixels;
            expect(beamBottom, "the beam is above the pp").to.be.at.most(top);
        }
    });
});
