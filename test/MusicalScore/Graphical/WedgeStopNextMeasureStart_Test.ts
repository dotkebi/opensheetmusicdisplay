import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalContinuousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalContinuousDynamicExpression";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { MultiExpression } from "../../../src/MusicalScore/VoiceData/Expressions/MultiExpression";
import { TestUtils } from "../../Util/TestUtils";

/**
 * A wedge whose stop is written at the very start of the next measure (no <offset>), which the reader closes at the previous
 * measure's last entry (ExpressionReader.wedgeStopAtPreviousMeasureEnd(), where the playback ends): drawn to the first note of
 * that next measure when it is in the same system, as the wedge is written in the XML (user decision 2026-10-24
 * B1-SOURCE-DEFAULT; before, it ended at the barline, 10-07):
 * - at the note's x for a crescendo, at the staff entry's left border (accidentals) for a diminuendo, WedgeHorizontalMargin
 *   before it (Bowen, Viola Sonata No. 2 m195-196, m223-224; Enescu, Concertstück, Viola m19-20; Intrada, Honegger m35-38;
 *   Davydov, Op. 11 Piano m128-129);
 * - a wedge from an <offset> inside a held note, whose stop the reader closed at the start of the held measure (Bowen m138-140:
 *   it was taken for a stop left at a measure's start and ended at the barline of the measure before, one measure early);
 * - over a whole-measure rest of the staff, at the time of the measure's start on the other staff (Enescu Piano m1-2: the left
 *   hand's first p);
 * - when the next measure starts a new system, at the barline as before;
 * - a stop written at the end of the previous measure (an <offset> to its end, or after its last note) still ends at the barline.
 * Same as osmd-dart test/wedge_stop_next_measure_start_test.dart.
 */
describe("Wedge stopped at the next measure's start", () => {
    function note(step: string, octave: number, duration: number, type: string, staff: number, accidental?: string): string {
        return `<note><pitch><step>${step}</step>${accidental ? `<alter>${accidental === "sharp" ? 1 : -1}</alter>` : ""}` +
            `<octave>${octave}</octave></pitch><duration>${duration}</duration><voice>${staff === 1 ? 1 : 5}</voice>` +
            `<type>${type}</type>${accidental ? `<accidental>${accidental}</accidental>` : ""}<staff>${staff}</staff></note>`;
    }
    const wholeRest: string = "<note><rest measure=\"yes\"/><duration>16</duration><voice>1</voice><staff>1</staff></note>";
    function wedgeXml(type: string, offset?: number): string {
        return `<direction placement="below"><direction-type><wedge type="${type}"/></direction-type>` +
            `${offset === undefined ? "" : `<offset>${offset}</offset>`}<staff>1</staff></direction>`;
    }
    const attributes: string = "<attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>4</beats>" +
        "<beat-type>4</beat-type></time><staves>2</staves><clef number=\"1\"><sign>G</sign><line>2</line></clef>" +
        "<clef number=\"2\"><sign>F</sign><line>4</line></clef></attributes>";
    function rightHandQuarters(firstAccidental?: string): string {
        return note("C", 5, 4, "quarter", 1, firstAccidental) + ["D", "E", "F"].map(s => note(s, 5, 4, "quarter", 1)).join("");
    }
    function leftHandQuarters(): string {
        return ["C", "D", "E", "F"].map(s => note(s, 3, 4, "quarter", 2)).join("");
    }
    /** A measure: before the right hand's notes, then rightHand, a backup, the left hand's quarters, after at the end. */
    function measureXml(number: number, before: string, rightHand: string, after: string = "", newSystem: boolean = false): string {
        return `<measure number="${number}">${number === 1 ? attributes : ""}${newSystem ? "<print new-system=\"yes\"/>" : ""}` +
            `${before}${rightHand}${after}<backup><duration>16</duration></backup>${leftHandQuarters()}</measure>`;
    }
    function score(measures: string[]): string {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list><score-part id=\"P1\">" +
            `<part-name>Piano</part-name></score-part></part-list><part id="P1">${measures.join("")}</part></score-partwise>`;
    }
    function render(source: string): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        osmd.EngravingRules.NewSystemAtXMLNewSystemAttribute = true;
        return osmd.load(source).then(() => {
            osmd.render();
            return osmd;
        });
    }
    function wedges(osmd: OpenSheetMusicDisplay): GraphicalContinuousDynamicExpression[] {
        const found: GraphicalContinuousDynamicExpression[] = [];
        for (const system of osmd.GraphicSheet.MusicPages[0].MusicSystems) {
            for (const staffLine of system.StaffLines) {
                for (const e of staffLine.AbstractExpressions) {
                    if (e instanceof GraphicalContinuousDynamicExpression) {
                        found.push(e);
                    }
                }
            }
        }
        return found;
    }
    function right(w: GraphicalContinuousDynamicExpression): number {
        return Math.max(...w.Lines.map(l => Math.max(l.Start.x, l.End.x)));
    }
    function measure(osmd: OpenSheetMusicDisplay, index: number, staff: number): GraphicalMeasure {
        return osmd.GraphicSheet.MeasureList[index][staff];
    }
    function entryX(m: GraphicalMeasure, timestamp: number, leftBorder: boolean = false): number {
        const entry: GraphicalStaffEntry = m.staffEntries.find(e => Math.abs(e.relInMeasureTimestamp.RealValue - timestamp) < 1e-9);
        return m.PositionAndShape.RelativePosition.x + entry.PositionAndShape.RelativePosition.x +
            (leftBorder ? entry.PositionAndShape.BorderLeft : 0);
    }
    function measureEnd(m: GraphicalMeasure): number {
        return m.PositionAndShape.RelativePosition.x + m.PositionAndShape.BorderRight;
    }

    it("draws a crescendo stopped at the start of the next measure to its first note; the playback end stays", async () => {
        const osmd: OpenSheetMusicDisplay = await render(score([
            measureXml(1, wedgeXml("crescendo"), rightHandQuarters()),
            measureXml(2, wedgeXml("stop"), rightHandQuarters()),
        ]));
        const all: GraphicalContinuousDynamicExpression[] = wedges(osmd);
        expect(all.length).to.equal(1);
        const w: GraphicalContinuousDynamicExpression = all[0];
        const firstNote: number = entryX(measure(osmd, 1, 0), 0);
        expect(right(w)).to.be.closeTo(firstNote - osmd.EngravingRules.WedgeHorizontalMargin, 0.05);
        expect(w.ContinuousDynamic.StopWrittenAtNextMeasureStart).to.equal(true);
        const end: MultiExpression = w.ContinuousDynamic.EndMultiExpression;
        expect(end.SourceMeasureParent.MeasureNumberXML).to.equal(1);
        expect(end.Timestamp.RealValue).to.equal(0.75);
        expect(w.ContinuousDynamic.StopTimestamp).to.equal(undefined);
    });

    it("draws a diminuendo stopped at the next measure's start to the left border of its first note (its accidental)", async () => {
        const osmd: OpenSheetMusicDisplay = await render(score([
            measureXml(1, wedgeXml("diminuendo"), rightHandQuarters()),
            measureXml(2, wedgeXml("stop"), rightHandQuarters("sharp")),
        ]));
        const w: GraphicalContinuousDynamicExpression = wedges(osmd)[0];
        const m2: GraphicalMeasure = measure(osmd, 1, 0);
        const border: number = entryX(m2, 0, true);
        expect(border).to.be.lessThan(entryX(m2, 0) - 0.5);
        expect(right(w)).to.be.closeTo(border - osmd.EngravingRules.WedgeHorizontalMargin, 0.05);
    });

    it("draws a wedge from an offset inside a held note, stopped after the held measure, to that measure (Bowen m138-140)", async () => {
        // m1 RH whole note, crescendo from q1 (offset 4); m2 RH whole note (the reader closes the stop at its start); m3 stop at q0
        const whole: string = note("C", 5, 16, "whole", 1);
        const osmd: OpenSheetMusicDisplay = await render(score([
            measureXml(1, wedgeXml("crescendo", 4), whole),
            measureXml(2, "", whole),
            measureXml(3, wedgeXml("stop"), rightHandQuarters()),
        ]));
        const w: GraphicalContinuousDynamicExpression = wedges(osmd)[0];
        const end: MultiExpression = w.ContinuousDynamic.EndMultiExpression;
        expect(end.SourceMeasureParent.MeasureNumberXML).to.equal(2);
        expect(end.Timestamp.RealValue).to.equal(0);
        expect(w.ContinuousDynamic.StopWrittenAtNextMeasureStart).to.equal(true);
        const firstNote: number = entryX(measure(osmd, 2, 0), 0);
        expect(right(w)).to.be.closeTo(firstNote - osmd.EngravingRules.WedgeHorizontalMargin, 0.05);
    });

    it("draws a wedge over a whole-measure rest to the time of the next measure's start on the other staff (Enescu Piano m1-2)",
       async () => {
        const osmd: OpenSheetMusicDisplay = await render(score([
            measureXml(1, wedgeXml("diminuendo", 8), wholeRest),
            measureXml(2, wedgeXml("stop"), wholeRest),
        ]));
        const w: GraphicalContinuousDynamicExpression = wedges(osmd)[0];
        const leftHandFirst: number = entryX(measure(osmd, 1, 1), 0);
        expect(right(w)).to.be.closeTo(leftHandFirst - osmd.EngravingRules.WedgeHorizontalMargin, 0.05);
    });

    it("ends at the barline when the next measure starts a new system", async () => {
        const osmd: OpenSheetMusicDisplay = await render(score([
            measureXml(1, wedgeXml("crescendo"), rightHandQuarters()),
            measureXml(2, wedgeXml("stop"), rightHandQuarters(), "", true),
        ]));
        expect(osmd.GraphicSheet.MusicPages[0].MusicSystems.length).to.be.greaterThanOrEqual(2);
        const w: GraphicalContinuousDynamicExpression = wedges(osmd)[0];
        expect(right(w)).to.be.closeTo(measureEnd(measure(osmd, 0, 0)) - osmd.EngravingRules.WedgeHorizontalMargin, 0.05);
    });

    it("keeps a stop written at the end of the previous measure (an offset to its end, or after its last note) at the barline",
       async () => {
        const osmd: OpenSheetMusicDisplay = await render(score([
            measureXml(1, wedgeXml("crescendo") + wedgeXml("stop", 16), rightHandQuarters()),
            measureXml(2, wedgeXml("crescendo"), rightHandQuarters(), wedgeXml("stop")),
            measureXml(3, "", rightHandQuarters()),
        ]));
        const all: GraphicalContinuousDynamicExpression[] = wedges(osmd);
        expect(all.length).to.equal(2);
        for (let i: number = 0; i < 2; i++) {
            expect(all[i].ContinuousDynamic.StopWrittenAtNextMeasureStart).to.equal(false);
            expect(right(all[i])).to.be.closeTo(measureEnd(measure(osmd, i, 0)) - osmd.EngravingRules.WedgeHorizontalMargin, 0.05);
        }
    });
});
