import { SUNZI_CHAPTERS, type SunziChapter } from "./sunzi-data";
import { isSunziLocale, SUNZI_LOCALE_CONFIG, SUNZI_LOCALES, type SunziLocale } from "./sunzi-locales";
import { SUNZI_TRANSLATIONS } from "./sunzi-translations";

export const SUNZI_SITE_NAME = "孫子兵法十三篇線上讀本";
export const SUNZI_CANONICAL_ORIGIN = "https://sunziaow.manus.space";
export const HOME_TITLE = "孫子兵法十三篇線上讀本｜原文今譯、要義提點、全文搜尋、AI問答與Match Mapping事件簿｜繁體中文版";
export const HOME_DESCRIPTION = "《孫子兵法》十三篇線上讀本收錄固定版本原文、篇旨今譯與要義提點，提供跨篇全文搜尋、段落分享、語音朗讀及具篇名段號引用的AI問答；另設私人Match Mapping事件簿，可整理事件事實、目標、限制與風險，匹配相關兵法原則並保存版本及復盤紀錄，協助讀者核對原典、分析情勢與審慎決策及現代實務應用。";
export const HOME_KEYWORDS = ["孫子兵法", "孫子兵法原文", "孫子兵法十三篇", "兵法今譯", "Match Mapping", "兵法AI問答"];

export type SunziAlternate = { hreflang: string; path: string };

export type SunziHeadMeta = {
  title: string;
  description: string;
  keywords: string[];
  imagePath?: string;
  canonicalPath?: string;
  ogType?: "website" | "article";
  ogLocale?: string;
  htmlLang?: string;
  siteName?: string;
  imageAlt?: string;
  alternates?: SunziAlternate[];
  noindex?: boolean;
  notFound?: boolean;
  prevPath?: string;
  nextPath?: string;
};

export const SUNZI_OG_IMAGES: Record<string, string> = {
  home: "/manus-storage/og-home_027a9a00.png",
  "01-shiji": "/manus-storage/og-01-shiji_1b6678f2.png",
  "02-zuozhan": "/manus-storage/og-02-zuozhan_722de99b.png",
  "03-mougong": "/manus-storage/og-03-mougong_c6e27456.png",
  "04-junxing": "/manus-storage/og-04-junxing_93496deb.png",
  "05-bingshi": "/manus-storage/og-05-bingshi_e4f6656a.png",
  "06-xushi": "/manus-storage/og-06-xushi_9291f51c.png",
  "07-junzheng": "/manus-storage/og-07-junzheng_215b4d7b.png",
  "08-jiubian": "/manus-storage/og-08-jiubian_b4408991.png",
  "09-xingjun": "/manus-storage/og-09-xingjun_52a1fced.png",
  "10-dixing": "/manus-storage/og-10-dixing_ed5e1404.png",
  "11-jiudi": "/manus-storage/og-11-jiudi_f86aab9f.png",
  "12-huogong": "/manus-storage/og-12-huogong_b20ecb16.png",
  "13-yongjian": "/manus-storage/og-13-yongjian_49ab2e58.png",
};

export function chapterRouteSlug(chapter: SunziChapter) {
  return `${String(chapter.number).padStart(2, "0")}-${chapter.slug}`;
}

export function chapterPath(chapter: SunziChapter) {
  return `/chapters/${chapterRouteSlug(chapter)}`;
}

export function chapterSegmentPath(chapter: SunziChapter, segmentId: string) {
  return `${chapterPath(chapter)}#segment-${segmentId}`;
}

export function localizedHomePath(locale: SunziLocale) {
  return `/${locale}`;
}

export function localizedChapterPath(locale: SunziLocale, chapter: SunziChapter) {
  return `/${locale}/chapters/${chapterRouteSlug(chapter)}`;
}

export function localizedSegmentPath(locale: SunziLocale, chapter: SunziChapter, segmentId: string) {
  return `${localizedChapterPath(locale, chapter)}#segment-${segmentId}`;
}

export function findChapterByRouteSlug(routeSlug: string | undefined) {
  if (!routeSlug) return undefined;
  return SUNZI_CHAPTERS.find(chapter => chapterRouteSlug(chapter) === routeSlug);
}

function alternatePaths(chapter?: SunziChapter): SunziAlternate[] {
  const chinesePath = chapter ? chapterPath(chapter) : "/";
  return [
    { hreflang: "zh-Hant", path: chinesePath },
    ...SUNZI_LOCALES.map(locale => ({ hreflang: SUNZI_LOCALE_CONFIG[locale].hreflang, path: chapter ? localizedChapterPath(locale, chapter) : localizedHomePath(locale) })),
    { hreflang: "x-default", path: chinesePath },
  ];
}

function truncate(value: string, max: number) {
  const characters = Array.from(value.replace(/\s+/g, " ").trim());
  return characters.length <= max ? characters.join("") : `${characters.slice(0, max - 1).join("")}…`;
}

export function chapterSeo(chapter: SunziChapter): SunziHeadMeta {
  const title = `${chapter.fullTitle}｜孫子兵法原文、篇旨今譯、要義提點與AI問答｜十三篇線上讀本`;
  const description = truncate(
    `《孫子兵法》〈${chapter.title}〉${chapter.fullTitle}獨立閱讀頁，收錄固定修訂版原文、${chapter.segments.length}個段落、篇旨今譯與${chapter.points.length}則要義提點。${chapter.summary}`,
    155,
  );
  const index = SUNZI_CHAPTERS.findIndex(item => item.number === chapter.number);
  return {
    title,
    description,
    keywords: ["孫子兵法", chapter.title, `${chapter.title}原文`, "孫子兵法十三篇", "兵法今譯"],
    imagePath: SUNZI_OG_IMAGES[chapterRouteSlug(chapter)],
    imageAlt: `${chapter.fullTitle}｜孫子兵法分享圖片`,
    canonicalPath: chapterPath(chapter),
    ogType: "article",
    ogLocale: "zh_TW",
    htmlLang: "zh-Hant",
    siteName: SUNZI_SITE_NAME,
    alternates: alternatePaths(chapter),
    prevPath: index > 0 ? chapterPath(SUNZI_CHAPTERS[index - 1]) : undefined,
    nextPath: index < SUNZI_CHAPTERS.length - 1 ? chapterPath(SUNZI_CHAPTERS[index + 1]) : undefined,
  };
}

export function localizedHomeSeo(locale: SunziLocale): SunziHeadMeta {
  const config = SUNZI_LOCALE_CONFIG[locale];
  return {
    title: config.homeTitle,
    description: config.homeDescription,
    keywords: config.keywords,
    imagePath: SUNZI_OG_IMAGES.home,
    imageAlt: `${config.siteName} social sharing image`,
    canonicalPath: localizedHomePath(locale),
    ogType: "website",
    ogLocale: config.ogLocale,
    htmlLang: config.htmlLang,
    siteName: config.siteName,
    alternates: alternatePaths(),
  };
}

export function localizedChapterSeo(locale: SunziLocale, chapter: SunziChapter): SunziHeadMeta {
  const config = SUNZI_LOCALE_CONFIG[locale];
  const translation = SUNZI_TRANSLATIONS[locale][chapter.number - 1];
  const index = chapter.number - 1;
  return {
    title: translation.seoTitle,
    description: truncate(translation.seoDescription, 160),
    keywords: [config.ui.original, translation.chapterTitle, ...translation.tags].slice(0, 8),
    imagePath: SUNZI_OG_IMAGES[chapterRouteSlug(chapter)],
    imageAlt: `${translation.fullTitle} — ${config.siteName}`,
    canonicalPath: localizedChapterPath(locale, chapter),
    ogType: "article",
    ogLocale: config.ogLocale,
    htmlLang: config.htmlLang,
    siteName: config.siteName,
    alternates: alternatePaths(chapter),
    prevPath: index > 0 ? localizedChapterPath(locale, SUNZI_CHAPTERS[index - 1]) : undefined,
    nextPath: index < SUNZI_CHAPTERS.length - 1 ? localizedChapterPath(locale, SUNZI_CHAPTERS[index + 1]) : undefined,
  };
}

export function seoForPath(url: string): SunziHeadMeta {
  let pathOnly = url.split("?")[0].split("#")[0];
  try { pathOnly = decodeURI(pathOnly); } catch { /* match wouter's fail-safe behavior */ }
  const clean = pathOnly.replace(/\/+$/, "") || "/";

  if (clean === "/") {
    return {
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      keywords: HOME_KEYWORDS,
      imagePath: SUNZI_OG_IMAGES.home,
      imageAlt: `${SUNZI_SITE_NAME}分享圖片`,
      canonicalPath: "/",
      ogType: "website",
      ogLocale: "zh_TW",
      htmlLang: "zh-Hant",
      siteName: SUNZI_SITE_NAME,
      alternates: alternatePaths(),
    };
  }

  const localizedChapterMatch = clean.match(/^\/([^/]+)\/chapters\/([^/]+)$/i);
  if (localizedChapterMatch && isSunziLocale(localizedChapterMatch[1].toLowerCase())) {
    const locale = localizedChapterMatch[1].toLowerCase() as SunziLocale;
    const chapter = findChapterByRouteSlug(localizedChapterMatch[2].toLowerCase());
    if (chapter) return localizedChapterSeo(locale, chapter);
    return {
      title: `Page not found — ${SUNZI_LOCALE_CONFIG[locale].siteName}`,
      description: "The requested chapter does not exist.",
      keywords: SUNZI_LOCALE_CONFIG[locale].keywords,
      htmlLang: SUNZI_LOCALE_CONFIG[locale].htmlLang,
      ogLocale: SUNZI_LOCALE_CONFIG[locale].ogLocale,
      noindex: true,
      notFound: true,
    };
  }

  const localizedHomeMatch = clean.match(/^\/([^/]+)$/i);
  if (localizedHomeMatch && isSunziLocale(localizedHomeMatch[1].toLowerCase())) {
    return localizedHomeSeo(localizedHomeMatch[1].toLowerCase() as SunziLocale);
  }

  const chapterMatch = clean.match(/^\/chapters\/([^/]+)$/i);
  if (chapterMatch) {
    const chapter = findChapterByRouteSlug(chapterMatch[1].toLowerCase());
    if (chapter) return chapterSeo(chapter);
    return {
      title: `找不到篇章｜${SUNZI_SITE_NAME}`,
      description: "您所查找的《孫子兵法》篇章網址不存在，請返回十三篇目錄選擇正確篇章。",
      keywords: HOME_KEYWORDS,
      htmlLang: "zh-Hant",
      noindex: true,
      notFound: true,
    };
  }

  if (clean === "/events" || clean.startsWith("/events/")) {
    return {
      title: `私人 Match Mapping 事件簿｜${SUNZI_SITE_NAME}`,
      description: "登入後整理私人事件，對照《孫子兵法》原則並保存版本、分析與復盤紀錄。",
      keywords: HOME_KEYWORDS,
      htmlLang: "zh-Hant",
      noindex: true,
    };
  }

  return {
    title: `找不到頁面｜${SUNZI_SITE_NAME}`,
    description: "您所查找的頁面不存在，請返回《孫子兵法》十三篇線上讀本。",
    keywords: HOME_KEYWORDS,
    htmlLang: "zh-Hant",
    noindex: true,
    notFound: true,
  };
}

export const SUNZI_INDEXABLE_PATHS = [
  "/",
  ...SUNZI_CHAPTERS.map(chapterPath),
  ...SUNZI_LOCALES.flatMap(locale => [localizedHomePath(locale), ...SUNZI_CHAPTERS.map(chapter => localizedChapterPath(locale, chapter))]),
];
