import * as THREE from "three";
import { STORY, chapterProgress, clamp, transitionAt } from "./timeline";
import type { ChapterRuntime, FrameContext, Grade, ViewportState } from "./types";

export interface RenderFrame {
  elapsed: number;
  delta: number;
  pointer: THREE.Vector2;
  direction: -1 | 0 | 1;
  reducedMotion: boolean;
}

const fullscreenVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const compositeFragment = `
  precision highp float;
  uniform sampler2D tFrom;
  uniform sampler2D tTo;
  uniform float uMix;
  uniform float uKind;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uContrast;
  uniform float uExposure;
  uniform float uSaturation;
  uniform float uGlow;
  uniform float uVignette;
  uniform float uGrain;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  vec3 grade(vec3 color) {
    color *= uExposure;
    color = (color - 0.5) * uContrast + 0.5;
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(vec3(luma), color, uSaturation);
    color += vec3(1.0, 0.56, 0.28) * smoothstep(0.48, 0.96, luma) * uGlow * 0.16;
    float edge = length((vUv - 0.5) * vec2(uResolution.x / max(1.0, uResolution.y), 1.0));
    color *= 1.0 - smoothstep(0.38, 0.78, edge) * uVignette;
    float noise = hash(floor(gl_FragCoord.xy) + floor(uTime * 18.0));
    color += (noise - 0.5) * uGrain;
    return clamp(color, 0.0, 1.0);
  }

  void main() {
    vec2 uv = vUv;
    vec4 a = texture2D(tFrom, uv);
    vec4 b = texture2D(tTo, uv);
    float p = clamp(uMix, 0.0, 1.0);
    vec4 result = mix(a, b, p);

    if (uKind > 0.5 && uKind < 1.5) {
      float foldX = 1.0 - p;
      float distanceToFold = abs(uv.x - foldX);
      float curl = sin(clamp((uv.x - foldX + 0.14) / 0.28, 0.0, 1.0) * 3.14159265) * 0.075;
      vec2 sheetUv = vec2(clamp(uv.x + (uv.x < foldX ? curl : -curl), 0.0, 1.0), uv.y);
      vec4 sheet = texture2D(tFrom, sheetUv);
      vec4 reverseSide = texture2D(tFrom, vec2(1.0 - sheetUv.x, sheetUv.y));
      float reveal = smoothstep(foldX - 0.012, foldX + 0.012, uv.x);
      float edgeLight = 1.0 - smoothstep(0.0, 0.035, distanceToFold);
      result = mix(sheet, b, reveal);
      result.rgb = mix(result.rgb, reverseSide.rgb * 0.72 + 0.12, edgeLight * 0.38);
      result.rgb += vec3(0.11, 0.085, 0.055) * edgeLight;
    } else if (uKind > 1.5 && uKind < 2.5) {
      float noise = hash(floor(uv * vec2(112.0, 78.0)) + floor(uTime * 7.0)) - 0.5;
      float threshold = p + noise * 0.12;
      float reveal = smoothstep(uv.x - 0.035, uv.x + 0.035, threshold);
      result = mix(a, b, reveal);
    } else if (uKind > 2.5 && uKind < 3.5) {
      vec4 black = vec4(0.015, 0.018, 0.02, 1.0);
      result = p < 0.5 ? mix(a, black, smoothstep(0.0, 0.5, p)) : mix(black, b, smoothstep(0.5, 1.0, p));
    } else if (uKind > 3.5) {
      vec4 paper = vec4(0.9, 0.88, 0.82, 1.0);
      result = p < 0.5 ? mix(a, paper, smoothstep(0.0, 0.5, p)) : mix(paper, b, smoothstep(0.5, 1.0, p));
    }

    gl_FragColor = vec4(grade(result.rgb), 1.0);
    #include <colorspace_fragment>
  }
`;

const DEFAULT_GRADE: Grade = {
  contrast: 1,
  exposure: 1,
  saturation: 0.12,
  vignette: 0.22,
  grain: 0.018,
  glow: 0,
};

const TRANSITION_VALUE = { cut: 0, page: 1, ink: 2, black: 3, white: 4 } as const;

function mixGrade(from: ChapterRuntime, to: ChapterRuntime, amount: number): Grade {
  const a = { ...DEFAULT_GRADE, ...from.grade };
  const b = { ...DEFAULT_GRADE, ...to.grade };
  return {
    contrast: THREE.MathUtils.lerp(a.contrast, b.contrast, amount),
    exposure: THREE.MathUtils.lerp(a.exposure, b.exposure, amount),
    saturation: THREE.MathUtils.lerp(a.saturation, b.saturation, amount),
    vignette: THREE.MathUtils.lerp(a.vignette, b.vignette, amount),
    grain: THREE.MathUtils.lerp(a.grain, b.grain, amount),
    glow: THREE.MathUtils.lerp(a.glow, b.glow, amount),
  };
}

export class StoryRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly chapters: ChapterRuntime[];
  private readonly canvas: HTMLCanvasElement;
  private readonly compositeScene = new THREE.Scene();
  private readonly compositeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2);
  private readonly compositeMaterial: THREE.ShaderMaterial;
  private readonly targets: THREE.WebGLRenderTarget[] = [];
  private readonly targetByChapter = new Map<number, THREE.WebGLRenderTarget>();
  private readonly visiting = new Set<number>();
  private viewport: ViewportState = { width: 1, height: 1, aspect: 1, pixelRatio: 1 };
  private targetCursor = 0;
  private lastQualityCheck = 0;
  private qualitySamples: number[] = [];
  private readonly minRatio = 0.7;
  private readonly maxRatio: number;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, chapters: ChapterRuntime[]) {
    this.canvas = canvas;
    this.chapters = chapters;
    this.maxRatio = window.matchMedia("(max-width: 700px)").matches ? 1.1 : 1.25;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, this.maxRatio);
    this.viewport.pixelRatio = pixelRatio;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: "low-power",
      stencil: false,
      depth: true,
      preserveDrawingBuffer: false,
    });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setClearColor(0x080a0c, 1);

    this.compositeCamera.position.z = 1;
    this.compositeMaterial = new THREE.ShaderMaterial({
      vertexShader: fullscreenVertex,
      fragmentShader: compositeFragment,
      uniforms: {
        tFrom: { value: null },
        tTo: { value: null },
        uMix: { value: 0 },
        uKind: { value: 0 },
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uContrast: { value: 1 },
        uExposure: { value: 1 },
        uSaturation: { value: 1 },
        uGlow: { value: 0 },
        uVignette: { value: 0.22 },
        uGrain: { value: 0.018 },
      },
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.compositeMaterial);
    this.compositeScene.add(quad);
    this.resize(window.innerWidth, window.innerHeight);
  }

  resize(width: number, height: number): void {
    if (this.disposed) return;
    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);
    const ratio = this.viewport.pixelRatio;
    this.viewport = {
      width: safeWidth,
      height: safeHeight,
      aspect: safeWidth / safeHeight,
      pixelRatio: ratio,
    };
    const drawWidth = Math.max(1, Math.floor(safeWidth * ratio));
    const drawHeight = Math.max(1, Math.floor(safeHeight * ratio));
    this.renderer.setSize(drawWidth, drawHeight, false);
    for (const target of this.targets) target.setSize(drawWidth, drawHeight);
    for (const chapter of this.chapters) chapter.resize?.(this.viewport);
    this.compositeMaterial.uniforms.uResolution!.value.set(drawWidth, drawHeight);
  }

  render(timelineTime: number, frame: RenderFrame): void {
    if (this.disposed) return;
    this.observeFrame(frame.delta, frame.elapsed);
    this.targetByChapter.clear();
    this.visiting.clear();
    this.targetCursor = 0;

    const rawTransition = transitionAt(timelineTime);
    const transition = frame.reducedMotion && rawTransition.active
      ? {
          fromIndex: rawTransition.progress >= 0.5 ? rawTransition.toIndex : rawTransition.fromIndex,
          toIndex: rawTransition.progress >= 0.5 ? rawTransition.toIndex : rawTransition.fromIndex,
          progress: 0,
          kind: "cut" as const,
          active: false,
        }
      : rawTransition;
    const fromIndex = transition.fromIndex;
    const toIndex = transition.toIndex;
    const fromTarget = this.renderChapter(fromIndex, timelineTime, frame);
    const toTarget = toIndex === fromIndex ? fromTarget : this.renderChapter(toIndex, timelineTime, frame);
    const fromChapter = this.chapters[fromIndex]!;
    const toChapter = this.chapters[toIndex]!;
    const amount = transition.active ? transition.progress : 0;
    const grade = mixGrade(fromChapter, toChapter, amount);

    this.compositeMaterial.uniforms.tFrom!.value = fromTarget.texture;
    this.compositeMaterial.uniforms.tTo!.value = toTarget.texture;
    this.compositeMaterial.uniforms.uMix!.value = transition.active ? amount : 0;
    this.compositeMaterial.uniforms.uKind!.value = TRANSITION_VALUE[transition.kind];
    this.compositeMaterial.uniforms.uTime!.value = frame.elapsed;
    this.compositeMaterial.uniforms.uContrast!.value = grade.contrast;
    this.compositeMaterial.uniforms.uExposure!.value = grade.exposure;
    this.compositeMaterial.uniforms.uSaturation!.value = grade.saturation;
    this.compositeMaterial.uniforms.uGlow!.value = grade.glow;
    this.compositeMaterial.uniforms.uVignette!.value = grade.vignette;
    this.compositeMaterial.uniforms.uGrain!.value = frame.reducedMotion ? 0 : grade.grain;

    this.renderer.setRenderTarget(null);
    this.renderer.render(this.compositeScene, this.compositeCamera);
  }

  private renderChapter(index: number, timelineTime: number, frame: RenderFrame): THREE.WebGLRenderTarget {
    const cached = this.targetByChapter.get(index);
    if (cached) return cached;
    if (this.visiting.has(index)) throw new Error(`Circular portal reference at ${STORY[index]?.id ?? index}`);
    const chapter = this.chapters[index];
    if (!chapter) throw new Error(`Missing chapter ${index}`);
    this.visiting.add(index);

    for (const portalId of chapter.portals ?? []) {
      const portalIndex = STORY.findIndex((item) => item.id === portalId);
      if (portalIndex >= 0) {
        const portalTarget = this.renderChapter(portalIndex, timelineTime, frame);
        chapter.setPortal?.(portalId, portalTarget.texture);
      }
    }

    const target = this.acquireTarget();
    const progress = chapterProgress(timelineTime, index);
    const context: FrameContext = {
      time: frame.elapsed,
      delta: frame.delta,
      viewport: this.viewport,
      pointer: frame.pointer,
      direction: frame.direction,
      reducedMotion: frame.reducedMotion,
    };
    chapter.update(progress, context);
    this.renderer.setRenderTarget(target);
    this.renderer.clear(true, true, true);
    this.renderer.render(chapter.scene, chapter.camera);
    this.targetByChapter.set(index, target);
    this.visiting.delete(index);
    return target;
  }

  private acquireTarget(): THREE.WebGLRenderTarget {
    let target = this.targets[this.targetCursor];
    if (!target) {
      target = new THREE.WebGLRenderTarget(1, 1, {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        depthBuffer: true,
        stencilBuffer: false,
        samples: 0,
      });
      target.texture.generateMipmaps = false;
      this.targets.push(target);
      target.setSize(
        Math.max(1, Math.floor(this.viewport.width * this.viewport.pixelRatio)),
        Math.max(1, Math.floor(this.viewport.height * this.viewport.pixelRatio)),
      );
    }
    this.targetCursor += 1;
    return target;
  }

  private observeFrame(delta: number, elapsed: number): void {
    if (elapsed - this.lastQualityCheck < 2) {
      this.qualitySamples.push(delta);
      return;
    }
    if (this.qualitySamples.length > 8) {
      const average = this.qualitySamples.reduce((sum, sample) => sum + sample, 0) / this.qualitySamples.length;
      let ratio = this.viewport.pixelRatio;
      if (average > 1 / 40) ratio = Math.max(this.minRatio, ratio - 0.15);
      else if (average < 1 / 58) ratio = Math.min(Math.min(window.devicePixelRatio || 1, this.maxRatio), ratio + 0.1);
      if (Math.abs(ratio - this.viewport.pixelRatio) > 0.01) {
        this.viewport.pixelRatio = Math.round(ratio * 100) / 100;
        this.resize(this.viewport.width, this.viewport.height);
      }
    }
    this.qualitySamples = [];
    this.lastQualityCheck = elapsed;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.targets.forEach((target) => target.dispose());
    this.chapters.forEach((chapter) => chapter.dispose());
    const quad = this.compositeScene.children[0] as THREE.Mesh | undefined;
    quad?.geometry.dispose();
    this.compositeMaterial.dispose();
    this.renderer.dispose();
  }
}
