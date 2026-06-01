<template>
  <div :class="[styles.toolbar, { [styles.previewBar]: isPreview }]">
    <!-- Left: back + title -->
    <div :class="styles.left">
      <button :class="styles.iconBtn" title="返回" @click="$emit('back')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <div :class="styles.divider" />
      <span :class="styles.title">{{ title || '流程设计器' }}</span>
    </div>

    <!-- Center: panel toggles + undo/redo + export/import (hidden in preview) -->
    <div v-if="!isPreview" :class="styles.center">
      <el-tooltip :content="showLeftPanel ? '隐藏节点面板' : '显示节点面板'" placement="bottom">
        <button
          :class="[styles.iconBtn, { [styles.iconBtnActive]: showLeftPanel }]"
          title="节点面板"
          @click="$emit('toggle-left-panel')"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="2" width="14" height="12" rx="1" />
            <line x1="5" y1="2" x2="5" y2="14" />
          </svg>
        </button>
      </el-tooltip>
      <div :class="styles.btnGroup">
        <el-tooltip content="撤销" placement="bottom">
          <button :class="styles.iconBtn" title="撤销" @click="$emit('undo')">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 3 2 7 6 11" />
              <path d="M2 7h8a4 4 0 0 1 0 8H7" />
            </svg>
          </button>
        </el-tooltip>
        <el-tooltip content="重做" placement="bottom">
          <button :class="styles.iconBtn" title="重做" @click="$emit('redo')">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="10 3 14 7 10 11" />
              <path d="M14 7H6a4 4 0 0 0 0 8h3" />
            </svg>
          </button>
        </el-tooltip>
      </div>
      <el-tooltip :content="showRightPanel ? '隐藏属性面板' : '显示属性面板'" placement="bottom">
        <button
          :class="[styles.iconBtn, { [styles.iconBtnActive]: showRightPanel }]"
          title="属性面板"
          @click="$emit('toggle-right-panel')"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="2" width="14" height="12" rx="1" />
            <line x1="11" y1="2" x2="11" y2="14" />
          </svg>
        </button>
      </el-tooltip>
      <div :class="styles.btnGroup">
        <el-tooltip content="导出 BPMN" placement="bottom">
          <button :class="styles.iconBtn" title="导出 BPMN" @click="$emit('export-bpmn')">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 10v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3" />
              <polyline points="4.5 6.5 8 10 11.5 6.5" />
              <line x1="8" y1="2" x2="8" y2="10" />
            </svg>
          </button>
        </el-tooltip>
        <el-tooltip content="导入 BPMN" placement="bottom">
          <button :class="styles.iconBtn" title="导入 BPMN" @click="$emit('import-bpmn')">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 10v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3" />
              <polyline points="4.5 9.5 8 6 11.5 9.5" />
              <line x1="8" y1="14" x2="8" y2="6" />
            </svg>
          </button>
        </el-tooltip>
      </div>
      <div :class="styles.divider" />
      <el-tooltip content="AI 助手" placement="bottom">
        <button
          :class="[styles.iconBtn, styles.aiBtn, { [styles.iconBtnActive]: showAiDrawer }]"
          title="AI 助手"
          @click="$emit('toggle-ai')"
        >
          <span :class="styles.aiLabel">AI</span>
        </button>
      </el-tooltip>
      <el-tooltip content="预览" placement="bottom">
        <button :class="styles.iconBtn" title="预览" @click="$emit('toggle-preview')">
          <el-icon :size="14"><View /></el-icon>
        </button>
      </el-tooltip>
    </div>

    <!-- Center: preview label -->
    <div v-else :class="styles.center">
      <span :class="styles.previewLabel">预览模式</span>
    </div>

    <!-- Right -->
    <div :class="styles.right">
      <template v-if="!isPreview">
        <el-tooltip content="版本历史" placement="bottom">
          <button :class="styles.iconBtn" title="版本历史" @click="$emit('version-history')">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="8" cy="8" r="6.5" />
              <polyline points="8 4.5 8 8 11 10" />
            </svg>
          </button>
        </el-tooltip>
        <el-tooltip content="校验流程" placement="bottom">
          <button :class="[styles.iconBtn, styles.iconBtnOutline]" title="校验" @click="$emit('validate')">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="4 8 7 11 12 5" />
              <circle cx="8" cy="8" r="6.5" />
            </svg>
          </button>
        </el-tooltip>
        <button :class="[styles.btn, styles.btnOutline]" title="设置" @click="$emit('settings')">设置</button>
        <button :class="[styles.btn, styles.btnOutline]" title="保存" @click="$emit('save')">保存</button>
        <button :class="[styles.btn, styles.btnPrimary]" title="发布" :disabled="saving" @click="$emit('publish')">{{ saving ? '发布中...' : '发布' }}</button>
      </template>
      <template v-else>
        <!-- Preview mode: exit button -->
        <el-tooltip content="退出预览" placement="bottom">
          <button :class="[styles.btn, styles.btnOutline]" title="退出预览" @click="$emit('toggle-preview')">
            <el-icon :size="14"><EditPen /></el-icon>
            <span>退出预览</span>
          </button>
        </el-tooltip>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { View, EditPen } from '@element-plus/icons-vue'
import styles from './FlowToolbar.module.scss'

defineProps<{
  title?: string
  isPreview?: boolean
  showLeftPanel?: boolean
  showRightPanel?: boolean
  showAiDrawer?: boolean
  saving?: boolean
}>()

defineEmits<{
  back: []
  save: []
  undo: []
  redo: []
  validate: []
  publish: []
  'export-bpmn': []
  'import-bpmn': []
  settings: []
  'version-history': []
  'toggle-preview': []
  'toggle-left-panel': []
  'toggle-right-panel': []
  'toggle-ai': []
}>()
</script>
