import { CanvasTexture, SRGBColorSpace } from "three";
import { drawCharacterArt } from "./character-art";

const PALE = "#f2efe6";
const EMBER = "#ff7a1a";
const INK = "#050505";

function seeded(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function path(ctx: CanvasRenderingContext2D, points: [number, number][], fill?: string | null, stroke = PALE, width = 5) {
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.lineJoin = "round"; ctx.stroke(); }
}

function line(ctx: CanvasRenderingContext2D, points: [number, number][], color = PALE, width = 4) {
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

function drawWindows(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rng: () => number, lit: string) {
  ctx.fillStyle = INK;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#292d2f";
  ctx.lineWidth = 6;
  ctx.strokeRect(x, y, w, h);
  ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
  for (const [dx, dy] of [[.12,.12],[.62,.12],[.12,.62],[.62,.62]]) {
    if (rng() > .55) {
      ctx.fillStyle = lit;
      ctx.globalAlpha = .16 + rng() * .46;
      ctx.fillRect(x + w * dx, y + h * dy, w * .25, h * .25);
      ctx.globalAlpha = 1;
    }
  }
}

function drawTown(ctx: CanvasRenderingContext2D, rng: () => number, dawn = false) {
  const roof = dawn ? "#30373a" : "#151b1f";
  const baseY = 565;
  for (let i = 0; i < 10; i += 1) {
    const x = i * 112 - 26 + rng() * 20;
    const w = 90 + rng() * 48;
    const h = 150 + rng() * 245;
    ctx.fillStyle = i % 2 ? "#b6b3aa" : "#dbd7cc";
    ctx.fillRect(x, baseY - h, w, h + 130);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, baseY - h, w, h); ctx.clip();
    for (let hatch = 0; hatch < 50; hatch++) {
      const hx = x + rng() * w, hy = baseY - rng() * h;
      line(ctx, [[hx, hy], [hx + 8, hy - 23]], "rgba(25,25,23,.36)", 1);
    }
    ctx.restore();
    path(ctx, [[x - 13, baseY - h], [x + w * .48, baseY - h - 54 - rng() * 30], [x + w + 12, baseY - h]], roof, PALE, 5);
    for (let row = 0; row < 3; row += 1) for (let col = 0; col < 2; col += 1) {
      drawWindows(ctx, x + 15 + col * 39, baseY - h + 26 + row * 48, 21, 32, rng, dawn ? "#dbbf8d" : "#cf8950");
    }
  }
  ctx.fillStyle = dawn ? "#bcb6a6" : "#c2c6cb";
  ctx.globalAlpha = .7;
  ctx.fillRect(0, 625, 1024, 5);
  ctx.globalAlpha = 1;
  for (let i = 0; i < 40; i += 1) {
    const x = rng() * 1024, y = 600 + rng() * 165;
    ctx.fillStyle = i % 3 ? "rgba(235,232,222,.32)" : "rgba(235,232,222,.72)";
    ctx.fillRect(x, y, 2 + rng() * 5, 2 + rng() * 3);
  }
}

function drawTraveler(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1, elder = false, seated = false) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  const body = new Path2D();
  if (seated) {
    body.moveTo(-21,-112); body.bezierCurveTo(-58,-105,-55,-52,-45,-15);
    body.bezierCurveTo(-25,5,35,5,61,-14); body.bezierCurveTo(62,-36,27,-52,16,-58);
    body.bezierCurveTo(9,-80,14,-101,-5,-112); body.closePath();
  } else {
    body.moveTo(-24,-140); body.bezierCurveTo(-45,-124,-37,-98,-49,-65);
    body.lineTo(-62,-9); body.bezierCurveTo(-32,8,30,7,62,-8);
    body.bezierCurveTo(32,-55,37,-101,22,-135); body.closePath();
  }
  ctx.fillStyle="#1b1c19"; ctx.strokeStyle="#e6e1d4"; ctx.lineWidth=2;
  ctx.fill(body); ctx.stroke(body);
  ctx.save(); ctx.clip(body);
  ctx.strokeStyle="rgba(225,221,208,.45)"; ctx.lineWidth=.7;
  for (let i=0;i<95;i++) {
    const bx=(i*17)%120-60, by=-145+(i*31)%150;
    ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(bx+9,by-24); ctx.stroke();
  }
  ctx.restore();
  const headY=seated?-133:-165;
  const hood = new Path2D(); hood.moveTo(-26,headY+22);
  hood.bezierCurveTo(-45,headY-15,-20,headY-43,6,headY-35);
  hood.bezierCurveTo(36,headY-26,26,headY+4,30,headY+26); hood.closePath();
  ctx.fillStyle=elder?"#a29d90":"#282823"; ctx.fill(hood); ctx.strokeStyle="#d4cebd"; ctx.stroke(hood);
  ctx.fillStyle="#e4d8be"; ctx.beginPath(); ctx.ellipse(1,headY,16,23,-.12,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle="#36342d"; ctx.lineWidth=1.1;
  line(ctx, [[-9,headY-2],[-3,headY-3]], "#36342d", 1.1);
  line(ctx, [[7,headY-3],[12,headY-2]], "#36342d", 1.1);
  line(ctx, [[2,headY-1],[4,headY+7],[1,headY+8]], "#6c5a45", .8);
  line(ctx, [[-2,headY+13],[5,headY+13]], "#6c5a45", .8);
  ctx.strokeStyle=elder?"#ded8c8":"#302c24";
  for (let i=0;i<16;i++) {
    const hx=-22+i*2.6;
    ctx.beginPath(); ctx.moveTo(hx,headY-19); ctx.quadraticCurveTo(hx-4,headY-38,hx+4,headY-27); ctx.stroke();
  }
  if (seated) {
    line(ctx,[[-28,-82],[-12,-46],[29,-36]],"#c8c1af",7);
    line(ctx,[[13,-83],[34,-57],[26,-36]],"#d9cbb1",6);
    line(ctx,[[13,-3],[26,8],[48,9]],"#cdbc9e",5);
    line(ctx,[[7,1],[10,12],[28,15]],"#cdbc9e",5);
  } else {
    // A folded shawl and hands held close to the chest.
    line(ctx,[[-29,-127],[-4,-90],[30,-130]],"#c7c1ae",2);
    line(ctx,[[-32,-103],[-12,-73],[19,-83]],"#a7a291",8);
    line(ctx,[[25,-101],[28,-77],[12,-68]],"#d7c6a6",6);
    line(ctx,[[-18,-1],[-19,16],[-33,22]],"#cdbb9b",5);
    line(ctx,[[20,-1],[24,16],[40,18]],"#cdbb9b",5);
    for(let fold=0;fold<7;fold++) line(ctx,[[fold*10-30,-65],[fold*14-42,-9]],"#a6a18e",.8);
  }
  ctx.restore();
}

function drawBackdrop(ctx: CanvasRenderingContext2D, id: string) {
  const seed = id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 27);
  const rng = seeded(seed);
  const dawn = id === "morning";
  const warm = ["stove", "goose", "grandmother"].includes(id);
  const top = dawn ? "#59656a" : warm ? "#191614" : "#10171c";
  const bottom = warm ? "#211a15" : dawn ? "#8d8980" : "#070a0d";
  const gradient = ctx.createLinearGradient(0, 0, 0, 768);
  gradient.addColorStop(0, top); gradient.addColorStop(1, bottom);
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1024, 768);

  const glow = ctx.createRadialGradient(512, 350, 8, 512, 350, 470);
  glow.addColorStop(0, warm ? "rgba(229,154,82,.28)" : dawn ? "rgba(231,222,198,.22)" : "rgba(188,204,218,.09)");
  glow.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = glow; ctx.fillRect(0, 0, 1024, 768);

  if (["city", "street", "morning"].includes(id)) {
    drawTown(ctx, rng, dawn);
    if (id === "street") {
      ctx.fillStyle = "#101316";
      ctx.fillRect(0, 560, 1024, 208);
      ctx.strokeStyle = "rgba(229,154,82,.7)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(790, 410, 39, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(208,216,221,.34)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(80, 640); ctx.lineTo(370, 602);
      ctx.moveTo(680, 610); ctx.lineTo(960, 650);
      ctx.stroke();
    }
  }
  else if (id === "corner") {
    drawTown(ctx, rng);
    ctx.fillStyle = "#080b0e"; ctx.fillRect(365, 220, 305, 470);
    path(ctx, [[337,220],[510,100],[690,220]], "#101519", "#77736b", 7);
    ctx.fillStyle = "#e6b277"; ctx.globalAlpha = .62; ctx.fillRect(446, 315, 139, 168); ctx.globalAlpha = 1;
    ctx.strokeStyle = "#393a38"; ctx.lineWidth = 12; ctx.strokeRect(446,315,139,168);
  } else if (id === "matches") {
    ctx.fillStyle = "#1a1a18"; ctx.fillRect(0, 552, 1024, 216);
    path(ctx, [[110,560],[910,560],[830,684],[200,684]], "#171a1b", "#827d72", 4);
    for (let i = 0; i < 7; i += 1) line(ctx, [[410 + i * 20, 580],[480 + i * 5, 540]], i === 0 ? EMBER : "#bcb7aa", 5);
  } else if (id === "stove") {
    ctx.fillStyle = "#17191a"; ctx.fillRect(345, 180, 340, 470);
    ctx.strokeStyle = "#aaa18f"; ctx.lineWidth = 12; ctx.strokeRect(345,180,340,470);
    ctx.fillStyle = "#060809"; ctx.fillRect(410,280,210,275);
    ctx.strokeStyle = "#80664e"; ctx.lineWidth = 13; ctx.strokeRect(410,280,210,275);
    for (const x of [388, 645]) { ctx.fillStyle = "#b89b75"; ctx.beginPath(); ctx.arc(x, 320, 18, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#292a28"; ctx.fillRect(300, 640, 430, 24);
  } else if (id === "goose") {
    for (let i = 0; i < 8; i += 1) {
      const y = 112 + i * 44;
      line(ctx, [[70,y],[954,y]], i % 2 ? "#4b3325" : "#63442d", 3);
      for (let x = 90 + (i % 2) * 42; x < 950; x += 96) line(ctx, [[x,y],[x - 30,y + 44]], "#3f2b22", 2);
    }
    ctx.fillStyle = "#3c2a1e"; ctx.fillRect(180, 514, 665, 22);
    ctx.fillStyle = "#b7a589"; ctx.fillRect(230, 475, 540, 27);
    ctx.fillStyle = "#171617"; ctx.beginPath(); ctx.ellipse(545, 448, 92, 44, -.12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = EMBER; ctx.beginPath(); ctx.arc(639, 426, 25, 0, Math.PI * 2); ctx.fill();
    line(ctx, [[665,420],[696,431]], "#b4aa99", 7);
  } else if (id === "tree") {
    ctx.fillStyle = "#090e10"; ctx.fillRect(0, 632, 1024, 136);
    const x = 512;
    for (let tier = 0; tier < 7; tier += 1) {
      const y = 185 + tier * 61;
      const half = 290 - tier * 25;
      path(ctx, [[x,y - 44],[x - half,y + 54],[x + half,y + 54]], null, tier % 2 ? "#718174" : "#a6a08c", 4);
      for (let needle = 0; needle < 18; needle += 1) {
        const nx = x - half + rng() * half * 2;
        line(ctx, [[nx,y + 30 + rng() * 22],[nx + (rng() - .5) * 34,y + 54]], "#35463e", 3);
      }
    }
    ctx.fillStyle = "#4b382a"; ctx.fillRect(489, 585, 46, 126);
    for (let i = 0; i < 45; i += 1) {
      const x = 252 + rng() * 520, y = 230 + rng() * 375;
      ctx.fillStyle = i % 5 === 0 ? EMBER : "#d7d0bb"; ctx.globalAlpha = .28 + rng() * .55;
      ctx.beginPath(); ctx.arc(x, y, i % 5 === 0 ? 4 : 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (id === "grandmother") {
    drawTown(ctx, rng);
    ctx.fillStyle = "#090b0d"; ctx.fillRect(0, 485, 1024, 283);
    ctx.fillStyle = "#d88d4e"; ctx.globalAlpha = .55;
    ctx.beginPath(); ctx.arc(515, 381, 185, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    for (let i = 0; i < 18; i += 1) {
      const x = 240 + rng() * 544, y = 190 + rng() * 330;
      line(ctx, [[x,y],[512 + (x - 512) * 1.3, y - 200]], "rgba(245,214,168,.2)", 2);
    }
  } else if (id === "book" || id === "close") {
    ctx.fillStyle = "#111416"; ctx.fillRect(178, 132, 668, 514);
    path(ctx, [[208,172],[510,202],[510,606],[208,572]], "#ded5c2", "#a89b83", 5);
    path(ctx, [[514,202],[815,172],[815,572],[514,606]], "#c9bda8", "#a89b83", 5);
    line(ctx, [[512,202],[512,604]], "#8e806a", 8);
    ctx.fillStyle = "#242827"; ctx.font = "italic 44px Georgia"; ctx.textAlign = "center";
    ctx.fillText(id === "book" ? "A winter story" : "The last page", 512, 363);
    ctx.fillStyle = "#9b6843"; ctx.fillRect(370, 400, 284, 2);
    for (let i = 0; i < 20; i += 1) line(ctx, [[280 + i * 18,445],[400 + i * 8,462]], "#908776", 2);
  }

  if (!dawn && !["stove", "goose", "grandmother", "book", "close"].includes(id)) {
    ctx.fillStyle = "#d9dce0";
    for (let i = 0; i < 130; i += 1) {
      const x = rng() * 1024, y = rng() * 768;
      ctx.globalAlpha = .14 + rng() * .45;
      ctx.beginPath(); ctx.arc(x, y, .7 + rng() * 1.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  const vignette = ctx.createRadialGradient(512, 365, 180, 512, 365, 610);
  vignette.addColorStop(0, "rgba(0,0,0,0)"); vignette.addColorStop(1, "rgba(0,0,0,.58)");
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, 1024, 768);
}

export function makeBackdrop(id: string): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 768;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("2D canvas is unavailable");
  drawBackdrop(context, id);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 2;
  return texture;
}

export function makeFigure(kind: "traveler" | "elder" | "bystander" = "traveler", pose: "standing" | "seated" = "standing"): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 420; canvas.height = 700;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("2D canvas is unavailable");
  if (kind === "bystander") {
    context.fillStyle = "#343630"; context.strokeStyle = "#c7c3b8"; context.lineWidth = 2;
    const silhouette = new Path2D();
    silhouette.moveTo(175, 183); silhouette.quadraticCurveTo(133, 205, 143, 355);
    silhouette.lineTo(119, 628); silhouette.quadraticCurveTo(210, 654, 302, 628);
    silhouette.lineTo(278, 350); silhouette.quadraticCurveTo(287, 206, 244, 183); silhouette.closePath();
    context.fill(silhouette); context.stroke(silhouette);
    context.fillStyle = "#a6a194"; context.beginPath(); context.ellipse(210, 150, 35, 46, 0, 0, Math.PI * 2); context.fill();
    context.fillStyle = "#343630"; context.fillRect(165, 93, 90, 35); context.fillRect(145, 123, 130, 9);
  } else if (!drawCharacterArt(context, kind, pose === "seated")) {
    drawTraveler(context, 210, 604, 2.25, kind === "elder", pose === "seated");
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function makeEmberTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("2D canvas is unavailable");
  const gradient = context.createRadialGradient(64, 64, 1, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,242,211,1)");
  gradient.addColorStop(.16, "rgba(255,189,101,.92)");
  gradient.addColorStop(.48, "rgba(229,115,52,.3)");
  gradient.addColorStop(1, "rgba(229,115,52,0)");
  context.fillStyle = gradient; context.fillRect(0, 0, 128, 128);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
