<p align="center">
  <img src="client/public/brand/sunzi-logo-512.png" width="128" height="128" alt="孫子兵法專案 Logo" />
</p>

<h1 align="center">《孫子兵法》十三篇線上讀本</h1>

<p align="center">
  固定底本、七語閱讀、可追溯段號、閱讀進度、短篇篩選與個人化閱讀時間估算。
</p>

<p align="center">
  <a href="https://sunziaow.manus.space/">完整正式站</a> ·
  <a href="https://kuohuafan.github.io/sunzi-art-of-war/">GitHub Pages 公開鏡像</a> ·
  <a href="https://github.com/KuohuaFan/sunzi-art-of-war/issues">問題回報</a>
</p>

## 專案簡介

本專案將《孫子兵法》十三篇整理成可逐篇索引、可分享固定段落、可跨語閱讀的開源網站。中文原文鎖定維基文庫修訂版 `oldid=7906064`，並以固定段號維持引用與版本追溯。公開讀本提供繁體中文、英文、日文、韓文、西班牙文、法文及德文共七種語言頁面。

完整站另提供 AI 問答、AI 情境搜尋及私人 Match Mapping 事件簿；GitHub Pages 是不含伺服器與資料庫的靜態鏡像，會把這些功能清楚連回完整站，不在公開靜態主機處理私人事件。

## 主要功能

| 類別 | 功能 |
|---|---|
| 內容結構 | 十三篇、74 個固定段落、篇旨今譯與 64 則要義提點 |
| 多語閱讀 | 六個翻譯語言首頁及 78 個翻譯篇章頁，搭配繁中共 98 個公開網址 |
| SEO | SSR／預先渲染正文、canonical、`hreflang`、Open Graph、Twitter Card、sitemap 與 robots |
| 閱讀工具 | 全文逐字搜尋、語音朗讀、段落深鏈、列印、閱讀進度與跨語續讀 |
| 閱讀規劃 | 短篇優先、1／2／3／5／10 分鐘篩選、字數／詞數與預估閱讀時間 |
| 個人化 | 依實際計時樣本估算各語閱讀速度；資料只保存在瀏覽器 `localStorage` |
| 完整站功能 | AI 問答、AI 情境搜尋、登入與私人 Match Mapping 事件簿 |

## GitHub Pages 與完整站差異

| 能力 | GitHub Pages | 完整站 |
|---|---:|---:|
| 十三篇原文與六語翻譯 | ✓ | ✓ |
| 98 個可直接開啟的公開網址 | ✓ | ✓ |
| 閱讀進度、短篇篩選與個人速度 | ✓ | ✓ |
| 逐字搜尋、朗讀、列印與段落分享 | ✓ | ✓ |
| AI 問答與 AI 情境搜尋 | 連回完整站 | ✓ |
| 私人事件簿、登入與資料庫 | 連回完整站 | ✓ |

## 技術架構

| 層次 | 技術 |
|---|---|
| 前端 | React 19、TypeScript、Tailwind CSS 4、Wouter |
| 全端 API | Express、tRPC、Zod |
| 資料庫 | Drizzle ORM、MySQL／TiDB |
| SSR | React `renderToString` 與 Vite SSR bundle |
| 靜態發布 | 98 個公開路由預先渲染至 `dist/pages`，由 GitHub Actions 發布至 Pages |
| 測試 | Vitest、SSR 路由驗證、Chromium 手機 viewport 驗收 |

## 本機開發

需要 Node.js 22 與 pnpm 10。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

完整站的登入、資料庫與 AI 功能依賴 Manus WebDev 提供的伺服器端環境變數。請勿把任何密鑰提交至儲存庫。

## 測試與建置

```bash
pnpm check
pnpm test
pnpm build
```

建立 GitHub Pages 版本：

```bash
pnpm pages:build
pnpm pages:preview
```

靜態產物位於 `dist/pages`。匯出程序會預先渲染繁中首頁、十三篇、六語首頁、六語 78 篇、事件簿降級頁及 404 頁。

## GitHub Pages 發布

執行下列命令會先建置並驗證靜態產物，再把 `dist/pages` 發布至 `gh-pages` 分支：

```bash
pnpm pages:deploy
```

在 GitHub 儲存庫 **Settings → Pages** 中，Source 設為 **Deploy from a branch**，分支選擇 `gh-pages`、資料夾選擇 `/ (root)`。發布腳本會依 GitHub 儲存庫名稱自動設定 Vite 基底路徑，因此 fork 後亦可使用。

## 內容編輯

中文原始來源保存在 `content/source/sunzi-wikisource-oldid-7906064.wiki`。正文結構由 `scripts/build_sunzi_data.py` 生成；多語靜態內容由 `scripts/generate-static-translations.ts` 及關鍵詞義修正流程維護。詳細規則見 [`content/README.md`](content/README.md)。

> 原文、篇旨、要義與翻譯必須維持固定段號；修改生成內容後，請重跑完整測試與 SSR 驗證。

## 資料來源與授權

古典《孫子兵法》原文本身屬公有領域。本專案採用的維基文庫頁面版本及其編輯內容依 CC BY-SA 4.0 提供，固定來源為：

- [維基文庫《孫子兵法》oldid 7906064](https://zh.wikisource.org/w/index.php?title=%E5%AD%AB%E5%AD%90%E5%85%B5%E6%B3%95&oldid=7906064)

程式碼依 [MIT License](LICENSE) 開源；本站自撰篇旨、要義、多語編輯內容、Logo 與文件依 [CC BY-SA 4.0](LICENSE-CONTENT.md) 提供。第三方套件仍受各自授權條款約束。

## 安全與隱私

- 不提交環境變數、API 金鑰、登入憑證、資料庫內容或私人事件資料。
- GitHub Pages 版本不提供資料庫與登入，不接收私人事件。
- 閱讀進度及個人速度只保存在使用者瀏覽器，可隨時重設。
- AI 結果僅供閱讀與決策檢查，不構成法律、醫療、財務或其他專業意見。

## 貢獻

歡迎以 Issue 回報文本錯誤、翻譯問題、無障礙或介面改善。Pull Request 請包含相關測試，並確保：

```bash
pnpm check && pnpm test && pnpm pages:build
```

全部通過。
