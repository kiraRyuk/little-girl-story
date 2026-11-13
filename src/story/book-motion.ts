const ease = (value: number, from: number, to: number) => {
  const t = Math.max(0, Math.min(1, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

export function bookPose(progress: number, closing: boolean) {
  const p = Math.max(0, Math.min(1, closing ? 1 - progress : progress));
  return {
    // Hold a real closed cover through the automatic introductory movement.
    open: ease(p, .34, .56),
    leaves: [0, 1, 2].map((i) => ease(p, .57 + i * .06, .72 + i * .06)),
    zoom: ease(p, .79, 1),
  };
}
