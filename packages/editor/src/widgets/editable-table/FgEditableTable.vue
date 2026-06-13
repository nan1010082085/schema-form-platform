<script setup lang="ts">
import { inject, ref } from 'vue'
import { widgetDataKey } from '../base/types'
import { useExposeWidget } from '../../composables/useExposeWidget'
import styles from './style.module.scss'
const widgetData = inject(widgetDataKey)!
const tableData = ref<Record<string, unknown>[]>([])
useExposeWidget(() => ({
  get tableData() { return tableData.value },
}))
</script>
<template>
  <div :class="styles.container">
    <div :class="styles.header">
      <span :class="styles.title">{{ (widgetData.props?.title as string) || '可编辑表格' }}</span>
      <t-button v-if="widgetData.props?.showAddButton" type="primary" size="small">
        {{ (widgetData.props?.addButtonText as string) || '添加行' }}
      </t-button>
    </div>
    <t-table :data="[]" border />
  </div>
</template>