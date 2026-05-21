# 画布与组件边界

## 画布配置

```typescript
interface CanvasConfig {
  width: number              // 画布宽度，默认 1920
  height: number             // 画布高度，默认 1080
  backgroundColor: string    // 背景色
  padding: string            // 内边距
  zoom: number               // 缩放比例，100-150
}
```

## 缩放范围

当前版本支持 **100% ~ 150%** 缩放。

```
缩放时的坐标换算：
  实际 delta = 鼠标 delta / zoomLevel

  例：zoom = 150% 时，鼠标移动 150px → 组件实际移动 100px
```

## 画布边界

### 根级组件

根级组件不能拖出画布边界：

```
约束：
  x >= 0
  y >= 0
  x + w <= canvas.width
  y + h <= canvas.height
```

负坐标禁止。

### 容器内组件

容器内组件在容器本地坐标系内自由移动，不强制限制在容器可视区域内（容器可滚动）。

```
约束：
  无硬性边界限制
  容器内 overflow: auto，超出部分可滚动查看
```

### 容器自身

容器作为根级组件，受画布边界约束（同根级组件规则）。

## 拖拽边界

| 场景 | 规则 |
|---|---|
| 根级组件拖拽 | 限制在画布 `0,0 ~ canvas.width,canvas.height` 范围内 |
| 容器内组件拖拽 | 容器本地坐标系内自由移动 |
| 拖入容器 | 组件中心点进入容器 bounding box 即进入 |
| 拖出容器 | 组件中心点离开容器 bounding box 即回到根级 |
| 组件重叠 | 允许（自由定位模式） |
| 容器互相拖入 | 禁止（容器禁止嵌套） |
| 缩放时拖拽 | delta 除以 zoomLevel，保证手感一致 |

## 微前端加载

通过 microapp 微前端模式，在 dialog 等容器组件中加载已发布的表单资源。

### postMessage 通信设计

顶层维护统一的 postMessage 接口，支持对指定 ID 的已发布表单进行消息收发：

```typescript
interface PostMessagePayload {
  targetId: string           // 目标已发布表单的 publishId
  action: string             // 动作类型
  data?: unknown             // 附带数据
}
```

#### 发送消息（主应用 → 微前端表单）

```typescript
// 向指定已发布表单发送消息
postMessage({
  targetId: 'publish-xxx',
  action: 'set-data',
  data: { field1: 'value1' }
})
```

#### 接收消息（微前端表单 → 主应用）

```typescript
// 监听来自微前端表单的消息
window.addEventListener('message', (event) => {
  const payload = event.data as PostMessagePayload
  if (payload.targetId === currentPublishId) {
    // 处理消息
  }
})
```

#### 消息动作列表

| 动作 | 方向 | 说明 |
|---|---|---|
| `set-data` | 主应用 → 表单 | 设置表单数据 |
| `get-data` | 主应用 → 表单 | 获取表单数据 |
| `validate` | 主应用 → 表单 | 触发表单校验 |
| `submit` | 主应用 → 表单 | 触发表单提交 |
| `reset` | 主应用 → 表单 | 重置表单 |
| `data-changed` | 表单 → 主应用 | 表单数据变化通知 |
| `submit-success` | 表单 → 主应用 | 提交成功通知 |
| `submit-error` | 表单 → 主应用 | 提交失败通知 |
| `validation-result` | 表单 → 主应用 | 校验结果通知 |
