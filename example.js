/**
 * 使い方の例。命式を表にして表示します。
 *
 *   node example.js 1990 8 29 女
 *   node example.js                 ← 引数なしなら 1990-08-29 女性
 */
import {
  calcMeishiki, yearFortune, monthFortune,
  gogyouOfKan, gogyouOfShi, KAN_YOMI, nextTenchuYears, tenchuMonths,
} from './meishiki.js';

const [y = 1990, m = 8, d = 29, sex = '女'] = process.argv.slice(2);
const meishiki = calcMeishiki(Number(y), Number(m), Number(d), sex);
const r = meishiki;

const go = (kan, shi) => {
  const a = gogyouOfKan(kan), b = gogyouOfShi(shi);
  return `${a.sign}${a.gogyou}/${b.sign}${b.gogyou}`;
};

console.log(`\n${y}年${m}月${d}日 ${sex}性の命式`);
console.log('═'.repeat(52));

const rows = [
  ['', '日柱', '月柱', '年柱'],
  ['干支', r.dayKanshi, r.monthKanshi, r.yearKanshi],
  ['五行', go(r.dayKanshi[0], r.dayKanshi[1]), go(r.monthKanshi[0], r.monthKanshi[1]), go(r.yearKanshi[0], r.yearKanshi[1])],
  ['蔵干', r.zoukan.day, r.zoukan.month, r.zoukan.year],
  ['通変星', '—', r.tsuuhensei.month, r.tsuuhensei.year],
  ['蔵干通変星', r.zoukanTsuuhensei.day, r.zoukanTsuuhensei.month, r.zoukanTsuuhensei.year],
  ['十二運星', r.unsei.day, r.unsei.month, r.unsei.year],
];
const w = [12, 12, 12, 12];
for (const row of rows) {
  console.log(row.map((c, i) => String(c).padEnd(w[i] - [...String(c)].filter((ch) => ch.charCodeAt(0) > 255).length)).join(''));
}

console.log('─'.repeat(52));
console.log(`日干　　　　${r.nikkan}（${KAN_YOMI[r.nikkan]}）`);
console.log(`天中殺　　　日柱 ${r.tenchu.day} ／ 年柱 ${r.tenchu.year}`);
console.log(`運勢エネルギー　${r.energy.total} / 36（日${r.energy.day} 月${r.energy.month} 年${r.energy.year}）`);

const ch = r.chusatsu;
const names = [];
if (ch.seinichi) names.push('生日中殺');
if (ch.seigetsu) names.push('生月中殺');
if (ch.seinen) names.push('生年中殺');
if (ch.hiza.year || ch.hiza.month || ch.hiza.day) names.push('日座中殺');
console.log(`中殺　　　　${names.length ? names.join('・') : 'なし'}`);

console.log(`\n大運（${r.daiunDirection}・${r.startingAge}才から）`);
let from = 0;
r.daiun.forEach((x, i) => {
  const to = i === 0 ? r.startingAge : from + 10;
  console.log(`  ${String(from).padStart(2)}〜${String(to).padStart(2)}才  ${x.kanshi}  ${x.tsuuhensei}  ${x.unsei}  E${x.energy}`);
  from = to;
});

const now = new Date();
console.log(`\n年運（${now.getFullYear()}年から12年）`);
for (const f of yearFortune(r.dayKanshi, now.getFullYear())) {
  console.log(`  ${f.year}年  ${f.kanshi}  ${f.mark.padEnd(2)}  ${f.label}（${f.note}）`);
}

console.log(`\n月運（${now.getMonth() + 1}月から12ヶ月）`);
for (const f of monthFortune(r.dayKanshi, now.getFullYear(), now.getMonth() + 1)) {
  console.log(`  ${f.year}年${String(f.month).padStart(2)}月  ${f.shi}月  ${f.mark.padEnd(2)}  ${f.label}`);
}

const ty = nextTenchuYears(r.dayKanshi, now.getFullYear());
const tm = tenchuMonths(r.dayKanshi);
console.log(`\n天中殺　${r.tenchu.day}`);
console.log(`  年：${ty.天}(天) → ${ty.中}(中) → ${ty.殺}(殺)`);
console.log(`  月：${tm.天}月(天) → ${tm.中}月(中) → ${tm.殺}月(殺)\n`);
