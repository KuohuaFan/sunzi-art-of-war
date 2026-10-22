import { describe, expect, it } from "vitest";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const image = resolve(root, "docs/assets/github-social-preview.jpg");

describe("repository social preview", () => {
  it("meets GitHub recommended size and file size requirements", async () => {
    const metadata = await sharp(image).metadata();
    expect(metadata.format).toBe("jpeg");
    expect(metadata.width).toBe(1280);
    expect(metadata.height).toBe(640);
    expect(statSync(image).size).toBeLessThan(1_000_000);
  });

  it("documents the preview asset and the Pages synchronization command", () => {
    const readme = readFileSync(resolve(root, "README.md"), "utf8");
    expect(readme).toContain("docs/assets/github-social-preview.jpg");
    expect(readme).toContain("pnpm pages:deploy");
    expect(readme).toContain("Social preview");
    expect(readme).toContain("不會自動設定");
    expect(readme).not.toContain("由 GitHub Actions 發布至 Pages");
  });
});
