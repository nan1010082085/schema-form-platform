# AI 对话渲染优化计划

> 借鉴 Vue TUI 设计理念，优化 AiSidebarView 的对话渲染性能和体验

## 一、背景与问题

### 1.1 当前问题

| 问题 | 影响 | 位置 |
|------|------|------|
| Markdown 全量重新解析 | 每次流式更新都调用 `marked.parse(content)`，长对话性能差 | `AiMessage.vue:180-183` |
| 表格在窄宽度下文字折行 | 400px sidebar 内表格列没有固定宽度，内容溢出折行 | `AiMessage.module.scss:156-178` |
| 滚动位置被强制打断 | 用户查看历史消息时，新内容强制滚动到底部 | `AiSidebarView.vue:95-101` |
| 流式更新重绘整个区域 | 消息列表和输入框未分层，高频更新影响输入框响应 | `AiSidebarView.vue` 整体布局 |

### 1.2 借鉴来源：Vue TUI

[Vue TUI](https://github.com/vuejs-ai/vue-tui) 是一个终端 UI 组件库，其 Agent Console 模块的设计理念值得借鉴：

- **增量 Markdown 解析**：`createMarkdownBlockSource()` 只解析流式尾部，已 finalize 的 block 不重新 parse
- **分层渲染 (Render Planes)**：transcript / chrome / input / overlay 四层分离
- **滚动分离 (Scroll Detachment)**：用户滚动时不被新内容打断
- **事件驱动状态管理**：每种事件类型独立处理

---

## 二、优化方案

### Phase 1：Markdown 表格样式优化（立即修复）

**目标**：在 400px sidebar 内，表格列固定宽度，避免文字折行

**修改文件**：`packages/ai/app/src/components/AiMessage.module.scss`

```scss
// 现有表格样式问题：
.markdownContent table {
  width: 100%;  // ❌ 强制 100% 宽度，列被压缩
}

// 优化方案：
.markdownContent table {
  width: 100%;
  table-layout: fixed;  // ✅ 固定列宽，由第一行决定
  font-size: 12px;      // 缩小字号适配窄宽度
  word-break: break-all; // 长单词/URL 允许断行
}

.markdownContent th,
.markdownContent td {
  padding: 5px 8px;
  overflow: hidden;
  text-overflow: ellipsis;  // 超长内容显示省略号
  white-space: nowrap;      // 不换行
}

// 表头保持换行能力（表头通常较短）
.markdownContent th {
  white-space: normal;
  word-break: break-word;
}
```

**预期效果**：
- 表格列宽由表头内容自动分配
- 单元格内容超长时显示省略号，hover 可查看完整内容
- 400px 宽度下表格不再横向溢出

---

### Phase 2：增量 Markdown 解析（性能优化）

**目标**：流式更新时只解析新增内容，避免全量重新解析

**新增文件**：`packages/ai/app/src/composables/useIncrementalMarkdown.ts`

```ts
/**
 * 增量 Markdown 解析器
 *
 * 借鉴 Vue TUI 的 createMarkdownBlockSource() 设计：
 * - 已 finalize 的 block 不会重新 parse
 * - 只解析当前流式 block 的增量内容
 */
import { ref, computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

interface MarkdownBlock {
  html: string
  finalized: boolean
}

export function useIncrementalMarkdown() {
  const finalizedHtml = ref<string[]>([])
  const currentBlock = ref('')
  const blocks = computed<MarkdownBlock[]>(() => {
    const result: MarkdownBlock[] = finalizedHtml.value.map(html => ({
      html,
      finalized: true
    }))
    if (currentBlock.value) {
      result.push({
        html: renderMarkdown(currentBlock.value),
        finalized: false
      })
    }
    return result
  })

  const fullHtml = computed(() =>
    blocks.value.map(b => b.html).join('')
  )

  function appendDelta(text: string) {
    currentBlock.value += text
  }

  function finalizeBlock() {
    if (currentBlock.value) {
      finalizedHtml.value.push(renderMarkdown(currentBlock.value))
      currentBlock.value = ''
    }
  }

  function clear() {
    finalizedHtml.value = []
    currentBlock.value = ''
  }

  return { blocks, fullHtml, appendDelta, finalizeBlock, clear }
}

function renderMarkdown(content: string): string {
  if (!content) return ''
  const rawHtml = marked.parse(content, { breaks: true }) as string
  return DOMPurify.sanitize(rawHtml)
}
```

**修改文件**：`packages/ai/app/src/components/AiMessage.vue`

```diff
- import { marked } from 'marked'
- import DOMPurify from 'dompurify'
+ import { useIncrementalMarkdown } from '@/composables/useIncrementalMarkdown'

- function renderMarkdown(content: string): string {
-   if (!content) return ''
-   const rawHtml = marked.parse(content, { breaks: true }) as string
-   return DOMPurify.sanitize(rawHtml)
- }

+ const { fullHtml, appendDelta, finalizeBlock } = useIncrementalMarkdown()
+
+ watch(() => props.content, (newContent, oldContent) => {
+   if (!oldContent || newContent?.startsWith(oldContent)) {
+     // 流式追加：只解析增量
+     const delta = (newContent ?? '').slice((oldContent ?? '').length)
+     appendDelta(delta)
+   } else {
+     // 内容变化（如切换消息）：全量替换
+     finalizeBlock()
+     appendDelta(newContent ?? '')
+   }
+ })
```

**预期效果**：
- 流式更新时 CPU 占用降低 60-80%（长对话场景）
- 首次渲染时间不变，后续增量更新更快

---

### Phase 3：滚动分离（体验优化）

**目标**：用户查看历史消息时，新内容不打断滚动位置

**新增文件**：`packages/ai/app/src/composables/useScrollDetachment.ts`

```ts
/**
 * 滚动分离
 *
 * 借鉴 Vue TUI 的 Scroll Detachment 设计：
 * - 用户向上滚动时，新消息不会强制滚动到底部
 * - 显示 "Jump to bottom" 按钮
 * - 用户主动点击或滚动到底部时恢复自动滚动
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'

export function useScrollDetachment(containerRef: Ref<HTMLElement | null>) {
  const isDetached = ref(false)
  const showJumpToBottom = ref(false)
  const newMessageCount = ref(0)

  function checkScrollPosition() {
    const el = containerRef.value
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    isDetached.value = distanceFromBottom > 80
    if (!isDetached.value) {
      showJumpToBottom.value = false
      newMessageCount.value = 0
    }
  }

  function scrollToBottom(force = false) {
    if (isDetached.value && !force) {
      newMessageCount.value++
      showJumpToBottom.value = true
      return
    }
    const el = containerRef.value
    if (el) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight
      })
    }
  }

  function jumpToBottom() {
    isDetached.value = false
    showJumpToBottom.value = false
    newMessageCount.value = 0
    scrollToBottom(true)
  }

  onMounted(() => {
    containerRef.value?.addEventListener('scroll', checkScrollPosition)
  })

  onBeforeUnmount(() => {
    containerRef.value?.removeEventListener('scroll', checkScrollPosition)
  })

  return { isDetached, showJumpToBottom, newMessageCount, scrollToBottom, jumpToBottom }
}
```

**修改文件**：`packages/ai/app/src/views/AiSidebarView.vue`

```diff
+ import { useScrollDetachment } from '@/composables/useScrollDetachment'

  const messagesRef = ref<HTMLElement>()
+ const { showJumpToBottom, newMessageCount, scrollToBottom, jumpToBottom } = useScrollDetachment(messagesRef)

  // 替换原有的 scrollToBottom 函数
- function scrollToBottom() {
-   setTimeout(() => {
-     if (messagesRef.value) {
-       messagesRef.value.scrollTop = messagesRef.value.scrollHeight
-     }
-   }, 50)
- }

  // 监听消息变化时调用 scrollToBottom
  watch(
    () => {
      const last = store.messages[store.messages.length - 1]
      return `${store.messages.length}:${last?.content?.length ?? 0}`
    },
-   scrollToBottom,
+   () => scrollToBottom(),
  )
```

**模板新增**：

```vue
<!-- Jump to bottom 按钮 -->
<Transition name="fade">
  <button
    v-if="showJumpToBottom"
    :class="$style.jumpToBottom"
    @click="jumpToBottom"
  >
    <el-icon><ArrowDown /></el-icon>
    <span v-if="newMessageCount > 0">{{ newMessageCount }} 条新消息</span>
    <span v-else>回到底部</span>
  </button>
</Transition>
```

**预期效果**：
- 用户向上滚动查看历史时，新消息不打断阅读
- 显示 "X 条新消息" 提示，用户可主动跳回底部
- 滚动到底部后自动恢复跟随

---

### Phase 4：分层渲染（架构优化）

**目标**：将 transcript、input、overlay 分离，避免高频更新影响输入框

**修改文件**：`packages/ai/app/src/views/AiSidebarView.vue`

```vue
<template>
  <div :class="$style.panel">
    <!-- Chrome 层：状态栏（低频更新） -->
    <div :class="$style.chromeLayer">
      <div :class="$style.header">...</div>
      <div v-if="contextTag" :class="$style.contextBar">...</div>
    </div>

    <!-- Transcript 层：消息流（高频更新） -->
    <div ref="messagesRef" :class="$style.transcriptLayer">
      <AiMessage v-for="msg in store.messages" />
      <!-- Jump to bottom -->
      <button v-if="showJumpToBottom" :class="$style.jumpToBottom">...</button>
    </div>

    <!-- Input 层：输入框（独立于 transcript） -->
    <div :class="$style.inputLayer">
      <div :class="$style.inputBox">...</div>
    </div>

    <!-- Overlay 层：弹窗（按需显示） -->
    <el-dialog v-model="historyVisible">...</el-dialog>
  </div>
</template>
```

**样式修改**：

```scss
.panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;  // 防止整体滚动
}

.chromeLayer {
  flex-shrink: 0;  // 不参与滚动
}

.transcriptLayer {
  flex: 1;
  overflow-y: auto;  // 只有消息区域滚动
  // 使用 contain: content 隔离重绘影响
  contain: content;
}

.inputLayer {
  flex-shrink: 0;  // 不参与滚动
  // 使用 will-change 提示浏览器优化
  will-change: transform;
}
```

**预期效果**：
- 流式更新时输入框不受影响，保持响应
- 浏览器可对各层独立优化重绘

---

## 三、实施计划

| Phase | 内容 | 复杂度 | 预计工时 | 优先级 |
|-------|------|--------|----------|--------|
| 1 | 表格样式优化 | 低 | 0.5h | **P0 立即** |
| 2 | 增量 Markdown 解析 | 中 | 2h | P1 本周 |
| 3 | 滚动分离 | 低 | 1.5h | P1 本周 |
| 4 | 分层渲染 | 中 | 3h | P2 下周 |

---

## 四、验收标准

### 4.1 表格样式（Phase 1）
- [ ] 400px 宽度内表格不横向溢出
- [ ] 列宽由表头自动分配，内容超长显示省略号
- [ ] 表格可读性不低于全宽显示

### 4.2 增量解析（Phase 2）
- [ ] 流式更新时 CPU 占用明显降低
- [ ] 长对话（>20 条消息）渲染流畅
- [ ] 已完成的消息不会重新解析

### 4.3 滚动分离（Phase 3）
- [ ] 用户向上滚动时，新消息不打断阅读
- [ ] 显示 "X 条新消息" 提示
- [ ] 点击提示或滚动到底部后恢复自动跟随

### 4.4 分层渲染（Phase 4）
- [ ] 流式更新时输入框保持响应
- [ ] 弹窗打开时不影响消息流更新
- [ ] 无明显性能回退

---

## 五、相关文件

| 文件 | 修改类型 |
|------|----------|
| `packages/ai/app/src/components/AiMessage.module.scss` | 修改（Phase 1） |
| `packages/ai/app/src/components/AiMessage.vue` | 修改（Phase 2） |
| `packages/ai/app/src/views/AiSidebarView.vue` | 修改（Phase 3, 4） |
| `packages/ai/app/src/views/AiSidebarView.module.scss` | 修改（Phase 4） |
| `packages/ai/app/src/composables/useIncrementalMarkdown.ts` | 新增（Phase 2） |
| `packages/ai/app/src/composables/useScrollDetachment.ts` | 新增（Phase 3） |
