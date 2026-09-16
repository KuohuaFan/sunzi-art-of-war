import { joinBasePath } from "@/lib/runtime";

export function BrandMark({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const dimensions = size === "sm" ? "size-8" : size === "lg" ? "size-20 sm:size-24" : "size-12";
  return (
    <img
      src={joinBasePath("/brand/sunzi-logo-512.png")}
      alt="孫子兵法專案 Logo"
      width={size === "sm" ? 32 : size === "lg" ? 96 : 48}
      height={size === "sm" ? 32 : size === "lg" ? 96 : 48}
      className={`${dimensions} shrink-0 rounded-full object-cover shadow-[0_8px_24px_rgba(73,38,154,.2)] ${className}`}
    />
  );
}
