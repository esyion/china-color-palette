#!/usr/bin/env node
// 从上游重建 references/china-colors.json 与 references/colors-index.md
//   node scripts/build-colors.mjs              拉取上游并重建
//   node scripts/build-colors.mjs --offline     只用 .cache 里的上游快照
//   node scripts/build-colors.mjs --check        只报告色库与上游的差异, 不写文件
// 数据原则: 只存事实与可复算字段。RGB 由 hex 换算(脚本内做), 不重复入库;
// CMYK 用上游给的印刷值, 不做公式换算; 色系/五行按下方登记过的规则从 hex 复算。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'references', 'china-colors.json');
const INDEX = path.join(ROOT, 'references', 'colors-index.md');
const CACHE = path.join(ROOT, '.cache', 'zhongguose-colors.json');
const SOURCE_URL = 'https://zhongguose.com/colors.json';
const args = process.argv.slice(2);
const has = f => args.includes(f);

async function loadUpstream() {
  if (fs.existsSync(CACHE) && (has('--offline') || has('--check'))) return JSON.parse(fs.readFileSync(CACHE, 'utf8'));
  if (has('--offline')) throw new Error('无上游快照, 请先去掉 --offline 跑一次');
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`拉取失败 ${res.status} ${SOURCE_URL}`);
  const text = await res.text();
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  fs.writeFileSync(CACHE, text);
  return JSON.parse(text);
}

export const rgbFromHex = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const hexFromRgb = rgb => ('#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('')).toUpperCase();

// h: HSL 色相; c: 彩度(max-min)/255; li: CIE L* 明度。HSL 的 S 在近白近黑处会失真, 故不用它做归档。
export function measure(hex) {
  const [r, g, b] = rgbFromHex(hex);
  const max = Math.max(r, g, b) / 255, min = Math.min(r, g, b) / 255, d = max - min;
  let h = 0;
  if (d) {
    if (max === r / 255) h = ((g - b) / 255 / d) % 6;
    else if (max === g / 255) h = (b - r) / 255 / d + 2;
    else h = (r - g) / 255 / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  const f = v => (v /= 255) > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92;
  const y = 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  const li = Math.round((y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y) * 10) / 10;
  return { h, c: Math.round(d * 100), li };
}

// 判定顺序即优先级: 先无彩色(黑/白/灰), 再褐/粉, 后按色相。规则同步登记在 references/color-knowledge.md
export function familyOf({ h, c, li }) {
  if (li <= 15) return '黑';
  if (li >= 88 && c <= 18) return '白';
  if (c <= 10) return '灰';
  if (h >= 15 && h < 50 && c <= 35 && li <= 65) return '褐';
  if ((h < 15 || h >= 335) && c <= 45 && li >= 75) return '粉';
  if (h < 15 || h >= 335) return '红';
  if (h < 40) return '橙';
  if (h < 70) return '黄';
  if (h < 95) return '黄绿';
  if (h < 160) return '绿';
  if (h < 200) return '青';
  if (h < 255) return '蓝';
  return '紫';
}

// 青赤黄白黑为五正色; 绿/黄绿归青(木), 橙归赤(火), 粉归赤(火), 褐归黄(土), 紫/灰为间色
export const WUXING = { 青: '木', 绿: '木', 黄绿: '木', 蓝: '木', 红: '火', 橙: '火', 粉: '火', 黄: '土', 褐: '土', 白: '金', 黑: '水', 灰: '间', 紫: '间' };
export const ZHENGSE = ['青', '绿', '黄绿', '红', '黄', '白', '黑'];

// 落位角色: 底=可大面积承载的中性浅/灰面, 文=可作文字线条的深色, 强=高彩度强调色, 主=其余
export const roleOf = ({ li, c }) =>
  (c <= 20 && li >= 78) || (c <= 8 && li >= 45) ? '底'
    : li <= 35 ? '文'
      : c >= 65 && li >= 28 && li <= 78 ? '强'
        : '主';

const build = upstream => {
  const rows = [];
  const conflicts = [];
  const seen = new Map();
  const dupHex = [];
  for (const c of upstream) {
    const hex = c.hex.toUpperCase();
    const m = measure(hex);
    const family = familyOf(m);
    const row = { name: c.name, py: c.pinyin, hex, h: m.h, c: m.c, li: m.li, family, wx: WUXING[family], zx: ZHENGSE.includes(family) ? 1 : 0, role: roleOf(m) };
    if (c.CMYK) row.cmyk = c.CMYK;
    const fromRgb = hexFromRgb(c.RGB || []);
    if (c.RGB && fromRgb !== hex) {
      row.note = '上游 hex 与 RGB 字段矛盾, 此处取 hex';
      conflicts.push({ name: c.name, hex, rgbField: fromRgb, upstreamCmyk: c.CMYK });
    }
    if (seen.has(hex)) dupHex.push(`${seen.get(hex)}/${c.name} ${hex}`); else seen.set(hex, c.name);
    rows.push(row);
  }
  return { rows, conflicts, dupHex };
};

async function main() {
  const upstream = await loadUpstream();
  const { rows, conflicts, dupHex } = build(upstream);

  if (has('--check')) {
    const current = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    const prev = new Map(current.map(r => [r.name, r.hex]));
    const next = new Map(rows.map(r => [r.name, r.hex]));
    const changed = rows.filter(r => prev.has(r.name) && prev.get(r.name) !== r.hex).map(r => `${r.name} ${prev.get(r.name)}->${r.hex}`);
    console.log(JSON.stringify({
      mode: 'check', 上游: rows.length, 现有: current.length,
      色值变更: changed, 库内多余: current.filter(c => !next.has(c.name)).map(c => c.name), 上游新增: rows.filter(r => !prev.has(r.name)).map(r => `${r.name} ${r.hex}`),
    }, null, 1));
    if (changed.length || !current.length) process.exitCode = 1;
    return;
  }

  const json = '[\n' + rows.map(r => ' ' + JSON.stringify(r)).join(',\n') + '\n]\n';
  fs.writeFileSync(OUT, json);

  const order = ['黑', '白', '灰', '褐', '粉', '红', '橙', '黄', '黄绿', '绿', '青', '蓝', '紫'];
  const fam = Object.fromEntries(order.map(f => [f, rows.filter(r => r.family === f)]));
  const md = ['# 色名索引（由 scripts/build-colors.mjs 生成，请勿手改）',
    '',
    `全 ${rows.length} 色，按 hex 实测色相归档。族内按明度 L\* 从高到低排列，每格 \`色名(拼音) HEX\`。`,
    '五行与角色为派生标记（规则见 references/color-knowledge.md）；需要 RGB/CMYK/HSL 等完整字段时用',
    '`node scripts/palette.mjs search`，不要把整份 china-colors.json 读进上下文。',
    '',
    ...order.flatMap(f => [
      `## ${f} · ${fam[f].length} 色（五行 ${WUXING[f]}${ZHENGSE.includes(f) ? '，正色' : '，间色'}）`,
      '',
      fam[f].slice().sort((a, b) => b.li - a.li).map(r => `${r.name}(${r.py}) ${r.hex}`).join(' · '),
      '',
    ]),
  ].join('\n') + '\n';
  fs.writeFileSync(INDEX, md);

  console.log(JSON.stringify({
    written: [path.relative(ROOT, OUT), path.relative(ROOT, INDEX)].map(p => `${p} ${Buffer.byteLength(fs.readFileSync(path.join(ROOT, p)))}B`),
    总数: rows.length, 色系: Object.fromEntries(order.map(f => [f, fam[f].length])),
    正色: rows.filter(r => r.zx).length, 缺CMYK: rows.filter(r => !r.cmyk).length,
    上游字段矛盾: conflicts.map(c => `${c.name} ${c.hex}/${c.rgbField}`), 重复hex: dupHex,
  }, null, 1));
}

main().catch(e => { console.error(e.message); process.exit(1); });
