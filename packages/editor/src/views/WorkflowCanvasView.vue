<script setup lang="ts">
/**
 * WorkflowCanvasView — 工作流画布
 *
 * 三栏布局：左侧节点面板 + 中间画布 + 右侧属性配置
 * 顶部工具栏：保存、运行、调试
 */
import { ref, computed, markRaw, h } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useWorkflow } from '@/composables/useWorkflow'
import type { WorkflowNodeType, WorkflowNodeData } from '@/composables/useWorkflow'
import { apiClient } from '@/utils/apiClient'
import StartNode from '@/components/WorkflowNodes/StartNode.vue'
import EndNode from '@/components/WorkflowNodes/EndNode.vue'
import EditorNode from '@/components/WorkflowNodes/EditorNode.vue'
import FlowNode from '@/components/WorkflowNodes/FlowNode.vue'
import AINode from '@/components/WorkflowNodes/AINode.vue'
import ConditionNode from '@/components/WorkflowNodes/ConditionNode.vue'
import EditorNodePanel from '@/components/WorkflowNodePanel/EditorNodePanel.vue'
import FlowNodePanel from '@/components/WorkflowNodePanel/FlowNodePanel.vue'
import AINodePanel from '@/components/WorkflowNodePanel/AINodePanel.vue'
import ConditionNodePanel from '@/components/WorkflowNodePanel/ConditionNodePanel.vue'
import styles from './WorkflowCanvasView.module.scss'

// ── Vue Flow 实例 ──
const { onConnect, onNodeClick, onEdgeClick, onPaneClick, project } = useVueFlow({
  id: 'workflow-canvas',
})

// ── 工作流状态 ──
const {
  workflow,
  selectedNodeId,
  selectedNodeData,
  addNode,
  deleteNode,
  updateNodeConfig,
  handleConnect,
  selectNode,
  selectEdge,
  exportWorkflow,
} = useWorkflow()

// ── 节点类型映射 ──
const nodeTypes = {
  'workflow-node': markRaw({
    props: ['data', 'selected'],
    setup(props: { data: WorkflowNodeData; selected?: boolean }) {
      const componentMap: Record<string, typeof StartNode> = {
        'start': StartNode,
        'end': EndNode,
        'editor': EditorNode,
        'flow': FlowNode,
        'ai': AINode,
        'condition': ConditionNode,
      }
      const component = computed(() => componentMap[props.data.nodeType])
      return () => h(component.value, { data: props.data, selected: props.selected })
    },
  }),
}

// ── 左侧面板节点列表 ──
const nodeGroups = [
  {
    title: '基础节点',
    nodes: [
      { type: 'start' as WorkflowNodeType, label: '开始', icon: '▶' },
      { type: 'end' as WorkflowNodeType, label: '结束', icon: '■' },
    ],
  },
  {
    title: '业务节点',
    nodes: [
      { type: 'editor' as WorkflowNodeType, label: 'Editor 节点', icon: '📝' },
      { type: 'flow' as WorkflowNodeType, label: 'Flow 节点', icon: '⚡' },
      { type: 'ai' as WorkflowNodeType, label: 'AI 节点', icon: '🤖' },
    ],
  },
  {
    title: '逻辑节点',
    nodes: [
      { type: 'condition' as WorkflowNodeType, label: '条件节点', icon: '🔀' },
    ],
  },
]

// ── 拖拽添加节点 ──
const draggedType = ref<WorkflowNodeType | null>(null)

function onDragStart(event: DragEvent, nodeType: WorkflowNodeType) {
  if (event.dataTransfer) {
    event.dataTransfer.setData('application/vueflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
    draggedType.value = nodeType
  }
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function onDrop(event: DragEvent) {
  const type = event.dataTransfer?.getData('application/vueflow') as WorkflowNodeType
  if (!type) return

  const position = project({
    x: event.clientX - 300,
    y: event.clientY - 56,
  })

  addNode(type, position)
  draggedType.value = null
}

// ── 事件处理 ──

onConnect(handleConnect)

onNodeClick(({ node }) => {
  selectNode(node.id)
})

onEdgeClick(({ edge }) => {
  selectEdge(edge.id)
})

onPaneClick(() => {
  selectNode(null)
  selectEdge(null)
})

// ── 右侧面板 ──
const panelType = computed(() => {
  if (!selectedNodeData.value) return null
  return selectedNodeData.value.nodeType
})

function handleConfigUpdate(config: Record<string, unknown>) {
  if (selectedNodeId.value) {
    updateNodeConfig(selectedNodeId.value, config)
  }
}

function handleDeleteNode() {
  if (selectedNodeId.value) {
    deleteNode(selectedNodeId.value)
  }
}

// ── 工具栏操作 ──
const saving = ref(false)
const running = ref(false)
const debugging = ref(false)

// ── 工作流流程定义 ID（首次保存后赋值） ──
const flowDefinitionId = ref('')

async function handleSave() {
  saving.value = true
  try {
    const data = exportWorkflow()

    // 1. 如果还没有 flowDefinitionId，先创建流程定义
    if (!flowDefinitionId.value) {
      const def = await apiClient.post<{ id: string }>('/flows', {
        name: data.name || '未命名工作流',
        description: data.description || '',
      })
      flowDefinitionId.value = (def as unknown as { id: string }).id
    } else {
      // 更新流程定义名称/描述
      await apiClient.put(`/flows/${flowDefinitionId.value}`, {
        name: data.name,
        description: data.description,
      })
    }

    // 2. 保存画布图数据为版本
    await apiClient.post(`/flows/${flowDefinitionId.value}/versions`, {
      graph: { nodes: data.nodes, edges: data.edges },
      metadata: { variables: data.variables },
    })

    ElMessage.success('工作流已保存')
  } catch (err) {
    console.error('Save workflow failed:', err)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

async function handleRun() {
  running.value = true
  try {
    // 未保存则先保存
    if (!flowDefinitionId.value) {
      await handleSave()
      if (!flowDefinitionId.value) return
    }

    // 发布流程定义
    await apiClient.post(`/flows/${flowDefinitionId.value}/publish`)

    // 启动流程实例
    const instance = await apiClient.post<{ id: string }>('/flow-instances', {
      definitionId: flowDefinitionId.value,
      variables: workflow.value.variables.reduce(
        (acc, v) => ({ ...acc, [v.key]: v.defaultValue ?? '' }),
        {} as Record<string, unknown>,
      ),
    })

    ElMessage.success(`工作流实例已启动 (${(instance as unknown as { id: string }).id})`)
  } catch (err) {
    console.error('Run workflow failed:', err)
    ElMessage.error('运行失败')
  } finally {
    running.value = false
  }
}

async function handleDebug() {
  debugging.value = true
  try {
    const data = exportWorkflow()

    // ── 结构校验 ──
    const errors: string[] = []

    // 1. 必须有开始和结束节点
    const startNodes = data.nodes.filter(n => (n.data as WorkflowNodeData)?.nodeType === 'start')
    const endNodes = data.nodes.filter(n => (n.data as WorkflowNodeData)?.nodeType === 'end')
    if (startNodes.length === 0) errors.push('缺少「开始」节点')
    if (endNodes.length === 0) errors.push('缺少「结束」节点')
    if (startNodes.length > 1) errors.push('存在多个「开始」节点')
    if (endNodes.length > 1) errors.push('存在多个「结束」节点')

    // 2. 业务节点不能悬空（必须有入边和出边）
    const edgeSources = new Set(data.edges.map(e => e.source))
    const edgeTargets = new Set(data.edges.map(e => e.target))
    for (const node of data.nodes) {
      const nodeData = node.data as WorkflowNodeData
      if (nodeData.nodeType === 'start') {
        if (!edgeSources.has(node.id)) errors.push(`「${nodeData.label}」没有出边`)
      } else if (nodeData.nodeType === 'end') {
        if (!edgeTargets.has(node.id)) errors.push(`「${nodeData.label}」没有入边`)
      } else {
        if (!edgeTargets.has(node.id)) errors.push(`「${nodeData.label}」没有入边`)
        if (!edgeSources.has(node.id)) errors.push(`「${nodeData.label}」没有出边`)
      }
    }

    // 3. 条件节点必须配置条件
    for (const node of data.nodes) {
      const nodeData = node.data as WorkflowNodeData
      if (nodeData.nodeType === 'condition') {
        const cfg = nodeData.config as { field?: string; operator?: string; value?: string }
        if (!cfg.field || !cfg.operator) {
          errors.push(`条件节点「${nodeData.label}」未配置判断条件`)
        }
      }
    }

    if (errors.length > 0) {
      const dialog = DialogPlugin.confirm({
        header: '调试结果 — 发现问题',
        body: errors.map((e, i) => `${i + 1}. ${e}`).join('\n'),
        confirmBtn: '知道了',
        cancelBtn: false,
      })
      return
    }

    // ── 校验通过，保存后做一次 dry-run 发布验证 ──
    if (!flowDefinitionId.value) {
      await handleSave()
      if (!flowDefinitionId.value) return
    }

    await apiClient.post(`/flows/${flowDefinitionId.value}/publish`)
    ElMessage.success('调试通过 — 流程结构合法，已自动发布')
  } catch (err) {
    console.error('Debug workflow failed:', err)
    ElMessage.error('调试失败')
  } finally {
    debugging.value = false
  }
}
</script>

<template>
  <div :class="styles.canvasView">
    <!-- 顶部工具栏 -->
    <div :class="styles.toolbar">
      <div :class="styles.toolbarLeft">
        <t-button
          :class="styles.backBtn"
          variant="text"
          @click="$router.back()"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </t-button>
        <t-input
          v-model:value="workflow.name"
          :class="styles.nameInput"
          placeholder="工作流名称"
        />
        <t-tag :theme="workflow.status === 'published' ? 'success' : 'default'" size="small">
          {{ workflow.status === 'published' ? '已发布' : '草稿' }}
        </t-tag>
      </div>
      <div :class="styles.toolbarRight">
        <t-button :loading="debugging" @click="handleDebug">
          调试
        </t-button>
        <t-button :loading="running" @click="handleRun">
          运行
        </t-button>
        <t-button theme="primary" :loading="saving" @click="handleSave">
          保存
        </t-button>
      </div>
    </div>

    <div :class="styles.body">
      <!-- 左侧节点面板 -->
      <div :class="styles.leftPanel">
        <div :class="styles.panelTitle">节点库</div>
        <div v-for="group in nodeGroups" :key="group.title" :class="styles.nodeGroup">
          <div :class="styles.groupTitle">{{ group.title }}</div>
          <div :class="styles.nodeList">
            <div
              v-for="node in group.nodes"
              :key="node.type"
              :class="styles.nodeItem"
              draggable="true"
              @dragstart="onDragStart($event, node.type)"
            >
              <span :class="styles.nodeIcon">{{ node.icon }}</span>
              <span :class="styles.nodeLabel">{{ node.label }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 中间画布 -->
      <div
        :class="styles.canvas"
        @drop="onDrop"
        @dragover="onDragOver"
      >
        <VueFlow
          :nodes="workflow.nodes"
          :edges="workflow.edges"
          :node-types="nodeTypes"
          :default-edge-options="{ animated: true, type: 'smoothstep' }"
          fit-view-on-init
        >
          <Background />
          <Controls />
          <MiniMap />
        </VueFlow>
      </div>

      <!-- 右侧属性面板 -->
      <div :class="styles.rightPanel">
        <template v-if="selectedNodeId && selectedNodeData">
          <div :class="styles.panelTitle">
            {{ selectedNodeData.label }}
            <t-button
              :class="styles.deleteBtn"
              theme="danger"
              variant="text"
              size="small"
              @click="handleDeleteNode"
            >
              删除节点
            </t-button>
          </div>
          <EditorNodePanel
            v-if="panelType === 'editor'"
            :node-data="selectedNodeData"
            @update:config="handleConfigUpdate"
          />
          <FlowNodePanel
            v-else-if="panelType === 'flow'"
            :node-data="selectedNodeData"
            @update:config="handleConfigUpdate"
          />
          <AINodePanel
            v-else-if="panelType === 'ai'"
            :node-data="selectedNodeData"
            @update:config="handleConfigUpdate"
          />
          <ConditionNodePanel
            v-else-if="panelType === 'condition'"
            :node-data="selectedNodeData"
            :variables="workflow.variables"
            @update:config="handleConfigUpdate"
          />
          <div v-else :class="styles.emptyPanel">
            <span :class="styles.emptyText">该节点暂无可配置项</span>
          </div>
        </template>
        <div v-else :class="styles.emptyPanel">
          <span :class="styles.emptyText">点击节点查看配置</span>
        </div>
      </div>
    </div>
  </div>
</template>
