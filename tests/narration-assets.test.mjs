import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { loadStory } from '../scripts/load-story.mjs';

test('every chapter has an intact PCM narration track matching its current text', async () => {
  const root = new URL('../', import.meta.url);
  const { STORY } = await loadStory();
  const manifest = JSON.parse(await readFile(new URL('docs/narration-manifest.json', root), 'utf8'));
  assert.deepEqual(manifest.tracks.map((track) => track.id), STORY.map((chapter) => chapter.id));
  const files = await readdir(new URL('src/assets/narration/', root));
  assert.equal(files.filter((name) => /\.(wav|mp3|ogg)$/.test(name)).length, STORY.length);
  for (const [index, track] of manifest.tracks.entries()) {
    assert.equal(track.text, STORY[index].captions.map(({ text }) => text).join(' '), `Stale narration text: ${track.id}`);
    const buffer = await readFile(new URL(`src/assets/narration/${track.file}`, root));
    assert.equal(buffer.length, track.bytes);
    assert.equal(createHash('sha256').update(buffer).digest('hex'), track.sha256);
    assert.equal(buffer.toString('ascii', 0, 4), 'RIFF');
    assert.equal(buffer.toString('ascii', 8, 12), 'WAVE');
    assert.equal(buffer.readUInt16LE(20), 1, 'PCM encoding');
    assert.equal(buffer.readUInt16LE(22), 1, 'Mono');
    assert.equal(buffer.readUInt32LE(24), 22050);
    assert.equal(buffer.readUInt16LE(34), 16);
    assert.ok(track.seconds > 0 && track.seconds < 60);
  }
});
