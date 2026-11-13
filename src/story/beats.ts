/** Shared story beats, expressed in chapter-content progress (outside page turns). */
export const BEATS = {
  street: { carriage: .52, passed: .7 },
  stove: { strike: .14, lit: .26, out: .8, dark: .91 },
  goose: { strike: .1, revealed: .34, approach: .62, arrived: .8, out: .88 },
  tree: { strike: .12, rise: .42, stars: .7, fall: .78, fallen: .98 },
  grandmother: { appear: .08, present: .26, bundle: .57, lift: .65, lifted: 1 },
} as const;

export const beatProgress = (value: number, from: number, to: number): number => {
  const t = Math.max(0, Math.min(1, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
};
