import {
  emptyReadingPreferences,
  parseReadingPreferences,
  readingRateForLocale,
  READING_PREFERENCES_STORAGE_KEY,
  recordReadingSample,
  resetReadingSpeed,
  type ReadingPreferences,
} from "@shared/reading-preferences";
import type { SunziReadingLocale } from "@shared/reading-progress";
import { useCallback, useEffect, useState } from "react";

function loadPreferences() {
  if (typeof window === "undefined") return emptyReadingPreferences();
  return parseReadingPreferences(window.localStorage.getItem(READING_PREFERENCES_STORAGE_KEY));
}

export function useReadingPreferences() {
  const [preferences, setPreferences] = useState<ReadingPreferences>(emptyReadingPreferences);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPreferences(loadPreferences());
    setHydrated(true);
  }, []);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === READING_PREFERENCES_STORAGE_KEY) setPreferences(parseReadingPreferences(event.newValue));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const persist = useCallback((next: ReadingPreferences) => {
    setPreferences(next);
    window.localStorage.setItem(READING_PREFERENCES_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const addSample = useCallback((locale: SunziReadingLocale, unitCount: number, elapsedSeconds: number) => {
    setPreferences(current => {
      const next = recordReadingSample(current, locale, unitCount, elapsedSeconds);
      window.localStorage.setItem(READING_PREFERENCES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetLocale = useCallback((locale: SunziReadingLocale) => {
    setPreferences(current => {
      const next = resetReadingSpeed(current, locale);
      window.localStorage.setItem(READING_PREFERENCES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const rateForLocale = useCallback((locale: SunziReadingLocale) => readingRateForLocale(preferences, locale), [preferences]);

  return { preferences, hydrated, persist, addSample, resetLocale, rateForLocale };
}
