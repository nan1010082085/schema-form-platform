<template>
  <div :class="[styles.toolbar, { [styles.previewBar]: isPreview }]">
    <!-- Left: portal + app name + title -->
    <div :class="styles.left">
      <el-tooltip content="返回门户首页" placement="bottom">
        <button :class="styles.iconBtn" title="返回门户" @click="goToPortal">
          <el-icon :size="14"><HomeFilled /></el-icon>
        </button>
      </el-tooltip>
      <div :class="styles.divider" />
      <span :class="styles.appName">流程设计器</span>
      <div :class="styles.divider" />
      <span :class="styles.title">{{ title || '未命名流程' }}</span>
      <div :class="styles.divider" />
      <el-segmented
        :model-value="flowMode ?? 'bpmn'"
        :options="[
          { label: 'BPMN', value: 'bpmn' },
          { label: 'Workflow', value: 'workflow' },
        ]"
        size="small"
        @update:model-value="$emit('toggle-flow-mode')"
      />
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
        <el-tooltip content="撤销 (Ctrl+Z)" placement="bottom">
          <button :class="styles.iconBtn" title="撤销 (Ctrl+Z)" @click="$emit('undo')">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 3 2 7 6 11" />
              <path d="M2 7h8a4 4 0 0 1 0 8H7" />
            </svg>
          </button>
        </el-tooltip>
        <el-tooltip content="重做 (Ctrl+Y)" placement="bottom">
          <button :class="styles.iconBtn" title="重做 (Ctrl+Y)" @click="$emit('redo')">
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
      <el-popover
        v-model:visible="layoutPopoverVisible"
        placement="bottom"
        :width="240"
        trigger="click"
      >
        <template #reference>
          <el-tooltip content="自动布局" placement="bottom" :disabled="layoutPopoverVisible">
            <button :class="styles.iconBtn" title="自动布局" @click="layoutPopoverVisible = !layoutPopoverVisible">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="1" y="1" width="5" height="5" rx="1" />
                <rect x="10" y="1" width="5" height="5" rx="1" />
                <rect x="5.5" y="10" width="5" height="5" rx="1" />
                <line x1="3.5" y1="6" x2="3.5" y2="10" stroke-dasharray="2 1" />
                <line x1="12.5" y1="6" x2="12.5" y2="10" stroke-dasharray="2 1" />
                <line x1="3.5" y1="10" x2="5.5" y2="10" stroke-dasharray="2 1" />
                <line x1="12.5" y1="10" x2="10.5" y2="10" stroke-dasharray="2 1" />
              </svg>
            </button>
          </el-tooltip>
        </template>
        <div :class="styles.layoutPopover">
          <div :class="styles.layoutRow">
            <span :class="styles.layoutLabel">方向</span>
            <el-segmented
              :model-value="layoutDirection ?? 'TB'"
              :options="[
                { label: '垂直', value: 'TB' },
                { label: '水平', value: 'LR' },
              ]"
              size="small"
              @update:model-value="$emit('update:layoutDirection', $event as LayoutDirection)"
            />
          </div>
          <div :class="styles.layoutRow">
            <span :class="styles.layoutLabel">节点间距</span>
            <el-slider
              :model-value="layoutNodeSep ?? 60"
              :min="20"
              :max="200"
              :step="10"
              :show-tooltip="false"
              size="small"
              @update:model-value="$emit('update:layoutNodeSep', $event as number)"
            />
          </div>
          <div :class="styles.layoutRow">
            <span :class="styles.layoutLabel">层级间距</span>
            <el-slider
              :model-value="layoutRankSep ?? 80"
              :min="30"
              :max="300"
              :step="10"
              :show-tooltip="false"
              size="small"
              @update:model-value="$emit('update:layoutRankSep', $event as number)"
            />
          </div>
          <el-button
            type="primary"
            size="small"
            :class="styles.layoutApplyBtn"
            @click="$emit('auto-layout'); layoutPopoverVisible = false"
          >
            应用布局
          </el-button>
        </div>
      </el-popover>
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
      <!-- 快捷键帮助 -->
      <el-popover placement="bottom" :width="300" trigger="click">
        <template #reference>
          <button :class="styles.iconBtn" title="快捷键帮助">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="8" cy="8" r="6.5" />
              <path d="M5.5 6.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5" />
              <circle cx="8" cy="12" r="0.5" fill="currentColor" />
            </svg>
          </button>
        </template>
        <div :class="styles.shortcuts">
          <div :class="styles.shortcutsTitle">快捷键</div>
          <div :class="styles.shortcutRow">
            <span :class="styles.shortcutLabel">撤销</span>
            <span :class="styles.shortcutKeys"><kbd>Ctrl</kbd> + <kbd>Z</kbd></span>
          </div>
          <div :class="styles.shortcutRow">
            <span :class="styles.shortcutLabel">重做</span>
            <span :class="styles.shortcutKeys"><kbd>Ctrl</kbd> + <kbd>Y</kbd></span>
          </div>
          <div :class="styles.shortcutRow">
            <span :class="styles.shortcutLabel">复制节点</span>
            <span :class="styles.shortcutKeys"><kbd>Ctrl</kbd> + <kbd>C</kbd></span>
          </div>
          <div :class="styles.shortcutRow">
            <span :class="styles.shortcutLabel">粘贴节点</span>
            <span :class="styles.shortcutKeys"><kbd>Ctrl</kbd> + <kbd>V</kbd></span>
          </div>
          <div :class="styles.shortcutRow">
            <span :class="styles.shortcutLabel">复制并粘贴</span>
            <span :class="styles.shortcutKeys"><kbd>Ctrl</kbd> + <kbd>D</kbd></span>
          </div>
          <div :class="styles.shortcutRow">
            <span :class="styles.shortcutLabel">删除</span>
            <span :class="styles.shortcutKeys"><kbd>Delete</kbd></span>
          </div>
          <div :class="styles.shortcutRow">
            <span :class="styles.shortcutLabel">保存</span>
            <span :class="styles.shortcutKeys"><kbd>Ctrl</kbd> + <kbd>S</kbd></span>
          </div>
        </div>
      </el-popover>
    </div>

    <!-- Center: preview label + simulation controls -->
    <div v-else :class="styles.center">
      <span :class="styles.previewLabel">预览模式</span>

      <template v-if="!isSimulating">
        <el-tooltip content="启动流程模拟" placement="bottom">
          <button :class="[styles.simBtn, styles.simBtnPrimary]" title="开始模拟" @click="$emit('toggle-simulation')">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="4 2 14 8 4 14 4 2" fill="currentColor" stroke="none" />
            </svg>
            <span>开始模拟</span>
          </button>
        </el-tooltip>
      </template>

      <template v-else>
        <div :class="styles.simDivider" />

        <el-tooltip content="执行下一步" placement="bottom">
          <button
            :class="styles.simIconBtn"
            title="下一步"
            :disabled="autoPlayActive"
            @click="$emit('step-forward')"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="3 2 11 8 3 14 3 2" fill="currentColor" stroke="none" />
              <line x1="13" y1="2" x2="13" y2="14" />
            </svg>
          </button>
        </el-tooltip>

        <el-tooltip :content="autoPlayActive ? '暂停自动播放' : '自动播放'" placement="bottom">
          <button
            :class="styles.simIconBtn"
            :title="autoPlayActive ? '暂停' : '自动播放'"
            @click="$emit('toggle-auto-play')"
          >
            <svg v-if="!autoPlayActive" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="3 2 13 8 3 14 3 2" fill="currentColor" stroke="none" />
            </svg>
            <svg v-else width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="2" width="4" height="12" rx="0.5" fill="currentColor" stroke="none" />
              <rect x="9" y="2" width="4" height="12" rx="0.5" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </el-tooltip>

        <el-tooltip content="切换播放速度" placement="bottom">
          <button :class="styles.simSpeedBtn" title="播放速度" @click="$emit('cycle-speed')">
            {{ speedLabel }}
          </button>
        </el-tooltip>

        <el-tooltip content="重置到开始节点" placement="bottom">
          <button :class="styles.simIconBtn" title="重置" @click="$emit('reset-simulation')">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 8a6 6 0 0 1 10.472-4M14 8a6 6 0 0 1-10.472 4" />
              <polyline points="2 3 2 7 6 7" />
              <polyline points="14 13 14 9 10 9" />
            </svg>
          </button>
        </el-tooltip>

        <div :class="styles.simDivider" />

        <span v-if="statusMessage" :class="styles.simStatus">
          {{ statusMessage }}
        </span>

        <span :class="styles.simStep">步骤 {{ currentStep }}</span>

        <el-tooltip content="停止模拟并退出" placement="bottom">
          <button :class="[styles.simBtn, styles.simBtnStop]" title="停止模拟" @click="$emit('toggle-simulation')">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="10" height="10" rx="1" fill="currentColor" stroke="none" />
            </svg>
            <span>停止</span>
          </button>
        </el-tooltip>
      </template>
    </div>

    <!-- Right -->
    <div :class="styles.right">
      <template v-if="!isPreview">
        <NotificationBell />
        <div :class="styles.divider" />
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
        <button :class="[styles.btn, styles.btnOutline]" title="保存" :disabled="saving" @click="$emit('save')">{{ saving ? '保存中...' : '保存' }}</button>
        <button :class="[styles.btn, styles.btnOutline]" title="保存为模板" @click="$emit('save-as-template')">存为模板</button>
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
import { computed, ref } from 'vue'
import { View, EditPen, HomeFilled } from '@element-plus/icons-vue'
import type { SimulationSpeed } from '../composables/useSimulation.js'
import { SPEED_LABELS } from '../composables/useSimulation.js'
import type { LayoutDirection } from '../composables/useAutoLayout.js'
import { getAppUrl } from '@schema-form/micro-app/config'
import NotificationBell from './NotificationBell.vue'
import styles from './FlowToolbar.module.scss'

const props = defineProps<{
  title?: string
  isPreview?: boolean
  showLeftPanel?: boolean
  showRightPanel?: boolean
  showAiDrawer?: boolean
  saving?: boolean
  flowMode?: 'bpmn' | 'workflow'
  // Simulation props
  isSimulating?: boolean
  currentStep?: number
  statusMessage?: string
  autoPlayActive?: boolean
  speed?: SimulationSpeed
  // Auto-layout props
  layoutDirection?: LayoutDirection
  layoutNodeSep?: number
  layoutRankSep?: number
}>()

const layoutPopoverVisible = ref(false)

const speedLabel = computed(() => SPEED_LABELS[props.speed ?? 'normal'])

function goToPortal() {
  window.location.href = getAppUrl('portal', import.meta.env.DEV)
}

defineEmits<{
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
  'toggle-flow-mode': []
  // Simulation events
  'toggle-simulation': []
  'step-forward': []
  'reset-simulation': []
  'toggle-auto-play': []
  'cycle-speed': []
  // Auto-layout events
  'auto-layout': []
  'save-as-template': []
  'update:layoutDirection': [direction: LayoutDirection]
  'update:layoutNodeSep': [value: number]
  'update:layoutRankSep': [value: number]
}>()
</script>
