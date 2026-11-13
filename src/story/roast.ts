import * as THREE from "three";
import { BEATS, beatProgress } from "./beats";

/** Original low-poly roast illustration. A serving dish, never a live bird. */
export function makeRoast(scene: THREE.Scene) {
  const group = new THREE.Group();
  const bird = new THREE.Group();
  group.add(bird);
  group.position.set(.35, -1.01, .05);
  scene.add(group);
  const skinCanvas = document.createElement("canvas");
  skinCanvas.width = 256; skinCanvas.height = 128;
  const ctx = skinCanvas.getContext("2d")!;
  const glaze = ctx.createLinearGradient(0, 0, 0, 128);
  glaze.addColorStop(0, "#4a2214"); glaze.addColorStop(.3, "#bc763c");
  glaze.addColorStop(.53, "#9a4d24"); glaze.addColorStop(1, "#3a1c12");
  ctx.fillStyle = glaze; ctx.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 1700; i++) {
    const x = (i * 97.37) % 256, y = (i * 41.83) % 128;
    ctx.fillStyle = i % 3 ? "#32130d24" : "#f9d59830";
    ctx.fillRect(x, y, 1.5, 1.5);
  }
  const texture = new THREE.CanvasTexture(skinCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const skin = new THREE.MeshBasicMaterial({ map: texture });
  const dark = new THREE.MeshBasicMaterial({ color: 0x64351e });
  const bone = new THREE.MeshBasicMaterial({ color: 0xe5d5ad });
  const porcelain = new THREE.MeshBasicMaterial({ color: 0xece4d3 });
  const rim = new THREE.MeshBasicMaterial({ color: 0xb7aa90 });
  const gravy = new THREE.MeshBasicMaterial({ color: 0x573521 });
  const leaf = new THREE.MeshBasicMaterial({ color: 0x596047 });
  const sphere = new THREE.SphereGeometry(1, 24, 14);
  function oval(material: THREE.MeshBasicMaterial, position: number[], scale: number[], parent = group) {
    const mesh = new THREE.Mesh(sphere, material);
    mesh.position.set(position[0]!, position[1]!, position[2]!);
    mesh.scale.set(scale[0]!, scale[1]!, scale[2]!); parent.add(mesh);
    return mesh;
  }
  oval(rim, [0, 0, 0], [1.37, .055, .83]);
  oval(porcelain, [0, .022, 0], [1.3, .055, .77]);
  oval(gravy, [0, .066, 0], [1.04, .012, .61]);
  oval(skin, [0, .4, -.02], [.88, .43, .54], bird);
  for (const side of [-1, 1]) {
    const thigh = oval(skin, [side * .66, .24, .32], [.4, .25, .22], bird);
    thigh.rotation.z = side * .35;
    const tip = oval(bone, [side * 1.02, .16, .38], [.19, .055, .055], bird);
    tip.rotation.z = side * -.17;
    oval(bone, [side * 1.18, .14, .38], [.055, .085, .075], bird);
    const wing = oval(dark, [side * .67, .28, -.29], [.32, .13, .18], bird);
    wing.rotation.y = side * .45;
  }
  for (let i = 0; i < 10; i++) {
    const angle = i * 2.399;
    const garnish = oval(leaf, [Math.cos(angle) * 1.1, .085, Math.sin(angle) * .62], [.14, .025, .065]);
    garnish.rotation.y = -angle;
  }
  const steamMaterial = new THREE.LineBasicMaterial({ color: 0xf2efe6, transparent: true, opacity: .2, depthWrite: false });
  const wisps: THREE.Line[] = [];
  for (let i = 0; i < 3; i++) {
    const points = Array.from({ length: 18 }, (_, j) => new THREE.Vector3(Math.sin(j * .45 + i) * .06, j / 17 * .85, 0));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), steamMaterial);
    line.position.set((i - 1) * .38, .77, 0); bird.add(line); wisps.push(line);
  }
  return {
    update(progress: number, time: number, reducedMotion: boolean) {
      // Rest on the platter during the feast caption; move only at its fantasy beat.
      const approach = beatProgress(progress, BEATS.goose.approach, BEATS.goose.arrived);
      bird.position.x = -approach * 1.65;
      bird.position.y = Math.abs(Math.sin(approach * Math.PI * 4)) * .09;
      bird.rotation.z = Math.sin(approach * Math.PI * 8) * .035;
      wisps.forEach((line, i) => {
        line.position.y = .77 + (reducedMotion ? 0 : ((time * .11 + i / 3) % 1) * .25);
        line.rotation.z = reducedMotion ? 0 : Math.sin(time * .45 + i) * .08;
      });
      steamMaterial.opacity = progress > .88 ? Math.max(0, (1 - progress) / .12) * .2 : .2;
    },
    dispose() {
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      group.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
          geometries.add(child.geometry); materials.add(child.material);
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      texture.dispose(); scene.remove(group);
    },
  };
}
