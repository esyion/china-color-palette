#!/usr/bin/env node
// 中国色配色引擎: 色值、占比、对比度一律在此计算, 不要在对话里手工推算
// 用法: node scripts/palette.mjs <命令> [参数]   (路径相对本 skill 根目录)
//   stats                          色库健康度 + 各角色可用色数
//   search --family 青 --role 底    按色系/角色/明度/彩度检索 (--json / --ids / --limit)
//   nearest 天青|hex [n]           视觉最接近的库内色 (ΔE76, 只是近似, 不代表文献对应色值)
//   check 月白 天青                 色名是否在库内
//   presets                         列出可用的朝代/节日/器物预设
//   build <主题> [底色=月白:60 主色=碧青:20 辅色=苍绿:15 点缀=朱红:5]
//         [--from-preset 宋代淡雅] [--media 空间|界面|印刷|服饰|通用]
//         [--md out/x.md --css out/x.css --tailwind out/x.json --svg out/x.svg --json out/x.json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, 'references', f), 'utf8'));
const DB = read('china-colors.json');
const PRESETS = read('presets.json');
const MEDIA = PRESETS.比例基准;
const INDEX = new Map(DB.map(c => [c.name, c]));
const ROLES = ['底色', '主色', '辅色', '点缀'];
const ROLE_ALIAS = { 底色: 'bg', 主色: 'primary', 辅色: 'secondary', 点缀: 'accent' };

const argv = process.argv.slice(2);
const cmd = argv.shift() || 'stats';
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const flag = k => argv.includes('--' + k);
const num = (k, d) => Number(opt(k, d));
const say = (...m) => console.log(...m);
const die = (m, code = 2) => { console.error(m); process.exit(code); };

const rgbOf = c => c.rgb || [1, 3, 5].map(i => parseInt(c.hex.slice(i, i + 2), 16));
const f2 = v => ((v /= 255) > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92);
const lab = c => {
  const [r, g, b] = rgbOf(c).map(f2);
  const t = v => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
  const x = t((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
  const y = t(0.2126 * r + 0.7152 * g + 0.0722 * b);
  const z = t((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
};
const deltaE = (a, b) => { const [A, B] = [lab(a), lab(b)]; return Math.round(Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]) * 10) / 10; };
const relLum = c => { const [r, g, b] = rgbOf(c).map(f2); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [relLum(a), relLum(b)].sort((m, n) => n - m); return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100; };
const textOn = c => (relLum(c) > 0.35 ? '#1A1A1A' : '#FFFFFF');

function search() {
  const list = s => s ? s.split(',') : null;
  const fam = list(opt('family')), role = list(opt('role')), wx = list(opt('wuxing')), kw = list(opt('name'));
  const onlyZheng = flag('zhengse');
  let rows = DB.filter(c =>
    (!fam || fam.includes(c.family)) && (!role || role.includes(c.role)) && (!wx || wx.includes(c.wx)) &&
    (!kw || kw.some(k => c.name.includes(k) || c.py.startsWith(k))) && (!onlyZheng || c.zx) &&
    c.li >= num('li-min', 0) && c.li <= num('li-max', 100) &&
    c.c >= num('c-min', 0) && c.c <= num('c-max', 100) &&
    c.h >= num('h-min', 0) && c.h <= num('h-max', 360));
  const total = rows.length;
  if (flag('dedupe-family')) { const seen = new Set(); rows = rows.filter(c => !seen.has(c.family) && seen.add(c.family)); }
  const limit = num('limit', 0);
  if (limit > 0) rows = rows.slice(0, limit);
  if (flag('ids')) return say(rows.map(c => c.name).join(' '));
  if (flag('json')) return say(JSON.stringify(rows, null, 1));
  say(rows.map(c => `${c.name}(${c.py})\t${c.hex}\t${c.family}/${c.wx}${c.zx ? ' 正色' : ''}\t${c.role}\tL*${c.li} c${c.c} h${c.h}\trgb(${rgbOf(c).join(' ')})`).join('\n'));
  say(`# 命中 ${total} 色，显示 ${rows.length} 色 / 库内共 ${DB.length} 色`);
}

function nearest() {
  const [target, n] = argv;
  const alias = PRESETS.文献色名落地[target];
  const known = INDEX.get(target);
  if (alias && !known) {
    const a = INDEX.get(alias.落地);
    if (!a) die(`落地表指向的「${alias.落地}」不在库内, 请重跑 build-colors 并用 validate 检查`);
    say(`# 「${target}」不在 526 色库内。预设落地色: ${a.name} ${a.hex}（ΔE76≈${alias['ΔE']}, 依据: ${alias.依据}）`);
    say(`# 这是观感近似, 不是「${target}」的权威色值; 对外表述必须这样说明。同族其它近似:`);
    argv[0] = a.hex; return nearestRaw(n);
  }
  const hex = known ? known.hex : /^#[0-9a-f]{6}$/i.test(target || '') ? target.toUpperCase() : null;
  if (!hex) die('用法: nearest <库内色名 | 文献色名 | #RRGGBB> [n]');
  if (!known && !alias) say(`# 「${target}」既不在库内也不在落地表里。以下只是与你给的 hex/色名视觉最接近的库内色, 不能当作该色名的权威色值。`);
  return nearestRaw(n);
}

function nearestRaw(n) {
  const target = argv[0];
  const hex = /^#[0-9a-f]{6}$/i.test(target) ? target.toUpperCase() : INDEX.get(target).hex;
  const rows = DB.map(c => ({ c, d: deltaE(c, { hex }) })).sort((a, b) => a.d - b.d).slice(0, Number(n || 8));
  say(rows.map(({ c, d }) => `ΔE ${String(d).padStart(5)}\t${c.name}(${c.py})\t${c.hex}\t${c.family}/${c.wx}\t${c.role}`).join('\n'));
}

function stats() {
  const tally = fn => DB.reduce((m, c) => ((m[fn(c)] = (m[fn(c)] || 0) + 1), m), {});
  const badPreset = PRESETS.分组.flatMap(g => Object.entries(g.预设).flatMap(([k, v]) => v.filter(c => !INDEX.has(c)).map(c => `${g.名称}/${k} -> ${c} 不在库内`)));
  const badRatio = Object.entries(MEDIA).flatMap(([m, v]) => ROLES.filter(r => v[r] == null).length !== 0 || ROLES.reduce((a, r) => a + (v[r] || 0), 0) !== 100 ? [`${m}: ${JSON.stringify(v)}`] : []);
  const dup = DB.map(c => c.hex).filter((h, i, a) => a.indexOf(h) !== i);
  say(JSON.stringify({
    色库总数: DB.length, 色系分布: tally(c => c.family), 角色分布: tally(c => c.role),
    正色数: DB.filter(c => c.zx).length, 缺CMYK: DB.filter(c => !c.cmyk).length,
    上游字段矛盾色: DB.filter(c => c.note).map(c => c.name), 重复hex: [...new Set(dup)],
    比例基准异常: badRatio, 预设引用失效: badPreset,
    底色候选: DB.filter(c => c.role === '底').length, 文字候选: DB.filter(c => c.role === '文').length,
    强调候选: DB.filter(c => c.role === '强').length,
  }, null, 1));
}

function presets() {
  say(PRESETS.分组.map(g => `## ${g.名称} — ${g.说明 || ''}\n` + Object.entries(g.预设).map(([k, v]) =>
    `${k}: ${v.map((c, i) => `${ROLES[i]}=${c}(${INDEX.get(c)?.hex || '不在库内'})`).join(' ')}`).join('\n')
    + (g.note ? '\n' + Object.entries(g.note).map(([k, v]) => `  · ${k}: ${v}`).join('\n') : '')).join('\n\n'));
  say('\n比例基准(' + Object.keys(MEDIA).join('/') + '): ' + ROLES.map(r => `${r}${MEDIA.通用[r]}%`).join('/'));
}

// 带值选项: 它们的取值不是位置参数(Windows 路径里的盘符冒号会被误当色名分隔符)
const VALUE_FLAGS = new Set(['media', 'from-preset', 'md', 'css', 'tailwind', 'svg', 'json', 'family', 'role', 'wuxing', 'name', 'li-min', 'li-max', 'c-min', 'c-max', 'h-min', 'h-max', 'limit']);

function specs() {
  const out = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { if (VALUE_FLAGS.has(a.slice(2))) i++; continue; }
    if (/^-?\d+$/.test(a) || /^-/.test(a)) continue;
    const m = /^([^=:]+)[=:]([^=:]+?)(?::(\d+(?:\.\d+)?))?$/.exec(a);
    if (!m) continue;
    let [, role, name, pct] = m;
    if (!ROLES.includes(role)) role = '主色';
    out.push({ role, name, pct: pct == null ? null : Number(pct) });
  }
  return out;
}

function build() {
  const theme = argv[0] && !argv[0].startsWith('--') && !/[=:]/.test(argv[0]) ? argv[0] : '中国色配色方案';
  const media = opt('media', '通用');
  if (!MEDIA[media]) die(`未知媒介「${media}」, 可用: ${Object.keys(MEDIA).join('/')}`);
  const base = MEDIA[media];
  const chosen = specs();
  let presetName = opt('from-preset'), presetNote = '';
  if (presetName) {
    const grp = PRESETS.分组.find(g => g.预设[presetName]);
    if (!grp) die(`预设不存在: ${presetName}\n用 presets 命令查看可用预设`);
    grp.预设[presetName].forEach((name, i) => chosen.push({ role: ROLES[i], name, pct: null }));
    presetNote = (grp.note || {})[presetName] || '';
    say(`# 取自预设「${presetName}」(${grp.名称})${presetNote ? ' — ' + presetNote : ''}`);
  }
  if (!chosen.length) die('未指定颜色。例: node scripts/palette.mjs build "宋式书斋" 底色=月白:60 主色=碧青:20 辅色=苍绿:15 点缀=朱红:5');
  const byRole = new Map();
  chosen.forEach(s => { if (!byRole.has(s.role)) byRole.set(s.role, s); });
  const missing = [];
  const colors = ROLES.map(role => {
    const s = byRole.get(role);
    if (!s) return null;
    const color = INDEX.get(s.name);
    if (!color) { missing.push(`${s.name}(${role})`); return null; }
    return { role, pct: s.pct != null ? s.pct : base[role], color };
  }).filter(Boolean);
  if (missing.length) die(`色名不在库内: ${missing.join(', ')}\n色库只有 ${DB.length} 个真实色名; 用 search / nearest 换色, 不得编造色名或色值。`);
  const notes = [];
  if (presetNote) notes.push(presetNote);
  const sum = colors.reduce((a, c) => a + (c.pct || 0), 0);
  if (Math.abs(sum - 100) > 0.01) notes.push(`占比合计 ${sum}%, 未归一到 100%`);
  const bg = colors.find(c => c.role === '底色') || colors.find(c => c.color.role === '底');
  const darks = colors.filter(c => c.color.role === '文' && c !== bg);
  if (!bg) notes.push('缺底色(大面积承载面): 高彩度传统色直接铺大面积会刺眼, 建议补一个 role=底 的中性色');
  if ((!bg || bg.color.li >= 40) && !darks.length) notes.push('缺文字/线条色: 浅底正文需一个 role=文 的深色, 用 search --role 文 挑选');
  const loud = colors.filter(c => c.color.c > 65 && c.pct >= 40);
  if (loud.length) notes.push(`高彩度色大面积: ${loud.map(c => `${c.color.name} ${c.pct}%`).join('、')} —— 大面积宜让给中性色, 正色多做主视觉小块或点缀`);
  if (media === '印刷') { const drift = colors.filter(c => c.color.note); if (drift.length) notes.push(`${drift.map(c => c.color.name).join(' ')} 上游色值字段本身矛盾, 印刷前必须打样`); }
  const pairs = [];
  colors.forEach(a => colors.forEach(b => { if (a !== b) pairs.push({ a, b, r: contrast(a.color, b.color) }); }));
  if (bg) {
    const dark = bg.color.li < 40;
    const cand = (dark ? colors.filter(c => c !== bg && c.color.li >= 70) : darks).map(c => ({ c, r: contrast(c.color, bg.color) })).sort((x, y) => y.r - x.r);
    if (!cand.length) notes.push(dark ? `底色 ${bg.color.name} 偏深, 文字需浅色: 方案里没有 L*≥70 的浅色, 用 search --role 底 补一个` : `方案里没有 role=文 的深色文字色: 用 search --role 文 补一个`);
    else if (cand[0].r < 4.5) notes.push(`${dark ? '浅色文字' : '深色文字'} ${cand[0].c.color.name} 压在 ${bg.color.name} 上只有 ${cand[0].r}:1, 未达 WCAG AA 4.5:1 —— 换对比更强的一对`);
    else notes.push(`正文可用配对: ${cand[0].c.color.name} 于 ${bg.color.name} = ${cand[0].r}:1 (AA)`);
  }

  const L = [];
  L.push(`# ${theme} · 中国色配色`);
  L.push('');
  L.push(`> 媒介 ${media}｜基准占比 ${ROLES.map(r => `${r}${base[r]}%`).join('/')}｜色值取自 ${DB.length} 色库, RGB/CMYK/对比度由脚本计算`);
  L.push('');
  L.push('| 角色 | 色名 | 拼音 | HEX | RGB | CMYK(上游印刷值) | L* / 彩度 / 色相 | 五行 | 占比 |');
  L.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  colors.forEach(c => L.push(`| ${c.role} | ${c.color.name} | ${c.color.py} | \`${c.color.hex}\` | ${rgbOf(c.color).join(', ')} | ${(c.color.cmyk || ['待核']).join('/')} | ${c.color.li} / ${c.color.c} / ${c.color.h} | ${c.color.wx}${c.color.zx ? ' 正色' : ' 间色'} | ${c.pct}% |`));
  L.push('');
  L.push('## 落地区域');
  colors.forEach(c => L.push(`- **${c.role} ${c.color.name}** (${c.pct}%): ${usage(c, bg, pairs)}`));
  L.push('');
  L.push('## 对比度 (WCAG)');
  const ok = pairs.filter(p => p.r >= 3).sort((x, y) => y.r - x.r).slice(0, 6);
  if (ok.length) ok.forEach(p => L.push(`- ${p.a.color.name} 于 ${p.b.color.name}: **${p.r}:1** ${p.r >= 4.5 ? 'AA 正文可用' : '仅大字号/图形元素'}`));
  else L.push('- 方案内没有 ≥3:1 的配对: 需引入 role=底 的浅色或 role=文 的深色');
  const collide = [...new Set(pairs.filter(p => p.r < 1.3).map(p => `${p.a.color.name}/${p.b.color.name}`))];
  if (collide.length) L.push(`- 不宜作前后景叠压（<1.3:1）: ${collide.join('、')}`);
  if (notes.length) { L.push(''); L.push('## 校验提示'); notes.forEach(n => L.push(`- ${n}`)); }
  const md = L.join('\n');

  const put = (k, text) => { const f = opt(k); if (!f) return; const p = path.isAbsolute(f) ? f : path.join(ROOT, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); console.error(`→ ${path.relative(ROOT, p)}`); };
  put('md', md);
  const ink = inkFor(bg, darks);
  put('css', `:root {\n${colors.map(c => `  --cc-${ROLE_ALIAS[c.role]}: ${c.color.hex.toLowerCase()};`).join('\n')}\n  --cc-ink: ${ink.hex.toLowerCase()}; /* ${ink.name} */\n}\n\n/* ${theme} */\n.cc-surface { background: ${bg ? bg.color.hex.toLowerCase() : 'transparent'}; color: var(--cc-ink); }\n.cc-title { color: ${hexOfRole(colors, '主色')}; }\n.cc-detail { color: ${hexOfRole(colors, '点缀')}; }\n`);
  put('tailwind', JSON.stringify({ colors: Object.fromEntries(colors.map(c => [`china${ROLE_ALIAS[c.role][0].toUpperCase()}${ROLE_ALIAS[c.role].slice(1)}`, c.color.hex.toLowerCase()])) }, null, 2));
  put('svg', svgCard(colors, theme));
  put('json', JSON.stringify({ 主题: theme, 媒介: media, 预设: presetName || null, 取色: colors.map(c => ({ 角色: c.role, 色名: c.color.name, hex: c.color.hex, 占比: c.pct, 库内角色: c.color.role })), 对比度: pairs.filter(p => p.r >= 3).map(p => ({ 前景: p.a.color.name, 背景: p.b.color.name, 比值: p.r })), 提示: notes }, null, 1));
  say(md);
}

const hexOfRole = (colors, role) => (colors.find(c => c.role === role) || colors.find(c => c.role === '主色') || { color: { hex: '#000000' } }).color.hex.toLowerCase();

// 正文墨色: 优先方案内 role=文 的色, 否则从库内取与底色对比达标的最深/最浅色; 绝不引入库外色值
function inkFor(bg, darks) {
  if (darks[0]) return { hex: darks[0].color.hex, name: darks[0].color.name };
  const wantLight = !!bg && bg.color.li < 40;
  const pool = DB.filter(c => (wantLight ? c.li >= 85 : c.li <= 25) && (!bg || contrast(c, bg.color) >= 4.5))
    .sort((a, b) => (wantLight ? b.li - a.li : a.li - b.li));
  return pool[0] ? { hex: pool[0].hex, name: pool[0].name } : { hex: wantLight ? '#FFFFFF' : '#222222', name: '库内无达标色, 兜底灰' };
}

function svgCard(colors, theme) {
  const cols = Math.min(5, colors.length), rows = Math.ceil(colors.length / cols), w = 150, h = 190;
  const rect = cols * w, height = rows * h + 34;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${rect}" height="${height}" viewBox="0 0 ${rect} ${height}" font-family="system-ui,'Microsoft YaHei',sans-serif">` +
    `<text x="12" y="22" font-size="14" fill="#222">${theme}</text>` +
    colors.map((c, i) => {
      const x = (i % cols) * w, y = 34 + Math.floor(i / cols) * h;
      return `<rect x="${x}" y="${y}" width="${w}" height="${h - 46}" fill="${c.color.hex}"/>` +
        `<text x="${x + 10}" y="${y + h - 28}" font-size="13" fill="#222">${c.color.name} ${c.pct}%</text>` +
        `<text x="${x + 10}" y="${y + h - 10}" font-size="11" fill="#666">${c.color.hex} · ${c.role}</text>`;
    }).join('') + '</svg>';
}

function usage(c, bg, pairs) {
  const area = { 底色: '背景/留白/底衬, 承载其余颜色', 主色: '主视觉块、标题、包装主面', 辅色: '分区、辅助图形、衬托主色', 点缀: '印章、按钮、描金、细节高光' };
  const k = c.color.role;
  const extra = k === '文' ? '；可作文字/线条色' : k === '强' ? '；高彩度强调, 面积要收住' : k === '底' ? '；中性可大面积' : '';
  const on = k === '文' && bg ? `（压在 ${bg.color.name} 上 ${contrast(c.color, bg.color)}:1）` : '';
  return area[c.role] + extra + on;
}

const commands = { stats, search, nearest, build, presets, check: () => argv.forEach(n => say(`${n}\t${INDEX.has(n) ? INDEX.get(n).hex + ' 在库' : '不在库内 ← 必须换色'}`)) };
if (!commands[cmd]) die(`未知命令: ${cmd}\n可用: ${Object.keys(commands).join(', ')}`);
commands[cmd]();
