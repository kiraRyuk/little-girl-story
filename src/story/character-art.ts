/** Original generated atlas, decoded once and trimmed at low resolution. */
type Bounds = { x: number; y: number; width: number; height: number };
let atlas: HTMLImageElement | null = null;
let bounds: Bounds[] = [];

export async function prepareCharacterArt(): Promise<void> {
  const image = new Image();
  image.src = "/art/characters-ink-v1.png";
  let timer = 0;
  try {
    await Promise.race([
      image.decode(),
      new Promise<never>((_, reject) => { timer = window.setTimeout(() => reject(new Error("Character image load timed out")), 5000); }),
    ]);
    const scan = document.createElement("canvas");
    scan.width = Math.min(768, image.naturalWidth);
    scan.height = Math.round(image.naturalHeight * scan.width / image.naturalWidth);
    const ctx = scan.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(image, 0, 0, scan.width, scan.height);
    const pixels = ctx.getImageData(0, 0, scan.width, scan.height).data;
    const scaleX = image.naturalWidth / scan.width;
    const scaleY = image.naturalHeight / scan.height;
    bounds = Array.from({ length: 3 }, (_, index) => {
      const left = Math.floor(index * scan.width / 3);
      const right = Math.floor((index + 1) * scan.width / 3);
      let x0 = right, x1 = left, y0 = scan.height, y1 = 0;
      for (let y = 0; y < scan.height; y++) for (let x = left; x < right; x++) {
        if (pixels[(y * scan.width + x) * 4 + 3]! < 32) continue;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x);
        y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
      if (x1 < x0) throw new Error(`Empty character atlas cell ${index}`);
      const sx = Math.max(left * scaleX, (x0 - 2) * scaleX);
      const sy = Math.max(0, (y0 - 2) * scaleY);
      return {
        x: sx, y: sy,
        width: Math.min(right * scaleX, (x1 + 3) * scaleX) - sx,
        height: Math.min(image.naturalHeight, (y1 + 3) * scaleY) - sy,
      };
    });
    atlas = image;
  } catch (error) {
    atlas = null; bounds = [];
    console.warn("Character artwork could not load; using the procedural fallback.", error);
  } finally {
    if (timer) window.clearTimeout(timer);
  }
}

export function drawCharacterArt(ctx: CanvasRenderingContext2D, kind: "traveler" | "elder", seated: boolean): boolean {
  if (!atlas) return false;
  const index = kind === "elder" ? 2 : seated ? 1 : 0;
  const box = bounds[index];
  if (!box) return false;
  const height = kind === "elder" ? 600 : seated ? 345 : 530;
  const width = height * box.width / box.height;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(atlas, box.x, box.y, box.width, box.height, 210 - width / 2, 660 - height, width, height);
  return true;
}
