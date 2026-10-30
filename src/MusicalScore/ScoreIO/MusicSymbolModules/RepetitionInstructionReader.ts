import {MusicSheet} from "../../MusicSheet";
import {IXmlElement} from "../../../Common/FileIO/Xml";
import {SourceMeasure} from "../../VoiceData/SourceMeasure";
import {RepetitionInstruction, RepetitionInstructionEnum, AlignmentType, RepetitionSymbolPlacement} from "../../VoiceData/Instructions/RepetitionInstruction";
import {RepetitionInstructionComparer} from "../../VoiceData/Instructions/RepetitionInstruction";
import {StringUtil} from "../../../Common/Strings/StringUtil";
import {Instrument} from "../../Instrument";
export class RepetitionInstructionReader {
  /**
   * A global list of all repetition instructions in the musicsheet.
   */
  public repetitionInstructions: RepetitionInstruction[];
  public xmlMeasureList: IXmlElement[][];
  private musicSheet: MusicSheet;
  private currentMeasureIndex: number;
  /** The words read for each D.C. or D.S. instruction, and whether a <sound> decided its kind (see keepOneJumpOfWords()). */
  private jumpWords: Map<RepetitionInstruction, { text: string, fromSound: boolean }> = new Map();

  public set MusicSheet(value: MusicSheet) {
    this.musicSheet = value;
    this.xmlMeasureList = new Array(this.musicSheet.Instruments.length);
    this.repetitionInstructions = [];
    this.jumpWords = new Map();
  }

  /**
   * is called when starting reading an xml measure
   * @param measure
   * @param currentMeasureIndex
   */
  public prepareReadingMeasure(measure: SourceMeasure, currentMeasureIndex: number): void {
    this.currentMeasureIndex = currentMeasureIndex;
  }

  public handleLineRepetitionInstructions(barlineNode: IXmlElement): boolean {
    let pieceEndingDetected: boolean = false;
    if (barlineNode.elements().length > 0) {
      let location: string = "";
      let hasRepeat: boolean = false;
      let direction: string = "";
      let times: number = undefined;
      let type: string = "";
      let style: string = "";
      const endingIndices: number[] = [];

      // read barline style
      const styleNode: IXmlElement = barlineNode.element("bar-style");

      // if location is ommited in Xml, right is implied (from documentation)
      if (styleNode) {
        style = styleNode.value;
      }
      if (barlineNode.attributes().length > 0 && barlineNode.attribute("location")) {
        location = barlineNode.attribute("location").value;
      } else {
        location = "right";
      }
      const barlineNodeElements: IXmlElement[] = barlineNode.elements();

      // read repeat- or ending line information
      for (let idx: number = 0, len: number = barlineNodeElements.length; idx < len; ++idx) {
        const childNode: IXmlElement = barlineNodeElements[idx];
        if ("repeat" === childNode.name && childNode.hasAttributes) {
          hasRepeat = true;
          direction = childNode.attribute("direction").value;
          // <repeat times>: how many times the repeated section is played. It wins over the default (the lyric verses).
          const timesValue: number = parseInt(childNode.attribute("times")?.value, 10);
          if (timesValue > 0) {
            times = timesValue;
          }
        } else if ( "ending" === childNode.name && childNode.hasAttributes &&
                    childNode.attribute("type") !== undefined && childNode.attribute("number")) {
          if (childNode.attribute("print-object")?.value === "no") {
            continue;
            // Finale only puts print-object="no" at the (duplicated) <ending> node at thestart of measure barline,
            //   making this uneffective. Unclear whether the intention is to render the volta or not. (See #1367)
          }
          type = childNode.attribute("type").value;
          let num: string = childNode.attribute("number").value;
          if (childNode.value) {
            num = childNode.value;
            // MusicXML spec: "The element text is used when the text displayed in the ending is different than what appears in the number attribute."
            //   Finale v27.3 accordingly seems to put the desired printed number here instead of in "number" (#1367)
          }

          // Parse the given ending indices:
          // handle cases like: "1, 2" or "1 + 2" or even "1 - 3, 6"
          const separatedEndingIndices: string[] = num.split("[,+]");
          for (let idx2: number = 0, len2: number = separatedEndingIndices.length; idx2 < len2; ++idx2) {
            const separatedEndingIndex: string = separatedEndingIndices[idx2];
            const indices: string[] = separatedEndingIndex.match("[0-9]");

            // check if possibly something like "1-3" is given..
            if (separatedEndingIndex.search("-") !== -1 && indices.length === 2) {
              const startIndex: number = parseInt(indices[0], 10);
              const endIndex: number = parseInt(indices[1], 10);
              for (let index: number = startIndex; index <= endIndex; index++) {
                endingIndices.push(index);
              }
            } else {
              for (let idx3: number = 0, len3: number = indices.length; idx3 < len3; ++idx3) {
                const index: string = indices[idx3];
                endingIndices.push(parseInt(index, 10));
              }
            }
          }
        }
      }

      // reset measure counter if not lastMeasure
      if (style === "light-heavy" && endingIndices.length === 0 && !hasRepeat) {
        pieceEndingDetected = true;
      }
      if (hasRepeat || endingIndices.length > 0) {
        if (location === "left") {
          if (type === "start") {
            const newInstruction: RepetitionInstruction = new RepetitionInstruction(this.currentMeasureIndex, RepetitionInstructionEnum.Ending,
                                                                                    AlignmentType.Begin, undefined, endingIndices);
            this.addInstruction(this.repetitionInstructions, newInstruction);
          }
          if (direction === "forward") {
            // start new Repetition
            const newInstruction: RepetitionInstruction = new RepetitionInstruction(this.currentMeasureIndex, RepetitionInstructionEnum.StartLine);
            this.addInstruction(this.repetitionInstructions, newInstruction);
          }
        } else { // location right
          if (type === "stop") {
            const newInstruction: RepetitionInstruction = new RepetitionInstruction(this.currentMeasureIndex, RepetitionInstructionEnum.Ending,
                                                                                    AlignmentType.End, undefined, endingIndices);
            this.addInstruction(this.repetitionInstructions, newInstruction);
          } else if (type === "discontinue") {
            const newInstruction: RepetitionInstruction = new RepetitionInstruction(
              this.currentMeasureIndex, RepetitionInstructionEnum.Ending,
              AlignmentType.Discontinue, undefined, endingIndices);
            this.addInstruction(this.repetitionInstructions, newInstruction);
          }
          if (direction === "backward") {
            const newInstruction: RepetitionInstruction = new RepetitionInstruction(this.currentMeasureIndex, RepetitionInstructionEnum.BackJumpLine);
            newInstruction.Times = times;
            this.addInstruction(this.repetitionInstructions, newInstruction);
          }
        }
      }
    }
    return pieceEndingDetected;
  }

  /**
   * Reads a repetition instruction (e.g. D.S., Fine, a segno sign) from a direction.
   * @param directionTypeNode the direction-type element (words, segno or coda)
   * @param relativeMeasurePosition the position of the direction in the measure: a jump at 0 may be taken at the barline
   *   before, see soundTypeOfJump()
   * @param soundNode the direction's sound element, if any. Its dacapo, dalsegno, fine, tocoda, segno and coda attributes
   *   say which instruction the direction is, before its words (MusicXML: the sound is the playback, the words what is
   *   printed): words that name another instruction or none, e.g. "D.C." with <sound dalsegno> (Arban, Fantaisie
   *   brillante: "D.C." goes back to the segno of the variation), "Fin" or "D.C. senza replica", are that instruction,
   *   drawn as written. Words of the same kind keep their detail, e.g. "D.S. al Coda" with <sound dalsegno>.
   *   <sound segno="..."> marks a segno as the target of a D.S., and its segno and dalsegno values name the segno
   *   a D.S. goes back to (RepetitionInstruction.SegnoLabel).
   * @param symbolPlacement the staff and the timestamp in the measure of the direction, where a segno sign is drawn
   * @param hasCodaSign whether the direction also has a coda sign (<coda>): a coda read from its words is then drawn as the sign
   * @returns true if the direction is a repetition instruction, false if it is drawn as text
   */
  public handleRepetitionInstructionsFromWordsOrSymbols(directionTypeNode: IXmlElement, relativeMeasurePosition: number,
                                                        soundNode?: IXmlElement, symbolPlacement?: RepetitionSymbolPlacement,
                                                        hasCodaSign: boolean = false): boolean {
    const wordsNode: IXmlElement = directionTypeNode.element("words");
    const measureIndex: number = this.currentMeasureIndex;
    if (wordsNode) {
      // An exporter may split the words where their formatting changes.
      const words: string = directionTypeNode.elements("words").map((node: IXmlElement): string => node.value).join("").trim();
      // Measure positions aren't adjusted by the relative position in the measure (relativeMeasurePosition):
      //   the instruction belongs to the measure it's written in (see test_staverepetitions_coda_etc_positioning.musicxml).
      let wordsType: RepetitionInstructionEnum = RepetitionInstructionReader.repetitionInstructionFromWords(words.toLowerCase());
      if (wordsType === undefined) {
        // A D.C. or D.S. after a capitalized word, usually the section to play again, e.g. "Menuetto D.C." after a trio
        const named: RegExpMatchArray = words.match(/^[A-Z][a-zA-Z]*\s+(.+)$/);
        const namedType: RepetitionInstructionEnum = named ? RepetitionInstructionReader.repetitionInstructionFromWords(named[1].toLowerCase()) : undefined;
        wordsType = RepetitionInstructionReader.isJumpFromWords(namedType) ? namedType : undefined;
      }
      const soundType: RepetitionInstructionEnum = RepetitionInstructionReader.repetitionInstructionFromSound(soundNode);
      let type: RepetitionInstructionEnum = wordsType;
      // the words drawn instead of the instruction's label, if they say more than it or say it in another language
      let drawnWords: string = undefined;
      if (wordsType !== undefined && wordsType !== RepetitionInstructionReader.repetitionInstructionFromWords(words.toLowerCase())) {
        drawnWords = words.replace(/\s+/g, " "); // e.g. "Menuetto D.C.": drawn as written
      }
      if (soundType !== undefined &&
          (wordsType === undefined || RepetitionInstructionReader.kind(wordsType) !== RepetitionInstructionReader.kind(soundType))) {
        // Words that don't name an instruction, e.g. in a language other than Italian or English, or with more words, e.g.
        //   "D.C. senza replica", or that name another one than the sound: the sound says which instruction they are.
        type = RepetitionInstructionReader.withEndingOf(soundType, wordsType);
        // (a segno or coda sign is drawn as the sign)
        if (words.length > 0 && type !== RepetitionInstructionEnum.Segno && type !== RepetitionInstructionEnum.Coda) {
          drawnWords = words.replace(/\s+/g, " "); // drawn in one line
        }
      }
      if (type === undefined) {
        // a general text -> render as text (e.g. UnknownExpression)
        return false;
      }
      if (type === RepetitionInstructionEnum.Coda && !hasCodaSign && words.length > 0) {
        // a coda written only as words, e.g. the section heading "CODA." (Schumann, Romance Op. 94 III m69): drawn as written,
        //   without a coda sign that the score doesn't have. It still is the coda of a D.C. or D.S. al Coda.
        drawnWords = words.replace(/\s+/g, " ");
      }
      const jumpSoundType: RepetitionInstructionEnum = RepetitionInstructionReader.soundTypeOfJump(type);
      const atBarlineBefore: boolean = relativeMeasurePosition === 0 && measureIndex > 0 && jumpSoundType !== undefined &&
        this.isStatedAtMeasureStart(jumpSoundType);
      const newInstruction: RepetitionInstruction = new RepetitionInstruction(atBarlineBefore ? measureIndex - 1 : measureIndex, type);
      newInstruction.Words = drawnWords;
      if (symbolPlacement && type !== RepetitionInstructionEnum.Segno && !atBarlineBefore) {
        // the words are drawn at the staff of their direction, below it if placed below (Schirmer, Twenty-Four Italian Songs and
        //   Arias, Pur dicesti m111: "D.S. al Fine" below the left hand). (A segno from words stays drawn at the start of the measure.)
        //   Not a jump taken at the barline before: it belongs to the measure before, where the placement's time doesn't apply.
        newInstruction.SymbolPlacements.push(symbolPlacement);
      }
      newInstruction.MarkedAsTarget = type === RepetitionInstructionEnum.Segno && !!soundNode?.attribute("segno");
      newInstruction.SegnoLabel = RepetitionInstructionReader.segnoLabel(type, soundNode);
      if (!this.keepOneJumpOfWords(newInstruction, words, soundType !== undefined)) {
        return true;
      }
      this.addInstruction(this.repetitionInstructions, newInstruction, atBarlineBefore);
      return true;
    } else if (directionTypeNode.element("segno")) {
      // if (relativeMeasurePosition > 0.5) {
      //   measureIndex++;
      // }
      const newInstruction: RepetitionInstruction = new RepetitionInstruction(measureIndex, RepetitionInstructionEnum.Segno);
      newInstruction.MarkedAsTarget = !!soundNode?.attribute("segno");
      newInstruction.SegnoLabel = RepetitionInstructionReader.segnoLabel(RepetitionInstructionEnum.Segno, soundNode);
      if (symbolPlacement) {
        newInstruction.SymbolPlacements.push(symbolPlacement);
      }
      this.addInstruction(this.repetitionInstructions, newInstruction);
      return true;
    } else if (directionTypeNode.element("coda")) {
      // if (relativeMeasurePosition > 0.5) {
      //   measureIndex++;
      // }
      const newInstruction: RepetitionInstruction = new RepetitionInstruction(measureIndex, RepetitionInstructionEnum.Coda);
      this.addInstruction(this.repetitionInstructions, newInstruction);
      return true;
    }
    return false;
  }

  /**
   * Reads the repetition instructions of a <sound> of the measure (not of a direction): nothing is printed for them, so
   * they are played, not drawn (RepetitionInstruction.Implicit), e.g. where a To Coda jumps to after the D.S. of a variation
   * (<sound coda>, Arban, Fantaisie brillante). As the D.C. of <sound dacapo="yes"/> can't say whether it is al Fine or
   * al Coda, the RepetitionCalculator plays it as the Fine or To Coda before it says (see typePlayedAs()).
   * @param soundNode the sound element of the measure
   */
  public handleMeasureSoundRepetitionInstructions(soundNode: IXmlElement): void {
    const add: (type: RepetitionInstructionEnum) => void = (type: RepetitionInstructionEnum): void => {
      const instruction: RepetitionInstruction = new RepetitionInstruction(this.currentMeasureIndex, type);
      instruction.Implicit = true;
      instruction.SegnoLabel = RepetitionInstructionReader.segnoLabel(type, soundNode);
      this.addInstruction(this.repetitionInstructions, instruction);
    };
    if (soundNode.attribute("fine")?.value) {
      add(RepetitionInstructionEnum.Fine);
    }
    if (soundNode.attribute("tocoda")?.value) {
      add(RepetitionInstructionEnum.ToCoda);
    }
    if (soundNode.attribute("coda")?.value) {
      add(RepetitionInstructionEnum.Coda);
    }
    if (soundNode.attribute("dalsegno")?.value) {
      add(RepetitionInstructionEnum.DalSegno);
    }
    if (soundNode.attribute("dacapo")?.value === "yes") {
      add(RepetitionInstructionEnum.DaCapo);
    }
  }

  /**
   * The same jump words in the directions of several parts of a measure are one instruction: if only some of them have a
   * <sound> that makes them another kind of jump (e.g. "Menuetto D.C." with <sound dalsegno> in the first part, without a
   * sound in another), the one the sound decides is kept. Returns false if the new instruction is not to be added.
   * (The words read for each jump instruction of the piece are kept in jumpWords.)
   */
  private keepOneJumpOfWords(instruction: RepetitionInstruction, words: string, fromSound: boolean): boolean {
    const kind: string = RepetitionInstructionReader.kind(instruction.type);
    if (kind !== "D.C." && kind !== "D.S.") {
      return true;
    }
    const text: string = words.replace(/\s+/g, " ").toLowerCase();
    for (const [other, read] of this.jumpWords) {
      if (!this.repetitionInstructions.some(listed => listed === other || listed.equals(other))) {
        this.jumpWords.delete(other); // (no longer read)
        continue;
      }
      if (other.measureIndex !== instruction.measureIndex || read.text !== text ||
          RepetitionInstructionReader.kind(other.type) === kind || read.fromSound === fromSound) {
        continue;
      }
      if (read.fromSound) {
        return false; // another part's sound decided these words
      }
      const index: number = this.repetitionInstructions.indexOf(other);
      if (index >= 0) {
        this.repetitionInstructions.splice(index, 1);
      }
      this.jumpWords.delete(other);
      break;
    }
    this.jumpWords.set(instruction, { text: text, fromSound: fromSound });
    return true;
  }

  /** D.C. and D.S. with or without al Fine / al Coda are one kind each; the other instructions are their own kind. */
  private static kind(type: RepetitionInstructionEnum): string {
    switch (type) {
      case RepetitionInstructionEnum.DaCapo:
      case RepetitionInstructionEnum.DaCapoAlFine:
      case RepetitionInstructionEnum.DaCapoAlCoda:
        return "D.C.";
      case RepetitionInstructionEnum.DalSegno:
      case RepetitionInstructionEnum.DalSegnoAlFine:
      case RepetitionInstructionEnum.DalSegnoAlCoda:
        return "D.S.";
      default:
        return `${type}`;
    }
  }

  /** The D.C. or D.S. of a <sound> with the al Fine / al Coda of the words, e.g. "D.C. al Fine" with <sound dalsegno> is a D.S. al Fine. */
  private static withEndingOf(soundType: RepetitionInstructionEnum, wordsType: RepetitionInstructionEnum): RepetitionInstructionEnum {
    const alFine: boolean = wordsType === RepetitionInstructionEnum.DaCapoAlFine || wordsType === RepetitionInstructionEnum.DalSegnoAlFine;
    const alCoda: boolean = wordsType === RepetitionInstructionEnum.DaCapoAlCoda || wordsType === RepetitionInstructionEnum.DalSegnoAlCoda;
    switch (soundType) {
      case RepetitionInstructionEnum.DaCapo:
        return alFine ? RepetitionInstructionEnum.DaCapoAlFine : alCoda ? RepetitionInstructionEnum.DaCapoAlCoda : soundType;
      case RepetitionInstructionEnum.DalSegno:
        return alFine ? RepetitionInstructionEnum.DalSegnoAlFine : alCoda ? RepetitionInstructionEnum.DalSegnoAlCoda : soundType;
      default:
        return soundType;
    }
  }

  /** The name of a segno (<sound segno>), or of the segno a D.S. goes back to (<sound dalsegno>), see RepetitionInstruction.SegnoLabel. */
  private static segnoLabel(type: RepetitionInstructionEnum, soundNode: IXmlElement): string {
    const kind: string = RepetitionInstructionReader.kind(type);
    const value: string = kind === "D.S." ? soundNode?.attribute("dalsegno")?.value :
      type === RepetitionInstructionEnum.Segno ? soundNode?.attribute("segno")?.value : undefined;
    return value?.trim() ? value.trim() : undefined;
  }

  /**
   * Returns the repetition instruction that the words are, or undefined if they are a general text,
   * which may mention an instruction, e.g. "voice tacet on D.S." (see #1687).
   * @param text the words, trimmed and in lower case
   */
  private static repetitionInstructionFromWords(text: string): RepetitionInstructionEnum {
    // regex strings: inputs for new RegExp(). The string escaping eliminates the first backslash of each \\.
    const dalSegno: string = "(d\\s?\\.\\s?s\\.|dal\\s?segno)"; // "d.s.", also with spaces, e.g. "d. s."
    const daCapo: string = "(d\\s?\\.\\s?c\\.|da\\s?capo)"; // "d.c.", also with spaces
    const al: string = "\\s?al\\s?"; // also without a space, e.g. "D.C.al Fine"
    const instructions: [string, RepetitionInstructionEnum][] = [
      [dalSegno + al + "fine", RepetitionInstructionEnum.DalSegnoAlFine],
      [dalSegno + al + "coda", RepetitionInstructionEnum.DalSegnoAlCoda],
      [dalSegno, RepetitionInstructionEnum.DalSegno],
      [daCapo + al + "fine", RepetitionInstructionEnum.DaCapoAlFine],
      [daCapo + al + "coda", RepetitionInstructionEnum.DaCapoAlCoda],
      [daCapo, RepetitionInstructionEnum.DaCapo],
      ["to\\s?coda|a (la )?coda", RepetitionInstructionEnum.ToCoda],
      ["fine", RepetitionInstructionEnum.Fine],
      ["coda", RepetitionInstructionEnum.Coda],
      ["segno", RepetitionInstructionEnum.Segno],
    ];
    for (const [regEx, type] of instructions) {
      if (StringUtil.StringIsWord(text, regEx, true)) {
        return type;
      }
    }
    return undefined;
  }

  /**
   * Returns the repetition instruction that the sound element's attributes mark, whatever the language of the words,
   * or undefined if they mark none.
   * @param soundNode the direction's sound element, if any
   */
  private static repetitionInstructionFromSound(soundNode: IXmlElement): RepetitionInstructionEnum {
    const instructions: [string, RepetitionInstructionEnum][] = [
      ["dacapo", RepetitionInstructionEnum.DaCapo],
      ["dalsegno", RepetitionInstructionEnum.DalSegno],
      ["tocoda", RepetitionInstructionEnum.ToCoda],
      ["fine", RepetitionInstructionEnum.Fine],
      ["segno", RepetitionInstructionEnum.Segno],
      ["coda", RepetitionInstructionEnum.Coda],
    ];
    for (const [attributeName, type] of instructions) {
      const value: string = soundNode?.attribute(attributeName)?.value;
      if (attributeName === "dacapo" ? value === "yes" : !!value) {
        return type;
      }
    }
    return undefined;
  }

  /**
   * Returns the instruction a sound element states for the jump (see repetitionInstructionFromSound), e.g. a D.S. for a
   * D.S. al Coda, or undefined if the instruction isn't a jump: a segno or coda sign marks where the music lands.
   */
  private static soundTypeOfJump(type: RepetitionInstructionEnum): RepetitionInstructionEnum {
    switch (type) {
      case RepetitionInstructionEnum.DaCapo:
      case RepetitionInstructionEnum.DaCapoAlFine:
      case RepetitionInstructionEnum.DaCapoAlCoda:
        return RepetitionInstructionEnum.DaCapo;
      case RepetitionInstructionEnum.DalSegno:
      case RepetitionInstructionEnum.DalSegnoAlFine:
      case RepetitionInstructionEnum.DalSegnoAlCoda:
        return RepetitionInstructionEnum.DalSegno;
      case RepetitionInstructionEnum.ToCoda:
      case RepetitionInstructionEnum.Fine:
        return type;
      default:
        return undefined;
    }
  }

  /** Whether a sound element at the start of the current measure (before its first note or forward), in any part,
   *  states the instruction (see repetitionInstructionFromSound). */
  private isStatedAtMeasureStart(type: RepetitionInstructionEnum): boolean {
    for (const partMeasures of this.xmlMeasureList) {
      for (const node of partMeasures?.[this.currentMeasureIndex]?.elements() ?? []) {
        if (node.name === "note" || node.name === "forward") {
          break;
        }
        const sounds: IXmlElement[] = node.name === "direction" ? node.elements("sound") : node.name === "sound" ? [node] : [];
        const directionOffset: IXmlElement = node.name === "direction" ? node.element("offset") : undefined;
        if (sounds.some((sound: IXmlElement): boolean => {
          // A sound's offset overrides a playback direction offset; a visual-only offset does not move the sound.
          const offset: IXmlElement = sound.element("offset") ??
            (directionOffset?.attribute("sound")?.value === "yes" ? directionOffset : undefined);
          return (offset === undefined || Number(offset.value) === 0) &&
            RepetitionInstructionReader.repetitionInstructionFromSound(sound) === type;
        })) {
          return true;
        }
      }
    }
    return false;
  }

  /** Whether the instruction type is a D.C. or D.S. (with or without al Fine / al Coda). */
  private static isJumpFromWords(type: RepetitionInstructionEnum): boolean {
    switch (type) {
      case RepetitionInstructionEnum.DaCapo:
      case RepetitionInstructionEnum.DaCapoAlFine:
      case RepetitionInstructionEnum.DaCapoAlCoda:
      case RepetitionInstructionEnum.DalSegno:
      case RepetitionInstructionEnum.DalSegnoAlFine:
      case RepetitionInstructionEnum.DalSegnoAlCoda:
        return true;
      default:
        return false;
    }
  }

  /**
   * The backward repeat a segno after another one is the renvoi of: written at the end of a measure that ends with
   * that repeat (Couperin, Concerts royaux I Gigue m31, below the first ending, sending back to the segno of the
   * Reprise). It is not a D.S. at the end of the measure before (that broke the repeat); the sign is drawn at its place.
   */
  private repeatOfRenvoi(segno: RepetitionInstruction): RepetitionInstruction {
    const measure: SourceMeasure = this.musicSheet.SourceMeasures[segno.measureIndex];
    if (!measure || segno.SymbolPlacements.length === 0 ||
        !segno.SymbolPlacements.every(placement => placement.timestamp.gte(measure.Duration))) {
      return undefined;
    }
    return this.repetitionInstructions.find(other =>
      other.measureIndex === segno.measureIndex && other.type === RepetitionInstructionEnum.BackJumpLine);
  }

  public removeRedundantInstructions(): void {
    let segnoCount: number = 0;
    let codaCount: number = 0;
    //const fineCount: number = 0;
    let toCodaCount: number = 0;
    let dalSegnaCount: number = 0;
    const signsOfJumps: Set<RepetitionInstruction> = new Set<RepetitionInstruction>();
    for (let index: number = 0; index < this.repetitionInstructions.length; index++) {
      const instruction: RepetitionInstruction = this.repetitionInstructions[index];
      switch (instruction.type) {
        case RepetitionInstructionEnum.Coda:
          if (toCodaCount > 0) {
            if (this.findInstructionInPreviousMeasure(index, instruction.measureIndex, RepetitionInstructionEnum.ToCoda)) {
              instruction.type = RepetitionInstructionEnum.None;
            }
          }
          // TODO this prevents a piece consisting of a single coda sign showing coda (will show To Coda)
          // if (codaCount === 0 && toCodaCount === 0) {
          //   instruction.type = RepetitionInstructionEnum.ToCoda;
          //   instruction.alignment = AlignmentType.End;
          //   instruction.measureIndex--;
          // }
          break;
        case RepetitionInstructionEnum.Segno:
          if (RepetitionInstruction.IsSignOfJump(instruction, this.repetitionInstructions, this.musicSheet.SourceMeasures[instruction.measureIndex])) {
            // the sign printed with a D.S. (<direction> with "D.S. al Fine" and <segno/>): drawn, neither a segno of its own nor a D.S.
            signsOfJumps.add(instruction);
            break;
          }
          // Two segnos in a row: the second one is taken for a D.S. back to the first (e.g. a renvoi sign),
          //   unless the MusicXML marks it as a D.S. target itself (a segno that a later D.S. jumps to).
          const repeatOfRenvoi: RepetitionInstruction =
            segnoCount - dalSegnaCount > 0 && !instruction.MarkedAsTarget ? this.repeatOfRenvoi(instruction) : undefined;
          if (repeatOfRenvoi) {
            // the backward repeat of its measure plays the return; the sign is drawn with the repeat, where the
            //   MusicXML puts it. (A segno left in the measure made the playback take the first ending again.)
            repeatOfRenvoi.SymbolPlacements.push(...instruction.SymbolPlacements);
            instruction.type = RepetitionInstructionEnum.None;
            break;
          }
          if (segnoCount - dalSegnaCount > 0 && !instruction.MarkedAsTarget) {
            let foundInstruction: boolean = false;
            for (let idx: number = 0, len: number = this.repetitionInstructions.length; idx < len; ++idx) {
              const instr: RepetitionInstruction = this.repetitionInstructions[idx];
              if (instruction.measureIndex - instr.measureIndex === 1) {
                switch (instr.type) {
                  case RepetitionInstructionEnum.BackJumpLine:
                    if (toCodaCount - codaCount > 0) { // open toCoda existing
                      instr.type = RepetitionInstructionEnum.DalSegnoAlCoda;
                    } else {
                      instr.type = RepetitionInstructionEnum.DalSegno;
                    }
                    instruction.type = RepetitionInstructionEnum.None;
                    foundInstruction = true;
                    break;
                  case RepetitionInstructionEnum.DalSegno:
                  case RepetitionInstructionEnum.DalSegnoAlFine:
                  case RepetitionInstructionEnum.DalSegnoAlCoda:
                    instruction.type = RepetitionInstructionEnum.None;
                    foundInstruction = true;
                    break;
                  default:
                    break;
                }
              }
              if (foundInstruction) {
                break;
              }
            }
            if (foundInstruction) {
              break;
            }
            // convert to dal segno instruction:
            if (toCodaCount - codaCount > 0) { // open toCoda existing
              instruction.type = RepetitionInstructionEnum.DalSegnoAlCoda;
            } else {
              instruction.type = RepetitionInstructionEnum.DalSegno;
            }
            instruction.alignment = AlignmentType.End;
            instruction.measureIndex--;
          }
          break;
        default:
          break;
      }

      // check if this  instruction already exists or is otherwise redundant:
      if (this.backwardSearchForPreviousIdenticalInstruction(index, instruction) || instruction.type === RepetitionInstructionEnum.None) {
        this.repetitionInstructions.splice(index, 1);
        index--;
      } else {
        switch (instruction.type) {
          case RepetitionInstructionEnum.Fine:
            //fineCount++;
            break;
          case RepetitionInstructionEnum.ToCoda:
            toCodaCount++;
            break;
          case RepetitionInstructionEnum.Coda:
            codaCount++;
            break;
          case RepetitionInstructionEnum.Segno:
            if (!signsOfJumps.has(instruction)) {
              segnoCount++;
            }
            break;
          case RepetitionInstructionEnum.DalSegno: // it uses the segno before it, so a segno after it is a new one
          case RepetitionInstructionEnum.DalSegnoAlFine:
          case RepetitionInstructionEnum.DalSegnoAlCoda:
            dalSegnaCount++;
            break;
          default:
            break;
        }
      }
    }
    this.repetitionInstructions.sort(RepetitionInstructionComparer.Compare);
  }

  private findInstructionInPreviousMeasure(currentInstructionIndex: number, currentMeasureIndex: number, searchedType: RepetitionInstructionEnum): boolean {
    for (let index: number = currentInstructionIndex - 1; index >= 0; index--) {
      const instruction: RepetitionInstruction = this.repetitionInstructions[index];
      if (currentMeasureIndex - instruction.measureIndex === 1 && instruction.type === searchedType) {
        return true;
      }
    }
    return false;
  }

  private backwardSearchForPreviousIdenticalInstruction(currentInstructionIndex: number, currentInstruction: RepetitionInstruction): boolean {
    for (let index: number = currentInstructionIndex - 1; index >= 0; index--) {
      const instruction: RepetitionInstruction = this.repetitionInstructions[index];
      if (instruction.equals(currentInstruction)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Adds the instruction unless the list has it already.
   * @param atBarlineBefore whether it's a jump read at the start of its measure but taken at the barline before (#1766).
   *   It goes where words at the end of the measure before would be read, so that the repetition calculator, which handles
   *   the list in order, treats both the same: before the instructions read since, those of the barline before (a backward
   *   repeat, an ending's end) and those of its own measure (e.g. an ending's start).
   */
  private addInstruction(currentRepetitionInstructions: RepetitionInstruction[], newInstruction: RepetitionInstruction,
                         atBarlineBefore: boolean = false): void {
    let addInstruction: boolean = true;
    for (let idx: number = 0, len: number = currentRepetitionInstructions.length; idx < len; ++idx) {
      const repetitionInstruction: RepetitionInstruction = currentRepetitionInstructions[idx];
      if (newInstruction.equals(repetitionInstruction)) {
        addInstruction = false;
        if (repetitionInstruction.Implicit && !newInstruction.Implicit && repetitionInstruction.SymbolPlacements.length === 0) {
          // (a <sound> of the measure has no place: the words are drawn where their direction is)
          repetitionInstruction.SymbolPlacements.push(...newInstruction.SymbolPlacements);
        }
        this.addSymbolPlacements(repetitionInstruction, newInstruction);
        repetitionInstruction.SegnoLabel = repetitionInstruction.SegnoLabel ?? newInstruction.SegnoLabel;
        if (repetitionInstruction.Implicit && !newInstruction.Implicit) {
          // printed after all (e.g. a <sound> of the measure before the direction with the words): drawn as the direction says
          repetitionInstruction.Implicit = false;
          repetitionInstruction.Words = newInstruction.Words;
        } else if (newInstruction.Implicit) {
          // (a <sound> of the measure prints nothing: keeps the words)
        } else if (repetitionInstruction.type === RepetitionInstructionEnum.Coda && newInstruction.Words === undefined) {
          repetitionInstruction.Words = undefined; // a coda sign in the measure, e.g. next to the words "Coda": drawn as the sign
        }
        if (!(repetitionInstruction.Times > 0) && newInstruction.Times > 0) {
          repetitionInstruction.Times = newInstruction.Times; // e.g. only a later part writes the repeat's times
        }
        break;
      }
    }
    if (addInstruction) {
      let index: number = currentRepetitionInstructions.length;
      // Parts are read in turn, so ordinary instructions can follow another part's right barline.
      for (let idx: number = 0, len: number = currentRepetitionInstructions.length; atBarlineBefore && idx < len; ++idx) {
        if (RepetitionInstructionReader.isAfterWordsAtMeasureEnd(currentRepetitionInstructions[idx], newInstruction.measureIndex)) {
          index = idx;
          break;
        }
      }
      currentRepetitionInstructions.splice(index, 0, newInstruction);
    }
  }

  /**
   * Adds the sign placements of a second direction of the same instruction in the measure (e.g. a segno above each hand)
   * to the instruction. Only the ones of the same part: a segno that each part of a score repeats is drawn once, above the top part.
   */
  private addSymbolPlacements(instruction: RepetitionInstruction, sameInstruction: RepetitionInstruction): void {
    if (instruction.SymbolPlacements.length === 0) {
      return; // e.g. a segno from words: drawn at the start of the measure
    }
    const part: Instrument = instruction.SymbolPlacements[0].staff.ParentInstrument;
    for (const placement of sameInstruction.SymbolPlacements) {
      if (placement.staff.ParentInstrument !== part) {
        continue;
      }
      if (!instruction.SymbolPlacements.some(other => other.staff === placement.staff && other.timestamp.Equals(placement.timestamp))) {
        instruction.SymbolPlacements.push(placement);
      }
    }
  }

  /** Whether the instruction is read after words at the end of the measure: at the measure's right barline or later. */
  private static isAfterWordsAtMeasureEnd(instruction: RepetitionInstruction, measureIndex: number): boolean {
    return instruction.measureIndex > measureIndex ||
      instruction.measureIndex === measureIndex && (instruction.type === RepetitionInstructionEnum.BackJumpLine ||
        instruction.type === RepetitionInstructionEnum.Ending && instruction.alignment !== AlignmentType.Begin);
  }
}
