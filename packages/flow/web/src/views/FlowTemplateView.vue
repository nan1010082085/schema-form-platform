<script setup lang="ts">
import { onMounted, ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import { SearchIcon, FolderIcon, AppIcon, BrowseIcon } from 'tdesign-icons-vue-next'
import { useFlowTemplateStore } from '../stores/flowTemplate.js'
import styles from './FlowTemplateView.module.scss'

const router = useRouter()
const store = useFlowTemplateStore()

const searchQuery = ref('')
const categoryFilter = ref('')
const applyDialogVisible = ref(false)
const applyForm = reactive({ name: '', description: '' })
const applyingTemplateId = ref<string | null>(null)
const previewDialogVisible = ref(false)
const previewTemplateId = ref<string | null>(null)

const categories = computed(() => {
  const set = new Set(store.templates.map((t) => t.category).filter(Boolean))
  return Array.from(set)
})

onMounted(async () => {
  await store.seedBuiltinTemplates()
  await store.fetchTemplates()
})

async function handleSearch() {
  await store.fetchTemplates({
    search: searchQuery.value || undefined,
    category: categoryFilter.value || undefined,
  })
}

function handleResetFilters() {
  searchQuery.value = ''
  categoryFilter.value = ''
  handleSearch()
}

function handleApply(templateId: string, templateName: string) {
  applyingTemplateId.value = templateId
  applyForm.name = templateName
  applyForm.description = ''
  applyDialogVisible.value = true
}

async function handleApplyConfirm() {
  if (!applyingTemplateId.value) return
  if (!applyForm.name.trim()) {
    MessagePlugin.warning('请输入流程名称')
    return
  }
  try {
    const definition = await store.applyTemplate(applyingTemplateId.value, {
      name: applyForm.name.trim(),
      description: applyForm.description.trim(),
    })
    applyDialogVisible.value = false
    MessagePlugin.success('已从模板创建流程')
    router.push({ name: 'flow-designer', query: { id: definition.id } })
  } catch {
    MessagePlugin.error('创建失败')
  }
}

function handlePreview(templateId: string) {
  previewTemplateId.value = templateId
  previewDialogVisible.value = true
}

async function handleDelete(id: string, name: string) {
  const confirmed = await new Promise<boolean>((resolve) => {
    const dialog = DialogPlugin.confirm({
      header: '确认删除',
      body: `确定删除模板「${name}」？`,
      confirmBtn: '删除',
      cancelBtn: '取消',
      theme: 'warning',
      onConfirm: () => { dialog.destroy(); resolve(true) },
      onCancel: () => { dialog.destroy(); resolve(false) },
    })
  })
  if (!confirmed) return
  try {
    await store.deleteTemplate(id)
    MessagePlugin.success('删除成功')
  } catch {
    MessagePlugin.error('删除失败')
  }
}

function formatDate(dateStr: string | Date) {
  return new Date(dateStr).toLocaleString('zh-CN')
}
</script>

<template>
  <div :class="styles.templateView">
    <div :class="styles.header">
      <h2>流程模板库</h2>
    </div>

    <div :class="styles.toolbar">
      <t-input
        v-model="searchQuery"
        placeholder="搜索模板名称..."
        clearable
        :prefix-icon="SearchIcon"
        :class="styles.searchInput"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
      <t-select
        v-model="categoryFilter"
        placeholder="按分类筛选"
        clearable
        :class="styles.categorySelect"
        @change="handleSearch"
      >
        <t-option
          v-for="cat in categories"
          :key="cat"
          :label="cat"
          :value="cat"
        />
      </t-select>
      <t-button @click="handleResetFilters">重置</t-button>
    </div>

    <div v-loading="store.loading" :class="styles.grid">
      <div
        v-for="tpl in store.templates"
        :key="tpl.id"
        :class="styles.card"
      >
        <div :class="styles.cardThumbnail">
          <div v-if="tpl.thumbnail" :class="styles.thumbnailImg">
            <img :src="tpl.thumbnail" :alt="tpl.name" />
          </div>
          <div v-else :class="styles.thumbnailPlaceholder">
            <AppIcon :size="32" />
            <span>流程预览</span>
          </div>
        </div>

        <div :class="styles.cardHeader">
          <div :class="styles.cardMeta">
            <h3 :class="styles.cardTitle">{{ tpl.name }}</h3>
            <div :class="styles.cardCategory">
              <FolderIcon :size="12" />
              <span>{{ tpl.category || '未分类' }}</span>
            </div>
          </div>
          <t-tag v-if="tpl.isBuiltin" size="small" theme="success">内置</t-tag>
        </div>

        <p :class="styles.cardDesc">{{ tpl.description || '暂无描述' }}</p>

        <div v-if="tpl.tags && tpl.tags.length > 0" :class="styles.cardTags">
          <t-tag
            v-for="tag in tpl.tags"
            :key="tag"
            size="small"
            theme="default"
            variant="light"
          >
            {{ tag }}
          </t-tag>
        </div>

        <div :class="styles.cardFooter">
          <div :class="styles.cardStats">
            <span :class="styles.cardDate">{{ formatDate(tpl.createdAt) }}</span>
            <span :class="styles.cardUseCount">
              <BrowseIcon :size="12" />
              {{ tpl.useCount ?? 0 }} 次使用
            </span>
          </div>
          <div :class="styles.cardActions">
            <t-button size="small" @click="handlePreview(tpl.id)">
              预览
            </t-button>
            <t-button size="small" theme="primary" @click="handleApply(tpl.id, tpl.name)">
              使用模板
            </t-button>
            <t-button
              v-if="!tpl.isBuiltin"
              size="small"
              theme="danger"
              @click="handleDelete(tpl.id, tpl.name)"
            >
              删除
            </t-button>
          </div>
        </div>
      </div>

      <div v-if="!store.loading && store.templates.length === 0" :class="styles.empty">
        <t-empty description="暂无模板" />
      </div>
    </div>

    <!-- Apply template dialog -->
    <t-dialog
      v-model:visible="applyDialogVisible"
      header="从模板创建流程"
      width="480px"
      :close-on-overlay-click="false"
      destroy-on-close
    >
      <t-form :data="applyForm" label-width="80px">
        <t-form-item label="流程名称" required>
          <t-input v-model="applyForm.name" placeholder="输入流程名称" maxlength="200" />
        </t-form-item>
        <t-form-item label="描述">
          <t-textarea
            v-model="applyForm.description"
            :rows="3"
            placeholder="流程描述（可选）"
          />
        </t-form-item>
      </t-form>
      <template #footer>
        <t-button @click="applyDialogVisible = false">取消</t-button>
        <t-button theme="primary" @click="handleApplyConfirm">创建并编辑</t-button>
      </template>
    </t-dialog>

    <!-- Preview template dialog -->
    <t-dialog
      v-model:visible="previewDialogVisible"
      header="模板预览"
      width="720px"
      destroy-on-close
    >
      <div :class="styles.previewContainer">
        <t-empty description="流程图预览功能开发中" />
      </div>
      <template #footer>
        <t-button @click="previewDialogVisible = false">关闭</t-button>
      </template>
    </t-dialog>
  </div>
</template>
