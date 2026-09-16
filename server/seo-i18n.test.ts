import { describe, expect, it } from "vitest";
import { SUNZI_CHAPTERS } from "../shared/sunzi-data";
import { SUNZI_LOCALE_CONFIG, SUNZI_LOCALES } from "../shared/sunzi-locales";
import {
  localizedChapterPath,
  localizedChapterSeo,
  localizedHomePath,
  localizedHomeSeo,
  seoForPath,
} from "../shared/sunzi-seo";
import { SUNZI_TRANSLATION_META, SUNZI_TRANSLATIONS } from "../shared/sunzi-translations";
import { buildHeadTags, composeHtml } from "./_core/vite";

const characters = (value: string) => Array.from(value).length;

describe("static multilingual corpus", () => {
  it("contains all 78 translated chapters and preserves source anchors", () => {
    expect(SUNZI_TRANSLATION_META.model).toBe("gpt-5-mini");
    expect(SUNZI_TRANSLATION_META.sourceOldid).toBe("7906064");
    for (const locale of SUNZI_LOCALES) {
      const translations = SUNZI_TRANSLATIONS[locale];
      expect(translations).toHaveLength(13);
      translations.forEach((translation, index) => {
        const chapter = SUNZI_CHAPTERS[index];
        expect(translation.chapterNumber).toBe(chapter.number);
        expect(translation.segments.map(item => item.id)).toEqual(chapter.segments.map(item => item.id));
        expect(translation.points.map(item => item.segmentId)).toEqual(chapter.points.map(item => item.segmentId));
        expect(translation.segments.every(item => item.text.trim().length > 0)).toBe(true);
        expect(translation.points.every(item => item.title.trim().length > 0 && item.body.trim().length > 0)).toBe(true);
        expect(characters(translation.seoTitle)).toBeLessThanOrEqual(70);
        expect(characters(translation.seoDescription)).toBeGreaterThanOrEqual(50);
        expect(characters(translation.seoDescription)).toBeLessThanOrEqual(160);
      });
    }
  });

  it("preserves the critical meanings of one-in-ten arrival and feigned retreat in chapter 7", () => {
    const expected = {
      en: ["one in ten", "feigned retreat"],
      ja: ["十人に一人", "偽りの退却"],
      ko: ["열 명 중 한 명", "거짓 퇴각"],
      es: ["uno de cada diez", "retirada fingida"],
      fr: ["un homme sur dix", "retraite simulée"],
      de: ["einer von zehn", "vorgetäuschten Rückzug"],
    } as const;
    for (const locale of SUNZI_LOCALES) {
      const chapter = SUNZI_TRANSLATIONS[locale][6];
      const march = chapter.segments.find(item => item.id === "07-02")?.text ?? "";
      const cautions = chapter.segments.find(item => item.id === "07-06")?.text ?? "";
      expect(march).toContain(expected[locale][0]);
      expect(cautions).toContain(expected[locale][1]);
    }
  });
});

describe("multilingual routes and hreflang", () => {
  it("builds six locale homes and 78 unique locale chapter URLs", () => {
    const paths = SUNZI_LOCALES.flatMap(locale => [localizedHomePath(locale), ...SUNZI_CHAPTERS.map(chapter => localizedChapterPath(locale, chapter))]);
    expect(paths).toHaveLength(84);
    expect(new Set(paths).size).toBe(84);
    expect(paths).toContain("/en/chapters/01-shiji");
    expect(paths).toContain("/de/chapters/13-yongjian");
  });

  it("gives every localized page a self-canonical and reciprocal eight-link alternate set", () => {
    for (const locale of SUNZI_LOCALES) {
      const home = localizedHomeSeo(locale);
      expect(home.canonicalPath).toBe(localizedHomePath(locale));
      expect(home.htmlLang).toBe(SUNZI_LOCALE_CONFIG[locale].htmlLang);
      expect(home.ogLocale).toBe(SUNZI_LOCALE_CONFIG[locale].ogLocale);
      expect(home.alternates).toHaveLength(8);
      expect(new Set(home.alternates!.map(item => item.hreflang))).toEqual(new Set(["zh-Hant", "en", "ja", "ko", "es", "fr", "de", "x-default"]));
      for (const chapter of SUNZI_CHAPTERS) {
        const head = localizedChapterSeo(locale, chapter);
        expect(head.canonicalPath).toBe(localizedChapterPath(locale, chapter));
        expect(head.alternates).toHaveLength(8);
        expect(head.alternates).toContainEqual({ hreflang: locale, path: localizedChapterPath(locale, chapter) });
        expect(head.alternates).toContainEqual({ hreflang: "x-default", path: `/chapters/${String(chapter.number).padStart(2, "0")}-${chapter.slug}` });
        expect(seoForPath(localizedChapterPath(locale, chapter))).toEqual(head);
      }
    }
  });

  it("renders locale, alternates and html lang in raw SSR head", () => {
    const head = localizedChapterSeo("en", SUNZI_CHAPTERS[0]);
    const tags = buildHeadTags(head);
    expect((tags.match(/rel="alternate"/g) ?? [])).toHaveLength(8);
    expect(tags).toContain('hreflang="x-default"');
    expect(tags).toContain('property="og:locale" content="en_US"');
    expect(tags).toContain('"inLanguage":"en"');
    const html = composeHtml('<html lang="<!--app-lang-->"><head><!--app-head--></head><body><div><!--app-html--></div></body></html>', "English body", head, {});
    expect(html).toContain('<html lang="en">');
    expect(html).not.toContain("<!--app-lang-->");
  });

  it("returns a noindex 404 for unknown localized chapter slugs", () => {
    const missing = seoForPath("/en/chapters/99-missing");
    expect(missing.notFound).toBe(true);
    expect(missing.noindex).toBe(true);
    expect(missing.htmlLang).toBe("en");
  });
});
