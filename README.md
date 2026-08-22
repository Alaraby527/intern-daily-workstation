# 实习生每日工作台

一个基于飞书多维表格的实习生任务管理与每日打卡系统，帮助实习生按业务线查看每日 SOP 任务、勾选完成、提交打卡，数据自动同步到飞书多维表格；Mentor 可在后台查看所有方向的打卡记录并进行验收。

## 功能特性

- **身份自动识别**：在飞书客户端内打开自动识别实习生身份，无需手动选择
- **分业务线任务**：支持 A/B/C/D/E 五条业务线，每条线有独立的 SOP 任务和北极星指标
- **任务勾选与产出物**：按上午/下午/下班前分组展示任务，支持勾选完成、上传附件、添加链接
- **每日打卡**：填写当日目标、完成量、卡点备注，提交后自动同步飞书多维表格
- **Mentor 验收**：Mentor 视角可查看所有方向的打卡记录，按实习生/业务线/验收状态筛选并验收
- **飞书多维表格同步**：通过飞书开放平台 API 将打卡记录和业务数据写入多维表格

## 技术栈

- **前端**：React + TypeScript + Vite + Tailwind CSS
- **后端**：NestJS + TypeScript + Drizzle ORM
- **数据库**：SQLite（本地存储）
- **飞书集成**：飞书开放平台 API（多维表格、电子表格）

## 项目结构

```
├── client/              # 前端源码
│   ├── index.html
│   └── src/
│       ├── api/         # API 调用层
│       ├── components/  # 通用组件
│       ├── data/        # 静态数据（实习生、业务线、任务配置）
│       ├── pages/       # 页面（首页、任务详情、打卡、Mentor 后台）
│       ├── store/       # 状态管理
│       └── utils/       # 工具函数
├── server/              # 后端源码
│   ├── main.ts
│   ├── app.module.ts
│   ├── database/        # 数据库 Schema
│   ├── common/          # 公共模块
│   └── modules/
│       ├── bitable/     # 飞书多维表格同步
│       ├── checkin/     # 打卡记录
│       ├── user/        # 用户身份
│       └── view/        # 视图
├── shared/              # 前后端共享类型
│   └── api.interface.ts
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## 快速开始

### 环境要求

- Node.js >= 18
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 配置飞书应用

1. 在[飞书开放平台](https://open.feishu.cn/)创建企业自建应用
2. 获取 App ID 和 App Secret
3. 开通多维表格、电子表格相关权限
4. 将应用添加为目标多维表格的协作者（编辑权限）
5. 在 Mentor 后台的「飞书集成」面板中配置：
   - App ID
   - App Secret
   - Base Token（多维表格链接中的 token）

### 启动开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

## 飞书多维表格配置

应用需要对接一张多维表格，包含以下数据表：

| 表名 | 用途 |
|------|------|
| 每日打卡记录 | 存储实习生每日打卡 |
| 触达记录表 | A 线触达记录 |
| 访谈记录表 | A 线访谈记录 |
| 爆款候选池 | C 线爆款内容 |
| 社群反馈表 | C 线社群反馈 |
| 内容分发清单 | C 线内容分发 |
| 选题排产表 | B 线选题管理 |

具体表 ID 在 `server/modules/bitable/bitable-tables.ts` 中配置。

## 自定义配置

- **实习生名单**：编辑 `client/src/data/interns.ts`
- **业务线配置**：编辑 `client/src/data/lines.ts`
- **任务定义**：编辑 `client/src/data/tasks.ts`
- **任务与子表映射**：编辑 `client/src/data/task-table-map.ts`

## License

MIT
