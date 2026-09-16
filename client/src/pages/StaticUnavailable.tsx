import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { FULL_APP_ORIGIN, joinBasePath } from "@/lib/runtime";
import { ArrowLeft, ExternalLink, LockKeyhole } from "lucide-react";

export default function StaticUnavailable() {
  return (
    <main className="paper-texture grid min-h-screen place-items-center bg-[#eee4d1] px-5 py-12 text-[#20241f]">
      <section className="w-full max-w-2xl border border-[#c3b291] bg-[#fbf5e8] p-7 text-center shadow-[0_24px_70px_rgba(67,48,28,.12)] sm:p-11">
        <BrandMark size="lg" className="mx-auto" />
        <p className="mt-7 text-xs font-semibold tracking-[0.28em] text-[#8f3224]">GITHUB PAGES OPEN-SOURCE MIRROR</p>
        <h1 className="serif mt-4 text-4xl font-black tracking-[0.08em]">私人事件簿請使用完整站</h1>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-8 text-[#69665d]">
          GitHub Pages 是純靜態公開版本，不保存私人事件，也不呼叫 AI 或登入服務。閱讀、全文搜尋、多語內容、閱讀進度與個人化時間估算仍可在此版本使用。
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild className="rounded-none bg-[#26352b] text-[#fff8ea]">
            <a href={`${FULL_APP_ORIGIN}/events`}><LockKeyhole className="size-4" />開啟完整事件簿<ExternalLink className="size-4" /></a>
          </Button>
          <Button asChild variant="outline" className="rounded-none border-[#b9aa91]">
            <a href={joinBasePath("/")}><ArrowLeft className="size-4" />返回讀本</a>
          </Button>
        </div>
      </section>
    </main>
  );
}
