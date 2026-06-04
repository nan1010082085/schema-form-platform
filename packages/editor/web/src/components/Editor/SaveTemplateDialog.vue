<script setup lang="ts">
/**
 * SaveTemplateDialog — 保存模板对话框
 *
 * 将画布上的 Widget 树保存为模板。
 */
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { createTemplate } from '@/utils/apiClient'
import type { TemplateCategory } from '@/utils/apiClient'

const props = defineProps<{
  visible: boolean
  widgets: Record<string, unknown>[]
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const formRef = ref()
const name = ref('')
const description = ref('')
const category = ref<TemplateCategory>('other')
const tagsInput = ref('')
const saving = ref(false)

watch(() => props.visible, (val) => {
  if (val) {
    name.value = ''
    description.value = ''
    category.value = 'other'
    tagsInput.value = ''
  }
})

function handleClose() {
  emit('close')
}

async function handleSave() {
  if (!name.value.trim()) {
    ElMessage.warning('请输入模板名称')
    return
  }

  saving.value = true
  try {
    const tags = tagsInput.value
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)

    await createTemplate({
      name: name.value.trim(),
      description: description.value.trim(),
      category: category.value,
      widgets: props.widgets,
      tags,
    })

    ElMessage.success('模板保存成功')
    emit('saved')
    emit('close')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="保存为模板"
    width="420px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form ref="formRef" label-width="70px" label-position="left">
      <el-form-item label="名称" required>
        <el-input v-model="name" placeholder="输入模板名称" maxlength="100" show-word-limit />
      </el-form-item>

      <el-form-item label="描述">
        <el-input
          v-model="description"
          type="textarea"
          :rows="2"
          placeholder="模板描述（可选）"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="分类">
        <el-select v-model="category" style="width: 100%">
          <el-option label="表单" value="form" />
          <el-option label="报表" value="report" />
          <el-option label="布局" value="layout" />
          <el-option label="其他" value="other" />
        </el-select>
      </el-form-item>

      <el-form-item label="标签">
        <el-input v-model="tagsInput" placeholder="多个标签用逗号分隔" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>
