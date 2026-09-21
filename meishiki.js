/**
 * 四柱推命 命式計算モジュール
 * ────────────────────────────────────────────────────────
 * 鳥海流・天象学会万年暦準拠（三柱：年柱・月柱・日柱）
 *
 * 外部ライブラリは一切使いません。このファイル1枚で動きます。
 * Node.js（v18以上）でもブラウザでもそのまま使えます。
 *
 *   import { calcMeishiki } from './meishiki.js';
 *   const m = calcMeishiki(1990, 8, 29, '女');
 *   console.log(m.dayKanshi);   // → 丙寅
 *
 * ⚠️ 流派によって解釈が変わる部分があります。詳しくは README.md の
 *    「ロジックの中身」と「注意点」を読んでください。
 */

/* ══════════════════════════════════════════════════════════
   1. 基本の対応表
   ══════════════════════════════════════════════════════════ */

/** 十干 */
export const JIKKAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

/** 十二支 */
export const JUUNISHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 十干の読み */
export const KAN_YOMI = {
  甲: 'きのえ', 乙: 'きのと', 丙: 'ひのえ', 丁: 'ひのと', 戊: 'つちのえ',
  己: 'つちのと', 庚: 'かのえ', 辛: 'かのと', 壬: 'みずのえ', 癸: 'みずのと',
};

/** 十二支の読み */
export const SHI_YOMI = {
  子: 'ね', 丑: 'うし', 寅: 'とら', 卯: 'う', 辰: 'たつ', 巳: 'み',
  午: 'うま', 未: 'ひつじ', 申: 'さる', 酉: 'とり', 戌: 'いぬ', 亥: 'い',
};

/** 十干の五行 */
export const GOGYOU_KAN = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

/** 十二支の五行 */
export const GOGYOU_SHI = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

/** 陰陽（0 = 陽、1 = 陰）。並び順の偶奇で決まる */
const INYOU = {};
JIKKAN.forEach((g, i) => { INYOU[g] = i % 2; });

/** 五行の相生（生み出す先） */
export const SEI = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
/** 五行の相剋（抑える先） */
export const KOKU = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

/** 十二運星（長生からの順） */
export const JUUNI_UNSEI = ['長生', '沐浴', '冠帯', '建禄', '帝旺', '衰', '病', '死', '墓', '絶', '胎', '養'];

/** 十二運星のエネルギー値（運勢エネルギーの集計に使う） */
export const ENERGY = {
  長生: 9, 沐浴: 7, 冠帯: 10, 建禄: 11, 帝旺: 12, 衰: 8,
  病: 4, 死: 2, 墓: 5, 絶: 1, 胎: 3, 養: 6,
};

/** 日干ごとの「長生」の支と、進む向き（1 = 順行 / -1 = 逆行） */
const CHOSEI = {
  甲: ['亥', 1], 乙: ['午', -1],
  丙: ['寅', 1], 丁: ['酉', -1],
  戊: ['寅', 1], 己: ['酉', -1],
  庚: ['巳', 1], 辛: ['子', -1],
  壬: ['申', 1], 癸: ['卯', -1],
};

/** 五虎遁（年干 → 寅月の月干） */
const GOKOTON = {
  甲: '丙', 己: '丙', 乙: '戊', 庚: '戊', 丙: '庚',
  辛: '庚', 丁: '壬', 壬: '壬', 戊: '甲', 癸: '甲',
};

/** 旬（六十干支を10ずつ区切ったもの）ごとの空亡＝天中殺 */
const KUUBOU = { 0: '戌亥', 1: '申酉', 2: '午未', 3: '辰巳', 4: '寅卯', 5: '子丑' };

/**
 * 節入り日の近似表（月 → 日）。
 * ⚠️ 実際の節入りは年によって1日前後ずれます。README の「注意点」を必ず読んでください。
 */
const SEKKI_APPROX = { 1: 6, 2: 4, 3: 5, 4: 5, 5: 5, 6: 6, 7: 7, 8: 8, 9: 8, 10: 8, 11: 8, 12: 7 };

/** 暦月 → 節月の支 */
const SEKKI_SHI = {
  1: '丑', 2: '寅', 3: '卯', 4: '辰', 5: '巳', 6: '午',
  7: '未', 8: '申', 9: '酉', 10: '戌', 11: '亥', 12: '子',
};

/** 節月の支 → 暦月 */
export const SHI_TO_MONTH = {};
Object.entries(SEKKI_SHI).forEach(([m, shi]) => { SHI_TO_MONTH[shi] = Number(m); });

/**
 * 蔵干表 [余気の干, 余気の日数, 中気の干, 中気の日数, 本気の干]
 * 日数は節入りからの経過日数。
 */
const ZOUKAN_TABLE = {
  子: [null, 0, null, 0, '癸'],
  丑: ['癸', 9, '辛', 3, '己'],
  寅: ['戊', 7, '丙', 7, '甲'],
  卯: [null, 0, null, 0, '乙'],
  辰: ['乙', 9, '癸', 3, '戊'],
  巳: ['戊', 7, '庚', 7, '丙'],
  午: ['丙', 10, '己', 9, '丁'],
  未: ['丁', 9, '乙', 3, '己'],
  申: ['戊', 7, '壬', 7, '庚'],
  酉: [null, 0, null, 0, '辛'],
  戌: ['辛', 9, '丁', 3, '戊'],
  亥: ['戊', 7, '甲', 5, '壬'],
};

/** 日柱の蔵干は日数によらず固定 */
const ZOUKAN_DAY_FIXED = {
  子: '癸', 丑: '己', 寅: '甲', 卯: '乙', 辰: '戊', 巳: '丙',
  午: '丁', 未: '己', 申: '庚', 酉: '辛', 戌: '戊', 亥: '壬',
};

/* ══════════════════════════════════════════════════════════
   2. 干支のユーティリティ
   ══════════════════════════════════════════════════════════ */

/** 干支名 → 六十干支の通し番号（0〜59） */
export function kanshiIndex(name) {
  const g = JIKKAN.indexOf(name[0]);
  const s = JUUNISHI.indexOf(name[1]);
  for (let i = 0; i < 60; i++) if (i % 10 === g && i % 12 === s) return i;
  return null;
}

/** 六十干支の通し番号 → 干支名 */
export function kanshiName(idx) {
  idx = ((idx % 60) + 60) % 60;
  return JIKKAN[idx % 10] + JUUNISHI[idx % 12];
}

/** 天干の陰陽五行を「＋火」の形で返す */
export function gogyouOfKan(kan) {
  return { sign: JIKKAN.indexOf(kan) % 2 === 0 ? '＋' : '－', gogyou: GOGYOU_KAN[kan] };
}

/** 地支の陰陽五行を「＋木」の形で返す */
export function gogyouOfShi(shi) {
  return { sign: JUUNISHI.indexOf(shi) % 2 === 0 ? '＋' : '－', gogyou: GOGYOU_SHI[shi] };
}

const dateOnly = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
const daysBetween = (a, b) => Math.round((b - a) / 86400000);
const getSekkiDate = (year, month) => dateOnly(year, month, SEKKI_APPROX[month]);

/* ══════════════════════════════════════════════════════════
   3. 四柱（年・月・日）を出す
   ══════════════════════════════════════════════════════════ */

/** 立春より前か（年柱の切り替わり判定） */
function isBeforeRisshun(bd) {
  return bd < getSekkiDate(bd.getUTCFullYear(), 2);
}

/**
 * 年柱。切り替わりは1月1日ではなく**立春**（2月4日ごろ）。
 * 1月生まれや2月初旬生まれは前年扱いになる。
 */
export function calcYearPillar(bd) {
  let effYear = bd.getUTCFullYear();
  if (isBeforeRisshun(bd)) effYear -= 1;
  const idx = ((effYear - 4) % 60 + 60) % 60;
  return { kanshi: kanshiName(idx), idx, effYear };
}

/** 日柱。1900年1月1日を基準に日数を数える */
export function calcDayPillar(bd) {
  const diff = daysBetween(dateOnly(1900, 1, 1), bd);
  const idx = ((diff + 10) % 60 + 60) % 60;
  return { kanshi: kanshiName(idx), idx };
}

/** 月柱。切り替わりは月初ではなく**節入り**。月干は五虎遁で決める */
export function calcMonthPillar(bd) {
  const y = bd.getUTCFullYear(), m = bd.getUTCMonth() + 1, d = bd.getUTCDate();
  const setsuMonth = (d >= SEKKI_APPROX[m]) ? m : (m > 1 ? m - 1 : 12);
  const setsuShi = SEKKI_SHI[setsuMonth];
  const yearForGokoton = (setsuMonth === 12 && m === 1) ? y - 1 : y;
  const nenkan = JIKKAN[(((yearForGokoton - 4) % 60) + 60) % 60 % 10];
  const inYinGan = GOKOTON[nenkan];
  const diff = (setsuShi === '丑')
    ? -1
    : ((JUUNISHI.indexOf(setsuShi) - JUUNISHI.indexOf('寅')) % 12 + 12) % 12;
  const kanIdx = ((JIKKAN.indexOf(inYinGan) + diff) % 10 + 10) % 10;
  return { kanshi: JIKKAN[kanIdx] + setsuShi, setsuNenkan: nenkan };
}

/* ══════════════════════════════════════════════════════════
   4. 蔵干・通変星・十二運星・天中殺
   ══════════════════════════════════════════════════════════ */

/**
 * 蔵干を出す。柱によってルールが違うので pillarType を必ず渡すこと。
 *
 *  - day   … 支ごとの固定テーブル
 *  - month … 節入りからの日数で 余気→中気→本気 と切り替わる。
 *            ただし 寅・亥・戌 は「余気スキップルール」あり
 *  - year  … 辰・戌 は同五行ルール。その他は立春からの日数で三正
 *
 * @param {string} shi 地支
 * @param {number} daysFromSekki 節入り（年柱は立春）からの経過日数
 * @param {string} kanOfPillar その柱の天干
 * @param {'year'|'month'|'day'} pillarType
 */
export function getZoukan(shi, daysFromSekki, kanOfPillar, pillarType) {
  const [yoKan, yoDays, chuKan, chuDays, honKan] = ZOUKAN_TABLE[shi];

  if (pillarType === 'day') return ZOUKAN_DAY_FIXED[shi] || honKan;

  if (pillarType === 'month') {
    // 寅・亥・戌 は、月干が余気の干と一致するときだけ余気を採用する
    if (shi === '寅' || shi === '亥' || shi === '戌') {
      if (daysFromSekki < yoDays) {
        if (kanOfPillar === yoKan) return yoKan;
        if (shi === '寅') return honKan;
        return chuKan;
      }
      if (kanOfPillar === yoKan) {
        return (daysFromSekki < yoDays + chuDays) ? chuKan : honKan;
      }
      if (shi === '寅') return chuKan;
      return (daysFromSekki < yoDays + chuDays) ? chuKan : honKan;
    }
    if (yoKan && daysFromSekki < yoDays) return yoKan;
    if (chuKan && daysFromSekki < yoDays + chuDays) return chuKan;
    return honKan;
  }

  // 年柱：辰・戌は、年干と同じ五行の蔵干を採る
  if (shi === '辰' || shi === '戌') {
    const kanG = GOGYOU_KAN[kanOfPillar];
    const list = [
      yoKan ? { kan: yoKan, g: GOGYOU_KAN[yoKan] } : null,
      chuKan ? { kan: chuKan, g: GOGYOU_KAN[chuKan] } : null,
      { kan: honKan, g: GOGYOU_KAN[honKan] },
    ].filter(Boolean);
    const same = list.find((z) => z.g === kanG);
    return same ? same.kan : honKan;
  }
  if (yoKan && daysFromSekki < yoDays) return yoKan;
  if (chuKan && daysFromSekki < yoDays + chuDays) return chuKan;
  return honKan;
}

/**
 * 通変星。日干から見て対象の干がどういう関係かを返す。
 * 同五行なら比肩/劫財、生じる先なら食神/傷官、剋す先なら偏財/正財、
 * 剋される側なら偏官/正官、生じてくれる側なら偏印/印綬。
 * 同じ陰陽なら「偏」側、違う陰陽なら「正」側になる。
 */
export function getTsuuhensei(nikkan, target) {
  if (nikkan === target) return '比肩';
  const gN = GOGYOU_KAN[nikkan], gT = GOGYOU_KAN[target];
  const same = INYOU[nikkan] === INYOU[target];
  if (gN === gT) return same ? '比肩' : '劫財';
  if (SEI[gN] === gT) return same ? '食神' : '傷官';
  if (KOKU[gN] === gT) return same ? '偏財' : '正財';
  if (KOKU[gT] === gN) return same ? '偏官' : '正官';
  if (SEI[gT] === gN) return same ? '偏印' : '印綬';
  return '?';
}

/** 十二運星。日干ごとの「長生」の位置から数える */
export function getJuuniUnsei(nikkan, shi) {
  const [startShi, direction] = CHOSEI[nikkan];
  let diff = (JUUNISHI.indexOf(shi) - JUUNISHI.indexOf(startShi)) * direction;
  diff = ((diff % 12) + 12) % 12;
  return JUUNI_UNSEI[diff];
}

/** その干支の空亡（天中殺）を「戌亥」の形で返す */
export function getKuubou(kanshi) {
  return KUUBOU[Math.floor(kanshiIndex(kanshi) / 10)];
}

/* ══════════════════════════════════════════════════════════
   5. 大運
   ══════════════════════════════════════════════════════════ */

/**
 * 大運の進む向き。
 * 陽年生まれの男性／陰年生まれの女性 → 順行
 * 陰年生まれの男性／陽年生まれの女性 → 逆行
 */
export function calcDaiunDirection(sex, yearKan) {
  const yo = INYOU[yearKan];
  if ((sex === '男' && yo === 0) || (sex === '女' && yo === 1)) return '順行';
  return '逆行';
}

/** 立運（大運が始まる年齢）。節入りまでの日数 ÷ 3 */
export function calcStartingAge(bd, direction) {
  const m = bd.getUTCMonth() + 1, y = bd.getUTCFullYear();
  const sekkiThis = getSekkiDate(y, m);
  const sekkiNext = getSekkiDate(m < 12 ? y : y + 1, m < 12 ? m + 1 : 1);
  const sekkiPrev = getSekkiDate(m > 1 ? y : y - 1, m > 1 ? m - 1 : 12);
  const [before, after] = (bd < sekkiThis) ? [sekkiPrev, sekkiThis] : [sekkiThis, sekkiNext];
  const daysBefore = daysBetween(before, bd);
  const daysAfter = daysBetween(bd, after);
  let days;
  if (Math.min(daysBefore, daysAfter) <= 1) days = Math.min(daysBefore, daysAfter);
  else if (direction === '順行') days = daysAfter;
  else days = daysBefore;
  return Math.ceil(Math.max(days, 0) / 3);
}

/* ══════════════════════════════════════════════════════════
   6. 命式をまとめて出す
   ══════════════════════════════════════════════════════════ */

/**
 * 命式を計算する。
 *
 * @param {number} year  西暦（1901〜2100）
 * @param {number} month 月（1〜12）
 * @param {number} day   日（1〜31）
 * @param {'女'|'男'} sex 性別（大運の順逆に使う）
 * @returns {object} 命式一式。中身は README の「出力の中身」を参照
 */
export function calcMeishiki(year, month, day, sex) {
  const bd = dateOnly(year, month, day);
  const yearP = calcYearPillar(bd);
  const dayP = calcDayPillar(bd);
  const monthP = calcMonthPillar(bd);
  const nikkan = dayP.kanshi[0];

  const r = {
    yearKanshi: yearP.kanshi,
    monthKanshi: monthP.kanshi,
    dayKanshi: dayP.kanshi,
    dayKanshiNumber: dayP.idx + 1,
    nikkan,
  };

  // 各柱の「節入りからの経過日数」を出す（蔵干の判定に使う）
  function daysFromSekki(kanshi) {
    const sekki_m = SHI_TO_MONTH[kanshi[1]];
    const sekki_y = bd.getUTCFullYear();
    let sekkiDate = getSekkiDate(sekki_y, sekki_m);
    if (sekkiDate > bd) sekkiDate = getSekkiDate(sekki_y - 1, sekki_m);
    return Math.max(0, daysBetween(sekkiDate, bd));
  }
  const dY = Math.max(0, daysBetween(getSekkiDate(yearP.effYear, 2), bd)); // 年柱は立春から
  const dM = daysFromSekki(monthP.kanshi);
  const dD = daysFromSekki(dayP.kanshi);

  r.zoukan = {
    year: getZoukan(yearP.kanshi[1], dY, yearP.kanshi[0], 'year'),
    month: getZoukan(monthP.kanshi[1], dM, monthP.kanshi[0], 'month'),
    day: getZoukan(dayP.kanshi[1], dD, dayP.kanshi[0], 'day'),
  };

  // 日柱の通変星は「自分自身」なので出さない（常に比肩になるため）
  r.tsuuhensei = {
    year: getTsuuhensei(nikkan, yearP.kanshi[0]),
    month: getTsuuhensei(nikkan, monthP.kanshi[0]),
  };
  r.zoukanTsuuhensei = {
    year: getTsuuhensei(nikkan, r.zoukan.year),
    month: getTsuuhensei(nikkan, r.zoukan.month),
    day: getTsuuhensei(nikkan, r.zoukan.day),
  };
  r.unsei = {
    year: getJuuniUnsei(nikkan, yearP.kanshi[1]),
    month: getJuuniUnsei(nikkan, monthP.kanshi[1]),
    day: getJuuniUnsei(nikkan, dayP.kanshi[1]),
  };

  const eY = ENERGY[r.unsei.year], eM = ENERGY[r.unsei.month], eD = ENERGY[r.unsei.day];
  r.energy = { total: eY + eM + eD, day: eD, month: eM, year: eY };

  r.tenchu = { day: getKuubou(dayP.kanshi), year: getKuubou(yearP.kanshi) };

  // 大運（月柱を起点に10年ごと・8つ分）
  const direction = calcDaiunDirection(sex, yearP.kanshi[0]);
  r.daiunDirection = direction;
  r.startingAge = calcStartingAge(bd, direction);
  const monthIdx = kanshiIndex(monthP.kanshi);
  const step = (direction === '順行') ? 1 : -1;
  r.daiun = [];
  for (let i = 0; i < 8; i++) {
    const kanshi = kanshiName(monthIdx + step * i);
    r.daiun.push({
      kanshi,
      tsuuhensei: getTsuuhensei(nikkan, kanshi[0]),
      unsei: getJuuniUnsei(nikkan, kanshi[1]),
      energy: ENERGY[getJuuniUnsei(nikkan, kanshi[1])],
    });
  }

  // 中殺の判定
  const kb = getKuubou(dayP.kanshi);
  const myTC = [kb[0], kb[1]];
  r.chusatsu = {
    seinen: myTC.includes(yearP.kanshi[1]),     // 生年中殺
    seigetsu: myTC.includes(monthP.kanshi[1]),  // 生月中殺
    seinichi: myTC.includes(dayP.kanshi[1]),    // 生日中殺
    hiza: {                                      // 日座中殺
      year: ['甲戌', '乙亥'].includes(yearP.kanshi) || yearP.kanshi === '庚子',
      month: ['甲戌', '乙亥'].includes(monthP.kanshi) || monthP.kanshi === '庚子',
      day: ['甲戌', '乙亥', '庚子'].includes(dayP.kanshi),
    },
    myTC: kb,
  };

  return r;
}

/* ══════════════════════════════════════════════════════════
   7. 運勢バイオリズム（年運・月運）
   ══════════════════════════════════════════════════════════
   十二支に、草木の成長になぞらえた12段階を割り当てる。
   基準は日柱の空亡（天中殺）。

     空亡の後ろの支 = 「殺」／前の支 = 「中」／その1つ前 = 「天」
     「殺」の次の支から stage0 → stage8 が順に並ぶ

   年は年支で、月は節月の支で判定する。
   ══════════════════════════════════════════════════════════ */

/**
 * 12段階。mark は記号、label は段階の呼び名。
 * 鑑定書に載せる解説文は各自で用意してください（ここには入れていません）。
 */
export const UNSEI_STAGES = [
  { mark: '○',  label: '芽吹き', note: '新しい芽が顔を出す' },
  { mark: '○',  label: '成長',   note: '新緑がぐんぐん伸びる' },
  { mark: '○',  label: '開花',   note: '大輪の花が咲く' },
  { mark: '×',  label: '夏枯れ', note: '暑さで元気がなくなる' },
  { mark: '◎',  label: '満開',   note: '花の絶頂期' },
  { mark: '××', label: '落花',   note: '台風で花が散る' },
  { mark: '◎◎', label: '結実',   note: '実が大きく育つ' },
  { mark: '◎◎', label: '完熟',   note: '実が熟れて最盛期' },
  { mark: '◎◎', label: '収穫',   note: '実が落ち始める最終段階' },
  { mark: '天',  label: '下降',   note: '冬の訪れとともに弱っていく' },
  { mark: '中',  label: '停滞',   note: '枯れて何もなくなる' },
  { mark: '殺',  label: '充電',   note: '雪の下で種が力を蓄える' },
];

/** 日柱の空亡から「殺」にあたる支の番号を返す */
export function getSatsuIndex(dayKanshi) {
  return JUUNISHI.indexOf(getKuubou(dayKanshi)[1]);
}

/** 支の番号 → 12段階の番号 */
export function stageIndexOf(shiIdx, satsuIdx) {
  return ((shiIdx - (satsuIdx + 1)) % 12 + 12) % 12;
}

/** 西暦 → その年の干支 */
export function yearKanshiOf(y) {
  return kanshiName(((y - 4) % 60 + 60) % 60);
}

/**
 * 年運を出す。
 * @param {string} dayKanshi 日柱の干支
 * @param {number} fromYear 開始年
 * @param {number} [count=12] 何年分
 */
export function yearFortune(dayKanshi, fromYear, count = 12) {
  const satsu = getSatsuIndex(dayKanshi);
  return Array.from({ length: count }, (_, i) => {
    const y = fromYear + i;
    const ks = yearKanshiOf(y);
    const stageIdx = stageIndexOf(JUUNISHI.indexOf(ks[1]), satsu);
    return { year: y, kanshi: ks, stageIndex: stageIdx, ...UNSEI_STAGES[stageIdx] };
  });
}

/**
 * 月運を出す（節入り基準の月）。
 * @param {string} dayKanshi 日柱の干支
 * @param {number} fromYear 開始年
 * @param {number} fromMonth 開始月（1〜12）
 * @param {number} [count=12] 何ヶ月分
 */
export function monthFortune(dayKanshi, fromYear, fromMonth, count = 12) {
  const satsu = getSatsuIndex(dayKanshi);
  return Array.from({ length: count }, (_, i) => {
    const t = (fromMonth - 1 + i) % 12 + 1;
    const y = fromYear + Math.floor((fromMonth - 1 + i) / 12);
    const shi = SEKKI_SHI[t];
    const stageIdx = stageIndexOf(JUUNISHI.indexOf(shi), satsu);
    return { year: y, month: t, shi, stageIndex: stageIdx, ...UNSEI_STAGES[stageIdx] };
  });
}

/**
 * 天中殺の「天・中・殺」にあたる支を返す。
 * @returns {{天:string, 中:string, 殺:string}}
 */
export function tenchuShis(kuubou) {
  const chuIdx = JUUNISHI.indexOf(kuubou[0]);
  return { 天: JUUNISHI[(chuIdx + 11) % 12], 中: kuubou[0], 殺: kuubou[1] };
}

/**
 * 次にめぐってくる天中殺の3年を返す。
 * 最後の「殺」の年から遡って決める。「天」を起点にすると、
 * 天が過ぎたばかりで中・殺が目前という場合に12年先を返してしまうため。
 */
export function nextTenchuYears(dayKanshi, fromYear) {
  const shis = tenchuShis(getKuubou(dayKanshi));
  let satsuYear = fromYear;
  for (let y = fromYear; y < fromYear + 12; y++) {
    if (yearKanshiOf(y)[1] === shis.殺) { satsuYear = y; break; }
  }
  return { 天: satsuYear - 2, 中: satsuYear - 1, 殺: satsuYear };
}

/** 毎年めぐる天中殺の月（暦月） */
export function tenchuMonths(dayKanshi) {
  const shis = tenchuShis(getKuubou(dayKanshi));
  return { 天: SHI_TO_MONTH[shis.天], 中: SHI_TO_MONTH[shis.中], 殺: SHI_TO_MONTH[shis.殺] };
}
