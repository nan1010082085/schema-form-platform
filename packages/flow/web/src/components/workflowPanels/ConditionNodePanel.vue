<script setup lang="ts">
import { computed } from 'vue'
import type { Node, Edge } from '@vue-flow/core'
import { AddIcon, DeleteIcon } from 'tdesign-icons-vue-next'
import { useFlowGraphStore } from '@/stores/flowGraph.js'
import SectionToggle from '@/components/nodePanels/SectionToggle.vue'
import FieldRow from '@/components/nodePanels/FieldRow.vue'
import HintText from '@/components/nodePanels/HintText.vue'
import styles from './ConditionNodePanel.module.scss'

const props = defineProps<{ node: Node }>()
const emit = defineEmits<{ updateNodeData: [key: string, value: unknown] }>()

const graphStore = useFlowGraphStore()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

/* --- Branch list --- */

interface BranchConfig {
  label: string
  conditionType: 'expression' | 'variable'
  conditionExpression: string
  variableName: string
  operator: string
  compareValue: string
}

const branches = computed<BranchConfig[]>(() => {
  return (props.node.data?.branches as BranchConfig[]) ?? []
})

function addBranch() {
  const current = [...branches.value]
  current.push({
    label: '',
    conditionType: 'expression',
    conditionExpression: '',
    variableName: '',
    operator: '==',
    compareValue: '',
  })
  update('branches', current)
}

function removeBranch(index: number) {
  const current = [...branches.value]
  current.splice(index, 1)
  update('branches', current)
}

function updateBranch(index: number, key: keyof BranchConfig, value: string) {
  const current = [...branches.value]
  current[index] = { ...current[index], [key]: value }
  update('branches', current)
}

/* --- Outgoing edges for mapping branches to edges --- */

const outgoingEdges = computed(() =>
  graphStore.edges.filter((e) => e.source === props.node.id),
)

function updateEdgeCondition(edge: Edge, value: string) {
  graphStore.updateEdgeData(edge.id, 'conditionExpression', value)
}

function updateEdgeLabel(edge: Edge, value: string) {
  graphStore.updateEdgeData(edge.id, 'label', value)
}

function toggleEdgeDefault(edge: Edge, value: boolean) {
  graphStore.updateEdgeData(edge.id, 'isDefault', value)
}

function targetLabel(edge: Edge): string {
  const targetNode = graphStore.findNode(edge.target)
  return (targetNode?.data?.label as string) ?? edge.target
}

/* --- Operator options --- */

const operatorOptions = [
  { label: '==', value: '==' },
  { label: '!=', value: '!=' },
  { label: '>', value: '>' },
  { label: '>=', value: '>=' },
  { label: '<', value: '<' },
  { label: '<=', value: '<=' },
  { label: '包含', value: 'contains' },
  { label: '为空', value: 'empty' },
  { label: '不为空', value: 'not_empty' },
]
</script>

<template>
  <!-- 条件配置 -->
  <SectionToggle title="条件配置" :count="branches.length">
    <div
      v-for="(branch, index) in branches"
      :key="index"
      :class="styles.branchCard"
    >
      <div :class="styles.branchHeader">
        <span :class="styles.branchTitle">分支 {{ index + 1 }}</span>
        <DeleteIcon
          :class="styles.deleteIcon"
          @click="removeBranch(index)"
        />
      </div>

      <FieldRow label="分支标签">
        <t-input
          :value="branch.label"
          placeholder="例: 金额大于 10000"
          @input="updateBranch(index, 'label', $event)"
        />
      </FieldRow>

      <FieldRow label="条件方式">
        <t-radio-group
          :value="branch.conditionType"
          @change="updateBranch(index, 'conditionType', $event)"
        >
          <t-radio value="expression">表达式</t-radio>
          <t-radio value="variable">可视化</t-radio>
        </t-radio-group>
      </FieldRow>

      <template v-if="branch.conditionType === 'expression'">
        <FieldRow label="条件表达式">
          <t-input
            :value="branch.conditionExpression"
            placeholder="${amount > 10000}"
            @input="updateBranch(index, 'conditionExpression', $event)"
          />
        </FieldRow>
      </template>

      <template v-else>
        <FieldRow label="变量名">
          <t-input
            :value="branch.variableName"
            placeholder="例: amount"
            @input="updateBranch(index, 'variableName', $event)"
          />
        </FieldRow>

        <FieldRow label="运算符">
          <t-select
            :value="branch.operator"
            @change="updateBranch(index, 'operator', $event)"
          >
            <t-option
              v-for="opt in operatorOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </t-select>
        </FieldRow>

        <FieldRow
          v-if="branch.operator !== 'empty' && branch.operator !== 'not_empty'"
          label="比较值"
        >
          <t-input
            :value="branch.compareValue"
            placeholder="比较的值"
            @input="updateBranch(index, 'compareValue', $event)"
          />
        </FieldRow>
      </template>
    </div>

    <t-button
      :class="styles.addBranchBtn"
      :icon="AddIcon"
      @click="addBranch"
    >
      添加分支
    </t-button>

    <HintText v-if="branches.length === 0">
      配置条件分支，支持表达式或可视化条件编辑。每个分支对应一条出线。
    </HintText>
  </SectionToggle>

  <!-- 分支出线映射 -->
  <SectionToggle
    v-if="outgoingEdges.length > 0"
    title="出线条件"
    :count="outgoingEdges.length"
  >
    <div
      v-for="edge in outgoingEdges"
      :key="edge.id"
      :class="[styles.edgeCard, { [styles.edgeCardDefault]: edge.data?.isDefault }]"
    >
      <div :class="styles.edgeHeader">
        <span :class="styles.edgeTarget">-> {{ targetLabel(edge) }}</span>
        <t-checkbox
          :checked="edge.data?.isDefault ?? false"
          :class="styles.defaultCheck"
          @change="toggleEdgeDefault(edge, $event)"
        >
          默认
        </t-checkbox>
      </div>

      <FieldRow label="条件标签">
        <t-input
          :value="(edge.label as string) ?? ''"
          placeholder="条件标签"
          @input="updateEdgeLabel(edge, $event)"
        />
      </FieldRow>

      <FieldRow label="条件表达式">
        <t-input
          :value="edge.data?.conditionExpression ?? ''"
          placeholder="${amount > 10000}"
          @input="updateEdgeCondition(edge, $event)"
        />
      </FieldRow>
    </div>

    <HintText>
      表达式使用 JUEL 语法：<code>${变量名 运算符 值}</code>，例如 <code>${amount &gt; 10000}</code>
    </HintText>
  </SectionToggle>

  <SectionToggle v-else title="出线条件" :count="0">
    <HintText :indent="false">
      暂无出线。从该条件节点拖出连线后，可在此配置每条出线的条件表达式。
    </HintText>
  </SectionToggle>
</template>
