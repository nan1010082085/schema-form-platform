<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Download } from '@element-plus/icons-vue'
import { flowApi } from '../api/flowApi.js'
import { useFlowExport } from '../composables/useFlowExport.js'
import type { FlowDefinitionData } from '@schema-form/flow-shared'
import styles from './FlowExportView.module.scss'

const flows = ref<FlowDefinitionData[]>([])
const { exporting, exportFiltered } = useFlowExport()

const exportForm = reactive({
  flowId: '',
  dateRange: null as [Date, Date] | null,
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
    startDate: exportForm.dateRange?.[0].toISOString(),
    endDate: exportForm.dateRange?.[1].toISOString(),
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
      <el-form :model="exportForm" label-width="100px" label-position="right">
        <el-form-item label="流程筛选">
          <el-select
            v-model="exportForm.flowId"
            placeholder="全部流程"
            clearable
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="flow in flows"
              :key="flow.id"
              :label="flow.name"
              :value="flow.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="时间范围">
          <el-date-picker
            v-model="exportForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format=""
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="导出格式">
          <el-radio-group v-model="exportForm.format">
            <el-radio value="csv">CSV</el-radio>
            <el-radio value="json">JSON</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :icon="Download"
            :loading="exporting"
            @click="handleExport"
          >
            导出
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>
