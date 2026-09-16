import { Loader2 } from "lucide-react";

export function DashboardLayoutSkeleton() {
  return (
    <div className="flex min-h-screen bg-[#eee5d5] text-[#20241f]">
      <aside className="hidden w-[260px] shrink-0 border-r border-[#c6b794] bg-[#26352b] p-5 text-[#fff5df] md:block">
        <div className="h-2 w-20 animate-pulse bg-[#d6b85f]/60" />
        <div className="mt-4 h-6 w-40 animate-pulse bg-[#fff5df]/25" />
        <div className="mt-10 space-y-3"><div className="h-11 animate-pulse bg-[#fff5df]/10" /><div className="h-11 animate-pulse bg-[#fff5df]/10" /></div>
      </aside>
      <main className="paper-texture flex min-h-screen flex-1 items-center justify-center px-5">
        <div className="border border-[#cdbf9f] bg-[#f8f1e4] px-8 py-7 text-center shadow-[0_18px_48px_rgba(70,52,28,.08)]">
          <Loader2 className="mx-auto size-6 animate-spin text-[#8f3224]" />
          <p className="serif mt-4 font-bold tracking-[0.08em]">確認私人事件簿權限</p>
        </div>
      </main>
    </div>
  );
}
