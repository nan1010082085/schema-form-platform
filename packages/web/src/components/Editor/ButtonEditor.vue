<script setup lang="ts">
/**
 * ButtonEditor -- Structured CRUD editor for SchemaButtonConfig[].
 *
 * Sprint 18: Replaces JSON textarea with per-action structured form.
 * Each action type shows conditional fields for its specific properties.
 */
import { Plus, Delete, Top, Bottom } from '@element-plus/icons-vue'
import type { SchemaButtonConfig, SchemaAction, ActionType } from '@/components/FormGrid/types'

const props = defineProps<{
  buttons: SchemaButtonConfig[]
}>()

const emit = defineEmits<{
  'update:buttons': [buttons: SchemaButtonConfig[]]
}>()

const buttonTypeOptions = [
  { label: '默认', value: '' as const },
  { label: '主要', value: 'primary' as const },
  { label: '成功', value: 'success' as const },
  { label: '警告', value: 'warning' as const },
  { label: '危险', value: 'danger' as const },
  { label: '信息', value: 'info' as const },
]

const actionTypeOptions: { label: string; value: ActionType }[] = [
  { label: '触发事件', value: 'emit' },
  { label: '弹窗', value: 'dialog' },
  { label: '接口请求', value: 'api' },
  { label: '页面跳转', value: 'navigate' },
  { label: '提交表单', value: 'submit' },
  { label: '重置表单', value: 'reset' },
  { label: '上传', value: 'upload' },
  { label: '校验', value: 'validate' },
]

const apiMethodOptions = [
  { label: 'GET', value: 'get' as const },
  { label: 'POST', value: 'post' as const },
]

// ---- Button CRUD ----

function addButton() {
  emit('update:buttons', [...props.buttons, { text: '', buttonType: '' as SchemaButtonConfig['buttonType'] }])
}

function removeButton(index: number) {
  emit('update:buttons', props.buttons.filter((_, i) => i !== index))
}

function moveUp(index: number) {
  if (index === 0) return
  const updated = [...props.buttons]
  ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
  emit('update:buttons', updated)
}

function moveDown(index: number) {
  if (index >= props.buttons.length - 1) return
  const updated = [...props.buttons]
  ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
  emit('update:buttons', updated)
}

function updateButton<K extends keyof SchemaButtonConfig>(index: number, field: K, value: SchemaButtonConfig[K]) {
  const updated = props.buttons.map((b, i) => i === index ? { ...b, [field]: value } : b)
  emit('update:buttons', updated)
}

// ---- Action CRUD within a button ----

function addAction(btnIdx: number) {
  const btn = props.buttons[btnIdx]
  const action: SchemaAction = { type: 'emit' as ActionType }
  const actions = [...(btn.actions ?? []), action]
  updateButton(btnIdx, 'actions', actions)
}

function removeAction(btnIdx: number, actionIdx: number) {
  const btn = props.buttons[btnIdx]
  const actions = (btn.actions ?? []).filter((_, i) => i !== actionIdx)
  updateButton(btnIdx, 'actions', actions.length ? actions : undefined)
}

function updateAction(btnIdx: number, actionIdx: number, patch: Partial<SchemaAction>) {
  const btn = props.buttons[btnIdx]
  const actions = (btn.actions ?? []).map((a, i) => i === actionIdx ? { ...a, ...patch } : a)
  updateButton(btnIdx, 'actions', actions)
}

function moveActionUp(btnIdx: number, actionIdx: number) {
  if (actionIdx === 0) return
  const btn = props.buttons[btnIdx]
  const actions = [...(btn.actions ?? [])]
  ;[actions[actionIdx - 1], actions[actionIdx]] = [actions[actionIdx], actions[actionIdx - 1]]
  updateButton(btnIdx, 'actions', actions)
}

function moveActionDown(btnIdx: number, actionIdx: number) {
  const btn = props.buttons[btnIdx]
  const actions = btn.actions ?? []
  if (actionIdx >= actions.length - 1) return
  const updated = [...actions]
  ;[updated[actionIdx], updated[actionIdx + 1]] = [updated[actionIdx + 1], updated[actionIdx]]
  updateButton(btnIdx, 'actions', updated)
}

// ---- JSON helpers for nested fields ----

function parseJson(text: string): unknown | undefined {
  if (!text.trim()) return undefined
  try { return JSON.parse(text) } catch { return undefined }
}

function jsonText(val: unknown): string {
  if (!val) return ''
  return JSON.stringify(val, null, 2)
}

// State cache for textarea buffers
const eventPayloadCache: Record<string, string> = {}
const dialogSchemaCache: Record<string, string> = {}
const apiParamsCache: Record<string, string> = {}
const navigateQueryCache: Record<string, string> = {}
function cacheKey(btnIdx: number, actionIdx: number, field: string) { return `${btnIdx}:${actionIdx}:${field}` }
</script>

<template>
  <div class="button-editor">
    <div v-if="buttons.length === 0" class="button-editor__empty">未配置按钮。</div>

    <div v-for="(btn, btnIdx) in buttons" :key="btnIdx" class="button-editor__item">
      <div class="button-editor__item-header">
        <span class="button-editor__item-title">按钮 {{ btnIdx + 1 }}</span>
        <div class="button-editor__item-actions">
          <el-button :icon="Top" size="small" text :disabled="btnIdx === 0" @click="moveUp(btnIdx)" />
          <el-button :icon="Bottom" size="small" text :disabled="btnIdx === buttons.length - 1" @click="moveDown(btnIdx)" />
          <el-button type="danger" :icon="Delete" size="small" text @click="removeButton(btnIdx)" />
        </div>
      </div>

      <div class="button-editor__field">
        <label class="button-editor__label">文本</label>
        <el-input :model-value="btn.text" size="small" placeholder="按钮文字" @update:model-value="updateButton(btnIdx, 'text', $event)" />
      </div>

      <div class="button-editor__field">
        <label class="button-editor__label">按钮类型</label>
        <el-select :model-value="btn.buttonType ?? ''" size="small" style="width: 100%" @update:model-value="updateButton(btnIdx, 'buttonType', $event)">
          <el-option v-for="opt in buttonTypeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
      </div>

      <!-- Actions list -->
      <div class="button-editor__actions-section">
        <div class="button-editor__actions-header">
          <span class="button-editor__label">操作</span>
          <el-button size="small" :icon="Plus" text @click="addAction(btnIdx)">添加</el-button>
        </div>

        <div v-if="!btn.actions?.length" class="button-editor__help" style="margin-bottom:4px">无操作。点击"添加"创建一个。</div>

        <div v-for="(action, aIdx) in (btn.actions ?? [])" :key="aIdx" class="button-editor__action-item">
          <div class="button-editor__action-header">
            <span class="button-editor__action-title">操作 {{ aIdx + 1 }}</span>
            <div style="display:flex;gap:2px">
              <el-button :disabled="aIdx === 0" size="small" text @click="moveActionUp(btnIdx, aIdx)">
                <el-icon><Top /></el-icon>
              </el-button>
              <el-button :disabled="aIdx === (btn.actions?.length ?? 1) - 1" size="small" text @click="moveActionDown(btnIdx, aIdx)">
                <el-icon><Bottom /></el-icon>
              </el-button>
              <el-button type="danger" size="small" text @click="removeAction(btnIdx, aIdx)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>

          <!-- Type -->
          <div class="button-editor__field">
            <label class="button-editor__label">类型</label>
            <el-select :model-value="action.type" size="small" style="width:100%" @update:model-value="updateAction(btnIdx, aIdx, { type: $event as ActionType })">
              <el-option v-for="opt in actionTypeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </div>

          <!-- Common: Label -->
          <div class="button-editor__field">
            <label class="button-editor__label">标签</label>
            <el-input :model-value="action.label ?? ''" size="small" placeholder="操作标签" @update:model-value="updateAction(btnIdx, aIdx, { label: $event || undefined })" />
          </div>

          <!-- Common: Confirm -->
          <div class="button-editor__field">
            <label class="button-editor__label">确认提示</label>
            <el-input :model-value="action.confirm ?? ''" size="small" placeholder="执行前的确认提示" @update:model-value="updateAction(btnIdx, aIdx, { confirm: $event || undefined })" />
          </div>

          <!-- emit: eventName + eventPayload -->
          <template v-if="action.type === 'emit'">
            <div class="button-editor__field">
              <label class="button-editor__label">事件名称</label>
              <el-input :model-value="action.eventName ?? ''" size="small" placeholder="例如: save" @update:model-value="updateAction(btnIdx, aIdx, { eventName: $event || undefined })" />
            </div>
            <div class="button-editor__field">
              <label class="button-editor__label">事件参数 (JSON)</label>
              <el-input
                :model-value="eventPayloadCache[cacheKey(btnIdx, aIdx, 'payload')] ?? jsonText(action.eventPayload)"
                type="textarea" :rows="2" size="small" placeholder='{"key":"value"}'
                @update:model-value="(v: string) => { eventPayloadCache[cacheKey(btnIdx, aIdx, 'payload')] = v; updateAction(btnIdx, aIdx, { eventPayload: parseJson(v) as SchemaAction['eventPayload'] }) }"
              />
            </div>
          </template>

          <!-- dialog: dialogTitle + dialogWidth + dialogSchema -->
          <template v-if="action.type === 'dialog'">
            <div class="button-editor__field">
              <label class="button-editor__label">弹窗标题</label>
              <el-input :model-value="action.dialogTitle ?? ''" size="small" placeholder="弹窗标题" @update:model-value="updateAction(btnIdx, aIdx, { dialogTitle: $event || undefined })" />
            </div>
            <div class="button-editor__field">
              <label class="button-editor__label">弹窗宽度</label>
              <el-input :model-value="action.dialogWidth ?? ''" size="small" placeholder="600px" @update:model-value="updateAction(btnIdx, aIdx, { dialogWidth: $event || undefined })" />
            </div>
            <div class="button-editor__field">
              <label class="button-editor__label">弹窗 Schema (JSON)</label>
              <el-input
                :model-value="dialogSchemaCache[cacheKey(btnIdx, aIdx, 'schema')] ?? jsonText(action.dialogSchema)"
                type="textarea" :rows="4" size="small" placeholder='[{"type":"input","field":"name","label":"Name"}]'
                @update:model-value="(v: string) => { dialogSchemaCache[cacheKey(btnIdx, aIdx, 'schema')] = v; updateAction(btnIdx, aIdx, { dialogSchema: parseJson(v) as SchemaAction['dialogSchema'] }) }"
              />
            </div>
          </template>

          <!-- api: apiUrl + apiMethod + apiParams -->
          <template v-if="action.type === 'api'">
            <div class="button-editor__field">
              <label class="button-editor__label">接口地址</label>
              <el-input :model-value="action.apiUrl ?? ''" size="small" placeholder="/api/endpoint" @update:model-value="updateAction(btnIdx, aIdx, { apiUrl: $event || undefined })" />
            </div>
            <div class="button-editor__field">
              <label class="button-editor__label">请求方法</label>
              <el-select :model-value="action.apiMethod ?? 'post'" size="small" style="width:100%" @update:model-value="updateAction(btnIdx, aIdx, { apiMethod: $event as 'get' | 'post' })">
                <el-option v-for="opt in apiMethodOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </div>
            <div class="button-editor__field">
              <label class="button-editor__label">接口参数 (JSON 或 "formData")</label>
              <el-input
                :model-value="apiParamsCache[cacheKey(btnIdx, aIdx, 'params')] ?? (typeof action.apiParams === 'string' ? action.apiParams : jsonText(action.apiParams))"
                type="textarea" :rows="2" size="small" placeholder='{"key":"value"} 或 "formData"'
                @update:model-value="(v: string) => { apiParamsCache[cacheKey(btnIdx, aIdx, 'params')] = v; updateAction(btnIdx, aIdx, { apiParams: v === 'formData' ? 'formData' : (parseJson(v) as Record<string, unknown> | undefined) }) }"
              />
            </div>
          </template>

          <!-- navigate: navigatePath + navigateQuery -->
          <template v-if="action.type === 'navigate'">
            <div class="button-editor__field">
              <label class="button-editor__label">跳转路径</label>
              <el-input :model-value="action.navigatePath ?? ''" size="small" placeholder="/detail/:id" @update:model-value="updateAction(btnIdx, aIdx, { navigatePath: $event || undefined })" />
            </div>
            <div class="button-editor__field">
              <label class="button-editor__label">跳转参数 (JSON)</label>
              <el-input
                :model-value="navigateQueryCache[cacheKey(btnIdx, aIdx, 'query')] ?? jsonText(action.navigateQuery)"
                type="textarea" :rows="2" size="small" placeholder='{"from":"list"}'
                @update:model-value="(v: string) => { navigateQueryCache[cacheKey(btnIdx, aIdx, 'query')] = v; updateAction(btnIdx, aIdx, { navigateQuery: parseJson(v) as Record<string, string> | undefined }) }"
              />
            </div>
          </template>

          <!-- submit/reset/upload/validate: no extra fields beyond label+confirm -->
        </div>
      </div>
    </div>

    <el-button type="primary" :icon="Plus" size="small" plain style="width:100%;margin-top:8px" @click="addButton">
      添加按钮
    </el-button>
  </div>
</template>

<style scoped lang="scss">
.button-editor {
  &__empty { text-align: center; color: #909399; font-size: 12px; padding: 12px 0; }
  &__item { border: 1px solid #ebeef5; border-radius: 4px; padding: 10px; margin-bottom: 10px; background: #fafafa; }
  &__item-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  &__item-title { font-size: 12px; font-weight: 600; color: #303133; }
  &__item-actions { display: flex; align-items: center; gap: 2px; }
  &__field { margin-bottom: 8px; &:last-child { margin-bottom: 0; } }
  &__label { display: block; font-size: 11px; font-weight: 500; color: #606266; margin-bottom: 3px; }
  &__help { display: block; font-size: 10px; color: #909399; margin-top: 2px; line-height: 1.3; }

  &__actions-section { margin-top: 8px; padding: 8px; border: 1px dashed #dcdfe6; border-radius: 4px; background: #fff; }
  &__actions-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }

  &__action-item { padding: 8px; margin-bottom: 6px; border: 1px solid #ebeef5; border-radius: 3px; background: #f5f7fa; }
  &__action-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
  &__action-title { font-size: 11px; font-weight: 600; color: #606266; }
}
</style>
