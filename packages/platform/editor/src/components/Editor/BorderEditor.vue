<script setup lang="ts">
/**
 * BorderEditor -- 边框样式可视化编辑器
 *
 * 设计：
 * - 链接模式（默认）：一组控件（宽度/样式/颜色），四边同步
 * - 解除链接：点击某边选中，控件仅影响该边
 * - 选中某边时显示该边的值，未选中时显示简写值
 */
import { ref, computed } from 'vue'
import styles from './BorderEditor.module.scss'
import AppIcon from '@schema-form/platform-shared/components/common/AppIcon.vue'

const props = defineProps<{
  value?: Record<string, string>
}>()

const emit = defineEmits<{
  update: [patch: Record<string, string>]
}>()

// ---- 边框状态 ----

type Side = 'top' | 'right' | 'bottom' | 'left'

const SIDE_BORDER_MAP: Record<Side, string> = {
  top: 'borderTop',
  right: 'borderRight',
  bottom: 'borderBottom',
  left: 'borderLeft',
}

/** 当前选中的边（单选），null 表示未选中（使用简写） */
const activeSide = ref<Side | null>(null)
const linked = ref(true)

// ---- 解析边框属性 ----

function parseBorder(shorthand?: string): { width: number; style: string; color: string } {
  if (!shorthand) return { width: 0, style: 'solid', color: '#000000' }
  const parts = shorthand.trim().split(/\s+/)
  const width = parseInt(parts[0]) || 0
  const style = parts[1] || 'solid'
  const color = parts[2] || '#000000'
  return { width, style, color }
}

function getActiveBorder(): { width: number; style: string; color: string } {
  const v = props.value ?? {}
  if (activeSide.value) {
    return parseBorder(v[SIDE_BORDER_MAP[activeSide.value]])
  }
  return parseBorder(v.border)
}

const currentWidth = computed(() => getActiveBorder().width)
const currentStyle = computed(() => getActiveBorder().style)
const currentColor = computed(() => getActiveBorder().color)

// ---- 操作 ----

function selectSide(side: Side) {
  // 单选：点击已选中的取消选中，否则选中新边
  activeSide.value = activeSide.value === side ? null : side
}

function buildBorderValue(width: number, style: string, color: string): string {
  return `${width}px ${style} ${color}`
}

function applyChange(width?: number, style?: string, color?: string) {
  const w = width ?? currentWidth.value
  const s = style ?? currentStyle.value
  const c = color ?? currentColor.value
  const borderVal = buildBorderValue(w, s, c)

  if (linked.value) {
    // 链接模式：简写，清除所有单边
    emit('update', {
      border: borderVal,
      borderTop: '',
      borderRight: '',
      borderBottom: '',
      borderLeft: '',
    })
  } else if (activeSide.value) {
    // 选中了某边：仅修改该边，清除简写
    emit('update', {
      border: '',
      [SIDE_BORDER_MAP[activeSide.value]]: borderVal,
    })
  } else {
    // 未选中任何边：应用到简写
    emit('update', {
      border: borderVal,
      borderTop: '',
      borderRight: '',
      borderBottom: '',
      borderLeft: '',
    })
  }
}

function onWidthChange(val: number | undefined) {
  applyChange(val ?? 0)
}

function onStyleChange(val: string) {
  const w = currentWidth.value || 1
  applyChange(w, val)
}

function onColorChange(val: string) {
  const w = currentWidth.value || 1
  applyChange(w, undefined, val || '#000000')
}

function toggleLinked() {
  linked.value = !linked.value
  if (linked.value) {
    activeSide.value = null
    // 切回链接模式：用当前值统一四边
    applyChange()
  }
}

// ---- 预览边框样式 ----

function getSideStyle(side: Side): Record<string, string> {
  const v = props.value ?? {}
  const parsed = parseBorder(v[SIDE_BORDER_MAP[side]] || v.border)
  if (parsed.width === 0) return {}
  return {
    borderWidth: `${parsed.width}px`,
    borderStyle: parsed.style,
    borderColor: parsed.color,
  }
}

const borderStyleOptions = [
  { label: '实线', value: 'solid' },
  { label: '虚线', value: 'dashed' },
  { label: '点线', value: 'dotted' },
  { label: '无', value: 'none' },
]
</script>

<template>
  <div :class="styles.editor">
    <!-- 视觉预览区域 -->
    <div :class="styles.preview">
      <div :class="styles.box">
        <!-- Top -->
        <div
          :class="[styles.side, styles.sideTop, activeSide === 'top' && styles.sideActive]"
          :style="getSideStyle('top')"
          @click="selectSide('top')"
        />
        <!-- Right -->
        <div
          :class="[styles.side, styles.sideRight, activeSide === 'right' && styles.sideActive]"
          :style="getSideStyle('right')"
          @click="selectSide('right')"
        />
        <!-- Bottom -->
        <div
          :class="[styles.side, styles.sideBottom, activeSide === 'bottom' && styles.sideActive]"
          :style="getSideStyle('bottom')"
          @click="selectSide('bottom')"
        />
        <!-- Left -->
        <div
          :class="[styles.side, styles.sideLeft, activeSide === 'left' && styles.sideActive]"
          :style="getSideStyle('left')"
          @click="selectSide('left')"
        />
        <!-- Center label -->
        <div :class="styles.center">
          <span :class="styles.centerLabel">{{ currentWidth }}px</span>
        </div>
      </div>

      <!-- Link toggle -->
      <el-tooltip :content="linked ? '解除链接' : '链接四边'" placement="top" :show-after="300">
        <button
          :class="[styles.linkBtn, linked && styles.linkBtnActive]"
          @click="toggleLinked"
        >
          <AppIcon name="link" />
        </button>
      </el-tooltip>
    </div>

    <!-- 选中边提示（仅解除链接模式） -->
    <div v-if="!linked" :class="styles.sideHint">
      <template v-if="activeSide">
        当前编辑：{{ { top: '上边', right: '右边', bottom: '下边', left: '左边' }[activeSide] }}
      </template>
      <template v-else>点击边线选择要编辑的边</template>
    </div>

    <!-- 编辑控件 -->
    <div :class="styles.controls">
      <div :class="styles.controlRow">
        <label :class="styles.controlLabel">宽度</label>
        <el-input-number
          :model-value="currentWidth"
          :min="0"
          :max="20"
          size="small"
          controls-position="right"
          :class="styles.numberInput"
          @change="onWidthChange"
        />
      </div>
      <div :class="styles.controlRow">
        <label :class="styles.controlLabel">样式</label>
        <el-select
          :model-value="currentStyle"
          size="small"
          :class="styles.selectInput"
          @change="onStyleChange"
        >
          <el-option
            v-for="opt in borderStyleOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>
      <div :class="styles.controlRow">
        <label :class="styles.controlLabel">颜色</label>
        <el-color-picker
          :model-value="currentColor"
          size="small"
          show-alpha
          @change="onColorChange"
        />
      </div>
    </div>
  </div>
</template>
