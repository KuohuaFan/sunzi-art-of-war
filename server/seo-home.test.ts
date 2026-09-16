import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SUNZI_CHAPTERS } from "../shared/sunzi-data";
import {
  HOME_DESCRIPTION,
  HOME_KEYWORDS,
  HOME_TITLE,
  SUNZI_CANONICAL_ORIGIN,
  SUNZI_INDEXABLE_PATHS,
  SUNZI_OG_IMAGES,
  chapterPath,
  chapterSeo,
  chapterRouteSlug,
  seoForPath,
} from "../shared/sunzi-seo";
import { buildRobotsTxt, buildSitemapXml } from "./_core/seoRoutes";

function characters(value: string) {
  return Array.from(value).length;
}

describe("root page SEO limits", () => {
  it("keeps the home title, description and keyword count within strict limits", () => {
    expect(characters(HOME_TITLE)).toBe(54);
    expect(characters(HOME_TITLE)).toBeGreaterThanOrEqual(30);
    expect(characters(HOME_TITLE)).toBeLessThanOrEqual(60);
    expect(characters(HOME_DESCRIPTION)).toBe(147);
    expect(characters(HOME_DESCRIPTION)).toBeGreaterThanOrEqual(50);
    expect(characters(HOME_DESCRIPTION)).toBeLessThanOrEqual(160);
    expect(HOME_KEYWORDS).toHaveLength(6);
    expect(new Set(HOME_KEYWORDS).size).toBe(HOME_KEYWORDS.length);
  });

  it("keeps the HTML template free of duplicate static SEO tags", () => {
    const html = readFileSync(new URL("../client/index.html", import.meta.url), "utf8");
    expect(html).toContain("<!--app-head-->");
    expect(html).toContain("<!--app-html-->");
    expect(html).not.toMatch(/<title>/);
    expect(html).not.toMatch(/name="description"/);
    expect(html).toContain("/src/entry-client.tsx");
  });

  it("ships the exact Google Search Console ownership file", () => {
    const verification = readFileSync(new URL("../client/public/google6c6cf98983fae7cc.html", import.meta.url), "utf8");
    expect(verification).toBe("google-site-verification: google6c6cf98983fae7cc.html");
  });
});

describe("thirteen indexable chapter routes", () => {
  it("has exactly 13 unique stable slug URLs", () => {
    const slugs = SUNZI_CHAPTERS.map(chapterRouteSlug);
    const paths = SUNZI_CHAPTERS.map(chapterPath);
    expect(slugs).toHaveLength(13);
    expect(new Set(slugs).size).toBe(13);
    expect(new Set(paths).size).toBe(13);
    expect(paths[0]).toBe("/chapters/01-shiji");
    expect(paths[12]).toBe("/chapters/13-yongjian");
  });

  it("gives every chapter focused metadata and adjacent navigation", () => {
    SUNZI_CHAPTERS.forEach((chapter, index) => {
      const head = chapterSeo(chapter);
      expect(characters(head.title)).toBeGreaterThanOrEqual(30);
      expect(characters(head.title)).toBeLessThanOrEqual(60);
      expect(characters(head.description)).toBeGreaterThanOrEqual(50);
      expect(characters(head.description)).toBeLessThanOrEqual(160);
      expect(head.keywords.length).toBeGreaterThanOrEqual(3);
      expect(head.keywords.length).toBeLessThanOrEqual(8);
      expect(head.canonicalPath).toBe(chapterPath(chapter));
      expect(head.imagePath).toMatch(/^\/manus-storage\/og-/);
      expect(head.prevPath).toBe(index > 0 ? chapterPath(SUNZI_CHAPTERS[index - 1]) : undefined);
      expect(head.nextPath).toBe(index < 12 ? chapterPath(SUNZI_CHAPTERS[index + 1]) : undefined);
      expect(head.notFound).not.toBe(true);
      expect(seoForPath(chapterPath(chapter))).toEqual(head);
    });
  });

  it("returns a noindex 404 only for an unknown chapter slug", () => {
    const missing = seoForPath("/chapters/99-missing");
    expect(missing.notFound).toBe(true);
    expect(missing.noindex).toBe(true);
  });

  it("lists 98 Chinese and multilingual routes with hreflang in sitemap and blocks private events", () => {
    expect(SUNZI_INDEXABLE_PATHS).toHaveLength(98);
    expect(new Set(SUNZI_INDEXABLE_PATHS).size).toBe(98);
    const sitemap = buildSitemapXml();
    for (const path of SUNZI_INDEXABLE_PATHS) {
      expect(sitemap).toContain(`<loc>${SUNZI_CANONICAL_ORIGIN}${path}</loc>`);
      expect(sitemap).toContain(`<image:loc>${SUNZI_CANONICAL_ORIGIN}${seoForPath(path).imagePath}</image:loc>`);
    }
    expect(Object.keys(SUNZI_OG_IMAGES)).toHaveLength(14);
    expect(new Set(Object.values(SUNZI_OG_IMAGES)).size).toBe(14);
    expect((sitemap.match(/<image:image>/g) ?? [])).toHaveLength(98);
    expect((sitemap.match(/<xhtml:link/g) ?? [])).toHaveLength(98 * 8);
    expect(sitemap).toContain('hreflang="x-default"');
    expect(sitemap).toContain('hreflang="zh-Hant"');
    expect(sitemap).toContain('hreflang="en"');
    expect(sitemap).not.toContain("/events");
    const robots = buildRobotsTxt();
    expect(robots).toContain("Disallow: /events");
    expect(robots).toContain(`${SUNZI_CANONICAL_ORIGIN}/sitemap.xml`);
  });
});
