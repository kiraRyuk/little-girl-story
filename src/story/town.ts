import * as THREE from "three";
import { smoothstep } from "./timeline";
import type { FrameContext } from "./types";

/** Original geometry with shared facade textures and a descending camera path. */
export function makeTown(scene: THREE.Scene) {
  const group = new THREE.Group(); scene.add(group);
  const canvas = document.createElement("canvas"); canvas.width = 128; canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#dbd7cc"; ctx.fillRect(0, 0, 128, 256);
  ctx.strokeStyle = "#77756d"; ctx.lineWidth = 1;
  for (let i = 0; i < 90; i++) {
    const y = (i * 31) % 256, x = (i * 47) % 128;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 12, y - 20); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const wall = new THREE.MeshBasicMaterial({ map: texture });
  const roof = new THREE.MeshBasicMaterial({ color: 0x1a1a18 });
  const snow = new THREE.MeshBasicMaterial({ color: 0xeeeae0 });
  const dark = new THREE.MeshBasicMaterial({ color: 0x101110 });
  const light = new THREE.MeshBasicMaterial({ color: 0xe4c997 });
  const box = new THREE.BoxGeometry(1, 1, 1);
  const triangle = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4);
  const plane = new THREE.PlaneGeometry(1, 1);
  for (let row = 0; row < 5; row++) {
    for (let column = -5; column <= 5; column++) {
      if (column === 0 || (row % 2 === 0 && column === 1)) continue;
      const n = Math.abs(Math.sin(row * 37 + column * 71));
      const h = 2.5 + n * 4, w = 1.7 + n * .8;
      const x = column * 3.2 + (row % 2) * .4, z = -row * 8 - 5;
      const body = new THREE.Mesh(box, wall); body.scale.set(w, h, 2.6); body.position.set(x, h / 2 - 2, z); group.add(body);
      const cap = new THREE.Mesh(triangle, roof); cap.rotation.y = Math.PI / 4;
      cap.scale.set(w * 1.15, 1.4, 3.05); cap.position.set(x, h - 1.3, z); group.add(cap);
      const ledge = new THREE.Mesh(box, snow); ledge.scale.set(w * 1.08, .08, .16); ledge.position.set(x, h - 2, z + 1.35); group.add(ledge);
      for (let level = 0; level < 3; level++) for (let side = -1; side <= 1; side += 2) {
        const window = new THREE.Mesh(plane, (row + column + level) % 7 === 0 ? light : dark);
        window.scale.set(.26, .46, 1); window.position.set(x + side * w * .25, h - 2.6 - level * .9, z + 1.31); group.add(window);
      }
    }
  }
  const ground = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ color: 0xc8c6bd }));
  ground.rotation.x = -Math.PI / 2; ground.scale.set(100, 100, 1); ground.position.set(0, -2.04, -15); group.add(ground);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(5, 40), snow); moon.position.set(-9, 21, -62); group.add(moon);
  // All buildings are static: batch repeated geometry/material pairs for the legacy GPU.
  const batches = new Map<string, THREE.Mesh[]>();
  for (const child of [...group.children]) {
    if (!(child instanceof THREE.Mesh)) continue;
    const key = `${child.geometry.uuid}:${child.material.uuid}`;
    const batch = batches.get(key) ?? [];
    batch.push(child); batches.set(key, batch);
  }
  for (const batch of batches.values()) {
    if (batch.length < 2) continue;
    const first = batch[0]!;
    const instances = new THREE.InstancedMesh(first.geometry, first.material, batch.length);
    batch.forEach((mesh, index) => {
      mesh.updateMatrix(); instances.setMatrixAt(index, mesh.matrix); group.remove(mesh);
    });
    instances.computeBoundingSphere(); group.add(instances);
  }
  const look = new THREE.Vector3();
  return {
    update(p: number, frame: FrameContext, camera: THREE.PerspectiveCamera) {
      const t = smoothstep(p);
      camera.fov = 48 - t * 7;
      camera.updateProjectionMatrix();
      camera.position.set(7 * (1 - t) + .6, 13 * (1 - t) + 1.9, 23 - t * 16);
      camera.position.x += frame.reducedMotion ? 0 : frame.pointer.x * .25;
      look.set(0, 3 * (1 - t) + 1.4, -19);
      camera.lookAt(look);
    },
    dispose() {
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      group.traverse((o) => { if (o instanceof THREE.Mesh) { geometries.add(o.geometry); materials.add(o.material); } if (o instanceof THREE.InstancedMesh) o.dispose(); });
      geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose()); texture.dispose();
    },
  };
}
