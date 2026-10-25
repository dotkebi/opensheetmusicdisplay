// [VexFlow](http://vexflow.com) - Copyright (c) Mohit Muthanna 2010.
// Author: Balazs Forian-Szabo
//
// ## Description
//
// This file implements `VibratoBrackets`
// that renders vibrato effect between two notes.

import { Vex } from './vex';
import { Element } from './element';
import { Vibrato } from './vibrato';
import { Modifier } from './modifier';

// To enable logging for this class. Set `Vex.Flow.VibratoBracket.DEBUG` to `true`.
function L(...args) { if (VibratoBracket.DEBUG) Vex.L('Vex.Flow.VibratoBracket', args); }

export class VibratoBracket extends Element {
  // bracket_data = {
  //   start: Vex.Flow.Note (optional)
  //   stop: Vex.Flow.Note (optional)
  // };
  // Either the stop or start note must be set, or both of them.
  // A null value for the start or stop note indicates that the vibrato
  // is drawn from the beginning or until the end of the stave accordingly.
  constructor(bracket_data) {
    super();
    this.setAttribute('type', 'VibratoBracket');

    this.start = bracket_data.start;
    this.stop = bracket_data.stop;
    //VexFlowPatch: Needed an option to render to the end of the stop note stave vs. the stop note itself
    this.toEndOfStopStave = bracket_data.toEndOfStopStave;
    //VexFlowPatch: option to render up to this note, e.g. the note after the stop note, to cover the stop note's whole duration
    this.stopBeforeNote = bracket_data.stopBeforeNote;
    //VexFlowPatch: option to end in front of the stop note itself, before its modifiers and its own trill mark's ink: the
    //  stop note starts a trill of its own (Weber Op.74 III m236·237, Schubert Ganymed piano m57)
    this.stopBeforeEndNote = bracket_data.stopBeforeEndNote;

    this.line = 1;

    this.render_options = {
      harsh: false,
      wave_height: 6,
      wave_width: 4,
      wave_girth: 2,
    };
  }

  // VexFlowPatch: where a bracket ends in front of a note (stopBeforeEndNote), in pixels: left of the note's modifiers
  //   (accidentals, grace notes), and of its trill mark's ink where that reaches further left (ornament.js layoutInk)
  static stopBeforeNoteX(note) {
    const metrics = note.getMetrics();
    let x = note.getAbsoluteX() - metrics.modLeftPx - metrics.extraLeftPx - 5;
    const ink = VibratoBracket.trillMarkInkPx(note);
    if (ink) {
      x = Math.min(x, ink.left - 3);
    }
    return x;
  }

  // VexFlowPatch: the ink of a note's trill mark as the layout drew it (ornament.js layoutInk, relative to the stave's
  //   left edge and top line), in absolute pixels, or undefined
  static trillMarkInkPx(note) {
    for (const modifier of note.modifiers) {
      if (modifier && modifier.type === 'tr' && modifier.layoutInk && modifier.position === Modifier.Position.ABOVE) {
        const stave = note.getStave();
        const ink = modifier.layoutInk;
        return {
          left: stave.getX() + ink.left,
          top: stave.getYForLine(0) + ink.top,
          right: stave.getX() + ink.right,
          bottom: stave.getYForLine(0) + ink.bottom,
        };
      }
    }
    return undefined;
  }

  // Set line position of the vibrato bracket
  setLine(line) { this.line = line; return this; }
  setHarsh(harsh) { this.render_options.harsh = harsh; return this; }

  // Draw the vibrato bracket on the rendering context
  draw() {
    const ctx = this.context;
    this.setRendered();
    const y = (this.start)
      ? this.start.getStave().getYForTopText(this.line)
      : this.stop.getStave().getYForTopText(this.line);

    // If start note is not set then vibrato will be drawn
    // from the beginning of the stave
    let start_x = 0;
    if(this.start) {
        let trillOffset = 0;
        // VexFlowPatch: If we have a trill mark accompanying, need to allow space for it
        for(const modifier of this.start.modifiers) {
          if(modifier && modifier.type === "tr") {
            trillOffset = modifier.glyph.bbox.w;
            break;
          }
        }
        start_x = this.start.getNoteHeadBeginX ? this.start.getNoteHeadBeginX() : this.start.getAbsoluteX();
        start_x += trillOffset;
    } else {
        start_x = this.stop.getStave().getTieStartX();
    }
    // If stop note is not set then vibrato will be drawn
    // until the end of the stave
    let stop_x = 0;

    if(this.stop) {
      if (this.stopBeforeEndNote) {
        stop_x = VibratoBracket.stopBeforeNoteX(this.stop);
      } else if (this.toEndOfStopStave) {
        stop_x = this.stop.getStave().getTieEndX() - 10;
      } else if (this.stopBeforeNote) {
        // VexFlowPatch: Render up to the stopBeforeNote, in front of its modifiers (e.g. accidentals, grace notes)
        const metrics = this.stopBeforeNote.getMetrics();
        stop_x = this.stopBeforeNote.getAbsoluteX() - metrics.modLeftPx - metrics.extraLeftPx - 5;
      } else {
        // VexFlowPatch: Render to the end of the stop note, instead of before it
        //   getWidth() also counts what is left of the note: modifiers like accidentals, grace notes and the left half of a fermata,
        //   also of the staff's other notes at this position, and note heads displaced to the left
        const metrics = this.stop.getMetrics();
        stop_x = this.stop.getAbsoluteX() + this.stop.getWidth() - metrics.modLeftPx - metrics.extraLeftPx;
      }
    } else {
      stop_x = this.start.getStave().getTieEndX() - 10;
    }

    this.render_options.vibrato_width = stop_x - start_x;

    L('Rendering VibratoBracket: start_x:', start_x, 'stop_x:', stop_x, 'y:', y);

    Vibrato.renderVibrato(ctx, start_x, y, this.render_options);
  }
}