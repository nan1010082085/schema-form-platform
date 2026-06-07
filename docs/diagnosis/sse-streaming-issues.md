# SSE 流式输出与断联问题诊断

**日期**: 2026-06-05
**状态**: 已修复

## 问题现象

AI 对话过程中 SSE 流式输出中断，前端收不到完整响应。多 agent 链路（如 editorAgent → flowAgent）执行时间较长时尤为明显。

## 根因分析

### 1. Nginx 默认缓冲 SSE 数据（P0）

Nginx 默认开启 `proxy_buffering on`，会把后端响应缓存在代理层再一次性转发给客户端。对 SSE 这种逐行推送的协议，数据会被积压到缓冲区满或连接关闭才发出，导致：
- 前端长时间收不到事件
- 缓冲区满时一次性涌入大量事件，丢失实时感

同时 Nginx 默认 `proxy_read_timeout 60s`，多 agent 链路超过 60 秒无数据返回时 Nginx 主动断开连接。

### 2. Node.js 默认 keepAliveTimeout 过短（P1）

Node.js HTTP server 默认 `keepAliveTimeout = 5000ms`（5 秒）。当 SSE 长连接上偶发 5 秒无数据传输时，server 端主动关闭 TCP 连接。Nginx 作为反代会继承这个行为。

### 3. LLM 单次调用无超时保护（P2）

DeepSeek API 偶发响应缓慢（>60 秒），ChatOpenAI 默认无 timeout 配置，导致：
- 请求挂起直到被上层超时切断
- 错误信息不明确，难以定位是 LLM 层还是网络层

## 修复方案

### 任务 1：Nginx 配置

文件: `deploy/nginx.conf`

- `proxy_buffering off` — 禁用缓冲，SSE 事件即时推送到客户端
- `proxy_cache off` — 禁用缓存
- `proxy_set_header Connection ''` — 清除 Connection header，避免 Nginx 将 HTTP/1.1 降级
- `proxy_read_timeout 300s` — 5 分钟读超时，覆盖多 agent 链路
- `proxy_send_timeout 300s` — 5 分钟写超时

### 任务 2：Node.js Server 超时

文件: `packages/server/src/index.ts`

- `server.keepAliveTimeout = 300_000` — 5 分钟 keep-alive
- `server.headersTimeout = 310_000` — 比 keepAliveTimeout 略大，避免竞态

### 任务 3：LLM 调用超时

文件: `packages/server/src/ai/services/llmCache.ts`

- `timeout: 120_000` — 2 分钟单次 LLM 调用超时

## 超时层级关系

```
Nginx proxy_read_timeout (300s)
  └── Node.js keepAliveTimeout (300s)
        └── LLM timeout (120s)
```

每层超时应该比内层更宽松，避免外层先于内层切断连接。当前配置满足：Nginx(300s) >= Server(300s) > LLM(120s)。

## 验证方式

1. 部署后检查 nginx 配置: `sudo nginx -t && sudo systemctl reload nginx`
2. 重启 Node.js 服务: `pm2 restart schema-server`
3. 触发一个多 agent 链路请求，观察 SSE 事件是否实时到达前端
4. 检查日志中无 `socket hang up` 或 `ECONNRESET` 错误
