import {
  emptyReadingProgress,
  parseReadingProgress,
  READING_PROGRESS_STORAGE_KEY,
  resetReadingProgress,
  restoreReadingProgress,
  visitReadingChapter,
  type SunziReadingLocale,
  type SunziReadingProgress,
} from "@shared/reading-progress";
import { useCallback, useEffect, useState } from "react";

function loadProgress() {
  if (typeof window === "undefined") return emptyReadingProgress();
  return parseReadingProgress(window.localStorage.getItem(READING_PROGRESS_STORAGE_KEY));
}

export function useReadingProgress() {
  const [progress, setProgress] = useState<SunziReadingProgress>(emptyReadingProgress);
  const [lastReset, setLastReset] = useState<SunziReadingProgress | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProgress(loadProgress());
    setHydrated(true);
  }, []);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === READING_PROGRESS_STORAGE_KEY) setProgress(parseReadingProgress(event.newValue));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const persist = useCallback((next: SunziReadingProgress) => {
    setProgress(next);
    window.localStorage.setItem(READING_PROGRESS_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const visitChapter = useCallback((chapterNumber: number, locale: SunziReadingLocale) => {
    setLastReset(null);
    setProgress(current => {
      const next = visitReadingChapter(current, chapterNumber, locale);
      window.localStorage.setItem(READING_PROGRESS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetProgress = useCallback(() => {
    const { previous, cleared: next } = resetReadingProgress(progress);
    setLastReset(previous);
    window.localStorage.removeItem(READING_PROGRESS_STORAGE_KEY);
    setProgress(next);
  }, [progress]);

  const undoReset = useCallback(() => {
    if (!lastReset) return;
    const restored = restoreReadingProgress(lastReset);
    window.localStorage.setItem(READING_PROGRESS_STORAGE_KEY, JSON.stringify(restored));
    setProgress(restored);
    setLastReset(null);
  }, [lastReset]);

  return { progress, hydrated, persist, visitChapter, resetProgress, canUndoReset: Boolean(lastReset), undoReset };
}
