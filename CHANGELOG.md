# Changelog

## [0.4.0] - 2026-08-20

### Added

- 本地密码登录（首次自动注册，数据存本机）
- 邮箱验证码登录（服务端 / FormSubmit 发信，页面不显示验证码）
- 登录后清空演示流水，从零开始
- 交互式新手引导（高亮目标、点击操作才继续）
- 设置 → 下载与发布：检查 GitHub 最新版并安装 APK
- 游客模式与管理员账号

### Changed

- 简化 `.env` 配置说明；GitHub 用户库与试用 AI Key 改为可选
- 语音条交互优化；首页本周流水展示

## [0.3.0] - 2026-08-20

### Fixed

- 首页星期栏只滚动/展示本周已过日期；点未来日期显示空记录，不再跳到上周同一天

### Added

- 邮箱验证码登录；GitHub `data/users` 用户目录；注册后一次 AI 试用

## [0.2.1] - 2026-08-20

### Fixed

- Android GitHub Actions：`gradlew` 可执行权限、debug 签名可安装 APK
- 登录页：本地验证码自动填入输入框

### Changed

- 文档首页增加网页版入口预览
- APK 版本号 0.2.0（versionCode 2）

## [0.2.0] - 2026-08-20

### Added

- 登录 / 注册 / 忘记密码 / 游客模式
- 关于页、下载发布页、作者信息
- GitHub Pages 文档站点（`/docs/`）
- Capacitor Android 打包支持
- GitHub Actions 自动部署

### Changed

- 数据库 v2：用户表支持邮箱索引
- README 与 GitHub 专属文档完善

## [0.1.0] - 2026-08-20

### Added

- MVP 全功能：记账、统计、预算、AI、导入导出、PWA
