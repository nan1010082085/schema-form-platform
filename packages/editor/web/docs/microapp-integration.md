# Microapp 嵌入集成

## 概述

Microapp 是 schema-form-platform 的独立嵌入方案，将已发布的表单 Schema 渲染为独立应用，嵌入到任意宿主页面中。适用于以下场景：

- 在已有业务系统中嵌入动态表单
- 将表单作为独立页面片段嵌入第三方站点
- 通过 Iframe 隔离运行，宿主页面无需依赖 Vue 或 Element Plus

Microapp 有两种嵌入方式，核心能力一致：加载已发布 Schema、渲染表单、提供表单操作 API、支持双向消息通信。

## 嵌入方式一：Script 标签 + loadMicroapp()

适用于宿主页面能直接执行 JS 的场景（如同域页面、微前端子模块）。

### 加载

```html
<!-- 宿主页面 -->
<div id="my-form"></div>

<script src="https://cdn.example.com/schema-form-microapp.umd.js"></script>
<script>
  SchemaFormMicroapp.loadMicroapp({
    publishId: 'your-publish-id',
    container: '#my-form',
    baseUrl: 'https://schema-form-platform.vercel.app/api',
    token: 'your-auth-token',
  }).then(api => {
    // api 即 MicroappApi，详见下方接口说明
    window.__formApi = api
  })
</script>
```

### MicroappConfig 配置项

```typescript
interface MicroappConfig {
  /** 已发布的 Schema publishId（必填） */
  publishId: string

  /** 渲染容器 — DOM 元素或 CSS 选择器（必填） */
  container: HTMLElement | string

  /** API 基础 URL（可选，默认使用 apiClient 已配置值） */
  baseUrl?: string

  /** 认证 token（可选） */
  token?: string
}
```

### 加载流程

1. 解析容器 DOM 元素
2. 清理已有实例（如果重复调用）
3. 配置 API 客户端（baseUrl / token）
4. 通过 `publishId` 从后端获取已发布的 Schema JSON
5. 将 `FormSchemaItem[]` 转换为 `Widget[]` 树
6. 创建独立 Vue 应用（含 Pinia + Element Plus），挂载到容器
7. 初始化 postMessage 通信层
8. 返回 `MicroappApi` 实例

## 嵌入方式二：Iframe + postMessage

适用于跨域隔离、安全敏感、宿主页面无法直接执行子应用 JS 的场景。

### 宿主页面

```html
<!-- 方式 A：直接嵌入已发布表单的 URL -->
<iframe
  id="form-iframe"
  src="https://schema-form-platform.vercel.app/view?id=your-publish-id"
  style="width: 100%; height: 600px; border: none;"
></iframe>

<script type="module">
  import { createMicroappHost } from 'https://cdn.example.com/schema-form-microapp.esm.js'

  const iframe = document.getElementById('form-iframe')
  const host = createMicroappHost(iframe)

  // 监听就绪事件
  host.on('ready', () => {
    console.log('Microapp 已就绪')
  })

  // 获取表单数据
  const values = await host.sendCommand('getValues')
  console.log(values)

  // 设置表单数据
  await host.sendCommand('setValues', { name: '张三', age: 30 })

  // 校验表单
  const valid = await host.sendCommand('validate')

  // 提交表单
  await host.sendCommand('submit')

  // 监听提交成功
  host.on('submitSuccess', (data) => {
    console.log('提交成功:', data)
  })

  // 监听校验失败
  host.on('validationError', (errors) => {
    console.error('校验失败:', errors)
  })

  // 销毁
  host.destroy()
</script>
```

### 方式 B：宿主自行构建 Iframe URL

```
https://schema-form-platform.vercel.app/view?id={publishId}
```

Iframe 内的页面加载完成后会自动向 `parent` 发送 `ready` 事件。

## MicroappApi 对外接口

`loadMicroapp()` 返回的 API 对象，用于在 Script 标签模式下直接操作表单：

```typescript
interface MicroappApi {
  /** 获取当前表单所有字段值 */
  getValues(): Record<string, unknown>

  /** 设置表单字段值（合并覆盖，只覆盖传入的字段） */
  setValues(values: Record<string, unknown>): void

  /** 校验表单，返回是否通过（检查所有 required 规则） */
  validate(): Promise<boolean>

  /** 提交表单：先校验，通过后触发 submitSuccess 事件 */
  submit(): Promise<void>

  /** 销毁 microapp 实例，卸载 Vue 应用、清空容器 DOM */
  destroy(): void
}
```

### 使用示例

```javascript
const api = await SchemaFormMicroapp.loadMicroapp({
  publishId: 'abc123',
  container: '#form-container',
  baseUrl: '/api',
})

// 设置初始值
api.setValues({ department: '研发部', level: 'P6' })

// 获取用户填写的值
const formData = api.getValues()
// => { department: '研发部', level: 'P6', name: '...', ... }

// 提交前校验
const isValid = await api.validate()
if (isValid) {
  await api.submit()
}

// 页面卸载前清理
window.addEventListener('beforeunload', () => {
  api.destroy()
})
```

## postMessage 通信协议

Iframe 模式下，宿主与 Microapp 之间通过 `window.postMessage` 双向通信。

### 协议标识

所有消息都包含 `schemaFormMicroapp: true` 字段，用于区分其他 postMessage 消息。

### 消息结构

```typescript
interface MicroappMessage {
  /** 协议标识，固定为 true */
  schemaFormMicroapp: true
  /** 消息类型：command（宿主发给微应用）| event（微应用发给宿主） */
  type: 'command' | 'event'
  /** 操作名 */
  action: string
  /** 数据载荷 */
  payload?: unknown
  /** 请求 ID，用于关联请求和响应 */
  requestId?: string
}
```

### 命令（Host -> Guest）

宿主通过 `createMicroappHost(iframe).sendCommand()` 发送命令：

| action | payload | 响应 |
|---|---|---|
| `getValues` | 无 | `Record<string, unknown>` |
| `setValues` | `Record<string, unknown>` | 无 |
| `validate` | 无 | `boolean` |
| `submit` | 无 | 无（成功时 Guest 主动发送 `submitSuccess` 事件） |
| `destroy` | 无 | 无 |

每个命令都携带 `requestId`，Guest 处理后通过同名 `requestId` 返回响应。宿主侧有 10 秒超时保护。

### 事件（Guest -> Host）

Guest 在特定时机主动向宿主发送事件：

| 事件名 | payload | 触发时机 |
|---|---|---|
| `ready` | 无 | Microapp Vue 应用挂载完成 |
| `valueChange` | `Record<string, unknown>` | 表单字段值变更 |
| `submitSuccess` | 表单数据 | 提交成功（校验通过） |
| `submitError` | 错误信息 | 提交失败 |
| `validationError` | 校验错误详情 | 校验未通过 |
| `error` | 错误信息 | 命令执行异常 |

### 手动发送事件

Microapp 内部可通过 `emitToHost` 主动向宿主发送事件：

```typescript
import { emitToHost } from '@/microapp/postMessage'

// 自定义业务事件
emitToHost('submitSuccess', { id: '123', status: 'ok' })
```

## MicroAppMessenger（顶层通信管理）

`utils/microapp.ts` 中提供了一个简单的消息管理类，适用于宿主页面需要同时管理多个 Microapp 实例的场景：

```typescript
import { MicroAppMessenger } from '@/utils/microapp'

const messenger = new MicroAppMessenger()

// 注册消息处理器（按 publishId 区分）
messenger.on('form-abc', (data) => {
  console.log('收到表单 abc 的消息:', data)
})

// 发送消息
messenger.send('form-abc', 'setValues', { name: '李四' })

// 移除监听
messenger.off('form-abc')

// 销毁
messenger.destroy()
```

## 注意事项

### 样式隔离

- Script 标签模式：Microapp 创建独立 Vue 实例，Element Plus 样式注入到容器内部，不会污染宿主页面
- Iframe 模式：天然隔离，无需额外处理
- 容器内使用 `position: relative` 定位上下文，确保弹出层（Tooltip、Dropdown）正确定位

### 生命周期

- `loadMicroapp()` 内部会先调用 `destroyMicroapp()` 清理已有实例，重复调用不会产生多个 Vue 应用
- 必须在页面卸载前调用 `api.destroy()` 或 `host.destroy()` 清理事件监听和 DOM
- Iframe 模式下 `createMicroappHost` 的 10 秒超时机制防止命令无响应导致 Promise 永远 pending

### 多实例

- Script 标签模式：当前设计为单实例（全局变量 `app` / `pinia` / `hostContainer`），重复调用 `loadMicroapp()` 会销毁前一个实例。如需多实例，应在不同容器中分别加载，或使用 Iframe 模式
- Iframe 模式：每个 Iframe 独立运行，天然支持多实例，通过 `createMicroappHost` 分别管理

### API 配置

如果宿主页面未传入 `baseUrl` 或 `token`，Microapp 会使用 `apiClient` 的已有配置。在同域部署场景下，可省略这些参数。
