// [VexFlow](http://vexflow.com) - Copyright (c) Mohit Muthanna 2010.
//
// ## Description
//
// This file implements different types of pedal markings. These notation
// elements indicate to the performer when to depress and release the a pedal.
//
// In order to create "Sostenuto", and "una corda" markings, you must set
// custom text for the release/depress pedal markings.

import { Vex } from './vex';
import { Element } from './element';
import { Glyph } from './glyph';
import { StaveModifier } from './stavemodifier';

// To enable logging for this class. Set `Vex.Flow.PedalMarking.DEBUG` to `true`.
function L(...args) { if (PedalMarking.DEBUG) Vex.L('Vex.Flow.PedalMarking', args); }

// Draws a pedal glyph with the provided `name` on a rendering `context`
// at the coordinates `x` and `y. Takes into account the glyph data
// coordinate shifts.
function drawPedalGlyph(name, context, x, y, point) {
  const glyph_data = PedalMarking.GLYPHS[name];
  const glyph = new Glyph(glyph_data.code, point);
  glyph.render(context, x + glyph_data.x_shift, y + glyph_data.y_shift);
}

export class PedalMarking extends Element {
  // Glyph data
  static get GLYPHS() {
    return {
      'pedal_depress': {
        code: 'v36',
        x_shift: -10,
        y_shift: 0,
      },
      'pedal_release': {
        code: 'v5d',
        x_shift: -2,
        y_shift: 3,
      },
    };
  }

  static get Styles() {
    return {
      TEXT: 1,
      BRACKET: 2,
      MIXED: 3,
      MIXED_OPEN_END: 4, // VexFlowPatch: additions from here on
      BRACKET_OPEN_BEGIN: 5,
      BRACKET_OPEN_END: 6,
      BRACKET_OPEN_BOTH: 7
    };
  }

  static get StylesString() {
    return {
      text: PedalMarking.Styles.TEXT,
      bracket: PedalMarking.Styles.BRACKET,
      mixed: PedalMarking.Styles.MIXED,
      mixed_open_end: PedalMarking.Styles.MIXED_OPEN_END,
      bracket_open_begin: PedalMarking.Styles.BRACKET_OPEN_BEGIN,
      bracket_open_end: PedalMarking.Styles.BRACKET_OPEN_END,
      bracket_open_both: PedalMarking.Styles.BRACKET_OPEN_BOTH
    };
  }

  // Create a sustain pedal marking. Returns the defaults PedalMarking.
  // Which uses the traditional "Ped" and "*"" markings.
  static createSustain(notes) {
    const pedal = new PedalMarking(notes);
    return pedal;
  }

  // Create a sostenuto pedal marking
  static createSostenuto(notes) {
    const pedal = new PedalMarking(notes);
    pedal.setStyle(PedalMarking.Styles.MIXED);
    pedal.setCustomText('Sost. Ped.');
    return pedal;
  }

  // Create an una corda pedal marking
  static createUnaCorda(notes) {
    const pedal = new PedalMarking(notes);
    pedal.setStyle(PedalMarking.Styles.TEXT);
    pedal.setCustomText('una corda', 'tre corda');
    return pedal;
  }

  // ## Prototype Methods
  constructor(notes) {
    super();
    this.setAttribute('type', 'PedalMarking');
    this.EndsStave = false; // VexFlowPatch
    this.ChangeBegin = false;
    this.ChangeEnd = false;
    // VexFlowPatch: absolute x of the release when it falls between two notes (OSMD interpolates it by time).
    //   undefined = at the end note.
    this.ReleaseX = undefined;
    // VexFlowPatch: absolute x of the depress when it falls between two notes (OSMD interpolates it by time).
    this.DepressX = undefined;
    this.notes = notes;
    this.style = PedalMarking.TEXT;
    this.line = 0;

    // Custom text for the release/depress markings
    this.custom_depress_text = '';
    this.custom_release_text = '';

    this.font = {
      family: 'Times New Roman',
      size: 12,
      weight: 'italic bold',
    };

    this.render_options = {
      bracket_height: 10,
      text_margin_right: 6,
      bracket_line_width: 1,
      glyph_point_size: 40,
      color: 'black',
    };
  }

  setEndStave(stave) { // VexFlowPatch addition
    this.endStave = stave;
    this.endStaveAddedWidth = 0;
    this.startMargin = 0;
    this.endMargin = 0;
    if(Array.isArray(this.endStave.modifiers)){
      for(let i = 0; i < this.endStave.modifiers.length; i++){
        let nextMod = this.endStave.modifiers[i];
        if(nextMod && nextMod.position === StaveModifier.Position.END && nextMod.width){
          this.endStaveAddedWidth += nextMod.width;
        }
      }
    }
  }

  // Set custom text for the `depress`/`release` pedal markings. No text is
  // set if the parameter is falsy.
  setCustomText(depress, release) {
    this.custom_depress_text = depress || '';
    this.custom_release_text = release || '';
    return this;
  }

  // Set the pedal marking style
  setStyle(style) {
    if (style < 1 && style > 3)  {
      throw new Vex.RERR('InvalidParameter', 'The style must be one found in PedalMarking.Styles');
    }

    this.style = style;
    return this;
  }

  // Set the staff line to render the markings on
  setLine(line) { this.line = line; return this; }

  // Draw the bracket based pedal markings
  drawBracketed() {
    const ctx = this.context;
    let is_pedal_depressed = false;
    let prev_x;
    let prev_y;
    const pedal = this;
    // Iterate through each note
    this.notes.forEach((note, index, notes) => {
      // Each note triggers the opposite pedal action
      is_pedal_depressed = !is_pedal_depressed;
      // Get the initial coordinates for the note
      let x = 0; // VexFlowPatch (further smaller diffs below)
      if (note) {
        // Tab rests are GhostNotes and don't expose notehead coordinates.
        // Keep their formatted timeline anchor instead of crashing.
        x = note.getNoteHeadBeginX ? note.getNoteHeadBeginX() : note.getAbsoluteX();
        if (this.BeginsStave) {
          x = note.getStave().getNoteStartX();
        } else if (is_pedal_depressed && this.DepressX !== undefined && this.DepressX !== null) {
          // the pedal is pressed between two notes: start the bracket there
          x = this.DepressX;
        }
      } else {
        x = this.endStave.end_x + this.endStaveAddedWidth;
      }

      //If this pedal doesn't end a stave...
      if(!this.EndsStave){
        if(note){
          //pedal across a single note or just the end note
          if(!is_pedal_depressed){
            switch(pedal.style) {
              case PedalMarking.Styles.BRACKET_OPEN_END:
              case PedalMarking.Styles.BRACKET_OPEN_BOTH:
              case PedalMarking.Styles.MIXED_OPEN_END:
                x = note.getNoteHeadEndX ? note.getNoteHeadEndX() : note.getAbsoluteX();
              break;
              default:
                if (this.ReleaseX !== undefined && this.ReleaseX !== null) {
                  // the pedal lifts between two notes: end the bracket there
                  x = this.ReleaseX;
                } else if(this.ChangeEnd){
                  //Start in the middle of the note
                  x = note.getAbsoluteX();
                } else {
                  const noteHeadBeginX = note.getNoteHeadBeginX ? note.getNoteHeadBeginX() : note.getAbsoluteX();
                  x = noteHeadBeginX - pedal.render_options.text_margin_right;
                  this.startMargin = -pedal.render_options.text_margin_right;
                }
              break;
            }
          } else if(this.ChangeBegin){
            x = note.getAbsoluteX();
          }
        }
      } else {
        //Ends stave and we are at the end...
        if(!is_pedal_depressed){
          //IF we are the end, set the end to the stave end
          if(note){
            if(this.ChangeEnd){
              //Start in the middle of the note
              x = note.getAbsoluteX();
            }  else {
              x = note.getStave().end_x + this.endStaveAddedWidth - pedal.render_options.text_margin_right;
            }
          } else {
            x = this.endStave.end_x + this.endStaveAddedWidth - pedal.render_options.text_margin_right;
          }
          
          this.endMargin = -pedal.render_options.text_margin_right;
        } else if (this.ChangeBegin){
          x = note.getAbsoluteX();
        }
      }

      let stave = this.endStave; // if !note
      if (note) {
        stave = note.getStave();
      }
      let y = stave.getYForBottomText(pedal.line + 3);
      if (prev_y) { // compiler complains if we shorten this
        if (prev_y > y) { // don't slope pedal marking upwards (nonstandard)
          y = prev_y;
        }
      }

      // Throw if current note is positioned before the previous note
      if (x < prev_x) {
        // TODO this unnecessarily throws for missing endNote fix
        // throw new Vex.RERR(
        //   'InvalidConfiguration', 'The notes provided must be in order of ascending x positions'
        // );
      }

      // Determine if the previous or next note are the same
      // as the current note. We need to keep track of this for
      // when adjustments are made for the release+depress action
      const next_is_same = notes[index + 1] === note;
      const prev_is_same = notes[index - 1] === note;

      let x_shift = 0;
      if (is_pedal_depressed) {
        // Adjustment for release+depress
        x_shift =  prev_is_same ? 5 : 0;

        if ((pedal.style === PedalMarking.Styles.MIXED || pedal.style === PedalMarking.Styles.MIXED_OPEN_END) && !prev_is_same) {
          // For MIXED style, start with text instead of bracket
          if (pedal.custom_depress_text) {
            // If we have custom text, use instead of the default "Ped" glyph
            const text_width = ctx.measureText(pedal.custom_depress_text).width;
            ctx.fillText(pedal.custom_depress_text, x - (text_width / 2), y);
            x_shift = (text_width / 2) + pedal.render_options.text_margin_right;
          } else {
            // Render the Ped glyph in position
            drawPedalGlyph('pedal_depress', ctx, x, y, pedal.render_options.glyph_point_size);
            x_shift = 20 + pedal.render_options.text_margin_right;
          }
        } else {
          // Draw start bracket
          ctx.beginPath();
          if (pedal.style === PedalMarking.Styles.BRACKET_OPEN_BEGIN || pedal.style === PedalMarking.Styles.BRACKET_OPEN_BOTH) {
            ctx.moveTo(x + x_shift, y);
          } else {
            if(this.ChangeBegin){
              x += 5;
            }
            ctx.moveTo(x, y - pedal.render_options.bracket_height);
            if(this.ChangeBegin){
              x += 5;
            }
            ctx.lineTo(x + x_shift, y);
          }
          ctx.stroke();
          ctx.closePath();
        }
      } else {
        // Adjustment for release+depress
        x_shift = next_is_same && !this.EndsStave ? -5 : 0;

        // Draw end bracket
        ctx.beginPath();
        ctx.moveTo(prev_x, prev_y);
        ctx.lineTo(x + x_shift, y);
        if (pedal.style !== PedalMarking.Styles.BRACKET_OPEN_END && pedal.style !== PedalMarking.Styles.MIXED_OPEN_END &&
            pedal.style !== PedalMarking.Styles.BRACKET_OPEN_BOTH) {
            if(this.ChangeEnd){
              x += 5;
            }
            ctx.lineTo(x, y - pedal.render_options.bracket_height);
        }
        ctx.stroke();
        ctx.closePath();
      }

      // Store previous coordinates
      prev_x = x + x_shift;
      prev_y = y;
    });
  }

  // Draw the text based pedal markings. This defaults to the traditional
  // "Ped" and "*"" symbols if no custom text has been provided.
  // VexFlowPatch: the end note is the note BEFORE which the pedal is released; the release mark sits at its x,
  //   between two notes at ReleaseX, or right-aligned before the stave end for EndsStave. A release+depress at one
  //   note (ChangeEnd/ChangeBegin) keeps CHANGE_GAP on each side of the note x between the two marks.
  drawText() {
    const ctx = this.context;
    let is_pedal_depressed = false;
    const pedal = this;

    // The glyph point size
    const point = pedal.render_options.glyph_point_size;
    const margin = pedal.render_options.text_margin_right;

    // Iterate through each note, placing glyphs or custom text accordingly
    this.notes.forEach(note => {
      if (!note) {
        return;
        // apparently happens for some GuitarPro/Sibelius exports with faulty MusicXML
      }
      is_pedal_depressed = !is_pedal_depressed;
      const stave = note.getStave();
      const x = note.getAbsoluteX();
      const y = stave.getYForBottomText(pedal.line + 3);

      let text_width = 0;
      if (is_pedal_depressed) {
        const anchor = (this.DepressX !== undefined && this.DepressX !== null && !this.BeginsStave) ? this.DepressX : x;
        if (pedal.custom_depress_text) {
          text_width = ctx.measureText(pedal.custom_depress_text).width;
          const left = this.ChangeBegin ? anchor + PedalMarking.CHANGE_GAP : anchor - (text_width / 2);
          ctx.fillText(pedal.custom_depress_text, left, y);
        } else {
          // the glyph is drawn x_shift (-10) left of the given x; a change puts its left edge CHANGE_GAP right of the note
          const glyphX = this.ChangeBegin ? anchor + PedalMarking.CHANGE_GAP - PedalMarking.GLYPHS.pedal_depress.x_shift : anchor;
          drawPedalGlyph('pedal_depress', ctx, glyphX, y, point);
        }
      } else {
        const hasReleaseX = this.ReleaseX !== undefined && this.ReleaseX !== null;
        if (pedal.custom_release_text) {
          text_width = ctx.measureText(pedal.custom_release_text).width;
          let left = x - (text_width / 2);
          if (hasReleaseX && !this.EndsStave) {
            left = this.ReleaseX;
          } else if (this.EndsStave) {
            left = stave.getNoteEndX() + (this.endStaveAddedWidth || 0) - margin - text_width;
          } else if (this.ChangeEnd) {
            left = x - PedalMarking.CHANGE_GAP - text_width;
          }
          ctx.fillText(pedal.custom_release_text, left, y);
        } else {
          // the glyph is drawn x_shift (-2) left of the given x
          const glyphData = PedalMarking.GLYPHS.pedal_release;
          let glyphX = x;
          if (hasReleaseX && !this.EndsStave) {
            glyphX = this.ReleaseX;
          } else if (this.EndsStave) {
            glyphX = stave.getNoteEndX() + (this.endStaveAddedWidth || 0) - margin - PedalMarking.releaseGlyphWidth(point) - glyphData.x_shift;
          } else if (this.ChangeEnd) {
            glyphX = x - PedalMarking.CHANGE_GAP - PedalMarking.releaseGlyphWidth(point) - glyphData.x_shift;
          }
          drawPedalGlyph('pedal_release', ctx, glyphX, y, point);
        }
      }
    });
  }

  // VexFlowPatch: horizontal gap kept between a release glyph and the depress glyph of a change at the same note.
  static get CHANGE_GAP() { return 3; }

  // VexFlowPatch: drawn width of the default release glyph (*) at the given point size.
  static releaseGlyphWidth(point) {
    const code = PedalMarking.GLYPHS.pedal_release.code;
    if (typeof Glyph.cachedWidth === 'function') {
      return Glyph.cachedWidth(code, point);
    }
    return new Glyph(code, point).getMetrics().width;
  }

  // Render the pedal marking in position on the rendering context
  draw() {
    const ctx = this.checkContext();
    this.setRendered();

    ctx.save();
    ctx.setStrokeStyle(this.render_options.color);
    ctx.setFillStyle(this.render_options.color);
    ctx.setFont(this.font.family, this.font.size, this.font.weight);

    L('Rendering Pedal Marking');

    if (this.style === PedalMarking.Styles.BRACKET || this.style === PedalMarking.Styles.MIXED || this.style === PedalMarking.Styles.MIXED_OPEN_END ||
        this.style === PedalMarking.Styles.BRACKET_OPEN_BEGIN || this.style === PedalMarking.Styles.BRACKET_OPEN_END || this.style === PedalMarking.Styles.BRACKET_OPEN_BOTH) {
      ctx.setLineWidth(this.render_options.bracket_line_width);
      this.drawBracketed();
    } else if (this.style === PedalMarking.Styles.TEXT) {
      this.drawText();
    }

    ctx.restore();
  }
}
