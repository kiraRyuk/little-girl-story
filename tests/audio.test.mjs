import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/story/audio.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
});
const { StoryAudio } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('narration readiness, chapter continuity, mute, visibility and unpitched ambience', async () => {
  const previous = { window: globalThis.window, AudioContext: globalThis.AudioContext, SpeechSynthesisUtterance: globalThis.SpeechSynthesisUtterance };
  const timers = new Map(), listeners = new Map(), spoken = [], notices = [], params = [];
  let voices = [], cancellations = 0, pauses = 0, resumes = 0, timerId = 0;
  class Param {
    value = 0;
    setValueAtTime(value) { this.value = value; }
    exponentialRampToValueAtTime(value) { this.value = value; }
    linearRampToValueAtTime(value) { this.value = value; }
    setTargetAtTime(value) { this.value = value; }
  }
  class Node {
    gain = new Param(); frequency = new Param(); Q = new Param();
    connect(node) { return node; }
    disconnect() {}
    start() {}
    stop() { this.onended?.(); }
  }
  class Context {
    sampleRate = 1000; currentTime = 0; state = 'suspended'; destination = new Node();
    createGain() { const node = new Node(); params.push(node.gain); return node; }
    createBiquadFilter() { return new Node(); }
    createBufferSource() { return new Node(); }
    createBuffer(channels, length) { const data = new Float32Array(length); return { getChannelData: () => data }; }
    createOscillator() { assert.fail('Ambient sound and effects must not create pitched oscillators'); }
    async resume() { this.state = 'running'; }
    async suspend() { this.state = 'suspended'; }
    async close() { this.state = 'closed'; }
  }
  class Utterance { constructor(text) { this.text = text; } }
  const synth = {
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name) => listeners.delete(name),
    getVoices: () => voices,
    cancel: () => { cancellations++; },
    speak: (utterance) => spoken.push(utterance),
    resume: () => { resumes++; }, pause: () => { pauses++; },
  };
  globalThis.window = {
    speechSynthesis: synth, SpeechSynthesisUtterance: Utterance, AudioContext: Context,
    setTimeout: (fn) => { timers.set(++timerId, fn); return timerId; },
    clearTimeout: (id) => timers.delete(id),
  };
  globalThis.AudioContext = Context;
  globalThis.SpeechSynthesisUtterance = Utterance;
  let audio;
  try {
    audio = new StoryAudio((text) => notices.push(text));
    audio.speak('book', 'Quiet until enabled.');
    assert.equal(spoken.length, 0);
    await audio.setEnabled(true);
    audio.speak('book', 'A complete chapter.');
    assert.equal(spoken.length, 0);
    for (const [id, fn] of timers) { timers.delete(id); fn(); }
    assert.match(notices.at(-1), /No English narration voice/);
    voices = [{ name: 'English', lang: 'en-GB', localService: true }];
    listeners.get('voiceschanged')();
    assert.equal(spoken.length, 1);
    assert.equal(spoken[0].text, 'A complete chapter.');
    assert.equal(spoken[0].voice, voices[0]);
    const cancels = cancellations;
    audio.speak('book', 'Caption update should not cut off the chapter.');
    assert.equal(cancellations, cancels);
    audio.updateAmbience({ wind: 0.8, crackle: 0.2 });
    const duckedWind = params[1].value;
    spoken[0].onend();
    audio.updateAmbience({ wind: 0.8, crackle: 0.2 });
    assert.ok(params[1].value > duckedWind);
    for (const cue of ['strike', 'out', 'rush']) audio.playCue(cue);
    audio.speak('city', 'Next chapter.');
    assert.equal(spoken.length, 2);
    await audio.setDocumentVisible(false);
    assert.equal(pauses, 1);
    audio.speak('street', 'Hidden requests do not play.');
    assert.equal(spoken.length, 2);
    await audio.setDocumentVisible(true);
    assert.ok(resumes > 0);
    audio.speak('city', 'Replay chapter.', true);
    assert.equal(spoken.length, 3);
    spoken.at(-1).onerror({ error: 'not-allowed' });
    assert.match(notices.at(-1), /could not start/);
    voices = [];
    audio.speak('tree', 'Waiting.');
    await audio.setEnabled(false);
    voices = [{ lang: 'en-US', localService: true }];
    listeners.get('voiceschanged')();
    assert.equal(spoken.length, 3, 'Delayed voices must not restart muted narration');
    audio.dispose();
    assert.equal(listeners.size, 0);
    assert.equal(timers.size, 0);
    delete window.speechSynthesis;
    const unsupported = new StoryAudio((text) => notices.push(text));
    await unsupported.setEnabled(true);
    unsupported.speak('book', 'Fallback.');
    assert.match(notices.at(-1), /unavailable in this browser/);
    unsupported.dispose();
  } finally {
    audio?.dispose();
    Object.assign(globalThis, previous);
  }
});

test('chapter recordings work without speech voices and clean up on mute and navigation', async () => {
  const previousWindow = globalThis.window, previousAudio = globalThis.Audio;
  const recordings = [], notices = [];
  class Recording {
    paused = true; plays = 0; released = false;
    constructor(url) { this.url = url; recordings.push(this); }
    async play() { this.paused = false; this.plays++; this.onplaying?.(); }
    pause() { this.paused = true; }
    removeAttribute(name) { if (name === 'src') this.released = true; }
    load() {}
  }
  globalThis.window = { clearTimeout() {} };
  globalThis.Audio = Recording;
  const audio = new StoryAudio((message) => notices.push(message), { book: '/book.wav', city: '/city.wav' });
  try {
    audio.speak('book', 'Disabled.');
    assert.equal(recordings.length, 0);
    await audio.setEnabled(true);
    audio.speak('book', 'Recorded chapter.');
    assert.equal(recordings[0].url, '/book.wav');
    assert.equal(recordings[0].plays, 1);
    audio.speak('book', 'No interruption.');
    assert.equal(recordings.length, 1);
    await audio.setDocumentVisible(false);
    assert.equal(recordings[0].paused, true);
    await audio.setDocumentVisible(true);
    assert.equal(recordings[0].plays, 2);
    audio.speak('city', 'Next chapter.');
    assert.equal(recordings[0].released, true);
    const current = recordings[1];
    current.onerror();
    assert.equal(current.released, true);
    assert.match(notices.at(-1), /recording could not play/);
    audio.speak('city', 'Retry.', true);
    assert.equal(recordings.length, 3);
    await audio.setEnabled(false);
    assert.equal(recordings[2].released, true);
    assert.equal(recordings[2].paused, true);
    assert.equal(notices.at(-1), '');
  } finally {
    audio.dispose();
    globalThis.window = previousWindow;
    globalThis.Audio = previousAudio;
  }
});
