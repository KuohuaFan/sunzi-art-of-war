import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SunziLocale } from "../shared/sunzi-locales";

type Corpus = {
  model: string;
  sourceOldid: string;
  generatedAt: string;
  translations: Record<SunziLocale, Array<{
    chapterNumber: number;
    chapterTitle: string;
    fullTitle: string;
    group: string;
    summary: string;
    tags: string[];
    seoTitle: string;
    seoDescription: string;
    segments: Array<{ id: string; text: string }>;
    points: Array<{ title: string; body: string; segmentId: string }>;
  }>>;
};

const replacements: Partial<Record<SunziLocale, Record<string, string>>> = {
  ja: {
    "07-02": "ゆえに軍争は利益をもたらす一方で危険も伴う。全軍を挙げて利を争えば間に合わず、軍を分けて利を争えば輜重を失う。したがって鎧をまとめ、昼夜休まず、倍の速さで強行軍する。百里先の利を争えば、三軍の将が捕らえられるおそれがある。強健な者は先に進み、疲れた者は後に続くため、到着できるのは十人に一人である。五十里先の利を争えば先鋒の将を失い、到着できるのは半数である。三十里先の利を争えば三分の二が到着する。ゆえに軍は輜重がなければ滅び、食糧がなければ滅び、備蓄がなければ滅ぶ。諸侯の謀略を知らなければ前もって同盟を結べず、山林・険阻・沼沢の地形を知らなければ行軍できず、土地に詳しい案内人を用いなければ地の利を得られない。",
    "07-06": "ゆえに用兵の原則は次のとおりである。高地を占める敵に向かって進むな。丘を背にする敵を迎え撃つな。偽りの退却を追うな。鋭気盛んな部隊を攻撃するな。囮として差し出された部隊に食いつくな。帰還する軍の道を塞ぐな。軍を包囲するときは必ず逃げ道を残せ。窮地に陥った敵を追いつめるな。これが用兵の原則である。"
  },
  ko: {
    "07-02": "그러므로 유리한 지점을 다투는 일에는 이익과 위험이 함께 따른다. 전군을 이끌고 이익을 다투면 제때 도착하지 못하고, 병력을 떼어 보내면 군수물자를 잃게 된다. 그러므로 갑옷을 말아 메고 낮과 밤을 쉬지 않으며 평소의 두 배 속도로 강행군한다. 백 리 밖의 이익을 다투면 삼군의 장수가 사로잡힐 수 있다. 강한 자는 앞서고 지친 자는 뒤처지므로 열 명 중 한 명만 도착한다. 오십 리 밖의 이익을 다투면 선봉의 장수를 잃고 절반만 도착한다. 삼십 리 밖의 이익을 다투면 삼분의 이가 도착한다. 그러므로 군대는 군수물자가 없으면 망하고, 식량이 없으면 망하며, 비축 물자가 없으면 망한다. 제후들의 계책을 알지 못하면 미리 동맹을 맺을 수 없고, 산림·험로·늪지의 지형을 알지 못하면 행군할 수 없으며, 현지 길잡이를 쓰지 않으면 지형의 이점을 얻을 수 없다.",
    "07-06": "그러므로 용병의 원칙은 다음과 같다. 높은 곳을 점한 적에게 맞서 올라가지 말고, 언덕을 등진 적을 정면으로 맞지 말며, 거짓 퇴각을 추격하지 말라. 사기가 왕성한 정예 부대를 공격하지 말고, 미끼로 내놓은 부대를 덥석 물지 말며, 귀환하는 군대의 길을 막지 말라. 적군을 포위할 때에는 반드시 퇴로 하나를 남기고, 궁지에 몰린 적을 지나치게 몰아붙이지 말라. 이것이 용병의 원칙이다."
  },
  es: {
    "07-02": "Así, disputar una ventaja ofrece beneficio, pero también entraña peligro. Si todo el ejército marcha para alcanzarla, no llegará a tiempo; si se desprende de parte de sus fuerzas para hacerlo, perderá los bagajes. Por ello se enrolla la armadura y se avanza sin descanso de día ni de noche, a marchas forzadas y al doble de velocidad. Si se disputa una ventaja a cien li, los jefes de los tres ejércitos pueden ser capturados: los vigorosos avanzan primero y los fatigados quedan atrás, de modo que solo uno de cada diez llega. A cincuenta li puede perderse al jefe de la vanguardia y solo llega la mitad; a treinta li llegan dos tercios. Por eso un ejército sin bagajes perece, sin víveres perece y sin reservas perece. Quien desconoce los planes de los señores vecinos no puede concertar alianzas de antemano; quien desconoce montañas, bosques, pasos difíciles y pantanos no puede marchar; quien no emplea guías locales no puede aprovechar el terreno.",
    "07-06": "Por eso, las reglas para emplear las tropas son estas: no avances contra un enemigo que ocupa una altura; no enfrentes de frente a un enemigo con una colina a su espalda; no persigas una retirada fingida; no ataques tropas frescas y vigorosas; no muerdas el anzuelo de una fuerza señuelo; no bloquees el paso a un ejército que regresa. Cuando rodees a una fuerza, déjale siempre una salida; no presiones en exceso a un enemigo acorralado. Estas son las reglas para emplear las tropas."
  },
  de: {
    "07-02": "Darum bringt der Kampf um einen Vorteil sowohl Gewinn als auch Gefahr. Zieht das ganze Heer los, um den Vorteil zu erringen, kommt es nicht rechtzeitig an; schickt man nur einen Teil der Truppen voraus, geht der Tross verloren. Deshalb rollt man die Rüstung zusammen, eilt Tag und Nacht ohne Rast und legt im Gewaltmarsch die doppelte Strecke zurück. Kämpft man um einen Vorteil in hundert Li Entfernung, können die Befehlshaber der drei Heere gefangen werden: Die Kräftigen gehen voraus, die Erschöpften bleiben zurück, sodass nur einer von zehn ankommt. Bei fünfzig Li kann der Befehlshaber der Vorhut verloren gehen und nur die Hälfte kommt an; bei dreißig Li kommen zwei Drittel an. Daher geht ein Heer ohne Tross zugrunde, ohne Proviant zugrunde und ohne Vorräte zugrunde. Wer die Pläne der benachbarten Fürsten nicht kennt, kann nicht rechtzeitig Bündnisse schließen; wer Berge, Wälder, Engpässe und Sümpfe nicht kennt, kann nicht marschieren; wer keine ortskundigen Führer einsetzt, kann den Vorteil des Geländes nicht nutzen.",
    "07-06": "Deshalb gelten beim Einsatz von Truppen folgende Regeln: Greife keinen Feind an, der eine Höhe besetzt; stelle dich keinem Feind entgegen, der einen Hügel im Rücken hat; verfolge keinen vorgetäuschten Rückzug; greife keine frischen, kampfkräftigen Truppen an; beiße nicht auf den Köder einer Locktruppe an; versperre einem heimkehrenden Heer nicht den Weg. Wenn du ein Heer einschließt, lasse ihm stets einen Ausweg; bedränge einen verzweifelten Feind nicht bis zum Äußersten. Das sind die Grundsätze des Truppeneinsatzes."
  }
};

const corpusPath = path.resolve("content/generated/sunzi-translations.json");
const tsPath = path.resolve("shared/sunzi-translations.ts");
const corpus = JSON.parse(await readFile(corpusPath, "utf8")) as Corpus;
let changed = 0;
for (const [locale, segments] of Object.entries(replacements) as Array<[SunziLocale, Record<string, string>]>) {
  const chapter = corpus.translations[locale][6];
  for (const [id, text] of Object.entries(segments)) {
    const segment = chapter.segments.find(item => item.id === id);
    if (!segment) throw new Error(`Missing ${locale} ${id}`);
    segment.text = text;
    changed += 1;
  }
}
corpus.generatedAt = new Date().toISOString();
await writeFile(corpusPath, `${JSON.stringify(corpus, null, 2)}\n`);
const ts = `import type { SunziLocale } from "./sunzi-locales";\n\nexport type SunziTranslatedChapter = {\n  chapterNumber: number;\n  chapterTitle: string;\n  fullTitle: string;\n  group: string;\n  summary: string;\n  tags: string[];\n  seoTitle: string;\n  seoDescription: string;\n  segments: Array<{ id: string; text: string }>;\n  points: Array<{ title: string; body: string; segmentId: string }>;\n};\n\nexport const SUNZI_TRANSLATION_META = ${JSON.stringify({ model: corpus.model, sourceOldid: corpus.sourceOldid, generatedAt: corpus.generatedAt }, null, 2)} as const;\n\nexport const SUNZI_TRANSLATIONS: Record<SunziLocale, SunziTranslatedChapter[]> = ${JSON.stringify(corpus.translations, null, 2)};\n`;
await writeFile(tsPath, ts);
console.log(JSON.stringify({ changed }));
