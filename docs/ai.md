# AI 模块

## Provider

OpenAI 兼容 Chat Completions API（`stream: true` 支持 SSE 流式）。

```text
createProvider(settings)
  → POST {baseUrl}/v1/chat/completions
  → DeepSeek / OpenAI Compatible / 自定义 Base URL
```

## 配置（设置 → AI 设置，本地存储）

| 项 | 默认 |
|----|------|
| Base URL | `https://api.deepseek.com` |
| Model | `deepseek-chat` |
| Temperature | `0.2` |
| API Key | 用户自己填写。注册后服务端提供 **一次** 试用，用完清除 |

## Tool Calling

AI 必须通过 tools 修改/查询数据，禁止正则伪解析。

| 工具 | 功能 |
|------|------|
| `create_transaction` | 创建流水 |
| `search_transactions` | 查询流水 |
| `get_period_summary` | 时段汇总 |
| `get_category_breakdown` | 分类排行 |
| `get_budget_status` | 预算状态 |
| `list_categories` | 列出分类 |
| `delete_transaction` | 删除流水 |

实现：`src/ai/tools/definitions.ts` + `executor.ts`

## 对话

- 消息持久化：`aiConversations` / `aiMessages`
- 流式最终回复 + 工具轮次状态提示
- 对话历史抽屉：切换 / 新建 / 删除

## 语音

- Web Speech API（`zh-CN`），按住说话
- `VoiceOverlay` 波形 + 上滑取消
- 首页 Action Bar 与 AI 页共用

## Prompt

系统 Prompt：`src/ai/prompts/system.ts`

运行时注入账本上下文（分类列表、今日日期）via `buildBookContext`。
