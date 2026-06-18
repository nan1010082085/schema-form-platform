<template>
  <div :class="$style.container">
    <div v-if="loading" :class="$style.loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载中...</span>
    </div>

    <template v-else-if="graph">
      <!-- 流程图 -->
      <VueFlow :nodes="nodes" :edges="edges" :class="$style.flow">
        <template #node-bpmn-node="nodeProps">
          <BpmnNode
            v-bind="nodeProps"
            :highlighted="currentNodeIds.includes(nodeProps.id)"
            :completed="completedNodeIds.includes(nodeProps.id)"
          />
        </template>
      </VueFlow>

      <!-- 图例 -->
      <div :class="$style.legend">
        <span :class="$style.legendItem">
          <span :class="[$style.dot, $style.current]"></span> 当前节点
        </span>
        <span :class="$style.legendItem">
          <span :class="[$style.dot, $style.completed]"></span> 已完成
        </span>
      </div>
    </template>

    <div v-else :class="$style.empty">
      <span>未找到流程实例</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'
import { flowApi } from '../../api/flowApi'

const route = useRoute()

const instanceId = computed(() => route.query.instanceId as string)

const loading = ref(false)
const graph = ref<any>(null)
const currentNodeIds = ref<string[]>([])
const completedNodeIds = ref<string[]>([])

const nodes = computed(() =>
  graph.value?.nodes?.map((node: any) => ({
    ...node,
    class: currentNodeIds.value.includes(node.id) ? 'current' :
           completedNodeIds.value.includes(node.id) ? 'completed' : '',
  })) ?? []
)

const edges = computed(() => graph.value?.edges ?? [])

async function loadPreview() {
  if (!instanceId.value) return

  loading.value = true
  try {
    const [graphData, stateData] = await Promise.all([
      flowApi.getInstanceGraph(instanceId.value),
      flowApi.getExecutionState(instanceId.value),
    ])
    graph.value = graphData
    currentNodeIds.value = stateData.currentNodeIds ?? []
    completedNodeIds.value = stateData.completedNodeIds ?? []
  } catch (err) {
    console.error('Failed to load flow preview:', err)
  } finally {
    loading.value = false
  }
}

// 监听 instanceId 变化
watch(instanceId, loadPreview, { immediate: true })

// 监听 postMessage（来自 Editor 宿主）
function handleMessage(event: MessageEvent) {
  if (event.data?.type === 'highlight-node') {
    currentNodeIds.value = [event.data.nodeId]
  }
}

onMounted(() => {
  window.addEventListener('message', handleMessage)
})
</script>

<style module>
.container {
  width: 100%;
  height: 100%;
  position: relative;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 8px;
  color: var(--el-text-color-secondary);
}

.flow {
  width: 100%;
  height: 100%;
}

.legend {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  gap: 12px;
  padding: 8px 12px;
  background: var(--el-bg-color);
  border-radius: 6px;
  box-shadow: var(--el-box-shadow-light);
}

.legendItem {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.current {
  background: var(--el-color-primary);
}

.completed {
  background: var(--el-color-success);
}

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--el-text-color-secondary);
}
</style>
