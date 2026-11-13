import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import ts from 'typescript';

const compile = (source) => ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const asUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const motionUrl = asUrl(compile(await readFile(new URL('../src/story/book-motion.ts', import.meta.url), 'utf8')));
const { bookPose } = await import(motionUrl);
const bookModule = compile(await readFile(new URL('../src/story/book.ts', import.meta.url), 'utf8'))
  .replace(/(["'])three\1/g, JSON.stringify(import.meta.resolve('three')))
  .replace(/(["'])\.\/book-motion\1/g, JSON.stringify(motionUrl));
const { makeBook } = await import(asUrl(bookModule));

test('opening holds the closed cover through the intro and closing returns to the same pose', () => {
  assert.equal(bookPose(1.05 / 3.5, false).open, 0);
  assert.deepEqual(bookPose(0, false), bookPose(1, true));
  assert.deepEqual(bookPose(1, false), bookPose(0, true));
  for (let i = 0; i <= 100; i++) {
    const p = i / 100;
    const a = bookPose(p, false), b = bookPose(1 - p, true);
    assert.ok(Math.abs(a.open - b.open) < 1e-12);
    assert.ok(Math.abs(a.zoom - b.zoom) < 1e-12);
  }
});

test('hardback geometry encloses pages, hides loose leaves when closed and disposes once', () => {
  const previous = globalThis.document;
  const context = new Proxy({}, {
    get: (_, name) => name === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => undefined,
  });
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };
  try {
    const scene = new THREE.Scene();
    const book = makeBook(scene, false);
    const camera = new THREE.PerspectiveCamera();
    const frame = {
      time: 0, delta: 1 / 60, pointer: new THREE.Vector2(), direction: 1, reducedMotion: false,
      viewport: { width: 1440, height: 900, aspect: 1.6, pixelRatio: 1 },
    };
    book.update(0, frame, camera);
    const hinge = scene.getObjectByName('front-cover-hinge');
    const back = scene.getObjectByName('back-cover');
    const stack = scene.getObjectByName('page-block');
    const gilt = scene.getObjectByName('gilt-cover');
    assert.equal(Math.abs(hinge.rotation.y), 0);
    assert.equal(gilt.material.side, THREE.FrontSide);
    back.geometry.computeBoundingBox();
    assert.ok(back.geometry.boundingBox.max.x < 2.7, 'A closed board must be one page wide');
    assert.ok(stack.position.z + .29 / 2 < hinge.position.z - .0575, 'White page block stays beneath the closed cover');
    for (let i = 0; i < 3; i++) assert.equal(scene.getObjectByName(`turning-leaf-${i}`).visible, false);
    book.update(.56, frame, camera);
    assert.ok(Math.abs(hinge.rotation.y + Math.PI) < 1e-10);
    book.update(1, frame, camera);
    for (let i = 0; i < 3; i++) assert.equal(scene.getObjectByName(`turning-leaf-${i}`).visible, false);
    assert.ok(Number.isFinite(camera.position.z));
    const counts = new Map();
    scene.traverse((node) => {
      if (!node.isMesh) return;
      for (const resource of [node.geometry, ...[].concat(node.material)]) {
        if (!counts.has(resource)) {
          counts.set(resource, 0);
          resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource) + 1));
        }
      }
    });
    book.dispose();
    assert.equal(scene.children.length, 0);
    for (const count of counts.values()) assert.equal(count, 1);
  } finally { globalThis.document = previous; }
});
