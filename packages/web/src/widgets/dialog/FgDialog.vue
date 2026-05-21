<script setup lang="ts">
/**
 * FgDialog — 弹窗容器 Widget
 *
 * 职责：
 * - 编辑模式：渲染容器 shell（header），子组件由 SchemaNode childrenLayer 渲染
 * - 预览模式：el-dialog 包裹，提供弹窗交互
 * - 支持确认/取消回调
 */
import { inject, ref } from 'vue'
import { widgetDataKey } from '../base/types'
import EnhancedDialog from '../../components/EnhancedDialog.vue'
import styles from './style.module.scss'

const widgetData = inject(widgetDataKey)!

defineProps<{
  editable?: boolean
}>()

const visible = ref(false)

function open() {
  visible.value = true
}

function handleConfirm() {
  visible.value = false
}

function handleCancel() {
  visible.value = false
}

defineExpose({ open })
</script>

<template>
  <!-- 编辑模式：容器 shell（header），子组件由 childrenLayer 渲染在容器原点 -->
  <div v-if="editable" :class="styles.dialogShell">
    <div :class="styles.dialogHeader">
      <span :class="styles.dialogTitle">{{ (widgetData.props?.title as string) || '弹窗标题' }}</span>
    </div>
  </div>

  <!-- 预览/运行时模式：EnhancedDialog（teleport 到 body） -->
  <EnhancedDialog
    v-else
    v-model="visible"
    :title="(widgetData.props?.title as string) || '弹窗标题'"
    :width="(widgetData.props?.width as string) || '600px'"
    :draggable="widgetData.props?.draggable !== false"
    :show-fullscreen-btn="widgetData.props?.showFullscreenBtn !== false"
    :destroy-on-close="widgetData.props?.destroyOnClose !== false"
    :close-on-click-modal="widgetData.props?.closeOnClickModal === true"
  >
    <slot />
    <template v-if="widgetData.props?.showFooter !== false" #footer>
      <div :class="styles.footer">
        <el-button @click="handleCancel">{{ (widgetData.props?.cancelText as string) || '取消' }}</el-button>
        <el-button type="primary" @click="handleConfirm">{{ (widgetData.props?.confirmText as string) || '确定' }}</el-button>
      </div>
    </template>
  </EnhancedDialog>
</template>
