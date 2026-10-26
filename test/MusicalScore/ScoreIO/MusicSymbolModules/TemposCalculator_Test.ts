import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

describe("Tempo state", (): void => {
    let container: HTMLElement;

    beforeEach((): void => {
        container = TestUtils.getDivElement(document);
    });

    afterEach((): void => {
        container.remove();
    });

    async function tempoState(filename: string): Promise<{ bpms: number[], metronomeBpms: number[] }> {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore(filename));
        osmd.render();
        osmd.cursor.show();
        osmd.cursor.reset();
        const bpms: number[] = [];
        while (!osmd.cursor.Iterator.EndReached) {
            bpms.push(osmd.cursor.Iterator.CurrentBpm);
            osmd.cursor.next();
        }
        const metronomeBpms: number[] = osmd.Sheet.TimestampSortedTempoExpressionsList
            .map(expression => expression.InstantaneousTempo)
            .filter(expression => expression?.isMetronomeMark)
            .map(expression => expression.TempoInBpm);
        return { bpms, metronomeBpms };
    }

    it("changes the tempo at metric modulations and keeps it through a tempo word and a swing mark", async (): Promise<void> => {
        const state: { bpms: number[], metronomeBpms: number[] } = await tempoState("test_tempo_state.musicxml");
        // quarter = dotted quarter in m3: the new dotted quarter lasts as long as the old quarter, 96 * 1.5 = 144.
        // dotted quarter = quarter in m5 (written with two beat units): back to 144 * 2 / 3 = 96. The swing mark in m6 keeps it.
        expect(state.bpms).to.deep.equal([60, 96, 144, 144, 96, 96]);
        expect(state.metronomeBpms).to.deep.equal([60, 96, 144, 96, 96]);
    });

    it("keeps a defined tempo for an initial swing mark", async (): Promise<void> => {
        const state: { bpms: number[], metronomeBpms: number[] } = await tempoState("test_tempo_state_start_fallback.musicxml");
        expect(state.bpms).to.have.lengthOf(2);
        expect(state.bpms[0]).to.be.greaterThan(0);
        expect(state.bpms[1]).to.equal(state.bpms[0]);
        expect(state.metronomeBpms).to.deep.equal([state.bpms[0]]);
    });

    it("keeps a defined tempo when the first swing mark follows an unmarked measure", async (): Promise<void> => {
        const state: { bpms: number[], metronomeBpms: number[] } = await tempoState("test_tempo_state_delayed_equation.musicxml");
        expect(state.bpms).to.have.lengthOf(2);
        expect(state.bpms[0]).to.be.greaterThan(0);
        expect(state.bpms[1]).to.equal(state.bpms[0]);
        expect(state.metronomeBpms).to.deep.equal([state.bpms[0]]);
    });

    /** Two measures of one whole note in time beats/beatType, with the directions written before each note. */
    function twoMeasures(beats: number, beatType: number, first: string, second: string): string {
        const measure: (n: number, directions: string) => string = (n, directions) => `<measure number="${n}">` +
            (n === 1 ? `<attributes><divisions>1</divisions><time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time>` +
                "<clef><sign>G</sign><line>2</line></clef></attributes>" : "") +
            `${directions}<note><pitch><step>C</step><octave>5</octave></pitch><duration>${beats * 4 / beatType}</duration>` +
            "<type>whole</type></note></measure>";
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list><score-part id=\"P1\">" +
            `<part-name>Flute</part-name></score-part></part-list><part id="P1">${measure(1, first)}${measure(2, second)}</part></score-partwise>`;
    }

    function metronome(beatUnit: string, dot: boolean, perMinute: number): string {
        return `<direction placement="above"><direction-type><metronome><beat-unit>${beatUnit}</beat-unit>` +
            `${dot ? "<beat-unit-dot/>" : ""}<per-minute>${perMinute}</per-minute></metronome></direction-type></direction>`;
    }

    async function measureBpms(xml: string): Promise<{ bpms: number[], osmd: OpenSheetMusicDisplay }> {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(xml);
        const bpms: number[] = [];
        const iterator: any = osmd.Sheet.MusicPartManager.getIterator();
        while (!iterator.EndReached) {
            bpms.push(iterator.CurrentBpm);
            iterator.moveToNext();
        }
        return { bpms, osmd };
    }

    it("keeps the tempo in force at a word that only qualifies it (poco rit.), as osmd-dart", async (): Promise<void> => {
        const words: string = "<direction placement=\"above\"><direction-type><words>poco rit.</words></direction-type></direction>";
        const { bpms, osmd } = await measureBpms(twoMeasures(4, 4, metronome("quarter", false, 120), words));
        const addon: any = osmd.Sheet.TimestampSortedTempoExpressionsList[1].InstantaneousTempo;
        expect(addon.Label).to.equal("poco rit.");
        // the default for its missing InstTempo, 60, played the rest of the piece at 60 BPM
        expect(addon.TempoInBpm).to.equal(120);
        expect(bpms).to.deep.equal([120, 120]);
    });

    it("starts a score with no tempo at its start at Moderato 106, kept by a first qualifying word, as osmd-dart", async (): Promise<void> => {
        const words: string = "<direction placement=\"above\"><direction-type><words>A tempo giusto.</words></direction-type></direction>";
        const { bpms, osmd } = await measureBpms(twoMeasures(4, 4, "", words));
        expect(osmd.Sheet.getExpressionsStartTempoInBPM()).to.equal(106);
        expect(osmd.Sheet.TimestampSortedTempoExpressionsList[0].InstantaneousTempo.TempoInBpm).to.equal(106);
        expect(bpms).to.deep.equal([106, 106]);
    });

    it("plays a metronome mark without <sound tempo> in quarter notes per minute, as osmd-dart", async (): Promise<void> => {
        const dotted: { bpms: number[], osmd: OpenSheetMusicDisplay } =
            await measureBpms(twoMeasures(12, 8, metronome("quarter", true, 126), ""));
        // dotted quarter = 126 is 189 quarter notes per minute; the printed mark keeps 126
        expect(dotted.bpms).to.deep.equal([189, 189]);
        expect(dotted.osmd.Sheet.TimestampSortedTempoExpressionsList[0].InstantaneousTempo.TempoInBpm).to.equal(126);
        const eighth: { bpms: number[], osmd: OpenSheetMusicDisplay } =
            await measureBpms(twoMeasures(4, 4, metronome("eighth", false, 88), ""));
        expect(eighth.bpms).to.deep.equal([44, 44]);
        const quarter: { bpms: number[], osmd: OpenSheetMusicDisplay } =
            await measureBpms(twoMeasures(4, 4, metronome("quarter", false, 96), ""));
        expect(quarter.bpms).to.deep.equal([96, 96]);
    });
});
