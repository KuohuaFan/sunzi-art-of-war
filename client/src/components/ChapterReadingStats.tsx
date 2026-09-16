import { BookText, Clock3 } from "lucide-react";
import { chapterStatsFromSegments, formatReadingStats } from "@shared/chapter-reading-stats";
import type { SunziReadingLocale } from "@shared/reading-progress";

type ChapterReadingStatsProps = {
  segments: readonly { text: string }[];
  locale: SunziReadingLocale;
  variant?: "hero" | "inline";
  customRate?: number;
};

export function ChapterReadingStats({ segments, locale, variant = "hero", customRate }: ChapterReadingStatsProps) {
  const stats = chapterStatsFromSegments(segments, locale, customRate);
  const labels = formatReadingStats(stats, locale, Boolean(customRate));

  if (variant === "inline") {
    return (
      <span className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#7a7164]" title={labels.note}>
        <span className="inline-flex items-center gap-1"><BookText className="size-3" />{labels.count}</span>
        <span className="inline-flex items-center gap-1"><Clock3 className="size-3" />{labels.time}</span>
      </span>
    );
  }

  return (
    <div title={labels.note} aria-label={`${labels.count} · ${labels.time}`}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#d7ccb7]">
        <span className="inline-flex items-center gap-2"><BookText className="size-4 text-[#d4b566]" />{labels.count}</span>
        <span className="inline-flex items-center gap-2"><Clock3 className="size-4 text-[#d4b566]" />{labels.time}</span>
      </div>
      <p className="mt-2 text-[10px] leading-4 text-[#aeb0a5]">{labels.note}</p>
    </div>
  );
}
