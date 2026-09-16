import { seoForPath, SUNZI_CANONICAL_ORIGIN, SUNZI_SITE_NAME } from "@shared/sunzi-seo";
import { useEffect } from "react";
import { useLocation } from "wouter";

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => element!.setAttribute(key, value));
}

function upsertLink(rel: string, href?: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]:not([data-sunzi-i18n])`);
  if (!href) {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement("link");
    element.rel = rel;
    document.head.appendChild(element);
  }
  element.href = href;
}

function syncAlternates(alternates: ReturnType<typeof seoForPath>["alternates"]) {
  document.head.querySelectorAll("link[data-sunzi-i18n]").forEach(element => element.remove());
  alternates?.forEach(alternate => {
    const element = document.createElement("link");
    element.rel = "alternate";
    element.hreflang = alternate.hreflang;
    element.href = `${SUNZI_CANONICAL_ORIGIN}${alternate.path}`;
    element.dataset.sunziI18n = "true";
    document.head.appendChild(element);
  });
}

export function Head() {
  const [location] = useLocation();

  useEffect(() => {
    const head = seoForPath(location);
    const canonical = head.canonicalPath ? `${SUNZI_CANONICAL_ORIGIN}${head.canonicalPath}` : undefined;
    const image = head.imagePath ? `${SUNZI_CANONICAL_ORIGIN}${head.imagePath}` : undefined;
    const imageAlt = head.imageAlt ?? `${head.title} 分享圖片`;
    document.documentElement.lang = head.htmlLang ?? "zh-Hant";
    document.title = head.title;
    upsertMeta('meta[name="description"]', { name: "description", content: head.description });
    upsertMeta('meta[name="keywords"]', { name: "keywords", content: head.keywords.join(",") });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: head.ogType ?? "website" });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: head.title });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: head.description });
    upsertMeta('meta[property="og:site_name"]', { property: "og:site_name", content: head.siteName ?? SUNZI_SITE_NAME });
    upsertMeta('meta[property="og:locale"]', { property: "og:locale", content: head.ogLocale ?? "zh_TW" });
    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: image ? "summary_large_image" : "summary" });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: head.title });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: head.description });
    if (image) {
      upsertMeta('meta[property="og:image"]', { property: "og:image", content: image });
      upsertMeta('meta[property="og:image:width"]', { property: "og:image:width", content: "1200" });
      upsertMeta('meta[property="og:image:height"]', { property: "og:image:height", content: "630" });
      upsertMeta('meta[property="og:image:alt"]', { property: "og:image:alt", content: imageAlt });
      upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: image });
      upsertMeta('meta[name="twitter:image:alt"]', { name: "twitter:image:alt", content: imageAlt });
    } else {
      ['meta[property="og:image"]', 'meta[property="og:image:width"]', 'meta[property="og:image:height"]', 'meta[property="og:image:alt"]', 'meta[name="twitter:image"]', 'meta[name="twitter:image:alt"]'].forEach(selector => document.head.querySelector(selector)?.remove());
    }
    if (canonical) upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonical });
    else document.head.querySelector('meta[property="og:url"]')?.remove();
    if (head.noindex || head.notFound) upsertMeta('meta[name="robots"]', { name: "robots", content: "noindex, follow" });
    else document.head.querySelector('meta[name="robots"]')?.remove();
    upsertLink("canonical", canonical);
    upsertLink("prev", head.prevPath ? `${SUNZI_CANONICAL_ORIGIN}${head.prevPath}` : undefined);
    upsertLink("next", head.nextPath ? `${SUNZI_CANONICAL_ORIGIN}${head.nextPath}` : undefined);
    syncAlternates(head.alternates);
  }, [location]);

  return null;
}
