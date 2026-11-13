import * as THREE from "three";
import { StoryAudio } from "./audio";
import { prepareCharacterArt } from "./character-art";
import { buildChapters } from "./chapters";
import { StoryRenderer } from "./renderer";
import { STORY, TOTAL_UNITS, TimelineController, captionAt, chapterProgress, clamp, transitionAt } from "./timeline";

const canvas = document.querySelector<HTMLCanvasElement>("#view");
const scrollSpacer = document.querySelector<HTMLElement>("#scroll");
const gate = document.querySelector<HTMLElement>("#gate");
const enterButton = document.querySelector<HTMLButtonElement>("#enter");
const quietButton = document.querySelector<HTMLButtonElement>("#enter-quiet");
const soundButton = document.querySelector<HTMLButtonElement>("#sound");
const audioNotice = document.querySelector<HTMLElement>("#audio-notice");
const captions = document.querySelector<HTMLElement>("#captions");
const transcript = document.querySelector<HTMLElement>("#transcript");
const chapterLabel = document.querySelector<HTMLElement>("#chapter-label");
const progressBar = document.querySelector<HTMLElement>("#progress-bar");
const hint = document.querySelector<HTMLElement>("#hint");
const endCredit = document.querySelector<HTMLElement>("#end-credit");
const hud = document.querySelector<HTMLElement>("#hud");
const matchProgress = document.querySelector<HTMLElement>("#match-progress");
const fallback = document.querySelector<HTMLElement>("#fallback-story");

if (!canvas || !scrollSpacer || !gate || !enterButton || !quietButton || !soundButton || !captions || !transcript || !chapterLabel || !progressBar || !hint || !hud || !fallback) {
  throw new Error("The story page is missing a required interface element.");
}

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const timeline = new TimelineController();
const pointer = new THREE.Vector2();
const audio = new StoryAudio((message) => {
  if (audioNotice) audioNotice.textContent = message;
});
let chapters: ReturnType<typeof buildChapters> = [];
let renderer: StoryRenderer | null = null;
let started = false;
let animationFrame = 0;
let autoScrollFrame = 0;
let autoScrollTimeout = 0;
let previousFrame = 0;
let elapsed = 0;
let lastCaptionId = "";
let previousChapterProgress = new Map<string, number>();
let resizeObserver: ResizeObserver | null = null;
const SCROLL_SCALE = 1.25;
let viewportHeight = window.innerHeight;

function saveSoundPreference(enabled: boolean): void {
  try { window.localStorage.setItem("last-light-sound", enabled ? "on" : "off"); } catch { /* Storage can be unavailable in private contexts. */ }
}

for (const chapter of STORY) {
  const heading = document.createElement("h2");
  heading.textContent = chapter.title;
  transcript.append(heading);
  for (const cue of chapter.captions) {
    const paragraph = document.createElement("p");
    paragraph.textContent = cue.text;
    transcript.append(paragraph);
  }
}

const fallbackTitle = document.createElement("h2");
fallbackTitle.textContent = "The Little Match Girl";
const fallbackIntro = document.createElement("p");
fallbackIntro.textContent = "An independent adaptation of Hans Christian Andersen’s 1845 story: a barefoot girl selling matches on New Year’s Eve, her visions of warmth, and the town that fails to help her.";
const fallbackSections: HTMLElement[] = [];
for (const chapter of STORY) {
  const section = document.createElement("section");
  const heading = document.createElement("h3");
  heading.textContent = chapter.title;
  const paragraph = document.createElement("p");
  paragraph.textContent = chapter.captions.map((cue) => cue.text).join(" ");
  section.append(heading, paragraph);
  fallbackSections.push(section);
}
fallback!.replaceChildren(fallbackTitle, fallbackIntro, ...fallbackSections);

function setScrollSpace(): void {
  const previousUnits = window.scrollY / Math.max(1, viewportHeight * SCROLL_SCALE);
  const resized = viewportHeight !== window.innerHeight;
  viewportHeight = window.innerHeight;
  scrollSpacer!.style.height = `${Math.ceil((TOTAL_UNITS * SCROLL_SCALE + 1) * viewportHeight)}px`;
  if (resized) {
    stopAutoScroll();
    window.scrollTo(0, previousUnits * viewportHeight * SCROLL_SCALE);
  }
}

function setSoundButton(enabled: boolean): void {
  soundButton!.setAttribute("aria-pressed", String(enabled));
  soundButton!.setAttribute("aria-label", enabled ? "Turn sound off" : "Turn sound on");
  soundButton!.innerHTML = `${enabled ? "Sound on" : "Sound off"} <span class="sound-dot" aria-hidden="true"></span>`;
}

function blendAmbience(time: number): void {
  const transition = transitionAt(time);
  const from = STORY[transition.fromIndex]!;
  const to = STORY[transition.toIndex]!;
  const amount = transition.active ? transition.progress : 0;
  const names = new Set([...Object.keys(from.ambience), ...Object.keys(to.ambience)]);
  const levels: Record<string, number> = {};
  for (const name of names) {
    const a = from.ambience[name as keyof typeof from.ambience] ?? 0;
    const b = to.ambience[name as keyof typeof to.ambience] ?? 0;
    levels[name] = THREE.MathUtils.lerp(a, b, amount);
  }
  audio.updateAmbience(levels);
}

function updateCues(time: number, direction: -1 | 0 | 1): void {
  const transition = transitionAt(time);
  const indices = transition.active ? [transition.fromIndex, transition.toIndex] : [transition.fromIndex];
  for (const index of new Set(indices)) {
    const chapter = STORY[index]!;
    const progress = chapterProgress(time, index);
    const previous = previousChapterProgress.get(chapter.id);
    if (direction > 0 && previous !== undefined && progress >= previous) {
      for (const cue of chapter.cues ?? []) {
        if (previous < cue.at && progress >= cue.at) audio.playCue(cue.id);
      }
    }
    previousChapterProgress.set(chapter.id, progress);
  }
}

function updateInterface(time: number): void {
  const { cue, index, progress } = captionAt(time);
  captions!.classList.toggle("intro-caption", STORY[index]!.id === "book");
  endCredit?.classList.toggle("visible", started && STORY[index]!.id === "close" && progress >= .72);
  chapterLabel!.textContent = STORY[index]!.title;
  progressBar!.style.transform = `scaleX(${time / TOTAL_UNITS})`;
  matchProgress?.style.setProperty("--burn", String(time / TOTAL_UNITS));
  matchProgress?.style.setProperty("--heat", time >= 34.7 ? "0" : "1");
  hint!.style.opacity = started && time > .85 && time < 2.4 ? "1" : "0";
  const nextId = cue?.id ?? "";
  if (nextId !== lastCaptionId) {
    lastCaptionId = nextId;
    captions!.replaceChildren();
    if (cue) {
      captions!.textContent = cue.text;
      // Short, cancellable entrance: all words are readable immediately.
      captions!.getAnimations().forEach((animation) => animation.cancel());
      if (!reducedMotion.matches) captions!.animate([
        { opacity: 0, transform: "translateY(6px)" },
        { opacity: 1, transform: "translateY(0)" },
      ], { duration: 180, easing: "ease-out" });
    }
    captions!.classList.toggle("speech", cue?.kind === "speech");
    captions!.classList.toggle("visible", Boolean(cue));
  }
  hud!.setAttribute("aria-hidden", String(!started));
}

function render(now: number): void {
  if (!started) return;
  if (document.visibilityState === "hidden") {
    animationFrame = 0;
    return;
  }
  const delta = previousFrame === 0 ? 1 / 60 : Math.min((now - previousFrame) / 1000, 0.1);
  previousFrame = now;
  elapsed += delta;
  const time = reducedMotion.matches
    ? (timeline.set(clamp(window.scrollY / Math.max(1, viewportHeight * SCROLL_SCALE), 0, TOTAL_UNITS)), timeline.time)
    : timeline.update(window.scrollY, viewportHeight * SCROLL_SCALE, delta);
  const direction = timeline.direction();
  updateCues(time, direction);
  updateInterface(time);
  blendAmbience(time);
  try {
    renderer?.render(time, { elapsed, delta, pointer, direction, reducedMotion: reducedMotion.matches });
  } catch (error) {
    renderer?.dispose();
    renderer = null;
    showFallback(error);
    fallback!.removeAttribute("aria-hidden");
  }
  animationFrame = requestAnimationFrame(render);
}

function stopAutoScroll(): void {
  if (autoScrollFrame) cancelAnimationFrame(autoScrollFrame);
  if (autoScrollTimeout) window.clearTimeout(autoScrollTimeout);
  autoScrollFrame = 0;
  autoScrollTimeout = 0;
  window.removeEventListener("wheel", stopAutoScroll);
  window.removeEventListener("touchstart", stopAutoScroll);
  window.removeEventListener("keydown", stopAutoScroll);
  window.removeEventListener("pointerdown", stopAutoScroll);
}

function beginIntroScroll(): void {
  if (reducedMotion.matches) return;
  let startTime = 0;
  const from = window.scrollY;
  const to = Math.min(1.05, TOTAL_UNITS) * viewportHeight * SCROLL_SCALE;
  const duration = 3500;
  const tick = (now: number) => {
    if (!startTime) startTime = now;
    const t = clamp((now - startTime) / duration);
    const eased = (1 - Math.cos(Math.PI * t)) * 0.5;
    window.scrollTo(0, from + (to - from) * eased);
    if (t < 1 && started) autoScrollFrame = requestAnimationFrame(tick);
    else stopAutoScroll();
  };
  const cancelOnInput = { passive: true, once: true } as AddEventListenerOptions;
  window.addEventListener("wheel", stopAutoScroll, cancelOnInput);
  window.addEventListener("touchstart", stopAutoScroll, cancelOnInput);
  window.addEventListener("keydown", stopAutoScroll, cancelOnInput);
  window.addEventListener("pointerdown", stopAutoScroll, cancelOnInput);
  autoScrollTimeout = window.setTimeout(() => { autoScrollFrame = requestAnimationFrame(tick); }, 500);
}

async function enterStory(withSound: boolean): Promise<void> {
  if (started) return;
  stopAutoScroll();
  window.scrollTo(0, 0);
  timeline.set(0);
  started = true;
  document.body.classList.add("started");
  gate!.classList.add("gone");
  gate!.setAttribute("aria-hidden", "true");
  if (document.body.classList.contains("webgl-fallback")) fallback!.removeAttribute("aria-hidden");
  setSoundButton(withSound);
  try {
    const activation = audio.setEnabled(withSound);
    await activation;
    saveSoundPreference(withSound);
  } catch (error) {
    setSoundButton(false);
    const notice = error instanceof Error ? error.message : "Sound could not start.";
    if (audioNotice) audioNotice.textContent = notice;
  }
  updateInterface(timeline.time);
  previousFrame = 0;
  animationFrame = requestAnimationFrame(render);
  beginIntroScroll();
}

async function toggleSound(): Promise<void> {
  if (!started) return;
  const enabled = !audio.isEnabled;
  try {
    const activation = audio.setEnabled(enabled);
    await activation;
    setSoundButton(enabled);
    saveSoundPreference(enabled);
  } catch (error) {
    setSoundButton(false);
    if (audioNotice) audioNotice.textContent = error instanceof Error ? error.message : "Sound could not start.";
  }
}

function showFallback(error: unknown): void {
  document.body.classList.add("webgl-fallback");
  canvas!.hidden = true;
  fallback!.setAttribute("role", "region");
  fallback!.setAttribute("aria-label", "Text version of the winter story");
  console.warn("WebGL is unavailable; the story will continue with captions and text.", error);
}

async function prepareStory(): Promise<void> {
  // Canvas book typography needs the same font as the DOM, with a bounded fallback.
  await Promise.all([prepareCharacterArt(), Promise.race([
    document.fonts.load('600 40px "Cormorant Garamond"').catch(() => undefined),
    new Promise<void>((resolve) => window.setTimeout(resolve, 2000)),
  ])]);
  try {
    chapters = buildChapters();
    renderer = new StoryRenderer(canvas!, chapters);
  } catch (error) {
    chapters.forEach((chapter) => chapter.dispose());
    chapters = [];
    showFallback(error);
  }
  enterButton!.disabled = false;
  quietButton!.disabled = false;
}
setScrollSpace();
void prepareStory();

enterButton.addEventListener("click", () => { void enterStory(true); });
quietButton.addEventListener("click", () => { void enterStory(false); });
soundButton.addEventListener("click", () => { void toggleSound(); });

window.addEventListener("resize", () => {
  setScrollSpace();
  renderer?.resize(window.innerWidth, window.innerHeight);
});
window.addEventListener("pointermove", (event) => {
  pointer.set((event.clientX / Math.max(1, window.innerWidth)) * 2 - 1, 1 - (event.clientY / Math.max(1, window.innerHeight)) * 2);
}, { passive: true });
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    void audio.setDocumentVisible(false);
  } else {
    previousFrame = 0;
    void audio.setDocumentVisible(true);
    if (started && !animationFrame) animationFrame = requestAnimationFrame(render);
  }
});
reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) stopAutoScroll();
});

if ("ResizeObserver" in window) {
  resizeObserver = new ResizeObserver(setScrollSpace);
  resizeObserver.observe(document.documentElement);
}

window.addEventListener("pagehide", (event) => {
  stopAutoScroll();
  if (animationFrame) cancelAnimationFrame(animationFrame);
  animationFrame = 0;
  if (event.persisted) {
    void audio.setDocumentVisible(false);
    return;
  }
  resizeObserver?.disconnect();
  renderer?.dispose();
  audio.dispose();
});
window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  previousFrame = 0;
  void audio.setDocumentVisible(true);
  if (started && !animationFrame) animationFrame = requestAnimationFrame(render);
});
