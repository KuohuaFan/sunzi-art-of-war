export const SUNZI_LOCALES = ["en", "ja", "ko", "es", "fr", "de"] as const;

export type SunziLocale = (typeof SUNZI_LOCALES)[number];

export type SunziLocaleConfig = {
  code: SunziLocale;
  htmlLang: string;
  hreflang: string;
  ogLocale: string;
  label: string;
  nativeName: string;
  siteName: string;
  homeTitle: string;
  homeDescription: string;
  keywords: string[];
  ui: {
    eyebrow: string;
    original: string;
    chapters: string;
    segments: string;
    keyPoints: string;
    startReading: string;
    chapterList: string;
    editorialSummary: string;
    translatedText: string;
    sourceText: string;
    sourceVersion: string;
    translationNotice: string;
    previous: string;
    next: string;
    backHome: string;
    language: string;
    chineseOriginal: string;
    print: string;
    segmentLink: string;
  };
};

export const SUNZI_LOCALE_CONFIG: Record<SunziLocale, SunziLocaleConfig> = {
  en: {
    code: "en", htmlLang: "en", hreflang: "en", ogLocale: "en_US", label: "English", nativeName: "English",
    siteName: "The Art of War — Thirteen Chapters",
    homeTitle: "The Art of War by Sun Tzu — Full Text in English, 13 Chapters",
    homeDescription: "Read all thirteen chapters of Sun Tzu's The Art of War in English, with stable paragraph references, editorial summaries, key principles, original Chinese links, and smooth chapter navigation.",
    keywords: ["The Art of War", "Sun Tzu", "Art of War English", "thirteen chapters", "military strategy"],
    ui: { eyebrow: "Seven Military Classics · Thirteen Chapters", original: "Sun Tzu's The Art of War", chapters: "chapters", segments: "translated passages", keyPoints: "key principles", startReading: "Start reading", chapterList: "All chapters", editorialSummary: "Editorial summary", translatedText: "English translation", sourceText: "Chinese source", sourceVersion: "Fixed source revision", translationNotice: "AI-assisted translation for reading. For scholarship and formal quotation, verify the fixed Chinese source and paragraph reference.", previous: "Previous chapter", next: "Next chapter", backHome: "All thirteen chapters", language: "Language", chineseOriginal: "繁體中文原文", print: "Print", segmentLink: "Link to passage" },
  },
  ja: {
    code: "ja", htmlLang: "ja", hreflang: "ja", ogLocale: "ja_JP", label: "Japanese", nativeName: "日本語",
    siteName: "孫子兵法・全十三篇",
    homeTitle: "孫子兵法・全十三篇｜日本語訳・原文段落・要点解説",
    homeDescription: "『孫子兵法』全十三篇を日本語で読めるオンライン版です。固定段落番号、日本語訳、編集要約、要点、漢文原典へのリンク、前後篇ナビゲーションを備えています。",
    keywords: ["孫子兵法", "孫子 日本語訳", "兵法十三篇", "軍事思想", "中国古典"],
    ui: { eyebrow: "武経七書・全十三篇", original: "孫子兵法", chapters: "篇", segments: "訳文段落", keyPoints: "要点", startReading: "読み始める", chapterList: "全十三篇", editorialSummary: "編集要約", translatedText: "日本語訳", sourceText: "漢文原典", sourceVersion: "固定底本", translationNotice: "本訳はAI支援による読解補助です。研究・正式な引用では、固定版の漢文原典と段落番号を確認してください。", previous: "前の篇", next: "次の篇", backHome: "十三篇一覧", language: "言語", chineseOriginal: "繁體中文原文", print: "印刷", segmentLink: "段落リンク" },
  },
  ko: {
    code: "ko", htmlLang: "ko", hreflang: "ko", ogLocale: "ko_KR", label: "Korean", nativeName: "한국어",
    siteName: "손자병법 13편 온라인 독본",
    homeTitle: "손자병법 13편 전체｜한국어 번역·원문 문단·핵심 원칙",
    homeDescription: "손자병법 전 13편을 한국어로 읽는 온라인 독본입니다. 고정 문단 번호, 한국어 번역, 편집 요약, 핵심 원칙, 중국어 원문 링크와 편리한 장별 탐색을 제공합니다.",
    keywords: ["손자병법", "손자병법 한국어", "손자", "병법 13편", "전략 고전"],
    ui: { eyebrow: "무경칠서 · 13편", original: "손자병법", chapters: "편", segments: "번역 문단", keyPoints: "핵심 원칙", startReading: "읽기 시작", chapterList: "전체 13편", editorialSummary: "편집 요약", translatedText: "한국어 번역", sourceText: "중국어 원문", sourceVersion: "고정 원전 판본", translationNotice: "이 번역은 AI의 도움으로 만든 읽기 보조 자료입니다. 연구 및 공식 인용 시 고정 중국어 원문과 문단 번호를 확인하십시오.", previous: "이전 편", next: "다음 편", backHome: "13편 목록", language: "언어", chineseOriginal: "繁體中文原文", print: "인쇄", segmentLink: "문단 링크" },
  },
  es: {
    code: "es", htmlLang: "es", hreflang: "es", ogLocale: "es_ES", label: "Spanish", nativeName: "Español",
    siteName: "El arte de la guerra — Trece capítulos",
    homeTitle: "El arte de la guerra de Sun Tzu｜Texto en español, 13 capítulos",
    homeDescription: "Lea los trece capítulos de El arte de la guerra de Sun Tzu en español, con referencias estables por párrafo, resúmenes editoriales, principios clave, enlaces al original chino y navegación continua.",
    keywords: ["El arte de la guerra", "Sun Tzu", "texto en español", "trece capítulos", "estrategia"],
    ui: { eyebrow: "Siete clásicos militares · Trece capítulos", original: "El arte de la guerra", chapters: "capítulos", segments: "pasajes traducidos", keyPoints: "principios clave", startReading: "Empezar a leer", chapterList: "Todos los capítulos", editorialSummary: "Resumen editorial", translatedText: "Traducción al español", sourceText: "Original chino", sourceVersion: "Revisión fija de la fuente", translationNotice: "Traducción asistida por IA para facilitar la lectura. Para investigación o citas formales, verifique el original chino fijo y la referencia del párrafo.", previous: "Capítulo anterior", next: "Capítulo siguiente", backHome: "Los trece capítulos", language: "Idioma", chineseOriginal: "繁體中文原文", print: "Imprimir", segmentLink: "Enlace al pasaje" },
  },
  fr: {
    code: "fr", htmlLang: "fr", hreflang: "fr", ogLocale: "fr_FR", label: "French", nativeName: "Français",
    siteName: "L'Art de la guerre — Treize chapitres",
    homeTitle: "L'Art de la guerre de Sun Tzu｜Texte français, 13 chapitres",
    homeDescription: "Lisez les treize chapitres de L'Art de la guerre de Sun Tzu en français, avec références stables par paragraphe, résumés éditoriaux, principes clés, liens vers le chinois et navigation fluide.",
    keywords: ["L'Art de la guerre", "Sun Tzu", "texte français", "treize chapitres", "stratégie"],
    ui: { eyebrow: "Sept classiques militaires · Treize chapitres", original: "L'Art de la guerre", chapters: "chapitres", segments: "passages traduits", keyPoints: "principes clés", startReading: "Commencer la lecture", chapterList: "Tous les chapitres", editorialSummary: "Résumé éditorial", translatedText: "Traduction française", sourceText: "Original chinois", sourceVersion: "Révision source fixe", translationNotice: "Traduction assistée par IA pour faciliter la lecture. Pour la recherche et les citations formelles, vérifiez le texte chinois fixe et la référence du paragraphe.", previous: "Chapitre précédent", next: "Chapitre suivant", backHome: "Les treize chapitres", language: "Langue", chineseOriginal: "繁體中文原文", print: "Imprimer", segmentLink: "Lien vers le passage" },
  },
  de: {
    code: "de", htmlLang: "de", hreflang: "de", ogLocale: "de_DE", label: "German", nativeName: "Deutsch",
    siteName: "Die Kunst des Krieges — Dreizehn Kapitel",
    homeTitle: "Sun Tzus Kunst des Krieges｜Deutscher Text in 13 Kapiteln",
    homeDescription: "Lesen Sie alle dreizehn Kapitel von Sun Tzus Kunst des Krieges auf Deutsch – mit stabilen Absatzverweisen, redaktionellen Zusammenfassungen, Kernprinzipien, Links zum chinesischen Original und Kapitelnavigation.",
    keywords: ["Die Kunst des Krieges", "Sun Tzu", "deutsche Übersetzung", "dreizehn Kapitel", "Strategie"],
    ui: { eyebrow: "Sieben militärische Klassiker · Dreizehn Kapitel", original: "Die Kunst des Krieges", chapters: "Kapitel", segments: "übersetzte Abschnitte", keyPoints: "Kernprinzipien", startReading: "Lesen beginnen", chapterList: "Alle Kapitel", editorialSummary: "Redaktionelle Zusammenfassung", translatedText: "Deutsche Übersetzung", sourceText: "Chinesischer Originaltext", sourceVersion: "Feste Quellrevision", translationNotice: "KI-gestützte Übersetzung als Lesehilfe. Für Forschung und formale Zitate prüfen Sie bitte den festen chinesischen Ausgangstext und die Absatzreferenz.", previous: "Vorheriges Kapitel", next: "Nächstes Kapitel", backHome: "Alle dreizehn Kapitel", language: "Sprache", chineseOriginal: "繁體中文原文", print: "Drucken", segmentLink: "Link zum Abschnitt" },
  },
};

export function isSunziLocale(value: string | undefined): value is SunziLocale {
  return Boolean(value && (SUNZI_LOCALES as readonly string[]).includes(value));
}
