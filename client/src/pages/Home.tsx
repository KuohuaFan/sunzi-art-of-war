import type { Message } from "@/components/AIChatBox";
import { BrandMark } from "@/components/BrandMark";
import { ChapterReadingStats } from "@/components/ChapterReadingStats";
import { ChapterPlannerControls, ReadingSpeedCalibrator } from "@/components/ReadingPlanner";
import { hasVisitedChapter, ReadingProgressPanel, ZH_READING_PROGRESS_LABELS } from "@/components/ReadingProgress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { useReadingPreferences } from "@/hooks/useReadingPreferences";
import { trpc } from "@/lib/trpc";
import { fullAppPath, IS_STATIC_EXPORT, joinBasePath } from "@/lib/runtime";
import { planChapters, type ChapterSortMode, type ReadingTimeLimit } from "@shared/reading-preferences";
import { currentReadingChapter, readingResumePath } from "@shared/reading-progress";
import { SUNZI_CHAPTERS, SUNZI_SOURCE } from "@shared/sunzi-data";
import { chapterPath, chapterSegmentPath, findChapterByRouteSlug, localizedChapterPath } from "@shared/sunzi-seo";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ExternalLink,
  Hash,
  Info,
  Languages,
  Link2,
  Loader2,
  Menu,
  MessageCircle,
  NotebookPen,
  Printer,
  Search,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Fragment, lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type ReaderTab = "text" | "summary" | "points";
type SearchMode = "literal" | "semantic";
type TranslationLanguage = "en" | "ja" | "ko" | "es" | "fr" | "de";

type ChapterTranslation = {
  chapterTitle: string;
  summary: string;
  segments: Array<{ id: string; text: string }>;
  language: TranslationLanguage;
  languageLabel: string;
  model: string;
  sourceOldid: string;
};

const TRANSLATION_LANGUAGES: Array<{ code: TranslationLanguage; label: string }> = [
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
];

const AIChatBox = lazy(() => import("@/components/AIChatBox").then(module => ({ default: module.AIChatBox })));

type SearchResult = {
  key: string;
  chapterIndex: number;
  segmentId?: string;
  eyebrow: string;
  text: string;
};

const TAB_LABELS: Record<ReaderTab, string> = {
  text: "原文",
  summary: "篇旨今譯",
  points: "要義提點",
};

function chineseNumber(value: number) {
  const digits = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  if (value < 10) return digits[value];
  if (value === 10) return "十";
  return `十${digits[value - 10]}`;
}

function readInitialLocation(chapterSlug?: string) {
  const routeChapter = findChapterByRouteSlug(chapterSlug?.toLowerCase());
  if (routeChapter) {
    return {
      chapterIndex: routeChapter.number - 1,
      tab: "text" as ReaderTab,
      segment: null,
    };
  }
  return { chapterIndex: 0, tab: "text" as ReaderTab, segment: null };
}

function highlight(text: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return text;
  const parts = text.split(trimmed);
  if (parts.length === 1) return text;
  return parts.map((part, index) => (
    <Fragment key={`${part}-${index}`}>
      {index > 0 && <mark className="rounded-sm bg-[#d9b24c]/35 px-0.5 text-inherit">{trimmed}</mark>}
      {part}
    </Fragment>
  ));
}

function readStoredMessages(): Message[] {
  try {
    const saved = window.localStorage.getItem("sunzi:chat:v1");
    if (!saved) return [];
    const parsed = JSON.parse(saved) as Message[];
    return Array.isArray(parsed) ? parsed.filter((item) => item.role !== "system").slice(-20) : [];
  } catch {
    return [];
  }
}

export default function Home({ chapterSlug }: { chapterSlug?: string }) {
  const initial = useMemo(() => readInitialLocation(chapterSlug), [chapterSlug]);
  const [, navigate] = useLocation();
  const { progress, hydrated: progressHydrated, visitChapter, resetProgress, canUndoReset, undoReset } = useReadingProgress();
  const { preferences, hydrated: preferencesHydrated, addSample, resetLocale, rateForLocale } = useReadingPreferences();
  const [started, setStarted] = useState(Boolean(chapterSlug));
  const [chapterIndex, setChapterIndex] = useState(initial.chapterIndex);
  const [tab, setTab] = useState<ReaderTab>(initial.tab);
  const [targetSegment, setTargetSegment] = useState<string | null>(initial.segment);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [translationOpen, setTranslationOpen] = useState(false);
  const [translationLanguage, setTranslationLanguage] = useState<TranslationLanguage>("en");
  const [translation, setTranslation] = useState<ChapterTranslation | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>("literal");
  const [query, setQuery] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [chapterSort, setChapterSort] = useState<ChapterSortMode>("canonical");
  const [readingTimeLimit, setReadingTimeLimit] = useState<ReadingTimeLimit>(0);
  const [messages, setMessages] = useState<Message[]>(readStoredMessages);
  const speechRun = useRef(0);
  const searchInput = useRef<HTMLInputElement>(null);
  const chapter = SUNZI_CHAPTERS[chapterIndex];
  const personalRate = preferencesHydrated ? rateForLocale("zh-Hant") : undefined;
  const plannedChapters = useMemo(() => planChapters(SUNZI_CHAPTERS, "zh-Hant", personalRate, chapterSort, readingTimeLimit), [personalRate, chapterSort, readingTimeLimit]);

  useEffect(() => {
    if (!chapterSlug) {
      const legacy = new URLSearchParams(window.location.hash.slice(1));
      const chapterNumber = Number(legacy.get("chapter"));
      if (Number.isInteger(chapterNumber) && chapterNumber >= 1 && chapterNumber <= 13) {
        const legacyChapter = SUNZI_CHAPTERS[chapterNumber - 1];
        const segment = legacy.get("segment");
        navigate(segment ? chapterSegmentPath(legacyChapter, segment) : chapterPath(legacyChapter), { replace: true });
        return;
      }
      return;
    }
    const routedChapter = findChapterByRouteSlug(chapterSlug.toLowerCase());
    if (!routedChapter) return;
    setStarted(true);
    setChapterIndex(routedChapter.number - 1);
    setTab("text");
    const hash = window.location.hash;
    setTargetSegment(hash.startsWith("#segment-") ? hash.slice("#segment-".length) : null);
  }, [chapterSlug, navigate]);

  useEffect(() => {
    const routedChapter = findChapterByRouteSlug(chapterSlug?.toLowerCase());
    if (routedChapter) visitChapter(routedChapter.number, "zh-Hant");
  }, [chapterSlug, visitChapter]);

  const metadata = trpc.sunzi.metadata.useQuery(undefined, { staleTime: Infinity, enabled: !IS_STATIC_EXPORT });
  const ask = trpc.sunzi.ask.useMutation({
    onSuccess: ({ answer }) => {
      setMessages((current) => [...current, { role: "assistant" as const, content: answer }].slice(-20));
    },
    onError: (error) => {
      setMessages((current) => [
        ...current,
        { role: "assistant" as const, content: `問答暫時無法完成：${error.message}` },
      ].slice(-20));
    },
  });
  const translate = trpc.sunzi.translateChapter.useMutation({
    onSuccess: result => setTranslation(result),
    onError: error => toast.error(error.message),
  });
  const semanticSearch = trpc.sunzi.semanticSearch.useMutation({
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    window.localStorage.setItem("sunzi:chat:v1", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    setTranslation(null);
    translate.reset();
  }, [chapterIndex]);

  useEffect(() => {
    if (!targetSegment || tab !== "text") return;
    window.setTimeout(() => {
      document.getElementById(`segment-${targetSegment}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }, [targetSegment, tab, chapterIndex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if (event.key === "/" && !typing) {
        event.preventDefault();
        setSearchOpen(true);
        window.setTimeout(() => searchInput.current?.focus(), 40);
      }
      if (event.key === "Escape") {
        setMenuOpen(false);
        setSearchOpen(false);
        setSourceOpen(false);
        setChatOpen(false);
        setTranslationOpen(false);
      }
      if (!typing && !searchOpen && !chatOpen && event.key.toLowerCase() === "j") goChapter(chapterIndex + 1);
      if (!typing && !searchOpen && !chatOpen && event.key.toLowerCase() === "k") goChapter(chapterIndex - 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const searchResults = useMemo<SearchResult[]>(() => {
    const value = query.trim().toLowerCase();
    if (!value) return [];
    const results: SearchResult[] = [];
    SUNZI_CHAPTERS.forEach((item, index) => {
      if (`${item.fullTitle}${item.summary}${item.tags.join("")}`.toLowerCase().includes(value)) {
        results.push({
          key: `chapter-${item.number}`,
          chapterIndex: index,
          eyebrow: `第${chineseNumber(item.number)}篇 · 篇旨與標籤`,
          text: `${item.fullTitle}　${item.summary}`,
        });
      }
      item.segments.forEach((segment) => {
        if (segment.text.toLowerCase().includes(value)) {
          results.push({
            key: segment.id,
            chapterIndex: index,
            segmentId: segment.id,
            eyebrow: `〈${item.title}〉${segment.id}`,
            text: segment.text,
          });
        }
      });
      item.points.forEach((point, pointIndex) => {
        if (`${point.title}${point.body}`.toLowerCase().includes(value)) {
          results.push({
            key: `point-${item.number}-${pointIndex}`,
            chapterIndex: index,
            segmentId: point.segmentId,
            eyebrow: `〈${item.title}〉要義 · ${point.segmentId}`,
            text: `${point.title}：${point.body}`,
          });
        }
      });
    });
    return results.slice(0, 80);
  }, [query]);

  function stopSpeaking() {
    speechRun.current += 1;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }

  function goChapter(next: number, segment?: string) {
    if (next < 0 || next >= SUNZI_CHAPTERS.length) return;
    stopSpeaking();
    setChapterIndex(next);
    setTargetSegment(segment ?? null);
    setMenuOpen(false);
    setSearchOpen(false);
    const nextChapter = SUNZI_CHAPTERS[next];
    navigate(segment ? chapterSegmentPath(nextChapter, segment) : chapterPath(nextChapter));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function changeTab(next: ReaderTab) {
    setTab(next);
    if (next === "text" && targetSegment) {
      window.history.replaceState(null, "", joinBasePath(chapterSegmentPath(chapter, targetSegment)));
    }
  }

  function speakCurrent() {
    if (speaking) {
      stopSpeaking();
      return;
    }
    if (!("speechSynthesis" in window)) {
      toast.error("此瀏覽器不支援語音朗讀");
      return;
    }
    const text = tab === "text"
      ? chapter.segments.map((segment) => segment.text).join("。")
      : tab === "summary"
        ? chapter.summary
        : chapter.points.map((point) => `${point.title}。${point.body}`).join("。 ");
    const chunks = text.match(/[^。！？；]+[。！？；]?/g)?.filter(Boolean) ?? [text];
    const run = speechRun.current + 1;
    speechRun.current = run;
    setSpeaking(true);
    let index = 0;
    const next = () => {
      if (speechRun.current !== run || index >= chunks.length) {
        if (speechRun.current === run) setSpeaking(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(chunks[index++]);
      utterance.lang = "zh-TW";
      utterance.rate = 0.88;
      utterance.onend = next;
      utterance.onerror = next;
      window.speechSynthesis.speak(utterance);
    };
    next();
  }

  function openSegment(nextChapter: number, segmentId: string) {
    setTab("text");
    goChapter(nextChapter, segmentId);
  }

  async function copySegment(segmentId: string, text: string) {
    const value = `${text}\n\n——《孫子兵法》〈${chapter.title}〉${segmentId}`;
    await navigator.clipboard.writeText(value);
    setCopied(segmentId);
    toast.success(`已複製〈${chapter.title}〉${segmentId}`);
    window.setTimeout(() => setCopied(null), 1400);
  }

  function startReading() {
    setStarted(true);
    navigate(chapterPath(SUNZI_CHAPTERS[0]));
  }

  function startTranslation() {
    setStarted(true);
    setTranslationOpen(true);
    navigate(chapterPath(SUNZI_CHAPTERS[0]));
  }

  function requestTranslation() {
    setTranslation(null);
    translate.mutate({ chapterNumber: chapter.number, language: translationLanguage });
  }

  function sendMessage(content: string) {
    const history = messages.slice(-6).map(({ role, content: text }) => ({ role: role as "user" | "assistant", content: text }));
    setMessages((current) => [...current, { role: "user" as const, content }].slice(-20));
    ask.mutate({ question: content, currentChapter: chapter.number, history });
  }

  const totalCharacters = metadata.data?.characters ?? SUNZI_CHAPTERS.reduce((sum, item) => sum + item.charCount, 0);
  const totalSegments = metadata.data?.segments ?? SUNZI_CHAPTERS.reduce((sum, item) => sum + item.segments.length, 0);
  const totalPoints = SUNZI_CHAPTERS.reduce((sum, item) => sum + item.points.length, 0);

  return (
    <div className="min-h-screen text-[#20241f]">
      {!started ? (
        <section className="paper-texture grid min-h-screen place-items-center overflow-auto bg-[#eee4d1] px-6 py-10">
          <div className="w-full max-w-4xl text-center fade-enter">
            <BrandMark size="lg" className="mx-auto mb-9" />
            <p className="mb-5 text-xs font-semibold tracking-[0.42em] text-[#8f3224]">武經七書 · 十三篇</p>
            <h1 className="serif text-5xl font-black tracking-[0.18em] sm:text-7xl">孫子兵法</h1>
            <p className="serif mx-auto mt-7 max-w-2xl text-lg leading-9 text-[#57584f]">
              兵者，國之大事，死生之地，存亡之道，不可不察也。
            </p>
            <div className="mx-auto mt-9 grid max-w-3xl gap-px bg-[#b9a98b] border border-[#b9a98b] sm:grid-cols-3">
              <div className="bg-[#f8f1e3] px-5 py-4"><strong className="serif text-2xl">十三</strong><span className="ml-2 text-xs tracking-widest text-[#777063]">篇</span></div>
              <div className="bg-[#f8f1e3] px-5 py-4"><strong className="serif text-2xl">{totalSegments}</strong><span className="ml-2 text-xs tracking-widest text-[#777063]">原文段落</span></div>
              <div className="bg-[#f8f1e3] px-5 py-4"><strong className="serif text-2xl">{totalPoints}</strong><span className="ml-2 text-xs tracking-widest text-[#777063]">要義提點</span></div>
            </div>
            {progressHydrated && (
              <div className="mx-auto mt-5 max-w-3xl">
                <ReadingProgressPanel
                  progress={progress}
                  currentTitle={currentReadingChapter(progress)?.fullTitle}
                  labels={ZH_READING_PROGRESS_LABELS}
                  onContinue={progress.currentChapterNumber ? () => { setStarted(true); navigate(readingResumePath(progress)); } : undefined}
                  onReset={resetProgress}
                  canUndo={canUndoReset}
                  onUndo={undoReset}
                />
              </div>
            )}
            <div className="mt-11 flex flex-wrap justify-center gap-3">
              <Button asChild className="h-13 rounded-none bg-[#26352b] px-10 text-sm tracking-[0.22em] text-[#fff9ea] hover:bg-[#8f3224]">
                <a href={joinBasePath(chapterPath(SUNZI_CHAPTERS[0]))} onClick={(event) => { event.preventDefault(); startReading(); }}>開始閱讀 <ChevronRight className="ml-2 size-4" /></a>
              </Button>
              <Button onClick={() => { window.location.href = IS_STATIC_EXPORT ? fullAppPath("/events") : "/events"; }} variant="outline" className="h-13 rounded-none border-[#8f3224] px-7 text-sm tracking-[0.14em] text-[#8f3224] hover:bg-[#e4d6bf]">
                <NotebookPen className="size-4" /> Match Mapping 事件簿
              </Button>
              <Button onClick={startTranslation} variant="outline" className="h-13 rounded-none border-[#526650] px-7 text-sm tracking-[0.14em] text-[#405542] hover:bg-[#dfe5d9]">
                <Languages className="size-4" /> 多語翻譯
              </Button>
            </div>
            <div className="mx-auto mt-10 max-w-3xl text-left">
              <ChapterPlannerControls locale="zh-Hant" sortMode={chapterSort} timeLimit={readingTimeLimit} resultCount={plannedChapters.length} totalCount={SUNZI_CHAPTERS.length} onSortMode={setChapterSort} onTimeLimit={setReadingTimeLimit} />
              {plannedChapters.length > 0 ? (
                <div className="mt-3 grid gap-px border border-[#bbaa8d] bg-[#bbaa8d] sm:grid-cols-2">
                  {plannedChapters.map(({ item }) => (
                    <a key={item.number} href={joinBasePath(chapterPath(item))} onClick={event => { event.preventDefault(); setStarted(true); navigate(chapterPath(item)); }} className="grid grid-cols-[38px_1fr_auto] items-center gap-3 bg-[#f8f1e5] px-4 py-3 hover:bg-[#eee1ca]">
                      <span className="serif text-lg text-[#a37a38]">{String(item.number).padStart(2, "0")}</span>
                      <span><b className="serif block text-sm">{item.fullTitle}</b><ChapterReadingStats segments={item.segments} locale="zh-Hant" variant="inline" customRate={personalRate} /></span>
                      <ChevronRight className="size-4 text-[#8f3224]" />
                    </a>
                  ))}
                </div>
              ) : <p className="border border-t-0 border-[#cdbf9f] bg-[#f8f1e5] px-4 py-8 text-center text-sm text-[#777064]">沒有符合此閱讀時間的篇章，請放寬條件。</p>}
            </div>
            <p className="mt-7 text-[11px] leading-5 text-[#7c776c]">原文底本：維基文庫固定修訂版 7906064 · CC BY-SA 4.0<br />篇旨今譯與要義提點為本站自撰</p>
          </div>
        </section>
      ) : (<>

      <header className="no-print fixed inset-x-0 top-0 z-40 h-16 border-b border-[#c9b99b] bg-[#efe6d6]/95 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-[1500px] items-center px-3 sm:px-6">
          <button aria-label="開啟目錄" onClick={() => setMenuOpen(true)} className="grid size-10 place-items-center hover:bg-[#ded2bd]"><Menu className="size-5" /></button>
          <div className="ml-3 min-w-0">
            <a href={joinBasePath("/")} onClick={(event) => { event.preventDefault(); setStarted(false); navigate("/"); }} className="flex items-center gap-2 serif truncate text-lg font-bold tracking-[0.12em] sm:text-xl"><BrandMark size="sm" />孫子兵法</a>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button aria-label="全文搜尋" onClick={() => { setSearchOpen(true); window.setTimeout(() => searchInput.current?.focus(), 40); }} className="flex h-10 items-center gap-2 px-3 text-sm text-[#55584e] hover:bg-[#ded2bd]">
              <Search className="size-4" /><span className="hidden sm:inline">搜尋</span><kbd className="hidden border border-[#b9aa91] px-1.5 py-0.5 text-[10px] lg:inline">/</kbd>
            </button>
            <button aria-label="開啟兵法問答" onClick={() => IS_STATIC_EXPORT ? window.location.assign(fullAppPath(chapterPath(chapter))) : setChatOpen(true)} className="flex h-10 items-center gap-2 px-3 text-sm text-[#55584e] hover:bg-[#ded2bd]">
              <MessageCircle className="size-4" /><span className="hidden lg:inline">問兵法</span>
            </button>
            <button aria-label="開啟多語翻譯" onClick={() => setTranslationOpen(true)} className="flex h-10 items-center gap-2 px-3 text-sm text-[#55584e] hover:bg-[#ded2bd]">
              <Languages className="size-4" /><span className="hidden xl:inline">翻譯</span>
            </button>
            <button aria-label="開啟 Match Mapping 事件簿" onClick={() => { window.location.href = IS_STATIC_EXPORT ? fullAppPath("/events") : "/events"; }} className="flex h-10 items-center gap-2 px-3 text-sm text-[#55584e] hover:bg-[#ded2bd]">
              <NotebookPen className="size-4" /><span className="hidden xl:inline">事件簿</span>
            </button>
            <button aria-label="列印目前篇章" onClick={() => window.print()} className="grid size-10 place-items-center hover:bg-[#ded2bd]"><Printer className="size-4" /></button>
            <button aria-label="來源與授權" onClick={() => setSourceOpen(true)} className="grid size-10 place-items-center hover:bg-[#ded2bd]"><Info className="size-4" /></button>
          </div>
        </div>
      </header>

      <nav aria-label="十三篇導覽" className="no-print fixed inset-x-0 top-16 z-30 border-b border-[#c9b99b] bg-[#e5dac5]/95 backdrop-blur-md">
        <div className="no-scrollbar mx-auto flex max-w-[1500px] overflow-x-auto">
          {SUNZI_CHAPTERS.map((item, index) => (
            <a key={item.number} href={joinBasePath(chapterPath(item))} onClick={(event) => { event.preventDefault(); goChapter(index); }} aria-current={index === chapterIndex ? "page" : undefined} className={`group min-w-[94px] flex-1 border-r border-[#c9b99b] px-3 py-2.5 text-center last:border-r-0 ${index === chapterIndex ? "bg-[#26352b] text-[#fff7e8]" : "hover:bg-[#d9ccb5]"}`}>
              <span className={`inline-flex items-center gap-1 text-[10px] tracking-[0.2em] ${index === chapterIndex ? "text-[#d9b96b]" : "text-[#8f3224]"}`}>第{chineseNumber(item.number)}篇{progressHydrated && hasVisitedChapter(progress, item.number) && <Check className="size-2.5" aria-label="已讀" />}</span>
              <b className="serif mt-0.5 block whitespace-nowrap text-sm tracking-[0.13em]">{item.title}</b>
            </a>
          ))}
        </div>
      </nav>

      <main className="pt-[122px]">
        <section className="border-b border-[#c9b99b] bg-[#26352b] text-[#f9f0df]">
          <div className="mx-auto grid max-w-6xl items-end gap-8 px-5 py-11 md:grid-cols-[1fr_auto] md:px-8">
            <div>
              <p className="mb-3 text-xs tracking-[0.3em] text-[#d4b566]">{chapter.group} · 第{chineseNumber(chapter.number)}篇</p>
              {chapterSlug ? <h1 className="serif text-4xl font-black tracking-[0.16em] sm:text-5xl">{chapter.fullTitle}</h1> : <h2 className="serif text-4xl font-black tracking-[0.16em] sm:text-5xl">{chapter.fullTitle}</h2>}
              <div className="mt-5 flex flex-wrap gap-2">
                {chapter.tags.map((tag) => <span key={tag} className="border border-[#ceb978]/45 px-2.5 py-1 text-[11px] text-[#e6d7a7]">{tag}</span>)}
              </div>
            </div>
            <div className="border-l border-[#cdb56d]/55 pl-5 md:min-w-56">
              <ChapterReadingStats segments={chapter.segments} locale="zh-Hant" customRate={personalRate} />
              <div className="mt-2 text-[10px] tracking-[0.16em] text-[#aeb0a5]">正文統計 · {chapter.segments.length} 段</div>
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_270px]">
          <article className="reader-card min-w-0 border border-[#cdbf9f] bg-[#fbf6eb] shadow-[0_18px_55px_rgba(76,56,30,.11)]">
            <div className="no-print sticky top-[122px] z-20 flex border-b border-[#d6c7aa] bg-[#f7f0e3]/96 backdrop-blur-md">
              {(Object.keys(TAB_LABELS) as ReaderTab[]).map((key) => (
                <button key={key} onClick={() => changeTab(key)} className={`relative flex-1 px-3 py-4 text-sm tracking-[0.12em] ${tab === key ? "font-semibold text-[#8f3224]" : "text-[#68665e] hover:bg-[#eee4d2]"}`}>
                  {TAB_LABELS[key]}
                  {tab === key && <span className="absolute inset-x-[18%] bottom-0 h-0.5 bg-[#8f3224]" />}
                </button>
              ))}
            </div>

            <div className="paper-texture min-h-[560px] px-5 py-7 sm:px-9 sm:py-10">
              {tab === "text" && (
                <div className="reader-copy fade-enter">
                  <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-[#d8ccb7] pb-4 text-xs text-[#777064]">
                    <span>{SUNZI_SOURCE.title}</span>
                    <span>固定修訂版 {SUNZI_SOURCE.oldid}</span>
                  </div>
                  <div className="space-y-2">
                    {chapter.segments.map((segment) => (
                      <section key={segment.id} id={`segment-${segment.id}`} className={`segment group -mx-2 grid scroll-mt-52 grid-cols-[50px_1fr] gap-2 rounded-sm px-2 py-5 transition-colors sm:grid-cols-[62px_1fr] ${targetSegment === segment.id ? "targeted" : "hover:bg-[#8f3224]/[.035]"}`}>
                        <a href={joinBasePath(chapterSegmentPath(chapter, segment.id))} onClick={(event) => { event.preventDefault(); openSegment(chapterIndex, segment.id); }} className="segment-id self-start pt-2 text-left font-mono text-[10px] tracking-wider text-[#9c907d]" aria-label={`連結至段落 ${segment.id}`}>
                          {segment.id}
                        </a>
                        <div className="min-w-0">
                          <p className="segment-text">{segment.text}</p>
                          <button onClick={() => copySegment(segment.id, segment.text)} className="no-print mt-3 flex items-center gap-1.5 text-[11px] text-[#8f3224] opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100">
                            {copied === segment.id ? <Check className="size-3" /> : <Link2 className="size-3" />}{copied === segment.id ? "已複製" : "複製並引用此段"}
                          </button>
                        </div>
                      </section>
                    ))}
                  </div>
                  {chapter.variants.length > 0 && (
                    <div className="mt-9 border-l-2 border-[#a37a38] bg-[#ece2cf] px-5 py-4 text-sm leading-7 text-[#58584f]">
                      <b className="serif text-[#6e4f20]">異文提示</b>
                      {chapter.variants.map((variant) => <p key={variant} className="mt-1">{variant}</p>)}
                    </div>
                  )}
                </div>
              )}

              {tab === "summary" && (
                <div className="fade-enter">
                  <p className="text-xs tracking-[0.24em] text-[#8f3224]">本站自撰 · 提要式今譯</p>
                  <p className="serif mt-7 text-xl leading-[2.15] tracking-[0.04em] text-[#292b26] sm:text-2xl">{chapter.summary}</p>
                  <blockquote className="serif mt-10 border-y border-[#cfbea1] py-7 text-center text-lg leading-9 text-[#5a4934]">
                    「{chapter.segments[0].text.split("。")[0]}。」
                    <footer className="mt-3 font-sans text-[11px] tracking-[0.2em] text-[#8e8576]">〈{chapter.title}〉{chapter.segments[0].id}</footer>
                  </blockquote>
                  <div className="mt-9 bg-[#eee4d2] px-5 py-4 text-sm leading-7 text-[#666157]">
                    <b className="text-[#8f3224]">閱讀說明：</b>本層說明全篇綱領，不是逐句翻譯。引用與研究仍應回到原文段號及版本資料。
                  </div>
                </div>
              )}

              {tab === "points" && (
                <div className="fade-enter">
                  <p className="mb-7 text-xs tracking-[0.24em] text-[#8f3224]">{chapter.points.length} 則 · 均錨定原文段落</p>
                  <div className="divide-y divide-[#d8cbb5] border-y border-[#d8cbb5]">
                    {chapter.points.map((point, index) => (
                      <button key={point.title} onClick={() => openSegment(chapterIndex, point.segmentId)} className="group grid w-full gap-3 py-6 text-left sm:grid-cols-[46px_1fr_auto] sm:items-start">
                        <span className="serif text-2xl text-[#a37a38]">{String(index + 1).padStart(2, "0")}</span>
                        <span>
                          <b className="serif text-lg tracking-[0.08em] group-hover:text-[#8f3224]">{point.title}</b>
                          <span className="mt-2 block text-sm leading-7 text-[#656258]">{point.body}</span>
                        </span>
                        <span className="flex items-center gap-1 font-mono text-[10px] text-[#8f3224]"><Hash className="size-3" />{point.segmentId}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </article>

          <aside className="no-print space-y-5 lg:sticky lg:top-[142px] lg:self-start">
            {progressHydrated && (
              <ReadingProgressPanel
                compact
                progress={progress}
                currentTitle={chapter.title}
                labels={ZH_READING_PROGRESS_LABELS}
                onReset={resetProgress}
                canUndo={canUndoReset}
                onUndo={undoReset}
              />
            )}
            {preferencesHydrated && (
              <ReadingSpeedCalibrator locale="zh-Hant" segments={chapter.segments} customRate={personalRate} sampleCount={preferences.speeds["zh-Hant"]?.sampleCount} onSample={(unitCount, elapsedSeconds) => addSample("zh-Hant", unitCount, elapsedSeconds)} onReset={() => resetLocale("zh-Hant")} />
            )}
            <section className="border border-[#cdbf9f] bg-[#e8decb] p-5">
              <p className="text-[10px] tracking-[0.25em] text-[#8f3224]">本篇定位</p>
              <p className="serif mt-3 text-base leading-8 text-[#373a33]">{chapter.summary.slice(0, 94)}……</p>
              <button onClick={() => changeTab("summary")} className="mt-4 text-xs font-semibold text-[#8f3224]">閱讀完整篇旨 →</button>
            </section>
            <section className="border border-[#cdbf9f] bg-[#f8f1e5] p-5">
              <p className="text-[10px] tracking-[0.25em] text-[#8f3224]">快速鍵</p>
              <div className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-3 text-xs text-[#656258]">
                <kbd className="border border-[#bbaa8b] px-2 py-0.5 text-center">/</kbd><span>全文搜尋</span>
                <kbd className="border border-[#bbaa8b] px-2 py-0.5 text-center">J</kbd><span>下一篇</span>
                <kbd className="border border-[#bbaa8b] px-2 py-0.5 text-center">K</kbd><span>上一篇</span>
                <kbd className="border border-[#bbaa8b] px-2 py-0.5 text-center">Esc</kbd><span>關閉面板</span>
              </div>
            </section>
            <section className="border-l-2 border-[#8f3224] pl-4 text-xs leading-6 text-[#777064]">
              <p>正文、今譯與要義分層呈現。原文採固定修訂版，編輯說明及授權可隨時查閱。</p>
              <button onClick={() => setSourceOpen(true)} className="mt-2 font-semibold text-[#8f3224]">來源與授權</button>
            </section>
          </aside>
        </div>

        <div className="no-print mx-auto mb-14 grid max-w-6xl grid-cols-2 gap-px bg-[#bbaa8d] border border-[#bbaa8d]">
          {chapterIndex > 0 ? <a rel="prev" href={joinBasePath(chapterPath(SUNZI_CHAPTERS[chapterIndex - 1]))} onClick={(event) => { event.preventDefault(); goChapter(chapterIndex - 1); }} className="flex min-h-20 items-center justify-start gap-3 bg-[#efe5d3] px-4 text-left hover:bg-[#e4d7c0] sm:px-7">
            <ChevronLeft className="size-5" /><span><small className="block text-[10px] tracking-widest text-[#8f3224]">上一篇</small><b className="serif mt-1 block">{chapterIndex > 0 ? SUNZI_CHAPTERS[chapterIndex - 1].fullTitle : "卷首"}</b></span>
          </a> : <a href={joinBasePath("/")} onClick={(event) => { event.preventDefault(); navigate("/"); }} className="flex min-h-20 items-center justify-start gap-3 bg-[#efe5d3] px-4 text-left hover:bg-[#e4d7c0] sm:px-7"><ChevronLeft className="size-5" /><span><small className="block text-[10px] tracking-widest text-[#8f3224]">返回</small><b className="serif mt-1 block">十三篇總覽</b></span></a>}
          {chapterIndex < 12 ? <a rel="next" href={joinBasePath(chapterPath(SUNZI_CHAPTERS[chapterIndex + 1]))} onClick={(event) => { event.preventDefault(); goChapter(chapterIndex + 1); }} className="flex min-h-20 items-center justify-end gap-3 bg-[#efe5d3] px-4 text-right hover:bg-[#e4d7c0] sm:px-7">
            <span><small className="block text-[10px] tracking-widest text-[#8f3224]">下一篇</small><b className="serif mt-1 block">{chapterIndex < 12 ? SUNZI_CHAPTERS[chapterIndex + 1].fullTitle : "篇終"}</b></span><ChevronRight className="size-5" />
          </a> : <a href={joinBasePath("/")} onClick={(event) => { event.preventDefault(); navigate("/"); }} className="flex min-h-20 items-center justify-end gap-3 bg-[#efe5d3] px-4 text-right hover:bg-[#e4d7c0] sm:px-7"><span><small className="block text-[10px] tracking-widest text-[#8f3224]">篇終</small><b className="serif mt-1 block">返回十三篇總覽</b></span><ChevronRight className="size-5" /></a>}
        </div>
      </main>

      <footer className="border-t border-[#bbaa8b] bg-[#26352b] px-5 py-8 text-[#d8d0bf]">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-4 text-xs leading-6 sm:flex-row">
          <p>《孫子兵法》十三篇線上讀本<br /><span className="text-[#a9a595]">{totalCharacters.toLocaleString("zh-TW")} 原文字元 · {totalSegments} 段 · {totalPoints} 則要義</span></p>
          <p className="sm:text-right">原文：維基文庫 oldid {SUNZI_SOURCE.oldid} · CC BY-SA 4.0<br /><span className="text-[#a9a595]">篇旨今譯與要義提點：本站自撰</span></p>
        </div>
      </footer>

      <div className="no-print fixed bottom-5 right-4 z-30 flex flex-col gap-2 sm:right-6">
        <button onClick={speakCurrent} aria-label={speaking ? "停止朗讀" : "朗讀目前內容"} className={`grid size-12 place-items-center border shadow-lg ${speaking ? "border-[#8f3224] bg-[#8f3224] text-white" : "border-[#b9a98b] bg-[#f8f1e4] text-[#26352b] hover:bg-[#e5dac5]"}`}>
          {speaking ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
        </button>
        <button onClick={() => IS_STATIC_EXPORT ? window.location.assign(fullAppPath(chapterPath(chapter))) : setChatOpen(true)} aria-label="開啟兵法問答" className="grid size-12 place-items-center border border-[#8f3224] bg-[#26352b] text-[#fff7e8] shadow-lg hover:bg-[#8f3224]"><MessageCircle className="size-5" /></button>
      </div>

      {menuOpen && (
        <div className="no-print fixed inset-0 z-50">
          <button aria-label="關閉目錄" className="absolute inset-0 bg-[#171a17]/45 backdrop-blur-[2px]" onClick={() => setMenuOpen(false)} />
          <aside className="drawer-enter absolute inset-y-0 left-0 w-[min(92vw,390px)] overflow-y-auto border-r border-[#b7a687] bg-[#f3ead9] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center border-b border-[#cabb9f] bg-[#f3ead9]/95 px-5 py-4 backdrop-blur">
              <div><p className="text-[10px] tracking-[0.25em] text-[#8f3224]">目錄</p><h3 className="serif mt-1 text-xl font-bold tracking-[0.12em]">十三篇</h3></div>
              <button aria-label="關閉目錄" onClick={() => setMenuOpen(false)} className="ml-auto grid size-9 place-items-center hover:bg-[#e0d4bf]"><X className="size-5" /></button>
            </div>
            <div className="p-3">
              <ChapterPlannerControls locale="zh-Hant" sortMode={chapterSort} timeLimit={readingTimeLimit} resultCount={plannedChapters.length} totalCount={SUNZI_CHAPTERS.length} onSortMode={setChapterSort} onTimeLimit={setReadingTimeLimit} />
              <div className="mt-3">
              {plannedChapters.map(({ item, originalIndex: index }) => (
                <a key={item.number} href={joinBasePath(chapterPath(item))} onClick={(event) => { event.preventDefault(); goChapter(index); }} aria-current={index === chapterIndex ? "page" : undefined} className={`grid w-full grid-cols-[45px_1fr_auto] items-center gap-2 border-b border-[#d8cbb5] px-3 py-4 text-left ${index === chapterIndex ? "bg-[#26352b] text-[#fff7e8]" : "hover:bg-[#e6dbc6]"}`}>
                  <span className={`serif text-xl ${index === chapterIndex ? "text-[#d9b96b]" : "text-[#a37a38]"}`}>{String(item.number).padStart(2, "0")}</span>
                  <span><b className="serif block tracking-[0.1em]">{item.fullTitle}</b><small className={`mt-1 block ${index === chapterIndex ? "text-[#c6c0b1]" : "text-[#777064]"}`}>{item.group} · {item.segments.length} 段</small><ChapterReadingStats segments={item.segments} locale="zh-Hant" variant="inline" customRate={personalRate} /></span>
                  {progressHydrated && hasVisitedChapter(progress, item.number) ? <Check className="size-4 text-[#a37a38]" aria-label="已讀" /> : <ChevronRight className="size-4 opacity-55" />}
                </a>
              ))}
              {plannedChapters.length === 0 && <p className="px-3 py-8 text-center text-sm text-[#777064]">沒有符合此閱讀時間的篇章。</p>}
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button onClick={() => { window.location.href = IS_STATIC_EXPORT ? fullAppPath("/events") : "/events"; }} className="flex items-center justify-center gap-2 border border-[#8f3224] bg-[#8f3224] px-3 py-3 text-xs text-[#fff8ea] hover:bg-[#26352b] sm:col-span-2"><NotebookPen className="size-4" />Match Mapping 事件簿</button>
                <button onClick={() => { setMenuOpen(false); setSearchOpen(true); }} className="flex items-center justify-center gap-2 border border-[#bbaa8b] px-3 py-3 text-xs hover:bg-[#e3d6c0]"><Search className="size-4" />全文搜尋</button>
                <button onClick={() => { setMenuOpen(false); setTranslationOpen(true); }} className="flex items-center justify-center gap-2 border border-[#bbaa8b] px-3 py-3 text-xs hover:bg-[#e3d6c0]"><Languages className="size-4" />多語翻譯</button>
                <button onClick={() => { setMenuOpen(false); setSourceOpen(true); }} className="flex items-center justify-center gap-2 border border-[#bbaa8b] px-3 py-3 text-xs hover:bg-[#e3d6c0] sm:col-span-2"><BookOpen className="size-4" />編輯體例</button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {searchOpen && (
        <div className="no-print fixed inset-0 z-[60] flex items-start justify-center bg-[#171a17]/55 px-3 pt-[7vh] backdrop-blur-sm">
          <section className="fade-enter flex max-h-[86vh] w-full max-w-3xl flex-col border border-[#b8a687] bg-[#f8f1e5] shadow-2xl">
            <div className="flex items-center gap-3 border-b border-[#cbbb9e] p-4 sm:p-5">
              <Search className="size-5 text-[#8f3224]" />
              <Input ref={searchInput} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && searchMode === "semantic" && query.trim().length >= 4) semanticSearch.mutate({ query }); }} placeholder={searchMode === "literal" ? "搜尋原文、篇旨、要義或概念……" : "輸入情境，例如：資源有限時如何決定是否推進？"} className="h-11 flex-1 rounded-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0" />
              <button aria-label="關閉搜尋" onClick={() => setSearchOpen(false)} className="grid size-9 place-items-center hover:bg-[#e2d6c2]"><X className="size-5" /></button>
            </div>
            <div className="flex border-b border-[#cbbb9e] bg-[#eee4d2] px-4 pt-3 sm:px-5">
              <button onClick={() => { setSearchMode("literal"); semanticSearch.reset(); }} className={`border-b-2 px-4 py-2 text-xs ${searchMode === "literal" ? "border-[#8f3224] font-semibold text-[#8f3224]" : "border-transparent text-[#6e695f]"}`}>逐字搜尋</button>
              {!IS_STATIC_EXPORT && <button onClick={() => setSearchMode("semantic")} className={`border-b-2 px-4 py-2 text-xs ${searchMode === "semantic" ? "border-[#8f3224] font-semibold text-[#8f3224]" : "border-transparent text-[#6e695f]"}`}>AI 情境搜尋</button>}
            </div>
            <div className="overflow-y-auto p-3 sm:p-5">
              {searchMode === "literal" && !query.trim() && (
                <div className="py-12 text-center text-[#797267]"><Search className="mx-auto mb-4 size-9 opacity-30" /><p className="serif">可搜尋「知彼知己」、「虛實」、「九地」或任一原文字句</p></div>
              )}
              {searchMode === "literal" && query.trim() && searchResults.length === 0 && <p className="py-12 text-center text-sm text-[#797267]">沒有找到相符內容。</p>}
              {searchMode === "literal" && query.trim() && searchResults.length > 0 && (
                <>
                  <p className="mb-3 text-[10px] tracking-[0.18em] text-[#8f3224]">找到 {searchResults.length} 項結果</p>
                  <div className="divide-y divide-[#d8cbb5] border-y border-[#d8cbb5]">
                    {searchResults.map((result) => (
                      <button key={result.key} onClick={() => result.segmentId ? openSegment(result.chapterIndex, result.segmentId) : goChapter(result.chapterIndex)} className="w-full px-2 py-4 text-left hover:bg-[#e9deca] sm:px-4">
                        <small className="text-[10px] tracking-[0.13em] text-[#8f3224]">{result.eyebrow}</small>
                        <p className="serif mt-2 line-clamp-3 text-sm leading-7 text-[#3c3d37]">{highlight(result.text, query)}</p>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {searchMode === "semantic" && (
                <div>
                  {!semanticSearch.data && !semanticSearch.isPending && <div className="py-10 text-center"><Sparkles className="mx-auto size-9 text-[#a37a38]" /><p className="serif mt-4 text-lg">以自然語言描述情境，從六十四則要義找出可回溯原文的匹配。</p><Button disabled={query.trim().length < 4} onClick={() => semanticSearch.mutate({ query })} className="mt-6 rounded-none bg-[#26352b] text-[#fff8ea]"><Sparkles />解析情境</Button></div>}
                  {semanticSearch.isPending && <div className="grid place-items-center py-14 text-sm text-[#777064]"><Loader2 className="mb-4 size-6 animate-spin" />正在比對六十四則兵法原則……</div>}
                  {semanticSearch.data && <><div className="border-l-2 border-[#a37a38] bg-[#eee4d2] px-4 py-3 text-sm leading-7 text-[#55574f]">{semanticSearch.data.interpretation}</div><div className="mt-4 divide-y divide-[#d8cbb5] border-y border-[#d8cbb5]">{semanticSearch.data.matches.map(result => <button key={result.key} onClick={() => openSegment(result.chapterNumber - 1, result.segmentId)} className="w-full px-3 py-4 text-left hover:bg-[#e9deca]"><small className="text-[10px] tracking-[0.13em] text-[#8f3224]">〈{result.chapterTitle}〉{result.segmentId} · {result.principle}</small><p className="mt-2 text-sm leading-7 text-[#3c3d37]">{result.reason}</p><p className="serif mt-2 line-clamp-2 text-sm leading-7 text-[#6c675e]">{result.quote}</p></button>)}</div><Button variant="outline" onClick={() => semanticSearch.mutate({ query })} className="mt-4 rounded-none border-[#a9997d]">重新解析</Button></>}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {sourceOpen && (
        <div className="no-print fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-[#171a17]/55 p-4 backdrop-blur-sm">
          <section className="fade-enter relative my-6 w-full max-w-2xl border border-[#b8a687] bg-[#f8f1e5] p-6 shadow-2xl sm:p-9">
            <button aria-label="關閉來源說明" onClick={() => setSourceOpen(false)} className="absolute right-3 top-3 grid size-9 place-items-center hover:bg-[#e2d6c2]"><X className="size-5" /></button>
            <p className="text-[10px] tracking-[0.25em] text-[#8f3224]">底本 · 體例 · 授權</p>
            <h3 className="serif mt-3 text-3xl font-bold tracking-[0.1em]">編輯說明</h3>
            <div className="mt-7 space-y-6 text-sm leading-8 text-[#55564f]">
              <div><b className="serif text-lg text-[#282b26]">原文底本</b><p className="mt-1">{SUNZI_SOURCE.editorialNote}</p><a href={SUNZI_SOURCE.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 font-semibold text-[#8f3224]">開啟固定修訂版 <ExternalLink className="size-3.5" /></a></div>
              <div><b className="serif text-lg text-[#282b26]">三層閱讀</b><p className="mt-1">原文保留固定段號；篇旨今譯說明一篇綱領；要義提點逐則錨定段落。本站主題與標籤屬閱讀索引，不宣稱為原典自有分類。</p></div>
              <div><b className="serif text-lg text-[#282b26]">授權</b><p className="mt-1">維基文庫頁面文字依 {SUNZI_SOURCE.license} 提供。本站保留來源固定連結與授權標示。篇旨今譯、要義提點與介面編排為本站自撰。</p></div>
              <div className="border-l-2 border-[#a37a38] bg-[#ede2cf] px-4 py-3"><b>範圍聲明：</b>來源頁在十三篇後另附〈答話〉；本站未將其列為第十四篇，也未混入十三篇正文。</div>
            </div>
          </section>
        </div>
      )}

      {translationOpen && (
        <div className="no-print fixed inset-0 z-[64]">
          <button aria-label="關閉翻譯" onClick={() => setTranslationOpen(false)} className="absolute inset-0 bg-[#171a17]/45 backdrop-blur-[2px]" />
          <section className="drawer-enter absolute inset-y-0 right-0 flex w-[min(100vw,680px)] flex-col border-l border-[#b8a687] bg-[#f6eee0] shadow-2xl">
            <div className="flex items-center border-b border-[#cbbb9e] px-5 py-4">
              <div className="grid size-9 place-items-center bg-[#526650] text-white"><Languages className="size-4" /></div>
              <div className="ml-3 min-w-0"><h3 className="serif font-bold tracking-[0.08em]">多語翻譯</h3><p className="truncate text-[10px] text-[#777064]">目前篇章：〈{chapter.title}〉· 保留固定段號</p></div>
              <button aria-label="關閉翻譯" onClick={() => setTranslationOpen(false)} className="ml-auto grid size-9 place-items-center hover:bg-[#e2d6c2]"><X className="size-5" /></button>
            </div>
            <div className="border-b border-[#cbbb9e] bg-[#e9decb] p-4 sm:flex sm:items-center sm:gap-3">
              <label htmlFor="translation-language" className="text-xs font-semibold text-[#55574f]">目標語言</label>
              <select id="translation-language" value={translationLanguage} onChange={event => { setTranslationLanguage(event.target.value as TranslationLanguage); setTranslation(null); }} className="mt-2 h-10 w-full border border-[#bbaa8b] bg-[#fffaf0] px-3 text-sm sm:mt-0 sm:w-44">
                {TRANSLATION_LANGUAGES.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}
              </select>
              {!IS_STATIC_EXPORT && <Button onClick={requestTranslation} disabled={translate.isPending} className="mt-2 h-10 w-full rounded-none bg-[#26352b] text-[#fff8ea] sm:mt-0 sm:w-auto">{translate.isPending ? <Loader2 className="animate-spin" /> : <Languages />}{translation ? "重新翻譯" : "翻譯本篇"}</Button>}
            </div>
            <div className="border-b border-[#cbbb9e] bg-[#f7f0e4] px-4 py-3">
              <p className="text-[10px] font-semibold tracking-[0.16em] text-[#8f3224]">可搜尋引擎索引的公開語言版</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {TRANSLATION_LANGUAGES.map(item => <a key={item.code} href={joinBasePath(localizedChapterPath(item.code, chapter))} className="border border-[#bbaa8b] bg-[#fffaf0] px-3 py-1.5 text-xs text-[#405542] hover:border-[#526650] hover:bg-[#e0e6dc]">{item.label}</a>)}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
              {!translation && !translate.isPending && <div className="grid min-h-[55vh] place-items-center text-center"><div><Languages className="mx-auto size-12 text-[#526650]" /><h4 className="serif mt-5 text-2xl font-bold">{IS_STATIC_EXPORT ? "選擇公開語言版" : "按需翻譯目前篇章"}</h4><p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#6d685f]">提供英文、日文、韓文、西班牙文、法文及德文。原文不被覆寫；翻譯只作閱讀輔助，引用仍應回到中文原文與固定段號。</p></div></div>}
              {translate.isPending && <div className="grid min-h-[55vh] place-items-center text-center text-sm text-[#777064]"><div><Loader2 className="mx-auto mb-4 size-7 animate-spin" />正在翻譯〈{chapter.title}〉並核對段號……</div></div>}
              {translation && <div className="fade-enter"><p className="text-[10px] tracking-[0.2em] text-[#526650]">{translation.languageLabel} · {translation.model} · oldid {translation.sourceOldid}</p><h4 className="serif mt-3 text-3xl font-black">{translation.chapterTitle}</h4><section className="mt-6 border border-[#cdbf9f] bg-[#eee4d2] p-5"><p className="text-[10px] font-semibold tracking-[0.2em] text-[#8f3224]">EDITORIAL SUMMARY</p><p className="mt-3 text-sm leading-7 text-[#4f514a]">{translation.summary}</p></section><div className="mt-6 divide-y divide-[#d8cbb5] border-y border-[#d8cbb5]">{translation.segments.map(segment => <section key={segment.id} className="grid grid-cols-[50px_1fr] gap-3 py-5"><span className="font-mono text-[10px] text-[#8f3224]">{segment.id}</span><p className="text-base leading-8 text-[#3d4039]">{segment.text}</p></section>)}</div><p className="mt-5 border-l-2 border-[#8f3224] pl-4 text-xs leading-6 text-[#6d685f]">AI 翻譯可能有誤，尤其古典語義具多重詮釋時；研究及正式引用請以中文原文為準。</p></div>}
            </div>
          </section>
        </div>
      )}

      {chatOpen && (
        <div className="no-print fixed inset-0 z-[65]">
          <button aria-label="關閉問答" onClick={() => setChatOpen(false)} className="absolute inset-0 bg-[#171a17]/45 backdrop-blur-[2px]" />
          <section className="drawer-enter absolute inset-y-0 right-0 flex w-[min(100vw,500px)] flex-col border-l border-[#b8a687] bg-[#f6eee0] shadow-2xl">
            <div className="flex items-center border-b border-[#cbbb9e] px-5 py-4">
              <div className="grid size-9 place-items-center bg-[#8f3224] text-white"><Sparkles className="size-4" /></div>
              <div className="ml-3 min-w-0"><h3 className="serif font-bold tracking-[0.08em]">兵法問答</h3><p className="truncate text-[10px] text-[#777064]">目前所在：〈{chapter.title}〉· 回覆附篇段引用</p></div>
              <button aria-label="清除對話" onClick={() => { setMessages([]); toast.success("已清除本機對話紀錄"); }} className="ml-auto grid size-9 place-items-center hover:bg-[#e2d6c2]"><Trash2 className="size-4" /></button>
              <button aria-label="關閉問答" onClick={() => setChatOpen(false)} className="grid size-9 place-items-center hover:bg-[#e2d6c2]"><X className="size-5" /></button>
            </div>
            <div className="border-b border-[#cbbb9e] bg-[#e9decb] px-5 py-3 text-[11px] leading-5 text-[#656157]">使用 gpt-5-mini，僅以本站十三篇與篇旨為材料。AI 回覆可能有誤，重要引用請回到原文段號核對。</div>
            <Suspense fallback={<div className="grid min-h-0 flex-1 place-items-center text-sm text-[#777064]">載入問答介面……</div>}>
              <AIChatBox
                messages={messages}
                onSendMessage={sendMessage}
                isLoading={ask.isPending}
                placeholder="就十三篇提問……"
                height="100%"
                className="min-h-0 flex-1 rounded-none border-0 bg-transparent shadow-none"
                emptyStateMessage="問篇旨、原文字句或跨篇概念"
                suggestedPrompts={[
                  `〈${chapter.title}〉的核心主張是什麼？`,
                  "「知彼知己」在原文脈絡中如何理解？",
                  "比較〈軍形〉與〈兵勢〉的差別。",
                ]}
              />
            </Suspense>
          </section>
        </div>
      )}

      <div className="sr-only" aria-live="polite">{speaking ? `正在朗讀〈${chapter.title}〉${TAB_LABELS[tab]}` : ""}</div>
      </>)}
    </div>
  );
}
