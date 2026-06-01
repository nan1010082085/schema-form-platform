# Flow Property Panel Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the 1055-line FlowPropertyPanel.vue monolith into a registry-driven architecture with independent per-node-type panel components.

**Architecture:** A `useNodePropertyPanel` composable provides a registry mapping Vue Flow node types (e.g. `'user-task'`, `'timer-event'`) to panel components. Each node type gets its own `<XxxPanel.vue>` component responsible solely for that type's configuration fields. FlowPropertyPanel.vue becomes a thin shell: header, basic properties, dynamic panel via `<component :is>`, and edge info. Each panel reads from Pinia stores directly (matching the existing codebase pattern -- no props/emits plumbing).

**Tech Stack:** Vue 3 Composition API, `<script setup>`, TypeScript, Pinia, Element Plus, CSS Modules

---

## File Structure

```
packages/flow/web/src/
├── composables/
│   └── useNodePropertyPanel.ts    # Registry: nodeType -> component mapping
├── components/
│   ├── FlowPropertyPanel.vue      # REFACTORED: thin shell (~250 lines)
│   └── nodePanels/                # NEW directory
│       ├── index.ts               # Barrel export of all panels
│       ├── types.ts               # Shared panel types
│       ├── SectionToggle.vue      # Reusable collapsible section (layout component)
│       ├── UserTaskPanel.vue
│       ├── ServiceTaskPanel.vue
│       ├── ScriptTaskPanel.vue
│       ├── TimerEventPanel.vue
│       ├── GatewayPanel.vue       # Shared: exclusive / parallel / inclusive
│       ├── SubProcessPanel.vue
│       ├── SendTaskPanel.vue
│       ├── ReceiveTaskPanel.vue
│       └── DefaultNodePanel.vue   # Fallback for start-event / end-event
```

**Why this structure:**
- `composables/` holds the registry (architecture layer -- my responsibility)
- `nodePanels/` groups all panel components together (co-located with shared types)
- `SectionToggle.vue` is a layout component that wraps the collapsible section pattern (header + body), used by every panel
- Each panel reads from `useFlowGraphStore` and `useFlowDesignerStore` directly -- no prop drilling, matches existing codebase convention
- `GatewayPanel.vue` handles all 3 gateway types via a conditional `defaultFlow` field (only exclusive/inclusive have it)

---

### Task 1: Create shared panel types

**Files:**
- Create: `packages/flow/web/src/components/nodePanels/types.ts`

- [ ] **Step 1: Create the shared types file**

```typescript
import type { Node } from '@vue-flow/core'

/**
 * Props interface shared by all node panel components.
 * Each panel receives the selected node and a function to update its data.
 */
export interface NodePanelProps {
  node: Node
}

/**
 * Helper to update a single key on the selected node's data.
 * Panels call this instead of touching the store directly,
 * so FlowPropertyPanel can intercept if needed in the future.
 */
export type UpdateNodeDataFn = (key: string, value: unknown) => void

/**
 * Helper to replace the entire data object on the selected node.
 * Used for complex updates that touch multiple keys atomically
 * (e.g. toggling form binding, changing multi-instance type).
 */
export type SetNodeDataFn = (data: Record<string, unknown>) => void
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/yangdongnan/work/schema-form-platform && pnpm --filter @schema-form/flow-web exec tsc --noEmit 2>&1 | head -20`

Expected: No errors from the new file (may show pre-existing errors unrelated to this file).

- [ ] **Step 3: Commit**

```bash
git add packages/flow/web/src/components/nodePanels/types.ts
git commit -m "refactor(flow): add shared node panel types"
```

---

### Task 2: Create the useNodePropertyPanel composable

**Files:**
- Create: `packages/flow/web/src/composables/useNodePropertyPanel.ts`

- [ ] **Step 1: Create the composable with registry and helpers**

```typescript
/**
 * useNodePropertyPanel — Node property panel registry
 *
 * Maps Vue Flow node types to their corresponding panel components.
 * Provides helpers for node type display names and default panel fallback.
 */
import { markRaw, type Component } from 'vue'
import { useFlowGraphStore } from '../stores/flowGraph.js'
import { useFlowDesignerStore } from '../stores/flowDesigner.js'

import UserTaskPanel from '../components/nodePanels/UserTaskPanel.vue'
import ServiceTaskPanel from '../components/nodePanels/ServiceTaskPanel.vue'
import ScriptTaskPanel from '../components/nodePanels/ScriptTaskPanel.vue'
import TimerEventPanel from '../components/nodePanels/TimerEventPanel.vue'
import GatewayPanel from '../components/nodePanels/GatewayPanel.vue'
import SubProcessPanel from '../components/nodePanels/SubProcessPanel.vue'
import SendTaskPanel from '../components/nodePanels/SendTaskPanel.vue'
import ReceiveTaskPanel from '../components/nodePanels/ReceiveTaskPanel.vue'
import DefaultNodePanel from '../components/nodePanels/DefaultNodePanel.vue'

/** Registry: Vue Flow node type -> panel component */
const panelRegistry = new Map<string, Component>()

/** Register all built-in panels */
function registerBuiltinPanels() {
  panelRegistry.set('user-task', markRaw(UserTaskPanel))
  panelRegistry.set('service-task', markRaw(ServiceTaskPanel))
  panelRegistry.set('script-task', markRaw(ScriptTaskPanel))
  panelRegistry.set('timer-event', markRaw(TimerEventPanel))
  panelRegistry.set('exclusive-gateway', markRaw(GatewayPanel))
  panelRegistry.set('parallel-gateway', markRaw(GatewayPanel))
  panelRegistry.set('inclusive-gateway', markRaw(GatewayPanel))
  panelRegistry.set('sub-process', markRaw(SubProcessPanel))
  panelRegistry.set('send-task', markRaw(SendTaskPanel))
  panelRegistry.set('receive-task', markRaw(ReceiveTaskPanel))
  // start-event, end-event → DefaultNodePanel (fallback)
}

registerBuiltinPanels()

/** Node type -> Chinese display name */
const NODE_TYPE_LABELS: Record<string, string> = {
  'start-event': '开始事件',
  'end-event': '结束事件',
  'timer-event': '定时事件',
  'user-task': '用户任务',
  'service-task': '服务任务',
  'script-task': '脚本任务',
  'send-task': '发送任务',
  'receive-task': '接收任务',
  'sub-process': '子流程',
  'exclusive-gateway': '排他网关',
  'parallel-gateway': '并行网关',
  'inclusive-gateway': '包含网关',
}

export function useNodePropertyPanel() {
  const graphStore = useFlowGraphStore()
  const designerStore = useFlowDesignerStore()

  /**
   * Register a custom panel component for a node type.
   * Use this to extend the panel system with new node types.
   */
  function registerPanel(nodeType: string, component: Component) {
    panelRegistry.set(nodeType, markRaw(component))
  }

  /**
   * Get the panel component for a given node type.
   * Returns DefaultNodePanel if no specific panel is registered.
   */
  function getPanel(nodeType: string | undefined): Component {
    if (!nodeType) return DefaultNodePanel
    return panelRegistry.get(nodeType) ?? DefaultNodePanel
  }

  /**
   * Get the Chinese display name for a node type.
   */
  function getNodeTypeLabel(nodeType: string | undefined): string {
    if (!nodeType) return ''
    return NODE_TYPE_LABELS[nodeType] ?? nodeType
  }

  /**
   * Update a single key on the selected node's data.
   * This is the primary update mechanism for panel fields.
   */
  function updateNodeData(key: string, value: unknown) {
    if (!designerStore.selectedNodeId) return
    graphStore.updateNodeData(designerStore.selectedNodeId, key, value)
  }

  /**
   * Replace the entire data object on the selected node.
   * Used for atomic multi-key updates (toggle form binding, etc.)
   */
  function setNodeData(data: Record<string, unknown>) {
    if (!designerStore.selectedNodeId) return
    graphStore.setNodeData(designerStore.selectedNodeId, data)
  }

  /**
   * Get the selected node (reactive computed).
   */
  function getSelectedNode() {
    if (!designerStore.selectedNodeId) return null
    return graphStore.findNode(designerStore.selectedNodeId) ?? null
  }

  return {
    registerPanel,
    getPanel,
    getNodeTypeLabel,
    updateNodeData,
    setNodeData,
    getSelectedNode,
    NODE_TYPE_LABELS,
  }
}
```

- [ ] **Step 2: Create barrel export for composables**

Create file: `packages/flow/web/src/composables/index.ts`

```typescript
export { useNodePropertyPanel } from './useNodePropertyPanel.js'
```

- [ ] **Step 3: Verify compilation**

Run: `cd /Users/yangdongnan/work/schema-form-platform && pnpm --filter @schema-form/flow-web exec tsc --noEmit 2>&1 | head -20`

Expected: May show errors if panel component files don't exist yet -- that's expected. We'll create them in subsequent tasks.

- [ ] **Step 4: Commit**

```bash
git add packages/flow/web/src/composables/useNodePropertyPanel.ts packages/flow/web/src/composables/index.ts
git commit -m "refactor(flow): add useNodePropertyPanel registry composable"
```

---

### Task 3: Create SectionToggle layout component

**Files:**
- Create: `packages/flow/web/src/components/nodePanels/SectionToggle.vue`

This is a layout component that encapsulates the collapsible section pattern used by every panel. It replaces the repeated section header + toggle + body code.

- [ ] **Step 1: Create SectionToggle.vue**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { ArrowDown, ArrowRight } from '@element-plus/icons-vue'

const props = withDefaults(defineProps<{
  title: string
  count?: number
  defaultOpen?: boolean
}>(), {
  defaultOpen: true,
})

const isOpen = ref(props.defaultOpen)

function toggle() {
  isOpen.value = !isOpen.value
}
</script>

<template>
  <div :class="$style.section">
    <div :class="$style.header" @click="toggle">
      <el-icon :size="12" :class="$style.arrow">
        <ArrowDown v-if="isOpen" /><ArrowRight v-else />
      </el-icon>
      <span :class="$style.label">{{ title }}</span>
      <span v-if="count !== undefined" :class="$style.count">{{ count }}</span>
    </div>
    <div v-if="isOpen" :class="$style.body">
      <slot />
    </div>
  </div>
</template>

<style module>
.section {
  border-bottom: 1px solid var(--border-color-light, #f0f2f5);
}

.header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}

.header:hover {
  background: var(--bg-color-page, #f5f7fa);
}

.arrow {
  color: var(--text-color-secondary, #909399);
  flex-shrink: 0;
}

.label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-color-primary, #303133);
  flex: 1;
}

.count {
  font-size: 11px;
  color: var(--text-color-placeholder, #c0c4cc);
  background: var(--bg-color-page, #f0f2f5);
  border-radius: 8px;
  padding: 0 6px;
  line-height: 18px;
}

.body {
  padding: 8px 16px;
  background: var(--bg-color-overlay, #fafbfc);
  border-top: 1px solid var(--border-color-light, #f0f2f5);
}
</style>
```

- [ ] **Step 2: Verify compilation**

Run: `cd /Users/yangdongnan/work/schema-form-platform && pnpm --filter @schema-form/flow-web exec tsc --noEmit 2>&1 | grep -i "SectionToggle" || echo "No errors for SectionToggle"`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add packages/flow/web/src/components/nodePanels/SectionToggle.vue
git commit -m "refactor(flow): add SectionToggle layout component"
```

---

### Task 4: Create shared FieldRow layout component

**Files:**
- Create: `packages/flow/web/src/components/nodePanels/FieldRow.vue`

Another layout component that encapsulates the field label + control + hint pattern repeated across all panels.

- [ ] **Step 1: Create FieldRow.vue**

```vue
<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  hint?: string
}>(), {
  hint: '',
})
</script>

<template>
  <div :class="$style.field">
    <label :class="$style.label">{{ label }}</label>
    <div :class="$style.control">
      <slot />
    </div>
  </div>
  <div v-if="hint" :class="$style.hint">{{ hint }}</div>
</template>

<style module>
.field {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  min-height: 32px;
}

.label {
  width: 70px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-color-secondary, #909399);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.control {
  flex: 1;
  min-width: 0;
}

.hint {
  font-size: 12px;
  color: var(--text-color-placeholder, #c0c4cc);
  line-height: 1.5;
  margin: -4px 0 8px 70px;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add packages/flow/web/src/components/nodePanels/FieldRow.vue
git commit -m "refactor(flow): add FieldRow layout component"
```

---

### Task 5: Create DefaultNodePanel

**Files:**
- Create: `packages/flow/web/src/components/nodePanels/DefaultNodePanel.vue`

This is the fallback panel for start-event and end-event. These nodes only have the basic properties (name, documentation) which FlowPropertyPanel already shows, so this panel is intentionally empty.

- [ ] **Step 1: Create DefaultNodePanel.vue**

```vue
<script setup lang="ts">
/**
 * DefaultNodePanel — fallback for nodes with no specific configuration.
 * Used by: start-event, end-event.
 * These nodes only use the basic properties (name, documentation)
 * which FlowPropertyPanel already renders above this panel.
 */
</script>

<template>
  <!-- No additional configuration for this node type -->
</template>
```

- [ ] **Step 2: Commit**

```bash
git add packages/flow/web/src/components/nodePanels/DefaultNodePanel.vue
git commit -m "refactor(flow): add DefaultNodePanel fallback"
```

---

### Task 6: Create UserTaskPanel

**Files:**
- Create: `packages/flow/web/src/components/nodePanels/UserTaskPanel.vue`

Extracts lines 55-335 from FlowPropertyPanel.vue. This is the most complex panel with 3 sections: node config (assignee, approval mode, reject policy), advanced (form binding), and multi-instance.

- [ ] **Step 1: Create UserTaskPanel.vue**

```vue
<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import type { Node } from '@vue-flow/core'
import { useFlowGraphStore } from '../../stores/flowGraph.js'
import { useFlowDesignerStore } from '../../stores/flowDesigner.js'
import { flowApi } from '../../api/flowApi.js'
import UserPicker from '../UserPicker.vue'
import SectionToggle from './SectionToggle.vue'
import FieldRow from './FieldRow.vue'

const props = defineProps<{ node: Node }>()

const graphStore = useFlowGraphStore()
const designerStore = useFlowDesignerStore()

function updateNodeData(key: string, value: unknown) {
  if (!designerStore.selectedNodeId) return
  graphStore.updateNodeData(designerStore.selectedNodeId, key, value)
}

function setNodeData(data: Record<string, unknown>) {
  if (!designerStore.selectedNodeId) return
  graphStore.setNodeData(designerStore.selectedNodeId, data)
}

/* --- Published forms --- */

interface PublishedForm {
  id: string
  name: string
  publishId: string
}

const publishedForms = ref<PublishedForm[]>([])

onMounted(async () => {
  try {
    const data = (await flowApi.getPublishedForms()) as { items: PublishedForm[] }
    publishedForms.value = data.items ?? []
  } catch {
    // ignore -- dropdown stays empty
  }
})

/* --- Computed helpers --- */

const data = computed(() => props.node.data ?? {})

const assigneeType = computed(() => (data.value.assigneeType as string) ?? 'user')
const approvalMode = computed(() => (data.value.approvalMode as string) ?? 'single')
const multiInstanceType = computed(() => (data.value.multiInstance?.type as string) ?? 'none')

/* --- Form binding --- */

function toggleForm() {
  if (!designerStore.selectedNodeId) return
  const d = data.value as Record<string, unknown>
  if (d.formSchemaId !== undefined) {
    const { formSchemaId: _, formMode: _m, formVariable: _v, hostMethods: _h, ...rest } = d
    setNodeData(rest)
  } else {
    setNodeData({
      ...d,
      formSchemaId: '',
      formMode: 'edit',
      formVariable: '',
      hostMethods: ['setValues', 'getValues', 'validate'],
    })
  }
}

function onFormSelect(publishId: string) {
  if (!designerStore.selectedNodeId) return
  const form = publishedForms.value.find((f) => f.publishId === publishId)
  setNodeData({
    ...(data.value as Record<string, unknown>),
    formSchemaId: form?.id ?? '',
    formPublishId: publishId,
  })
}

/* --- Multi-instance --- */

function onMultiInstanceTypeChange(type: string) {
  if (!designerStore.selectedNodeId) return
  const d = data.value as Record<string, unknown>
  if (type === 'none') {
    const { multiInstance: _, ...rest } = d
    setNodeData(rest)
  } else {
    setNodeData({
      ...d,
      multiInstance: { type, collection: '', elementVariable: '', completionCondition: '' },
    })
  }
}

function updateMultiInstance(key: string, value: unknown) {
  if (!designerStore.selectedNodeId) return
  const d = data.value as Record<string, unknown>
  const current = d.multiInstance as Record<string, unknown> | undefined
  if (!current) return
  setNodeData({ ...d, multiInstance: { ...current, [key]: value } })
}
</script>

<template>
  <!-- Node Config -->
  <SectionToggle title="节点配置" :count="7">
    <FieldRow label="指派方式">
      <el-radio-group
        :model-value="assigneeType"
        size="small"
        @change="updateNodeData('assigneeType', $event)"
      >
        <el-radio value="user">指定用户</el-radio>
        <el-radio value="role">指定角色</el-radio>
        <el-radio value="expression">表达式</el-radio>
      </el-radio-group>
    </FieldRow>

    <FieldRow v-if="assigneeType === 'user'" label="审批用户">
      <UserPicker
        :model-value="(data.candidateUsers as string[]) ?? []"
        placeholder="选择审批用户"
        @update:model-value="updateNodeData('candidateUsers', $event)"
      />
    </FieldRow>

    <FieldRow v-if="assigneeType === 'role'" label="审批角色">
      <el-select
        :model-value="(data.candidateRoles as string[]) ?? []"
        multiple
        filterable
        allow-create
        placeholder="输入或选择角色"
        @change="updateNodeData('candidateRoles', $event)"
      >
        <el-option label="admin" value="admin" />
        <el-option label="editor" value="editor" />
        <el-option label="viewer" value="viewer" />
      </el-select>
    </FieldRow>

    <FieldRow v-if="assigneeType === 'expression'" label="审批人表达式">
      <el-input
        :model-value="(data.assignee as string) ?? ''"
        placeholder="例: ${variables.manager}"
        size="small"
        @input="updateNodeData('assignee', $event)"
      />
    </FieldRow>

    <FieldRow label="审批模式">
      <el-radio-group
        :model-value="approvalMode"
        size="small"
        @change="updateNodeData('approvalMode', $event)"
      >
        <el-radio value="single">单人审批</el-radio>
        <el-radio value="countersign">会签</el-radio>
        <el-radio value="or-sign">或签</el-radio>
      </el-radio-group>
    </FieldRow>

    <template v-if="approvalMode === 'countersign'">
      <FieldRow label="最少通过人数">
        <el-input-number
          :model-value="(data.minApprovalCount as number | undefined) ?? undefined"
          :min="1"
          size="small"
          controls-position="right"
          @change="updateNodeData('minApprovalCount', $event)"
        />
      </FieldRow>
    </template>

    <template v-if="approvalMode === 'countersign' || approvalMode === 'or-sign'">
      <FieldRow
        label="审批人集合变量"
        hint="从流程变量中读取该名称对应的数组，为每个元素创建一个审批任务。"
      >
        <el-input
          :model-value="(data.assigneeCollection as string) ?? ''"
          placeholder="例: approvers"
          size="small"
          @input="updateNodeData('assigneeCollection', $event)"
        />
      </FieldRow>
    </template>

    <FieldRow label="驳回策略">
      <el-radio-group
        :model-value="(data.rejectPolicy as string) ?? 'follow-global'"
        size="small"
        @change="updateNodeData('rejectPolicy', $event)"
      >
        <el-radio value="follow-global">跟随流程</el-radio>
        <el-radio value="reject-on-all">全部驳回才驳回</el-radio>
        <el-radio value="reject-on-any">一票驳回即驳回</el-radio>
      </el-radio-group>
    </FieldRow>
  </SectionToggle>

  <!-- Form Binding -->
  <SectionToggle title="高级配置">
    <FieldRow label="关联表单">
      <el-checkbox
        :model-value="!!data.formSchemaId"
        @change="toggleForm"
      >启用</el-checkbox>
    </FieldRow>

    <template v-if="data.formSchemaId !== undefined">
      <FieldRow label="选择表单">
        <el-select
          :model-value="(data.formSchemaId as string) ?? ''"
          filterable
          placeholder="搜索并选择已发布的表单"
          size="small"
          @change="onFormSelect"
        >
          <el-option
            v-for="form in publishedForms"
            :key="form.id"
            :label="form.name"
            :value="form.publishId"
          />
        </el-select>
      </FieldRow>

      <FieldRow label="表单模式">
        <el-radio-group
          :model-value="(data.formMode as string) ?? 'edit'"
          size="small"
          @change="updateNodeData('formMode', $event)"
        >
          <el-radio value="edit">编辑</el-radio>
          <el-radio value="view">只读</el-radio>
        </el-radio-group>
      </FieldRow>

      <FieldRow
        label="数据变量名"
        hint="表单数据写入流程变量的名称"
      >
        <el-input
          :model-value="(data.formVariable as string) ?? ''"
          placeholder="例: formData"
          size="small"
          @input="updateNodeData('formVariable', $event)"
        />
      </FieldRow>

      <FieldRow
        label="宿主方法"
        hint="允许宿主调用的表单方法"
      >
        <el-checkbox-group
          :model-value="(data.hostMethods as string[]) ?? ['setValues', 'getValues', 'validate']"
          @change="updateNodeData('hostMethods', $event)"
        >
          <el-checkbox value="setValues" label="setValues" />
          <el-checkbox value="getValues" label="getValues" />
          <el-checkbox value="validate" label="validate" />
          <el-checkbox value="submit" label="submit" />
        </el-checkbox-group>
      </FieldRow>
    </template>
  </SectionToggle>

  <!-- Multi-Instance -->
  <SectionToggle title="多实例">
    <FieldRow label="多实例类型">
      <el-select
        :model-value="multiInstanceType"
        size="small"
        @change="onMultiInstanceTypeChange"
      >
        <el-option label="无" value="none" />
        <el-option label="顺序" value="sequential" />
        <el-option label="并行" value="parallel" />
      </el-select>
    </FieldRow>

    <template v-if="multiInstanceType !== 'none'">
      <FieldRow label="集合变量">
        <el-input
          :model-value="(data.multiInstance?.collection as string) ?? ''"
          placeholder="流程变量中的集合名称"
          size="small"
          @input="updateMultiInstance('collection', $event)"
        />
      </FieldRow>

      <FieldRow label="元素变量">
        <el-input
          :model-value="(data.multiInstance?.elementVariable as string) ?? ''"
          placeholder="遍历元素的变量名"
          size="small"
          @input="updateMultiInstance('elementVariable', $event)"
        />
      </FieldRow>

      <FieldRow
        label="完成条件"
        hint="使用 BPMN 标准变量：nrOfInstances、nrOfActiveInstances、nrOfCompletedInstances"
      >
        <el-input
          :model-value="(data.multiInstance?.completionCondition as string) ?? ''"
          placeholder="例: ${nrOfCompletedInstances / nrOfInstances >= 0.5}"
          size="small"
          @input="updateMultiInstance('completionCondition', $event)"
        />
      </FieldRow>
    </template>
  </SectionToggle>
</template>
```

- [ ] **Step 2: Verify compilation**

Run: `cd /Users/yangdongnan/work/schema-form-platform && pnpm --filter @schema-form/flow-web exec tsc --noEmit 2>&1 | grep -i "UserTaskPanel" || echo "No UserTaskPanel errors"`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add packages/flow/web/src/components/nodePanels/UserTaskPanel.vue
git commit -m "refactor(flow): extract UserTaskPanel from FlowPropertyPanel"
```

---

### Task 7: Create TimerEventPanel

**Files:**
- Create: `packages/flow/web/src/components/nodePanels/TimerEventPanel.vue`

Extracts lines 338-376 from FlowPropertyPanel.vue.

- [ ] **Step 1: Create TimerEventPanel.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { Node } from '@vue-flow/core'
import { useFlowGraphStore } from '../../stores/flowGraph.js'
import { useFlowDesignerStore } from '../../stores/flowDesigner.js'
import SectionToggle from './SectionToggle.vue'
import FieldRow from './FieldRow.vue'

defineProps<{ node: Node }>()

const graphStore = useFlowGraphStore()
const designerStore = useFlowDesignerStore()

function updateNodeData(key: string, value: unknown) {
  if (!designerStore.selectedNodeId) return
  graphStore.updateNodeData(designerStore.selectedNodeId, key, value)
}

const data = computed(() => {
  const node = designerStore.selectedNodeId ? graphStore.findNode(designerStore.selectedNodeId) : null
  return node?.data ?? {}
})

const timerType = computed(() => (data.value.timerType as string) ?? 'duration')

const timerPlaceholder = computed(() => {
  switch (timerType.value) {
    case 'date': return '2026-06-01T09:00:00Z'
    case 'cycle': return 'R3/PT1H'
    default: return 'PT2H'
  }
})

const timerHint = computed(() => {
  switch (timerType.value) {
    case 'date': return 'ISO 8601 日期时间'
    case 'cycle': return 'ISO 8601 循环，R3/PT1H（每小时重复3次）'
    default: return 'ISO 8601 持续时间，如 PT2H（2小时）、P3D（3天）'
  }
})
</script>

<template>
  <SectionToggle title="节点配置" :count="2">
    <FieldRow label="定时类型">
      <el-radio-group
        :model-value="timerType"
        size="small"
        @change="updateNodeData('timerType', $event)"
      >
        <el-radio value="duration">持续时间</el-radio>
        <el-radio value="date">指定日期</el-radio>
        <el-radio value="cycle">循环</el-radio>
      </el-radio-group>
    </FieldRow>

    <FieldRow label="定时值" :hint="timerHint">
      <el-input
        :model-value="(data.timerValue as string) ?? ''"
        :placeholder="timerPlaceholder"
        size="small"
        @input="updateNodeData('timerValue', $event)"
      />
    </FieldRow>
  </SectionToggle>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add packages/flow/web/src/components/nodePanels/TimerEventPanel.vue
git commit -m "refactor(flow): extract TimerEventPanel from FlowPropertyPanel"
```

---

### Task 8: Create ServiceTaskPanel, SendTaskPanel, ReceiveTaskPanel

**Files:**
- Create: `packages/flow/web/src/components/nodePanels/ServiceTaskPanel.vue`
- Create: `packages/flow/web/src/components/nodePanels/SendTaskPanel.vue`
- Create: `packages/flow/web/src/components/nodePanels/ReceiveTaskPanel.vue`

These three panels share the same service config JSON pattern. Extract lines 433-472 (service-task), 542-580 (send-task), 583-621 (receive-task).

- [ ] **Step 1: Create ServiceTaskPanel.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { Node } from '@vue-flow/core'
import { useFlowGraphStore } from '../../stores/flowGraph.js'
import { useFlowDesignerStore } from '../../stores/flowDesigner.js'
import SectionToggle from './SectionToggle.vue'
import FieldRow from './FieldRow.vue'

defineProps<{ node: Node }>()

const graphStore = useFlowGraphStore()
const designerStore = useFlowDesignerStore()

function updateNodeData(key: string, value: unknown) {
  if (!designerStore.selectedNodeId) return
  graphStore.updateNodeData(designerStore.selectedNodeId, key, value)
}

const data = computed(() => {
  const node = designerStore.selectedNodeId ? graphStore.findNode(designerStore.selectedNodeId) : null
  return node?.data ?? {}
})

const serviceConfigJson = computed(() => {
  const cfg = data.value.serviceConfig
  if (!cfg) return ''
  if (typeof cfg === 'string') return cfg
  try { return JSON.stringify(cfg, null, 2) } catch { return '' }
})

function onServiceConfigInput(val: string) {
  try {
    const parsed = JSON.parse(val)
    updateNodeData('serviceConfig', parsed)
  } catch {
    updateNodeData('serviceConfig', val)
  }
}
</script>

<template>
  <SectionToggle title="节点配置" :count="2">
    <FieldRow label="服务类型">
      <el-radio-group
        :model-value="(data.serviceType as string) ?? 'http'"
        size="small"
        @change="updateNodeData('serviceType', $event)"
      >
        <el-radio value="http">HTTP 请求</el-radio>
        <el-radio value="function">函数调用</el-radio>
        <el-radio value="script">脚本</el-radio>
      </el-radio-group>
    </FieldRow>

    <FieldRow label="服务配置" hint="JSON 格式的服务配置">
      <el-input
        type="textarea"
        :model-value="serviceConfigJson"
        placeholder='{"url": "https://...", "method": "POST"}'
        size="small"
        @input="onServiceConfigInput"
      />
    </FieldRow>
  </SectionToggle>
</template>
```

- [ ] **Step 2: Create SendTaskPanel.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { Node } from '@vue-flow/core'
import { useFlowGraphStore } from '../../stores/flowGraph.js'
import { useFlowDesignerStore } from '../../stores/flowDesigner.js'
import SectionToggle from './SectionToggle.vue'
import FieldRow from './FieldRow.vue'

defineProps<{ node: Node }>()

const graphStore = useFlowGraphStore()
const designerStore = useFlowDesignerStore()

function updateNodeData(key: string, value: unknown) {
  if (!designerStore.selectedNodeId) return
  graphStore.updateNodeData(designerStore.selectedNodeId, key, value)
}

const data = computed(() => {
  const node = designerStore.selectedNodeId ? graphStore.findNode(designerStore.selectedNodeId) : null
  return node?.data ?? {}
})

const serviceConfigJson = computed(() => {
  const cfg = data.value.serviceConfig
  if (!cfg) return ''
  if (typeof cfg === 'string') return cfg
  try { return JSON.stringify(cfg, null, 2) } catch { return '' }
})

function onServiceConfigInput(val: string) {
  try {
    const parsed = JSON.parse(val)
    updateNodeData('serviceConfig', parsed)
  } catch {
    updateNodeData('serviceConfig', val)
  }
}
</script>

<template>
  <SectionToggle title="节点配置" :count="2">
    <FieldRow label="服务类型">
      <el-radio-group
        :model-value="(data.serviceType as string) ?? 'http'"
        size="small"
        @change="updateNodeData('serviceType', $event)"
      >
        <el-radio value="http">HTTP 请求</el-radio>
        <el-radio value="function">函数调用</el-radio>
      </el-radio-group>
    </FieldRow>

    <FieldRow label="服务配置" hint="JSON 格式的服务配置">
      <el-input
        type="textarea"
        :model-value="serviceConfigJson"
        placeholder='{"url": "https://...", "method": "POST"}'
        size="small"
        @input="onServiceConfigInput"
      />
    </FieldRow>
  </SectionToggle>
</template>
```

- [ ] **Step 3: Create ReceiveTaskPanel.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { Node } from '@vue-flow/core'
import { useFlowGraphStore } from '../../stores/flowGraph.js'
import { useFlowDesignerStore } from '../../stores/flowDesigner.js'
import SectionToggle from './SectionToggle.vue'
import FieldRow from './FieldRow.vue'

defineProps<{ node: Node }>()

const graphStore = useFlowGraphStore()
const designerStore = useFlowDesignerStore()

function updateNodeData(key: string, value: unknown) {
  if (!designerStore.selectedNodeId) return
  graphStore.updateNodeData(designerStore.selectedNodeId, key, value)
}

const data = computed(() => {
  const node = designerStore.selectedNodeId ? graphStore.findNode(designerStore.selectedNodeId) : null
  return node?.data ?? {}
})

const serviceConfigJson = computed(() => {
  const cfg = data.value.serviceConfig
  if (!cfg) return ''
  if (typeof cfg === 'string') return cfg
  try { return JSON.stringify(cfg, null, 2) } catch { return '' }
})

function onServiceConfigInput(val: string) {
  try {
    const parsed = JSON.parse(val)
    updateNodeData('serviceConfig', parsed)
  } catch {
    updateNodeData('serviceConfig', val)
  }
}
</script>

<template>
  <SectionToggle title="节点配置" :count="2">
    <FieldRow label="服务类型">
      <el-radio-group
        :model-value="(data.serviceType as string) ?? 'http'"
        size="small"
        @change="updateNodeData('serviceType', $event)"
      >
        <el-radio value="http">HTTP 请求</el-radio>
        <el-radio value="function">函数调用</el-radio>
      </el-radio-group>
    </FieldRow>

    <FieldRow label="服务配置" hint="JSON 格式的服务配置">
      <el-input
        type="textarea"
        :model-value="serviceConfigJson"
        placeholder='{"url": "https://...", "method": "POST"}'
        size="small"
        @input="onServiceConfigInput"
      />
    </FieldRow>
  </SectionToggle>
</template>
```

- [ ] **Step 4: Commit**

```bash
git add packages/flow/web/src/components/nodePanels/ServiceTaskPanel.vue \
       packages/flow/web/src/components/nodePanels/SendTaskPanel.vue \
       packages/flow/web/src/components/nodePanels/ReceiveTaskPanel.vue
git commit -m "refactor(flow): extract ServiceTaskPanel, SendTaskPanel, ReceiveTaskPanel"
```

---

### Task 9: Create ScriptTaskPanel

**Files:**
- Create: `packages/flow/web/src/components/nodePanels/ScriptTaskPanel.vue`

Extracts lines 475-512 from FlowPropertyPanel.vue.

- [ ] **Step 1: Create ScriptTaskPanel.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { Node } from '@vue-flow/core'
import { useFlowGraphStore } from '../../stores/flowGraph.js'
import { useFlowDesignerStore } from '../../stores/flowDesigner.js'
import SectionToggle from './SectionToggle.vue'
import FieldRow from './FieldRow.vue'

defineProps<{ node: Node }>()

const graphStore = useFlowGraphStore()
const designerStore = useFlowDesignerStore()

function updateNodeData(key: string, value: unknown) {
  if (!designerStore.selectedNodeId) return
  graphStore.updateNodeData(designerStore.selectedNodeId, key, value)
}

const data = computed(() => {
  const node = designerStore.selectedNodeId ? graphStore.findNode(designerStore.selectedNodeId) : null
  return node?.data ?? {}
})
</script>

<template>
  <SectionToggle title="节点配置" :count="2">
    <FieldRow label="脚本语言">
      <el-radio-group
        :model-value="(data.scriptLanguage as string) ?? 'javascript'"
        size="small"
        @change="updateNodeData('scriptLanguage', $event)"
      >
        <el-radio value="javascript">JavaScript</el-radio>
      </el-radio-group>
    </FieldRow>

    <FieldRow label="脚本内容">
      <el-input
        type="textarea"
        :model-value="(data.scriptContent as string) ?? ''"
        placeholder="// 脚本代码"
        :rows="6"
        size="small"
        @input="updateNodeData('scriptContent', $event)"
      />
    </FieldRow>
  </SectionToggle>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add packages/flow/web/src/components/nodePanels/ScriptTaskPanel.vue
git commit -m "refactor(flow): extract ScriptTaskPanel from FlowPropertyPanel"
```

---

### Task 10: Create GatewayPanel

**Files:**
- Create: `packages/flow/web/src/components/nodePanels/GatewayPanel.vue`

Extracts lines 379-430 from FlowPropertyPanel.vue. Handles all 3 gateway types (exclusive, parallel, inclusive). Only exclusive and inclusive gateways have the `defaultFlow` field.

- [ ] **Step 1: Create GatewayPanel.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { Node } from '@vue-flow/core'
import { useFlowGraphStore } from '../../stores/flowGraph.js'
import { useFlowDesignerStore } from '../../stores/flowDesigner.js'
import SectionToggle from './SectionToggle.vue'
import FieldRow from './FieldRow.vue'

const props = defineProps<{ node: Node }>()

const graphStore = useFlowGraphStore()
const designerStore = useFlowDesignerStore()

function updateNodeData(key: string, value: unknown) {
  if (!designerStore.selectedNodeId) return
  graphStore.updateNodeData(designerStore.selectedNodeId, key, value)
}

const data = computed(() => props.node.data ?? {})

/** Only exclusive and inclusive gateways have defaultFlow */
const hasDefaultFlow = computed(() =>
  props.node.type === 'exclusive-gateway' || props.node.type === 'inclusive-gateway'
)
</script>

<template>
  <SectionToggle v-if="hasDefaultFlow" title="节点配置" :count="1">
    <FieldRow label="默认流向" hint="当所有条件都不匹配时走此连线，也可在连线上标记「默认」">
      <el-input
        :model-value="(data.defaultFlow as string) ?? ''"
        placeholder="默认连线 ID（可选）"
        size="small"
        @input="updateNodeData('defaultFlow', $event)"
      />
    </FieldRow>
  </SectionToggle>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add packages/flow/web/src/components/nodePanels/GatewayPanel.vue
git commit -m "refactor(flow): extract GatewayPanel from FlowPropertyPanel"
```

---

### Task 11: Create SubProcessPanel

**Files:**
- Create: `packages/flow/web/src/components/nodePanels/SubProcessPanel.vue`

Extracts lines 515-539 from FlowPropertyPanel.vue.

- [ ] **Step 1: Create SubProcessPanel.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { Node } from '@vue-flow/core'
import { useFlowGraphStore } from '../../stores/flowGraph.js'
import { useFlowDesignerStore } from '../../stores/flowDesigner.js'
import SectionToggle from './SectionToggle.vue'
import FieldRow from './FieldRow.vue'

defineProps<{ node: Node }>()

const graphStore = useFlowGraphStore()
const designerStore = useFlowDesignerStore()

function updateNodeData(key: string, value: unknown) {
  if (!designerStore.selectedNodeId) return
  graphStore.updateNodeData(designerStore.selectedNodeId, key, value)
}

const data = computed(() => {
  const node = designerStore.selectedNodeId ? graphStore.findNode(designerStore.selectedNodeId) : null
  return node?.data ?? {}
})
</script>

<template>
  <SectionToggle title="节点配置" :count="1">
    <FieldRow label="子流程定义 ID" hint="关联的子流程 FlowDefinition ID">
      <el-input
        :model-value="(data.subProcessDefinitionId as string) ?? ''"
        placeholder="输入子流程定义 ID"
        size="small"
        @input="updateNodeData('subProcessDefinitionId', $event)"
      />
    </FieldRow>
  </SectionToggle>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add packages/flow/web/src/components/nodePanels/SubProcessPanel.vue
git commit -m "refactor(flow): extract SubProcessPanel from FlowPropertyPanel"
```

---

### Task 12: Create nodePanels barrel export

**Files:**
- Create: `packages/flow/web/src/components/nodePanels/index.ts`

- [ ] **Step 1: Create barrel export**

```typescript
export { default as UserTaskPanel } from './UserTaskPanel.vue'
export { default as ServiceTaskPanel } from './ServiceTaskPanel.vue'
export { default as ScriptTaskPanel } from './ScriptTaskPanel.vue'
export { default as TimerEventPanel } from './TimerEventPanel.vue'
export { default as GatewayPanel } from './GatewayPanel.vue'
export { default as SubProcessPanel } from './SubProcessPanel.vue'
export { default as SendTaskPanel } from './SendTaskPanel.vue'
export { default as ReceiveTaskPanel } from './ReceiveTaskPanel.vue'
export { default as DefaultNodePanel } from './DefaultNodePanel.vue'
export { default as SectionToggle } from './SectionToggle.vue'
export { default as FieldRow } from './FieldRow.vue'
```

- [ ] **Step 2: Commit**

```bash
git add packages/flow/web/src/components/nodePanels/index.ts
git commit -m "refactor(flow): add nodePanels barrel export"
```

---

### Task 13: Refactor FlowPropertyPanel.vue

**Files:**
- Modify: `packages/flow/web/src/components/FlowPropertyPanel.vue`

Replace the entire 1055-line file with the new shell. The refactored version handles:
1. Header
2. Node type display name + copy ID
3. Basic properties (name, documentation)
4. Dynamic panel via `<component :is>`
5. Edge info (unchanged)
6. Empty state

- [ ] **Step 1: Replace FlowPropertyPanel.vue**

The full replacement content:

```vue
<template>
  <div :class="$style.panel">
    <div :class="$style.header">属性配置</div>

    <!-- ===== Node selected ===== -->
    <template v-if="selectedNode">
      <div :class="$style.widgetNameRow">
        <span :class="$style.widgetType">{{ nodeTypeLabel }}</span>
        <el-tooltip content="复制节点 ID" placement="top" :show-after="500">
          <el-icon :class="$style.copyIdIcon" @click="copyNodeId">
            <CopyDocument />
          </el-icon>
        </el-tooltip>
      </div>

      <el-scrollbar :class="$style.scroll">
        <!-- Basic properties (always shown for all node types) -->
        <div :class="$style.section">
          <div :class="$style.sectionHeader" @click="toggleSection('basic')">
            <el-icon :size="12" :class="$style.arrow">
              <ArrowDown v-if="openSections.has('basic')" /><ArrowRight v-else />
            </el-icon>
            <span :class="$style.sectionLabel">基础属性</span>
            <span :class="$style.sectionCount">2</span>
          </div>
          <div v-if="openSections.has('basic')" :class="$style.sectionBody">
            <div :class="$style.field">
              <label :class="$style.fieldLabel">节点名称</label>
              <div :class="$style.fieldControl">
                <el-input
                  :model-value="selectedNode.data?.label ?? ''"
                  placeholder="节点名称"
                  size="small"
                  @input="updateNodeData('label', $event)"
                />
              </div>
            </div>
            <div :class="$style.field">
              <label :class="$style.fieldLabel">节点说明</label>
              <div :class="$style.fieldControl">
                <el-input
                  type="textarea"
                  :model-value="selectedNode.data?.documentation ?? ''"
                  placeholder="节点说明（可选）"
                  :rows="2"
                  size="small"
                  @input="updateNodeData('documentation', $event)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Dynamic node-type panel -->
        <component
          :is="panelComponent"
          v-if="panelComponent"
          :node="selectedNode"
        />
      </el-scrollbar>
    </template>

    <!-- ===== Edge selected ===== -->
    <template v-else-if="selectedEdge">
      <div :class="$style.widgetNameRow">
        <span :class="$style.widgetType">连线</span>
        <el-tooltip content="复制连线 ID" placement="top" :show-after="500">
          <el-icon :class="$style.copyIdIcon" @click="copyEdgeId">
            <CopyDocument />
          </el-icon>
        </el-tooltip>
      </div>

      <el-scrollbar :class="$style.scroll">
        <!-- Basic properties -->
        <div :class="$style.section">
          <div :class="$style.sectionHeader" @click="toggleSection('basic')">
            <el-icon :size="12" :class="$style.arrow">
              <ArrowDown v-if="openSections.has('basic')" /><ArrowRight v-else />
            </el-icon>
            <span :class="$style.sectionLabel">基础属性</span>
            <span :class="$style.sectionCount">1</span>
          </div>
          <div v-if="openSections.has('basic')" :class="$style.sectionBody">
            <div :class="$style.field">
              <label :class="$style.fieldLabel">连线标签</label>
              <div :class="$style.fieldControl">
                <el-input
                  :model-value="selectedEdge.label ?? ''"
                  placeholder="连线名称"
                  size="small"
                  @input="updateEdgeData('label', $event)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Edge config -->
        <div :class="$style.section">
          <div :class="$style.sectionHeader" @click="toggleSection('config')">
            <el-icon :size="12" :class="$style.arrow">
              <ArrowDown v-if="openSections.has('config')" /><ArrowRight v-else />
            </el-icon>
            <span :class="$style.sectionLabel">连线配置</span>
            <span :class="$style.sectionCount">2</span>
          </div>
          <div v-if="openSections.has('config')" :class="$style.sectionBody">
            <div :class="$style.field">
              <label :class="$style.fieldLabel">条件表达式</label>
              <div :class="$style.fieldControl">
                <el-input
                  :model-value="selectedEdge.data?.conditionExpression ?? ''"
                  placeholder="例: ${amount > 10000}"
                  size="small"
                  @input="updateEdgeData('conditionExpression', $event)"
                />
              </div>
            </div>
            <div :class="$style.hint">排他网关出线的路由条件，使用 ${expr} 语法</div>

            <div :class="$style.field">
              <label :class="$style.fieldLabel">默认连线</label>
              <div :class="$style.fieldControl">
                <el-checkbox
                  :model-value="selectedEdge.data?.isDefault ?? false"
                  @change="updateEdgeData('isDefault', $event)"
                >设为默认连线</el-checkbox>
              </div>
            </div>
            <div :class="$style.hint">当所有条件都不匹配时走此连线</div>
          </div>
        </div>
      </el-scrollbar>
    </template>

    <!-- ===== Empty state ===== -->
    <div v-else :class="$style.empty">
      <span :class="$style.emptyText">请选择节点或连线</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Edge } from '@vue-flow/core'
import { ArrowRight, ArrowDown, CopyDocument } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useFlowDesignerStore } from '../stores/flowDesigner.js'
import { useFlowGraphStore } from '../stores/flowGraph.js'
import { storeToRefs } from 'pinia'
import { useNodePropertyPanel } from '../composables/useNodePropertyPanel.js'

const designerStore = useFlowDesignerStore()
const graphStore = useFlowGraphStore()
const { selectedNodeId, selectedEdgeId } = storeToRefs(designerStore)

const { getPanel, getNodeTypeLabel, updateNodeData: updateNode } = useNodePropertyPanel()

/* --- Selected node / edge --- */

const selectedNode = computed(() => {
  if (!selectedNodeId.value) return null
  return graphStore.findNode(selectedNodeId.value) ?? null
})

const selectedEdge = computed<Edge | null>(() => {
  if (!selectedEdgeId.value) return null
  return graphStore.edges.find((e) => e.id === selectedEdgeId.value) ?? null
})

/* --- Node type display --- */

const nodeTypeLabel = computed(() => getNodeTypeLabel(selectedNode.value?.type))

/* --- Dynamic panel component --- */

const panelComponent = computed(() => {
  if (!selectedNode.value?.type) return null
  return getPanel(selectedNode.value.type)
})

/* --- Collapsible sections (for basic/edge sections only) --- */

const openSections = ref<Set<string>>(new Set(['basic', 'config']))

function toggleSection(key: string) {
  if (openSections.value.has(key)) {
    openSections.value.delete(key)
  } else {
    openSections.value.add(key)
  }
}

/* --- Node/edge update helpers --- */

function updateNodeData(key: string, value: unknown) {
  updateNode(key, value)
}

function updateEdgeData(key: string, value: unknown) {
  if (!selectedEdgeId.value) return
  graphStore.updateEdgeData(selectedEdgeId.value, key, value)
}

/* --- Copy ID --- */

function copyNodeId() {
  if (!selectedNode.value) return
  navigator.clipboard.writeText(selectedNode.value.id)
  ElMessage.success('已复制节点 ID')
}

function copyEdgeId() {
  if (!selectedEdge.value) return
  navigator.clipboard.writeText(selectedEdge.value.id)
  ElMessage.success('已复制连线 ID')
}
</script>

<style module>
.panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: var(--bg-color-white, #fff);
}

.header {
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-color-primary, #1a1a2e);
  flex-shrink: 0;
  border-bottom: 1px solid var(--border-color-light, #f0f2f5);
}

.widgetNameRow {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border-color-light, #f0f2f5);
  flex-shrink: 0;
}

.widgetType {
  font-weight: 600;
  font-size: 13px;
  color: var(--text-color-primary, #303133);
}

.copyIdIcon {
  color: var(--text-color-placeholder, #c0c4cc);
  cursor: pointer;
  font-size: 14px;
  transition: color 0.15s;
}

.copyIdIcon:hover {
  color: var(--color-primary, #409eff);
}

.scroll {
  flex: 1;
  min-height: 0;
}

.section {
  border-bottom: 1px solid var(--border-color-light, #f0f2f5);
}

.sectionHeader {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}

.sectionHeader:hover {
  background: var(--bg-color-page, #f5f7fa);
}

.arrow {
  color: var(--text-color-secondary, #909399);
  flex-shrink: 0;
}

.sectionLabel {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-color-primary, #303133);
  flex: 1;
}

.sectionCount {
  font-size: 11px;
  color: var(--text-color-placeholder, #c0c4cc);
  background: var(--bg-color-page, #f0f2f5);
  border-radius: 8px;
  padding: 0 6px;
  line-height: 18px;
}

.sectionBody {
  padding: 8px 16px;
  background: var(--bg-color-overlay, #fafbfc);
  border-top: 1px solid var(--border-color-light, #f0f2f5);
}

.field {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  min-height: 32px;
}

.fieldLabel {
  width: 70px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-color-secondary, #909399);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fieldControl {
  flex: 1;
  min-width: 0;
}

.hint {
  font-size: 12px;
  color: var(--text-color-placeholder, #c0c4cc);
  line-height: 1.5;
  margin: -4px 0 8px 70px;
}

.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.emptyText {
  color: var(--text-color-disabled, #c0c4cc);
  font-size: 14px;
}
</style>
```

- [ ] **Step 2: Verify compilation**

Run: `cd /Users/yangdongnan/work/schema-form-platform && pnpm --filter @schema-form/flow-web exec tsc --noEmit 2>&1 | head -30`

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add packages/flow/web/src/components/FlowPropertyPanel.vue
git commit -m "refactor(flow): slim down FlowPropertyPanel to registry-driven shell"
```

---

### Task 14: Verify full build and manual test

- [ ] **Step 1: Run the full web build**

Run: `cd /Users/yangdongnan/work/schema-form-platform && pnpm build:web 2>&1 | tail -20`

Expected: Build succeeds with no errors.

- [ ] **Step 2: Run dev server and verify**

Run: `cd /Users/yangdongnan/work/schema-form-platform && pnpm dev:web &`

Then open `http://localhost:5173` and navigate to the flow designer. Verify:
1. Select a user-task node → UserTaskPanel renders with all fields (assignee, approval mode, form binding, multi-instance)
2. Select a timer-event → TimerEventPanel renders with timer type and value
3. Select a gateway → GatewayPanel renders with default flow (only for exclusive/inclusive)
4. Select a service-task → ServiceTaskPanel renders with service type and config
5. Select start-event / end-event → DefaultNodePanel (no extra fields, just basic properties)
6. Select an edge → Edge config renders (unchanged)
7. All field edits persist (check by selecting another node and back)
8. Section toggle (collapse/expand) works in both the shell and panel components

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "refactor(flow): complete property panel registry architecture"
```

---

## Summary

| Task | Files Created/Modified | Lines |
|------|----------------------|-------|
| 1 | `nodePanels/types.ts` | ~25 |
| 2 | `composables/useNodePropertyPanel.ts` + `index.ts` | ~100 |
| 3 | `nodePanels/SectionToggle.vue` | ~65 |
| 4 | `nodePanels/FieldRow.vue` | ~45 |
| 5 | `nodePanels/DefaultNodePanel.vue` | ~10 |
| 6 | `nodePanels/UserTaskPanel.vue` | ~230 |
| 7 | `nodePanels/TimerEventPanel.vue` | ~75 |
| 8 | `nodePanels/ServiceTaskPanel.vue` + `SendTaskPanel.vue` + `ReceiveTaskPanel.vue` | ~180 |
| 9 | `nodePanels/ScriptTaskPanel.vue` | ~55 |
| 10 | `nodePanels/GatewayPanel.vue` | ~50 |
| 11 | `nodePanels/SubProcessPanel.vue` | ~45 |
| 12 | `nodePanels/index.ts` | ~15 |
| 13 | `FlowPropertyPanel.vue` (rewrite) | ~200 |

**Before:** 1 file, 1055 lines
**After:** 15 files, ~1100 total lines (spread across focused, single-responsibility files)

**Adding a new node type now requires:**
1. Create `XxxPanel.vue` in `nodePanels/`
2. Add one line to the registry in `useNodePropertyPanel.ts`
3. Zero changes to FlowPropertyPanel.vue
