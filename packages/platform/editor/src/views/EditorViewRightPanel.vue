<script setup lang="ts">
/**
 * EditorViewRightPanel — 右侧属性面板子组件
 *
 * 从 EditorView.vue 拆分而来，负责渲染右侧属性面板区域。
 * 包含可见性切换的动画逻辑。
 */
import PropertyPanel from '@/components/Editor/PropertyPanel.vue'
import styles from './EditorView.module.scss'

defineProps<{
  visible: boolean
}>()
</script>

<template>
  <div :class="[styles.right, { [styles.rightClosed]: !visible }]">
    <PropertyPanel />
  </div>
</template>
