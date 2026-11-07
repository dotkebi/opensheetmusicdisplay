import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Reader rules of 2026-11-07, as osmd-dart test/osb_roundtrip_test.dart ("octave-shift offsets, hidden notations, ..."),
 * same score: an octave-shift stop with an <offset> ends there and one before a measure's first note ends in the previous
 * measure; all of a note's <notations> are read and the articulations of a hidden one are not printed; the soft accent of a
 * second part's staff stays on that staff; <rehearsal enclosure="none">; "(" <f/> ")" in one direction is "(f)".
 */
describe("Reader offsets and hidden notations", () => {
    const xml: string = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list><score-part id=\"P1\"><part-name>Solo</part-name></score-part><score-part id=\"P2\"><part-name>Piano</part-name></score-part></part-list><part id=\"P1\"><measure number=\"1\"><attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><direction placement=\"below\"><direction-type><words>(</words></direction-type><direction-type><dynamics><f/></dynamics></direction-type><direction-type><words>)</words></direction-type></direction><direction placement=\"above\"><direction-type><rehearsal enclosure=\"none\">A</rehearsal></direction-type></direction><direction placement=\"above\"><direction-type><octave-shift type=\"down\" size=\"8\" number=\"1\"/></direction-type></direction><direction placement=\"above\"><direction-type><octave-shift type=\"stop\" size=\"8\" number=\"1\"/></direction-type><offset>8</offset></direction><note><pitch><step>C</step><octave>6</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type></note><note><pitch><step>D</step><octave>6</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type></note><note><pitch><step>E</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type></note><note><pitch><step>F</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type></note></measure><measure number=\"2\"><direction placement=\"above\"><direction-type><octave-shift type=\"down\" size=\"8\" number=\"1\"/></direction-type></direction><note><pitch><step>C</step><octave>6</octave></pitch><duration>8</duration><voice>1</voice><type>half</type></note><note><pitch><step>B</step><octave>5</octave></pitch><duration>8</duration><voice>1</voice><type>half</type></note></measure><measure number=\"3\"><direction placement=\"above\"><direction-type><octave-shift type=\"stop\" size=\"8\" number=\"1\"/></direction-type></direction><note><pitch><step>G</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice><type>whole</type><notations print-object=\"no\"><articulations><staccato placement=\"below\"/></articulations></notations><notations><articulations><accent placement=\"above\"/></articulations></notations></note></measure></part><part id=\"P2\"><measure number=\"1\"><attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves><clef number=\"1\"><sign>G</sign><line>2</line></clef><clef number=\"2\"><sign>F</sign><line>4</line></clef></attributes><note><pitch><step>E</step><octave>5</octave></pitch><duration>16</duration><voice>1</voice><type>whole</type><staff>1</staff><notations><articulations><soft-accent/></articulations></notations></note><backup><duration>16</duration></backup><note><rest measure=\"yes\"/><duration>16</duration><voice>5</voice><staff>2</staff></note></measure><measure number=\"2\"><note><rest measure=\"yes\"/><duration>16</duration><voice>1</voice><staff>1</staff></note><backup><duration>16</duration></backup><note><rest measure=\"yes\"/><duration>16</duration><voice>5</voice><staff>2</staff></note></measure><measure number=\"3\"><note><rest measure=\"yes\"/><duration>16</duration><voice>1</voice><staff>1</staff></note><backup><duration>16</duration></backup><note><rest measure=\"yes\"/><duration>16</duration><voice>5</voice><staff>2</staff></note></measure></part></score-partwise>";
    function load(): Promise<OpenSheetMusicDisplay> {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "900px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        return osmd.load(xml).then(() => osmd);
    }
    it("reads the octave shifts, articulations, soft accent, rehearsal enclosure and bracketed dynamic", () => {
        return load().then(osmd => {
            const out: string[] = [];
            for (const measure of osmd.Sheet.SourceMeasures as any[]) {
                measure.StaffLinkedExpressions.forEach((multis: any[], staff: number) => {
                    for (const multi of multis) {
                        if (multi.OctaveShiftStart) {
                            const end: any = multi.OctaveShiftStart.ParentEndMultiExpression;
                            out.push(`8va m${measure.measureListIndex}@${multi.Timestamp.toString()} -> ` +
                                `m${end.SourceMeasureParent.measureListIndex}@${end.Timestamp.toString()}`);
                        }
                        if (multi.InstantaneousDynamic) {
                            out.push(`dyn s${staff} ${multi.InstantaneousDynamic.DynamicExpression}`);
                        }
                        if (multi.StartingContinuousDynamic?.IsStartOfSoftAccent) {
                            out.push(`softAccent s${staff}`);
                        }
                    }
                });
                for (const mark of measure.rehearsalExpressions) {
                    out.push(`rehearsal ${mark.label} ${mark.enclosure}`);
                }
            }
            const entry: any = (osmd.Sheet.SourceMeasures[2] as any).VerticalSourceStaffEntryContainers[0].StaffEntries[0].VoiceEntries[0];
            out.push(entry.Articulations.map((a: any) => `${a.articulationEnum}:${a.printObject}`).join(","));
            expect(out).to.deep.equal([
                "8va m0@0/1 -> m0@7/16", "dyn s0 (f)", "softAccent s1", "rehearsal A none",
                "8va m1@0/1 -> m1@15/16", "6:false,0:true"]);
        });
    });
});
