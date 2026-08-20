# 目标项目技术分析

> 分析对象：https://miaowa.sugarat.top/ 及其公开文档  
> 分析方式：公开 HTML / JS / CSS / manifest / service worker / 公开 API 响应  
> 分析日期：2026-08-20  
> 说明：本文仅基于可公开访问的前端产物与文档，不涉及任何未公开源码、私有接口逆向或用户数据。

---

## 前端框架

**结论：Vue 3 + TypeScript + Vite 单页应用（SPA）**

依据（均来自公开静态资源，非猜测）：

| 技术 | 版本 / 证据 |
|------|-------------|
| Vue | **3.5.40**（bundle 内 `@vue/runtime-core v3.5.40` 注释） |
| Vue SFC | `CodeField.vue_vue_type_script_setup_true_lang-*.js`，使用 `<script setup>` |
| Vite | `__vite__mapDeps`、hash 分包、`type="module"` 入口 |
| Pinia | **v4.0.2**（bundle 注释） |
| Vue Router | **v4.6.4**，`createWebHistory()`（History 模式，非 Hash） |
| TypeScript | 源码编译为 TS（`.vue` + 强类型 store / API 层），产物为 JS |

**不是**：React、Svelte、uni-app Web 版、原生 HTML/CSS/JS。

应用入口结构（`index.html`）：

```html
<div id="app"></div>
<script type="module" src="/assets/index-*.js"></script>
```

启动时有 `#app-boot` 自定义 Splash（Logo + 品牌名 + 进度条），挂载完成后调用 `window.hideAppBoot()` 淡出。

---

## UI 技术

**结论：自研 UI 组件体系，未使用主流移动端组件库**

- **未发现**：Vant、Naive UI、Element Plus、Ant Design Mobile、Radix、Headless UI
- **组件风格**：Scoped CSS + `data-v-*` hash，手写 `.vue` 组件
- **主要页面组件**（从路由与 chunk 名提取）：
  - `HomeView` — 首页
  - `RecordsView` — 流水
  - `ReportsView` — 统计报表
  - `ChatView` — AI 对话
  - `ProfileView` — 个人中心
  - `SettingsView` — 设置
  - `CategoryManageView` / `TagManageView` / `BudgetView` / `LedgerSelectView`
  - `LoginView` / `RegisterView` / `ForgotPasswordView` / `SetPasswordView`
- **通用组件**：
  - `PageHeader` — 内页顶栏（返回 + 标题 + 右侧 slot）
  - `ActionBar` — 底部快捷操作条（手动记账 / 语音文字输入 / AI 入口）
  - Bottom Sheet（`.sheet-root`）、Toast（`.toast-root`）、Modal Overlay
  - Emoji Picker（`v3-emoji-picker`，用于分类图标选择）
- **图标方案**：
  - 导航与操作：**内联 SVG**（如手动记账 `+`、麦克风、键盘切换）
  - 品牌 mascot：`apple-touch-icon.png` / 青蛙头像 SVG
  - 分类图标：**Emoji 字符**（如餐饮 🍜、交通 🚌），非 emoji 替代主导航图标
  - `/icons.svg` 主要为文档站社交图标，非 App 主导航图标集
- **金额展示**：`toLocaleString('zh-CN', { minimumFractionDigits: 2 })`，前缀 `¥`

---

## CSS 技术

**结论：手写 CSS + CSS Variables 设计令牌，Scoped Vue CSS**

- **不是** Tailwind CSS、UnoCSS、SCSS Modules（产物为纯 CSS）
- **字体**（自托管 woff2）：
  - 正文：**IBM Plex Sans**（400 / 500 / 600）
  - 标题 / 数字：**Fraunces**（600）
  - Splash / 系统回退：`'PingFang SC', 'Segoe UI', sans-serif`
- **核心设计令牌**（`:root` 实测值）：

| 变量 | 值 | 用途 |
|------|-----|------|
| `--bg0` | `#f3f8f4` | 页面背景 |
| `--bg1` | `#e8f2ea` | 次级背景 |
| `--ink` | `#1a2e22` | 主文字 |
| `--muted` | `#6b7f72` | 次级文字 |
| `--brand` | `#3d9a5f` | 品牌绿 |
| `--brand-deep` | `#2e7a4a` | 深绿 |
| `--accent` | `#2f8f55` | 强调 / 按钮 |
| `--expense` | `#1a2e22` | 支出色 |
| `--income` | `#3d9a5f` | 收入色 |
| `--line` | `#d7e6db` | 分割线 / 边框 |
| `--app-max` | `480px` | 内容最大宽度 |
| `--action-bar-height` | `44px` | 底部操作区占位 |
| `--safe-bottom` | `16px` | 安全区（可被 JS 覆盖） |
| `--safe-top` | （动态） | 顶部安全区 |
| `--sheet-radius` | `24px` | Bottom Sheet 圆角 |

- **圆角惯例**：卡片 `12px`、按钮 / Pill `999px`（全圆角）、App Icon `18px`
- **阴影**：轻量 `box-shadow`，如 `0 4px 14px rgba(40,48,70,0.18)`
- **动画**：CSS `transition` + `@keyframes`（Splash 进度条、按钮 `:active scale(0.96)`）
- **无障碍**：`prefers-reduced-motion: reduce` 媒体查询

---

## 路由

**模式**：Vue Router 4 + **HTML5 History**（`createWebHistory`）

**完整路由表**（从 bundle 提取）：

| Path | Name | 说明 |
|------|------|------|
| `/` | home | 首页，`meta.tabBar: true` |
| `/records` | records | 流水列表 |
| `/reports` | reports | 统计报表 |
| `/chat` | chat | AI 对话 |
| `/profile` | profile | 个人中心 |
| `/settings` | settings | 设置 |
| `/categories` | categories | 分类管理 |
| `/tags` | tags | 标签管理 |
| `/budget` | budget | 预算 |
| `/ledgers` | ledgers | 账本切换 |
| `/points` | points | 积分明细 |
| `/about` | about | 关于 |
| `/login` | login | 登录 |
| `/register` | register | 注册 |
| `/forgot-password` | forgot-password | 忘记密码 |
| `/set-password` | set-password | 设置密码 |

**导航结构（重要：与常见 5 Tab 底部导航不同）**：

目标产品**没有**「首页 / 流水 / 统计 / AI / 设置」五 Tab 同级底部导航。

实际结构为：

1. **首页为中心 Hub**（`/`）
2. **左上角汉堡菜单** → 浮层菜单：`设置`、`切换账本`、`分类管理`、`标签管理`、`对话`
3. **首页内链**：`统计报表 ›` → `/reports`，`全部流水 ›` → `/records`
4. **右下角头像** → `/profile`
5. **底部 Action Bar**（悬浮，非 Tab Bar）：
   - 左：`+` 手动记账
   - 中：语音 / 文字输入 Pill（按住说话、上滑取消/转文字）
   - 右：青蛙 mascot → AI 对话 `/chat`

**Overlay 返回栈**：Sheet / Modal 打开时 `history.pushState({ __overlay: true })`，系统返回键可关闭浮层。

**文档站**（`/docs/`）为独立 **VitePress v1.6.4** 站点，与 App SPA 分离；首页 iframe 嵌入 `/?embed=1` 预览。

---

## 状态管理

**Pinia v4.0.2** 作为全局状态中心。

从 bundle 行为推断的主要 Store 职责：

| Store 职责 | 内容 |
|------------|------|
| Auth | 登录态、游客 / 注册用户、token、`requireAuthForWrite()` |
| Ledger | 当前账本 ID、账本列表 |
| Records | 流水 CRUD、按月汇总 |
| Categories / Tags | 分类树、标签 |
| Demo / Mock | 未登录演示数据（`GET /api/demo`） |
| Chat / AI | 会话、消息流、SSE 流式、Tool 确认卡片 |
| Settings | 远程 `app/settings` 配置（欢迎语、ASR 上限等） |

**本地持久化**：

- `localStorage`：认证 token、主题偏好等
- **IndexedDB**（`idb` 库封装模式）：离线缓存 / 本地读写层
- 业务数据**主存储在服务端**，登录后多端同步（文档明确说明）

---

## 图表

**结论：自研 SVG / CSS 图表，未使用 ECharts / Chart.js / Recharts**

| 图表类型 | 实现方式 |
|----------|----------|
| 预算圆环 | CSS `conic-gradient` + `--pct` 变量，首页展示 |
| 分类占比 | SVG `<path>` 环形图（donut），`aria-label` 无障碍 |
| 趋势柱状图 | SVG `.bar-exp` / `.bar-inc`，高度约 `9.25rem` |
| 收支日历 | CSS Grid `.cal-grid` + `.weekdays` 7 列 |
| 星期分布 | 首页迷你柱状 `.bars`（周一至周日） |

统计页（`ReportsView`）支持：

- 粒度：日 / 周 / 月 / 年 / 自定义
- 维度：一级 / 二级分类下钻（`l1` / `l2`）
- 指标：支出 / 收入切换、分类占比、排行、趋势、日历

---

## PWA

**已完整实现 PWA**，证据充分：

**manifest.webmanifest**：

```json
{
  "name": "妙蛙记账",
  "short_name": "妙蛙记账",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f3f8f4",
  "theme_color": "#3d9a5f",
  "lang": "zh-CN",
  "icons": [192x192, 512x512]
}
```

**Service Worker**（`/sw.js`）：

- 基于 **Workbox**（`workbox-2fbc6a65` + `workbox-window`）
- `precacheAndRoute` 预缓存 HTML / JS / CSS / 字体 / 图标
- Navigation Route：`index.html` SPA fallback
- **排除**：`/api/*`、`/docs/*`、`/miaowa_desk/*`

**HTML PWA 元信息**：

- `theme-color: #3d9a5f`
- `apple-mobile-web-app-capable`
- `viewport-fit=cover`
- `interactive-widget=resizes-content`（适配虚拟键盘）

**文档说明**：支持「添加到主屏幕」，新版本打开时提示刷新。

---

## 响应式

**移动优先，桌面居中窄栏 App 壳**

| 项目 | 值 / 行为 |
|------|-----------|
| 设计基准宽度 | `--app-max: 480px`，`.app-shell` 居中 |
| 高度 | `100dvh` + `--app-height` JS 动态修正 |
| Viewport | `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover` |
| 安全区 | `env(safe-area-inset-*)` + CSS 变量 `--safe-top/bottom` |
| 虚拟键盘 | `--keyboard-inset`、`--vv-offset-top` 适配 |
| 触摸 | `touch-action: manipulation` |
| 桌面 | 非简单拉伸；480px 居中「手机壳」体验 |
| Embed 模式 | `?embed=1` 时 `html.embed-preview`，供文档站 iframe 390×844 预览 |

**实测文档站 iframe 尺寸**：390×844（iPhone 14 Pro 逻辑分辨率参考）

---

## 页面结构

### 首页（`/`）

自上而下：

1. **Top Bar**：汉堡菜单 | Logo + 品牌名 | 头像 / 登录
2. **游客提示条**（可选）：「演示数据，登录后可正常使用」
3. **月份切换** + 「统计报表 ›」链接
4. **本月支出 Hero**：大数字 + 收入 / 结余
5. **预算圆环**（若已设预算）
6. **统计卡片**：本月笔数、日均支出
7. **星期迷你柱图**（周一至周日）
8. **本月流水列表** + 「全部流水 ›」
9. **底部 Action Bar**（手动 + 输入 + AI）

### 流水页（`/records`）

- 按日期分组 Timeline
- 每日收入 / 支出小计
- 分类 · 二级分类、备注、金额、时间
- 无限滚动分页（chunk size 20）
- 筛选 / 搜索 / 编辑 / 删除

### 统计页（`/reports`）

- 时间粒度 Tab
- 总收支 / 结余 Hero
- 分类占比环图 + 排行榜
- 趋势柱图
- 收支日历（可点击下钻）

### AI 对话页（`/chat`）

- 聊天气泡（用户 / 助手）
- 流式输出 + 「思考中」可折叠
- 结果卡片：`record` / `query` / `category` / `confirm_category` / `confirm_delete` / `flat`
- 底部输入：文字 / 语音切换、附件（Excel/CSV/TXT 导入）、发送
- Tool 确认交互（新建一级分类、删除流水）

### 设置 / 个人

- 分类、标签、预算、账本、积分、主题、数据管理、关于

---

## 主要功能

基于公开文档 + 前端行为 + `/api/demo` 数据结构：

### 核心业务

- 多账本（日常 / 旅行 / 家庭等）
- 流水：收入 / 支出，一级 + 二级分类，多标签，备注，日期时间
- 分类管理：Emoji 图标、排序、收入 / 支出类型
- 标签管理：与分类独立，可多标签
- 预算：月度默认 + 本月覆盖，首页圆环进度
- 统计：日周月年自定义、分类占比、趋势、排行、星期分布、收支日历
- 导入：Excel / CSV / TXT（AI 对话内上传，v0.1.3+）
- 登录注册：邮箱验证码、多端同步

### AI 能力（服务端 AI + 积分制）

公开文档与 bundle 一致的 Tool 名（前端可见部分）：

- `create_records`
- `update_records`
- `delete_records`（需确认卡片 `confirm_delete`）
- `query_summary`

卡片类型：`record`、`query`、`category`、`confirm_category`、`confirm_delete`、`flat`

AI 通信：

- `POST /api/ai/send` — SSE 流式
- `POST /api/ai/confirm` — Tool 用户确认
- `POST /api/ai/abort` — 终止生成
- `POST /api/ai/conversations` — 会话管理

语音：

- WebSocket `wss://.../api/asr/stream` 流式 ASR（非纯浏览器 SpeechRecognition）
- 按住说话、上滑取消、滑到指定区域转文字

### 公开数据模型（`/api/demo`）

```text
Ledger:    id, name, note
Category:  id, name, type, parentId, sort, icon(emoji)
Record:    id, ledgerId, type, amount(元, number), categoryId, subCategoryId,
           note, date, time, createdAt, updatedAt
Tag:       id, name
```

金额在 API 层为 **JavaScript number 元**（如 `28.5`），非「分」整数。

---

## 可复刻部分

以下均可通过观察公开 UI / 交互 / 文档**独立重新实现**：

1. **整体视觉语言**：绿色自然系配色、480px App 壳、卡片圆角、字体层级
2. **首页信息架构**：月切换、支出 Hero、预算环、迷你柱图、最近流水
3. **Action Bar 交互**：手动记账 + 语音文字 Pill + AI 入口
4. **流水 Timeline 分组样式**
5. **统计页布局与图表形态**（自研 SVG 即可复刻外观）
6. **AI 对话 UI**：气泡、流式、确认卡片、附件上传
7. **分类 Emoji 选择器交互**
8. **PWA 安装与 Splash 体验**
9. **AI Prompt 能力范围**（文档公开的 17+ 种口语场景）
10. **Bottom Sheet / Toast / PageHeader 模式**

---

## 不应直接复制的部分

1. **后端 API 与数据库** — 不调用 `miaowa.sugarat.top/api/*` 作为我们的后端
2. **AI 服务与积分系统** — 不使用对方 AI Key、SSE 协议实现细节、积分计费
3. **用户认证体系** — 不共用 token / 账号 / 同步服务
4. **私有源码** — 不复制 minified bundle 作为我们的源码
5. **品牌资产** — 青蛙 Logo、 「妙蛙记账」名称与文案（我们改为「金蝉记账」）
6. **WebSocket ASR 服务端** — 需自行决定本地 Speech API 或其他方案
7. **`/api/demo` 演示数据** — 仅作 UI 参考，不作生产数据来源
8. **文档站 VitePress 主题** — 产品 App 与 `@sugarat/theme` 文档站是两套系统

---

## 我们自己的技术实现方案

> Phase 2 起的建议方案。目标：**视觉与交互高度接近，架构满足「数据归用户 + 自建 DeepSeek AI」**。

### 总体原则

| 维度 | 目标产品 | 金蝉记账（我们） |
|------|----------|------------------|
| 前端栈 | Vue 3 + Vite + Pinia + TS | **保持一致** |
| UI 库 | 自研 | **自研 + 相同设计令牌** |
| 数据 | 服务端 + 同步 | **IndexedDB 本地优先**（Dexie / idb） |
| AI | 服务端 + 积分 | **用户自配 DeepSeek / OpenAI Compatible** |
| 认证 | 必须登录写入 | **可选本地模式，无强制云端** |
| 导航 | Home + Action Bar | **默认还原 Action Bar 结构**；若需五 Tab 可作为金蝉差异化扩展 |

### 推荐技术栈

```text
前端
├── Vue 3.5 + TypeScript
├── Vite 6
├── Vue Router 4（History）
├── Pinia 2/4
├── 自研 CSS Variables 主题（金蝉色系：琥珀 / 金 / 深绿，替换 --brand 等令牌）
├── vite-plugin-pwa + Workbox
└── IBM Plex Sans + Fraunces（或金蝉定制字体）

数据层
├── Dexie.js（IndexedDB）
├── Repository 模式（UI → Service → Repository → DB）
├── 金额：integer 分（decimal.js 仅展示层）
└── Migration 版本管理

AI 层
├── AIProvider 抽象
│   ├── DeepSeekProvider
│   └── OpenAICompatibleProvider
├── OpenAI /v1/chat/completions + tools + streaming
├── Prompt / Tools 独立目录（src/ai/）
└── 对话日志本地存 IndexedDB（不含 API Key）

图表
├── 自研 SVG（与目标一致，不引入 ECharts）
└── CSS conic-gradient 预算环

工程化
├── ESLint + Prettier + vue-tsc 严格模式
├── .env.example（仅默认 Base URL / Model，不含 Key）
└── tests/ 覆盖 AI Tool 与 Repository
```

### 视觉改造（妙蛙 → 金蝉）

| 元素 | 妙蛙 | 金蝉建议 |
|------|------|----------|
| 主色 | `#3d9a5f` 青蛙绿 | 琥珀金 `#C9A227` / 深金 `#A8841A` |
| 背景 | `#f3f8f4` 淡绿 | `#FBF8F0` 暖米 |
| 文字 | `#1a2e22` 深绿灰 | `#2C2416` 深棕 |
| Mascot | 青蛙 | 金蝉图标（SVG） |
| 圆角 / 布局 / 间距 | 照搬实测值 | 保持一致，仅换色与图标 |

### 导航方案建议

**Phase 3 优先还原目标真实结构**（Home Hub + Action Bar + 侧滑菜单），原因：

- 目标产品并非五 Tab 底栏，强行改成 Tab 会与「像素级还原」冲突
- 用户任务书已注明：「如果目标网站实际导航结构不同，以实际页面为准」

若后续需要五 Tab，建议作为「经典模式」可选布局，而非默认。

### 数据流（与目标本质差异）

```text
目标产品:
  UI → Pinia → HTTP(/api/*) → 云端 DB
              ↘ IndexedDB 缓存

金蝉记账:
  UI → Service → Repository → Dexie(IndexedDB)
                            ↘ AI Provider → DeepSeek（用户 Key，仅客户端）
```

### Phase 2 起步清单

1. `pnpm create vite` + Vue TS + Pinia + Vue Router
2. 移植设计令牌（改金蝉配色）
3. Dexie schema：`books, transactions, categories, tags, budgets, ai_conversations, settings`
4. Repository + Service 骨架
5. PWA manifest + Workbox
6. 路由与空壳页面（Home / Records / Reports / Chat / Settings）
7. `.env.example`

---

## 附录：公开 API 一览（分析用，禁止依赖）

| Method | Path | 用途 |
|--------|------|------|
| GET | `/api/demo` | 未登录演示数据 |
| GET | `/api/app/settings` | 应用配置 |
| GET/POST | `/api/auth/*` | 认证 |
| GET/POST/PUT/DELETE | `/api/records` | 流水 |
| GET/POST | `/api/categories` | 分类 |
| GET/POST | `/api/tags` | 标签 |
| GET/PUT/DELETE | `/api/budgets` | 预算 |
| GET/POST | `/api/ledgers` | 账本 |
| POST | `/api/ai/send` | AI 对话（SSE） |
| POST | `/api/ai/confirm` | Tool 确认 |
| WS | `/api/asr/stream` | 语音识别 |

---

## 附录：文档站（独立项目）

- URL 前缀：`/docs/`
- 框架：**VitePress v1.6.4**
- 主题：定制 `miaowa-page` landing 样式（非 App 本体的 Vue 组件库）
- 开发者域名 `sugarat.top` 关联 `@sugarat/theme` 博客生态，**与 App SPA 是不同代码库**

---

*Phase 1 完成。下一步等待指令进入 Phase 2：项目基础脚手架。*
