const KEY = "bible-study:opened-chapters";

export function readOpenedChapters() {
  if (typeof window === "undefined") return new Set<string>();
  const raw = localStorage.getItem(KEY);
  if (!raw) return new Set<string>();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) throw new Error("Opened chapters were not a list");
    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch (error) {
    console.error("Failed to read opened chapters:", error);
    return new Set<string>();
  }
}

export function markChapterOpened(book: string, chapter: number) {
  const opened = readOpenedChapters();
  const key = `${book}:${chapter}`;
  if (opened.has(key)) return opened;
  opened.add(key);
  localStorage.setItem(KEY, JSON.stringify([...opened]));
  return opened;
}
