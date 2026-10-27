# 软考高项备考站（信息系统项目管理师）

手机友好的零基础备考网站：<https://tegixia0.github.io/ruankao-gaoxiang/>

纯静态（HTML + CSS + JS，无依赖、无构建），GitHub Pages 直接从 `main` 分支根目录发布，push 后约 1 分钟生效。

| 页面 | 地址 |
|---|---|
| 首页（倒计时、本周任务） | `#home` |
| 考试介绍（已核实的考试事实，2027 未公布项标「待官方公布」） | `#intro` |
| 学习方法 | `#method` |
| 备考计划（2026-11 → 2027-05，逐周） | `#plan`，数据在 `data/plan.json` |
| 知识点目录 / 章节笔记 / 自测 | `#kp`、`#kp/ch01`、`#quiz/ch01` |
| 49 过程归属训练 | `#quiz/ch00/drill`（由 `ch00.json` 的 `matrix` 自动出题） |
| 错题本 | `#wrong` |

错题记录、"已学完"标记只保存在浏览器本地（localStorage）。答错后可点「再写一次」重新作答；错题本里一次答对即移出。

## 文件结构

- `index.html` — 页面骨架与静态页（考试介绍、学习方法）
- `assets/app.css`、`assets/app.js` — 样式与逻辑（路由、章节渲染、自测引擎、错题本）
- `data/index.json` — 章节目录；`ready: true` 的章节才可点击
- `data/chapters/chNN.json` — 每章一个文件（`ch00` 为 49 过程总览）
- `data/plan.json` — 备考阶段与逐周计划

## 新增一章（例如第4章）

1. 新建 `data/chapters/ch04.json`：

```json
{
 "id": "ch04", "no": "第4章", "title": "信息系统管理",
 "source": "教材第4章：4.1 管理方法 / 4.2 管理要点",
 "intro": "本章在考试中的定位与学习建议（可含简单 HTML）",
 "sections": [
  {"title": "4.1 管理方法",
   "points": ["要点1（可用 <b>加粗</b>）", "要点2"],
   "pitfalls": ["易错点（可空数组）"],
   "mnemonic": "记忆口诀（没有就写空字符串）"}
 ],
 "quiz": [
  {"q": "题干", "options": ["A", "B", "C", "D"], "answer": 1, "explain": "解析"}
 ]
}
```

   - `answer` 是正确选项在 `options` 中的下标（从 0 开始）；页面上会自动打乱选项顺序。
   - 题目标 `kind`：`原创练习题` 或 `真题/回忆版`（回忆版须注明年份来源，见 `data/SOURCES-真题.md`）。
2. 在 `data/index.json` 中把该章的 `"ready"` 改为 `true`。
3. `git add -A && git commit -m "Add ch04" && git push`。

错题本以「章节 id + 题干哈希」为键，修改题干会被当作新题。
