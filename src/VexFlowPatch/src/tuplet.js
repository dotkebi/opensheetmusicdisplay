// [VexFlow](http://vexflow.com) - Copyright (c) Mohit Muthanna 2010.

/**
 * ## Description
 *
 * Create a new tuplet from the specified notes. The notes must
 * be part of the same voice. If they are of different rhythmic
 * values, then options.num_notes must be set.
 *
 * @constructor
 * @param {Array.<Vex.Flow.StaveNote>} A set of notes: staveNotes,
 *   notes, etc... any class that inherits stemmableNote at some
 *   point in its prototype chain.
 * @param options: object {
 *
 *   num_notes: fit this many notes into...
 *   notes_occupied: ...the space of this many notes
 *
 *       Together, these two properties make up the tuplet ratio
 *     in the form of num_notes : notes_occupied.
 *       num_notes defaults to the number of notes passed in, so
 *     it is important that if you omit this property, all of
 *     the notes passed should be of the same note value.
 *       notes_occupied defaults to 2 -- so you should almost
 *     certainly pass this parameter for anything other than
 *     a basic triplet.
 *
 *   location:
 *     default 1, which is above the notes: ┌─── 3 ───┐
 *      -1 is below the notes └─── 3 ───┘
 *
 *   bracketed: boolean, draw a bracket around the tuplet number
 *     when true: ┌─── 3 ───┐   when false: 3
 *     defaults to true if notes are not beamed, false otherwise
 *
 *   ratioed: boolean
 *     when true: ┌─── 7:8 ───┐, when false: ┌─── 7 ───┐
 *     defaults to true if the difference between num_notes and
 *     notes_occupied is greater than 1.
 *
 *   y_offset: int, default 0
 *     manually offset a tuplet, for instance to avoid collisions
 *     with articulations, etc...
 * }
 */

 import { Vex } from './vex';
 import { Element } from './element';
 import { Formatter } from './formatter';
 import { Glyph } from './glyph';
 import { Flow } from './tables';
 import { Modifier } from './modifier';
 import { Stem } from './stem';

 // VexFlowPatch: the heights (px) VexFlow 5 (vexflow-dart 0355ee4) gives the articulations' glyphs
 //   (Articulation.getHeight()), which its Articulation.format() turns into text lines (see Tuplet.modifierTextLines()).
 //   VexFlow 1.2.93's glyphs are shorter (a staccato 3.7 against 5.1), which takes a line less after the rounding.
 const VF5_ARTICULATION_HEIGHTS = {
   'a.': 5.054, 'av': 7.441, 'a>': 9.21, 'a-': 1.236, 'a^': 11.12, 'a+': 12.748, 'ao': 12.721, 'ah': 6.626,
   'a@a': 14.265, 'a@u': 14.265, 'a|': 11.176, 'am': 14.265, 'a,': 12.58, 'abr': 12.58,
 };
 
 export class Tuplet extends Element {
   static get LOCATION_TOP() {
     return 1;
   }
   static get LOCATION_BOTTOM() {
     return -1;
   }
   static get NESTING_OFFSET() {
     return 15;
   }
 
   constructor(notes, options) {
     super();
     this.setAttribute('type', 'Tuplet');
     if (!notes || !notes.length) {
       throw new Vex.RuntimeError('BadArguments', 'No notes provided for tuplet.');
     }
 
     this.options = Vex.Merge({}, options);
     this.notes = notes;
     this.num_notes = 'num_notes' in this.options ?
       this.options.num_notes : notes.length;
 
     // We accept beats_occupied, but warn that it's deprecated:
     // the preferred property name is now notes_occupied.
     if (this.options.beats_occupied) {
       this.beatsOccupiedDeprecationWarning();
     }
     this.notes_occupied = this.options.notes_occupied ||
       this.options.beats_occupied ||
       2;
     if ('bracketed' in this.options) {
       this.bracketed = this.options.bracketed;
     } else {
       this.bracketed =
         notes.some(note => note.beam === null);
     }
 
     this.ratioed = 'ratioed' in this.options ?
       this.options.ratioed :
       (Math.abs(this.notes_occupied - this.num_notes) > 1);
     this.point = 28;
     this.y_pos = 16;
     this.x_pos = 100;
     this.width = 200;
     this.location = this.options.location || Tuplet.LOCATION_TOP;
 
     Formatter.AlignRestsToNotes(notes, true, true);
     this.resolveGlyphs();
     this.attach();
   }
 
   attach() {
     for (let i = 0; i < this.notes.length; i++) {
       const note = this.notes[i];
       note.setTuplet(this);
     }
   }
 
   detach() {
     for (let i = 0; i < this.notes.length; i++) {
       const note = this.notes[i];
       note.resetTuplet(this);
     }
   }
 
   /**
    * Set whether or not the bracket is drawn.
    */
   setBracketed(bracketed) {
     this.bracketed = !!bracketed;
     return this;
   }
 
   /**
    * Set whether or not the ratio is shown.
    */
   setRatioed(ratioed) {
     this.ratioed = !!ratioed;
     return this;
   }
 
   /**
    * Set the tuplet to be displayed either on the top or bottom of the stave
    */
   setTupletLocation(location) {
     if (!location) {
       location = Tuplet.LOCATION_TOP;
     } else if (location !== Tuplet.LOCATION_TOP && location !== Tuplet.LOCATION_BOTTOM) {
       throw new Vex.RERR('BadArgument', 'Invalid tuplet location: ' + location);
     }
 
     this.location = location;
     return this;
   }
 
   getNotes() {
     return this.notes;
   }
 
   getNoteCount() {
     return this.num_notes;
   }
 
   beatsOccupiedDeprecationWarning() {
     const msg = [
       'beats_occupied has been deprecated as an ',
       'option for tuplets. Please use notes_occupied ',
       'instead. Calls to getBeatsOccupied and ',
       'setBeatsOccupied should now be routed to ',
       'getNotesOccupied and setNotesOccupied instead',
     ].join('');
 
     if (console && console.warn) { // eslint-disable-line no-console
       console.warn(msg); // eslint-disable-line no-console
     } else if (console) {
       console.log(msg); // eslint-disable-line no-console
     }
   }
 
   getBeatsOccupied() {
     this.beatsOccupiedDeprecationWarning();
     return this.getNotesOccupied();
   }
 
   setBeatsOccupied(beats) {
     this.beatsOccupiedDeprecationWarning();
     return this.setNotesOccupied(beats);
   }
 
   getNotesOccupied() {
     return this.notes_occupied;
   }
 
   setNotesOccupied(notes) {
     this.detach();
     this.notes_occupied = notes;
     this.resolveGlyphs();
     this.attach();
   }
 
   resolveGlyphs() {
     this.numerator_glyphs = [];
     let n = this.num_notes;
     while (n >= 1) {
       this.numerator_glyphs.unshift(new Glyph('v' + (n % 10), this.point));
       n = parseInt(n / 10, 10);
     }
 
     this.denom_glyphs = [];
     n = this.notes_occupied;
     while (n >= 1) {
       this.denom_glyphs.unshift(new Glyph('v' + (n % 10), this.point));
       n = parseInt(n / 10, 10);
     }
   }
 
   // determine how many tuplets are nested within this tuplet
   // on the same side (above/below), to calculate a y
   // offset for this tuplet:
   getNestedTupletCount() {
     const location = this.location;
     const first_note = this.notes[0];
     let maxTupletCount = countTuplets(first_note, location);
     let minTupletCount = countTuplets(first_note, location);
 
     // Count the tuplets that are on the same side (above/below)
     // as this tuplet:
     function countTuplets(note, location) {
       return note.tupletStack.filter(tuplet => tuplet.location === location).length;
     }
 
     this.notes.forEach(note => {
       const tupletCount = countTuplets(note, location);
       maxTupletCount = tupletCount > maxTupletCount ? tupletCount : maxTupletCount;
       minTupletCount = tupletCount < minTupletCount ? tupletCount : minTupletCount;
     });
 
     return maxTupletCount - minTupletCount;
   }
 
   // VexFlowPatch: the text lines (in staff spaces) that the modifiers over (top) and under (bottom) the notes at a note's
   //   time on its stave take, counted as VexFlow 5 counts them in that time's ModifierContext (its state's topTextLine and
   //   textLine), which its Tuplet.getYPosition() reads: the fingerings (FretHandFinger.format(): font size 9 px and half a
   //   line each), then the articulations (Articulation.format(): their glyph height in lines and a margin of half a line,
   //   rounded to a half line, and the lines from the note to the staff's outer line for one that can't sit between the lines),
   //   then the ornaments (Ornament.format(): 2 lines each, from the staff's outer line). VexFlow 1.2.93 counts them its own way
   //   (no staff lines, other glyph heights) and its tuplets didn't look at them, so a number over the notes sat on an accent or a
   //   staccato (Lalo, Symphonie espagnole I, violin m67; Mozart, K.313 III, flute m245) that VexFlow 5 (osmd-dart) puts it 2
   //   spaces over. Only the notes on the note's stave count (OSMD joins the voices of each stave apart, so the context has
   //   only those, but a VexFlow 5 context is per stave in any case). As in vexflow-dart (tuplet.dart getYPosition()).
   static modifierTextLines(note) {
     const lines = { top: 0, bottom: 0 };
     const context = note.modifierContext; // (1.2.93 has no getModifierContext())
     if (!context || !context.getModifiers) {
       return lines;
     }
     const stave = note.getStave();
     const members = category => (context.getModifiers(category) || []).filter(modifier => {
       const attached = modifier.getNote ? modifier.getNote() : undefined;
       return attached && attached.getStave() === stave;
     });
     const staffLines = attached => attached.getStave() ? attached.getStave().getNumLines() : 5;
     const stemHeight = attached => {
       const stem = attached.getStem ? attached.getStem() : undefined;
       return stem ? Math.abs(stem.getHeight()) / 10 : 0;
     };
     const stemDirection = attached => attached.hasStem() ? attached.getStemDirection() : Stem.UP;
     const lineNumber = (attached, top) => attached.getLineNumber ? attached.getLineNumber(top) : 0;

     members('frethandfingers').forEach(fingering => {
       if (fingering.getPosition() === Modifier.Position.ABOVE) {
         lines.top += 9 / 10 + 0.5;
       } else if (fingering.getPosition() === Modifier.Position.BELOW) {
         lines.bottom += 9 / 10 + 0.5;
       }
     });

     // to a half line: up (down under the notes) while the text line is at most 5 (at least 1), else to the nearest (VexFlow 5
     //   getRoundingFunction())
     const increment = (articulation, line, above) => {
       const within = above ? line <= 5 : line >= 1;
       const round = within ? (above ? Math.ceil : Math.floor) : Math.round;
       const type = /^abr/.test(articulation.type) ? 'abr' : articulation.type;
       const height = VF5_ARTICULATION_HEIGHTS[type] !== undefined ? VF5_ARTICULATION_HEIGHTS[type]
         : articulation.glyph.getMetrics().height;
       return round((height / 10 + 0.5) / 0.5) * 0.5;
     };
     members('articulations').forEach(articulation => {
       const attached = articulation.getNote();
       const numLines = staffLines(attached);
       const codes = Flow.articulationCodes(articulation.type);
       const betweenLines = !!(codes && codes.between_lines);
       if (articulation.getPosition() === Modifier.Position.ABOVE) {
         let noteLine = lineNumber(attached, true);
         if (stemDirection(attached) === Stem.UP) {
           noteLine += stemHeight(attached);
         }
         let add = increment(articulation, lines.top, true);
         const curTop = noteLine + lines.top + 0.5;
         if (!betweenLines && curTop < numLines) {
           add += numLines - curTop;
         }
         lines.top += add;
       } else if (articulation.getPosition() === Modifier.Position.BELOW) {
         let noteLine = Math.max(numLines - lineNumber(attached), 0);
         if (stemDirection(attached) === Stem.DOWN) {
           noteLine += stemHeight(attached);
         }
         let add = increment(articulation, lines.bottom, false);
         const curBottom = noteLine + lines.bottom + 0.5;
         if (!betweenLines && curBottom < numLines) {
           add += numLines - curBottom;
         }
         lines.bottom += add;
       }
     });

     members('ornaments').forEach(ornament => {
       const attached = ornament.getNote();
       const position = ornament.getPosition();
       if (position === Modifier.Position.LEFT || position === Modifier.Position.RIGHT) {
         return;
       }
       if (position === Modifier.Position.ABOVE) {
         let currentTop = lineNumber(attached, true) + lines.top;
         if (attached.getStem && attached.getStem() && attached.getStemDirection() === Stem.UP) {
           currentTop += stemHeight(attached);
         }
         const numLines = staffLines(attached);
         if (currentTop < numLines) {
           lines.top += numLines - currentTop;
         }
         lines.top += 2;
       } else {
         lines.bottom += 2;
       }
     });
     return lines;
   }

   // determine the y position of the tuplet:
   getYPosition() {
     // offset the tuplet for any nested tuplets between
     // it and the notes:
     const nested_tuplet_y_offset =
       this.getNestedTupletCount() *
       Tuplet.NESTING_OFFSET *
       -this.location;
 
     // offset the tuplet for any manual y_offset:
     const y_offset = this.options.y_offset || 0;
 
     // now iterate through the notes and find our highest
     // or lowest locations, to form a base y_pos
     const first_note = this.notes[0];
     let y_pos;
     if (this.location === Tuplet.LOCATION_TOP) {
       y_pos = first_note.getStave().getYForLine(0) - 15;
       // y_pos = first_note.getStemExtents().topY - 10;
 
       for (let i = 0; i < this.notes.length; ++i) {
         const top_y = this.notes[i].getStemDirection() === Stem.UP
           ? this.notes[i].getStemExtents().topY - 10
           : this.notes[i].getStemExtents().baseY - 20;
 
         if (top_y < y_pos) {
           y_pos = top_y;
         }
         // VexFlowPatch: 2 spaces over the text lines of the modifiers over the notes at this note's time, as VexFlow 5
         //   (see modifierTextLines())
         const note = this.notes[i];
         const mod_lines = Tuplet.modifierTextLines(note).top;
         if (mod_lines > 0 && (note.hasStem() || note.isRest())) {
           y_pos = Math.min(y_pos, note.getYForTopText(mod_lines) - 20);
         }
       }
     } else {
       // VexFlowPatch: under the text lines of the modifiers under the notes, as VexFlow 5 (see modifierTextLines())
       let line_check = 4;
       for (const note of this.notes) {
         line_check = Math.max(line_check, Tuplet.modifierTextLines(note).bottom + 1);
       }
       y_pos = first_note.getStave().getYForLine(line_check) + 20;
 
       for (let i = 0; i < this.notes.length; ++i) {
         const bottom_y = this.notes[i].getStemDirection() === Stem.UP
           ? this.notes[i].getStemExtents().baseY + 20
           : this.notes[i].getStemExtents().topY + 10;
         if (bottom_y > y_pos) {
           y_pos = bottom_y;
         }
       }
     }
 
     return y_pos + nested_tuplet_y_offset + y_offset;
   }
 
   draw() {
     this.checkContext();
     this.setRendered();
 
     // determine x value of left bound of tuplet
     const first_note = this.notes[0];
     const last_note = this.notes[this.notes.length - 1];
 
     if (!this.bracketed) {
       this.x_pos = first_note.getStemX();
       this.width = last_note.getStemX() - this.x_pos;
     } else {
       this.x_pos = first_note.getTieLeftX() - 5;
       this.width = last_note.getTieRightX() - this.x_pos + 5;
     }
 
     // determine y value for tuplet
     this.y_pos = this.getYPosition();
 
     const addGlyphWidth = (width, glyph) => width + glyph.getMetrics().width;
 
     // calculate total width of tuplet notation
     let width = this.numerator_glyphs.reduce(addGlyphWidth, 0);
     if (this.ratioed) {
       width = this.denom_glyphs.reduce(addGlyphWidth, width);
       width += this.point * 0.32;
     }
 
     // VexFlowPatch: an unbracketed number can be moved from the middle of the stems, e.g. to the middle of the
    //   noteheads when it is on their side (OSMD VexFlowMeasure.tupletNumberHeadShift())
    const notation_center_x = this.x_pos + (this.width / 2) + (this.bracketed ? 0 : this.numberXShift || 0);
     const notation_start_x = notation_center_x - (width / 2);
 
     // draw bracket if the tuplet is not beamed
     if (this.bracketed) {
       const line_width = this.width / 2 - width / 2 - 5;
 
       // only draw the bracket if it has positive length
       if (line_width > 0) {
         this.context.fillRect(this.x_pos, this.y_pos, line_width, 1);
         this.context.fillRect(
           this.x_pos + this.width / 2 + width / 2 + 5,
           this.y_pos,
           line_width,
           1
         );
         this.context.fillRect(
           this.x_pos,
           this.y_pos + (this.location === Tuplet.LOCATION_BOTTOM),
           1,
           this.location * 10
         );
         this.context.fillRect(
           this.x_pos + this.width,
           this.y_pos + (this.location === Tuplet.LOCATION_BOTTOM),
           1,
           this.location * 10
         );
       }
     }
 
     // VexFlowPatch: add option to not render tuplet numbers
     let x_offset = 0;
     if (this.RenderTupletNumber !== false) {
         // draw numerator glyphs
         this.numerator_glyphs.forEach(glyph => {
           glyph.render(this.context, notation_start_x + x_offset, this.y_pos + (this.point / 3) - 2);
           x_offset += glyph.getMetrics().width;
         });
     }
 
     // display colon and denominator if the ratio is to be shown
     if (this.ratioed) {
       const colon_x = notation_start_x + x_offset + this.point * 0.16;
       const colon_radius = this.point * 0.06;
       this.context.beginPath();
       this.context.arc(colon_x, this.y_pos - this.point * 0.08, colon_radius, 0, Math.PI * 2, true);
       this.context.closePath();
       this.context.fill();
       this.context.beginPath();
       this.context.arc(colon_x, this.y_pos + this.point * 0.12, colon_radius, 0, Math.PI * 2, true);
       this.context.closePath();
       this.context.fill();
       x_offset += this.point * 0.32;
       this.denom_glyphs.forEach(glyph => {
         glyph.render(this.context, notation_start_x + x_offset, this.y_pos + (this.point / 3) - 2);
         x_offset += glyph.getMetrics().width;
       });
     }
   }
 }
 