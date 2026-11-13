import type * as THREE from "three";

export type TransitionKind = "cut" | "page" | "ink" | "black" | "white";
export type AmbienceName = "wind" | "crackle";

export interface TransitionSpec {
  kind: TransitionKind;
  length: number;
}

export interface CaptionCue {
  id: string;
  from: number;
  to: number;
  text: string;
  kind?: "narration" | "speech";
}

export interface AudioCue {
  at: number;
  id: "strike" | "rush" | "out";
}

export interface ViewportState {
  width: number;
  height: number;
  aspect: number;
  pixelRatio: number;
}

export interface FrameContext {
  time: number;
  delta: number;
  viewport: ViewportState;
  pointer: THREE.Vector2;
  direction: -1 | 0 | 1;
  reducedMotion: boolean;
}

export interface Grade {
  contrast: number;
  exposure: number;
  saturation: number;
  vignette: number;
  grain: number;
  glow: number;
}

export interface ChapterDefinition {
  id: string;
  title: string;
  duration: number;
  transition?: TransitionSpec;
  captions: CaptionCue[];
  cues?: AudioCue[];
  ambience: Partial<Record<AmbienceName, number>>;
  grade: Partial<Grade>;
  portals?: string[];
}

export interface ChapterRuntime extends ChapterDefinition {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  update(progress: number, frame: FrameContext): void;
  resize?(viewport: ViewportState): void;
  setPortal?(id: string, texture: THREE.Texture): void;
  dispose(): void;
}

export interface TransitionState {
  fromIndex: number;
  toIndex: number;
  progress: number;
  kind: TransitionKind;
  active: boolean;
}
