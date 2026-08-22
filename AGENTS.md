# UI 设计指南

> **设计类型**: App 设计（应用架构设计）
> **确认检查**: 本指南适用于可交互的应用/网站/工具。

> ℹ️ Section 1 为设计意图与决策上下文。Code agent 实现时以 Section 2 及之后的具体参数为准。

## 1. Design Archetype (设计原型)

### 1.1 内容理解

- **目标用户**: 实习生（高频执行、需清晰指引）+ Mentor（低频验收、需高效筛选）
- **核心目的**: 引导行动（任务勾选）+ 建立信任（打卡闭环）
- **情绪基调**: 专注有序 / 避免焦虑混乱

### 1.2 设计方向

- **Design Style**: Rounded 圆润几何 —  intern-friendly，pill 按钮+柔和阴影降低执行压力
- **Application Type**: Tool/SaaS — 决定单栏聚焦布局与条件式导航
- **Aesthetic Direction**: 清新明亮办公工具，深色概览区锚定目标，浅色列表承载执行

## 2. Color System (色彩系统)

**色彩关系**: 靛蓝主色 + 暖灰底 + 深墨文字 + 5条业务线专属语义色
**配色设计理由**: 靛蓝传递专业成长感，暖灰底减少长时间使用的视觉疲劳
**主色推导**: Primary 靛蓝用于"提交打卡""去打卡"等关键行动点，关联实习生成长语义
**使用比例**: 60% 暖灰中性 / 30% 白色卡片 / 10% 靛蓝主色；业务线色仅用于卡片边框/标签/概览区背景

### 2.1 主题颜色

| Token                | HSL 值               | 说明                                     |
| -------------------- | -------------------- | ---------------------------------------- |
| `background`         | hsl(220 14% 96%)     | 暖灰页面底色                             |
| `card`               | hsl(0 0% 100%)       | 纯白卡片容器                             |
| `foreground`         | hsl(222 47% 11%)     | 深墨主文字                               |
| `muted-foreground`   | hsl(220 9% 46%)      | 次要说明文字                             |
| `primary`            | hsl(234 89% 63%)     | 靛蓝主交互色                             |
| `primary-foreground` | hsl(0 0% 100%)       | 主交互文字                               |
| `accent`             | hsl(234 89% 96%)     | 极浅靛蓝 hover/focus 背景                |
| `accent-foreground`  | hsl(234 89% 40%)     | accent 上的深色文字                      |
| `border`             | hsl(220 13% 91%)     | 低对比度边框                             |

### 2.2 导航区配色

- **基调关系**: 复用主配色系统，选中态用 `bg-accent` + `text-primary` 区分
- **关键状态**: 默认 `text-muted-foreground`，激活 `text-primary font-medium`，hover `bg-accent`
- **边界与背景**: 非透明 `bg-card`，底部 `border-b border-border` 分隔

### 2.3 语义颜色

| 用途       | HSL 值               | 衍生说明                     |
| ---------- | -------------------- | ---------------------------- |
| success    | hsl(142 71% 45%)     | 验收通过/完成态              |
| warning    | hsl(38 92% 50%)      | 需改进状态                   |
| destructive| hsl(0 84% 60%)       | 删除/严重卡点                |

### 2.4 业务线专属色

| 线   | HSL 值               | 应用场景                     |
| ---- | -------------------- | ---------------------------- |
| A    | hsl(217 91% 60%)     | 触达与邀约卡片边框/概览背景  |
| B    | hsl(142 71% 45%)     | 官方账号                     |
| C    | hsl(25 95% 53%)      | 社群与爆款                   |
| D    | hsl(263 70% 50%)     | 供给线                       |
| E    | hsl(0 84% 60%)       | 情报与产品                   |

## 3. Typography (字体排版)

- **Heading**: Space Grotesk + system-ui, -apple-system, sans-serif
- **Body**: Inter + "PingFang SC", "Microsoft YaHei", sans-serif
- **字体策略**: Space Grotesk 几何感强化数据/指标辨识度，Inter 保障中文混排可读性

## 4. Layout Strategy (布局策略)

- **导航意图**: 无全局持久导航；身份选择页为入口，进入后顶部轻量面包屑+返回按钮；Mentor 页独立顶栏筛选
- **页面架构**: 居中单栏 `max-w-4xl`，任务详情页概览区全宽深色，下方列表收窄对齐
- **响应式**: 移动端实习生卡片 2列→桌面4列；打卡表单始终单栏满宽

## 5. Visual Language (视觉语言)

- **形态参数**: 圆角 `rounded-xl (0.75rem)` · 阴影 `shadow-sm` · 间距 `standard (gap-4/p-6)`
- **识别签名**: pill 形按钮 `rounded-full` · 任务完成态灰色划线+绿色对勾 · 周度任务当日高亮脉冲动画
- **装饰策略**: 仅用业务线色左侧竖条标识分组，无多余装饰
- **动效原则**: 任务展开/折叠 200ms ease-out · 提交成功彩带 800ms
- **可及性**: 正文对比度 ≥ 4.5:1；深色概览区文字 `text-white` + `drop-shadow-sm`

## 6. Component Principles (组件原则)

- **状态完整性**: Checkbox 覆盖 unchecked/checked/disabled；TaskCard 覆盖 default/hover/completed/expanded
- **层级清晰**: Primary 按钮 `bg-primary text-primary-foreground rounded-full`；Secondary 按钮 `border border-border hover:bg-accent`
- **一致性**: 所有输入框 `rounded-lg border-border focus:ring-2 focus:ring-primary/30`；状态标签统一胶囊形

## 7. Image Direction (图片与视觉资产)

- **Image Role**: 无强制图片需求，优先通过排版、色彩和局部图形建立视觉记忆点
- **Image Art Direction**: 无
- **Image Prompt Keywords**: 无
- **Image Avoidance**: 无

## 8. 应避免 (Anti-patterns)

- ❌ 首页堆砌统计仪表盘或 Welcome Banner — 实习生只需快速选人进线
- ❌ 任务列表使用彩色背景区分时段 — 信息密度高时彩色背景干扰阅读，用左侧竖条即可
- ❌ Mentor 页使用 Dashboard 卡片摘要 — 概要设计明确为筛选+表格列表，不加额外统计模块