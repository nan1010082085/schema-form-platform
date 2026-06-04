<script setup lang="ts">
/**
 * VersionDiffDialog — Schema 版本对比对话框
 *
 * 功能：
 * - 选择两个版本进行对比
 * - 左右分栏显示差异（左=旧版本，右=新版本）
 * - 红色=删除，黄色=修改，绿色=新增，蓝色=移动
 * - 差异统计摘要
 * - 加载历史版本到画布
 */
import { ref, watch } from 'vue'
import { fetchVersions, fetchVersion } from '@/utils/apiClient'
import type { VersionEntry } from '@/types/api'
import type { Widget } from '@/widgets/base/types'
import { diffSchema } from '@/utils/schemaDiff'
import type { DiffResult } from '@/utils/schemaDiff'
import styles from './VersionDiffDialog.module.scss'

const props = defineProps<{
  visible: boolean
  editId: string
  currentVersion: string
}>()

const emit = defineEmits<{
  'update:visible': [val: boolean]
  'load-version': [version: string, widgets: Widget[]]
}>()

// ---- 版本列表 ----
const versionList = ref<VersionEntry[]>([])
const versionLoading = ref(false)

// ---- 选择的版本 ----
const leftVersion = ref('')
const rightVersion = ref('')

// ---- Diff 状态 ----
const diffResult = ref<DiffResult | null>(null)
const diffLoading = ref(false)

// ---- 加载版本列表 ----
async function loadVersions() {
  if (!props.editId) return
  versionLoading.value = true
  try {
    const res = await fetchVersions(props.editId, 1, 50)
    versionList.value = res.items
    // 默认选中：左=当前版本前一个版本，右=当前版本
    if (res.items.length >= 2) {
      const currentIdx = res.items.findIndex((e) => e.version === props.currentVersion)
      if (currentIdx >= 0) {
        rightVersion.value = res.items[currentIdx].version
        leftVersion.value = res.items[Math.min(currentIdx + 1, res.items.length - 1)].version
        if (leftVersion.value === rightVersion.value && currentIdx > 0) {
          leftVersion.value = res.items[currentIdx - 1].version
        }
      } else {
        rightVersion.value = res.items[0].version
        leftVersion.value = res.items[1].version
      }
    } else if (res.items.length === 1) {
      rightVersion.value = res.items[0].version
      leftVersion.value = ''
    }
  } finally {
    versionLoading.value = false
  }
}

// ---- 执行 Diff ----
async function performDiff() {
  if (!leftVersion.value || !rightVersion.value) return
  diffLoading.value = true
  diffResult.value = null
  try {
    const [leftDetail, rightDetail] = await Promise.all([
      fetchVersion(props.editId, leftVersion.value),
      fetchVersion(props.editId, rightVersion.value),
    ])
    diffResult.value = diffSchema(
      leftDetail.json as unknown as Widget[],
      rightDetail.json as unknown as Widget[],
    )
  } finally {
    diffLoading.value = false
  }
}

// ---- 格式化版本号 ----
function formatVersion(v: string): string {
  if (!v || v.length !== 14) return v
  return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)} ${v.slice(8, 10)}:${v.slice(10, 12)}:${v.slice(12, 14)}`
}

// ---- Badge 标签 ----
const badgeLabels: Record<string, string> = {
  added: '+',
  removed: '-',
  modified: '~',
  moved: 'M',
}

// ---- 截断显示值 ----
function truncateValue(val: unknown, maxLen = 60): string {
  if (val === null || val === undefined) return '空'
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val)
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str
}

// ---- 加载版本 ----
async function handleLoadVersion(version: string) {
  try {
    const detail = await fetchVersion(props.editId, version)
    emit('load-version', version, detail.json as unknown as Widget[])
    emit('update:visible', false)
  } catch {
    // error surfaces via fetch
  }
}

// ---- Watch visible ----
watch(
  () => props.visible,
  (open) => {
    if (open) {
      diffResult.value = null
      loadVersions()
    }
  },
)
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="版本对比"
    width="900px"
    :close-on-click-modal="false"
    :class="styles['diff-dialog']"
    @update:model-value="emit('update:visible', $event)"
  >
    <!-- 顶部版本选择器 -->
    <div :class="styles['version-selectors']">
      <span :class="styles['version-selectors__label']">旧版本</span>
      <el-select
        v-model="leftVersion"
        placeholder="选择旧版本"
        :loading="versionLoading"
        size="small"
        style="width: 200px"
        @change="diffResult = null"
      >
        <el-option
          v-for="entry in versionList"
          :key="entry.version"
          :label="formatVersion(entry.version)"
          :value="entry.version"
        />
      </el-select>
      <span :class="styles['version-selectors__arrow']">→</span>
      <span :class="styles['version-selectors__label']">新版本</span>
      <el-select
        v-model="rightVersion"
        placeholder="选择新版本"
        :loading="versionLoading"
        size="small"
        style="width: 200px"
        @change="diffResult = null"
      >
        <el-option
          v-for="entry in versionList"
          :key="entry.version"
          :label="formatVersion(entry.version)"
          :value="entry.version"
        />
      </el-select>
      <el-button
        type="primary"
        size="small"
        :loading="diffLoading"
        :disabled="!leftVersion || !rightVersion || leftVersion === rightVersion"
        @click="performDiff"
      >
        对比
      </el-button>
    </div>

    <!-- 差异统计 -->
    <div v-if="diffResult" :class="styles['diff-summary']">
      <span :class="styles['diff-summary__text']">差异：</span>
      <span
        v-if="diffResult.added.length"
        :class="[styles['diff-summary__count'], styles['diff-summary__added']]"
      >+{{ diffResult.added.length }} 新增</span>
      <span
        v-if="diffResult.removed.length"
        :class="[styles['diff-summary__count'], styles['diff-summary__removed']]"
      >-{{ diffResult.removed.length }} 删除</span>
      <span
        v-if="diffResult.modified.length"
        :class="[styles['diff-summary__count'], styles['diff-summary__modified']]"
      >~{{ diffResult.modified.length }} 修改</span>
      <span
        v-if="diffResult.moved.length"
        :class="[styles['diff-summary__count'], styles['diff-summary__moved']]"
      >M{{ diffResult.moved.length }} 移动</span>
    </div>

    <!-- 对比主体 -->
    <div :class="styles['diff-body']">
      <!-- 左栏：旧版本 -->
      <div :class="styles['diff-panel']">
        <div :class="styles['diff-panel__header']">
          <span :class="styles['diff-panel__title']">旧版本 {{ formatVersion(leftVersion) }}</span>
          <el-button
            v-if="leftVersion"
            size="small"
            text
            type="primary"
            @click="handleLoadVersion(leftVersion)"
          >加载此版本</el-button>
        </div>
        <div :class="styles['diff-panel__scroll']">
          <template v-if="diffResult">
            <!-- 删除项（仅旧版本有） -->
            <div
              v-for="item in diffResult.removed"
              :key="'r-' + item.id"
              :class="[styles['diff-node'], styles['diff-node--removed']]"
            >
              <span :class="[styles['diff-node__badge'], styles['diff-node__badge--removed']]">{{ badgeLabels.removed }}</span>
              <div :class="styles['diff-node__info']">
                <span :class="styles['diff-node__name']">{{ item.label || item.name }}</span>
                <span :class="styles['diff-node__path']">{{ item.path }}</span>
              </div>
            </div>
            <!-- 修改项（旧值） -->
            <div
              v-for="item in diffResult.modified"
              :key="'m-old-' + item.id"
              :class="[styles['diff-node'], styles['diff-node--modified']]"
            >
              <span :class="[styles['diff-node__badge'], styles['diff-node__badge--modified']]">{{ badgeLabels.modified }}</span>
              <div :class="styles['diff-node__info']">
                <span :class="styles['diff-node__name']">{{ item.label || item.name }}</span>
                <span :class="styles['diff-node__path']">{{ item.path }}</span>
                <div v-if="item.changes" :class="styles['diff-node__changes']">
                  <div
                    v-for="(chg, ci) in item.changes"
                    :key="ci"
                    :class="styles['diff-node__change-item']"
                  >
                    <span :class="styles['diff-node__change-item-field']">{{ chg.field }}:</span>
                    <span :class="styles['diff-node__change-item-old']">{{ truncateValue(chg.oldValue) }}</span>
                  </div>
                </div>
              </div>
            </div>
            <!-- 移动项 -->
            <div
              v-for="item in diffResult.moved"
              :key="'mv-old-' + item.id"
              :class="[styles['diff-node'], styles['diff-node--moved']]"
            >
              <span :class="[styles['diff-node__badge'], styles['diff-node__badge--moved']]">{{ badgeLabels.moved }}</span>
              <div :class="styles['diff-node__info']">
                <span :class="styles['diff-node__name']">{{ item.label || item.name }}</span>
                <span :class="styles['diff-node__path']">{{ item.path }}</span>
              </div>
            </div>
            <!-- 无差异 -->
            <div
              v-if="!diffResult.removed.length && !diffResult.modified.length && !diffResult.moved.length"
              :class="styles['diff-panel__empty']"
            >无差异</div>
          </template>
          <div v-else-if="!diffLoading" :class="styles['diff-panel__empty']">点击"对比"查看差异</div>
        </div>
      </div>

      <!-- 右栏：新版本 -->
      <div :class="styles['diff-panel']">
        <div :class="styles['diff-panel__header']">
          <span :class="styles['diff-panel__title']">新版本 {{ formatVersion(rightVersion) }}</span>
          <el-button
            v-if="rightVersion"
            size="small"
            text
            type="primary"
            @click="handleLoadVersion(rightVersion)"
          >加载此版本</el-button>
        </div>
        <div :class="styles['diff-panel__scroll']">
          <template v-if="diffResult">
            <!-- 新增项（仅新版本有） -->
            <div
              v-for="item in diffResult.added"
              :key="'a-' + item.id"
              :class="[styles['diff-node'], styles['diff-node--added']]"
            >
              <span :class="[styles['diff-node__badge'], styles['diff-node__badge--added']]">{{ badgeLabels.added }}</span>
              <div :class="styles['diff-node__info']">
                <span :class="styles['diff-node__name']">{{ item.label || item.name }}</span>
                <span :class="styles['diff-node__path']">{{ item.path }}</span>
              </div>
            </div>
            <!-- 修改项（新值） -->
            <div
              v-for="item in diffResult.modified"
              :key="'m-new-' + item.id"
              :class="[styles['diff-node'], styles['diff-node--modified']]"
            >
              <span :class="[styles['diff-node__badge'], styles['diff-node__badge--modified']]">{{ badgeLabels.modified }}</span>
              <div :class="styles['diff-node__info']">
                <span :class="styles['diff-node__name']">{{ item.label || item.name }}</span>
                <span :class="styles['diff-node__path']">{{ item.path }}</span>
                <div v-if="item.changes" :class="styles['diff-node__changes']">
                  <div
                    v-for="(chg, ci) in item.changes"
                    :key="ci"
                    :class="styles['diff-node__change-item']"
                  >
                    <span :class="styles['diff-node__change-item-field']">{{ chg.field }}:</span>
                    <span :class="styles['diff-node__change-item-new']">{{ truncateValue(chg.newValue) }}</span>
                  </div>
                </div>
              </div>
            </div>
            <!-- 移动项 -->
            <div
              v-for="item in diffResult.moved"
              :key="'mv-new-' + item.id"
              :class="[styles['diff-node'], styles['diff-node--moved']]"
            >
              <span :class="[styles['diff-node__badge'], styles['diff-node__badge--moved']]">{{ badgeLabels.moved }}</span>
              <div :class="styles['diff-node__info']">
                <span :class="styles['diff-node__name']">{{ item.label || item.name }}</span>
                <span :class="styles['diff-node__path']">{{ item.path }}</span>
              </div>
            </div>
            <!-- 无差异 -->
            <div
              v-if="!diffResult.added.length && !diffResult.modified.length && !diffResult.moved.length"
              :class="styles['diff-panel__empty']"
            >无差异</div>
          </template>
          <div v-else-if="!diffLoading" :class="styles['diff-panel__empty']">点击"对比"查看差异</div>
        </div>
      </div>
    </div>

    <!-- 底部 -->
    <template #footer>
      <el-button @click="emit('update:visible', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>
