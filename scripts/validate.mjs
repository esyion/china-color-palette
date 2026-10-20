#!/usr/bin/env node
// 一致性校验: 色库可复算 + 预设/落地表/文档引用的色名全部真实存在
// 任何一项不过就非零退出; 改数据或文档后跑 node scripts/validate.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const DB = JSON.parse(read('references/china-colors.json'));
const PRESETS = JSON.parse(read('references/presets.json'));
const names = new Set(DB.map(c => c.name));
const errors = [];
const warn = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);

const rgbOf = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const measure = hex => {
  const [r, g, b] = rgbOf(hex);
  const max = Math.max(r, g, b) / 255, min = Math.min(r, g, b) / 255, d = max - min;
  let h = 0;
  if (d) {
    if (max === r / 255) h = ((g - b) / 255 / d) % 6;
    else if (max === g / 255) h = (b - r) / 255 / d + 2;
    else h = (r - g) / 255 / d + 4;
    h = Math.round(h * 60); if (h < 0) h += 360;
  }
  const f = v => ((v /= 255) > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92);
  const y = 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  const li = Math.round((y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y) * 10) / 10;
  return { h, c: Math.round(d * 100), li };
};
const familyOf = ({ h, c, li }) => li <= 15 ? '黑' : li >= 88 && c <= 18 ? '白' : c <= 10 ? '灰'
  : h >= 15 && h < 50 && c <= 35 && li <= 65 ? '褐' : (h < 15 || h >= 335) && c <= 45 && li >= 75 ? '粉'
  : h < 15 || h >= 335 ? '红' : h < 40 ? '橙' : h < 70 ? '黄' : h < 95 ? '黄绿' : h < 160 ? '绿' : h < 200 ? '青' : h < 255 ? '蓝' : '紫';
const roleOf = ({ li, c }) => (c <= 20 && li >= 78) || (c <= 8 && li >= 45) ? '底' : li <= 35 ? '文' : c >= 65 && li >= 28 && li <= 78 ? '强' : '主';
const lab = hex => {
  const [r, g, b] = rgbOf(hex).map(v => ((v /= 255) > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92));
  const t = v => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
  const y = t(0.2126 * r + 0.7152 * g + 0.0722 * b);
  return [116 * y - 16, 500 * (t((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047) - y), 200 * (y - t((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883))];
};
const deltaE = (a, b) => { const [A, B] = [lab(a), lab(b)]; return Math.round(Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]) * 10) / 10; };

// 1) 色库自洽: 派生档必须能从 hex 复算出来, 防止手改数据或忘记重建
const seenName = new Set(), seenHex = new Map();
for (const c of DB) {
  if (!/^#[0-9A-F]{6}$/.test(c.hex)) err(c.name, `hex 非法 ${c.hex}`);
  if (seenName.has(c.name)) err(c.name, '色名重复'); else seenName.add(c.name);
  if (seenHex.has(c.hex)) warn.push(`${c.name} 与 ${seenHex.get(c.hex)} 同值 ${c.hex}`); else seenHex.set(c.hex, c.name);
  if (!c.py) err(c.name, '缺拼音');
  if (!Array.isArray(c.cmyk) || c.cmyk.length !== 4 || c.cmyk.some(v => !(v >= 0 && v <= 100))) err(c.name, `CMYK 非法 ${JSON.stringify(c.cmyk)}`);
  const m = measure(c.hex);
  for (const k of ['h', 'c', 'li']) if (Math.abs(m[k] - c[k]) > 0.05) err(c.name, `${k} 与 hex 复算不符: 存 ${c[k]} 算 ${m[k]} → 重跑 build-colors`);
  if (familyOf(m) !== c.family) err(c.name, `色系不符: 存 ${c.family} 算 ${familyOf(m)}`);
  if (roleOf(m) !== c.role) err(c.name, `角色不符: 存 ${c.role} 算 ${roleOf(m)}`);
}

// 2) 面积基准
const ROLES = ['底色', '主色', '辅色', '点缀'];
for (const [media, v] of Object.entries(PRESETS.比例基准)) {
  const miss = ROLES.filter(r => v[r] == null);
  if (miss.length) err(media, `占比缺角色 ${miss.join('/')}`);
  const sum = ROLES.reduce((a, r) => a + (v[r] || 0), 0);
  if (sum !== 100) err(media, `占比合计 ${sum} != 100`);
}

// 3) 预设
for (const g of PRESETS.分组) {
  if (!g.名称 || !g.预设) err('分组', '缺名称或预设');
  for (const [k, list] of Object.entries(g.预设 || {})) {
    if (!Array.isArray(list) || list.length < 2) err(k, '预设色数不足 2');
    list.forEach(n => { if (!names.has(n)) err(`${g.名称}/${k}`, `色名「${n}」不在色库`); });
    const dark = list.filter(n => names.has(n) && DB.find(c => c.name === n).li <= 35).length;
    if (list.length >= 3 && dark === list.length) warn.push(`${g.名称}/${k} 全是深色, 大面积无处落脚`);
  }
  for (const k of Object.keys(g.note || {})) if (!g.预设[k]) err(`${g.名称}.note`, `note 指向不存在的预设 ${k}`);
}

// 4) 文献色名落地表: 落地色必须存在, ΔE 必须可复算
const alias = PRESETS.文献色名落地;
let aliasCount = 0;
for (const [k, v] of Object.entries(alias)) {
  if (k.startsWith('_')) { if (k === '_说明' && !v) err('落地表', '_说明 为空'); continue; }
  aliasCount++;
  if (names.has(k)) err(`落地表.${k}`, '该色名已在色库内, 落地条目应删除');
  const target = DB.find(c => c.name === v.落地);
  if (!target) err(`落地表.${k}`, `落地色「${v.落地}」不在色库`);
  if (!/^#[0-9a-fA-F]{6}$/.test(v['参照'] || '')) err(`落地表.${k}`, `缺合法参照 hex: ${v['参照']}`);
  if (target && v['参照']) {
    const d = deltaE(v['参照'].toUpperCase(), target.hex);
    if (Math.abs(d - v['ΔE']) > 1.5) err(`落地表.${k}`, `ΔE 记 ${v['ΔE']} 实算 ${d}`);
    if (d > 22) err(`落地表.${k}`, `与参照观感偏差过大 ΔE=${d}, 需换落地色或删条目`);
  }
  if (!v.依据) err(`落地表.${k}`, '缺依据说明');
}

// 5) 文档里反引号包裹的中文词必须是真实色名/落地名; 其他词请用「」
const whitelist = new Set(['正色', '间色', '五行', '色系', '色名', '落地', '近似', '打样', '色卡', '底衬', '留白', '青瓷', '漆器', '丝绸', '景泰蓝', '汉服', '文创', '国潮']);
for (const file of ['references/color-knowledge.md', 'SKILL.md', 'README.md']) {
  const text = read(file);
  for (const n of [...new Set((text.match(/`([\u4e00-\u9fa5]{2,5})`/g) || []).map(s => s.slice(1, -1)))]) {
    if (names.has(n) || alias[n] || whitelist.has(n)) continue;
    err(file, `反引号里的「${n}」既不在色库也不在落地表 (非色名请用「」)`);
  }
  for (const p of [...text.matchAll(/(?:references|scripts|assets)\/[\w.\-一-龥]+/g)].map(m => m[0])) {
    if (!fs.existsSync(path.join(ROOT, p))) err(file, `引用了不存在的文件 ${p}`);
  }
}

// 6) SKILL.md 结构
const skill = read('SKILL.md');
const fm = /^---\n([\s\S]*?)\n---/.exec(skill);
if (!fm) err('SKILL.md', '缺 YAML frontmatter');
else {
  const grab = key => (new RegExp('^' + key + ':\\s*(.+)$', 'm').exec(fm[1]) || [])[1]?.trim();
  const name = grab('name');
  const desc = grab('description');
  if (name !== 'china-color-palette') err('frontmatter', `name 应为 china-color-palette, 现 ${name}`);
  if (!desc) err('frontmatter', '缺 description');
  else if (desc.length > 1200) warn.push(`description ${desc.length} 字, 可能过长`);
}
const lines = skill.split('\n').length;
if (lines > 200) warn.push(`SKILL.md ${lines} 行, 偏长`);
if (/为\s*null|RGB\s*为空|可能为\s*null/.test(skill)) err('SKILL.md', '仍在描述空值字段, 与色库实际不符');
if (/为\s*null|RGB\s*为空/.test(read('README.md'))) err('README.md', '仍在描述空值字段(v1.0.0 的说法)');

// 7) 索引与色库同步
const idx = read('references/colors-index.md');
const missing = DB.filter(c => !idx.includes(c.name));
if (missing.length) err('colors-index.md', `${missing.length} 个色名缺失: ${missing.slice(0, 5).map(c => c.name).join('/')}, 请重跑 build-colors`);

console.log(JSON.stringify({
  检查: '色库自洽 / 面积基准 / 预设 / 落地表 / 文档引用 / SKILL 结构 / 索引同步',
  色库: DB.length, 落地条目: aliasCount, 预设: PRESETS.分组.reduce((a, g) => a + Object.keys(g.预设).length, 0),
  行数: { SKILL: lines, 知识库: read('references/color-knowledge.md').split('\n').length },
}, null, 1));
warn.forEach(w => console.log('提示  ' + w));
if (errors.length) { errors.forEach(e => console.error('错误  ' + e)); console.error(`共 ${errors.length} 项不一致`); process.exit(1); }
console.log('全部一致 ✓');
