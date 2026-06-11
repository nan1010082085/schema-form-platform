# SSO 单点登录方案设计

## 一、现状分析

**当前问题**：
1. portal 和 shell 各自维护独立的 localStorage key，登录态不互通
2. 子应用通过 micro-app data 属性接收 token，是手动传递而非标准协议
3. 没有 clientId 概念，无法区分不同客户端应用
4. portal 的 useAuth 没有 refreshToken 机制，只有 shell 有自动刷新
5. 子应用独立访问时需要自行处理认证，缺乏统一入口

## 二、SSO 架构设计

### 2.1 整体架构

```
                    ┌─────────────────────────┐
                    │    SSO Auth Center       │
                    │   /api/auth/sso/*        │
                    │                         │
                    │  ┌─────────────────┐    │
                    │  │  OAuth2 Server  │    │
                    │  │  (Authorization │    │
                    │  │   Code Flow)    │    │
                    │  └─────────────────┘    │
                    │                         │
                    │  ┌─────────────────┐    │
                    │  │  Session Store  │    │
                    │  │  (SSOSession)   │    │
                    │  └─────────────────┘    │
                    └─────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │   Shell      │  │   Portal     │  │  Standalone  │
   │  clientId=   │  │  clientId=   │  │  clientId=   │
   │  shell       │  │  portal      │  │  editor/flow │
   │              │  │              │  │  /ai/admin    │
   │  ┌────────┐  │  │              │  │              │
   │  │ Editor │  │  │              │  │              │
   │  │  Flow  │  │  │              │  │              │
   │  │  AI    │  │  │              │  │              │
   │  └────────┘  │  │              │  │              │
   └──────────────┘  └──────────────┘  └──────────────┘
```

### 2.2 认证流程

**核心思路**：采用简化版 OAuth2 授权码模式。SSO 中心颁发 `code`，客户端用 `code` 换取 `accessToken` + `refreshToken`。所有子系统共享同一个 SSO Session Cookie。

**流程**：

```
用户访问 Shell (未登录)
    │
    ▼
Shell 重定向 → /api/auth/sso/authorize?clientId=shell&redirect_uri=...
    │
    ▼
SSO 检查 Session Cookie
    │
    ├─ 有有效 Session → 直接颁发 code → 重定向回 Shell
    │
    └─ 无 Session → 显示登录页
        │
        ▼
    用户提交账号密码
        │
        ▼
    SSO 创建 Session + 颁发 code → 重定向回 Shell
        │
        ▼
Shell 用 code 调用 /api/auth/sso/token (clientId=shell)
    │
    ▼
返回 accessToken + refreshToken + user
    │
    ▼
Shell 存储 token，登录完成
```

## 三、数据模型设计

### 3.1 Client（客户端应用注册）

```typescript
interface IClient {
  _id: string              // UUID
  clientId: string         // 唯一标识，如 'shell', 'portal', 'editor', 'flow', 'ai', 'admin'
  name: string             // 显示名称
  secret: string           // 客户端密钥（可选，公开客户端不需要）
  redirectUris: string[]   // 允许的回调地址
  scopes: string[]         // 允许的权限范围
  type: 'public' | 'confidential'  // 公开客户端 vs 机密客户端
  status: 'active' | 'disabled'
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}
```

### 3.2 AuthorizationCode（授权码）

```typescript
interface IAuthorizationCode {
  _id: string              // UUID
  code: string             // 授权码（随机字符串，一次性使用）
  clientId: string         // 关联的客户端
  userId: string           // 关联的用户
  redirectUri: string      // 回调地址
  scopes: string[]         // 授权的权限范围
  expiresAt: Date          // 过期时间（5分钟）
  used: boolean            // 是否已使用
  createdAt: Date
}
```

### 3.3 SSOSession（SSO 会话）

```typescript
interface ISSOSession {
  _id: string              // UUID
  userId: string           // 关联的用户
  sessionToken: string     // Session Token（存储在 Cookie 中）
  userAgent: string        // 浏览器 UA
  ip: string               // 客户端 IP
  expiresAt: Date          // 过期时间（7天）
  createdAt: Date
  updatedAt: Date
}
```

## 四、API 设计

### 4.1 SSO 授权端点

```
GET /api/auth/sso/authorize
```

**参数**：
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| clientId | string | 是 | 客户端标识 |
| redirect_uri | string | 是 | 回调地址 |
| response_type | string | 是 | 固定为 'code' |
| scope | string | 否 | 权限范围，空格分隔 |
| state | string | 否 | 防 CSRF 的随机字符串 |

### 4.2 SSO Token 端点

```
POST /api/auth/sso/token
```

**请求体**：
```json
{
  "grant_type": "authorization_code",
  "code": "xxx",
  "clientId": "shell",
  "redirect_uri": "http://localhost:4100/auth/callback"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "userKey": "uuid-of-user",
    "user": { ... }
  }
}
```

### 4.3 SSO Refresh 端点

```
POST /api/auth/sso/refresh
```

**请求体**：
```json
{
  "refreshToken": "eyJ...",
  "clientId": "shell"
}
```

### 4.4 SSO Session 检查端点

```
GET /api/auth/sso/session
```

**Cookie**: `sso_session=xxx`

### 4.5 SSO Logout 端点

```
POST /api/auth/sso/logout
```

## 五、前端集成方案

### 5.1 共享 SSO 客户端（@schema-form/shared-utils/sso）

新增 `packages/shared/utils/sso.ts`，封装 SSO 流程。

### 5.2 Auth Store 统一化

将 portal 和 shell 的 auth store 统一为一个共享实现，使用统一的 localStorage key：
- `sfp_access_token`
- `sfp_refresh_token`
- `sfp_user_key`

### 5.3 静默刷新机制

在 accessToken 过期前 60 秒自动刷新。

## 六、实施计划

### Phase 1：后端 SSO 基础（~8h）
- Client 模型
- AuthorizationCode 模型
- SSOSession 模型
- SSO 路由
- Client 种子数据

### Phase 2：共享 SSO 客户端（~4h）
- SSOClient 类
- 统一 Auth Store
- useTokenRefresh
- AuthCallback 组件

### Phase 3：子系统接入（~6h）
- Shell/Portal 接入 SSO
- Editor/Flow/AI/Admin 独立模式

### Phase 4：微前端 Token 传递优化（~2h）
- micro-app data 统一格式
- 子应用 token 同步
- Token 过期联动

## 七、安全考量

1. 授权码一次性使用
2. 授权码 5 分钟过期
3. SSO Session Cookie：HttpOnly + Secure + SameSite=Lax
4. Token Rotation
5. redirect_uri 白名单
6. state 参数防 CSRF
7. rate limit
