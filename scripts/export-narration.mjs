// Export our adaptation only; never read or execute captured reference bundles.
import { loadStory } from './load-story.mjs';
const { STORY } = await loadStory();
process.stdout.write(JSON.stringify(STORY.map(({ id, title, captions }) => ({
  id, title, filename: `${id}.wav`, text: captions.map(({ text }) => text).join(' '),
})), null, 2) + '\n');
