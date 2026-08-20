# 金蝉记账 · 架构说明

## 分层

```text
pages / components
        ↓
    services        ← 业务编排
        ↓
   repositories     ← 数据访问唯一入口
        ↓
   Dexie (IndexedDB)
```

页面组件**不得**直接操作数据库或调用 AI HTTP。

## 目录

```text
src/
├── ai/              # Provider、Tools、Prompts
├── components/
├── composables/
├── database/        # Dexie schema + migrations
├── layouts/
├── models/
├── pages/
├── repositories/
├── router/
├── services/
├── stores/
├── styles/
└── utils/
```

## 核心服务

| 服务 | 职责 |
|------|------|
| `app.service` | 初始化、账本、月度汇总 |
| `record.service` | 流水 CRUD、分类分组 |
| `stats.service` | 统计区间、分类、趋势、日历 |
| `budget.service` | 预算视图与设置 |
| `ai.service` | 对话、Tool Calling 循环、流式输出 |
| `export.service` / `import.service` | 数据导入导出 |

## 与目标产品差异

| 维度 | 妙蛙记账 | 金蝉记账 |
|------|----------|----------|
| 数据 | 云端 API + 同步 | IndexedDB 本地优先 |
| AI | 服务端 + 积分 | 用户自配 DeepSeek |
| 认证 | 必须登录 | 无强制云端账号 |
| 语音 | WebSocket ASR | Web Speech API |

## 主题与体验

- 设计令牌：`src/styles/tokens.css`（金蝉琥珀色系）
- 深色模式：`data-theme` + `theme.store`
- 动画：`src/styles/motion.css`，尊重 `prefers-reduced-motion`
- PWA：`vite-plugin-pwa`，离线缓存 + 更新提示
