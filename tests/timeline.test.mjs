import test from 'node:test';
import assert from 'node:assert/strict';
import { loadStory } from '../scripts/load-story.mjs';
const { STORY, STARTS, TOTAL_UNITS, chapterWindow, chapterProgress, captionAt, transitionAt, TimelineController } = await loadStory();

test('all authored captions are reachable after their page turn and held until the next beat', () => {
  assert.equal(TOTAL_UNITS, 35);
  STORY.forEach((chapter, index) => {
    const { start, end } = chapterWindow(index);
    assert.ok(end > start);
    assert.equal(chapterProgress(start, index), 0);
    assert.equal(chapterProgress(end, index), 1);
    for (let i = 0; i < chapter.captions.length; i++) {
      const cue = chapter.captions[i];
      const next = chapter.captions[i + 1];
      const progress = (cue.from + (next?.from ?? 1)) / 2;
      const time = start + (end - start) * progress;
      assert.equal(transitionAt(time).active, false, cue.id);
      assert.equal(captionAt(time).cue?.id, cue.id, cue.id);
      if (next && cue.to < next.from) {
        const gap = (cue.to + next.from) / 2;
        assert.equal(captionAt(start + (end - start) * gap).cue?.id, cue.id, 'Keep text readable in the old blank gaps');
      }
    }
  });
});

test('page transitions hold chapter endpoints and do not show a caption on the wrong scene', () => {
  STORY.forEach((chapter, index) => {
    if (!index || chapter.transition.kind === 'cut') return;
    const midpoint = STARTS[index];
    assert.ok(transitionAt(midpoint).active);
    assert.equal(chapterProgress(midpoint, index), 0);
    assert.equal(chapterProgress(midpoint, index - 1), 1);
    assert.equal(captionAt(midpoint).cue, null);
  });
});

test('backward scrolling resolves identical chapter progress and captions', () => {
  const times = Array.from({ length: 1401 }, (_, i) => i / 40);
  const snapshot = (t) => {
    const { cue, index, progress } = captionAt(t);
    return [index, progress, cue?.id ?? null];
  };
  const forwards = times.map(snapshot);
  assert.deepEqual(times.toReversed().map(snapshot).toReversed(), forwards);
  const timeline = new TimelineController();
  timeline.set(12);
  const value = timeline.update(0, 900, .016);
  assert.ok(value < 12 && value > 0);
  assert.equal(timeline.direction(), -1);
});
