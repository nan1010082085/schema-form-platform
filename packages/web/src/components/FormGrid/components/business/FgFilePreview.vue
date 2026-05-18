<script setup lang="ts">
/**
 * FgFilePreview — 文件选择预览组件
 *
 * 两列布局：左侧显示已选文件名称列表（可多行），右侧选择按钮点击弹出文件选择对话框。
 * Schema-driven: 通过 v-model 绑定 formData[field]，支持单选/多选。
 */
import { ref, computed } from 'vue'
import { Search } from '@element-plus/icons-vue'
import type { FormFieldValue } from '../../types'

const props = withDefaults(defineProps<{
  modelValue?: FormFieldValue
  /** Available files — can be loaded from API or passed as static options */
  options?: { name: string; url?: string; id?: string | number }[]
  /** Allow multiple selection */
  multiple?: boolean
  /** Dialog title */
  dialogTitle?: string
  /** Max selected files (multiple mode) */
  maxFiles?: number
}>(), {
  multiple: false,
  dialogTitle: '选择文件',
})

const emit = defineEmits<{
  'update:modelValue': [value: FormFieldValue]
}>()

const dialogVisible = ref(false)
const tempSelected = ref<(string | number)[]>([])

/** Parse selected file IDs from modelValue */
const selectedIds = computed<(string | number)[]>(() => {
  const v = props.modelValue
  if (!v) return []
  if (Array.isArray(v)) return v.map(String)
  return [String(v)]
})

/** Selected file objects — use effective options (mock fallback) */
const selectedFiles = computed(() => {
  const ids = selectedIds.value
  return (props.options ?? []).filter(f => ids.includes(String(f.id ?? f.name)))
})

function openDialog() {
  tempSelected.value = [...selectedIds.value]
  dialogVisible.value = true
}

function confirmSelection() {
  if (props.multiple) {
    emit('update:modelValue', tempSelected.value as FormFieldValue)
  } else {
    emit('update:modelValue', tempSelected.value[0] ?? '')
  }
  dialogVisible.value = false
}

function cancelSelection() {
  dialogVisible.value = false
}

function handleSelect(selection: (string | number)[]) {
  if (props.multiple && props.maxFiles && selection.length > props.maxFiles) {
    tempSelected.value = selection.slice(0, props.maxFiles)
  } else {
    tempSelected.value = selection
  }
}

function removeFile(id: string | number) {
  const ids = selectedIds.value.filter(i => i !== String(id))
  if (props.multiple) {
    emit('update:modelValue', ids as FormFieldValue)
  } else {
    emit('update:modelValue', '')
  }
}

const tableData = computed(() =>
  (props.options ?? []).map(f => ({ ...f, _id: String(f.id ?? f.name) })),
)
</script>

<template>
  <div class="fg-file-preview">
    <!-- Left: selected files list -->
    <div class="fg-file-preview__list">
      <div v-if="selectedFiles.length === 0" class="fg-file-preview__empty">
        未选择文件
      </div>
      <div
        v-for="file in selectedFiles"
        :key="file.id ?? file.name"
        class="fg-file-preview__item"
      >
        <span class="fg-file-preview__item-name">{{ file.name }}</span>
        <el-button
          type="danger"
          size="small"
          text
          @click="removeFile(file.id ?? file.name)"
        >
          ✕
        </el-button>
      </div>
    </div>

    <!-- Right: select button -->
    <div class="fg-file-preview__action">
      <el-button
        type="primary"
        :icon="Search"
        @click="openDialog"
      >
        {{ multiple ? '选择文件' : '选择文件' }}
      </el-button>
    </div>

    <!-- File selection dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="700px"
      :close-on-click-modal="false"
      append-to-body
    >
      <el-table
        :data="tableData"
        :max-height="400"
        @selection-change="handleSelect(($event as Record<string, unknown>[]).map((r) => r._id as string | number))"
      >
        <el-table-column
          v-if="multiple"
          type="selection"
          width="50"
          :reserve-selection="true"
        />
        <el-table-column
          v-else
          width="50"
        >
          <template #default="{ row }">
            <el-radio
              :model-value="tempSelected[0]"
              :value="String(row._id)"
              @click.stop="tempSelected = [String(row._id)]"
            />
          </template>
        </el-table-column>
        <el-table-column label="文件名称" prop="name" />
        <el-table-column v-if="options?.[0]?.url" label="路径" prop="url" min-width="200">
          <template #default="{ row }">
            <span style="font-size:12px;color:#909399;">{{ row.url }}</span>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-button @click="cancelSelection">取消</el-button>
        <el-button type="primary" @click="confirmSelection">
          确定 ({{ tempSelected.length }})
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.fg-file-preview {
  display: flex;
  gap: 12px;
  min-height: 80px;

  &__list {
    flex: 1;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    padding: 8px;
    background: #fafafa;
    max-height: 200px;
    overflow-y: auto;
  }

  &__empty {
    text-align: center;
    color: #c0c4cc;
    font-size: 13px;
    padding: 16px 0;
  }

  &__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 0;
    border-bottom: 1px solid #ebeef5;
    font-size: 13px;

    &:last-child { border-bottom: none; }
  }

  &__item-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__action {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 100px;
  }
}
</style>
