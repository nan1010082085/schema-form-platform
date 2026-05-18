# RendererView postMessage 通信协议

## 一、概述

RendererView 通过 `postMessage` API 与宿主页面通信。宿主页面在 iframe 中嵌入 RendererView（路由 `/renderer?id=xxx`），通过消息协议注入 schema、读写 formData、接收事件。

## 二、消息格式

```typescript
interface ProtocolMessage {
  type: string           // 消息类型
  id?: string            // 请求 ID（请求-响应模式）
  payload?: unknown      // 消息体
  error?: string         // 错误信息（仅响应消息）
}
```

## 三、Host → Renderer 消息

### 注入 Schema

```javascript
iframe.contentWindow.postMessage({
  type: 'SET_SCHEMA',
  payload: [
    { type: 'input', field: 'name', label: '姓名' },
    { type: 'select', field: 'gender', label: '性别', options: [...] }
  ]
}, '*')
```

### 设置 formData

```javascript
iframe.contentWindow.postMessage({
  type: 'SET_FORMDATA',
  payload: { name: '张三', gender: 'male' }
}, '*')
```

### 请求获取 formData

```javascript
iframe.contentWindow.postMessage({
  type: 'GET_FORMDATA',
  id: 'req_001'
}, '*')
// 响应：
// { type: 'GET_FORMDATA', id: 'req_001', payload: { name: '张三', ... } }
```

### 注入上下文

```javascript
iframe.contentWindow.postMessage({
  type: 'SET_CONTEXT',
  payload: {
    user: { id: 'u1', name: '管理员' },
    global: { dictMap: { ORDER_STATUS: [...] } }
  }
}, '*')
```

## 四、Renderer → Host 消息

### 表单提交

```javascript
// iframe 内部触发，宿主监听：
window.addEventListener('message', (e) => {
  if (e.data.type === 'SUBMIT') {
    const formData = e.data.payload
    // 提交数据...
  }
})
```

### 动作事件

```javascript
{ type: 'ACTION', payload: { type: 'emit', eventName: 'export', eventPayload: { format: 'csv' } } }
```

### 高度变化（自适配）

```javascript
{ type: 'RESIZE', payload: { height: 800 } }
// 宿主更新 iframe 高度
```

## 五、完整消息清单

| 方向 | 类型 | 请求/通知 | 说明 |
|------|------|----------|------|
| H→R | `SET_SCHEMA` | 通知 | 注入 schema |
| H→R | `SET_FORMDATA` | 通知 | 设置表单数据 |
| H→R | `GET_FORMDATA` | 请求 | 获取表单数据 |
| H→R | `SET_CONTEXT` | 通知 | 注入用户/全局上下文 |
| R→H | `SUBMIT` | 通知 | 表单提交 |
| R→H | `ACTION` | 通知 | 按钮动作 |
| R→H | `RESIZE` | 通知 | 高度变化 |
| R→H | `ERROR` | 通知 | 渲染错误 |

## 六、宿主集成示例

### Vue 3

```vue
<template>
  <iframe ref="renderer" :src="rendererUrl" @load="onLoad" :style="{ height: iframeHeight + 'px' }" />
</template>

<script setup>
import { ref } from 'vue'
const renderer = ref()
const iframeHeight = ref(600)
const rendererUrl = '/renderer?id=form_demo'

function onLoad() {
  const iframe = renderer.value
  iframe.contentWindow.postMessage({ type: 'SET_SCHEMA', payload: mySchema }, '*')
}

window.addEventListener('message', (e) => {
  if (e.data.type === 'SUBMIT') {
    console.log('表单数据:', e.data.payload)
  }
  if (e.data.type === 'RESIZE') {
    iframeHeight.value = e.data.payload.height
  }
})
</script>
```

### React

```jsx
function FormRenderer({ schema }) {
  const iframeRef = useRef()
  useEffect(() => {
    iframeRef.current.contentWindow.postMessage({ type: 'SET_SCHEMA', payload: schema }, '*')
  }, [schema])

  useEffect(() => {
    const handler = (e) => { if (e.data.type === 'SUBMIT') handleSubmit(e.data.payload) }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])
  return <iframe ref={iframeRef} src="/renderer?id=form_demo" />
}
```

## 七、安全注意事项

- 生产环境应限制 `targetOrigin`，避免使用 `'*'`
- 校验消息来源域名
- 敏感数据（token）不要通过 postMessage 传输
