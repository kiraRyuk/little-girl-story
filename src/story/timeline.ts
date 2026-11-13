import type { ChapterDefinition, TransitionState } from "./types";
import { BEATS } from "./beats";

export const STORY: ChapterDefinition[] = [
  { id: "book", title: "The book", duration: 3.5, transition: { kind: "cut", length: 0 }, captions: [{ id: "book-open", from: .2, to: .8, text: "The Little Match Girl. A tale by Hans Christian Andersen." }], ambience: { wind: .12 }, grade: { contrast: 1.02, saturation: .55, grain: .003, vignette: .18 }, portals: ["city"] },
  { id: "city", title: "The town", duration: 2.5, transition: { kind: "cut", length: 0 }, captions: [{ id: "city-snow", from: .07, to: .42, text: "Snow fell as darkness settled over the town." }, { id: "city-year", from: .5, to: .86, text: "It was New Year’s Eve, the last evening of the year." }], ambience: { wind: .78 }, grade: { contrast: 1.08, vignette: .44 } },
  { id: "street", title: "The street", duration: 3.5, transition: { kind: "page", length: 1.3 }, captions: [{ id: "street-walk", from: .03, to: .18, text: "A poor little girl walked through the streets, bareheaded and barefoot." }, { id: "street-shoes", from: .2, to: .39, text: "She had worn her mother’s slippers, but they were much too large." }, { id: "street-carriage", from: BEATS.street.carriage, to: .7, text: "Two carriages rushed past. As she ran across the road, she lost both slippers." }, { id: "street-lost", from: .76, to: .96, text: "One vanished in the snow. A boy ran away with the other." }], cues: [{ at: BEATS.street.carriage, id: "rush" }], ambience: { wind: .72 }, grade: { contrast: 1.12, vignette: .48 } },
  { id: "matches", title: "The matches", duration: 2.5, transition: { kind: "page", length: 1.3 }, captions: [{ id: "matches-bundle", from: .05, to: .32, text: "She carried matches in her apron and held a small bundle in her hand." }, { id: "matches-wait", from: .38, to: .76, text: "Nobody had bought a match all day. Nobody had given her a penny." }], ambience: { wind: .56 }, grade: { contrast: 1.08, vignette: .5 } },
  { id: "corner", title: "The corner", duration: 3, transition: { kind: "page", length: 1.3 }, captions: [{ id: "corner-lights", from: .04, to: .28, text: "Light shone from the windows. The smell of roast goose drifted into the street." }, { id: "corner-sit", from: .38, to: .62, text: "She huddled between two houses. She dared not go home without money; her father would beat her." }, { id: "corner-match", from: .72, to: .96, text: "Her hands were numb. Perhaps one little match could warm her fingers." }], ambience: { wind: .72 }, grade: { contrast: 1.12, vignette: .46 } },
  { id: "stove", title: "The stove", duration: 3, transition: { kind: "ink", length: .8 }, captions: [{ id: "stove-flame", from: BEATS.stove.strike, to: .35, text: "She struck a match. In its light, a great iron stove appeared." }, { id: "stove-warmth", from: .42, to: .72, text: "The fire burned beautifully. She stretched out her feet to warm them." }, { id: "stove-out", from: BEATS.stove.out, to: .98, text: "The flame went out. The stove vanished. Only the burnt match remained." }], cues: [{ at: BEATS.stove.strike, id: "strike" }, { at: BEATS.stove.out, id: "out" }], ambience: { wind: .3, crackle: .2 }, grade: { contrast: 1.05, saturation: .65, glow: .16, vignette: .3 } },
  { id: "goose", title: "The feast", duration: 3.5, transition: { kind: "page", length: 1.3 }, captions: [{ id: "feast-wall", from: BEATS.goose.strike, to: .3, text: "She struck another match. The wall became as thin as a veil." }, { id: "feast-table", from: BEATS.goose.revealed, to: .56, text: "Beyond it stood a table laid with fine china and a steaming roast goose." }, { id: "feast-visit", from: BEATS.goose.approach, to: .88, text: "The goose jumped from its dish and waddled toward her. Then the match went out, and the wall was cold again." }], cues: [{ at: BEATS.goose.strike, id: "strike" }, { at: BEATS.goose.out, id: "out" }], ambience: { wind: .4, crackle: .28 }, grade: { contrast: 1.02, saturation: .65, glow: .22, vignette: .28 } },
  { id: "tree", title: "The tree", duration: 3.5, transition: { kind: "page", length: 1.3 }, captions: [{ id: "tree-lights", from: BEATS.tree.strike, to: .36, text: "A third match showed her a magnificent Christmas tree, lit with thousands of candles." }, { id: "tree-stars", from: BEATS.tree.rise, to: .7, text: "She reached toward it. The match faded, and its candles rose into the sky as stars." }, { id: "tree-fall", from: BEATS.tree.fall, to: .98, text: "A star fell. Her grandmother had told her: when a star falls, a soul goes up to God." }], cues: [{ at: BEATS.tree.strike, id: "strike" }, { at: BEATS.tree.rise, id: "out" }], ambience: { wind: .28, crackle: .12 }, grade: { contrast: 1.04, saturation: .65, glow: .18, vignette: .3 } },
  { id: "grandmother", title: "The embrace", duration: 4, transition: { kind: "page", length: 1.3 }, captions: [{ id: "embrace-seen", from: BEATS.grandmother.appear, to: .26, text: "In the fourth match’s glow stood her grandmother, the only person who had ever been kind to her." }, { id: "embrace-ask", from: .29, to: .45, kind: "speech", text: "“Grandmother, take me with you! You will disappear when the match goes out!”" }, { id: "embrace-flight", from: BEATS.grandmother.bundle, to: .8, text: "She struck the whole bundle to keep her grandmother there. Her grandmother lifted her into her arms." }, { id: "embrace-safe", from: .86, to: 1, text: "They rose together in brightness and joy, to where there was no cold, no hunger, and no fear." }], cues: [{ at: BEATS.grandmother.appear, id: "strike" }, { at: BEATS.grandmother.bundle, id: "strike" }], ambience: { wind: .28, crackle: .12 }, grade: { contrast: .92, exposure: 1.12, saturation: .65, glow: .28, vignette: .18 } },
  { id: "morning", title: "The morning", duration: 3, transition: { kind: "cut", length: 0 }, captions: [{ id: "morning-found", from: .06, to: .3, text: "Morning found the little girl in the corner, her cheeks rosy and a smile on her lips. She had frozen to death." }, { id: "morning-voices", from: .38, to: .66, kind: "speech", text: "“She was trying to warm herself,” the passersby said, seeing the burnt matches." }, { id: "morning-kindness", from: .76, to: .97, text: "None of them knew what beautiful things she had seen, or the joy in which she had gone with her grandmother." }], ambience: { wind: .28 }, grade: { contrast: .94, exposure: 1.12, vignette: .3 } },
  { id: "close", title: "The last page", duration: 3, transition: { kind: "cut", length: 0 }, captions: [{ id: "close-page", from: .28, to: .68, text: "The Little Match Girl. Hans Christian Andersen, 1845." }], ambience: { wind: .16 }, grade: { contrast: 1, exposure: 1, saturation: .55, grain: .003, vignette: .18 }, portals: ["morning"] },
];

export const TOTAL_UNITS = STORY.reduce((sum, chapter) => sum + chapter.duration, 0);
export const STARTS = STORY.map((_, index) => STORY.slice(0, index).reduce((sum, chapter) => sum + chapter.duration, 0));

export const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));
export const smoothstep = (value: number): number => value * value * (3 - 2 * value);

/** Content plays between page turns, rather than underneath them. */
export function chapterWindow(index: number): { start: number; end: number } {
  const chapter = STORY[index]!;
  const incoming = chapter.transition?.kind === "cut" ? 0 : (chapter.transition?.length ?? 0);
  const next = STORY[index + 1]?.transition;
  const outgoing = next?.kind === "cut" ? 0 : (next?.length ?? 0);
  return { start: STARTS[index]! + incoming / 2, end: STARTS[index]! + chapter.duration - outgoing / 2 };
}

export function chapterProgress(time: number, index: number): number {
  const { start, end } = chapterWindow(index);
  return clamp((time - start) / Math.max(.001, end - start));
}

export function captionAt(time: number) {
  const transition = transitionAt(time);
  const index = transition.progress >= .5 ? transition.toIndex : transition.fromIndex;
  const progress = chapterProgress(time, index);
  // Never overlay a caption from one illustration on a turning page from another.
  if (transition.active) return { cue: null, index, progress };
  let cue: ChapterDefinition["captions"][number] | null = null;
  for (const candidate of STORY[index]!.captions) {
    if (progress < candidate.from) break;
    cue = candidate;
  }
  return { cue, index, progress };
}

export function transitionAt(time: number): TransitionState {
  for (let index = 1; index < STORY.length; index += 1) {
    const chapter = STORY[index];
    const transition = chapter.transition ?? { kind: "ink" as const, length: .8 };
    if (transition.kind === "cut" || transition.length <= 0) continue;
    const start = STARTS[index];
    if (Math.abs(time - start) <= transition.length / 2) {
      const local = clamp((time - (start - transition.length / 2)) / transition.length);
      return { fromIndex: index - 1, toIndex: index, progress: smoothstep(local), kind: transition.kind, active: true };
    }
  }
  let index = 0;
  for (let candidate = 1; candidate < STARTS.length; candidate += 1) {
    if (time < STARTS[candidate]!) break;
    index = candidate;
  }
  return { fromIndex: index, toIndex: index, progress: 0, kind: "cut", active: false };
}

export class TimelineController {
  time = 0;
  target = 0;
  previous = 0;

  update(scrollY: number, viewportHeight: number, delta: number): number {
    this.previous = this.time;
    this.target = clamp(scrollY / Math.max(1, viewportHeight), 0, TOTAL_UNITS);
    this.time += (this.target - this.time) * (1 - Math.exp(-6 * Math.min(delta, .1)));
    if (Math.abs(this.target - this.time) < 1e-4) this.time = this.target;
    return this.time;
  }

  set(time: number): void {
    this.previous = this.time;
    this.time = this.target = clamp(time, 0, TOTAL_UNITS);
  }

  direction(): -1 | 0 | 1 {
    const difference = this.time - this.previous;
    return difference > 1e-5 ? 1 : difference < -1e-5 ? -1 : 0;
  }
}
