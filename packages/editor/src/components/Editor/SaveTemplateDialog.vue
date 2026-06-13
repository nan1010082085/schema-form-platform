<script setup lang="ts">
/**
 * SaveTemplateDialog — 保存模板对话框
 *
 * 将画布上的 Widget 树保存为模板。
 */
import { ref, watch } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
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
    MessagePlugin.warning('请输入模板名称')
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

    MessagePlugin.success('模板保存成功')
    emit('saved')
    emit('close')
  } catch (err) {
    MessagePlugin.error(err instanceof Error ? err.message : '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <t-dialog
    :visible="visible"
    header="保存为模板"
    width="420px"
    :close-on-overlay="false"
    @close="handleClose"
  >
    <t-form ref="formRef" label-width="70px" label-align="left">
      <t-form-item label="名称" required>
        <t-input v-model:value="name" placeholder="输入模板名称" maxlength="100" show-word-limit />
      </t-form-item>

      <t-form-item label="描述">
        <t-textarea
          v-model="description"
          :rows="2"
          placeholder="模板描述（可选）"
          maxlength="500"
          show-word-limit
        />
      </t-form-item>

      <t-form-item label="分类">
        <t-select v-model:value="category" style="width: 100%">
          <t-option label="表单" value="form" />
          <t-option label="报表" value="report" />
          <t-option label="布局" value="layout" />
          <t-option label="其他" value="other" />
        </t-select>
      </t-form-item>

      <t-form-item label="标签">
        <t-input v-model:value="tagsInput" placeholder="多个标签用逗号分隔" />
      </t-form-item>
    </t-form>

    <template #footer>
      <t-button @click="handleClose">取消</t-button>
      <t-button theme="primary" :loading="saving" @click="handleSave">保存</t-button>
    </template>
  </t-dialog>
</template>
