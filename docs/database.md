# 数据库设计

存储：IndexedDB（Dexie），库名 `golden-toad-accounting`。

## 表

| 表 | 主键 | 说明 |
|----|------|------|
| users | id | 本地用户（预留） |
| books | id | 账本 |
| transactions | id | 流水，amount 为**分**（integer） |
| categories | id | 一级/二级分类 |
| tags | id | 标签 |
| transactionTags | id | 流水-标签关联 |
| budgets | id | 预算 |
| aiConversations | id | AI 会话 |
| aiMessages | id | AI 消息与 Tool 日志 |
| settings | key | 键值配置（含加密 API Key） |

## transactions

```text
id, bookId, type, amount(分), categoryId, subcategoryId,
date, time, note, createdAt, updatedAt
```

## 金额

- 数据库存整数**分**
- 展示层使用 `utils/money.ts`
- 禁止浮点直接做财务运算

## Migration

- 版本：`DB_VERSION = 1`
- 首次启动 `runMigrations()` 写入默认账本与分类
