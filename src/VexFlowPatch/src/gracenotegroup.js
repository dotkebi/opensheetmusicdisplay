// [VexFlow](http://vexflow.com) - Copyright (c) Mohit Muthanna 2010.
//
// ## Description
//
// This file implements `GraceNoteGroup` which is used to format and
// render grace notes.

import { Vex } from './vex';
import { Flow } from './tables';
import { Modifier } from './modifier';
import { Formatter } from './formatter';
import { Voice } from './voice';
import { Beam } from './beam';
import { StaveTie } from './stavetie';
import { TabTie } from './tabtie';
import { StaveNote } from './stavenote';
import { BoundingBox } from './boundingbox';

// To enable logging for this class. Set `Vex.Flow.GraceNoteGroup.DEBUG` to `true`.
function L(...args) { if (GraceNoteGroup.DEBUG) Vex.L('Vex.Flow.GraceNoteGroup', args); }

export class GraceNoteGroup extends Modifier {
  static get CATEGORY() { return 'gracenotegroups'; }

  // Arrange groups inside a `ModifierContext`
  static format(gracenote_groups, state) {
    const group_spacing_stave = 0; // overwritten later in `spacing` (vexflowpatch)
    const group_spacing_tab = 0;
    // vexflow calls these spacing, though they seem more like margins to be precise. -> EngravingRules.GraceNoteGroupXMargin

    if (!gracenote_groups || gracenote_groups.length === 0) return false;

    const group_list = [];
    let prev_note = null;
    let shiftL = 0;

    for (let i = 0; i < gracenote_groups.length; ++i) {
      const gracenote_group = gracenote_groups[i];
      const note = gracenote_group.getNote();
      const is_stavenote = (note.getCategory() === StaveNote.CATEGORY);
      let spacing = (is_stavenote ? group_spacing_stave : group_spacing_tab);
      // vexflowpatch: allow spacing to be set externally (e.g. to 0)
      if (is_stavenote && gracenote_group.spacing !== null && gracenote_group.spacing !== undefined) {
        spacing = gracenote_group.spacing;
      }

      if (is_stavenote && note !== prev_note) {
        // Iterate through all notes to get the displaced pixels
        for (let n = 0; n < note.keys.length; ++n) {
          const props_tmp = note.getKeyProps()[n];
          shiftL = (props_tmp.displaced ? note.getExtraLeftPx() : shiftL);
        }
        prev_note = note;
      }

      group_list.push({ shift: shiftL, gracenote_group, spacing });
    }

    // If first note left shift in case it is displaced
    let group_shift = group_list[0].shift;
    let formatWidth;
    for (let i = 0; i < group_list.length; ++i) {
      const gracenote_group = group_list[i].gracenote_group;
      gracenote_group.preFormat();
      formatWidth = gracenote_group.getWidth() + group_list[i].spacing;
      group_shift = Math.max(formatWidth, group_shift);
    }

    for (let i = 0; i < group_list.length; ++i) {
      const gracenote_group = group_list[i].gracenote_group;
      formatWidth = gracenote_group.getWidth() + group_list[i].spacing;
      gracenote_group.setSpacingFromNextModifier(group_shift - Math.min(formatWidth, group_shift));
    }

    state.left_shift += group_shift;
    return true;
  }

  // ## Prototype Methods
  //
  // `GraceNoteGroup` inherits from `Modifier` and is placed inside a
  // `ModifierContext`.
  constructor(grace_notes, show_slur) {
    super();
    this.setAttribute('type', 'GraceNoteGroup');

    this.note = null;
    this.index = null;
    this.position = Modifier.Position.LEFT;
    this.grace_notes = grace_notes;
    this.width = 0;

    this.preFormatted = false;

    this.show_slur = show_slur;
    this.slur = null;
    // vexflowpatch: direction of the slur to the main note, set externally from the XML placement
    //   (otherwise the slur follows the stem direction of the first grace note)
    this.slur_direction = undefined;
    // vexflowpatch: how much farther (px) the arc's control points moved out past the main note's accidental in the
    //   last draw() (GraceArc.curveLift); 0 when the arc kept its shape. For tests.
    this.arcLift = 0;

    this.formatter = new Formatter();
    this.voice = new Voice({
      num_beats: 4,
      beat_value: 4,
      resolution: Flow.RESOLUTION,
    }).setStrict(false);

    this.render_options = {
      slur_y_shift: 0,
    };

    this.beams = [];

    this.voice.addTickables(this.grace_notes);

    return this;
  }

  getCategory() { return GraceNoteGroup.CATEGORY; }

  preFormat() {
    if (this.preFormatted) return;

    this.formatter.joinVoices([this.voice]).format([this.voice], 0);
    this.setWidth(this.formatter.getMinTotalWidth());
    this.preFormatted = true;
  }

  beamNotes(grace_notes) {
    grace_notes = grace_notes || this.grace_notes;
    if (grace_notes.length > 1) {
      const beam = new Beam(grace_notes);

      beam.render_options.beam_width = 3;
      beam.render_options.partial_beam_length = 4;

      this.beams.push(beam);
    }

    return this;
  }

  setNote(note) {
    this.note = note;
  }
  setWidth(width) {
    this.width = width;
  }
  getWidth() {
    return this.width;
  }
  getGraceNotes() {
    return this.grace_notes;
  }
  /**
   * vexflowpatch: the ink boxes (BoundingBox, px) of the note's accidentals on key `index`, where Accidental.draw() puts
   * them: each glyph's outline box at the modifier start (the right end) plus the shifts, a cautionary accidental's
   * parentheses included. Same as osmd-dart VexFlowGraceNoteGroup.accidentalInk.
   */
  static accidentalInk(note, index) {
    const inks = [];
    for (const accidental of note.getModifiers()) {
      if (accidental.getCategory() !== 'accidentals' || accidental.index !== index) continue;
      const start = note.getModifierStartXY(accidental.position, index);
      let x = start.x + accidental.x_shift;
      const y = start.y + accidental.y_shift;
      const add = (glyph, glyph_x) => {
        const box = glyph.bbox;
        inks.push(new BoundingBox(glyph_x + glyph.originShift.x + box.getX(), y + glyph.originShift.y + box.getY(),
          box.getW(), box.getH()));
      };
      if (!accidental.cautionary) {
        add(accidental.glyph, x);
      } else {
        // as Accidental.draw()
        add(accidental.parenRight, x);
        x -= accidental.parenRight.getMetrics().width + accidental.render_options.parenRightPadding +
          accidental.accidental.parenRightPaddingAdjustment;
        add(accidental.glyph, x);
        x -= accidental.glyph.getMetrics().width + accidental.render_options.parenLeftPadding;
        add(accidental.parenLeft, x);
      }
    }
    return inks;
  }

  /**
   * vexflowpatch: how far (px) both control points of the arc from (first_x, first_y) to (last_x, last_y) (its ends,
   * y shift included) on `direction`'s side (1 below, -1 above) must move out beyond `inner_cp` for the inner edge to
   * pass every ink box's end on that side by GraceNoteGroup.ACCIDENTAL_CLEARANCE where the box lies between the ends;
   * at most 2 x GraceNoteGroup.MAX_ACCIDENTAL_LIFT spaces, 0 when the arc clears them. The control points lie halfway
   * between the ends, so x runs linearly with t and the inner edge lies 2·t·(1−t)·cp off the line between the ends.
   * Same as osmd-dart VexFlowGraceNoteGroup.arcLiftOverAccidentals.
   */
  static arcLiftOverAccidentals(first_x, first_y, last_x, last_y, direction, inner_cp, inks, spacing) {
    if (inks.length === 0 || last_x === first_x) return 0;
    let need = 0;
    for (const ink of inks) {
      const end = direction > 0 ? ink.getY() + ink.getH() : ink.getY();
      for (let i = 0; i <= 16; i++) {
        const x = ink.getX() + ink.getW() * i / 16;
        const t = (x - first_x) / (last_x - first_x);
        if (t <= 0 || t >= 1) continue;
        const line = first_y + (last_y - first_y) * t;
        const cp = (direction * (end - line) + GraceNoteGroup.ACCIDENTAL_CLEARANCE * spacing) / (2 * t * (1 - t));
        if (cp - inner_cp > need) need = cp - inner_cp;
      }
    }
    const most = 2 * GraceNoteGroup.MAX_ACCIDENTAL_LIFT * spacing;
    return need > most ? most : need;
  }

  draw() {
    this.checkContext();

    const note = this.getNote();

    L('Drawing grace note group for:', note);

    if (!(note && (this.index !== null))) {
      throw new Vex.RuntimeError('NoAttachedNote',
        "Can't draw grace note without a parent note and parent note index.");
    }

    this.setRendered();
    this.alignSubNotesWithNote(this.getGraceNotes(), note); // Modifier function

    // Draw notes
    this.grace_notes.forEach(graceNote => {
      graceNote.setContext(this.context).draw();
    });

    // Draw beam
    this.beams.forEach(beam => {
      beam.setContext(this.context).draw();
    });

    if (this.show_slur) {
      // Create and draw slur
      const is_stavenote = (this.getNote().getCategory() === StaveNote.CATEGORY);
      const TieClass = (is_stavenote ? StaveTie : TabTie);

      const tie_notes = {
        last_note: this.grace_notes[0],
        first_note: note,
        first_indices: [0],
        last_indices: [0],
      };
      // vexflowpatch: the arc arches out past the main note's accidental (GraceArc)
      this.slur = is_stavenote
        ? new GraceArc(tie_notes, this, GraceNoteGroup.accidentalInk(note, 0))
        : new TieClass(tie_notes);

      if (this.slur_direction) {
        this.slur.setDirection(this.slur_direction); // vexflowpatch
      }
      this.slur.render_options.cp2 = 12;
      this.slur.render_options.y_shift = (is_stavenote ? 7 : 5) + this.render_options.slur_y_shift;
      this.slur.setContext(this.context).draw();
    }
  }
}

/**
 * vexflowpatch: space (staff spaces) between the main note's accidental and the arc's inner edge (the edge toward the
 * accidental); the outer edge is 0.17 to 0.2 spaces (the arc's thickness there) farther out. 0.2 is the space a
 * GraphicalSlur keeps from another voice's slur (betweenVoicesClearance), the closest slurs come to other ink; the 0.3
 * a slur keeps from an ornament or an articulation raises a short grace arc more than the contact needs.
 */
GraceNoteGroup.ACCIDENTAL_CLEARANCE = 0.2;
/**
 * vexflowpatch: the most (staff spaces) the arc's bulge grows to pass an accidental. A quadratic curve bulges by half
 * its control point offset: both control points move out by at most twice this.
 */
GraceNoteGroup.MAX_ACCIDENTAL_LIFT = 1.5;

/**
 * vexflowpatch: a grace note group's arc to its main note, arching out past the main note's accidentals' `inks`
 * (GraceNoteGroup.arcLiftOverAccidentals). The arc was drawn from the two noteheads alone, and the accidental between
 * them reached into it (Goltermann, Cello Concerto No. 3 III m187: the sharp of G#3 under the arc below; Sibelius,
 * Violin Concerto III m93: the flat of Gb5 over the arc above). The ends stay; an arc with no accidental in its way
 * keeps its shape. Same as osmd-dart _GraceArc.
 */
class GraceArc extends StaveTie {
  constructor(notes, group, inks) {
    super(notes);
    this.group = group;
    this.inks = inks;
  }

  curveLift(params, cp1) {
    this.group.arcLift = 0;
    if (this.inks.length === 0 || !this.render_options.curve_by_length || this.first_indices.length !== 1) return 0;
    const y_shift = this.render_options.y_shift * params.direction;
    const stave = (this.first_note || this.last_note).getStave();
    const lift = GraceNoteGroup.arcLiftOverAccidentals(
      params.first_x_px + this.render_options.first_x_shift,
      params.first_ys[this.first_indices[0]] + y_shift,
      params.last_x_px + this.render_options.last_x_shift,
      params.last_ys[this.last_indices[0]] + y_shift,
      params.direction,
      cp1,
      this.inks,
      stave ? stave.getSpacingBetweenLines() : 10);
    this.group.arcLift = lift;
    return lift;
  }
}
