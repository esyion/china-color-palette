# 🎨 中国传统色彩配色 China Color Palette

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Skills.sh](https://img.shields.io/badge/Skills.sh-Published-blue)](https://skills.sh)

一个 Claude / Qoder Skill：把场景需求变成**可直接落地**的中国传统色配色方案。526 色真实色库 + 确定性脚本，色值、CMYK、对比度、面积占比都由脚本计算，不靠模型估色。

A skill that turns a scenario into a production-ready Chinese traditional color palette. Color values, CMYK, contrast ratios and area splits come from bundled scripts, not from model guesses.

## ✨ 特性

- 📚 **526 色真实色库** — 每色含 HEX、RGB、CMYK（上游印刷值）、拼音、L\*/彩度/色相、色系、五行、落位角色
- 🧮 **确定性脚本** — 检索、落地、成稿、对比度校验都由 `scripts/palette.mjs` 完成
- 🏛️ **五行与朝代取色逻辑** — 归档规则公开可复算，并标明哪些是本项目约定、哪些有文献依据
- 🎯 **按媒介的面积基准** — 空间/界面/印刷/服饰各有底·主·辅·点缀比例，避免高彩度正色糊成一片
- ♿ **可读性校验** — 自动算两两对比度，正文未达 WCAG AA 4.5:1 会直接提示换色
- 📦 **交付物** — 除方案表外还能生成 CSS 变量、Tailwind 主题、SVG 色卡
- ✅ **一致性校验** — `scripts/validate.mjs` 检查文档与预设引用的每个色名都真实存在

## 📦 安装

```bash
npx skills add esyion/china-color-palette
```

或直接克隆到 skills 目录（仓库为公开仓库，用 HTTPS 即可）：

```bash
# macOS / Linux
git clone https://github.com/esyion/china-color-palette.git ~/.claude/skills/china-color-palette

# Windows (PowerShell)
git clone https://github.com/esyion/china-color-palette.git "$env:USERPROFILE\.claude\skills\china-color-palette"
```

依赖：Node.js 18+（脚本只用内置模块，无第三方依赖）。

## 🚀 用法

装好后，提到「中国风 / 传统色 / 古风配色 / 国潮 / 五行 / 朝代 / 青瓷 / 漆器 / 汉服 / 文创 / 茶馆空间 / 中秋包装」等需求时会自动触发。触发后 skill 会：问清媒介与气质 → 按角色检索选色 → 文献色名走落地表 → 跑 `build` 输出方案与校验提示。

示例：

```
我需要一套茶馆的配色方案，要有宋代文人的雅致感觉
给我一套中秋节月饼包装的配色，要传统但不老气
设计一个国潮服装品牌，需要有冲击力，面向年轻人
```

### 直接用脚本

```bash
node scripts/palette.mjs stats                          # 色库健康度
node scripts/palette.mjs search --role 底 --li-min 85   # 找大面积底色
node scripts/palette.mjs nearest 天青                   # 文献色名 → 库内近似色
node scripts/palette.mjs presets                        # 朝代/节日/器物预设
node scripts/palette.mjs build "宋式书斋" --from-preset 宋代淡雅 --media 空间 \
  --md out/son.md --css out/son.css --svg out/son.svg --tailwind out/son.json
```

## 📊 输出内容

角色表（色名/拼音/HEX/RGB/CMYK/L\*/彩度/色相/五行/占比）、明度阶梯、两两 WCAG 对比度、落地区域建议、校验提示（缺底色、文字对比度不足、高彩度大面积、印刷色值需打样等），以及可选的 CSS / Tailwind / SVG 文件。

## 📁 项目结构

```
china-color-palette/
├── SKILL.md                    # 触发条件与工作流程
├── README.md
├── LICENSE
├── references/
│   ├── china-colors.json       # 526 色库（脚本生成，勿手改）
│   ├── colors-index.md         # 按色系排版的色名索引（无 Node 时的降级读取）
│   ├── color-knowledge.md      # 分档规则、五行、朝代/器物取色逻辑、表述纪律
│   └── presets.json            # 面积基准、预设方案、文献色名落地表
├── scripts/
│   ├── palette.mjs             # 检索 / 落地 / 成稿 / 对比度
│   ├── build-colors.mjs        # 从上游重建色库（含 --check 差异比对）
│   └── validate.mjs            # 数据、文档、预设一致性校验
├── evals/evals.json            # 测试场景与可程序化判分的断言
└── examples/                   # 一份完整样例方案（md/css/svg/tailwind/json）
```

## 🔧 数据与已知问题

- 数据来源：[中国色 zhongguose.com](https://zhongguose.com/colors.json)，共 526 色，含 CMYK、RGB、HEX、拼音。重建时间见 `.cache/zhongguose-colors.json`。
- 本项目对上游做了三件事：① 保留 hex 为准（上游有 8 条的 RGB 数组与 hex 字段自相矛盾，如「金黄 #F26B1F / #F27B1F」，这 8 色在色库行内带 note，印刷前必须打样）；② 补齐被 v1.0.0 丢掉的 RGB/CMYK/拼音；③ 按公开规则新增色系、五行、落位角色三个派生档。
- CMYK 沿用上游提供的印刷值，非公式换算；实际印刷以打样为准。
- **库内无中性纯黑**，最暗的 19 个黑色族均带绿/蓝/紫偏；文献「玄、墨、漆」只能用近似色表达。
- 传统文献色名（天青、玄青、朱砂、明黄、宝蓝、中国红等 27 个）不在这 526 色内，`references/presets.json` 给出按观感就近的落地色与 ΔE，属近似而非权威值。
- 五行归属、朝代配色倾向是按实测色相归纳的本项目约定，不是色彩史考证结论。

## 🧪 校验与评测

评测场景与可判分断言见 `evals/evals.json`（含一个「不该触发」的负面用例）。

```bash
node scripts/build-colors.mjs --check   # 与上游比对差异
node scripts/validate.mjs               # 数据自洽 + 文档引用可解析
```

## 📝 更新日志

### v1.1.0 (2026-10-20)
- 色库补回上游 CMYK 与拼音（RGB 由 HEX 换算后输出），新增色系 / 五行 / 落位角色分档；修正「中灰」错值（v1.0.0 误抄成铅灰同值）
- 知识库与色库对齐：所有引用色名可在色库或落地表解析，`validate.mjs` 强制校验
- 新增 3 个脚本：检索成稿、上游重建、一致性校验；选色与换算不再交给模型手算
- 面积规则由 60/30/10 改为按媒介的四角色基准，并加入 WCAG 对比度门槛
- 文献色名落地表（27 条）+ ΔE 依据；典故表述纪律改为「有出处才写」
- README 安装改 HTTPS，补数据来源与已知问题；删除与 references 重复的知识段落

### v1.0.0 (2026-07-20)
- 初始版本：526 色（仅 name + hex，RGB/CMYK 为空值）+ 五行/朝代/器物知识文档

## 🙏 致谢

- 色彩数据与命名：[中国色 zhongguose.com](https://zhongguose.com/)
- 传统色研究与普及工作的所有同行者

## 📄 许可

- 代码与文档：MIT，见 [LICENSE](LICENSE)
- 色库数据：来自第三方站点（见上），以原站条件为准；本仓库 MIT 不覆盖对该数据本身的再授权

## 📧 联系

- GitHub: [@esyion](https://github.com/esyion)

---

**如果这个 skill 对你有帮助，请给个 ⭐️ Star!**
