<script setup lang="ts">
/**
 * FgForm — 表单容器 Widget
 *
 * 职责：
 * - 包裹 el-form，提供表单布局和校验能力
 * - 渲染子组件（通过 slot 接收 SchemaNode 传入的 children）
 * - 收集子组件字段值、校验、提交/重置
 * - provide 表单上下文（formRef + formModel）给子组件
 */
import { inject, ref, reactive, provide, watch } from 'vue'
import { widgetDataKey, formContextKey } from '../base/types'
import type { Widget } from '../base/types'
import styles from './style.module.scss'

const widgetData = inject(widgetDataKey)!

const formRef = ref<InstanceType<typeof import('element-plus')['ElForm']>>()

// ---- 表单数据模型 ----

/** 表单数据模型：field → value，绑定到 el-form :model */
const formModel = reactive<Record<string, unknown>>({})

/** 递归收集所有后代 Widget 的字段值到 formModel */
function syncModel(widgets: Widget[]): void {
  for (const w of widgets) {
    if (w.field) {
      formModel[w.field] = w.defaultValue ?? null
    }
    if (w.children?.length) {
      syncModel(w.children)
    }
  }
}

/** 监听 children 变化，保持 formModel 与 widget 值同步 */
watch(
  () => widgetData.value.children,
  (children) => {
    if (children) syncModel(children)
  },
  { immediate: true, deep: true },
)

// ---- Provide 表单上下文 ----

provide(formContextKey, { formRef, formModel })

// ---- 表单操作（外部通过 ref 调用） ----
</script>

<template>
  <el-form
    ref="formRef"
    :model="formModel"
    :class="styles.formContainer"
    :label-width="(widgetData.props?.labelWidth as string) || '100px'"
    :label-position="(widgetData.props?.labelPosition as 'left' | 'right' | 'top') || 'right'"
  >
    <slot />
  </el-form>
</template>
