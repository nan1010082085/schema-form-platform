<script setup lang="ts">
/**
 * ComponentDocPage — 单个组件文档页
 *
 * 每个组件对应一个独立路由 /docs/:componentId，
 * 展示该组件的示例、Schema 源码和 API 表格。
 *
 * 支持交互式弹窗联动：当 doc 示例设置 dialogMode: 'external' 时，
 * 弹窗由 ComponentDocPage 在页面顶层渲染，实现跨组件弹窗联动效果。
 */
import { computed, provide, ref, reactive } from 'vue'
import FormGrid from '@/components/FormGrid/index.vue'
import SchemaRender from '@/components/FormGrid/SchemaRender.vue'
import {
  FORM_GRID_CONTEXT_KEY,
  FORM_GRID_FORM_KEY,
  FORM_GRID_API_KEY,
  type FormGridContext,
  type FormSchemaItem,
  type FormData,
} from '@/components/FormGrid/types'
import { componentDocs } from '@/docs/components'

const props = defineProps<{ componentId: string }>()

// ---- 查找当前组件文档 ----
const doc = computed(() => componentDocs.find((d) => d.id === props.componentId))

// ---- Code 复制 ----
const expandedCode = ref<Record<string, boolean>>({})
const copiedKey = ref('')

function toggleCode(key: string) {
  expandedCode.value[key] = !expandedCode.value[key]
}

function formatJson(obj: unknown): string {
  return JSON.stringify(obj, null, 2)
}

async function copyCode(key: string, text: string) {
  try {
    await navigator.clipboard.writeText(text)
    copiedKey.value = key
    setTimeout(() => { copiedKey.value = '' }, 2000)
  } catch {
    // fallback
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    copiedKey.value = key
    setTimeout(() => { copiedKey.value = '' }, 2000)
  }
}

// ---- Preview-level dialog management ----
// 为独立渲染的 FgDialog 提供最低限度的 FormGrid 上下文
const previewContext: FormGridContext = {
  user: { id: '', name: '', deptId: '', deptName: '', roles: [] },
  request: { token: '', headers: {}, baseUrl: '' },
  global: { dictMap: {}, config: {} },
}
const dialogFormData = reactive<FormData>({})

provide(FORM_GRID_CONTEXT_KEY, previewContext)
provide(FORM_GRID_API_KEY, {
  validate: async () => true,
  validateField: async () => true,
  getFormData: () => ({}),
  resetFields: () => {},
})
provide(FORM_GRID_FORM_KEY, dialogFormData)

const previewDialogVisible = ref(false)
const previewDialogTitle = ref('')
const previewDialogWidth = ref('600px')
const previewDialogSchema = ref<FormSchemaItem[]>([])
const previewDialogInitialData = ref<FormData | undefined>(undefined)

/** Matches FormGrid's `open-dialog` emit payload type */
interface OpenDialogConfig {
  title: string
  width?: string
  schema?: FormSchemaItem[]
  initialData?: FormData
}

function handleOpenDialog(config: OpenDialogConfig) {
  previewDialogTitle.value = config.title
  previewDialogWidth.value = config.width ?? '600px'
  previewDialogSchema.value = config.schema ?? []
  previewDialogInitialData.value = config.initialData
  // Reset and populate dialog formData
  Object.keys(dialogFormData).forEach(k => delete dialogFormData[k])
  if (config.initialData) Object.assign(dialogFormData, config.initialData)
  previewDialogVisible.value = true
}

function handlePreviewDialogConfirm(data: FormData) {
  console.log('[ComponentDocPage] Dialog confirmed:', data)
  previewDialogVisible.value = false
}

function handlePreviewDialogCancel() {
  previewDialogVisible.value = false
}
</script>

<template>
  <div class="fg-comp-doc-page">
    <!-- 顶部导航 -->
    <header class="fg-comp-doc-header">
      <div class="fg-comp-doc-header__inner">
        <router-link to="/docs" class="fg-comp-doc-header__back">&larr; 组件列表</router-link>
        <h1 v-if="doc" class="fg-comp-doc-header__title">{{ doc.name }}</h1>
        <h1 v-else class="fg-comp-doc-header__title">组件文档</h1>
      </div>
    </header>

    <!-- 未找到组件 -->
    <div v-if="!doc" class="fg-comp-doc-not-found">
      <h2>组件未找到</h2>
      <p>组件 ID "<code>{{ componentId }}</code>" 不存在。</p>
      <router-link to="/docs">&larr; 返回组件列表</router-link>
    </div>

    <!-- 组件文档主体 -->
    <div v-else class="fg-comp-doc-body">
      <main class="fg-comp-doc-content">
        <section :id="doc.id" class="preview-section">
          <!-- 组件标题 + 描述 -->
          <div class="preview-section__header">
            <h2 class="preview-section__title">{{ doc.name }}</h2>
            <p class="preview-section__desc">{{ doc.description }}</p>
          </div>

          <!-- 示例区域 -->
          <div
            v-for="(example, ei) in doc.schemas"
            :key="ei"
            class="demo-block"
          >
            <h3
              v-if="doc.schemas.length > 1 || example.title !== '基础用法'"
              class="demo-block__title"
            >
              {{ example.title }}
            </h3>
            <p v-if="example.description" class="demo-block__desc">
              {{ example.description }}
            </p>

            <!-- 实时渲染区 -->
            <div class="demo-block__preview">
              <FormGrid
                :schema="example.schema"
                :dialog-mode="example.dialogMode ?? 'internal'"
                @open-dialog="handleOpenDialog"
              />
            </div>

            <!-- 操作栏 -->
            <div class="demo-block__actions">
              <button
                class="demo-block__action-btn"
                :title="copiedKey === `${doc.id}-${ei}` ? '已复制' : '复制 Schema'"
                @click="copyCode(`${doc.id}-${ei}`, formatJson(example.schema))"
              >
                <span v-if="copiedKey === `${doc.id}-${ei}`">&#10003;</span>
                <span v-else>&#10551;</span>
              </button>
              <button
                class="demo-block__action-btn"
                :title="expandedCode[`${doc.id}-${ei}`] ? '隐藏源码' : '查看源码'"
                @click="toggleCode(`${doc.id}-${ei}`)"
              >
                &lt;/&gt;
              </button>
            </div>

            <!-- 源码（可折叠） -->
            <Transition name="code-slide">
              <div
                v-if="expandedCode[`${doc.id}-${ei}`]"
                class="demo-block__source"
              >
                <pre><code>{{ formatJson(example.schema) }}</code></pre>
              </div>
            </Transition>
          </div>

          <!-- API 区域 -->
          <div class="api-section">
            <!-- Attributes -->
            <div v-if="doc.props.length" class="api-section__group">
              <h3 class="api-section__title">Attributes</h3>
              <table class="api-table">
                <thead>
                  <tr>
                    <th>属性</th>
                    <th>说明</th>
                    <th>类型</th>
                    <th>默认值</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="prop in doc.props" :key="prop.name">
                    <td><code>{{ prop.name }}</code></td>
                    <td>{{ prop.description }}</td>
                    <td><code>{{ prop.type }}</code></td>
                    <td><code>{{ prop.default }}</code></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Events -->
            <div v-if="doc.events.length" class="api-section__group">
              <h3 class="api-section__title">Events</h3>
              <table class="api-table">
                <thead>
                  <tr>
                    <th>事件名</th>
                    <th>说明</th>
                    <th>参数</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="evt in doc.events" :key="evt.name">
                    <td><code>{{ evt.name }}</code></td>
                    <td>{{ evt.description }}</td>
                    <td><code>{{ evt.params }}</code></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Slots -->
            <div v-if="doc.slots.length" class="api-section__group">
              <h3 class="api-section__title">Slots</h3>
              <table class="api-table">
                <thead>
                  <tr>
                    <th>插槽名</th>
                    <th>说明</th>
                    <th>作用域</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="slot in doc.slots" :key="slot.name">
                    <td><code>{{ slot.name }}</code></td>
                    <td>{{ slot.description }}</td>
                    <td><code>{{ slot.scope || '—' }}</code></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Exposes -->
            <div v-if="doc.exposes.length" class="api-section__group">
              <h3 class="api-section__title">Exposes</h3>
              <table class="api-table">
                <thead>
                  <tr>
                    <th>名称</th>
                    <th>说明</th>
                    <th>类型</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="ex in doc.exposes" :key="ex.name">
                    <td><code>{{ ex.name }}</code></td>
                    <td>{{ ex.description }}</td>
                    <td><code>{{ ex.type }}</code></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>

  <!-- Preview-level dialog: 渲染 external 模式下委托的弹窗，支持跨组件弹窗联动 -->
  <el-dialog
    v-model="previewDialogVisible"
    :title="previewDialogTitle"
    :width="previewDialogWidth"
    append-to-body
    @close="handlePreviewDialogCancel"
  >
    <el-form v-if="previewDialogSchema.length" :model="dialogFormData">
      <SchemaRender
        v-for="(item, dIdx) in previewDialogSchema"
        :key="dIdx"
        :schema="item"
        :form-data="dialogFormData"
        :path="[dIdx]"
      />
    </el-form>
    <template #footer>
      <el-button @click="handlePreviewDialogCancel">取消</el-button>
      <el-button type="primary" @click="handlePreviewDialogConfirm(dialogFormData)">确定</el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
// ---- 页面容器 ----
.fg-comp-doc-page {
  min-height: 100vh;
  background: #f5f7fa;
}

// ---- 头部导航 ----
.fg-comp-doc-header {
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  position: sticky;
  top: 0;
  z-index: 100;

  &__inner {
    max-width: 1000px;
    margin: 0 auto;
    padding: 16px 24px;
    position: relative;
  }

  &__back {
    font-size: 13px;
    color: var(--el-color-primary);
    text-decoration: none;
    display: inline-block;
    margin-bottom: 8px;
    &:hover { text-decoration: underline; }
  }

  &__title {
    font-size: 22px;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0;
  }
}

// ---- 未找到组件 ----
.fg-comp-doc-not-found {
  max-width: 600px;
  margin: 80px auto;
  text-align: center;
  background: #fff;
  border-radius: 10px;
  padding: 48px 32px;
  border: 1px solid #e8e8e8;

  h2 {
    font-size: 20px;
    font-weight: 700;
    color: #333;
    margin: 0 0 12px;
  }

  p {
    font-size: 14px;
    color: #666;
    margin: 0 0 24px;

    code {
      font-family: 'SF Mono', 'Menlo', 'Monaco', monospace;
      font-size: 13px;
      color: #c7254e;
      background: #f9f2f4;
      padding: 2px 6px;
      border-radius: 4px;
    }
  }

  a {
    color: var(--el-color-primary);
    text-decoration: none;
    font-size: 14px;
    &:hover { text-decoration: underline; }
  }
}

// ---- 主体区域 ----
.fg-comp-doc-body {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px;
}

.fg-comp-doc-content {
  min-width: 0;
}

// ---- 组件文档块 (复用原 PreviewView 样式) ----
.preview-section {
  background: #fff;
  border-radius: 10px;
  padding: 28px 32px;
  border: 1px solid #e8e8e8;

  &__header {
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f0f0f0;
  }

  &__title {
    font-size: 22px;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0;
  }

  &__desc {
    font-size: 14px;
    color: #666;
    margin: 8px 0 0;
    line-height: 1.6;
  }
}

// ---- 示例块 (参照 Element Plus) ----
.demo-block {
  margin-bottom: 28px;

  &:last-of-type { margin-bottom: 0; }

  &__title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin: 0 0 8px;
  }

  &__desc {
    font-size: 13px;
    color: #888;
    margin: 0 0 12px;
  }

  &__preview {
    border: 1px solid #e8e8e8;
    border-radius: 8px 8px 0 0;
    padding: 24px;
    background: #fff;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 8px 12px;
    background: #fafbfc;
    border: 1px solid #e8e8e8;
    border-top: none;
    border-radius: 0 0 8px 8px;
  }

  &__action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 28px;
    border: none;
    background: transparent;
    color: #666;
    font-size: 13px;
    font-family: 'SF Mono', 'Menlo', monospace;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.15s;

    &:hover {
      color: var(--el-color-primary);
      background: rgba(0, 96, 162, 0.08);
    }
  }

  &__source {
    margin-top: -1px;
    background: #1e1e1e;
    border-radius: 0 0 8px 8px;
    padding: 16px 20px;
    overflow-x: auto;

    pre { margin: 0; }

    code {
      font-family: 'SF Mono', 'Menlo', 'Monaco', monospace;
      font-size: 13px;
      line-height: 1.6;
      color: #d4d4d4;
      white-space: pre;
    }
  }
}

// ---- API 区域 ----
.api-section {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;

  &__group {
    margin-bottom: 24px;
    &:last-child { margin-bottom: 0; }
  }

  &__title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin: 0 0 12px;
  }
}

// ---- API 表格 ----
.api-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;

  th, td {
    padding: 10px 14px;
    text-align: left;
    border-bottom: 1px solid #f0f0f0;
  }

  th {
    font-weight: 600;
    color: #333;
    background: #fafbfc;
    border-bottom: 2px solid #e8e8e8;
  }

  td { color: #666; }

  code {
    font-family: 'SF Mono', 'Menlo', 'Monaco', monospace;
    font-size: 13px;
    color: #c7254e;
    background: #f9f2f4;
    padding: 2px 6px;
    border-radius: 4px;
  }
}

// ---- 过渡动画 ----
.code-slide-enter-active,
.code-slide-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.code-slide-enter-from,
.code-slide-leave-to {
  opacity: 0;
  max-height: 0;
}

.code-slide-enter-to,
.code-slide-leave-from {
  opacity: 1;
  max-height: 2000px;
}
</style>
