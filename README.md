## JumpFrp 前端（Vue 3 + Vite）

前端面板，默认通过环境变量 `VITE_API_BASE_URL` 调用后端 API。

## 环境要求

- Node.js >= 18
- pnpm >= 10.11.0（项目内置 `packageManager: pnpm@10.11.0`）

## 本地开发

```bash
pnpm install

# 配置本地 API 地址
echo "VITE_API_BASE_URL=http://localhost:3000" > .env.development

# 如需启用登录密码加密（可选）
# echo "VITE_AUTH_RSA_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\nMIIB...\n-----END PUBLIC KEY-----" >> .env.development

pnpm dev  # 访问本地开发地址（以控制台输出为准）
```

## 构建部署

```bash
pnpm build
# 产物位于 dist/，可由 Nginx/静态托管平台部署
```

### Vercel 部署（独立前端项目）

在 Vercel 项目中设置环境变量：
- `VITE_API_BASE_URL=https://api.your-domain.com`
- `VITE_AUTH_RSA_PUBLIC_KEY=...`（可选，RSA 公钥，PEM/SPKI，支持单行 `\n`）

vercel.json（示例，已在项目内）：
```json
{
  "version": 2,
  "framework": "vite",
  "buildCommand": "corepack enable && corepack prepare pnpm@10.11.0 --activate && pnpm install && pnpm build",
  "outputDirectory": "dist",
  "routes": [
    { "handle": "filesystem" },
    { "src": "/.*", "dest": "/index.html" }
  ]
}
```

## 环境变量说明

- `VITE_API_BASE_URL`：后端 API 基础地址（例如 `https://api.jumpfrp.top`）
- `VITE_AUTH_RSA_PUBLIC_KEY`：RSA 公钥（PEM，SPKI），若配置则前端在登录/注册时会额外发送 `password_enc`

公钥单行示例：
```
-----BEGIN PUBLIC KEY-----\nMIIB...\n-----END PUBLIC KEY-----
```

## 代码风格

- 使用 Prettier 进行格式化
- 命令：`pnpm format`
