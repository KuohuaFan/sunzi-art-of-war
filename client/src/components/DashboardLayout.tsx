import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { joinBasePath } from "@/lib/runtime";
import { BookOpenText, ChevronDown, LockKeyhole, LogOut, NotebookPen, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { BrandMark } from "./BrandMark";

const menuItems = [
  { icon: NotebookPen, label: "事件簿", path: "/events" },
  { icon: BookOpenText, label: "返回十三篇", path: "/" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <main className="paper-texture min-h-screen bg-[#eee4d1] px-5 py-12 text-[#20241f]">
        <div className="mx-auto grid min-h-[calc(100vh-6rem)] max-w-5xl items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
          <section>
            <a href={joinBasePath("/")} className="inline-flex items-center gap-2 serif text-sm font-bold tracking-[0.16em] text-[#8f3224]"><BrandMark size="sm" />← 返回《孫子兵法》讀本</a>
            <p className="mt-14 text-xs font-semibold tracking-[0.35em] text-[#8f3224]">私人決策紀錄</p>
            <h1 className="serif mt-4 text-5xl font-black leading-tight tracking-[0.08em] sm:text-6xl">Match Mapping<br />事件簿</h1>
            <p className="serif mt-7 max-w-xl text-lg leading-9 text-[#59594f]">
              將擬進事件整理為目標、條件與未知，再對照《孫子兵法》十三篇的原則與固定段號。分析供決策檢查，不是勝率預測。
            </p>
          </section>
          <section className="border border-[#c3b291] bg-[#fbf5e8] p-7 shadow-[0_24px_70px_rgba(67,48,28,.12)] sm:p-10">
            <div className="grid size-12 place-items-center bg-[#26352b] text-[#f8ecd5]"><LockKeyhole className="size-5" /></div>
            <h2 className="serif mt-7 text-2xl font-bold tracking-[0.08em]">登入後建立私人事件</h2>
            <p className="mt-4 text-sm leading-7 text-[#69665d]">事件、歷史版本、分析及復盤只依您的帳戶載入。請先刪除不必要的姓名、證號、案號及聯絡資料。</p>
            <div className="mt-6 space-y-3 border-y border-[#d5c7ac] py-5 text-sm text-[#55584f]">
              <p className="flex gap-3"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#8f3224]" />預設私人，不進入公開搜尋</p>
              <p className="flex gap-3"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#8f3224]" />原文引句由固定底本逐字填入</p>
              <p className="flex gap-3"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#8f3224]" />法律、醫療、財務等重大事項仍須專業覆核</p>
            </div>
            <Button onClick={() => startLogin("/events")} className="mt-7 h-11 w-full rounded-none bg-[#8f3224] tracking-[0.16em] text-[#fff8ea] hover:bg-[#26352b]">
              登入並進入事件簿
            </Button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": "260px" } as React.CSSProperties}>
      <Sidebar collapsible="offcanvas" className="border-r border-[#c6b794]">
        <SidebarHeader className="border-b border-[#c6b794] bg-[#26352b] p-5 text-[#fff5df]">
          <div className="flex items-center gap-3"><BrandMark size="sm" /><p className="text-[10px] tracking-[0.25em] text-[#d6b85f]">孫子兵法</p></div>
          <p className="serif mt-2 text-xl font-bold tracking-[0.08em]">Match Mapping</p>
          <p className="mt-1 text-xs text-[#c8c2b1]">私人事件簿</p>
        </SidebarHeader>
        <SidebarContent className="bg-[#efe5d3] p-3">
          <SidebarMenu>
            {menuItems.map(item => {
              const active = item.path === "/events" ? location.startsWith("/events") : location === item.path;
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={active}
                    onClick={() => setLocation(item.path)}
                    tooltip={item.label}
                    className="h-11 rounded-none px-3 data-[active=true]:bg-[#8f3224] data-[active=true]:text-[#fff8ea]"
                  >
                    <item.icon className="size-4" /><span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
          <div className="mt-5 border-l-2 border-[#8f3224] px-3 text-xs leading-6 text-[#6d685e]">
            「信心」只表示事件資料與兵法原則的匹配充分度，不表示成功率。
          </div>
        </SidebarContent>
        <SidebarFooter className="border-t border-[#c6b794] bg-[#e6dac4] p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 p-2 text-left hover:bg-[#d9cbb3]">
                <Avatar className="size-9 border border-[#aa9879]"><AvatarFallback>{user.name?.charAt(0) || "用"}</AvatarFallback></Avatar>
                <span className="min-w-0 flex-1"><b className="block truncate text-sm">{user.name || "使用者"}</b><small className="block truncate text-[#777064]">私人事件</small></span>
                <ChevronDown className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => logout()} className="cursor-pointer"><LogOut className="mr-2 size-4" />登出</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-[#eee5d5]">
        {isMobile && (
          <header className="sticky top-0 z-40 flex h-14 items-center border-b border-[#c6b794] bg-[#f3eadb]/95 px-3 backdrop-blur">
            <SidebarTrigger className="rounded-none" />
            <BrandMark size="sm" className="ml-2" /><span className="serif ml-2 font-bold tracking-[0.08em]">Match Mapping 事件簿</span>
          </header>
        )}
        <main className="min-h-screen paper-texture">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
