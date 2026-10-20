export type Direction = "canon" | "thread";
export type Scheme = "light" | "dark";
export type ScriptureSize = 16 | 18;

export type Appearance = {
  direction: Direction;
  scheme: Scheme;
};

export const APPEARANCE_KEY = "bible-study:appearance";
export const SCRIPTURE_SIZE_KEY = "bible-study:scripture";

export const DEFAULT_APPEARANCE: Appearance = {
  direction: "canon",
  scheme: "light",
};

export function readAppearance(): Appearance {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE;
  const raw = localStorage.getItem(APPEARANCE_KEY);
  if (!raw) return DEFAULT_APPEARANCE;
  try {
    const parsed = JSON.parse(raw) as Partial<Appearance>;
    return {
      direction: parsed.direction === "thread" ? "thread" : "canon",
      scheme: parsed.scheme === "dark" ? "dark" : "light",
    };
  } catch (error) {
    console.error("Failed to read appearance:", error);
    return DEFAULT_APPEARANCE;
  }
}

export function writeAppearance(appearance: Appearance) {
  localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance));
  document.documentElement.dataset.direction = appearance.direction;
  document.documentElement.dataset.scheme = appearance.scheme;
}

export function readScriptureSize(): ScriptureSize {
  if (typeof window === "undefined") return 18;
  return localStorage.getItem(SCRIPTURE_SIZE_KEY) === "16" ? 16 : 18;
}

export function writeScriptureSize(size: ScriptureSize) {
  localStorage.setItem(SCRIPTURE_SIZE_KEY, String(size));
  document.documentElement.style.setProperty("--scripture", `${size}px`);
}
