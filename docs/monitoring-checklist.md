# Schema Form Platform 持续监控检查清单

> 创建日期：2026/06/10
> 文档版本：v1.0
> 维护人：开发团队

---

## 一、测试监控

### 1.1 每次提交前检查

| 检查项 | 命令 | 预期结果 | 失败处理 |
|--------|------|----------|----------|
| 服务端测试 | `pnpm --filter @schema-form/server test` | 666 tests passed | 修复失败用例后再提交 |
| 编辑器测试 | `pnpm --filter @schema-form/editor-web test` | 1729+ tests passed | 修复失败用例后再提交 |
| 流程测试 | `pnpm --filter @schema-form/flow-web test` | 479 tests passed | 修复失败用例后再提交 |
| AI 应用测试 | `pnpm --filter @schema-form/ai-app test` | 357 tests passed | 修复失败用例后再提交 |
| TypeScript 检查 | `pnpm build:editor && pnpm build:flow && pnpm build:shell` | 无类型错误 | 修复类型错误后再提交 |

### 1.2 每周回归测试

| 检查项 | 命令 | 预期结果 | 失败处理 |
|--------|------|----------|----------|
| 全量测试 | `pnpm test` | 所有测试通过 | 分析失败原因，创建 Issue |
| 测试覆盖率 | `pnpm --filter @schema-form/editor-web test -- --coverage` | 核心模块 > 80% | 补充缺失测试 |
| 构建验证 | `pnpm build` | 所有包构建成功 | 修复构建错误 |
| 依赖检查 | `pnpm outdated` | 无重大安全漏洞 | 更新依赖版本 |

### 1.3 测试通过率监控

| 模块 | 测试文件数 | 测试用例数 | 通过率目标 |
|------|-----------|-----------|-----------|
| server | 43 | 666 | 100% |
| editor-web | 78 | 1730 | 100% |
| flow-web | 34 | 479 | 100% |
| ai-app | 19 | 357 | 100% |
| **总计** | **174** | **3232** | **100%** |

---

## 二、性能监控

### 2.1 API 响应时间

| 端点 | 目标响应时间 | 监控方式 | 告警阈值 |
|------|-------------|----------|----------|
| GET /api/health | < 100ms | 定时请求 | > 500ms |
| POST /api/auth/login | < 500ms | 日志分析 | > 2s |
| GET /api/schemas | < 300ms | 日志分析 | > 1s |
| GET /api/menus/route | < 200ms | 日志分析 | > 500ms |
| GET /api/micro-apps | < 200ms | 日志分析 | > 500ms |

### 2.2 微应用加载时间

| 微应用 | 目标加载时间 | 监控方式 | 告警阈值 |
|--------|-------------|----------|----------|
| editor | < 2s | Performance API | > 5s |
| flow | < 2s | Performance API | > 5s |
| ai-app | < 2s | Performance API | > 5s |
| admin | < 1.5s | Performance API | > 4s |
| portal | < 1s | Performance API | > 3s |

### 2.3 数据库性能

| 指标 | 目标值 | 监控方式 | 告警阈值 |
|------|--------|----------|----------|
| 连接池状态 | connected | /api/health | disconnected |
| 查询响应时间 | < 50ms | 日志分析 | > 200ms |
| 连接数 | < 100 | MongoDB 监控 | > 150 |

---

## 三、服务健康监控

### 3.1 健康检查端点

```bash
# 检查 API 服务状态
curl http://localhost:3001/api/health

# 预期响应
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": 1234567890,
    "uptime": 3600,
    "database": "connected"
  }
}
```

### 3.2 服务状态检查清单

| 检查项 | 检查命令 | 预期结果 | 失败处理 |
|--------|----------|----------|----------|
| API 服务 | `curl http://localhost:3001/api/health` | status: ok | 重启服务 |
| 数据库连接 | `curl http://localhost:3001/api/health` | database: connected | 检查 MongoDB |
| 前端服务 | `curl http://localhost:5173` | 200 OK | 重启 Vite |
| Shell 服务 | `curl http://localhost:4100` | 200 OK | 重启 Shell |
| Admin 服务 | `curl http://localhost:5400` | 200 OK | 重启 Admin |

### 3.3 生产环境监控

| 检查项 | 检查命令 | 预期结果 | 失败处理 |
|--------|----------|----------|----------|
| API 服务 | `curl http://***REMOVED***:30001/api/health` | status: ok | SSH 检查 pm2 |
| 前端服务 | `curl http://***REMOVED***:8828` | 200 OK | 检查 nginx |
| 数据库 | `curl http://***REMOVED***:30001/api/health` | database: connected | 检查 Docker |

---

## 四、日志监控

### 4.1 关键日志检查

| 日志类型 | 检查频率 | 关注内容 | 告警条件 |
|----------|----------|----------|----------|
| 错误日志 | 实时 | Error, Exception, FATAL | 出现任何错误 |
| 认证日志 | 每小时 | 登录失败、token 刷新失败 | 失败率 > 5% |
| API 日志 | 每小时 | 响应时间、状态码 | 5xx 错误 |
| 数据库日志 | 每天 | 连接异常、查询超时 | 任何异常 |

### 4.2 日志查看命令

```bash
# 查看 API 服务日志
pm2 logs schema-form-server

# 查看错误日志
pm2 logs schema-form-server --err

# 查看最近 100 行日志
pm2 logs schema-form-server --lines 100

# 实时监控
pm2 monit
```

---

## 五、业务流程监控

### 5.1 端到端业务流程检查

| 流程 | 检查步骤 | 预期结果 | 检查频率 |
|------|----------|----------|----------|
| 用户登录 | 1. 访问 /login <br> 2. 输入用户名密码 <br> 3. 点击登录 | 登录成功，跳转首页 | 每次部署 |
| 表单设计 | 1. 点击菜单进入 editor <br> 2. 拖拽组件 <br> 3. 配置属性 <br> 4. 保存 schema | Schema 保存成功 | 每次部署 |
| 流程设计 | 1. 点击菜单进入 flow <br> 2. 设计流程 <br> 3. 保存流程 | 流程保存成功 | 每次部署 |
| AI 应用 | 1. 点击菜单进入 ai-app <br> 2. 发送消息 <br> 3. 查看响应 | AI 响应正常 | 每次部署 |
| 系统管理 | 1. 点击菜单进入 admin <br> 2. 管理微应用 <br> 3. 管理菜单 | CRUD 操作成功 | 每次部署 |
| 退出登录 | 1. 点击用户头像 <br> 2. 选择退出 <br> 3. 确认跳转登录页 | 状态清除，跳转登录 | 每次部署 |

### 5.2 自动化端到端测试脚本

```bash
#!/bin/bash
# e2e-test.sh - 端到端测试脚本

set -e

echo "=== 端到端测试开始 ==="

# 1. 检查服务健康
echo "1. 检查 API 服务..."
curl -s http://localhost:3001/api/health | grep -q '"status":"ok"' || exit 1

# 2. 检查前端服务
echo "2. 检查前端服务..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:4100 | grep -q "200" || exit 1

# 3. 测试登录 API
echo "3. 测试登录 API..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')
echo "$LOGIN_RESPONSE" | grep -q "accessToken" || exit 1

# 4. 提取 token
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

# 5. 测试获取用户信息
echo "4. 测试获取用户信息..."
curl -s http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | grep -q "username" || exit 1

# 6. 测试获取菜单
echo "5. 测试获取菜单..."
curl -s http://localhost:3001/api/menus/route \
  -H "Authorization: Bearer $TOKEN" | grep -q "name" || exit 1

# 7. 测试获取微应用配置
echo "6. 测试获取微应用配置..."
curl -s http://localhost:3001/api/micro-apps \
  -H "Authorization: Bearer $TOKEN" | grep -q "name" || exit 1

echo "=== 端到端测试完成 ==="
```

---

## 六、告警配置

### 6.1 告警规则

| 告警类型 | 触发条件 | 通知方式 | 处理人 |
|----------|----------|----------|--------|
| 服务宕机 | /api/health 返回错误 | 邮件 + 短信 | 运维 |
| 数据库断连 | database: disconnected | 邮件 + 短信 | 运维 |
| 响应超时 | API 响应 > 5s | 邮件 | 开发 |
| 错误率飙升 | 5xx 错误 > 10% | 邮件 | 开发 |
| 磁盘空间 | 剩余 < 10% | 邮件 | 运维 |
| 内存使用 | 使用 > 90% | 邮件 | 运维 |

### 6.2 告警联系人

| 角色 | 联系方式 | 职责 |
|------|----------|------|
| 运维负责人 | [待填写] | 服务稳定性 |
| 开发负责人 | [待填写] | 功能异常 |
| 产品负责人 | [待填写] | 业务影响 |

---

## 七、监控工具推荐

### 7.1 开发环境

| 工具 | 用途 | 配置 |
|------|------|------|
| Vitest | 单元测试 | 已配置 |
| Vue DevTools | 前端调试 | 浏览器插件 |
| MongoDB Compass | 数据库管理 | GUI 工具 |
| Postman | API 测试 | 接口调试 |

### 7.2 生产环境

| 工具 | 用途 | 配置 |
|------|------|------|
| PM2 | 进程管理 | 已配置 |
| Nginx | 反向代理 | 已配置 |
| MongoDB Atlas | 数据库监控 | 云服务 |
| Uptime Robot | 服务可用性 | 免费计划 |

---

## 八、监控检查频率

| 检查类型 | 频率 | 负责人 | 检查内容 |
|----------|------|--------|----------|
| 服务健康 | 每 5 分钟 | 自动 | /api/health |
| 错误日志 | 实时 | 自动 | 错误日志 |
| 性能指标 | 每小时 | 自动 | 响应时间 |
| 业务流程 | 每次部署 | 开发 | 端到端测试 |
| 全量回归 | 每周 | 开发 | 所有测试 |
| 依赖更新 | 每月 | 开发 | 安全漏洞 |

---

## 九、问题处理流程

### 9.1 问题分级

| 级别 | 定义 | 响应时间 | 处理时间 |
|------|------|----------|----------|
| P0 | 服务完全不可用 | 5 分钟 | 30 分钟 |
| P1 | 核心功能不可用 | 15 分钟 | 2 小时 |
| P2 | 非核心功能异常 | 1 小时 | 24 小时 |
| P3 | 体验问题 | 24 小时 | 1 周 |

### 9.2 处理流程

```
发现问题 → 判断级别 → 通知负责人 → 分析原因 → 修复问题 → 验证修复 → 更新文档
```

---

## 十、监控报告模板

### 周报模板

```markdown
# 监控周报 - [日期]

## 1. 服务可用性
- API 服务：99.9%
- 前端服务：99.8%
- 数据库：100%

## 2. 性能指标
- 平均响应时间：150ms
- 95% 响应时间：300ms
- 错误率：0.1%

## 3. 测试情况
- 测试通过率：100%
- 新增测试：15 个
- 覆盖率：82%

## 4. 问题处理
- P0 问题：0 个
- P1 问题：1 个（已解决）
- P2 问题：3 个（2 个已解决）

## 5. 下周计划
- 优化 API 响应时间
- 补充单元测试
- 更新依赖版本
```

---

## 附录：常用监控命令

```bash
# 服务状态
pm2 status
pm2 monit

# 日志查看
pm2 logs
pm2 logs --err
pm2 logs --lines 100

# 性能分析
pm2 profile

# 重启服务
pm2 restart all
pm2 restart schema-form-server

# 停止服务
pm2 stop all
pm2 stop schema-form-server

# 数据库状态
docker ps | grep mongo
docker logs mongo-db

# 磁盘空间
df -h
du -sh /var/log/*

# 内存使用
free -h
top -b -n 1 | head -20
```

---

**文档版本历史**:
- v1.0 (2026/06/10)：初始版本，包含完整监控检查清单
