/**
 * 自己検証。実物の鑑定書と結果が一致するかを確かめます。
 *
 *   node test.js
 *
 * 使う前に一度これを走らせて、すべて ✅ になることを確認してください。
 */
import { calcMeishiki, yearFortune, monthFortune, nextTenchuYears, tenchuMonths } from './meishiki.js';

let fail = 0;
const check = (label, got, want) => {
  const ok = got === want;
  if (!ok) fail++;
  console.log(`  ${ok ? '✅' : '❌'} ${label}${ok ? '' : `  期待=${want} / 実際=${got}`}`);
};

/* ── 検証1：1990年8月29日 女性 ───────────────────────────
   四柱推命協会のサンプル鑑定書と照合 */
console.log('\n[1] 1990年8月29日 女性');
{
  const m = calcMeishiki(1990, 8, 29, '女');
  check('日柱', m.dayKanshi, '丙寅');
  check('月柱', m.monthKanshi, '甲申');
  check('年柱', m.yearKanshi, '庚午');
  check('天中殺', m.tenchu.day, '戌亥');
  check('月柱の通変星', m.tsuuhensei.month, '偏印');
  check('年柱の通変星', m.tsuuhensei.year, '偏財');
  check('日柱の蔵干通変星', m.zoukanTsuuhensei.day, '偏印');
  check('月柱の蔵干通変星', m.zoukanTsuuhensei.month, '偏財');
  check('年柱の蔵干通変星', m.zoukanTsuuhensei.year, '劫財');
  check('日柱の十二運星', m.unsei.day, '長生');
  check('月柱の十二運星', m.unsei.month, '病');
  check('年柱の十二運星', m.unsei.year, '帝旺');
}

/* ── 検証2：1978年1月2日 男性 ───────────────────────────
   別のサンプル鑑定書と照合。1月生まれなので年柱が前年になる例 */
console.log('\n[2] 1978年1月2日 男性（立春前なので年柱は1977年扱い）');
{
  const m = calcMeishiki(1978, 1, 2, '男');
  check('日柱', m.dayKanshi, '甲子');
  check('月柱', m.monthKanshi, '壬子');
  check('年柱', m.yearKanshi, '丁巳');
  check('日柱の天中殺', m.tenchu.day, '戌亥');
  check('年柱の天中殺', m.tenchu.year, '子丑');
  check('日柱の蔵干通変星', m.zoukanTsuuhensei.day, '印綬');
  check('月柱の十二運星', m.unsei.month, '沐浴');
  check('年柱の十二運星', m.unsei.year, '病');
}

/* ── 検証3：年運（サンプル鑑定書の2025〜2036年と照合） ── */
console.log('\n[3] 年運 2025〜2036年（1978年1月2日 男性）');
{
  const want = ['××', '◎◎', '◎◎', '◎◎', '天', '中', '殺', '○', '○', '○', '×', '◎'];
  const got = yearFortune('甲子', 2025, 12);
  let ng = 0;
  got.forEach((g, i) => { if (g.mark !== want[i]) { console.log(`  ❌ ${g.year}年: 期待=${want[i]} / 実際=${g.mark}`); ng++; fail++; } });
  if (!ng) console.log('  ✅ 12年分すべて一致');
}

/* ── 検証4：月運（サンプル鑑定書の9月〜翌8月と照合） ── */
console.log('\n[4] 月運 9月〜翌8月（1978年1月2日 男性）');
{
  const want = ['天', '中', '殺', '○', '○', '○', '×', '◎', '××', '◎◎', '◎◎', '◎◎'];
  const got = monthFortune('甲子', 2025, 9, 12);
  let ng = 0;
  got.forEach((g, i) => { if (g.mark !== want[i]) { console.log(`  ❌ ${g.month}月: 期待=${want[i]} / 実際=${g.mark}`); ng++; fail++; } });
  if (!ng) console.log('  ✅ 12ヶ月分すべて一致');
}

/* ── 検証5：天中殺の年・月 ─────────────────────────── */
console.log('\n[5] 天中殺のめぐり（甲子日＝戌亥天中殺）');
{
  const y = nextTenchuYears('甲子', 2026);
  check('天の年', y.天, 2029);
  check('中の年', y.中, 2030);
  check('殺の年', y.殺, 2031);
  const mo = tenchuMonths('甲子');
  check('天の月', mo.天, 9);
  check('中の月', mo.中, 10);
  check('殺の月', mo.殺, 11);
}

/* ── 検証6：12段階が過不足なく並ぶか（6種の天中殺すべて） ── */
console.log('\n[6] 6種の天中殺すべてで12段階が1回ずつ並ぶか');
{
  let ng = 0;
  for (const d of ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅']) {
    const list = yearFortune(d, 2026, 12);
    const uniq = new Set(list.map((x) => x.stageIndex));
    if (uniq.size !== 12) { console.log(`  ❌ ${d}日: ${uniq.size}段階しかない`); ng++; fail++; }
  }
  if (!ng) console.log('  ✅ 6種すべて12段階そろっている');
}

console.log(fail === 0
  ? '\n✅ すべて一致しました。安心して使えます。\n'
  : `\n❌ ${fail}件の不一致があります。\n`);
process.exitCode = fail ? 1 : 0;
