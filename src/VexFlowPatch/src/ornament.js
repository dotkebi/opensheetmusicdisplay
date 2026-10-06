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
      const increment = 2;

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

  // Render ornament in position next to note.
  draw() {
    this.checkContext();

    if (!this.note || this.index == null) {
      throw new Vex.RERR('NoAttachedNote', "Can't draw Ornament without a note and index.");
    }

    this.setRendered();

    const ctx = this.context;
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

    const totalSpacing = spacing * (this.text_line + lineSpacing);
    const glyphYBetweenLines = y - totalSpacing;

    // Get initial coordinates for the modifier position
    const start = this.note.getModifierStartXY(this.position, this.index);
    let glyphX = start.x;
    let glyphY = Math.min(stave.getYForTopText(this.text_line), glyphYBetweenLines);
    if (this.position === Modifier.Position.BELOW) {
      // VexFlowPatch: Place the entire ornament, including accidentals, below the stave and note.
      // Glyphs are drawn upwards from their bottom origin.
      const noteBottom = Math.max(...this.note.getYs(),
        this.note.hasStem() ? Math.max(stemExtents.topY, stemExtents.baseY) : -Infinity);
      const bottomSpacing = spacing * (this.text_line + 1 +
        (stemDir === StaveNote.STEM_DOWN && this.note.beam ? 0.5 : 0));
      let height = this.glyph.getMetrics().height;
      if (this.accidentalLower) {
        height += this.accidentalLower.getMetrics().height + this.render_options.accidentalLowerPadding;
      }
      if (this.accidentalUpper) {
        height += this.accidentalUpper.getMetrics().height + this.render_options.accidentalUpperPadding;
      }
      glyphY = Math.max(stave.getYForBottomText(this.text_line), noteBottom + bottomSpacing) + height;
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
    // VexFlowPatch: the ink without the slur clearance shift, relative to the stave's left edge and top line
    const inkGlyphY = glyphY;
    glyphY += this.slurClearanceYShift;

    // Ajdust x position if ornament is delayed
    if (this.delayed) {
      let delayXShift = 0;
      if (this.delayXShift !== undefined) {
        delayXShift = this.delayXShift;
      } else {
        delayXShift += this.glyph.getMetrics().width / 2;
        const nextContext = TickContext.getNextContext(this.note.getTickContext());
        if (nextContext) {
          delayXShift += (nextContext.getX() - glyphX) * 0.5;
        } else {
          delayXShift += (stave.x + stave.width - glyphX) * 0.5;
        }
        this.delayXShift = delayXShift;
      }
      glyphX += delayXShift;
    }

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
      const width = this.glyph.getMetrics().width;
      let top = glyphY;
      if (this.accidentalUpper) {
        top -= this.accidentalUpper.getMetrics().height;
      }
      // VexFlowPatch: a fermata or an aspiration of the note on this side goes beyond the ornament
      //   (Articulation.stackedOutsideOrnament), and the ornament's ink covers both
      let ink = { left: glyphX - width / 2, right: glyphX + width / 2, top, bottom: inkGlyphY + this.slurClearanceYShift };
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
    }
  }
}
