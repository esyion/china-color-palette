# 🎨 中国传统色彩配色 China Color Palette

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Skills.sh](https://img.shields.io/badge/Skills.sh-Published-blue)](https://skills.sh)

一个专业的中国传统色彩配色 Claude Skill,能够根据场景需求自动生成符合中国传统审美的配色方案。

A professional Claude skill for generating Chinese traditional color palettes based on scenario requirements, following traditional Chinese aesthetics.

## ✨ 特性 Features

- 📚 **526种传统色彩** - 完整的中国传统颜色数据库
- 🎯 **智能配色推荐** - 基于场景自动生成和谐搭配
- 🏛️ **五行理论应用** - 遵循木火土金水五行配色原理
- 👑 **朝代风格支持** - 汉唐宋明清各朝代特色配色
- 🎨 **完整色值信息** - 提供 HEX、RGB、CMYK 等设计师所需数据
- 📖 **文化典故说明** - 每个颜色都附带历史来源和文化内涵
- 💡 **实用应用建议** - 明确的使用占比和应用场景指导

## 📦 安装 Installation

使用 Skills CLI 安装:

```bash
npx skills add esyion/china-color-palette
```

或者克隆到你的 Claude skills 目录:

```bash
cd ~/.claude/skills  # macOS/Linux
# 或
cd %USERPROFILE%\.claude\skills  # Windows

git clone git@github.com:esyion/china-color-palette.git
```

## 🚀 使用方法 Usage

安装后,当你在对话中提到以下关键词时,skill 会自动触发:

- "中国风"、"传统色"、"古风配色"
- "五行"、"朝代"、"国潮"
- "瓷器"、"丝绸"、"漆器"
- 或任何需要中国文化特色的配色场景

### 示例 Examples

**场景 1: 品牌设计**
```
我需要一套茶馆品牌的配色方案,要有宋代文人的雅致感觉
```

**场景 2: 节日主题**
```
给我一套中秋节月饼包装的配色,要传统但不老气
```

**场景 3: 国潮设计**
```
设计一个国潮服装品牌,需要有冲击力,面向年轻人
```

**场景 4: 特定朝代**
```
我要做一个唐代主题的网站,请给我一套配色方案
```

## 📊 配色方案输出内容

生成的配色方案包含:

1. **主色、辅色、点缀色** - 按 60%、30%、10% 比例分配
2. **完整色值信息** - HEX、RGB、CMYK
3. **文化典故** - 颜色的历史来源和文化含义
4. **五行对应** - 基于五行理论的配色逻辑
5. **使用建议** - 具体的应用区域和搭配技巧
6. **效果预期** - 预期达到的视觉效果和文化氛围

## 📖 色彩知识库

包含以下传统配色体系:

### 五行色系
- **木** - 青色系(天青、竹青、松花绿...)
- **火** - 红色系(朱红、胭脂、妃红...)
- **土** - 黄色系(缃色、秋香色、金黄...)
- **金** - 白色系(象牙白、月白、鱼肚白...)
- **水** - 黑色系(玄青、墨色、黛色...)

### 朝代特色
- **汉代** - 雄浑大气,朱红+玄青+金黄
- **唐代** - 绚丽华贵,妃红+翡翠绿+宝蓝
- **宋代** - 淡雅清幽,天青+月白+苍绿
- **明代** - 色彩明快,明黄+宝蓝+朱砂
- **清代** - 华丽繁复,宝蓝+玫瑰紫+金黄

### 器物经典配色
- **瓷器** - 青瓷、白瓷、彩瓷配色
- **丝绸** - 绫罗锦缎传统色
- **漆器** - 朱漆、黑漆、金漆
- **建筑** - 宫殿园林配色

## 🎯 适用场景

- 🏷️ **品牌设计** - Logo、VI系统、包装设计
- 🏠 **空间设计** - 茶室、书房、会客厅、传统店铺
- 🎉 **节日主题** - 春节、中秋、端午等传统节日
- 👕 **产品设计** - 国潮服装、文创产品、工艺品
- 🌐 **数字设计** - 网站、App、H5、海报
- 📚 **文化项目** - 博物馆、展览、文化活动

## 📁 项目结构

```
china-color-palette/
├── SKILL.md                      # Skill 主文件
├── README.md                     # 项目说明文档
├── LICENSE                       # MIT 许可证
└── references/                   # 参考资料
    ├── china-colors.json        # 526种传统颜色数据库
    └── color-knowledge.md       # 五行、朝代、器物配色知识库
```

## 🔧 技术细节

- **颜色总数**: 526种
- **数据格式**: JSON (name, hex, rgb, cmyk)
- **配色原则**: 主次分明(60%+30%+10%)、和谐对比、文化寓意
- **理论基础**: 五行哲学、传统美学、朝代特色

## 🤝 贡献 Contributing

欢迎贡献!如果你想:

- 添加更多传统颜色
- 补充文化典故
- 改进配色算法
- 修复问题

请提交 Pull Request 或创建 Issue。

## 📝 更新日志 Changelog

### v1.0.0 (2026-07-20)
- 🎉 初始版本发布
- ✅ 526种中国传统颜色数据库
- ✅ 五行、朝代、器物配色知识库
- ✅ 智能场景配色推荐
- ✅ 完整文化典故说明

## 📄 许可证 License

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢 Acknowledgments

- 色彩数据源自中国传统色彩研究
- 灵感来源于古代瓷器、丝绸、漆器等传统器物
- 感谢所有为中国传统文化保护和传承做出贡献的人们

## 📧 联系方式 Contact

- GitHub: [@esyion](https://github.com/esyion)
- Email: qingbo.my@gmail.com

---

**如果这个 skill 对你有帮助,请给个 ⭐️ Star!**

**If this skill helps you, please give it a ⭐️ Star!**
