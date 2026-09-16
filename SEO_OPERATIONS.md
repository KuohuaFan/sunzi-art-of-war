# 搜尋收錄與排名營運紀錄

## Google 官方要求（核對日期：2026-09-11）

Google Search Console 的 sitemap 提交 API 使用 `PUT https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/sitemaps/{feedpath}`，不含 request body，要求 OAuth scope `https://www.googleapis.com/auth/webmasters`，且執行帳戶必須能存取對應的 Search Console property。來源：[Sitemaps: submit](https://developers.google.com/webmaster-tools/v1/sitemaps/submit)。

Search Analytics API 使用 `POST https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query`，至少需要 `webmasters.readonly` scope，可依 `page`、`query`、`date`、`country`、`device` 等維度查詢，回傳 clicks、impressions、CTR 與 average position。官方提醒資料按 clicks 排序，且受內部限制影響，不保證回傳所有資料列。來源：[Search Analytics: query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)。

Google 官方說明，sitemap 可以透過 Search Console、Search Console API 或 `robots.txt` 的 `Sitemap:` 行提供；提交 sitemap 只是提示，不保證 Google 會下載、抓取或建立索引。本站已在網站根目錄提供 sitemap，並由 robots.txt 宣告。來源：[Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)。

## 本站目標

正式 property 採 `https://sunziaow.manus.space/`，sitemap 為 `https://sunziaow.manus.space/sitemap.xml`。繁中首頁、繁中十三篇與六語對等頁合計 98 個公開網址納入追蹤；私人 `/events` 不列入 sitemap，並維持 noindex。

## 2026-09-11 基線與追蹤設定

發布前以公開搜尋查詢 `sunziaow 孫子兵法`、`孫子兵法 始計 sunziaow`、`孫子兵法 謀攻 sunziaow`，結果未出現本站；目前公開可見度基線記為「尚未觀察到收錄」，不將此結果冒充 Search Console 的索引狀態或精確排名。

最初建立的每週排程已在同日被後述兩次精準追蹤取代，不再持續每週執行。當時的追蹤範圍為十四個繁中公開網址、sitemap、robots、canonical、title、description、OG 圖與公開搜尋可見度。

目前專案連接器沒有 Google Search Console；Google Workspace CLI 亦不包含 Search Console 服務。Sandbox 瀏覽器已到達 Google 帳戶選擇頁，但帳戶為 signed out。因此正式 Search Console sitemap 提交仍須由使用者完成一次 Google 登入及 property 驗證／授權後才能執行。網站端已具備 sitemap 與 robots 宣告，可供 Googlebot 自動發現。

## 2026-09-11 Search Console 擁有權驗證準備

已使用經授權的 Google 帳戶登入 Search Console。該帳戶當時尚未取得 `https://sunziaow.manus.space/` property 權限；Search Console 提供 HTML 驗證檔 `google6c6cf98983fae7cc.html`。官方檔已原樣加入網站根目錄，並經自動測試與正式建置核對。新版發布後，先確認 `https://sunziaow.manus.space/google6c6cf98983fae7cc.html` 可讀，再在 Search Console 執行驗證及 sitemap 提交。

## 2026-09-11 正式發布與 Sitemap 提交完成

檢查點 `7c4d6dec` 已發布至 `https://sunziaow.manus.space/`。正式首頁可見多語翻譯入口，`google6c6cf98983fae7cc.html` 以精確官方內容公開回應。Google Search Console 已使用 HTML 檔驗證授權帳戶對 URL-prefix property `https://sunziaow.manus.space/` 的擁有權。

已提交 `https://sunziaow.manus.space/sitemap.xml`。Search Console 回報狀態為「成功」，提交日及上次讀取日均為 2026-09-10（介面時區），探索到 14 個網頁、0 個影片。這代表 sitemap 已被接受及讀取，不代表所有網址已完成索引；收錄與排名由每週任務繼續追蹤。

## 2026-09-11 多語索引與兩階段追蹤

網站新增 `en`、`ja`、`ko`、`es`、`fr`、`de` 六個語言首頁，以及各語十三個篇章頁，共 84 個多語網址。連同繁中首頁與十三篇，sitemap 預期共有 98 個公開網址。每個對等頁均採自我 canonical，並互相宣告 `zh-Hant`、`en`、`ja`、`ko`、`es`、`fr`、`de` 與 `x-default` 八個 alternate；`x-default` 指向不帶語言前綴的繁中頁。繁中仍是唯一不帶前綴的預設語言，沒有另建 `/zh` 重複版本。

多語正文由 `gpt-5-mini` 以固定繁中底本產生並保存為靜態資料，發布時由 SSR 直接輸出，搜尋引擎不需執行 JavaScript 或呼叫模型。資料品質閘門要求六語各十三篇、固定段號和要義錨點逐項一致、所有欄位非空及 SEO 描述長度合規；頁面保留原文對照、固定版號、來源授權與 AI 翻譯警語。

原每週任務已改為兩次精準執行：2026-09-13 04:00（Asia/Taipei）執行發布後約 48 小時索引檢查；2026-10-09 04:00 執行自 2026-09-11 起約 28 天的 Search Console 趨勢報告。任務在 2026-10-10 00:00 到期，避免後續每月重複。報告須分開標示 Search Console 官方指標與公開搜尋觀察，若 Google 登入失效不得推估或捏造數據。

## 2026-09-11 多語版本正式發布與 Sitemap 重新提交

檢查點 `707d9b47` 已發布。正式 `https://sunziaow.manus.space/sitemap.xml` 經 HTTP 核對包含 98 筆 URL、784 個 `xhtml:link` hreflang alternate 與 98 個 image entry。英文〈始計〉與日文〈作戰〉原始 SSR HTML 分別輸出正確 `lang`，英文頁自我 canonical 指向正式網址，且包含 `x-default` hreflang。

Search Console 的 `https://sunziaow.manus.space/` property 保持已驗證狀態；已於 Sitemap 頁重新提交 `sitemap.xml`。Google 回報「已成功提交 Sitemap」，狀態為「成功」，送出及上次讀取日期均更新為 2026-09-11，系統探索到的網頁由 14 增加為 98，影片為 0。此數字表示 Google 已讀取 sitemap 並發現網址，不等於 98 頁均已建立索引。
