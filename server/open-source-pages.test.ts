import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { joinBasePath, stripBasePath } from "../client/src/lib/runtime";

const root = new URL("../", import.meta.url);

async function text(relative: string) {
  return readFile(new URL(relative, root), "utf8");
}

describe("open-source branding and documentation", () => {
  it("ships the project Logo in web and favicon sizes", async () => {
    const files = [
      ["client/public/brand/sunzi-logo-512.png", 512],
      ["client/public/brand/apple-touch-icon.png", 180],
      ["client/public/brand/favicon-64.png", 64],
      ["client/public/brand/favicon-32.png", 32],
    ] as const;
    for (const [relative, size] of files) {
      const metadata = await sharp(fileURLToPath(new URL(relative, root))).metadata();
      expect(metadata.format).toBe("png");
      expect(metadata.width).toBe(size);
      expect(metadata.height).toBe(size);
    }
  });

  it("documents the project and uses explicit code/content licenses", async () => {
    const [readme, license, contentLicense] = await Promise.all([
      text("README.md"),
      text("LICENSE"),
      text("LICENSE-CONTENT.md"),
    ]);
    expect(readme).toContain("GitHub Pages 公開鏡像");
    expect(readme).toContain("client/public/brand/sunzi-logo-512.png");
    expect(license).toContain("MIT License");
    expect(contentLicense).toContain("CC BY-SA 4.0");
  });

  it("keeps private account identifiers out of public operations notes", async () => {
    expect(await text("SEO_OPERATIONS.md")).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  });
});

describe("GitHub Pages base-path helpers", () => {
  it("prefixes internal links without touching external links", () => {
    expect(joinBasePath("/chapters/01-shiji", "/sunzi-art-of-war")).toBe("/sunzi-art-of-war/chapters/01-shiji");
    expect(joinBasePath("/", "/sunzi-art-of-war")).toBe("/sunzi-art-of-war/");
    expect(joinBasePath("https://example.com", "/sunzi-art-of-war")).toBe("https://example.com");
  });

  it("strips only the configured repository base", () => {
    expect(stripBasePath("/sunzi-art-of-war/en", "/sunzi-art-of-war")).toBe("/en");
    expect(stripBasePath("/sunzi-art-of-war", "/sunzi-art-of-war")).toBe("/");
    expect(stripBasePath("/other", "/sunzi-art-of-war")).toBe("/other");
  });
});
