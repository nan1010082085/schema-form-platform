<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { DownloadIcon } from 'tdesign-icons-vue-next'
import { flowApi } from '../api/flowApi.js'
import { useFlowExport } from '../composables/useFlowExport.js'
import type { FlowDefinitionData } from '@schema-form/flow-shared'
import styles from './FlowExportView.module.scss'

const flows = ref<FlowDefinitionData[]>([])
const { exporting, exportFiltered } = useFlowExport()

const exportForm = reactive({
  flowId: '',
  dateRange: null as [string, string] | null,
  format: 'csv' as 'csv' | 'json',
})

onMounted(async () => {
  try {
    const data = await flowApi.listFlows({ pageSize: 200 })
    flows.value = data.items
  } catch {
    // flows list is optional — user can export without filter
  }
})

async function handleExport() {
  await exportFiltered({
    flowId: exportForm.flowId || undefined,
    startDate: exportForm.dateRange?.[0],
    endDate: exportForm.dateRange?.[1],
    format: exportForm.format,
  })
}
</script>

<template>
  <div :class="styles.exportView">
    <div :class="styles.header">
      <h2>审批日志导出</h2>
    </div>

    <div :class="styles.formCard">
      <t-form :data="exportForm" label-width="100px" label-align="right">
        <t-form-item label="流程筛选">
          <t-select
            v-model="exportForm.flowId"
            placeholder="全部流程"
            clearable
            filterable
            style="width: 100%"
          >
            <t-option
              v-for="flow in flows"
              :key="flow.id"
              :label="flow.name"
              :value="flow.id"
            />
          </t-select>
        </t-form-item>

        <t-form-item label="时间范围">
          <t-date-picker
            v-model="exportForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 100%"
          />
        </t-form-item>

        <t-form-item label="导出格式">
          <t-radio-group v-model:value="exportForm.format">
            <t-radio value="csv">CSV</t-radio>
            <t-radio value="json">JSON</t-radio>
          </t-radio-group>
        </t-form-item>

        <t-form-item>
          <t-button
            theme="primary"
            :loading="exporting"
            @click="handleExport"
          >
            <DownloadIcon />
            导出
          </t-button>
        </t-form-item>
      </t-form>
    </div>
  </div>
</template>
