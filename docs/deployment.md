# 发布流程

## 服务器信息

- 地址：ubuntu@pyflow.icu
- MongoDB：Docker 容器 `mongodb`，端口 27017，用户 formgrid
- 后端：pm2 管理，端口 30001
- 前端：nginx 静态服务，端口 443（HTTPS）

## 环境变量

`.env.production`（本地 + 服务器）：
```
NODE_ENV=production
PORT=30001
MONGODB_URI=mongodb://formgrid:formgrid2026@127.0.0.1:27017/schema-form?authSource=admin
DEEPSEEK_API_KEY=sk-xxx
CORS_ORIGINS=https://pyflow.icu
JWT_SECRET=xxx
```

## 发布步骤

### 1. 本地构建打包

```bash
# 设置服务器地址
export DEPLOY_SERVER=ubuntu@pyflow.icu

# 构建 + 打包（产物在 deploy/output/）
bash deploy/pack.sh
```

pack.sh 执行：
- 后端：`tsc` 编译 server
- 前端：逐个 `vite build`（shell、editor、flow、ai、admin）
- 打包：将 dist/ + package.json + 共享包收集到 tarball

### 2. 上传 + 服务器部署

```bash
# 设置环境变量
export MONGODB_URI="mongodb://formgrid:formgrid2026@127.0.0.1:27017/schema-form?authSource=admin"
export DEEPSEEK_API_KEY="sk-xxx"

# 部署
bash deploy/deploy.sh
```

deploy.sh 执行：
- scp 上传 tarball 到服务器
- 解压到 ~/schema-form/
- pnpm install --prod
- 修复 workspace symlinks
- 配置 nginx
- pm2 restart

### 3. 手动修复（如 deploy.sh 失败）

```bash
# SSH 到服务器
ssh ubuntu@pyflow.icu

# 安装依赖
cd ~/schema-form && pnpm install --prod

# 重启后端
pm2 restart schema-form-server

# 验证
curl http://localhost:30001/api/health
```

## 目录结构（服务器）

```
~/schema-form/
├── packages/
│   ├── business/
│   │   ├── shell/dist/        # 主宿主前端
│   │   ├── admin/dist/        # 管理后台前端
│   │   └── shared/            # 业务公共
│   ├── platform/
│   │   ├── editor/dist/       # 编辑器前端
│   │   ├── flow/web/dist/     # 流程设计器前端
│   │   ├── flow/shared/       # 流程引擎核心
│   │   ├── ai/app/dist/       # AI 前端
│   │   ├── ai/shared/         # AI 共享（需 tsc 编译）
│   │   ├── server/dist/       # 后端 API
│   │   └── shared/            # 能力层公共
│   └── shared/socket/         # Socket.IO
├── .env.production
├── ecosystem.config.cjs
└── pnpm-workspace.yaml
```

## nginx 配置

关键 location 块（`/etc/nginx/sites-available/schema-platform`）：

```nginx
location /schema-platform/ {
    alias /home/ubuntu/schema-form/packages/business/shell/dist/;
    try_files $uri $uri/ /schema-platform/index.html;
}
location /schema-platform/editor/ {
    alias /home/ubuntu/schema-form/packages/platform/editor/dist/;
    try_files $uri $uri/ /schema-platform/editor/index.html;
}
location /schema-platform/api/ {
    rewrite ^/schema-platform/(.*) /$1 break;
    proxy_pass http://127.0.0.1:30001;
}
```

## 常见问题

### API 返回 502
- 检查 pm2 状态：`pm2 status`
- 检查日志：`pm2 logs schema-form-server --lines 20`
- 常见原因：MongoDB 连接失败、DEEPSEEK_API_KEY 未设置、ai-shared 未编译

### 前端 404
- 检查 nginx 配置中的 alias 路径是否匹配新目录结构
- 确认 dist/ 目录存在：`ls ~/schema-form/packages/business/shell/dist/`

### 登录跳转到 /login 而非 /schema-platform/login
- 检查 apiClient.ts 中 401 拦截器的跳转路径
- 已修复为 `/schema-platform/login`

### ai-shared 编译错误
- 服务器上无 TypeScript，需本地编译后上传 dist/
- `cd packages/platform/ai/shared && npx tsc`
- `scp -r dist/ ubuntu@pyflow.icu:~/schema-form/packages/platform/ai/shared/`

## 访问地址

| 服务 | 地址 |
|---|---|
| 主页 | https://pyflow.icu/schema-platform/ |
| 编辑器 | https://pyflow.icu/schema-platform/editor/ |
| 流程 | https://pyflow.icu/schema-platform/flow/ |
| AI | https://pyflow.icu/schema-platform/ai/ |
| 管理 | https://pyflow.icu/schema-platform/admin/ |
| API | https://pyflow.icu/schema-platform/api/ |
