# 金蝉记账 Golden Toad Accounting

[![CI](https://github.com/WangK1628/GoldenToadAccouting.io/actions/workflows/ci.yml/badge.svg)](https://github.com/WangK1628/GoldenToadAccouting.io/actions/workflows/ci.yml)
[![Pages](https://github.com/WangK1628/GoldenToadAccouting.io/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/WangK1628/GoldenToadAccouting.io/actions/workflows/deploy-pages.yml)

> 一句话，记清花销 — 本地优先的个人记账 PWA，视觉与交互参考 [妙蛙记账](https://miaowa.sugarat.top/docs/)。

- **在线体验**：[网页版](https://wangk1628.github.io/GoldenToadAccouting.io/)
- **产品介绍**：[docs 首页](https://wangk1628.github.io/GoldenToadAccouting.io/docs/)
- **Android 下载**：[golden-toad-accounting.apk](https://github.com/WangK1628/GoldenToadAccouting.io/releases/latest/download/golden-toad-accounting.apk)

## 作者

**[@WangK1628](https://github.com/WangK1628)**

## 功能概览

- **登录 / 游客模式**：邮箱密码或验证码登录，可稍后再说
- **首页 Hub**：月度支出、预算圆环、周分布、最近流水
- **手动记账**：Bottom Sheet + 数字键盘
- **AI 记账**：Tool Calling、流式回复、语音输入
- **统计 / 预算 / 多账本**
- **导入导出**：JSON / CSV / Excel / TXT
- **深色模式 · PWA 离线**

## 技术栈

Vue 3.5 · TypeScript · Vite 7 · Pinia · Dexie · Capacitor · vite-plugin-pwa

## 快速开始

```bash
git clone https://github.com/WangK1628/GoldenToadAccouting.io.git
cd GoldenToadAccouting.io
npm install
cp .env.example .env
npm run dev
```

浏览器访问 `http://localhost:5173`。

要把登录接到真实邮箱，并在 GitHub 里建用户目录，请填写 `.env`：

1. `RESEND_API_KEY`：[Resend](https://resend.com/) 密钥。验证码由服务端生成并寄出，页面不会显示。
2. `GITHUB_TOKEN`：有 `repo` 内容写权限的 PAT。注册成功后会在 **`data/users/<用户 id>/profile.json`** 新建目录，当作用户库。
3. `TRIAL_DEEPSEEK_API_KEY`：仅服务端使用。用户首次注册后可体验 **一次** AI，用完即清除，之后必须自己填 Key。

未验证发信域名时，Resend 免费账号只能发到你自己的注册邮箱。GitHub Pages 没有这些 API，请用本地 `npm run dev` 或部署到 Vercel。公开仓库会暴露 `data/users` 里的邮箱，建议把 `GITHUB_REPO_NAME` 指到私有仓库。

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发服务器 |
| `npm run build` | 生产构建 |
| `npm run build:pages` | GitHub Pages 构建（含 base 路径） |
| `npm run preview` | 预览构建产物 |
| `npm run test` | Vitest 单元测试 |
| `npm run cap:sync` | 同步 Web 资源到 Android |
| `npm run android:build` | 构建 Release APK |

## AI 配置

1. **设置 → AI 设置** 填入 DeepSeek / OpenAI Compatible API Key
2. 进入 **AI 记账** 对话

API Key 仅加密存储在本地 IndexedDB。

## 部署 GitHub Pages

仓库 `GoldenToadAccouting.io` 通过 GitHub Actions 自动部署到：

`https://wangk1628.github.io/GoldenToadAccouting.io/`

## 文档

- [使用指南（在线）](https://wangk1628.github.io/GoldenToadAccouting.io/docs/guide.html)
- [架构说明](./docs/architecture.md)
- [数据库设计](./docs/database.md)
- [AI 模块](./docs/ai.md)
- [测试清单](./docs/testing.md)

## 许可

[MIT License](./LICENSE)

## 致谢

UI/交互灵感来自 [妙蛙记账](https://miaowa.sugarat.top/docs/)。本项目为独立实现，不调用妙蛙服务端，数据完全本地存储。
