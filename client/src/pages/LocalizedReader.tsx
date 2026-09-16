import { ChapterReadingStats } from "@/components/ChapterReadingStats";
import { BrandMark } from "@/components/BrandMark";
import { ChapterPlannerControls, ReadingSpeedCalibrator } from "@/components/ReadingPlanner";
import { hasVisitedChapter, LOCALIZED_READING_PROGRESS_LABELS, ReadingProgressPanel } from "@/components/ReadingProgress";
import { Button } from "@/components/ui/button";
import { useReadingPreferences } from "@/hooks/useReadingPreferences";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { joinBasePath } from "@/lib/runtime";
import { planChapters, type ChapterSortMode, type ReadingTimeLimit } from "@shared/reading-preferences";
import { readingResumePath } from "@shared/reading-progress";
import { SUNZI_CHAPTERS, SUNZI_SOURCE } from "@shared/sunzi-data";
import { isSunziLocale, SUNZI_LOCALE_CONFIG, SUNZI_LOCALES, type SunziLocale } from "@shared/sunzi-locales";
import {
  chapterPath,
  findChapterByRouteSlug,
  localizedChapterPath,
  localizedHomePath,
  localizedSegmentPath,
} from "@shared/sunzi-seo";
import { SUNZI_TRANSLATION_META, SUNZI_TRANSLATIONS } from "@shared/sunzi-translations";
import { BookOpen, Check, ChevronLeft, ChevronRight, Languages, Printer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

function chapterNumber(locale: SunziLocale, value: number) {
  return new Intl.NumberFormat(SUNZI_LOCALE_CONFIG[locale].htmlLang, { minimumIntegerDigits: 2 }).format(value);
}

function localePath(locale: SunziLocale, chapterSlug?: string) {
  if (!chapterSlug) return localizedHomePath(locale);
  const chapter = findChapterByRouteSlug(chapterSlug);
  return chapter ? localizedChapterPath(locale, chapter) : localizedHomePath(locale);
}

function LanguageSwitcher({ locale, chapterSlug }: { locale: SunziLocale; chapterSlug?: string }) {
  const [, navigate] = useLocation();
  const config = SUNZI_LOCALE_CONFIG[locale];
  return (
    <label className="no-print flex items-center gap-2 text-xs text-[#67645b]">
      <Languages className="size-4" />
      <span className="sr-only">{config.ui.language}</span>
      <select
        aria-label={config.ui.language}
        value={locale}
        onChange={event => navigate(localePath(event.target.value as SunziLocale, chapterSlug))}
        className="h-9 border border-[#b9aa91] bg-[#f8f1e5] px-2 text-sm"
      >
        {SUNZI_LOCALES.map(code => <option key={code} value={code}>{SUNZI_LOCALE_CONFIG[code].nativeName}</option>)}
      </select>
    </label>
  );
}

export function LocalizedHome({ locale }: { locale: SunziLocale }) {
  const config = SUNZI_LOCALE_CONFIG[locale];
  const translations = SUNZI_TRANSLATIONS[locale];
  const [, navigate] = useLocation();
  const { progress, hydrated: progressHydrated, resetProgress, canUndoReset, undoReset } = useReadingProgress();
  const { hydrated: preferencesHydrated, rateForLocale } = useReadingPreferences();
  const [chapterSort, setChapterSort] = useState<ChapterSortMode>("canonical");
  const [readingTimeLimit, setReadingTimeLimit] = useState<ReadingTimeLimit>(0);
  const personalRate = preferencesHydrated ? rateForLocale(locale) : undefined;
  const plannedChapters = useMemo(() => planChapters(translations, locale, personalRate, chapterSort, readingTimeLimit), [translations, locale, personalRate, chapterSort, readingTimeLimit]);

  function go(path: string) {
    navigate(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-[#eee4d1] text-[#20241f]">
      <header className="border-b border-[#c9b99b] bg-[#f3ead9]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4">
          <a href={joinBasePath("/")} className="flex items-center gap-2 serif font-bold tracking-[0.1em]"><BrandMark size="sm" />孫子兵法</a>
          <div className="flex items-center gap-3">
            <a href={joinBasePath("/")} className="text-xs text-[#8f3224]">{config.ui.chineseOriginal}</a>
            <LanguageSwitcher locale={locale} />
          </div>
        </div>
      </header>
      <main>
        <section className="paper-texture border-b border-[#c9b99b] px-5 py-16 text-center sm:py-24">
          <BrandMark size="lg" className="mx-auto" />
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.26em] text-[#8f3224]">{config.ui.eyebrow}</p>
          <h1 className="serif mx-auto mt-5 max-w-4xl text-4xl font-black sm:text-6xl">{config.ui.original}</h1>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-[#5c5c54]">{config.homeDescription}</p>
          <div className="mx-auto mt-9 grid max-w-3xl gap-px border border-[#b9a98b] bg-[#b9a98b] sm:grid-cols-3">
            <div className="bg-[#f8f1e3] px-5 py-4"><strong className="serif text-2xl">13</strong><span className="ml-2 text-xs text-[#777063]">{config.ui.chapters}</span></div>
            <div className="bg-[#f8f1e3] px-5 py-4"><strong className="serif text-2xl">74</strong><span className="ml-2 text-xs text-[#777063]">{config.ui.segments}</span></div>
            <div className="bg-[#f8f1e3] px-5 py-4"><strong className="serif text-2xl">64</strong><span className="ml-2 text-xs text-[#777063]">{config.ui.keyPoints}</span></div>
          </div>
          {progressHydrated && (
            <div className="mx-auto mt-5 max-w-3xl">
              <ReadingProgressPanel
                progress={progress}
                currentTitle={progress.currentChapterNumber ? translations[progress.currentChapterNumber - 1]?.fullTitle : undefined}
                labels={LOCALIZED_READING_PROGRESS_LABELS[locale]}
                onContinue={progress.currentChapterNumber ? () => go(readingResumePath(progress, locale)) : undefined}
                onReset={resetProgress}
                canUndo={canUndoReset}
                onUndo={undoReset}
              />
            </div>
          )}
          <Button asChild className="mt-9 h-12 rounded-none bg-[#26352b] px-8 text-[#fff9ea] hover:bg-[#8f3224]">
            <a href={joinBasePath(localizedChapterPath(locale, SUNZI_CHAPTERS[0]))} onClick={event => { event.preventDefault(); go(localizedChapterPath(locale, SUNZI_CHAPTERS[0])); }}>{config.ui.startReading}<ChevronRight className="ml-2 size-4" /></a>
          </Button>
        </section>
        <section className="mx-auto max-w-6xl px-5 py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8f3224]">{config.ui.chapterList}</p>
          <div className="mt-5"><ChapterPlannerControls locale={locale} sortMode={chapterSort} timeLimit={readingTimeLimit} resultCount={plannedChapters.length} totalCount={SUNZI_CHAPTERS.length} onSortMode={setChapterSort} onTimeLimit={setReadingTimeLimit} /></div>
          <div className="mt-6 grid gap-px border border-[#bbaa8d] bg-[#bbaa8d] md:grid-cols-2">
            {plannedChapters.map(({ item: translation, originalIndex: index }) => {
              const chapter = SUNZI_CHAPTERS[index];
              return (
                <a key={chapter.number} href={joinBasePath(localizedChapterPath(locale, chapter))} onClick={event => { event.preventDefault(); go(localizedChapterPath(locale, chapter)); }} className="group grid min-h-40 grid-cols-[52px_1fr_auto] items-start gap-4 bg-[#f8f1e5] p-5 hover:bg-[#eee1ca] sm:p-7">
                  <span className="serif text-2xl text-[#a37a38]">{chapterNumber(locale, chapter.number)}</span>
                  <span><b className="serif block text-xl group-hover:text-[#8f3224]">{translation.fullTitle}</b><span className="mt-2 line-clamp-3 block text-sm leading-7 text-[#68645b]">{translation.summary}</span><ChapterReadingStats segments={translation.segments} locale={locale} variant="inline" customRate={personalRate} /></span>
                  {progressHydrated && hasVisitedChapter(progress, chapter.number) ? <Check className="mt-1 size-5 text-[#a37a38]" aria-label="Read" /> : <ChevronRight className="mt-1 size-5 text-[#8f3224]" />}
                </a>
              );
            })}
            {plannedChapters.length === 0 && <p className="bg-[#f8f1e5] px-5 py-10 text-center text-sm text-[#777064] md:col-span-2">{config.ui.chapterList}: 0 / 13</p>}
          </div>
        </section>
      </main>
      <footer className="border-t border-[#bbaa8b] bg-[#26352b] px-5 py-7 text-xs leading-6 text-[#d8d0bf]">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-3 sm:flex-row">
          <p>{config.siteName}<br /><span className="text-[#aaa697]">{config.ui.translationNotice}</span></p>
          <p className="sm:text-right">{config.ui.sourceVersion}: Wikisource oldid {SUNZI_SOURCE.oldid}<br /><span className="text-[#aaa697]">{SUNZI_SOURCE.license} · {SUNZI_TRANSLATION_META.model}</span></p>
        </div>
      </footer>
    </div>
  );
}

export function LocalizedChapter({ locale, chapterSlug }: { locale: SunziLocale; chapterSlug: string }) {
  const config = SUNZI_LOCALE_CONFIG[locale];
  const chapter = findChapterByRouteSlug(chapterSlug);
  const [, navigate] = useLocation();
  const { progress, hydrated: progressHydrated, visitChapter, resetProgress, canUndoReset, undoReset } = useReadingProgress();
  const { preferences, hydrated: preferencesHydrated, addSample, resetLocale, rateForLocale } = useReadingPreferences();
  useEffect(() => {
    if (!window.location.hash.startsWith("#segment-")) return;
    const id = window.location.hash.slice(1);
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }, [chapterSlug]);

  useEffect(() => {
    if (chapter) visitChapter(chapter.number, locale);
  }, [chapter, locale, visitChapter]);

  if (!chapter) return null;
  const index = chapter.number - 1;
  const translation = SUNZI_TRANSLATIONS[locale][index];
  const personalRate = preferencesHydrated ? rateForLocale(locale) : undefined;

  function go(path: string) {
    navigate(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-[#eee4d1] text-[#20241f]">
      <header className="no-print sticky top-0 z-40 border-b border-[#c9b99b] bg-[#efe6d6]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <a href={joinBasePath(localizedHomePath(locale))} onClick={event => { event.preventDefault(); go(localizedHomePath(locale)); }} className="flex items-center gap-2 serif font-bold tracking-[0.1em]"><BrandMark size="sm" />{config.ui.original}</a>
          <div className="ml-auto flex items-center gap-3">
            <a href={joinBasePath(chapterPath(chapter))} className="hidden text-xs text-[#8f3224] sm:block">{config.ui.chineseOriginal}</a>
            <LanguageSwitcher locale={locale} chapterSlug={chapterSlug} />
            <button aria-label={config.ui.print} onClick={() => window.print()} className="grid size-9 place-items-center hover:bg-[#ded2bd]"><Printer className="size-4" /></button>
          </div>
        </div>
        <nav aria-label={config.ui.chapterList} className="no-scrollbar flex overflow-x-auto border-t border-[#c9b99b]">
          {SUNZI_CHAPTERS.map((item, itemIndex) => (
            <a key={item.number} href={joinBasePath(localizedChapterPath(locale, item))} onClick={event => { event.preventDefault(); go(localizedChapterPath(locale, item)); }} aria-current={item.number === chapter.number ? "page" : undefined} className={`min-w-[96px] flex-1 px-3 py-2 text-center text-xs ${item.number === chapter.number ? "bg-[#26352b] text-[#fff7e8]" : "hover:bg-[#d9ccb5]"}`}>
              <span className="flex items-center justify-center gap-1 text-[10px] text-[#a37a38]">{chapterNumber(locale, item.number)}{progressHydrated && hasVisitedChapter(progress, item.number) && <Check className="size-2.5" aria-label="Read" />}</span><b className="mt-0.5 block whitespace-nowrap">{SUNZI_TRANSLATIONS[locale][itemIndex].chapterTitle}</b>
            </a>
          ))}
        </nav>
      </header>
      <main>
        <section className="border-b border-[#c9b99b] bg-[#26352b] text-[#f9f0df]">
          <div className="mx-auto max-w-6xl px-5 py-11 sm:px-8">
            <p className="text-xs uppercase tracking-[0.2em] text-[#d4b566]">{translation.group} · {chapterNumber(locale, chapter.number)}</p>
            <h1 className="serif mt-3 text-4xl font-black sm:text-5xl">{translation.fullTitle}</h1>
            <div className="mt-5 flex flex-wrap gap-2">{translation.tags.map(tag => <span key={tag} className="border border-[#ceb978]/45 px-2.5 py-1 text-[11px] text-[#e6d7a7]">{tag}</span>)}</div>
            <div className="mt-5"><ChapterReadingStats segments={translation.segments} locale={locale} customRate={personalRate} /></div>
          </div>
        </section>
        <div className="mx-auto grid max-w-6xl gap-7 px-4 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <article className="reader-card min-w-0 border border-[#cdbf9f] bg-[#fbf6eb] shadow-[0_18px_55px_rgba(76,56,30,.11)]">
            <div className="paper-texture px-5 py-7 sm:px-9 sm:py-10">
              <p className="text-xs uppercase tracking-[0.2em] text-[#526650]">{config.ui.translatedText}</p>
              <div className="mt-6 space-y-2">
                {translation.segments.map((segment, segmentIndex) => (
                  <section key={segment.id} id={`segment-${segment.id}`} className="segment group -mx-2 grid scroll-mt-36 grid-cols-[50px_1fr] gap-3 px-2 py-5 sm:grid-cols-[62px_1fr]">
                    <a href={joinBasePath(localizedSegmentPath(locale, chapter, segment.id))} className="font-mono text-[10px] tracking-wider text-[#9c907d]" aria-label={`${config.ui.segmentLink} ${segment.id}`}>{segment.id}</a>
                    <div><p className="text-[1.05rem] leading-8 text-[#33362f] sm:text-lg">{segment.text}</p><details className="mt-3 text-sm text-[#716b61]"><summary className="cursor-pointer text-xs font-semibold text-[#8f3224]">{config.ui.sourceText}</summary><p className="serif mt-3 border-l-2 border-[#a37a38] pl-4 leading-8">{chapter.segments[segmentIndex].text}</p></details></div>
                  </section>
                ))}
              </div>
            </div>
          </article>
          <aside className="no-print space-y-5 lg:sticky lg:top-28 lg:self-start">
            {progressHydrated && <ReadingProgressPanel compact progress={progress} currentTitle={translation.chapterTitle} labels={LOCALIZED_READING_PROGRESS_LABELS[locale]} onReset={resetProgress} canUndo={canUndoReset} onUndo={undoReset} />}
            {preferencesHydrated && <ReadingSpeedCalibrator locale={locale} segments={translation.segments} customRate={personalRate} sampleCount={preferences.speeds[locale]?.sampleCount} onSample={(unitCount, elapsedSeconds) => addSample(locale, unitCount, elapsedSeconds)} onReset={() => resetLocale(locale)} />}
            <section className="border border-[#cdbf9f] bg-[#e8decb] p-5"><p className="text-[10px] uppercase tracking-[0.2em] text-[#8f3224]">{config.ui.editorialSummary}</p><p className="mt-3 text-sm leading-7 text-[#41443d]">{translation.summary}</p></section>
            <section className="border border-[#cdbf9f] bg-[#f8f1e5] p-5"><p className="text-[10px] uppercase tracking-[0.2em] text-[#8f3224]">{config.ui.keyPoints}</p><ol className="mt-4 space-y-4">{translation.points.map(point => <li key={`${point.segmentId}-${point.title}`}><a href={joinBasePath(localizedSegmentPath(locale, chapter, point.segmentId))} className="font-semibold text-[#26352b] hover:text-[#8f3224]">{point.title}</a><p className="mt-1 text-xs leading-6 text-[#69655d]">{point.body}</p></li>)}</ol></section>
            <section className="border-l-2 border-[#8f3224] pl-4 text-xs leading-6 text-[#6d685f]"><p>{config.ui.translationNotice}</p><a href={joinBasePath(chapterPath(chapter))} className="mt-2 inline-flex items-center gap-1 font-semibold text-[#8f3224]"><BookOpen className="size-3.5" />{config.ui.chineseOriginal}</a></section>
          </aside>
        </div>
        <nav aria-label={config.ui.chapterList} className="no-print mx-auto mb-14 grid max-w-6xl grid-cols-2 gap-px border border-[#bbaa8d] bg-[#bbaa8d]">
          {index > 0 ? <a rel="prev" href={joinBasePath(localizedChapterPath(locale, SUNZI_CHAPTERS[index - 1]))} onClick={event => { event.preventDefault(); go(localizedChapterPath(locale, SUNZI_CHAPTERS[index - 1])); }} className="flex min-h-20 items-center gap-3 bg-[#efe5d3] px-4 hover:bg-[#e4d7c0]"><ChevronLeft className="size-5" /><span><small className="block text-[10px] text-[#8f3224]">{config.ui.previous}</small><b className="serif mt-1 block">{SUNZI_TRANSLATIONS[locale][index - 1].fullTitle}</b></span></a> : <a href={joinBasePath(localizedHomePath(locale))} onClick={event => { event.preventDefault(); go(localizedHomePath(locale)); }} className="flex min-h-20 items-center gap-3 bg-[#efe5d3] px-4 hover:bg-[#e4d7c0]"><ChevronLeft className="size-5" /><b>{config.ui.backHome}</b></a>}
          {index < 12 ? <a rel="next" href={joinBasePath(localizedChapterPath(locale, SUNZI_CHAPTERS[index + 1]))} onClick={event => { event.preventDefault(); go(localizedChapterPath(locale, SUNZI_CHAPTERS[index + 1])); }} className="flex min-h-20 items-center justify-end gap-3 bg-[#efe5d3] px-4 text-right hover:bg-[#e4d7c0]"><span><small className="block text-[10px] text-[#8f3224]">{config.ui.next}</small><b className="serif mt-1 block">{SUNZI_TRANSLATIONS[locale][index + 1].fullTitle}</b></span><ChevronRight className="size-5" /></a> : <a href={joinBasePath(localizedHomePath(locale))} onClick={event => { event.preventDefault(); go(localizedHomePath(locale)); }} className="flex min-h-20 items-center justify-end gap-3 bg-[#efe5d3] px-4 text-right hover:bg-[#e4d7c0]"><b>{config.ui.backHome}</b><ChevronRight className="size-5" /></a>}
        </nav>
      </main>
      <footer className="border-t border-[#bbaa8b] bg-[#26352b] px-5 py-7 text-xs leading-6 text-[#d8d0bf]"><div className="mx-auto max-w-6xl">{config.siteName} · Wikisource oldid {SUNZI_SOURCE.oldid} · {SUNZI_SOURCE.license} · {SUNZI_TRANSLATION_META.model}</div></footer>
    </div>
  );
}

export function resolveLocalizedRoute(localeParam?: string, chapterSlug?: string) {
  if (!isSunziLocale(localeParam?.toLowerCase())) return null;
  const locale = localeParam.toLowerCase() as SunziLocale;
  return chapterSlug ? <LocalizedChapter locale={locale} chapterSlug={chapterSlug} /> : <LocalizedHome locale={locale} />;
}
