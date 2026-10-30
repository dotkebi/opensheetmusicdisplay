// [VexFlow](http://vexflow.com) - Copyright (c) Mohit Muthanna 2010.
// Author: Cyril Silverman
//
// ## Description
//
// This file implements ornaments as modifiers that can be
// attached to notes. The complete list of ornaments is available in
// `tables.js` under `Vex.Flow.ornamentCodes`.
//
// See `tests/ornament_tests.js` for usage examples.

import { Vex } from './vex';
import { Flow } from './tables';
import { Modifier } from './modifier';
import { TickContext } from './tickcontext';
import { StaveNote } from './stavenote';
import { Glyph } from './glyph';

// To enable logging for this class. Set `Vex.Flow.Ornament.DEBUG` to `true`.
function L(...args) { if (Ornament.DEBUG) Vex.L('Vex.Flow.Ornament', args); }

// VexFlowPatch: the glyph of an accidental of an ornament, also for a list of accidentals drawn side by side
//   (e.g. ['#', '#'] for a sharp-sharp). Like a note's accidentals, they share a baseline, with `spacing` between them.
//   Positioned like a single glyph with origin (0.5, 1.0): render() takes the center and the bottom.
function createAccidentalGlyph(accids, scale, spacing) {
  if (!Array.isArray(accids)) {
    accids = [accids];
  }
  const glyphs = accids.map(accid => new Glyph(Flow.accidentalCodes(accid).code, scale));
  if (glyphs.length === 1) {
    glyphs[0].setOrigin(0.5, 1.0);
    return glyphs[0];
  }
  let top = Infinity;
  let bottom = -Infinity;
  let width = spacing * (glyphs.length - 1);
  for (const glyph of glyphs) {
    top = Math.min(top, glyph.bbox.getY());
    bottom = Math.max(bottom, glyph.bbox.getY() + glyph.bbox.getH());
    width += glyph.bbox.getW();
  }
  return {
    glyphs,
    getMetrics: () => ({ width, height: bottom - top }),
    render: (ctx, x, y) => {
      let left = x - width / 2;
      for (const glyph of glyphs) {
        glyph.render(ctx, left - glyph.bbox.getX(), y - bottom);
        left += glyph.bbox.getW() + spacing;
      }
    },
  };
}

// VexFlowPatch: the y from which the text lines of the ornaments above a note are counted (see Ornament.getRenderXY()): a staff
//   space above its stem tip, or above its head if the stem is down (one and a half above a beamed stem tip)
function getTopBaseY(note) {
  const spacing = note.getStave().getSpacingBetweenLines();
  const stemExtents = note.getStem().getExtents();
  if (note.getStemDirection() === StaveNote.STEM_DOWN) {
    return stemExtents.baseY - spacing;
  }
  // Beamed stems are longer than quarter note stems
  return stemExtents.topY - spacing * (note.beam ? 1.5 : 1);
}

// VexFlowPatch: the y from which the text lines of the ornaments below a note are counted: a staff space below its lowest
//   head or its stem tip (one and a half below a beamed stem tip)
function getBottomBaseY(note) {
  const spacing = note.getStave().getSpacingBetweenLines();
  const stemExtents = note.getStem().getExtents();
  const noteBottom = Math.max(...note.getYs(),
    note.hasStem() ? Math.max(stemExtents.topY, stemExtents.baseY) : -Infinity);
  return noteBottom + spacing * (note.getStemDirection() === StaveNote.STEM_DOWN && note.beam ? 1.5 : 1);
}

export class Ornament extends Modifier {
  static get CATEGORY() { return 'ornaments'; }

  // VexFlowPatch: between an ornament's ink and a fermata or an aspiration drawn beyond it, in staff spaces: as
  //   VexFlow leaves between an aspiration and a tremblement over it (see Articulation.stackedOutsideOrnament)
  static get STACKED_ARTICULATION_GAP() { return 0.75; }

  // ## Static Methods
  // Arrange ornaments inside `ModifierContext`
  static format(ornaments, state) {
    if (!ornaments || ornaments.length === 0) return false;

    let width = 0;
    for (let i = 0; i < ornaments.length; ++i) {
      const ornament = ornaments[i];
      // VexFlowPatch: the accidental marks take text lines too (10: a staff space, as in Articulation.format()), so that the
      //   next ornament isn't drawn over them
      const increment = 2 + Math.ceil(ornament.getAccidentalsHeight() / 10);

      width = Math.max(ornament.getWidth(), width);

      if (ornament.getPosition() === Modifier.Position.ABOVE) {
        ornament.setTextLine(state.top_text_line);
        state.top_text_line += increment;
      } else {
        ornament.setTextLine(state.text_line);
        state.text_line += increment;
      }
    }

    state.left_shift += width / 2;
    state.right_shift += width / 2;
    return true;
  }

  // Create a new ornament of type `type`, which is an entry in
  // `Vex.Flow.ornamentCodes` in `tables.js`.
  constructor(type) {
    super();
    this.setAttribute('type', 'Ornament');

    this.note = null;
    this.index = null;
    this.type = type;
    this.position = Modifier.Position.ABOVE;
    this.delayed = false;
    // VexFlowPatch: OSMD's layout raises an ornament above a slur that would touch it (an ornament below the
    // note goes down under a slur below), see VexFlowMusicSheetCalculator.layoutOrnament(), and reads where the
    // ornament was drawn (layoutInk).
    this.slurClearanceYShift = 0;
    this.layoutInk = undefined;

    this.accidentalUpper = null;
    this.accidentalLower = null;

    this.render_options = {
      font_scale: 38,
      accidentalLowerPadding: 3,
      accidentalUpperPadding: 3,
      accidentalSpacing: 3, // between the accidentals of a list, as between a note's accidentals (Accidental.format())
    };

    this.ornament = Flow.ornamentCodes(this.type);
    if (!this.ornament) {
      throw new Vex.RERR('ArgumentError', `Ornament not found: '${this.type}'`);
    }

    this.glyph = new Glyph(this.ornament.code, this.render_options.font_scale);
    this.glyph.setOrigin(0.5, 1.0); // FIXME: SMuFL won't require a vertical origin shift
  }

  getCategory() { return Ornament.CATEGORY; }

  // VexFlowPatch: the height of the ornament's accidental marks below and above its glyph, with their paddings
  getAccidentalsHeight() {
    let height = 0;
    if (this.accidentalLower) {
      height += this.accidentalLower.getMetrics().height + this.render_options.accidentalLowerPadding;
    }
    if (this.accidentalUpper) {
      height += this.accidentalUpper.getMetrics().height + this.render_options.accidentalUpperPadding;
    }
    return height;
  }

  // Set whether the ornament is to be delayed
  setDelayed(delayed) { this.delayed = delayed; return this; }

  // Set the upper accidental for the ornament
  // VexFlowPatch: also a list of accidentals, drawn side by side (e.g. ['#', '#'] for a sharp-sharp)
  setUpperAccidental(accid) {
    this.accidentalUpper = createAccidentalGlyph(accid, this.render_options.font_scale / 1.3,
      this.render_options.accidentalSpacing / 1.3);
    return this;
  }

  // Set the lower accidental for the ornament
  // VexFlowPatch: also a list of accidentals, see setUpperAccidental()
  setLowerAccidental(accid) {
    this.accidentalLower = createAccidentalGlyph(accid, this.render_options.font_scale / 1.3,
      this.render_options.accidentalSpacing / 1.3);
    return this;
  }

  // VexFlowPatch: the other notes at this time with ornaments or articulations on the side of this one: those of the other
  //   voices in the staff, which share this ornament's ModifierContext, and so the text lines that format() gave them (the
  //   articulations first, see ModifierContext.PREFORMAT, so an ornament is stacked outside the articulations of other notes)
  getOtherNotesOnSameSide() {
    const isTabNote = note => note.getCategory() === 'tabnotes';
    if (isTabNote(this.note)) {
      return [];
    }
    const context = this.getModifierContext();
    const modifiers = [...(context?.getModifiers('articulations') ?? []), ...(context?.getModifiers(Ornament.CATEGORY) ?? [])];
    return modifiers
      .filter(modifier => modifier.getPosition() === this.position && modifier.note !== this.note && !isTabNote(modifier.note))
      .map(modifier => modifier.note);
  }

  // VexFlowPatch: the box of the ornament with its accidentals as draw() renders it, e.g. for a slur that starts or ends at
  //   the note to keep its distance from it before drawing (see OSMD's GraphicalSlur): left and right from the centre of the
  //   note head, which draw() centres it on (getModifierStartXY()), unless it is delayed, top and bottom in the stave's
  //   coordinates
  getExtent() {
    // a note's ys follow the stave only when its voice draws it (see getRenderXY())
    this.note.setStave(this.note.getStave());
    const { y } = this.getRenderXY();
    const shift = this.delayed ? this.delayXShift : 0; // (set by getRenderXY())
    const width = Math.max(...[this.glyph, this.accidentalLower, this.accidentalUpper].filter(glyph => glyph)
      .map(glyph => glyph.getMetrics().width));
    const height = this.glyph.getMetrics().height + this.getAccidentalsHeight();
    return { left: shift - width / 2, right: shift + width / 2, top: y - height, bottom: y };
  }

  // Render ornament in position next to note.
  draw() {
    this.checkContext();

    if (!this.note || this.index == null) {
      throw new Vex.RERR('NoAttachedNote', "Can't draw Ornament without a note and index.");
    }

    this.setRendered();

    const ctx = this.context;
    let { x: glyphX, y: glyphY } = this.getRenderXY();
    const bottomY = glyphY; // VexFlowPatch: the ink's bottom (for layoutInk)

    L('Rendering ornament: ', this.ornament, glyphX, glyphY);

    if (this.accidentalLower) {
      this.accidentalLower.render(ctx, glyphX, glyphY);
      glyphY -= this.accidentalLower.getMetrics().height;
      glyphY -= this.render_options.accidentalLowerPadding;
    }

    this.glyph.render(ctx, glyphX, glyphY);
    glyphY -= this.glyph.getMetrics().height;

    if (this.accidentalUpper) {
      glyphY -= this.render_options.accidentalUpperPadding;
      this.accidentalUpper.render(ctx, glyphX, glyphY);
    }

    // VexFlowPatch: record the ink of an ornament above or below the note (see slurClearanceYShift)
    if (this.position === Modifier.Position.ABOVE || this.position === Modifier.Position.BELOW) {
      const stave = this.note.getStave();
      const spacing = stave.getSpacingBetweenLines();
      const width = this.glyph.getMetrics().width;
      let top = glyphY;
      if (this.accidentalUpper) {
        top -= this.accidentalUpper.getMetrics().height;
      }
      // VexFlowPatch: a fermata or an aspiration of the note on this side goes beyond the ornament
      //   (Articulation.stackedOutsideOrnament), and the ornament's ink covers both
      let ink = { left: glyphX - width / 2, right: glyphX + width / 2, top, bottom: bottomY };
      if (!this.delayed) {
        for (const articulation of this.note.getModifiers()) {
          if (articulation.getCategory() !== 'stackedarticulations' || articulation.getPosition() !== this.position) {
            continue;
          }
          const above = this.position === Modifier.Position.ABOVE;
          const edge = above ? ink.top - Ornament.STACKED_ARTICULATION_GAP * spacing
            : ink.bottom + Ornament.STACKED_ARTICULATION_GAP * spacing;
          const box = articulation.drawAt(ctx, glyphX, edge);
          ink = {
            left: Math.min(ink.left, box.left),
            right: Math.max(ink.right, box.right),
            top: Math.min(ink.top, box.top),
            bottom: Math.max(ink.bottom, box.bottom),
          };
        }
      }
      this.layoutInk = {
        left: ink.left - stave.getX(),
        right: ink.right - stave.getX(),
        top: ink.top - this.slurClearanceYShift - stave.getYForLine(0),
        bottom: ink.bottom - this.slurClearanceYShift - stave.getYForLine(0),
      };
      // VexFlowPatch: the y_shift the ink was drawn with (see Articulation.draw())
      this.layoutYShift = this.y_shift || 0;
    }
  }

  // VexFlowPatch: where draw() renders the ornament: the x of its centre and the y of its bottom, with its lower accidental
  //   (from draw(), to get it before drawing, see getExtent())
  getRenderXY() {
    const stemDir = this.note.getStemDirection();
    const stave = this.note.getStave();

    // Get stem extents
    const stemExtents = this.note.getStem().getExtents();
    let y = stemDir === StaveNote.STEM_DOWN ? stemExtents.baseY : stemExtents.topY;

    // TabNotes don't have stems attached to them. Tab stems are rendered
    // outside the stave.
    if (this.note.getCategory() === 'tabnotes') {
      if (this.note.hasStem()) {
        if (stemDir === StaveNote.STEM_DOWN) {
          y = stave.getYForTopText(this.text_line);
        }
      } else { // Without a stem
        y = stave.getYForTopText(this.text_line);
      }
    }

    const isPlacedOnNoteheadSide = stemDir === StaveNote.STEM_DOWN;
    const spacing = stave.getSpacingBetweenLines();
    let lineSpacing = 1;

    // Beamed stems are longer than quarter note stems, adjust accordingly
    if (!isPlacedOnNoteheadSide && this.note.beam) {
      lineSpacing += 0.5;
    }

    // VexFlowPatch: the text line of an ornament (see format()) is counted from the outermost of the notes at this time
    //   with ornaments on its side, i.e. of all voices in the staff (see getOtherNotesOnSameSide()), not only from its own
    //   note: e.g. the turn of a stem-down note, on text line 2, was drawn at the height of the mordent on text line 0
    //   above the stem of the stem-up note of another voice a second above, over it.
    const otherNotes = this.getOtherNotesOnSameSide();
    for (const note of otherNotes) {
      // a note's ys follow the stave only when its voice draws it (Voice.draw() sets the stave): a voice drawn after this
      //   one still has those of the previous draw, e.g. of the skyline's, where the stave was elsewhere
      note.setStave(note.getStave());
    }
    let topBaseY = y - spacing * lineSpacing;
    for (const note of otherNotes) {
      topBaseY = Math.min(topBaseY, getTopBaseY(note));
    }
    const glyphYBetweenLines = topBaseY - spacing * this.text_line;

    // Get initial coordinates for the modifier position
    const start = this.note.getModifierStartXY(this.position, this.index);
    let glyphX = start.x;
    let glyphY = Math.min(stave.getYForTopText(this.text_line), glyphYBetweenLines);
    if (this.position === Modifier.Position.BELOW) {
      // VexFlowPatch: Place the entire ornament, including accidentals, below the stave and note.
      // Glyphs are drawn upwards from their bottom origin.
      let bottomBaseY = getBottomBaseY(this.note);
      for (const note of otherNotes) {
        bottomBaseY = Math.max(bottomBaseY, getBottomBaseY(note));
      }
      const height = this.glyph.getMetrics().height + this.getAccidentalsHeight();
      glyphY = Math.max(stave.getYForBottomText(this.text_line), bottomBaseY + spacing * this.text_line) + height;
    }
    if (this.position === Modifier.Position.ABOVE && !this.delayed) {
      // VexFlowPatch: keep the ornament over another voice's up stem that runs through it on this staff at this time.
      // Two voices on one pitch share a notehead; the other voice's stem then crosses an ornament written over the
      // down-stem voice, and a tremblement with a stroke through it reads as a pincé (Couperin III Prélude m8).
      const tickContext = this.note.getTickContext();
      const centre = glyphX + this.x_shift;
      const half = this.glyph.getMetrics().width / 2 + spacing * 0.2;
      for (const other of tickContext ? tickContext.getTickables() : []) {
        if (other === this.note || !(other instanceof StaveNote) || other.getStave() !== stave ||
            !other.hasStem() || other.getStemDirection() !== StaveNote.STEM_UP ||
            Math.abs(other.getStemX() - centre) > half) {
          continue;
        }
        // The other voice may not be drawn yet, so its ys can still be those of a stave position before the system
        // was placed: take its stem relative to its first notehead and put that head on this stave.
        const tip = other.getStem().getExtents().topY - other.getYs()[0] + stave.getYForNote(other.getKeyProps()[0].line);
        glyphY = Math.min(glyphY, tip - spacing * 0.4);
      }
    }
    glyphY += this.y_shift;
    glyphY += this.slurClearanceYShift;

    // Ajdust x position if ornament is delayed
    if (this.delayed) {
      let delayXShift = 0;
      if (this.delayXShift !== undefined) {
        delayXShift = this.delayXShift;
      } else {
        // VexFlowPatch: halfway to the next note of the voice, from tick context to tick context. glyphX (the note's
        // modifier x) is off the tick contexts' x by the stave's note start, which only nearly cancelled the half glyph
        // width inside a system: in a system's first measure the clef, key and time put the ornament left by half their
        // width (Bellini, Vanne m10, drawn left of its G4). The glyph is centred (origin 0.5). As in vexflow_dart.
        const voice = this.note.getVoice ? this.note.getVoice() : undefined;
        const tickables = voice ? voice.getTickables() : [];
        const index = tickables.indexOf(this.note);
        const next = index >= 0 ? tickables[index + 1] : undefined;
        const nextContext = next ? next.getTickContext() : TickContext.getNextContext(this.note.getTickContext());
        if (nextContext) {
          delayXShift += (nextContext.getX() - this.note.getTickContext().getX()) * 0.5;
        } else {
          delayXShift += (stave.x + stave.width - glyphX) * 0.5;
        }
        this.delayXShift = delayXShift;
      }
      glyphX += delayXShift;
    }
    return { x: glyphX, y: glyphY };
  }
}
