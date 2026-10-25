import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";

/**
 * Stepping the cursor through positions that only carry notes of an invisible instrument must never move it
 * backwards. A voice rests in measures 2-8 (rendered as one multirest once the piano is hidden) and holds dotted
 * halves afterwards, while the piano plays quarters throughout. With the piano hidden, the 2nd quarter of a
 * measure falls back to the previous (visible) note, but the 3rd one found no visible note on the previous position
 * either and was treated as the end of the sheet: the cursor jumped to the measure's end (or the multirest's end)
 * and moved back on the next visible note.
 */
describe("Cursor with an invisible instrument", () => {
    const voiceMeasure: (index: number) => string = (index: number): string => {
        const attributes: string = index === 0
            ? `<attributes><divisions>1</divisions><key><fifths>1</fifths></key>
               <time><beats>3</beats><beat-type>4</beat-type></time><clef><sign>F</sign><line>4</line></clef></attributes>`
            : "";
        const body: string = index === 0 || index >= 8
            ? "<note><pitch><step>E</step><octave>3</octave></pitch><duration>3</duration><voice>1</voice><type>half</type><dot/></note>"
            : "<note><rest measure=\"yes\"/><duration>3</duration><voice>1</voice></note>";
        return `<measure number="${index + 1}">${attributes}${body}</measure>`;
    };
    const pianoMeasure: (index: number) => string = (index: number): string => {
        const attributes: string = index === 0
            ? `<attributes><divisions>1</divisions><key><fifths>1</fifths></key>
               <time><beats>3</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>`
            : "";
        const quarter: string = "<note><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>";
        return `<measure number="${index + 1}">${attributes}${quarter}${quarter}${quarter}</measure>`;
    };
    const measures: (render: (index: number) => string) => string = (render: (index: number) => string): string =>
        Array.from({ length: 12 }, (_, index) => render(index)).join("");
    const score: string = `<?xml version="1.0" encoding="UTF-8"?>
        <score-partwise version="3.1">
          <part-list>
            <score-part id="P1"><part-name>Bass</part-name></score-part>
            <score-part id="P2"><part-name>Piano</part-name></score-part>
          </part-list>
          <part id="P1">${measures(voiceMeasure)}</part>
          <part id="P2">${measures(pianoMeasure)}</part>
        </score-partwise>`;

    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1300px";
        document.body.appendChild(container);
    });
    afterEach(() => {
        container.remove();
    });

    it("moves only forward through a multirest and measures whose positions belong to the hidden piano", async () => {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(score);
        osmd.EngravingRules.AutoGenerateMultipleRestMeasuresFromRestMeasures = true;
        osmd.Sheet.Instruments[1].Visible = false;
        osmd.updateGraphic();
        osmd.render();
        // premise: measures 2-8 are one multirest, all on the first system with measures 9+
        expect(osmd.Sheet.SourceMeasures[1].multipleRestMeasures).to.equal(7);

        osmd.cursor.reset();
        osmd.cursor.show();
        const positions: { measure: number, left: number, top: number }[] = [];
        while (!osmd.cursor.iterator.EndReached) {
            positions.push({
                measure: osmd.cursor.iterator.CurrentMeasureIndex,
                left: Number.parseFloat(osmd.cursor.cursorElement.style.left),
                top: Number.parseFloat(osmd.cursor.cursorElement.style.top),
            });
            // a player that still sounds the hidden piano steps the iterator over every position and only
            //   updates the cursor (cursor.next() would skip the positions without visible notes)
            osmd.cursor.iterator.moveToNext();
            osmd.cursor.update();
        }
        // every piano quarter is a cursor position: 12 measures x 3
        expect(positions.length).to.equal(36);
        for (let index: number = 1; index < positions.length; index++) {
            const previous: { measure: number, left: number, top: number } = positions[index - 1];
            const current: { measure: number, left: number, top: number } = positions[index];
            if (current.top !== previous.top) {
                continue; // next system
            }
            expect(current.left, `cursor x at position ${index} (measure ${current.measure + 1}) must not move backwards`)
                .to.be.at.least(previous.left - 0.01);
        }
    }).timeout(10000);
});
