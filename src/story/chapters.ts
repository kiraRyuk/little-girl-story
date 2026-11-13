import * as THREE from "three";
import { BEATS, beatProgress } from "./beats";
import { makeBook } from "./book";
import { makeTown } from "./town";
import { makeStage } from "./stage";
import { makeRoast } from "./roast";
import { makeEmberTexture, makeFigure } from "./art";
import { clamp, smoothstep, STORY } from "./timeline";
import type { ChapterRuntime, FrameContext, ViewportState } from "./types";

const INK = 0x050505;
const PAPER = 0xf2efe6;
const EMBER = 0xff7a1a;

const snowVertex = `
  attribute float aSeed;
  uniform float uTime;
  uniform float uWind;
  uniform float uSize;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    float speed = 0.42 + aSeed * 0.82;
    p.y = mod(p.y - uTime * speed + 5.0, 10.0) - 5.0;
    p.x += sin(uTime * (0.22 + aSeed * 0.3) + aSeed * 30.0) * 0.28 + uTime * uWind * 0.08;
    p.x = mod(p.x + 8.0, 16.0) - 8.0;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.4 + aSeed * 0.8) / max(1.0, -mv.z * 0.16);
    vAlpha = 0.34 + aSeed * 0.56;
  }
`;

const snowFragment = `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p);
    float a = (1.0 - smoothstep(0.12, 0.5, d)) * vAlpha;
    if (a < 0.025) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

const flameVertex = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const flameFragment = `
  uniform float uTime;
  uniform float uStrength;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0,0.0)), f.x), mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), f.x), f.y);
  }
  void main() {
    vec2 p = vUv;
    float edge = abs(p.x - 0.5) / max(0.04, (0.46 - p.y) * 0.82);
    float n = noise(vec2(p.x * 7.0, p.y * 4.0 - uTime * 1.5)) * 0.65 + noise(vec2(p.x * 14.0, p.y * 8.0 - uTime * 2.8)) * 0.35;
    float body = (1.0 - smoothstep(0.12, 1.1, edge)) * (1.0 - smoothstep(0.15, 1.0, p.y)) * smoothstep(0.0, 0.16, p.y);
    float flicker = smoothstep(0.18, 0.86, n + (0.65 - p.y) * 0.45);
    vec3 col = mix(vec3(0.78,0.15,0.035), vec3(1.0,0.72,0.32), flicker);
    col = mix(col, vec3(1.0,0.94,0.76), smoothstep(0.58,0.9,body) * 0.55);
    float a = body * uStrength;
    if (a < 0.01) discard;
    gl_FragColor = vec4(col, a);
  }
`;

const gauzeVertex = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const gauzeFragment = `
  uniform float uTime;
  uniform float uReveal;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(41.7, 289.3))) * 15731.743); }
  float noise(vec2 p) { vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y); }
  void main() {
    vec2 p = vUv - vec2(.5,.49);
    float n = noise(vUv * 9.0 + uTime * .06) * .12;
    float radius = uReveal * .78;
    float mask = 1.0 - smoothstep(radius - .06 + n, radius + .08 + n, length(p * vec2(1.0,1.22)));
    float threads = max(abs(sin(vUv.x * 180.0)), abs(sin(vUv.y * 180.0)));
    vec3 col = mix(vec3(.035,.04,.045), vec3(.66,.47,.29), mask * .18);
    gl_FragColor = vec4(col, .32 + threads * mask * .12);
  }
`;

function seeded(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeSnow(scene: THREE.Scene, amount: number) {
  const rng = seeded(amount * 13 + 9);
  const positions = new Float32Array(amount * 3);
  const seeds = new Float32Array(amount);
  for (let i = 0; i < amount; i += 1) {
    positions[i * 3] = (rng() - .5) * 15;
    positions[i * 3 + 1] = (rng() - .5) * 9;
    positions[i * 3 + 2] = (rng() - .5) * 8;
    seeds[i] = rng();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 }, uWind: { value: .8 }, uSize: { value: 24 },
      uColor: { value: new THREE.Color(0xdce0df) },
    },
    vertexShader: snowVertex,
    fragmentShader: snowFragment,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 10;
  scene.add(points);
  return { points, material, dispose: () => { geometry.dispose(); material.dispose(); } };
}

function makeActor(kind: "traveler" | "elder", x: number, y: number, scale = 1, seated = false) {
  const texture = makeFigure(kind, seated ? "seated" : "standing");
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, alphaTest: .015 });
  const sprite = new THREE.Sprite(material);
  sprite.position.set(x, y, 1.05);
  sprite.scale.set(2.3 * scale, 3.85 * scale, 1);
  return { sprite, texture, material, base: new THREE.Vector3(x, y, 1.05) };
}

function makeFlame(scene: THREE.Scene) {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uStrength: { value: 0 } },
    vertexShader: flameVertex,
    fragmentShader: flameFragment,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 2.1), material);
  mesh.position.set(0, -.15, 1.6);
  mesh.renderOrder = 5;
  scene.add(mesh);
  return { mesh, material };
}

function makeGauze(scene: THREE.Scene) {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uReveal: { value: 0 } },
    vertexShader: gauzeVertex,
    fragmentShader: gauzeFragment,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.2), material);
  mesh.position.set(.7, .25, .4);
  mesh.renderOrder = 4;
  scene.add(mesh);
  return { mesh, material };
}

function addStreetCart(scene: THREE.Scene) {
  const group = new THREE.Group();
  const ink = new THREE.MeshBasicMaterial({ color: 0x111719 });
  const trim = new THREE.MeshBasicMaterial({ color: 0xc1b9a8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, .72, .82), ink);
  body.position.y = -.3; group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(.85, .63, .78), trim);
  cabin.position.set(.25, .34, .02); group.add(cabin);
  const window = new THREE.Mesh(new THREE.BoxGeometry(.68, .42, .8), new THREE.MeshBasicMaterial({ color: 0x252b2d }));
  window.position.set(.25, .36, .07); group.add(window);
  for (const x of [-.58,.66]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(.28, .055, 6, 18), trim);
    wheel.position.set(x, -.68, .08); group.add(wheel);
  }
  group.position.set(-6, -1.05, .45);
  scene.add(group);
  return { group, dispose: () => { group.traverse((child) => { if (child instanceof THREE.Mesh) { child.geometry.dispose(); if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose()); else child.material.dispose(); } }); } };
}

function addStove(scene: THREE.Scene) {
  const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x171b1d });
  const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0xa99b84 });
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.82, .98, 2.15, 10), bodyMaterial);
  body.position.set(.5, -.92, .15); group.add(body);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(1.02, .82, .24, 10), edgeMaterial);
  crown.position.set(.5, .18, .15); group.add(crown);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(.19, .19, 1.75, 8), bodyMaterial);
  pipe.position.set(.5, 1.18, .12); group.add(pipe);
  scene.add(group);
  return { group, dispose: () => group.traverse((child) => { if (child instanceof THREE.Mesh) { child.geometry.dispose(); child.material.dispose(); } }) };
}

function addTree(scene: THREE.Scene) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.15, .23, 1.3, 6), new THREE.MeshBasicMaterial({ color: 0x534331 }));
  trunk.position.set(0, -2.5, .3); scene.add(trunk);
  const branches: THREE.Mesh[] = [];
  const branchMaterial = new THREE.MeshBasicMaterial({ color: 0x18261f, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i += 1) {
    const height = 1.2 + i * .32;
    const radius = 2.2 - i * .23;
    const branch = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 4, 1, true), branchMaterial);
    branch.position.set(0, -1.85 + i * .48, .2);
    branch.rotation.y = Math.PI / 4;
    scene.add(branch); branches.push(branch);
  }
  const twigs: THREE.Vector3[] = [];
  for (let tier = 0; tier < 10; tier++) {
    const y = -2.1 + tier * .47;
    const radius = 2.5 * (1 - tier / 11);
    for (let twig = 0; twig < 18; twig++) {
      const side = twig % 2 ? -1 : 1;
      const x = side * radius * (.2 + (twig % 9) / 11);
      twigs.push(new THREE.Vector3(x * .4, y + .35, .9), new THREE.Vector3(x, y, .95));
      twigs.push(new THREE.Vector3(x, y, .95), new THREE.Vector3(x + side * .15, y + .16, .95));
    }
  }
  const twigGeometry = new THREE.BufferGeometry().setFromPoints(twigs);
  const twigMaterial = new THREE.LineBasicMaterial({ color: 0x9daca0, transparent: true });
  const needles = new THREE.LineSegments(twigGeometry, twigMaterial); scene.add(needles);
  const count = 220;
  const starts = new Float32Array(count * 3);
  const ends = new Float32Array(count * 3);
  const positions = new Float32Array(count * 3);
  const rng = seeded(177);
  for (let i = 0; i < count; i += 1) {
    const angle = rng() * Math.PI * 2;
    const y = -2 + rng() * 5;
    const radius = .12 + rng() * (1 - (y + 2) / 5) * 2.6;
    starts.set([Math.cos(angle) * radius, y, .42 + rng() * .8], i * 3);
    const starAngle = rng() * Math.PI * 2;
    const starRadius = 2.2 + rng() * 4.2;
    ends.set([Math.cos(starAngle) * starRadius, 2 + rng() * 4.7, -2 - rng() * 1.8], i * 3);
  }
  positions.set(starts);
  const geometry = new THREE.BufferGeometry();
  const positionAttribute = new THREE.BufferAttribute(positions, 3);
  geometry.setAttribute("position", positionAttribute);
  const material = new THREE.PointsMaterial({ color: 0xf6d9a9, size: 4, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false });
  const points = new THREE.Points(geometry, material); points.frustumCulled = false; points.renderOrder = 12; scene.add(points);
  return {
    branches,
    points,
    update(progress: number, time: number) {
      const rise = beatProgress(progress, BEATS.tree.rise, BEATS.tree.stars);
      for (let i = 0; i < count; i += 1) {
        const j = i * 3;
        positions[j] = starts[j]! + (ends[j]! - starts[j]!) * rise;
        positions[j + 1] = starts[j + 1]! + (ends[j + 1]! - starts[j + 1]!) * rise;
        positions[j + 2] = starts[j + 2]! + (ends[j + 2]! - starts[j + 2]!) * rise;
      }
      positionAttribute.needsUpdate = true;
      material.opacity = smoothstep(clamp((progress - .04) / .16)) * (.82 + Math.sin(time * 1.7) * .08);
      branches.forEach((branch, index) => { branch.visible = progress < .82; branch.rotation.y = Math.PI / 4 + Math.sin(time * .2 + index) * .025; });
      needles.visible = progress < .84;
      twigMaterial.opacity = 1 - smoothstep(clamp((progress - .55) / .29));
      trunk.visible = progress < .82;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      branches.forEach((branch) => branch.geometry.dispose());
      branchMaterial.dispose();
      twigGeometry.dispose(); twigMaterial.dispose();
      trunk.geometry.dispose();
      (trunk.material as THREE.Material).dispose();
    },
  };
}

export function buildChapters(): ChapterRuntime[] {
  return STORY.map((definition, index) => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(INK);
    const camera = new THREE.PerspectiveCamera(36, 1, .1, 100);
    camera.position.set(0, 0, 10);
    const disposers: Array<() => void> = [];
    const stage = makeStage(definition.id, scene);
    if (stage) disposers.push(stage.dispose);
    const town = definition.id === "city" ? makeTown(scene) : null;
    if (town) disposers.push(town.dispose);
    const snow = ["city", "street", "corner", "tree", "grandmother", "morning"].includes(definition.id)
      ? makeSnow(scene, definition.id === "city" ? 820 : definition.id === "street" ? 600 : 330)
      : null;
    if (snow) disposers.push(snow.dispose);

    const needsTraveler = ["street", "corner", "stove", "goose", "tree", "grandmother", "morning"].includes(definition.id);
    const traveler = needsTraveler ? makeActor("traveler", definition.id === "street" ? -3.2 : -.8, -1.25, definition.id === "morning" ? .86 : 1, ["corner", "morning"].includes(definition.id)) : null;
    if (traveler && definition.id === "tree") { traveler.texture.repeat.x = -1; traveler.texture.offset.x = 1; }
    if (traveler) { scene.add(traveler.sprite); disposers.push(() => { traveler.texture.dispose(); traveler.material.dispose(); }); }

    const elder = definition.id === "grandmother" ? makeActor("elder", 1.45, -1.1, .96) : null;
    if (elder) { scene.add(elder.sprite); disposers.push(() => { elder.texture.dispose(); elder.material.dispose(); }); }

    let flame: ReturnType<typeof makeFlame> | null = null;
    let activeEmber: THREE.Sprite | null = null;
    if (["stove", "goose", "grandmother"].includes(definition.id)) {
      const ember = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeEmberTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      ember.scale.set(2.3, 2.3, 1); ember.position.set(.2, .12, 1.45); scene.add(ember);
      activeEmber = ember;
      disposers.push(() => { (ember.material as THREE.SpriteMaterial).map?.dispose(); (ember.material as THREE.Material).dispose(); });
      flame = makeFlame(scene); flame.mesh.visible = definition.id === "stove";
      disposers.push(() => { flame?.mesh.geometry.dispose(); flame?.material.dispose(); });
    }

    const stove = definition.id === "stove" ? addStove(scene) : null;
    if (stove) disposers.push(stove.dispose);
    const tree = definition.id === "tree" ? addTree(scene) : null;
    if (tree) disposers.push(tree.dispose);
    const cart = definition.id === "street" ? addStreetCart(scene) : null;
    if (cart) disposers.push(cart.dispose);



    const book = ["book", "close"].includes(definition.id) ? makeBook(scene, definition.id === "close") : null;
    if (book) disposers.push(book.dispose);
    const roast = definition.id === "goose" ? makeRoast(scene) : null;
    if (roast) disposers.push(roast.dispose);

    if (definition.id === "tree") {
      const topper = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeEmberTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      topper.scale.set(.65, .65, 1); topper.position.set(0, 2.55, .55); scene.add(topper);
      disposers.push(() => { (topper.material as THREE.SpriteMaterial).map?.dispose(); (topper.material as THREE.Material).dispose(); });
    }

    const runtime: ChapterRuntime = {
      ...definition,
      scene,
      camera,
      update(progress: number, frame: FrameContext) {
        const p = clamp(progress);
        const time = frame.time;
        camera.position.x = Math.sin(time * .17 + index) * .05 + frame.pointer.x * .11;
        camera.position.y = Math.sin(time * .13 + index * .7) * .035 + frame.pointer.y * .055;
        camera.position.z = 10;
        camera.rotation.z = Math.sin(time * .08 + index) * .003;
        if (frame.reducedMotion) { camera.position.x = frame.pointer.x * .035; camera.position.y = frame.pointer.y * .025; camera.rotation.z = 0; }

        if (snow) {
          snow.material.uniforms.uTime!.value = frame.reducedMotion ? 0 : time;
          snow.material.uniforms.uWind!.value = definition.ambience.wind ?? .45;
          snow.points.visible = definition.id !== "tree" || p < .55 || p > .88;
        }
        if (traveler) {
          const sprite = traveler.sprite;
          sprite.position.x = traveler.base.x;
          sprite.position.y = traveler.base.y + Math.sin(time * 1.1) * .025;
          sprite.material.opacity = 1;
          if (definition.id === "street") {
            sprite.position.x = -3.3 + smoothstep(clamp(p / .72)) * 2.25;
            sprite.scale.y = 3.75 + Math.sin(time * 2.1) * .035;
            if (cart) { cart.group.position.x = 6.1 - beatProgress(p, BEATS.street.carriage, BEATS.street.passed) * 12.4; cart.group.position.y = -.95 + Math.sin(time * 5) * .025; }
          } else if (definition.id === "corner") {
            sprite.position.set(.25 + smoothstep(clamp((p - .25) / .45)) * .18, -1.5, 1.2);
            sprite.scale.set(2.15, 3.65, 1);
          } else if (definition.id === "grandmother") {
            const lift = beatProgress(p, BEATS.grandmother.lift, BEATS.grandmother.lifted);
            sprite.position.y = -1.3 + lift * 5.7;
            sprite.position.x = -.85 + lift * .45;
            sprite.material.opacity = 1 - smoothstep(clamp((p - .9) / .1)) * .18;
            if (elder) { elder.sprite.position.y = -1.1 + lift * 5.4; elder.sprite.position.x = 1.15 - lift * .55; elder.sprite.material.opacity = .12 + beatProgress(p, BEATS.grandmother.appear, BEATS.grandmother.present) * .88; }
          } else if (definition.id === "morning") {
            sprite.position.set(-1.25, -1.55, 1.1);
            sprite.scale.set(1.8, 3.05, 1);
          } else if (definition.id === "stove") {
            sprite.position.set(-2.2, -1.2, 1.7); sprite.scale.set(1.8, 3, 1);
          } else if (definition.id === "goose") {
            sprite.position.set(-3.1, -1.35, 2.5); sprite.scale.set(1.65, 2.8, 1);
          } else if (definition.id === "tree") {
            sprite.position.set(2.45, -1.2, 1.1);
            sprite.material.opacity = 1 - smoothstep(clamp((p - .5) / .3));
          }
        }
        if (flame) {
          const strength = definition.id === "stove"
            ? beatProgress(p, BEATS.stove.strike, BEATS.stove.lit) * (1 - beatProgress(p, BEATS.stove.out, BEATS.stove.dark))
            : definition.id === "matches"
              ? smoothstep(clamp((p - .35) / .12)) * (1 - smoothstep(clamp((p - .76) / .1)))
              : definition.id === "goose"
                ? beatProgress(p, BEATS.goose.strike, BEATS.goose.strike + .12) * (1 - beatProgress(p, BEATS.goose.out, .98))
                : smoothstep(clamp((p - .04) / .15)) * (1 - smoothstep(clamp((p - .48) / .15)));
          flame.material.uniforms.uTime!.value = frame.reducedMotion ? 0 : time;
          flame.material.uniforms.uStrength!.value = strength;
          flame.mesh.visible = strength > .025;
          flame.mesh.material.opacity = strength;
          if (definition.id === "stove") { flame.mesh.position.set(.5, -.65, 1.3); flame.mesh.scale.set(.85, .7, 1); }
          if (activeEmber) {
            activeEmber.material.opacity = strength * .55;
            activeEmber.visible = strength > .025;
            activeEmber.position.copy(flame.mesh.position);
          }
        }
        if (stove) {
          stove.group.rotation.y = frame.reducedMotion ? 0 : Math.sin(time * .18) * .012;
          stove.group.visible = p >= BEATS.stove.strike && p < BEATS.stove.dark;
        }
        if (tree) tree.update(p, frame.reducedMotion ? 0 : time);
        roast?.update(p, time, frame.reducedMotion);
        stage?.update(p, frame, camera);
        book?.update(p, frame, camera);
        if (town) {
          town.update(p, frame, camera);
          if (snow) snow.points.position.set(camera.position.x, camera.position.y, camera.position.z - 9);
        }
      },
      resize(viewport: ViewportState) { camera.aspect = viewport.aspect; camera.updateProjectionMatrix(); },
      setPortal(id: string, texture: THREE.Texture) { if ((definition.portals ?? []).includes(id)) book?.set(texture); },
      dispose() { disposers.reverse().forEach((dispose) => dispose()); scene.clear(); },
    };

    return runtime;
  });
}
