<script setup lang="ts">
import { computed } from 'vue'
import type { Node } from '@vue-flow/core'
import SectionToggle from './SectionToggle.vue'
import FieldRow from './FieldRow.vue'

const props = defineProps<{ node: Node }>()
const emit = defineEmits<{ updateNodeData: [key: string, value: unknown] }>()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

const scriptLanguage = computed(() => (props.node.data?.scriptLanguage as string) ?? 'javascript')
const scriptContent = computed(() => (props.node.data?.scriptContent as string) ?? '')
</script>

<template>
  <SectionToggle title="节点配置" :count="2">
    <FieldRow label="脚本语言">
      <el-select
        :model-value="scriptLanguage"

        @change="update('scriptLanguage', $event)"
      >
        <el-option label="JavaScript" value="javascript" />
        <el-option label="Groovy" value="groovy" />
        <el-option label="Python" value="python" />
      </el-select>
    </FieldRow>

    <FieldRow label="脚本内容" textarea>
      <el-input
        type="textarea"
        :model-value="scriptContent"
        placeholder="// 脚本代码"
        :rows="6"

        @input="update('scriptContent', $event)"
      />
    </FieldRow>
  </SectionToggle>
</template>
