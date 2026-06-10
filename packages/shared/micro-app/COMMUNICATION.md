# 子应用通信优化 (S6-05)

## 概述

实现了统一的 Portal <-> 子应用通信协议，提供类型安全的双向通信机制。

## 新增文件

### 1. `events.ts` - 事件类型定义

定义了标准的事件类型和数据格式：

- **PortalToChildEvents**: Portal -> 子应用的指令事件
  - `portal:set-context` - 设置上下文数据
  - `portal:schema-updated` - Schema 更新通知
  - `portal:flow-updated` - 流程更新通知
  - `portal:execute-action` - 执行动作请求
  - `portal:theme-changed` - 主题变更通知
  - `portal:locale-changed` - 语言变更通知

- **ChildToPortalEvents**: 子应用 -> Portal 的状态上报事件
  - `child:ready` - 子应用就绪
  - `child:status-changed` - 状态变更
  - `child:preview-schema` - 请求预览 Schema
  - `child:preview-flow` - 请求预览流程
  - `child:published` - 发布完成通知
  - `child:open-in-editor` - 请求在编辑器打开
  - `child:error` - 错误上报
  - `child:data-changed` - 数据变更上报

### 2. `communication.ts` - 统一通信 API

提供完整的双向通信机制：

#### 核心 API

- `initCommunication(options)` - 初始化通信模块
- `send(type, payload, target?, source?)` - 发送事件
- `request(type, payload, target?, source?, timeout?)` - 发送请求并等待响应
- `respond(originalMessage, payload, target?, source?)` - 响应请求
- `on(type, handler)` - 监听事件
- `once(type, handler)` - 监听事件（一次性）
- `off(type)` - 移除指定类型监听器
- `destroy()` - 清理所有监听器和待处理请求

#### Portal 侧便捷 API

- `sendToChild(appName, type, payload, targetWindow?)` - 向子应用发送指令
- `requestFromChild(appName, type, payload, targetWindow?, timeout?)` - 向子应用请求数据

#### 子应用侧便捷 API

- `reportToPortal(type, payload, appName)` - 向 Portal 上报状态
- `listenFromPortal(type, handler)` - 监听 Portal 指令
- `respondToPortal(originalMessage, payload, appName)` - 响应 Portal 请求

### 3. `__tests__/communication.test.ts` - 测试文件

包含 22 个测试用例，覆盖：

- 初始化和配置
- 消息发送和接收
- 事件监听和取消监听
- 请求-响应模式（带超时）
- 错误处理
- 便捷 API

### 4. `vitest.config.ts` - 测试配置

## 修改文件

### 1. `package.json`

- 添加 `events` 和 `communication` 导出
- 添加 `test` 脚本
- 添加 `vitest` 依赖

### 2. `index.ts`

- 导出新的事件类型和通信 API

### 3. 根目录 `package.json`

- 添加 `test` 脚本运行 micro-app 测试

## 特性

1. **类型安全**: 所有事件类型都有完整的 TypeScript 类型定义
2. **双向通信**: 支持 Portal -> 子应用 和 子应用 -> Portal 两个方向
3. **请求-响应模式**: 支持带超时的请求-响应模式
4. **错误处理**: 完整的错误处理机制，支持自定义错误回调
5. **调试支持**: 可选的调试日志输出
6. **向后兼容**: 保留旧版 `bridge.ts` 的 API

## 使用示例

### Portal 侧

```typescript
import { initCommunication, sendToChild, listenFromPortal } from '@schema-form/micro-app'

// 初始化
initCommunication({ debug: true })

// 监听子应用就绪事件
listenFromPortal('child:ready', (payload) => {
  console.log('Child app ready:', payload.appName)
})

// 向子应用发送上下文
sendToChild('editor', 'portal:set-context', {
  context: { schemaId: '123' }
})
```

### 子应用侧

```typescript
import { initCommunication, reportToPortal, listenFromPortal } from '@schema-form/micro-app'

// 初始化
initCommunication({ debug: true })

// 通知 Portal 已就绪
reportToPortal('child:ready', { appName: 'editor', version: '1.0.0' }, 'editor')

// 监听 Portal 指令
listenFromPortal('portal:set-context', (payload) => {
  console.log('Received context:', payload.context)
})
```

## 测试结果

```
✓ __tests__/communication.test.ts (22 tests) 16ms

Test Files  1 passed (1)
     Tests  22 passed (22)
  Start at  00:39:39
  Duration  271ms (transform 21ms, setup 0ms, collect 16ms, tests 16ms, environment 110ms, prepare 13ms)
```
