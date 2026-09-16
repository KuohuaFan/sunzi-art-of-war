import { Button } from "@/components/ui/button";
import { chapterStatsFromSegments, formatReadingStats } from "@shared/chapter-reading-stats";
import { MIN_CALIBRATION_SECONDS, type ChapterSortMode, type ReadingTimeLimit } from "@shared/reading-preferences";
import type { SunziReadingLocale } from "@shared/reading-progress";
import { Clock3, Gauge, RotateCcw, Square, TimerReset } from "lucide-react";
import { useEffect, useState } from "react";

const COPY: Record<SunziReadingLocale, {
  planner: string; canonical: string; shortest: string; time: string; all: string; result: (count: number, total: number) => string;
  calibrate: string; intro: string; start: string; finish: string; cancel: string; reset: string; local: string;
  elapsed: string; saved: string; tooShort: string; rate: (value: number, samples: number, unit: "characters" | "words") => string;
}> = {
  "zh-Hant": { planner: "選篇節奏", canonical: "原篇次", shortest: "短篇優先", time: "閱讀時間", all: "不限時間", result: (c, t) => `顯示 ${c}／${t} 篇`, calibrate: "個人閱讀速度", intro: "開始後閱讀本篇，完成時停止計時；本站會用實際速度更新估算。", start: "開始計時", finish: "完成並校準", cancel: "取消", reset: "恢復預設", local: "速度只保存在本機瀏覽器。", elapsed: "已計時", saved: "已更新個人化估算。", tooShort: "請至少閱讀 20 秒再完成校準。", rate: (v, s, u) => `每分鐘 ${v} ${u === "characters" ? "字" : "詞"} · ${s} 次樣本` },
  en: { planner: "Reading plan", canonical: "Chapter order", shortest: "Shortest first", time: "Reading time", all: "Any length", result: (c, t) => `${c} of ${t} chapters`, calibrate: "Personal reading speed", intro: "Start the timer, read this chapter, then finish to personalize future estimates.", start: "Start timer", finish: "Finish & calibrate", cancel: "Cancel", reset: "Use default", local: "Your speed stays in this browser.", elapsed: "Elapsed", saved: "Personal estimate updated.", tooShort: "Read for at least 20 seconds before finishing.", rate: (v, s, u) => `${v} ${u === "characters" ? "characters" : "words"}/min · ${s} sample${s === 1 ? "" : "s"}` },
  ja: { planner: "読書プラン", canonical: "篇順", shortest: "短篇優先", time: "読書時間", all: "制限なし", result: (c, t) => `${t}篇中${c}篇`, calibrate: "個人の読書速度", intro: "計時を開始して本篇を読み、終了時に止めると推定時間を調整します。", start: "計時開始", finish: "終了して調整", cancel: "取消", reset: "既定値に戻す", local: "速度はこのブラウザ内だけに保存されます。", elapsed: "経過", saved: "個人推定を更新しました。", tooShort: "20秒以上読んでから終了してください。", rate: (v, s) => `毎分${v}文字・${s}回の記録` },
  ko: { planner: "읽기 계획", canonical: "편 순서", shortest: "짧은 편 우선", time: "읽기 시간", all: "시간 제한 없음", result: (c, t) => `${t}편 중 ${c}편`, calibrate: "개인 읽기 속도", intro: "타이머를 시작해 이 편을 읽고 완료하면 실제 속도로 예상 시간을 조정합니다.", start: "타이머 시작", finish: "완료 및 보정", cancel: "취소", reset: "기본값 사용", local: "속도는 이 브라우저에만 저장됩니다.", elapsed: "경과", saved: "개인 예상 시간을 업데이트했습니다.", tooShort: "최소 20초 읽은 뒤 완료하십시오.", rate: (v, s) => `분당 ${v}단어 · 표본 ${s}회` },
  es: { planner: "Plan de lectura", canonical: "Orden original", shortest: "Más breves primero", time: "Tiempo de lectura", all: "Sin límite", result: (c, t) => `${c} de ${t} capítulos`, calibrate: "Velocidad personal", intro: "Inicie el cronómetro, lea este capítulo y termine para personalizar las estimaciones.", start: "Iniciar", finish: "Terminar y calibrar", cancel: "Cancelar", reset: "Usar valor predeterminado", local: "La velocidad solo se guarda en este navegador.", elapsed: "Tiempo", saved: "Estimación personal actualizada.", tooShort: "Lea al menos 20 segundos antes de terminar.", rate: (v, s) => `${v} palabras/min · ${s} muestra${s === 1 ? "" : "s"}` },
  fr: { planner: "Plan de lecture", canonical: "Ordre original", shortest: "Plus courts d’abord", time: "Temps de lecture", all: "Sans limite", result: (c, t) => `${c} chapitre${c === 1 ? "" : "s"} sur ${t}`, calibrate: "Vitesse personnelle", intro: "Lancez le chronomètre, lisez ce chapitre puis terminez pour personnaliser les estimations.", start: "Démarrer", finish: "Terminer et calibrer", cancel: "Annuler", reset: "Valeur par défaut", local: "La vitesse reste dans ce navigateur.", elapsed: "Écoulé", saved: "Estimation personnelle mise à jour.", tooShort: "Lisez au moins 20 secondes avant de terminer.", rate: (v, s) => `${v} mots/min · ${s} mesure${s === 1 ? "" : "s"}` },
  de: { planner: "Leseplan", canonical: "Kapitelreihenfolge", shortest: "Kurze zuerst", time: "Lesezeit", all: "Ohne Begrenzung", result: (c, t) => `${c} von ${t} Kapiteln`, calibrate: "Persönliches Lesetempo", intro: "Timer starten, dieses Kapitel lesen und anschließend die Schätzung kalibrieren.", start: "Timer starten", finish: "Beenden & kalibrieren", cancel: "Abbrechen", reset: "Standard verwenden", local: "Das Tempo bleibt nur in diesem Browser.", elapsed: "Zeit", saved: "Persönliche Schätzung aktualisiert.", tooShort: "Bitte mindestens 20 Sekunden lesen.", rate: (v, s) => `${v} Wörter/Min. · ${s} Messung${s === 1 ? "" : "en"}` },
};

export function ChapterPlannerControls({ locale, sortMode, timeLimit, resultCount, totalCount, onSortMode, onTimeLimit }: {
  locale: SunziReadingLocale;
  sortMode: ChapterSortMode;
  timeLimit: ReadingTimeLimit;
  resultCount: number;
  totalCount: number;
  onSortMode: (value: ChapterSortMode) => void;
  onTimeLimit: (value: ReadingTimeLimit) => void;
}) {
  const copy = COPY[locale];
  return (
    <section className="border border-[#cdbf9f] bg-[#f8f1e5] p-4 text-left" aria-label={copy.planner}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8f3224]"><Gauge className="size-4" />{copy.planner}</p>
        <span className="text-[11px] text-[#777064]" aria-live="polite">{copy.result(resultCount, totalCount)}</span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-[10px] text-[#68645b]">
          <span className="sr-only">{copy.canonical}</span>
          <select value={sortMode} onChange={event => onSortMode(event.target.value as ChapterSortMode)} className="h-10 w-full border border-[#b9aa91] bg-[#fffaf0] px-3 text-sm">
            <option value="canonical">{copy.canonical}</option>
            <option value="shortest">{copy.shortest}</option>
          </select>
        </label>
        <label className="text-[10px] text-[#68645b]">
          <span className="sr-only">{copy.time}</span>
          <select value={timeLimit} onChange={event => onTimeLimit(Number(event.target.value) as ReadingTimeLimit)} className="h-10 w-full border border-[#b9aa91] bg-[#fffaf0] px-3 text-sm">
            <option value={0}>{copy.all}</option>
            {[1, 2, 3, 5, 10].map(minutes => <option key={minutes} value={minutes}>{copy.time} ≤ {minutes} min</option>)}
          </select>
        </label>
      </div>
    </section>
  );
}

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function ReadingSpeedCalibrator({ locale, segments, customRate, sampleCount = 0, onSample, onReset }: {
  locale: SunziReadingLocale;
  segments: readonly { text: string }[];
  customRate?: number;
  sampleCount?: number;
  onSample: (unitCount: number, elapsedSeconds: number) => void;
  onReset: () => void;
}) {
  const copy = COPY[locale];
  const stats = chapterStatsFromSegments(segments, locale, customRate);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setElapsed(value => value + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  function start() {
    setElapsed(0);
    setMessage("");
    setRunning(true);
  }

  function finish() {
    if (elapsed < MIN_CALIBRATION_SECONDS) {
      setMessage(copy.tooShort);
      return;
    }
    onSample(stats.unitCount, elapsed);
    setRunning(false);
    setMessage(copy.saved);
  }

  return (
    <section className="border border-[#cdbf9f] bg-[#f8f1e5] p-5" aria-label={copy.calibrate}>
      <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8f3224]"><TimerReset className="size-4" />{copy.calibrate}</p>
      {customRate ? <p className="mt-3 text-sm font-semibold text-[#26352b]">{copy.rate(customRate, sampleCount, stats.unit)}</p> : <p className="mt-3 text-xs leading-6 text-[#656258]">{copy.intro}</p>}
      {running ? (
        <div className="mt-4">
          <p className="font-mono text-2xl text-[#26352b]" aria-live="polite">{copy.elapsed} {formatElapsed(elapsed)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={finish} size="sm" className="rounded-none bg-[#26352b] text-[#fff9ea] hover:bg-[#8f3224]"><Square className="size-3.5" />{copy.finish}</Button>
            <Button onClick={() => { setRunning(false); setElapsed(0); setMessage(""); }} size="sm" variant="outline" className="rounded-none border-[#b9aa91]">{copy.cancel}</Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={start} size="sm" className="rounded-none bg-[#26352b] text-[#fff9ea] hover:bg-[#8f3224]"><Clock3 className="size-3.5" />{copy.start}</Button>
          {customRate && <Button onClick={() => { onReset(); setMessage(""); }} size="sm" variant="outline" className="rounded-none border-[#b9aa91]"><RotateCcw className="size-3.5" />{copy.reset}</Button>}
        </div>
      )}
      {message && <p className={`mt-3 text-xs ${message === copy.saved ? "text-[#476347]" : "text-[#8f3224]"}`} role="status">{message}</p>}
      <p className="mt-3 text-[10px] leading-5 text-[#817a6e]">{copy.local}</p>
    </section>
  );
}
