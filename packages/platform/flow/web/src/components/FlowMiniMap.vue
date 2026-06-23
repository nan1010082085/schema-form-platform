<template>
  <div :class="$style.container">
    <div v-if="loading" :class="$style.loading">
      <el-icon class="is-loading"><Loading /></el-icon>
    </div>

    <div v-else-if="graph" :class="$style.flowContainer">
      <VueFlow :nodes="nodes" :edges="edges" :class="$style.flow">
        <template #node-bpmn-node="nodeProps">
          <BpmnNode
            v-bind="nodeProps"
            :highlighted="currentNodeId === nodeProps.id"
            :completed="completedNodes.includes(nodeProps.id)"
          />
        </template>
      </VueFlow>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { flowApi } from '../api/flowApi'

const props = defineProps<{
  instanceId: string
  currentNodeId?: string
}>()

const loading = ref(false)
const graph = ref<any>(null)
const completedNodes = ref<string[]>([])

const nodes = computed(() =>
  graph.value?.nodes?.map((node: any) => ({
    ...node,
    class: node.id === props.currentNodeId ? 'current' :
           completedNodes.value.includes(node.id) ? 'completed' : '',
  })) ?? []
)

const edges = computed(() => graph.value?.edges ?? [])

async function loadGraph() {
  if (!props.instanceId) return

  loading.value = true
  try {
    const [graphData, stateData] = await Promise.all([
      flowApi.getInstanceGraph(props.instanceId),
      flowApi.getExecutionState(props.instanceId),
    ])
    graph.value = graphData
    completedNodes.value = stateData.completedNodeIds ?? []
  } catch (err) {
    console.error('Failed to load flow graph:', err)
  } finally {
    loading.value = false
  }
}

watch(() => props.instanceId, loadGraph, { immediate: true })
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
}

.flowContainer {
  width: 100%;
  height: 100%;
}

.flow {
  width: 100%;
  height: 100%;
}
</style>
