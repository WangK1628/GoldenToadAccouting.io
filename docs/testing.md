# 测试清单

## 自动化

```bash
npm run test        # Vitest 单元测试（money / csv / date-range）
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm run build       # 生产构建
```

## 手动验收

### 基础

- [ ] 首次打开有演示账本与 5 条流水
- [ ] 首页 + 打开记账 Sheet，保存后首页数字更新
- [ ] 流水页搜索、筛选、编辑、删除
- [ ] 分类 / 标签 / 账本 CRUD

### 统计与预算

- [ ] 统计页切换日/周/月/年，数字与流水一致
- [ ] 分类下钻 → 流水页带筛选
- [ ] 日历点击 → 当日流水
- [ ] 预算设置后首页圆环更新

### AI

- [ ] 未配置 Key 时提示去设置
- [ ] 「午饭 32」触发记账工具并成功
- [ ] 「本月餐饮多少」返回真实统计
- [ ] 流式回复逐字显示
- [ ] 对话历史切换 / 删除
- [ ] 按住说话（Chrome/Edge + 麦克风权限）

### 数据

- [ ] 导出 CSV 用 Excel 打开中文正常
- [ ] 导入 CSV 增加流水
- [ ] JSON 导出再导入
- [ ] 清空数据（输入「清空」）恢复演示数据，AI Key 保留

### 外观与 PWA

- [ ] 浅色 / 深色 / 跟随系统切换
- [ ] DevTools Offline 显示离线横幅
- [ ] `npm run build && npm run preview` 可安装 PWA

## 已知限制

- 语音识别依赖浏览器 Web Speech API，Safari/Firefox 支持有限
- Excel 导入依赖 `xlsx` 库，复杂表格需列名与模板一致
- 数据仅存本机 IndexedDB，无云端同步
