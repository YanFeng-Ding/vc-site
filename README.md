# VC投资人 · 个人网站（全球创投前沿科技自媒体）

纯静态站，push 即自动部署到 GitHub Pages，域名 `vcinvest.d.gv.vc`。

## 目录结构

```
├── index.html          首页（Hero + 订阅 + 精选 + CPM 广告位）
├── briefings.html      前沿风向（时间轴周报）
├── themes.html         专题（六大赛道）
├── deep-dives.html     深度（长文列表）
├── article.html        文章页（打赏 / 转发 / 评论 / 文内 CPC 广告位）
├── contact.html        联系（zondas@live.com / 微信 royextra88）
├── styles.css          全站样式（主色紫 --accent / 辅助橙 --accent2）
├── CNAME               自定义域名（已配置 vcinvest.d.gv.vc）
└── .github/workflows/deploy.yml   自动部署工作流
```

## 上线步骤（约 15 分钟）

### 1. 创建 GitHub 仓库（账号 yanfeng-ding）
- 新建仓库，名字建议 `vc-site`（或任意），**Public**
- 把本目录所有文件（含 `.github` 隐藏目录）push 到 `main` 分支：

```bash
cd vc-site-prototype
git init
git add .
git commit -m "init: vc site"
git branch -M main
git remote add origin https://github.com/yanfeng-ding/<仓库名>.git
git push -u origin main
```

### 2. 开启 GitHub Pages
- 仓库 → **Settings → Pages → Source 选「GitHub Actions」**
- 首次 push 后工作流会自动跑一次，地址先为 `https://yanfeng-ding.github.io/<仓库名>/`

### 3. 绑定域名
- CNAME 文件已放在仓库根目录，无需再改
- 仓库 → Settings → Pages → Custom domain 填 `vcinvest.d.gv.vc` → Save
- 勾选 **Enforce HTTPS**（证书签发需几分钟到 24 小时）

### 4. 解析域名（在 gv.vc 子域名服务的管理面板）
添加一条 CNAME 记录：

| 类型 | 主机记录 | 记录值 |
|------|----------|--------|
| CNAME | vcinvest | yanfeng-ding.github.io |

> 注意：若该子域名服务只支持配置 A 记录，则填 GitHub Pages 的 A 记录：
> 185.199.108.153 / 185.199.109.153 / 185.199.110.153 / 185.199.111.153

### 5. 验证
- DNS 生效后访问 `https://vcinvest.d.gv.vc`
- 以后更新内容：改 HTML → `git push` → 自动重新部署，无需任何手动操作

## 后续接入清单（按需）

| 事项 | 操作 |
|------|------|
| 评论系统 | 注册 giscus，把 `article.html` 的评论占位区替换为 giscus 脚本 |
| 打赏码 | 用微信/支付宝真实赞赏码图片替换 `article.html` 中的 SVG 占位 |
| 微信二维码 | 「我 → 二维码名片」保存图片替换 `contact.html` 占位 |
| 邮件订阅 | 注册 Buttondown（免费），替换首页订阅表单 action |
| 广告 | 过 AdSense 门槛后（需一定内容量），把广告占位替换为广告单元代码 |
| 统计 | 页脚前插入 Umami / Plausible / Cloudflare Analytics 脚本 |
