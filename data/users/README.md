# 用户数据目录（GitHub 当轻量数据库）

本目录就是金蝉记账的用户库。

验证码校验成功后，服务端会通过 GitHub Contents API 新建：

```text
data/users/<邮箱 SHA256 前 32 位>/profile.json
```

`profile.json` 只存邮箱、创建时间、是否已用完免费 AI 体验，**不存密码、不存账单**。账单仍在设备本地 IndexedDB。

内部文件：

```text
data/users/_pending/<id>.json   # 验证码哈希，校验后删除
```

仓库若是公开的，这里会出现用户邮箱。生产环境请把 `GITHUB_REPO_NAME` 指到一个**私有仓库**。
