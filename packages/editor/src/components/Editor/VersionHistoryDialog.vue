<script setup lang="ts">
/**
 * VersionHistoryDialog — 版本历史弹窗
 *
 * 展示 Schema 的历史版本列表，标记发布版本，支持加载和发布特定版本。
 */
import { ref, watch } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { LoadingIcon } from 'tdesign-icons-vue-next'
import { fetchVersions, publishSchema } from '@/utils/apiClient'
import type { VersionEntry } from '@/types/api'

const props = defineProps<{
  visible: boolean
  editId: string | null
  currentVersion?: string
  schemaName?: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'load-version': [version: string]
  'published': []
}>()

const versions = ref<VersionEntry[]>([])
const loading = ref(false)
const publishingVersion = ref<string | null>(null)
const currentPage = ref(1)
const pageSize = 10
const total = ref(0)

async function loadVersions(page = 1) {
  if (!props.editId) return
  loading.value = true
  currentPage.value = page
  try {
    const res = await fetchVersions(props.editId, page, pageSize)
    versions.value = res.items ?? []
    total.value = res.total ?? 0
  } catch {
    MessagePlugin.error('加载版本历史失败')
  } finally {
    loading.value = false
  }
}

watch(() => props.visible, (val) => {
  if (val) loadVersions()
})

function handlePageChange(page: number) {
  loadVersions(page)
}

function handleLoadVersion(version: string) {
  emit('load-version', version)
  emit('update:visible', false)
}

async function handlePublishVersion(version: string) {
  if (!props.editId) return
  publishingVersion.value = version
  try {
    const result = await publishSchema(props.editId, version)
    if (result) {
      MessagePlugin.success(`版本 ${version} 发布成功`)
      emit('published')
      loadVersions(currentPage.value)
    } else {
      MessagePlugin.error('发布失败')
    }
  } catch {
    MessagePlugin.error('发布失败')
  } finally {
    publishingVersion.value = null
  }
}

function formatVersion(v: string) {
  const num = parseInt(v, 10)
  return isNaN(num) ? v : `v${num}`
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('zh-CN')
}

function tableRowClassName({ row }: { row: VersionEntry }) {
  if (row.published) return 'version-history__row-published'
  return ''
}

const tableColumns = [
  { colKey: 'version', title: '版本号', minWidth: 200, ellipsis: true },
  { colKey: 'status', title: '状态', width: 120, ellipsis: true },
  { colKey: 'createdAt', title: '创建时间', width: 180, ellipsis: true },
  { colKey: 'operation', title: '操作', width: 150, fixed: 'right' },
]
</script>

<template>
  <t-dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    :header="`版本历史 — ${schemaName || ''}`"
    width="50%"
    :close-on-overlay="false"
    destroy-on-close
  >
    <div v-if="loading" class="version-history__loading">
      <LoadingIcon class="version-history__spinning" />
      <span>加载中...</span>
    </div>

    <div v-else-if="versions.length === 0" class="version-history__empty">
      暂无版本记录
    </div>

    <template v-else>
      <t-table
        :data="versions"
        :columns="tableColumns"
        stripe
        size="small"
        :row-class-name="tableRowClassName"
        row-key="version"
      >
        <template #cell-version="{ row }">
          <span :class="{ 'version-history__current': row.version === currentVersion, 'version-history__published': row.published }">
            {{ formatVersion(row.version) }}
          </span>
        </template>

        <template #cell-status="{ row }">
          <div class="version-history__status-cell">
            <t-tag v-if="row.version === currentVersion" theme="primary" size="small" variant="outline">当前</t-tag>
            <t-tag v-if="row.published" theme="success" size="small">已发布</t-tag>
            <t-tag v-if="!row.published && row.version !== currentVersion" theme="default" size="small" variant="outline">草稿</t-tag>
          </div>
        </template>

        <template #cell-createdAt="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>

        <template #cell-operation="{ row }">
          <t-button
            v-if="row.version !== currentVersion"
            theme="primary"
            variant="text"
            size="small"
            @click="handleLoadVersion(row.version)"
          >
            加载
          </t-button>
          <t-button
            v-if="!row.published"
            theme="success"
            variant="text"
            size="small"
            :loading="publishingVersion === row.version"
            @click="handlePublishVersion(row.version)"
          >
            发布
          </t-button>
        </template>
      </t-table>

      <div v-if="total > 0" class="version-history__pagination">
        <t-pagination
          v-model:current="currentPage"
          :page-size="pageSize"
          :total="total"
          size="small"
          @current-change="handlePageChange"
        />
      </div>
    </template>

    <template #footer>
      <t-button @click="emit('update:visible', false)">关闭</t-button>
    </template>
  </t-dialog>
</template>

<style scoped lang="scss">
.version-history {
  &__loading,
  &__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 32px 0;
    color: var(--td-text-color-placeholder);
    font-size: 14px;
  }

  &__spinning {
    animation: version-history-spin 1s linear infinite;
  }

  &__status-cell {
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
  }

  &__current {
    font-weight: 600;
    color: var(--td-brand-color);
  }

  &__published {
    font-weight: 600;
    color: var(--td-success-color);
  }

  &__pagination {
    display: flex;
    justify-content: center;
    margin-top: 16px;
  }

  :deep(.version-history__row-published) {
    background-color: var(--td-success-color-light) !important;

    &:hover > td {
      background-color: var(--td-success-color-light) !important;
    }
  }

  @keyframes version-history-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
}
</style>
