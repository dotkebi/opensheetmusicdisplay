import { expect } from "chai";
/* eslint-disable @typescript-eslint/no-unused-expressions */
import {MusicSheetReader} from "../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import {MusicSheet} from "../../../src/MusicalScore/MusicSheet";
import {IXmlElement} from "../../../src/Common/FileIO/Xml";
import {MusicSheetCalculator} from "../../../src/MusicalScore/Graphical/MusicSheetCalculator";
import {VexFlowMusicSheetCalculator} from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import {GraphicalMusicSheet} from "../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import {VexFlowTextMeasurer} from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowTextMeasurer";
import {TestUtils} from "../../Util/TestUtils";
import { EngravingRules } from "../../../src/MusicalScore/Graphical/EngravingRules";

describe("Music Sheet Calculator", () => {
    const filename: string = "MuzioClementi_SonatinaOpus36No1_Part1.xml";
    const reader: MusicSheetReader = new MusicSheetReader();
    const calculator: MusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
    let score: IXmlElement;
    let sheet: MusicSheet;

    it("calculates music sheet", (done: Mocha.Done) => {
        // this.timeout = 10000;
        MusicSheetCalculator.TextMeasurer = new VexFlowTextMeasurer(new EngravingRules());
        // Load the XML file
        const xml: Document = TestUtils.getScore(filename);
        expect(xml).to.not.be.undefined;
        score = new IXmlElement(TestUtils.getPartWiseElement(xml));
        expect(score).to.not.be.undefined;
        sheet = reader.createMusicSheet(score, "path-of-" + filename);

        const graphicalSheet: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calculator);
        graphicalSheet.reCalculate();
        done();
    });

    it("skips lyric connectors whose staff lines have not been laid out", () => {
        const startStaffLine: any = { Measures: [] };
        const nextStaffLine: any = { Measures: [] };
        const graphicalLyricWord: any = { GraphicalLyricsEntries: [] };
        const lyricEntry: any = {
            ParentLyricWord: graphicalLyricWord,
            StaffEntryParent: {
                parentMeasure: { ParentStaffLine: startStaffLine }
            }
        };
        const nextLyricEntry: any = {
            StaffEntryParent: {
                parentMeasure: { ParentStaffLine: nextStaffLine }
            }
        };
        graphicalLyricWord.GraphicalLyricsEntries.push(lyricEntry, nextLyricEntry);

        expect(() => (calculator as any).calculateSingleLyricWord(lyricEntry)).to.not.throw();
    });

    it("skips a cross-line lyric connector before the next line has a staff entry", () => {
        const positionAndShape: any = {
            RelativePosition: { x: 0, y: 0 },
            Size: { width: 10 }
        };
        const startMeasure: any = { PositionAndShape: positionAndShape, staffEntries: [] };
        const nextMeasure: any = { PositionAndShape: positionAndShape, staffEntries: [] };
        const startStaffLine: any = { Measures: [startMeasure] };
        const nextStaffLine: any = { Measures: [nextMeasure] };
        startMeasure.ParentStaffLine = startStaffLine;
        nextMeasure.ParentStaffLine = nextStaffLine;

        const graphicalLyricWord: any = { GraphicalLyricsEntries: [] };
        const graphicalLabel: any = {
            CenteringXShift: 0,
            PositionAndShape: { RelativePosition: { x: 0, y: 0 }, BorderMarginRight: 0, BorderMarginLeft: 0 }
        };
        const lyricEntry: any = {
            ParentLyricWord: graphicalLyricWord,
            GraphicalLabel: graphicalLabel,
            StaffEntryParent: { parentMeasure: startMeasure, PositionAndShape: positionAndShape }
        };
        const nextLyricEntry: any = {
            GraphicalLabel: graphicalLabel,
            StaffEntryParent: { parentMeasure: nextMeasure, PositionAndShape: positionAndShape }
        };
        graphicalLyricWord.GraphicalLyricsEntries.push(lyricEntry, nextLyricEntry);

        const calculateDashes: any = (calculator as any).calculateDashes;
        (calculator as any).calculateDashes = (): void => undefined;
        try {
            expect(() => (calculator as any).calculateSingleLyricWord(lyricEntry)).to.not.throw();
        } finally {
            (calculator as any).calculateDashes = calculateDashes;
        }
    });
});
