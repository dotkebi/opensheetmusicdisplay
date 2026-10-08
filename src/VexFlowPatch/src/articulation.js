// [VexFlow](http://vexflow.com) - Copyright (c) Mohit Muthanna 2010.
// Author: Larry Kuhns.
//
// ## Description
//
// This file implements articulations and accents as modifiers that can be
// attached to notes. The complete list of articulations is available in
// `tables.js` under `Vex.Flow.articulationCodes`.
//
// See `tests/articulation_tests.js` for usage examples.

import { Vex } from './vex';
import { Flow } from './tables';
import { Modifier } from './modifier';
import { Glyph } from './glyph';
import { Stem } from './stem';
import { TickContext } from './tickcontext';

// To enable logging for this class. Set `Vex.Flow.Articulation.DEBUG` to `true`.
function L(...args) { if (Articulation.DEBUG) Vex.L('Vex.Flow.Articulation', args); }

// VexFlowPatch: the tick breath mark (<breath-mark>tick, 'abrv'), which VexFlow's font doesn't have: a check mark drawn
//   from this outline (OSMD's own, not a font's), the size and baseline of the SMuFL breathMarkTick the app draws (about
//   1.5 by 1.5 staff spaces at font_scale 38, its bottom on the baseline): a short left arm down to the point and a long
//   thin right arm up. Font units as VexFlow's font (resolution 1000, y up).
const OSMD_BREATH_TICK = 'osmdBreathMarkTick';
const OSMD_BREATH_TICK_FONT = {
  resolution: 1000,
  glyphs: {
    [OSMD_BREATH_TICK]: {
      x_min: 0, x_max: 540, ha: 540,
      o: 'm 0 300 l 45 335 l 170 95 l 505 540 l 540 520 l 185 0 l 150 0 l 0 300',
    },
  },
};

const { ABOVE, BELOW } = Modifier.Position;

const roundToNearestHalf = (mathFn, value) => mathFn(value / 0.5) * 0.5;

// This includes both staff and ledger lines
const isWithinLines = (line, position) => position === ABOVE ? line <= 5 : line >= 1;

const getRoundingFunction = (line, position) => {
  if (isWithinLines(line, position)) {
    if (position === ABOVE) {
      return Math.ceil;
    } else {
      return Math.floor;
    }
  } else {
    return Math.round;
  }
};

const snapLineToStaff = (canSitBetweenLines, line, position, offsetDirection) => {
  // Initially, snap to nearest staff line or space
  const snappedLine = roundToNearestHalf(getRoundingFunction(line, position), line);
  const canSnapToStaffSpace = canSitBetweenLines && isWithinLines(snappedLine, position);
  const onStaffLine = snappedLine % 1 === 0;

  if (canSnapToStaffSpace && onStaffLine) {
    const HALF_STAFF_SPACE = 0.5;
    return snappedLine + (HALF_STAFF_SPACE * -offsetDirection);
  } else {
    return snappedLine;
  }
};

const isStaveNote = (note) => {
  const noteCategory = note.getCategory();
  return noteCategory === 'stavenotes' || noteCategory === 'gracenotes';
};

const getTopY = (note, textLine) => {
  const stave = note.getStave();
  const stemDirection = note.getStemDirection();
  const { topY: stemTipY, baseY: stemBaseY } = note.getStemExtents();

  if (isStaveNote(note)) {
    if (note.hasStem()) {
      if (stemDirection === Stem.UP) {
        return stemTipY;
      } else {
        return stemBaseY;
      }
    } else {
      return Math.min(...note.getYs());
    }
  } else if (note.getCategory() === 'tabnotes') {
    if (note.hasStem()) {
      if (stemDirection === Stem.UP) {
        return stemTipY;
      } else {
        return stave.getYForTopText(textLine);
      }
    } else {
      return stave.getYForTopText(textLine);
    }
  } else {
    throw new Vex.RERR(
      'UnknownCategory', 'Only can get the top and bottom ys of stavenotes and tabnotes'
    );
  }
};

const getBottomY = (note, textLine) => {
  const stave = note.getStave();
  const stemDirection = note.getStemDirection();
  const { topY: stemTipY, baseY: stemBaseY } = note.getStemExtents();

  if (isStaveNote(note)) {
    if (note.hasStem()) {
      if (stemDirection === Stem.UP) {
        return stemBaseY;
      } else {
        return stemTipY;
      }
    } else {
      return Math.max(...note.getYs());
    }
  } else if (note.getCategory() === 'tabnotes') {
    if (note.hasStem()) {
      if (stemDirection === Stem.UP) {
        return stave.getYForBottomText(textLine);
      } else {
        return stemTipY;
      }
    } else {
      return stave.getYForBottomText(textLine);
    }
  } else {
    throw new Vex.RERR(
      'UnknownCategory', 'Only can get the top and bottom ys of stavenotes and tabnotes'
    );
  }
};

// Gets the initial offset of the articulation from the y value of the starting position.
// This is required because the top/bottom text positions already have spacing applied to
// provide a "visually pleasent" default position. However the y values provided from
// the stavenote's top/bottom do *not* have any pre-applied spacing. This function
// normalizes this asymmetry.
const getInitialOffset = (note, position) => {
  const isOnStemTip = (
    (position === ABOVE && note.getStemDirection() === Stem.UP) ||
    (position === BELOW && note.getStemDirection() === Stem.DOWN)
  );

  if (isStaveNote(note)) {
    if (note.hasStem() && isOnStemTip) {
      return 0.5;
    } else {
      // this amount is larger than the stem-tip offset because we start from
      // the center of the notehead
      return 1;
    }
  } else {
    if (note.hasStem() && isOnStemTip) {
      return 1;
    } else {
      return 0;
    }
  }
};

export class Articulation extends Modifier {
  static get CATEGORY() { return 'articulations'; }
  static get INITIAL_OFFSET() { return -0.5; }

  // FIXME:
  // Most of the complex formatting logic (ie: snapping to space) is
  // actually done in .render(). But that logic belongs in this method.
  //
  // Unfortunately, this isn't possible because, by this point, stem lengths
  // have not yet been finalized. Finalized stem lengths are required to determine the
  // initial position of any stem-side articulation.
  //
  // This indicates that all objects should have their stave set before being
  // formatted. It can't be an optional if you want accurate vertical positioning.
  // Consistently positioned articulations that play nice with other modifiers
  // won't be possible until we stop relying on render-time formatting.
  //
  // Ideally, when this function has completed, the vertical articulation positions
  // should be ready to render without further adjustment. But the current state
  // is far from this ideal.
  static format(articulations, state) {
    if (!articulations || articulations.length === 0) return false;

    const isAbove = artic => artic.getPosition() === ABOVE;
    const isBelow = artic => artic.getPosition() === BELOW;
    const margin = 0.5;
    const getIncrement = (articulation, line, position) =>
      roundToNearestHalf(
        getRoundingFunction(line, position),
        (articulation.glyph.getMetrics().height / 10) + margin
      );

    articulations
      .filter(isAbove)
      .forEach(articulation => {
        articulation.setTextLine(state.top_text_line);
        state.top_text_line += getIncrement(articulation, state.top_text_line, ABOVE);
      });

    articulations
      .filter(isBelow)
      .forEach(articulation => {
        articulation.setTextLine(state.text_line);
        state.text_line += getIncrement(articulation, state.text_line, BELOW);
      });

    const width = articulations
      .map(articulation => articulation.getWidth())
      .reduce((maxWidth, articWidth) => Math.max(articWidth, maxWidth));

    state.left_shift += width / 2;
    state.right_shift += width / 2;
    return true;
  }

  static easyScoreHook({ articulations }, note, builder) {
    if (!articulations) return;

    const articNameToCode = {
      staccato: 'a.',
      tenuto: 'a-',
    };

    articulations
      .split(',')
      .map(articString => articString.trim().split('.'))
      .map(([name, position]) => {
        const artic = { type: articNameToCode[name] };
        if (position) artic.position = Modifier.PositionString[position];
        return builder.getFactory().Articulation(artic);
      })
      .map(artic => note.addModifier(0, artic));
  }

  // Create a new articulation of type `type`, which is an entry in
  // `Vex.Flow.articulationCodes` in `tables.js`.
  constructor(type) {
    super();
    this.setAttribute('type', 'Articulation');

    this.note = null;
    this.index = null;
    this.type = type;
    this.position = BELOW;
    this.render_options = {
      font_scale: 38,
    };

    //VexFlowPatch
    this.breathMarkDistance = 0.8; // % distance to next note or end of stave (0.8 = 80%)
    // VexFlowPatch: a fermata's raise over a slur above it, or an accent's move beyond a slur on its side, in pixels
    //   (VexFlowMusicSheetCalculator.layoutFermatasOverSlurs())
    this.slurClearanceYShift = 0;
    this.articulation = Flow.articulationCodes(this.type);
    if (this.isBreathMark()) { // breath mark. we could put this in tables.js:articulationCodes()
      // v6c: breathmarkcomma; 'abr|': the upbow breath mark (<breath-mark>upbow), the up-bow glyph v75;
      //   'abrv': the tick breath mark (<breath-mark>tick), OSMD's outline (OSMD_BREATH_TICK_FONT)
      const code = this.type === 'abr|' ? 'v75' : this.type === 'abrv' ? OSMD_BREATH_TICK : 'v6c';
      this.articulation = { code, between_lines: false };
    }
    if (!this.articulation) {
      throw new Vex.RERR('ArgumentError', `Articulation not found: ${this.type}`);
    }

    this.glyph = new Glyph(this.articulation.code, this.render_options.font_scale,
      this.type === 'abrv' ? { font: OSMD_BREATH_TICK_FONT } : undefined);

    // (the tick takes the comma's width in the spacing: it is drawn towards the next note like the comma, and its wider
    //   glyph moved notes onto another system, Leo, Dal tuo soglio luminoso; the app's spacing doesn't change either)
    this.setWidth(this.type === 'abrv' ? new Glyph('v6c', this.render_options.font_scale).getMetrics().width :
      this.glyph.getMetrics().width);
  }

  // VexFlowPatch: breath marks, 'abr' (comma), 'abr|' (upbow) and 'abrv' (tick)
  isBreathMark() { return this.type === 'abr' || this.type === 'abr|' || this.type === 'abrv'; }

  // VexFlowPatch: a fermata or an aspiration on the side of its note where the note has an ornament goes beyond the
  //   ornament (Couperin, Concerts royaux I Menuet en trio m8-9, IV Rigaudon m22, as in the 1722 print), see
  //   VexFlowConverter.stackOutsideOrnament(). It takes no text line (its category isn't formatted by the
  //   ModifierContext): the ornament keeps the place it has alone and draws it over its ink (ornament.js).
  getCategory() { return this.stackedOutsideOrnament ? 'stackedarticulations' : Articulation.CATEGORY; }

  // VexFlowPatch: the ornament on this side of the note that draws this articulation (see stackedOutsideOrnament)
  stackingOrnament() {
    if (!this.stackedOutsideOrnament || !this.note) return undefined;
    return this.note.getModifiers().find(modifier => modifier.getCategory() === 'ornaments' &&
      modifier.getPosition() === this.position && !modifier.delayed);
  }

  // VexFlowPatch: draws the articulation centred at x, its edge towards the ornament at edge; returns its ink
  drawAt(ctx, x, edge) {
    this.setContext(ctx);
    this.setRendered();
    const above = this.position === ABOVE;
    this.glyph.setOrigin(0.5, above ? 1 : 0);
    this.glyph.render(ctx, x, edge);
    const { width, height } = this.glyph.getMetrics();
    this.drawnInk = {
      left: x - width / 2,
      top: above ? edge - height : edge,
      right: x + width / 2,
      bottom: above ? edge : edge + height,
    };
    return this.drawnInk;
  }

  // Render articulation in position next to note.
  draw() {
    const {
      note, index, position, glyph,
      articulation: { between_lines: canSitBetweenLines },
      text_line: textLine,
      context: ctx,
    } = this;

    this.checkContext();

    if (!note || index == null) {
      throw new Vex.RERR('NoAttachedNote', "Can't draw Articulation without a note and index.");
    }
    // VexFlowPatch: drawn by the ornament beyond it (see stackedOutsideOrnament)
    if (this.stackingOrnament()) return;

    this.setRendered();

    const stave = note.getStave();
    const staffSpace = stave.getSpacingBetweenLines();
    const isTab = note.getCategory() === 'tabnotes';

    // Articulations are centered over/under the note head.
    let { x } = note.getModifierStartXY(position, index);
    // VexFlowPatch: breath mark support
    if (this.isBreathMark()) { // breath mark
      let delayXShift = 0;
      // delay code similar to ornament.js delayed variable handling
      const noteTickContext = note.getTickContext();
      const nextContext = TickContext.getNextContext(noteTickContext);
      const noteX = noteTickContext.getX();
      // TODO somehow for some samples there's a NextContext after the last note in the measure, see #1548,
      //   so we ignore it if its x value is smaller (further left).
      if (nextContext && nextContext.x > noteTickContext.x) {
          delayXShift = (nextContext.getX() - noteX) * this.breathMarkDistance;
      } else {
          const stave = note.getStave();
          delayXShift = (stave.getX() + stave.getWidth() - noteX + stave.start_x) * this.breathMarkDistance;
      }
      x += delayXShift;
      if (x > stave.end_x) {
        // fix for going beyond end of measure in certain cases (see #1548)
        //   TODO not sure why the metrics don't result in the correct x position, as we do consider end_x etc
        const noteXAbsolute = stave.start_x + noteX;
        x = noteXAbsolute + (stave.end_x - noteXAbsolute) * this.breathMarkDistance;
      }
    }
    const x_shift = this.getXShift();
    if (x_shift) {
      x += x_shift; // VexFlowPatch: support x_shift for breath_mark
    }
    const shouldSitOutsideStaff = !canSitBetweenLines || isTab;

    const initialOffset = getInitialOffset(note, position);

    let y = {
      [ABOVE]: () => {
        glyph.setOrigin(0.5, 1);
        const y = getTopY(note, textLine) - ((textLine + initialOffset) * staffSpace);
        return shouldSitOutsideStaff
          ? Math.min(stave.getYForTopText(Articulation.INITIAL_OFFSET), y)
          : y;
      },
      [BELOW]: () => {
        glyph.setOrigin(0.5, 0);
        const y = getBottomY(note, textLine) + ((textLine + initialOffset) * staffSpace);
        return shouldSitOutsideStaff
          ? Math.max(stave.getYForBottomText(Articulation.INITIAL_OFFSET), y)
          : y;
      },
    }[position]();
    // VexFlowPatch: respect modifier.y_shift
    if (this.y_shift) {
        y += this.y_shift;
    }
    y += this.slurClearanceYShift;

    let centred = false; // VexFlowPatch: (for drawnInk)
    if (!isTab) {
      const offsetDirection = position === ABOVE ? -1 : +1;
      const noteLine = isTab ? note.positions[index].str : note.getKeyProps()[index].line;
      const distanceFromNote = (note.getYs()[index] - y) / staffSpace;
      const articLine = distanceFromNote + noteLine;
      const snappedLine = snapLineToStaff(canSitBetweenLines, articLine, position, offsetDirection);

      if (isWithinLines(snappedLine, position)) {
        glyph.setOrigin(0.5, 0.5);
        centred = true;
      }

      y += Math.abs(snappedLine - articLine) * staffSpace * offsetDirection;
    }

    L(`Rendering articulation at (x: ${x}, y: ${y})`);

    glyph.render(ctx, x, y);
    // VexFlowPatch: where it was drawn (as drawAt() returns it)
    const { width, height } = glyph.getMetrics();
    const top = centred ? y - height / 2 : position === ABOVE ? y - height : y;
    this.drawnInk = { left: x - width / 2, top, right: x + width / 2, bottom: top + height };
    // VexFlowPatch: a fermata's ink without its raise over a slur, relative to the stave's left and top line (see
    //   VexFlowMeasure.FermataInk)
    //   An accent or a marcato (goesOutsideSlurs, VexFlowConverter) records it above or below its note, to go beyond a
    //   slur on its side (VexFlowMeasure.AccentInk).
    if ((this.type === 'a@a' && position === ABOVE) || this.goesOutsideSlurs) {
      this.layoutInk = {
        left: this.drawnInk.left - stave.getX(),
        right: this.drawnInk.right - stave.getX(),
        top: this.drawnInk.top - this.slurClearanceYShift - stave.getYForLine(0),
        bottom: this.drawnInk.bottom - this.slurClearanceYShift - stave.getYForLine(0),
      };
    }
  }
}
