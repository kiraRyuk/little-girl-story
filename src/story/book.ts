import * as THREE from "three";
import { bookPose } from "./book-motion";
import type { FrameContext } from "./types";

// Original cloth, foil ornaments and typesetting, drawn locally without image assets.
function printTexture(cover: boolean): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 768; canvas.height = 1080;
  const ctx = canvas.getContext("2d")!;
  const ground = ctx.createLinearGradient(0, 0, 768, 1080);
  ground.addColorStop(0, cover ? "#26313a" : "#e7ddc8");
  ground.addColorStop(.45, cover ? "#141c23" : "#f2eadb");
  ground.addColorStop(1, cover ? "#0b1016" : "#d8cbb3");
  ctx.fillStyle = ground; ctx.fillRect(0, 0, 768, 1080);
  // Deterministic fine cloth fibers; no large pixel buffers or external textures.
  let seed = 1845;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 5500; i++) {
    const x = random() * 768, y = random() * 1080;
    ctx.fillStyle = cover ? "#b8c4c50b" : "#5644250a";
    ctx.fillRect(x, y, cover ? 1 : 2, 1 + random() * 4);
  }
  const foil = ctx.createLinearGradient(100, 100, 650, 900);
  foil.addColorStop(0, "#ecd5a0"); foil.addColorStop(.4, "#a5854d"); foil.addColorStop(.7, "#dfc68d"); foil.addColorStop(1, "#9a7943");
  ctx.strokeStyle = cover ? foil : "#81715b";
  ctx.lineWidth = 2;
  ctx.strokeRect(47, 47, 674, 986);
  ctx.lineWidth = 1;
  ctx.strokeRect(58, 58, 652, 964);
  if (cover) {
    // Small original corner flourishes and an engraved match, kept clear of the title.
    for (const [x, y, sx, sy] of [[76,76,1,1],[692,76,-1,1],[76,1004,1,-1],[692,1004,-1,-1]]) {
      ctx.save(); ctx.translate(x!, y!); ctx.scale(sx!, sy!);
      ctx.beginPath(); ctx.moveTo(0, 45); ctx.quadraticCurveTo(0, 0, 45, 0);
      ctx.moveTo(0, 24); ctx.quadraticCurveTo(8, 8, 24, 0); ctx.stroke(); ctx.restore();
    }
    ctx.save(); ctx.translate(384, 693);
    ctx.strokeStyle = foil; ctx.fillStyle = foil; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-5, 95); ctx.lineTo(-5, -15); ctx.lineTo(5, -15); ctx.lineTo(5, 95); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -13); ctx.bezierCurveTo(-51,-32,-18,-73,0,-108);
    ctx.bezierCurveTo(1,-65,46,-46,0,-13); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,-22); ctx.quadraticCurveTo(-15,-43,0,-65); ctx.quadraticCurveTo(14,-36,0,-22); ctx.fill();
    for (let i=0;i<10;i++) {
      const a=i*Math.PI/5;
      ctx.beginPath(); ctx.moveTo(Math.cos(a)*82, Math.sin(a)*82-30);
      ctx.lineTo(Math.cos(a)*91, Math.sin(a)*91-30); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.fillStyle = cover ? foil : "#302b25";
  ctx.textAlign = "center";
  ctx.font = '600 22px "Cormorant Garamond", Georgia, serif';
  ctx.fillText("HANS CHRISTIAN ANDERSEN", 384, 153);
  ctx.font = 'italic 600 78px "Cormorant Garamond", Georgia, serif';
  ctx.fillText("The Little", 384, 327);
  ctx.font = 'italic 600 91px "Cormorant Garamond", Georgia, serif';
  ctx.fillText("Match Girl", 384, 417);
  ctx.beginPath(); ctx.moveTo(265, 463); ctx.lineTo(503, 463); ctx.stroke();
  ctx.font = '500 23px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(cover ? "A TALE OF WINTER" : "One cold night. Four small lights.", 384, 512);
  if (!cover) {
    ctx.textAlign = "left";
    ctx.font = '500 29px "Cormorant Garamond", Georgia, serif';
    ["Snow fell on New Year’s Eve.", "A barefoot girl walked the streets,", "selling matches. Nobody stopped.", "", "She held one small light in the cold."].forEach((line, i) => ctx.fillText(line, 116, 638 + i * 44));
  }
  ctx.textAlign = "center";
  ctx.font = '500 24px "Cormorant Garamond", Georgia, serif';
  ctx.fillText("1845", 384, 951);
  // A baked hinge shadow gives the page some depth without real-time lighting.
  const gutter = ctx.createLinearGradient(0, 0, 52, 0);
  gutter.addColorStop(0, "#00000055"); gutter.addColorStop(1, "#00000000");
  ctx.fillStyle = gutter; ctx.fillRect(0, 0, 52, 1080);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function coverShape() {
  const w = 2.64, h = 3.68, r = .055;
  const shape = new THREE.Shape();
  shape.moveTo(r, -h/2); shape.lineTo(w-r, -h/2);
  shape.quadraticCurveTo(w,-h/2,w,-h/2+r); shape.lineTo(w,h/2-r);
  shape.quadraticCurveTo(w,h/2,w-r,h/2); shape.lineTo(r,h/2);
  shape.quadraticCurveTo(0,h/2,0,h/2-r); shape.lineTo(0,-h/2+r);
  shape.quadraticCurveTo(0,-h/2,r,-h/2);
  return shape;
}

export function makeBook(scene: THREE.Scene, closing: boolean) {
  const group = new THREE.Group();
  group.name = "storybook";
  group.rotation.set(-.16, -.2, -.045);
  scene.add(group);
  const textures = [printTexture(false), printTexture(true)];
  const paper = new THREE.MeshBasicMaterial({ color: 0xdacdb7 });
  const edge = new THREE.MeshBasicMaterial({ color: 0xb4a58c });
  const leather = new THREE.MeshBasicMaterial({ color: 0x18222b });
  const spineShade = new THREE.MeshBasicMaterial({ color: 0x0c131b });
  const brass = new THREE.MeshBasicMaterial({ color: 0x9d8053 });
  const pages = new THREE.MeshBasicMaterial({ map: textures[0] });
  const coverPrint = new THREE.MeshBasicMaterial({ map: textures[1] });
  const boardGeometry = new THREE.ExtrudeGeometry(coverShape(), { depth: .115, bevelEnabled: false, curveSegments: 4 });
  boardGeometry.translate(0, 0, -.0575);
  const faceGeometry = new THREE.ShapeGeometry(coverShape(), 4);
  const pos = faceGeometry.attributes.position!;
  const uv = faceGeometry.attributes.uv!;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / 2.64, pos.getY(i) / 3.68 + .5);

  // One back board and one page block. No permanently open left-hand slab.
  const back = new THREE.Mesh(boardGeometry, leather); back.name = "back-cover";
  back.position.z = -.235; group.add(back);
  const stack = new THREE.Mesh(new THREE.BoxGeometry(2.43, 3.43, .29), paper);
  stack.name = "page-block"; stack.position.set(1.29, 0, -.015); group.add(stack);
  const edgeGeometry = new THREE.BoxGeometry(2.42, .006, .009);
  for (let i = 0; i < 18; i++) {
    for (const y of [-1.718, 1.718]) {
      const line = new THREE.Mesh(edgeGeometry, i % 3 ? paper : edge);
      line.position.set(1.29, y, -.15 + i * .016); group.add(line);
    }
  }
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(.205, .205, 3.64, 14), spineShade);
  spine.name = "spine"; spine.scale.x = .68; spine.position.set(.005, 0, -.04); group.add(spine);
  const ribGeometry = new THREE.CylinderGeometry(.212, .212, .018, 14);
  for (const y of [-1.4,-1.24,1.24,1.4]) {
    const rib = new THREE.Mesh(ribGeometry, brass); rib.scale.x = .69; rib.position.set(.005,y,-.04); group.add(rib);
  }

  const hinge = new THREE.Group(); hinge.name = "front-cover-hinge"; hinge.position.z = .22; group.add(hinge);
  const cover = new THREE.Mesh(boardGeometry, leather); hinge.add(cover);
  const label = new THREE.Mesh(faceGeometry, coverPrint); label.name = "gilt-cover";
  label.position.z = .06; hinge.add(label);
  // The inside lining has its own front-facing surface. The gilt exterior cannot
  // show backwards through an open board or compete with the title page.
  const lining = new THREE.Mesh(new THREE.PlaneGeometry(2.5,3.51), pages);
  lining.name = "inside-lining"; lining.position.set(1.32,0,-.062); lining.rotation.y = Math.PI; hinge.add(lining);

  const rightPage = new THREE.Mesh(new THREE.PlaneGeometry(2.41, 3.4), paper);
  rightPage.position.set(1.29,0,.137); group.add(rightPage);
  const portalMaterial = new THREE.MeshBasicMaterial({ color: 0x121212 });
  const portal = new THREE.Mesh(new THREE.PlaneGeometry(1.96, 2.6), portalMaterial);
  portal.name = "story-portal"; portal.position.set(1.29,-.1,.145); group.add(portal);
  const leaves: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  for (let i = 0; i < 3; i++) {
    const geometry = new THREE.PlaneGeometry(2.43, 3.42, 24, 1);
    geometry.translate(1.215, 0, 0);
    // Separate front/back page materials, rather than a mirrored DoubleSide print.
    const material = pages.clone();
    const leaf = new THREE.Mesh(geometry, material);
    const reverse = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0xe9dfcd, side: THREE.BackSide }));
    leaf.add(reverse);
    leaf.name = `turning-leaf-${i}`; leaf.position.set(.07,0,.177 + (2-i)*.003);
    group.add(leaf); leaves.push(leaf);
  }
  const target = new THREE.Vector3();
  return {
    update(progress: number, frame: FrameContext, camera: THREE.PerspectiveCamera) {
      const { open, leaves: turns, zoom } = bookPose(progress, closing);
      hinge.rotation.y = -Math.PI * open;
      leaves.forEach((leaf, i) => {
        const turn = turns[i]!;
        leaf.rotation.y = -Math.PI * turn;
        const positions = leaf.geometry.attributes.position!;
        for (let v = 0; v < positions.count; v++) {
          const x = positions.getX(v);
          positions.setZ(v, Math.sin(x / 2.43 * Math.PI) * Math.sin(turn * Math.PI) * .24);
        }
        positions.needsUpdate = true;
        leaf.visible = open > .98 && turn < .995;
      });
      group.updateMatrixWorld(true);
      const center = 1.29 * (1 - open);
      target.set(THREE.MathUtils.lerp(center,1.29,zoom), -.1*zoom, .145).applyMatrix4(group.matrixWorld);
      camera.fov = 32; camera.updateProjectionMatrix();
      const distance = THREE.MathUtils.lerp(10.4 * Math.max(1,.85/frame.viewport.aspect),1.65,zoom);
      camera.position.set(target.x + (1-zoom)*.8,target.y + (1-zoom)*.8,target.z+distance);
      camera.lookAt(target);
    },
    set(texture: THREE.Texture) {
      if (portalMaterial.map !== texture) {
        portalMaterial.map = texture; portalMaterial.color.set(0xffffff); portalMaterial.needsUpdate = true;
      }
    },
    dispose() {
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      group.traverse((object) => { if (object instanceof THREE.Mesh) {
        geometries.add(object.geometry);
        (Array.isArray(object.material) ? object.material : [object.material]).forEach((m) => materials.add(m));
      } });
      geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose()); textures.forEach((t) => t.dispose());
      scene.remove(group);
    },
  };
}
