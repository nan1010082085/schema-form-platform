<script setup lang="ts">
import { computed } from 'vue'
import type { Node } from '@vue-flow/core'
import SectionToggle from './SectionToggle.vue'
import FieldRow from './FieldRow.vue'
import styles from './GatewayPanel.module.scss'

const props = defineProps<{ node: Node }>()
const emit = defineEmits<{ updateNodeData: [key: string, value: unknown] }>()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

const defaultFlow = computed(() => (props.node.data?.defaultFlow as string) ?? '')
const description = computed(() => (props.node.data?.description as string) ?? '')
</script>

<template>
  <SectionToggle title="节点配置" :count="2">
    <FieldRow label="默认连线">
      <el-input
        :model-value="defaultFlow"
        placeholder="默认连线 ID（可选）"
        @input="update('defaultFlow', $event)"
      />
    </FieldRow>

    <FieldRow label="网关描述">
      <el-input
        :model-value="description"
        placeholder="网关描述（可选）"
        @input="update('description', $event)"
      />
    </FieldRow>

    <div :class="styles.hint">当所有条件都不匹配时走默认连线，也可在连线上标记「默认」</div>
  </SectionToggle>
</template>
