import * as THREE from "three";
import { BEATS } from "./beats";
import { makeEmberTexture, makeFigure } from "./art";
import { clamp, smoothstep } from "./timeline";
import type { FrameContext } from "./types";

const ease = (p: number, a: number, b: number) => smoothstep(clamp((p - a) / (b - a)));

/** Original layered sets for the chapters beyond the opening panorama. */
export function makeStage(id: string, scene: THREE.Scene) {
  if (["book", "city", "close"].includes(id)) return null;
  const root = new THREE.Group(); scene.add(root);
  const textures = new Set<THREE.Texture>();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const flat = new THREE.PlaneGeometry(1, 1);
  const outline = new THREE.EdgesGeometry(geometry);
  const staticMeshes: THREE.Mesh<THREE.BufferGeometry, THREE.Material>[] = [];
  const inkLines = new THREE.LineBasicMaterial({ color: 0x171715 });
  const material = (color: number) => new THREE.MeshBasicMaterial({ color });
  const ink = material(0x101110), stone = material(0xbab7ae), paper = material(0xe9e5d9);
  const timber = material(0x393731), warm = material(0xe3ae68);
  function block(w: number, h: number, d: number, x: number, y: number, z: number, mat = stone, edged = false) {
    const mesh = new THREE.Mesh(geometry, mat); mesh.scale.set(w, h, d); mesh.position.set(x, y, z); root.add(mesh); staticMeshes.push(mesh);
    if (edged) { const lines = new THREE.LineSegments(outline, inkLines); lines.scale.copy(mesh.scale); lines.position.copy(mesh.position); root.add(lines); }
    return mesh;
  }
  function panel(w: number, h: number, x: number, y: number, z: number, mat: THREE.Material) {
    const mesh = new THREE.Mesh(flat, mat); mesh.scale.set(w, h, 1); mesh.position.set(x, y, z); root.add(mesh); staticMeshes.push(mesh); return mesh;
  }
  function windowAt(x: number, y: number, z: number, w = 1.25, h = 2.4) {
    block(w + .17, h + .17, .15, x, y, z, timber, true);
    panel(w, h, x, y, z + .09, warm);
    block(.075, h, .06, x, y, z + .13, ink);
    block(w, .08, .06, x, y, z + .13, ink);
    block(w + .3, .12, .34, x, y - h / 2, z + .12, paper);
  }
  function facade(x: number, z: number, width: number, height: number) {
    block(width, height, .6, x, height / 2 - 3, z, stone, true);
    for (let row = 0; row < 3; row++) windowAt(x, height - 4 - row * 2.5, z + .4, .85, 1.5);
    for (let line = 0; line < 18; line++) block(width, .012, .02, x, -2.8 + line * .47, z + .32, timber);
    block(width + .2, .12, .8, x, height - 3, z, paper);
  }

  const floorCanvas = document.createElement("canvas"); floorCanvas.width = floorCanvas.height = 256;
  const ctx = floorCanvas.getContext("2d")!;
  const outside = ["street", "corner", "morning"].includes(id);
  ctx.fillStyle = outside ? "#aeaca4" : "#35322c"; ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = outside ? "#5a5a53" : "#a19a89"; ctx.lineWidth = 1;
  for (let i = 0; i <= 8; i++) {
    ctx.beginPath(); ctx.moveTo(0, i * 32); ctx.lineTo(256, i * 32); ctx.stroke();
    for (let j = 0; j < 5; j++) { const x = j * 64 + (i % 2) * 32; ctx.beginPath(); ctx.moveTo(x, i * 32); ctx.lineTo(x + 4, i * 32 + 32); ctx.stroke(); }
  }
  const floorTexture = new THREE.CanvasTexture(floorCanvas); textures.add(floorTexture);
  floorTexture.colorSpace = THREE.SRGBColorSpace; floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping; floorTexture.repeat.set(6, 8);
  const ground = panel(32, 32, 0, -3.03, -5, new THREE.MeshBasicMaterial({ map: floorTexture })); ground.rotation.x = -Math.PI / 2;

  let veil: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> | null = null;
  let halo: THREE.Sprite | null = null;
  let bundle: THREE.Group | null = null;
  let fallingStar: THREE.Line | null = null;
  let stars: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> | null = null;
  let crowd: THREE.Sprite[] = [];

  if (id === "street") {
    for (let i = 0; i < 5; i++) facade((i - 2) * 3.6, -5 - Math.abs(i - 2) * 1.3, 3.4, 10 + i % 2);
    block(.12, 5.4, .12, 3.45, -.2, -.1, ink);
    block(.8, .12, .35, 3.15, 2.45, -.1, ink);
    windowAt(3, 1.98, -.05, .48, .72);
  } else if (id === "corner" || id === "morning") {
    facade(-3.9, -1.5, 4.8, 12); facade(3.5, -3, 5.4, 12);
    block(2.7, 11, .5, -.65, 2, -4.5, ink);
    windowAt(3, 1.2, -2.55, 1.55, 2.75);
    for (let i = 0; i < 8; i++) block(.18 + i * .14, .09, .7, -1.5 + i * .25, -2.85, -.1, paper);
    if (id === "morning") {
      for (let i = 0; i < 4; i++) {
        const tex = makeFigure("bystander"); textures.add(tex);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xb6b4ac, transparent: true, depthWrite: false }));
        sprite.scale.set(2, 3.5, 1); sprite.position.set(i < 2 ? -3.5 + i * .8 : 2.4 + (i - 2) * .75, -1.15, -.2 - i * .25);
        root.add(sprite); crowd.push(sprite);
      }
      scene.background = new THREE.Color(0xa8a79e);
    }
  } else if (id === "matches") {
    panel(20, 14, 0, 1, -4, ink);
    const cloth = panel(8, 6, 0, -1.4, -.2, timber); cloth.rotation.z = -.14;
    for (let i = 0; i < 18; i++) {
      const fold = block(.025, 6, .02, (i - 9) * .4, -1.7, -.12, i % 3 ? ink : stone); fold.rotation.z = -.28;
    }
    bundle = new THREE.Group(); root.add(bundle);
    for (let i = 0; i < 17; i++) {
      const match = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, 2.6, 5), paper);
      match.position.set((i % 6 - 2.5) * .13, (i % 3) * .1 - .1, Math.floor(i / 6) * .09 + .5);
      match.rotation.z = (i % 4 - 1.5) * .06;
      const tip = new THREE.Mesh(new THREE.SphereGeometry(.075, 6, 5), new THREE.MeshBasicMaterial({ color: 0x68291a }));
      tip.position.y = 1.3; match.add(tip); bundle.add(match);
    }
    const band = new THREE.Mesh(new THREE.BoxGeometry(.95, .4, .4), stone); band.position.set(0, -.4, .62); bundle.add(band);
    bundle.rotation.z = -.3; bundle.position.set(.6, -.2, .6);
  } else if (id === "stove") {
    panel(18, 12, 0, 1, -3, ink);
    for (let i = 0; i < 13; i++) block(.025, 9, .02, i * .75 - 4.5, .5, -2.9, timber);
    // Ornamental iron door and bars sit in front of the separately animated fire.
    block(1.5, .11, .12, .5, .1, 1.5, stone, true);
    block(1.5, .11, .12, .5, -1.45, 1.5, stone, true);
    for (let i = 0; i < 6; i++) block(.045, 1.5, .055, -.1 + i * .24, -.67, 1.5, ink);
    for (const x of [-.15, 1.15]) block(.14, .55, .16, x, -2.25, .4, stone, true);
    block(2.6, .14, 2.3, .5, -2.65, .2, stone, true);
  } else if (id === "goose") {
    panel(17, 12, 0, 1, -3, new THREE.MeshBasicMaterial({ color: 0x8f8777 }));
    windowAt(3.5, 1.6, -2.85, 1.6, 3.4);
    block(5.6, .22, 2.8, .35, -1.15, -.4, paper, true);
    for (const x of [-1.8, 2.5]) block(.15, 1.7, .15, x, -2.1, -.1, timber);
    for (const x of [-1.6, 2.4]) {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(.4, .4, .045, 24), paper); plate.position.set(x, -.99, .35); root.add(plate);
      block(.06, .9, .06, x + .65, -.55, -.5, paper);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeEmberTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      textures.add(glow.material.map!); glow.position.set(x + .65, -.05, -.5); glow.scale.setScalar(.65); root.add(glow);
    }
    const veilMaterial = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { reveal: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec2 vUv; uniform float reveal;
        void main(){vec2 p=(vUv-.5)*vec2(1.,.8); float edge=length(p);
        float hole=1.-smoothstep(reveal*.8-.03,reveal*.8+.035,edge);
        vec2 brick=floor(vUv*vec2(18.,12.));float seam=step(.94,fract(vUv.y*12.))+step(.96,fract(vUv.x*18.+mod(brick.y,2.)*.5));
        gl_FragColor=vec4(mix(vec3(.16),vec3(.33),clamp(seam,0.,1.)),1.-hole);}`,
    });
    veil = new THREE.Mesh(flat, veilMaterial); veil.scale.set(17, 12, 1); veil.position.set(0, 1, 2); root.add(veil);
  } else if (id === "tree") {
    panel(17, 12, 0, 1, -4, ink);
    for (const x of [-4, 4]) {
      block(.18, 10, .2, x, 1.4, -3, stone); block(2, .22, .5, x, -2.7, -3, stone);
    }
    const starGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(.6,.8,0)]);
    fallingStar = new THREE.Line(starGeometry, new THREE.LineBasicMaterial({ color: 0xffe6b0, transparent: true }));
    fallingStar.position.set(3, 4, .4); root.add(fallingStar);
  }

  if (id === "tree" || id === "grandmother") {
    const positions = new Float32Array(240 * 3);
    for (let i = 0; i < 240; i++) {
      positions[i * 3] = Math.sin(i * 117.31) * 12;
      positions[i * 3 + 1] = Math.sin(i * 39.17) * 9 + 3;
      positions[i * 3 + 2] = -4 - (i % 13) * .4;
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    stars = new THREE.Points(geometry, new THREE.PointsMaterial({ size: .035, color: 0xf3ead5, transparent: true, depthWrite: false })); root.add(stars);
  }
  if (["stove", "grandmother"].includes(id)) {
    const texture = makeEmberTexture(); textures.add(texture);
    halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, color: 0xffd39a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.position.set(.4, .6, -1); halo.scale.setScalar(9); root.add(halo);
  }

  const target = new THREE.Vector3();
  const darkSky = new THREE.Color(0x070808), brightSky = new THREE.Color(0xe9e5d8);
  const sky = darkSky.clone();
  const batches = new Map<string, THREE.Mesh<THREE.BufferGeometry, THREE.Material>[]>();
  for (const mesh of staticMeshes) {
    const key = `${mesh.geometry.uuid}:${mesh.material.uuid}`;
    const batch = batches.get(key) ?? []; batch.push(mesh); batches.set(key, batch);
  }
  for (const batch of batches.values()) {
    if (batch.length < 2) continue;
    const first = batch[0]!;
    const instances = new THREE.InstancedMesh(first.geometry, first.material, batch.length);
    batch.forEach((mesh, index) => { mesh.updateMatrix(); instances.setMatrixAt(index, mesh.matrix); root.remove(mesh); });
    instances.computeBoundingSphere(); root.add(instances);
  }
  return {
    update(p: number, frame: FrameContext, camera: THREE.PerspectiveCamera) {
      const t = ease(p, 0, 1);
      const wide = Math.max(1, .85 / frame.viewport.aspect);
      camera.fov = 36;
      target.set(0, -.1, 0);
      let distance = 10, x = 0, y = .5;
      if (id === "street") { distance = 12 - t * 2.1; x = 1.1 - t * 1.5; }
      if (id === "matches") { distance = 8.2 - t * 1.8; x = .55; y = .6; target.set(.5, .1, .6); }
      if (id === "corner") { distance = 11 - t * 2.8; x = -.5 + t * .8; y = .4 - t * .4; target.set(.2, -.5, 0); }
      if (id === "stove") { distance = 10 - ease(p,.08,.65)*1.8 + ease(p,.75,1)*1.3; x = .5; target.set(.3, -.6, .4); }
      if (id === "goose") { distance = 11 - ease(p,.2,.7)*1.6; x = .4 - ease(p,.6,.9)*.6; }
      if (id === "tree") {
        y = .4 + ease(p,.4,.9)*3; target.y = ease(p,.4,.9)*3.5;
        distance = 12 - ease(p,.05,.45)*2 + ease(p,.55,1)*2;
        if (fallingStar) { const f=ease(p,BEATS.tree.fall,BEATS.tree.fallen); fallingStar.position.set(3-f*6,5-f*5,.4); fallingStar.visible=p>=BEATS.tree.fall&&p<BEATS.tree.fallen; }
      }
      if (id === "grandmother") {
        const lift=ease(p,BEATS.grandmother.lift,BEATS.grandmother.lifted); y=lift*4; target.y=lift*4; distance=10-lift*1.8;
        scene.background = sky.copy(darkSky).lerp(brightSky,ease(p,.73,1));
        if (halo) { halo.scale.setScalar(6+ease(p,.2,.9)*12); halo.position.y=lift*4; halo.material.opacity=ease(p,.05,.3)*(1-ease(p,.85,1)); }
      }
      if (id === "morning") { distance=9+t*4.5; y=.8+t*.8; target.set(-.2,-.5,0); crowd.forEach((person,i)=>person.material.opacity=ease(p,.12+i*.08,.45+i*.08)); }
      if (bundle) { bundle.rotation.z=-.32+t*.2; bundle.rotation.y=-.25+t*.4; }
      if (veil) veil.material.uniforms.reveal!.value=ease(p,BEATS.goose.strike,BEATS.goose.revealed)*(1-ease(p,BEATS.goose.out,1));
      if (halo && id === "stove") halo.material.opacity=ease(p,BEATS.stove.strike,BEATS.stove.lit)*(1-ease(p,BEATS.stove.out,BEATS.stove.dark));
      if (stars) stars.material.opacity=id==="tree" ? ease(p,BEATS.tree.rise,BEATS.tree.stars) : 1-ease(p,.75,1);
      camera.position.set(x+(frame.reducedMotion?0:frame.pointer.x*.07),y,distance*wide);
      camera.lookAt(target); camera.updateProjectionMatrix();
    },
    dispose() {
      const geometries = new Set<THREE.BufferGeometry>([geometry,flat,outline]);
      const materials = new Set<THREE.Material>([inkLines,ink,stone,paper,timber,warm]);
      root.traverse((object)=>{
        if (object instanceof THREE.InstancedMesh) object.dispose();
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
          geometries.add(object.geometry);
          (Array.isArray(object.material)?object.material:[object.material]).forEach((m)=>materials.add(m));
        } else if (object instanceof THREE.Sprite) materials.add(object.material);
      });
      geometries.forEach((g)=>g.dispose()); materials.forEach((m)=>m.dispose()); textures.forEach((t)=>t.dispose()); scene.remove(root);
    },
  };
}
