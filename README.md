# 云盒 CloudBox

一个带「用户注册 / 登录」和「文件上传」功能的网站。

- **前端**：原生 HTML + CSS + JavaScript（`public/` 目录，无任何前端框架）
- **后端**：Next.js（App Router API Routes，仅作为后端和静态文件服务）
- **数据库**：Vercel Postgres（Neon），`postgres.js` 驱动
- **文件存储**：Vercel Blob
- **部署**：Vercel（与存储一键集成）

## 功能

- 用户注册 / 登录 / 退出（bcrypt 密码哈希 + HttpOnly Cookie 会话，7 天有效）
- 点击或拖拽上传文件，多文件排队、实时进度条，单文件 ≤ 4 MB
- 文件列表：打开、复制链接、删除（只能看到和操作自己的文件）
- 数据库表在首次访问 API 时自动创建（幂等），**无需手动执行 SQL**

## 目录结构

```
cloud-drive/
├── app/
│   ├── layout.js / not-found.js      # Next.js 根布局与 404 页（最简）
│   └── api/
│       ├── auth/
│       │   ├── register/route.js     # POST 注册（成功自动登录）
│       │   ├── login/route.js        # POST 登录（邮箱或用户名）
│       │   ├── logout/route.js       # POST 退出
│       │   └── me/route.js           # GET  当前用户
│       └── files/
│           ├── route.js              # GET  文件列表
│           ├── upload/route.js       # POST 上传（multipart/form-data）
│           └── [id]/route.js         # DELETE 删除（含 Blob 对象）
├── lib/
│   ├── db.js                         # 数据库连接（惰性）+ 自动建表
│   ├── auth.js                       # 密码哈希、会话、Cookie、校验
│   └── http.js                       # 统一的错误响应
├── db/schema.sql                     # 建表 SQL（自动执行，也可手动运行）
├── public/                           # ← 前端全部在这里（纯 HTML/CSS/JS）
│   ├── index.html / login.html / register.html / dashboard.html
│   ├── css/style.css
│   └── js/（api.js 公共工具 + 各页面逻辑）
├── next.config.mjs                   # 把 /、/login 等简洁路径映射到 HTML
└── package.json
```

## 本地开发

```bash
npm install
cp .env.example .env.local   # 然后填写其中的环境变量
npm run dev                  # http://localhost:3000
```

环境变量说明（见 `.env.example`）：

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `POSTGRES_URL` 或 `DATABASE_URL` | 是 | PostgreSQL 连接串，配一个即可。本地可用 Docker：`docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16`，连接串填 `postgres://postgres:postgres@localhost:5432/postgres` |
| `BLOB_READ_WRITE_TOKEN` | 上传功能需要 | 在 Vercel 控制台 → Storage → 你的 Blob 存储 → .env 选项卡里可复制 |

> 没有配置环境变量时页面仍能打开，但注册/登录/上传接口会返回明确的错误提示，方便排查。

## 部署到 Vercel（推荐）

1. **推送代码到 GitHub**

   ```bash
   cd cloud-drive
   git init && git add . && git commit -m "init"
   git remote add origin https://github.com/<你的用户名>/cloud-drive.git
   git push -u origin main
   ```

2. **导入项目**：[vercel.com](https://vercel.com) → Add New… → Project → 导入该仓库。框架会自动识别为 Next.js，所有配置保持默认即可。

3. **创建数据库**：项目页面 → **Storage** 标签 → Create → **Postgres（Neon）** → 选离用户最近的区域 → **Connect to Project**。Vercel 会自动把 `POSTGRES_URL` / `DATABASE_URL` 等环境变量注入项目。

4. **创建 Blob 存储**：**Storage** → Create → **Blob** → **Connect to Project**，自动注入 `BLOB_READ_WRITE_TOKEN`。

5. **部署**：点击 Deploy。若第 3、4 步是在首次部署之后才完成的，去 Deployments 里 **Redeploy** 一次，让新环境变量生效。

6. 打开线上地址，注册账号即可使用——首次访问 API 时会自动建表。

也可以用 Vercel CLI 部署：`npm i -g vercel && vercel`（存储仍需在控制台创建）。

## API 一览

| 方法 | 路径 | 说明 | 鉴权 |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | 注册 `{ username, email, password }`，成功即登录 | 否 |
| POST | `/api/auth/login` | 登录 `{ identifier(邮箱或用户名), password }` | 否 |
| POST | `/api/auth/logout` | 退出并清除会话 | 否 |
| GET | `/api/auth/me` | 当前登录用户，未登录返回 `{ user: null }` | 否 |
| GET | `/api/files` | 我的文件列表 | 是 |
| POST | `/api/files/upload` | 上传，表单字段名 `file`（multipart） | 是 |
| DELETE | `/api/files/:id` | 删除文件（数据库记录 + Blob 对象） | 是 |

错误统一返回 `{ "error": "中文提示" }`，鉴权失败为 401。

## 常见问题

**为什么限制单文件 4 MB？**
Vercel Serverless 函数的请求体上限约 4.5 MB，文件经过 `POST /api/files/upload` 中转。要支持大文件，可改为 `@vercel/blob/client` 的**客户端直传**：新增一个路由用 `handleUpload()` 签发一次性 token，前端用 `upload()` 直接把文件传给 Blob，不经过函数。

**Blob 里的文件是公开的吗？**
本项目的存储是 `access: 'public'`：任何拿到链接的人都能访问。链接带随机后缀、不易被猜测；若需要真正私密，可在创建 Blob 存储时选择 Private（Beta），并改造读取逻辑为带 token 校验。

**修改环境变量 / 连接存储后不生效？**
Vercel 注入环境变量后需要重新部署一次。

**表结构在哪里定义？**
`lib/db.js` 的 `ensureSchema()`（与 `db/schema.sql` 一致）。想在启动前手动建表，也可以把 `db/schema.sql` 粘贴到数据库控制台的 SQL 编辑器执行。

## 安全设计 & 可扩展方向

已实现：bcrypt（10 轮）密码哈希、HttpOnly + SameSite=Lax + Secure（生产）会话 Cookie、会话过期自动清理、文件归属校验（列表/删除都带 `user_id` 条件）、文件名清洗 + `textContent` 渲染防 XSS。

可以继续做的：登录/注册接口限流（如 Upstash Ratelimit）、邮箱验证与密码找回、单用户存储配额、客户端直传支持大文件、Blob 私有化。
