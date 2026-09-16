import { Button } from "@/components/ui/button";
import { readingPositionPercent, type SunziReadingProgress } from "@shared/reading-progress";
import { SUNZI_CHAPTERS } from "@shared/sunzi-data";
import type { SunziLocale } from "@shared/sunzi-locales";
import { BookMarked, ChevronRight, RotateCcw } from "lucide-react";

export type ReadingProgressLabels = {
  eyebrow: string;
  notStarted: string;
  currentPrefix: string;
  positionLabel: (current: number, total: number) => string;
  visitedLabel: (visited: number, total: number) => string;
  continueLabel: string;
  resetLabel: string;
  undoLabel: string;
  resetConfirm: string;
};

export function hasVisitedChapter(progress: SunziReadingProgress, chapterNumber: number) {
  return progress.visitedChapterNumbers.includes(chapterNumber);
}

export function ReadingProgressPanel({
  progress,
  currentTitle,
  labels,
  onContinue,
  onReset,
  canUndo = false,
  onUndo,
  compact = false,
}: {
  progress: SunziReadingProgress;
  currentTitle?: string;
  labels: ReadingProgressLabels;
  onContinue?: () => void;
  onReset?: () => void;
  canUndo?: boolean;
  onUndo?: () => void;
  compact?: boolean;
}) {
  const current = progress.currentChapterNumber;
  const percent = readingPositionPercent(progress);
  const visited = progress.visitedChapterNumbers.length;

  function confirmReset() {
    if (!onReset) return;
    if (window.confirm(labels.resetConfirm)) onReset();
  }

  return (
    <section aria-label={labels.eyebrow} className={`border border-[#b9a98b] bg-[#f8f1e5] text-left ${compact ? "p-4" : "p-5 sm:p-6"}`}>
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center bg-[#26352b] text-[#fff8e9]"><BookMarked className="size-4" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8f3224]">{labels.eyebrow}</p>
          <p className={`serif mt-1 font-bold text-[#292c27] ${compact ? "text-base" : "text-lg"}`}>
            {current ? `${labels.currentPrefix}${currentTitle ?? SUNZI_CHAPTERS[current - 1]?.fullTitle ?? ""}` : labels.notStarted}
          </p>
        </div>
        {current && <span className="shrink-0 font-mono text-xs text-[#69645b]">{labels.positionLabel(current, SUNZI_CHAPTERS.length)}</span>}
      </div>

      <div className="mt-4 h-2 overflow-hidden bg-[#ddd1bb]" role="progressbar" aria-label={labels.eyebrow} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <div className="h-full bg-[#8f3224] transition-transform duration-300" style={{ transform: `translateX(${percent - 100}%)` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-[#777064]">
        <span>{labels.visitedLabel(visited, SUNZI_CHAPTERS.length)}</span>
        <span>{percent}%</span>
      </div>

      {(current && onContinue) || (visited > 0 && onReset) || (canUndo && onUndo) ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {current && onContinue && (
            <Button onClick={onContinue} size="sm" className="h-9 rounded-none bg-[#26352b] px-4 text-[#fff8e9] hover:bg-[#8f3224]">
              {labels.continueLabel}<ChevronRight className="size-3.5" />
            </Button>
          )}
          {visited > 0 && onReset && (
            <Button onClick={confirmReset} size="sm" variant="outline" className="h-9 rounded-none border-[#b9a98b] px-3 text-[#6f685e] hover:bg-[#e8ddca]">
              <RotateCcw className="size-3.5" />{labels.resetLabel}
            </Button>
          )}
          {canUndo && onUndo && (
            <Button onClick={onUndo} size="sm" variant="outline" className="h-9 rounded-none border-[#8f3224] px-3 font-semibold text-[#8f3224] hover:bg-[#ead8ca]">
              <RotateCcw className="size-3.5" />{labels.undoLabel}
            </Button>
          )}
        </div>
      ) : null}
    </section>
  );
}

export const ZH_READING_PROGRESS_LABELS: ReadingProgressLabels = {
  eyebrow: "閱讀進度",
  notStarted: "尚未開始閱讀",
  currentPrefix: "目前讀到：",
  positionLabel: (current, total) => `第 ${current}／${total} 篇`,
  visitedLabel: (visited, total) => `已瀏覽 ${visited}／${total} 篇`,
  continueLabel: "繼續閱讀",
  resetLabel: "重設進度",
  undoLabel: "復原進度",
  resetConfirm: "確定要清除《孫子兵法》的閱讀進度嗎？此操作不會刪除事件簿資料。",
};

export const LOCALIZED_READING_PROGRESS_LABELS: Record<SunziLocale, ReadingProgressLabels> = {
  en: { eyebrow: "Reading progress", notStarted: "Not started yet", currentPrefix: "Current: ", positionLabel: (current, total) => `Chapter ${current} of ${total}`, visitedLabel: (visited, total) => `${visited} of ${total} chapters visited`, continueLabel: "Continue reading", resetLabel: "Reset progress", undoLabel: "Undo reset", resetConfirm: "Clear your Art of War reading progress? This will not delete event notebook data." },
  ja: { eyebrow: "読書進捗", notStarted: "まだ読み始めていません", currentPrefix: "現在：", positionLabel: (current, total) => `第 ${current}／${total} 篇`, visitedLabel: (visited, total) => `${total}篇中${visited}篇を閲覧`, continueLabel: "続きを読む", resetLabel: "進捗をリセット", undoLabel: "進捗を復元", resetConfirm: "『孫子兵法』の読書進捗を消去しますか？事件簿のデータは削除されません。" },
  ko: { eyebrow: "읽기 진행률", notStarted: "아직 읽기 전입니다", currentPrefix: "현재: ", positionLabel: (current, total) => `${total}편 중 ${current}편`, visitedLabel: (visited, total) => `${total}편 중 ${visited}편 열람`, continueLabel: "계속 읽기", resetLabel: "진행률 초기화", undoLabel: "진행률 복원", resetConfirm: "손자병법 읽기 진행률을 지울까요? 사건 노트 데이터는 삭제되지 않습니다." },
  es: { eyebrow: "Progreso de lectura", notStarted: "Aún no ha comenzado", currentPrefix: "Actual: ", positionLabel: (current, total) => `Capítulo ${current} de ${total}`, visitedLabel: (visited, total) => `${visited} de ${total} capítulos visitados`, continueLabel: "Continuar leyendo", resetLabel: "Restablecer", undoLabel: "Deshacer", resetConfirm: "¿Borrar el progreso de lectura? Los datos del cuaderno de eventos no se eliminarán." },
  fr: { eyebrow: "Progression de lecture", notStarted: "Lecture non commencée", currentPrefix: "Actuel : ", positionLabel: (current, total) => `Chapitre ${current} sur ${total}`, visitedLabel: (visited, total) => `${visited} chapitres consultés sur ${total}`, continueLabel: "Continuer la lecture", resetLabel: "Réinitialiser", undoLabel: "Annuler", resetConfirm: "Effacer votre progression de lecture ? Les données du carnet d’événements ne seront pas supprimées." },
  de: { eyebrow: "Lesefortschritt", notStarted: "Noch nicht begonnen", currentPrefix: "Aktuell: ", positionLabel: (current, total) => `Kapitel ${current} von ${total}`, visitedLabel: (visited, total) => `${visited} von ${total} Kapiteln besucht`, continueLabel: "Weiterlesen", resetLabel: "Zurücksetzen", undoLabel: "Rückgängig", resetConfirm: "Lesefortschritt löschen? Daten im Ereignisnotizbuch werden nicht gelöscht." },
};
