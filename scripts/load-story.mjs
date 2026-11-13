import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Evaluate only our two small, dependency-whitelisted story-definition modules.
// This never touches the captured reference-site bundles or native tools.
const asModule = (source) => {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  });
  return outputText;
};
const asUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
export async function loadStory() {
  const beats = asUrl(asModule(await readFile(new URL('../src/story/beats.ts', import.meta.url), 'utf8')));
  const timeline = asModule(await readFile(new URL('../src/story/timeline.ts', import.meta.url), 'utf8'));
  return import(asUrl(timeline.replace(/(["'])\.\/beats\1/g, JSON.stringify(beats))));
}
