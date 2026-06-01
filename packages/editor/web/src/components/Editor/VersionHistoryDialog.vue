<script setup lang="ts">
/**
 * VersionHistoryDialog — 版本历史弹窗
 *
 * 展示 Schema 的历史版本列表，标记发布版本，支持加载和发布特定版本。
 */
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
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
    ElMessage.error('加载版本历史失败')
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
      ElMessage.success(`版本 ${version} 发布成功`)
      emit('published')
      loadVersions(currentPage.value)
    } else {
      ElMessage.error('发布失败')
    }
  } catch {
    ElMessage.error('发布失败')
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
</script>

<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="emit('update:visible', $event)"
    :title="`版本历史 — ${schemaName || ''}`"
    width="50%"
    draggable
    :close-on-click-modal="false"
    destroy-on-close
  >
    <div v-if="loading" class="version-history__loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载中...</span>
    </div>

    <div v-else-if="versions.length === 0" class="version-history__empty">
      暂无版本记录
    </div>

    <template v-else>
      <el-table :data="versions" stripe size="small" :row-class-name="tableRowClassName">
        <el-table-column label="版本号" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span :class="{ 'version-history__current': row.version === currentVersion, 'version-history__published': row.published }">
              {{ formatVersion(row.version) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="120" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="version-history__status-cell">
              <el-tag v-if="row.version === currentVersion" type="primary" size="small" effect="plain">当前</el-tag>
              <el-tag v-if="row.published" type="success" size="small" effect="dark">已发布</el-tag>
              <el-tag v-if="!row.published && row.version !== currentVersion" type="info" size="small" effect="plain">草稿</el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="创建时间" width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.version !== currentVersion"
              type="primary"
              link
              size="small"
              @click="handleLoadVersion(row.version)"
            >
              加载
            </el-button>
            <el-button
              v-if="!row.published"
              type="success"
              link
              size="small"
              :loading="publishingVersion === row.version"
              @click="handlePublishVersion(row.version)"
            >
              发布
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="total > 0" class="version-history__pagination">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          small
          @current-change="handlePageChange"
        />
      </div>
    </template>

    <template #footer>
      <el-button @click="emit('update:visible', false)">关闭</el-button>
    </template>
  </el-dialog>
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
    color: var(--el-text-color-secondary);
    font-size: 14px;
  }

  &__status-cell {
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
  }

  &__current {
    font-weight: 600;
    color: var(--el-color-primary);
  }

  &__published {
    font-weight: 600;
    color: var(--el-color-success);
  }

  &__pagination {
    display: flex;
    justify-content: center;
    margin-top: 16px;
  }

  :deep(.version-history__row-published) {
    background-color: var(--el-color-success-light-9) !important;

    &:hover > td {
      background-color: var(--el-color-success-light-8) !important;
    }
  }
}
</style>
