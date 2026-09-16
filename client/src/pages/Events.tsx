import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { downloadElementAsPng } from "@/lib/event-export";
import { trpc } from "@/lib/trpc";
import { SUNZI_CHAPTERS } from "@shared/sunzi-data";
import { chapterSegmentPath } from "@shared/sunzi-seo";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  Clock3,
  Download,
  FileClock,
  Loader2,
  LockKeyhole,
  NotebookPen,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Scale,
  ShieldAlert,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";

type Stage = "proposed" | "active" | "pending" | "completed";
type Sensitivity = "normal" | "confidential" | "highly_confidential";
type Draft = {
  title: string;
  stage: Stage;
  sensitivity: Sensitivity;
  facts: string;
  goal: string;
  stakeholders: string;
  resources: string;
  constraints: string;
  knownRisks: string;
};

const EMPTY_DRAFT: Draft = {
  title: "",
  stage: "proposed",
  sensitivity: "confidential",
  facts: "",
  goal: "",
  stakeholders: "",
  resources: "",
  constraints: "",
  knownRisks: "",
};

const STAGES: Record<Stage, string> = {
  proposed: "擬議",
  active: "進行中",
  pending: "待決",
  completed: "已完成",
};

const SENSITIVITY: Record<Sensitivity, string> = {
  normal: "一般",
  confidential: "機密",
  highly_confidential: "高度機密",
};

const CONFIDENCE = {
  high: { label: "高", className: "border-[#47654f] bg-[#e4eee4] text-[#31533a]" },
  medium: { label: "中", className: "border-[#b28c3d] bg-[#f3ead0] text-[#72581f]" },
  low: { label: "低", className: "border-[#a86759] bg-[#f3e2dc] text-[#7b3c31]" },
} as const;

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EventShell({ children }: { children: React.ReactNode }) {
  return <DashboardLayout><div className="mx-auto max-w-6xl px-4 py-7 sm:px-7 sm:py-10">{children}</div></DashboardLayout>;
}

export default function Events() {
  const { user, loading } = useAuth();
  const params = useParams<{ id?: string }>();
  const [location] = useLocation();
  if (loading || !user) return <DashboardLayout><span /></DashboardLayout>;
  const id = Number(params.id);
  const isEdit = location.endsWith("/edit") && Number.isInteger(id);
  const isNew = location === "/events/new";
  if (isNew || isEdit) return <EventEditor eventId={isEdit ? id : undefined} />;
  if (Number.isInteger(id) && id > 0) return <EventDetail eventId={id} />;
  return <EventList />;
}

function EventList() {
  const [, navigate] = useLocation();
  const events = trpc.events.list.useQuery(undefined, { refetchOnWindowFocus: false });

  return (
    <EventShell>
      <header className="flex flex-col gap-6 border-b border-[#cdbf9f] pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.28em] text-[#8f3224]">PRIVATE DECISION JOURNAL</p>
          <h1 className="serif mt-3 text-4xl font-black tracking-[0.08em] sm:text-5xl">Match Mapping 事件簿</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#68645a]">將事件事實、目標、限制與未知分開記錄，再匹配《孫子兵法》十三篇的原則及固定段號。</p>
        </div>
        <Button onClick={() => navigate("/events/new")} className="h-11 rounded-none bg-[#8f3224] px-6 text-[#fff8ea] hover:bg-[#26352b]"><Plus className="size-4" />建立事件</Button>
      </header>

      <section className="mt-7 grid gap-4 md:grid-cols-3">
        <div className="border border-[#cdbf9f] bg-[#f8f1e4] p-5"><LockKeyhole className="size-4 text-[#8f3224]" /><b className="serif mt-3 block">預設私人</b><p className="mt-2 text-xs leading-6 text-[#716c61]">僅依登入帳戶載入，不進入公開搜尋。</p></div>
        <div className="border border-[#cdbf9f] bg-[#f8f1e4] p-5"><FileClock className="size-4 text-[#8f3224]" /><b className="serif mt-3 block">版本保留</b><p className="mt-2 text-xs leading-6 text-[#716c61]">每次修改建立新版本，不覆蓋當時資料。</p></div>
        <div className="border border-[#cdbf9f] bg-[#f8f1e4] p-5"><BookOpenText className="size-4 text-[#8f3224]" /><b className="serif mt-3 block">原典可追溯</b><p className="mt-2 text-xs leading-6 text-[#716c61]">所有匹配均可回到篇名、段號與固定底本。</p></div>
      </section>

      <section className="mt-8">
        {events.isLoading && <div className="grid place-items-center py-24 text-[#777064]"><Loader2 className="mb-3 size-6 animate-spin" />載入私人事件……</div>}
        {events.error && <ErrorBlock text={events.error.message} />}
        {events.data?.length === 0 && (
          <div className="border border-dashed border-[#b9a98b] bg-[#f8f1e4]/65 px-6 py-20 text-center">
            <NotebookPen className="mx-auto size-10 text-[#9a8a70]" />
            <h2 className="serif mt-5 text-2xl font-bold">尚未建立事件</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#706b61]">先記錄一項擬進事件。儲存後再決定是否啟動 AI Match Mapping。</p>
            <Button onClick={() => navigate("/events/new")} className="mt-7 rounded-none bg-[#26352b] text-[#fff8ea]"><Plus />建立第一項事件</Button>
          </div>
        )}
        {events.data && events.data.length > 0 && (
          <div className="divide-y divide-[#cdbf9f] border-y border-[#cdbf9f]">
            {events.data.map(event => (
              <button key={event.id} onClick={() => navigate(`/events/${event.id}`)} className="group grid w-full gap-4 bg-[#f8f1e4]/75 px-4 py-6 text-left hover:bg-[#eee1cc] sm:grid-cols-[1fr_auto] sm:px-6">
                <span>
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-none border border-[#9e8b68] bg-transparent text-[#5f594f]">{STAGES[event.stage]}</Badge>
                    <Badge className="rounded-none border border-[#b38b80] bg-transparent text-[#8f3224]">{SENSITIVITY[event.sensitivity]}</Badge>
                    <small className="text-[#8a8376]">第 {event.latestVersion?.version ?? 1} 版</small>
                  </span>
                  <b className="serif mt-3 block text-xl tracking-[0.06em] group-hover:text-[#8f3224]">{event.title}</b>
                  <span className="mt-2 line-clamp-2 block text-sm leading-6 text-[#6a665d]">{event.latestVersion?.goal}</span>
                </span>
                <span className="flex items-end justify-between gap-5 sm:flex-col sm:items-end">
                  <small className="text-[#8a8376]">更新於 {formatTime(event.updatedAt)}</small>
                  <span className={`flex items-center gap-2 text-xs ${event.latestAnalysis ? "text-[#31533a]" : "text-[#8f3224]"}`}>
                    {event.latestAnalysis ? <CheckCircle2 className="size-4" /> : <Clock3 className="size-4" />}{event.latestAnalysis ? "已有分析" : "尚未分析"}<ArrowRight className="size-4" />
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </EventShell>
  );
}

function EventEditor({ eventId }: { eventId?: number }) {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const input = useMemo(() => ({ id: eventId ?? 0 }), [eventId]);
  const detail = trpc.events.detail.useQuery(input, { enabled: Boolean(eventId), refetchOnWindowFocus: false });
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [hydratedId, setHydratedId] = useState<number | null>(null);
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);

  useEffect(() => {
    if (!eventId || !detail.data || hydratedId === eventId) return;
    const version = detail.data.versions[0];
    if (!version) return;
    setDraft({
      title: detail.data.title,
      stage: detail.data.stage,
      sensitivity: detail.data.sensitivity,
      facts: version.facts,
      goal: version.goal,
      stakeholders: version.stakeholders,
      resources: version.resources,
      constraints: version.constraints,
      knownRisks: version.knownRisks,
    });
    setHydratedId(eventId);
  }, [detail.data, eventId, hydratedId]);

  const create = trpc.events.create.useMutation({
    onSuccess: async ({ id }) => {
      await utils.events.list.invalidate();
      toast.success("事件已建立；尚未啟動 AI 分析");
      navigate(`/events/${id}`);
    },
    onError: error => toast.error(error.message),
  });
  const update = trpc.events.update.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.events.list.invalidate(), utils.events.detail.invalidate(input)]);
      toast.success("已建立新的事件版本");
      navigate(`/events/${eventId}`);
    },
    onError: error => toast.error(error.message),
  });

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft(current => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!privacyConfirmed) {
      toast.error("請先確認已移除不必要的識別資料");
      return;
    }
    if (eventId) update.mutate({ id: eventId, event: draft });
    else create.mutate(draft);
  }

  if (eventId && detail.isLoading) return <EventShell><LoadingBlock text="載入事件版本……" /></EventShell>;
  if (eventId && detail.error) return <EventShell><ErrorBlock text={detail.error.message} /></EventShell>;
  const pending = create.isPending || update.isPending;

  return (
    <EventShell>
      <button onClick={() => navigate(eventId ? `/events/${eventId}` : "/events")} className="flex items-center gap-2 text-sm text-[#8f3224] hover:underline"><ArrowLeft className="size-4" />{eventId ? "返回事件" : "返回事件簿"}</button>
      <header className="mt-7 border-b border-[#cdbf9f] pb-7">
        <p className="text-[10px] font-semibold tracking-[0.28em] text-[#8f3224]">{eventId ? "NEW VERSION" : "NEW EVENT"}</p>
        <h1 className="serif mt-3 text-4xl font-black tracking-[0.08em]">{eventId ? "編輯事件" : "建立擬進事件"}</h1>
        <p className="mt-3 text-sm leading-7 text-[#6b675e]">請將已知事實與推測分開。事件會先保存，只有按下「執行 Match Mapping」才會送交模型分析。</p>
      </header>

      <form onSubmit={submit} className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6 border border-[#cdbf9f] bg-[#fbf5e9] p-5 shadow-[0_18px_50px_rgba(70,52,28,.08)] sm:p-7">
          <Field label="事件名稱" required hint="用中性、可辨識的名稱描述事件。">
            <Input value={draft.title} onChange={e => set("title", e.target.value)} maxLength={160} required className="rounded-none border-[#c8b999] bg-[#fffaf0]" placeholder="例如：評估是否於第四季推出新服務" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="事件階段" required>
              <Select value={draft.stage} onValueChange={value => set("stage", value as Stage)}><SelectTrigger className="w-full rounded-none border-[#c8b999] bg-[#fffaf0]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="proposed">擬議</SelectItem><SelectItem value="active">進行中</SelectItem><SelectItem value="pending">待決</SelectItem><SelectItem value="completed">已完成</SelectItem></SelectContent></Select>
            </Field>
            <Field label="敏感度" required>
              <Select value={draft.sensitivity} onValueChange={value => set("sensitivity", value as Sensitivity)}><SelectTrigger className="w-full rounded-none border-[#c8b999] bg-[#fffaf0]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="normal">一般</SelectItem><SelectItem value="confidential">機密</SelectItem><SelectItem value="highly_confidential">高度機密</SelectItem></SelectContent></Select>
            </Field>
          </div>
          <Field label="已知事件事實" required hint="至少二十字。只寫可支持的事實；不確定內容請標為未知。">
            <Textarea value={draft.facts} onChange={e => set("facts", e.target.value)} maxLength={5000} required rows={7} className="rounded-none border-[#c8b999] bg-[#fffaf0] leading-7" placeholder="目前發生了什麼？有哪些已確認資料？" />
          </Field>
          <Field label="擬達成目標" required hint="說明何種結果才算達成，不要只寫「成功」。">
            <Textarea value={draft.goal} onChange={e => set("goal", e.target.value)} maxLength={2000} required rows={4} className="rounded-none border-[#c8b999] bg-[#fffaf0] leading-7" placeholder="希望在何時、以何種條件達成什麼結果？" />
          </Field>
          <Field label="利害關係人" hint="使用本方、他方與第三方等中性稱呼。">
            <Textarea value={draft.stakeholders} onChange={e => set("stakeholders", e.target.value)} maxLength={2000} rows={3} className="rounded-none border-[#c8b999] bg-[#fffaf0] leading-7" placeholder="誰會影響事件，誰會受結果影響？" />
          </Field>
          <Field label="可用資源" hint="包含資訊、時間、人力、預算、權限與可退出選項。">
            <Textarea value={draft.resources} onChange={e => set("resources", e.target.value)} maxLength={2000} rows={3} className="rounded-none border-[#c8b999] bg-[#fffaf0] leading-7" />
          </Field>
          <Field label="限制條件" hint="例如法律、契約、倫理、時程與組織限制。">
            <Textarea value={draft.constraints} onChange={e => set("constraints", e.target.value)} maxLength={2000} rows={3} className="rounded-none border-[#c8b999] bg-[#fffaf0] leading-7" />
          </Field>
          <Field label="已知風險" hint="先列出不可接受或難以回復的結果。">
            <Textarea value={draft.knownRisks} onChange={e => set("knownRisks", e.target.value)} maxLength={2000} rows={3} className="rounded-none border-[#c8b999] bg-[#fffaf0] leading-7" />
          </Field>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-7 lg:self-start">
          <section className="border border-[#cdbf9f] bg-[#e8decb] p-5">
            <ShieldAlert className="size-5 text-[#8f3224]" />
            <h2 className="serif mt-4 font-bold">儲存前確認</h2>
            <p className="mt-3 text-xs leading-6 text-[#666157]">請移除不必要的姓名、證號、案號、聯絡資料、帳密及可直接識別客戶或第三人的資訊。</p>
            <label className="mt-4 flex cursor-pointer items-start gap-3 border-t border-[#cdbf9f] pt-4 text-xs leading-6 text-[#55584f]">
              <input type="checkbox" required checked={privacyConfirmed} onChange={event => setPrivacyConfirmed(event.target.checked)} className="mt-1 accent-[#8f3224]" />
              <span>我已檢查並移除完成分析所不必要的識別資料。</span>
            </label>
          </section>
          {eventId && <section className="border-l-2 border-[#8f3224] pl-4 text-xs leading-6 text-[#6c685e]">儲存後會新增第 {(detail.data?.versions[0]?.version ?? 0) + 1} 版。既有分析與舊版本不會被覆蓋。</section>}
          <Button type="submit" disabled={pending || !privacyConfirmed} className="h-11 w-full rounded-none bg-[#26352b] text-[#fff8ea] hover:bg-[#8f3224]">{pending ? <Loader2 className="animate-spin" /> : <Save />}{eventId ? "儲存新版本" : "儲存事件"}</Button>
        </aside>
      </form>
    </EventShell>
  );
}

function EventDetail({ eventId }: { eventId: number }) {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const input = useMemo(() => ({ id: eventId }), [eventId]);
  const detail = trpc.events.detail.useQuery(input, { refetchOnWindowFocus: false });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<number | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [outcome, setOutcome] = useState({ actionTaken: "", outcome: "", reflection: "" });
  const [exporting, setExporting] = useState(false);
  const analysisExportRef = useRef<HTMLElement>(null);

  const analyze = trpc.events.analyze.useMutation({
    onSuccess: async () => {
      setSelectedAnalysisId(null);
      await Promise.all([utils.events.detail.invalidate(input), utils.events.list.invalidate()]);
      toast.success("Match Mapping 已完成並保存");
    },
    onError: error => toast.error(`分析未完成，事件資料仍已安全保存：${error.message}`),
  });
  const remove = trpc.events.delete.useMutation({
    onSuccess: async () => {
      await utils.events.list.invalidate();
      toast.success("事件及其歷程已刪除");
      navigate("/events");
    },
    onError: error => toast.error(error.message),
  });
  const addOutcome = trpc.events.addOutcome.useMutation({
    onSuccess: async () => {
      setOutcome({ actionTaken: "", outcome: "", reflection: "" });
      await utils.events.detail.invalidate(input);
      toast.success("復盤已保存");
    },
    onError: error => toast.error(error.message),
  });

  if (detail.isLoading) return <EventShell><LoadingBlock text="載入事件與歷程……" /></EventShell>;
  if (detail.error || !detail.data) return <EventShell><ErrorBlock text={detail.error?.message || "找不到事件"} /></EventShell>;
  const event = detail.data;
  const latest = event.versions[0];
  const displayVersion = event.versions.find(item => item.id === selectedVersionId) ?? latest;
  const analysis = event.analyses.find(item => item.id === selectedAnalysisId) ?? event.analyses[0];

  async function exportAnalysisImage() {
    if (!analysis || !analysisExportRef.current) return;
    setExporting(true);
    try {
      await downloadElementAsPng(analysisExportRef.current, `${event.title}-第${displayVersion?.version ?? "—"}版-Match-Mapping`);
      toast.success("分析結果已匯出為 PNG 圖片");
    } catch (error) {
      toast.error(error instanceof Error ? `匯出失敗：${error.message}` : "匯出失敗，請稍後再試");
    } finally {
      setExporting(false);
    }
  }

  return (
    <EventShell>
      <button onClick={() => navigate("/events")} className="flex items-center gap-2 text-sm text-[#8f3224] hover:underline"><ArrowLeft className="size-4" />返回事件簿</button>
      <header className="mt-7 grid gap-6 border-b border-[#cdbf9f] pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2"><Badge className="rounded-none bg-[#26352b] text-[#fff8ea]">{STAGES[event.stage]}</Badge><Badge className="rounded-none border border-[#a57468] bg-transparent text-[#8f3224]">{SENSITIVITY[event.sensitivity]}</Badge><small className="text-[#817a6e]">查看第 {displayVersion?.version} 版</small></div>
          <h1 className="serif mt-4 text-4xl font-black leading-tight tracking-[0.06em] sm:text-5xl">{event.title}</h1>
          <p className="mt-4 text-sm text-[#767064]">更新於 {formatTime(event.updatedAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {analysis && <Button variant="outline" onClick={exportAnalysisImage} disabled={exporting} className="rounded-none border-[#526650] text-[#405542]">{exporting ? <Loader2 className="animate-spin" /> : <Download />}匯出分析圖片</Button>}
          {analysis && <Button variant="outline" onClick={() => window.print()} className="rounded-none border-[#526650] text-[#405542]"><Printer />列印／另存 PDF</Button>}
          <Button variant="outline" onClick={() => navigate(`/events/${eventId}/edit`)} className="rounded-none border-[#a9997d]">編輯並建立新版本</Button>
          <Button onClick={() => analyze.mutate({ id: eventId })} disabled={analyze.isPending} className="rounded-none bg-[#8f3224] text-[#fff8ea] hover:bg-[#26352b]">{analyze.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}{analysis ? "重新執行 Mapping" : "執行 Match Mapping"}</Button>
        </div>
      </header>

      {analyze.isPending && (
        <section className="mt-7 border border-[#c7b38a] bg-[#f3ead4] p-6">
          <p className="flex items-center gap-3 font-medium text-[#5f4a21]"><Loader2 className="size-5 animate-spin" />正在比較六十四則兵法原則並驗證固定段號……</p>
          <p className="mt-2 text-xs leading-6 text-[#766a51]">請保持此頁開啟。若模型失敗，事件及目前版本不會遺失。</p>
        </section>
      )}

      <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-8">
          <section className="border border-[#cdbf9f] bg-[#fbf5e9] p-5 sm:p-7">
            <p className="text-[10px] font-semibold tracking-[0.25em] text-[#8f3224]">CURRENT VERSION</p>
            <DetailBlock title="擬達成目標" text={displayVersion?.goal} />
            <DetailBlock title="已知事件事實" text={displayVersion?.facts} />
            <DetailBlock title="利害關係人" text={displayVersion?.stakeholders} empty="未提供" />
            <DetailBlock title="可用資源" text={displayVersion?.resources} empty="未提供" />
            <DetailBlock title="限制條件" text={displayVersion?.constraints} empty="未提供" />
            <DetailBlock title="已知風險" text={displayVersion?.knownRisks} empty="未提供" />
          </section>

          {!analysis && !analyze.isPending && (
            <section className="border border-dashed border-[#b7a783] bg-[#f8f1e4]/65 px-6 py-14 text-center">
              <Scale className="mx-auto size-9 text-[#907e60]" />
              <h2 className="serif mt-4 text-2xl font-bold">事件已保存，尚未分析</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#716c61]">啟動後，gpt-5 會從本站六十四則要義中選出三至五個最相關原則。伺服器會驗證段號並以固定底本填入原文。</p>
              <Button onClick={() => analyze.mutate({ id: eventId })} className="mt-6 rounded-none bg-[#8f3224] text-[#fff8ea]"><Sparkles />執行 Match Mapping</Button>
            </section>
          )}

          {analysis && (
            <section ref={analysisExportRef} className="analysis-export-surface bg-[#f1eadc] p-1 sm:p-3">
              <div className="mb-5 border-l-4 border-[#8f3224] bg-[#fbf5e9] px-5 py-4"><p className="text-[10px] font-semibold tracking-[0.2em] text-[#8f3224]">《孫子兵法》MATCH MAPPING 事件簿</p><h2 className="serif mt-2 text-2xl font-black">{event.title}</h2><p className="mt-2 text-xs text-[#777064]">第 {event.versions.find(version => version.id === analysis.eventVersionId)?.version ?? "—"} 版 · {formatTime(analysis.createdAt)}</p></div>
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#cdbf9f] pb-5">
                <div><p className="text-[10px] font-semibold tracking-[0.25em] text-[#8f3224]">MATCH MAPPING</p><h2 className="serif mt-2 text-3xl font-black tracking-[0.06em]">兵法匹配解析</h2></div>
                <small className="text-[#777064]">第 {event.versions.find(version => version.id === analysis.eventVersionId)?.version ?? "—"} 版 · {formatTime(analysis.createdAt)}</small>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <AnalysisPanel title="情勢摘要" icon={<NotebookPen />}><p>{analysis.situationSummary}</p></AnalysisPanel>
                <AnalysisPanel title="主要目標" icon={<Target />}><p>{analysis.objective}</p></AnalysisPanel>
                <AnalysisPanel title="待查證未知" icon={<Clock3 />}><List items={analysis.unknowns} /></AnalysisPanel>
                <AnalysisPanel title="利益與代價" icon={<Scale />}><List items={analysis.interests} /></AnalysisPanel>
                <AnalysisPanel title="主要風險" icon={<AlertTriangle />}><List items={analysis.risks} /></AnalysisPanel>
                <AnalysisPanel title="分析界線" icon={<ShieldAlert />}><p>{analysis.caution}</p></AnalysisPanel>
              </div>

              <div className="mt-8 space-y-5">
                {analysis.matches.map(match => {
                  const confidence = CONFIDENCE[match.confidence];
                  return (
                    <article key={match.id} className="border border-[#c8b997] bg-[#fbf5e9] shadow-[0_14px_36px_rgba(68,48,25,.07)]">
                      <header className="flex flex-col gap-4 border-b border-[#d4c6aa] bg-[#26352b] px-5 py-5 text-[#fff6e4] sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4"><span className="serif text-3xl text-[#d7ba69]">{String(match.rank).padStart(2, "0")}</span><span><small className="block text-[#c9c2b3]">〈{chapterTitle(match.chapterNumber)}〉{match.segmentId}</small><b className="serif mt-1 block text-xl tracking-[0.08em]">{match.principle}</b></span></div>
                        <Badge className={`rounded-none ${confidence.className}`}>匹配信心：{confidence.label}</Badge>
                      </header>
                      <div className="p-5 sm:p-7">
                        <blockquote className="serif border-l-2 border-[#8f3224] pl-5 text-lg leading-9 text-[#3f403a]">{match.quote}<footer className="mt-2 font-sans text-[10px] tracking-wider text-[#8f3224]">固定底本 · 〈{chapterTitle(match.chapterNumber)}〉{match.segmentId}</footer></blockquote>
                        <div className="mt-6 grid gap-5 sm:grid-cols-2">
                          <DetailBlock title="匹配理由" text={match.reason} />
                          <DetailBlock title="現代應用" text={match.application} />
                          <DetailBlock title="不適用界線" text={match.limits} />
                          <DetailBlock title="待補資料" text={match.missingInfo} empty="目前未另列" />
                        </div>
                        <a href={chapterSegmentPath(SUNZI_CHAPTERS[match.chapterNumber - 1], match.segmentId)} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#8f3224] hover:underline"><BookOpenText className="size-4" />回看原文固定段落</a>
                      </div>
                    </article>
                  );
                })}
              </div>
              <p className="mt-5 border-l-2 border-[#8f3224] pl-4 text-xs leading-6 text-[#6e695f]">模型：{analysis.model} · 提示詞：{analysis.promptVersion} · 原文底本：oldid {analysis.sourceOldid}。匹配信心不是成功率。</p>
            </section>
          )}

          <section className="border-t border-[#cdbf9f] pt-7">
            <p className="text-[10px] font-semibold tracking-[0.25em] text-[#8f3224]">AFTER ACTION REVIEW</p>
            <h2 className="serif mt-2 text-2xl font-bold">事件復盤</h2>
            <form onSubmit={e => { e.preventDefault(); addOutcome.mutate({ id: eventId, ...outcome }); }} className="mt-5 grid gap-4 border border-[#cdbf9f] bg-[#fbf5e9] p-5">
              <Field label="實際採取行動"><Textarea required value={outcome.actionTaken} onChange={e => setOutcome(current => ({ ...current, actionTaken: e.target.value }))} className="rounded-none border-[#c8b999] bg-[#fffaf0]" rows={3} /></Field>
              <Field label="實際結果"><Textarea required value={outcome.outcome} onChange={e => setOutcome(current => ({ ...current, outcome: e.target.value }))} className="rounded-none border-[#c8b999] bg-[#fffaf0]" rows={3} /></Field>
              <Field label="復盤與下次修正"><Textarea required value={outcome.reflection} onChange={e => setOutcome(current => ({ ...current, reflection: e.target.value }))} className="rounded-none border-[#c8b999] bg-[#fffaf0]" rows={3} /></Field>
              <Button disabled={addOutcome.isPending} className="justify-self-start rounded-none bg-[#26352b] text-[#fff8ea]">{addOutcome.isPending ? <Loader2 className="animate-spin" /> : <Save />}保存復盤</Button>
            </form>
            {event.outcomes.length > 0 && <div className="mt-5 space-y-3">{event.outcomes.map(item => <article key={item.id} className="border-l-2 border-[#a07a3f] bg-[#f3ead9] px-5 py-4 text-sm leading-7"><small className="text-[#817a6e]">{formatTime(item.recordedAt)}</small><p className="mt-2"><b>行動：</b>{item.actionTaken}</p><p><b>結果：</b>{item.outcome}</p><p><b>修正：</b>{item.reflection}</p></article>)}</div>}
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-7 lg:self-start">
          <section className="border border-[#cdbf9f] bg-[#e8decb] p-5">
            <p className="text-[10px] tracking-[0.23em] text-[#8f3224]">歷史版本</p>
            <div className="mt-4 space-y-2">{event.versions.map(version => <button type="button" onClick={() => setSelectedVersionId(version.id)} key={version.id} className={`flex w-full items-center justify-between border-b border-[#cdbf9f] px-2 py-3 text-left text-sm ${displayVersion?.id === version.id ? "bg-[#26352b] text-[#fff8ea]" : "hover:bg-[#dfd2bd]"}`}><span>第 {version.version} 版</span><small className={displayVersion?.id === version.id ? "text-[#c8c2b1]" : "text-[#797268]"}>{formatTime(version.createdAt)}</small></button>)}</div>
          </section>
          {event.analyses.length > 1 && <section className="border border-[#cdbf9f] bg-[#f8f1e4] p-5"><p className="text-[10px] tracking-[0.23em] text-[#8f3224]">分析歷程</p><div className="mt-4 space-y-2">{event.analyses.map((item, index) => <button type="button" onClick={() => setSelectedAnalysisId(item.id)} key={item.id} className={`w-full border-b border-[#d7cab1] px-2 py-3 text-left text-sm ${analysis?.id === item.id ? "bg-[#26352b] text-[#fff8ea]" : "hover:bg-[#e9deca]"}`}><b>{index === 0 ? "目前結果" : `過往分析 ${index}`}</b><small className={`mt-1 block ${analysis?.id === item.id ? "text-[#c8c2b1]" : "text-[#797268]"}`}>第 {event.versions.find(version => version.id === item.eventVersionId)?.version ?? "—"} 版 · {formatTime(item.createdAt)}</small></button>)}</div><p className="mt-3 text-[11px] leading-5 text-[#777064]">點選任一紀錄即可完整查看當時解析與匹配。</p></section>}
          <section className="border border-[#cdbf9f] bg-[#f8f1e4] p-5 text-xs leading-6 text-[#6c685e]"><ShieldAlert className="mb-3 size-4 text-[#8f3224]" />Match Mapping 是決策檢查工具，不是法律、醫療、財務或僱用意見，也不預測勝負。</section>
          <section className="border border-[#c8a29a] bg-[#f4e4df] p-5">
            <button onClick={() => setConfirmDelete(value => !value)} className="flex items-center gap-2 text-sm font-semibold text-[#8f3224]"><Trash2 className="size-4" />刪除私人事件</button>
            {confirmDelete && <div className="mt-4 border-t border-[#d4b5ad] pt-4 text-xs leading-6 text-[#6d4a43]"><p>將永久刪除事件、所有版本、分析、匹配及復盤，無法復原。</p><div className="mt-3 flex gap-2"><Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)} className="rounded-none">取消</Button><Button size="sm" disabled={remove.isPending} onClick={() => remove.mutate({ id: eventId })} className="rounded-none bg-[#8f3224] text-white">確認刪除</Button></div></div>}
          </section>
        </aside>
      </div>
    </EventShell>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return <div><Label className="serif text-base font-bold tracking-[0.05em]">{label}{required && <span className="ml-1 text-[#8f3224]">＊</span>}</Label>{hint && <p className="mt-1 text-[11px] leading-5 text-[#817a6d]">{hint}</p>}<div className="mt-2">{children}</div></div>;
}

function DetailBlock({ title, text, empty = "—" }: { title: string; text?: string | null; empty?: string }) {
  return <div className="mt-5 first:mt-0"><h3 className="text-xs font-semibold tracking-[0.15em] text-[#8f3224]">{title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#4f514a]">{text?.trim() || empty}</p></div>;
}

function AnalysisPanel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <article className="border border-[#cdbf9f] bg-[#f8f1e4] p-5"><div className="flex items-center gap-2 text-[#8f3224]">{icon}<h3 className="serif font-bold tracking-[0.06em]">{title}</h3></div><div className="mt-3 text-sm leading-7 text-[#55574f]">{children}</div></article>;
}

function List({ items }: { items: string[] }) {
  return <ul className="space-y-2">{items.map((item, index) => <li key={`${item}-${index}`} className="grid grid-cols-[16px_1fr] gap-2"><span className="text-[#a37a38]">・</span><span>{item}</span></li>)}</ul>;
}

function LoadingBlock({ text }: { text: string }) {
  return <div className="grid place-items-center py-28 text-sm text-[#777064]"><Loader2 className="mb-4 size-7 animate-spin" />{text}</div>;
}

function ErrorBlock({ text }: { text: string }) {
  return <div className="border border-[#c8a29a] bg-[#f4e4df] p-6 text-sm leading-7 text-[#7b3e34]"><AlertTriangle className="mb-3 size-5" />{text}</div>;
}

function chapterTitle(number: number) {
  return ["始計", "作戰", "謀攻", "軍形", "兵勢", "虛實", "軍爭", "九變", "行軍", "地形", "九地", "火攻", "用間"][number - 1] || `第${number}篇`;
}
