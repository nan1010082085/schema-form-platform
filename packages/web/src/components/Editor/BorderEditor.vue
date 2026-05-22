<script setup lang="ts">
/**
 * BorderEditor -- 边框样式可视化编辑器
 *
 * 设计：
 * - 中央矩形 + 4 条可点击边线（top/right/bottom/left）
 * - 点击边线切换选中状态（支持多选）
 * - 未选中任何边时，修改应用到全部 4 边（border 简写）
 * - 选中特定边时，仅修改对应边（borderTop/borderRight/...）
 * - 链接模式：所有边联动
 */
import { ref, computed } from 'vue'
import { ElInputNumber, ElColorPicker, ElSelect, ElOption, ElTooltip } from 'element-plus'
import { Link } from '@element-plus/icons-vue'

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

const selectedSides = ref<Set<Side>>(new Set())
const linked = ref(true)

// ---- 从当前值解析边框属性 ----

function parseBorder(shorthand?: string): { width: number; style: string; color: string } {
  if (!shorthand) return { width: 0, style: 'solid', color: '#000000' }
  const parts = shorthand.trim().split(/\s+/)
  const width = parseInt(parts[0]) || 0
  const style = parts[1] || 'solid'
  const color = parts[2] || '#000000'
  return { width, style, color }
}

function getCurrentBorder(side?: Side): { width: number; style: string; color: string } {
  const v = props.value ?? {}
  if (side && selectedSides.value.size > 0) {
    return parseBorder(v[SIDE_BORDER_MAP[side]])
  }
  return parseBorder(v.border)
}

const currentWidth = computed(() => {
  const border = getCurrentBorder(selectedSides.value.size > 0 ? [...selectedSides.value][0] : undefined)
  return border.width
})

const currentStyle = computed(() => {
  const border = getCurrentBorder(selectedSides.value.size > 0 ? [...selectedSides.value][0] : undefined)
  return border.style
})

const currentColor = computed(() => {
  const border = getCurrentBorder(selectedSides.value.size > 0 ? [...selectedSides.value][0] : undefined)
  return border.color
})

// ---- 操作 ----

function toggleSide(side: Side) {
  if (selectedSides.value.has(side)) {
    selectedSides.value.delete(side)
  } else {
    selectedSides.value.add(side)
  }
  // force reactivity
  selectedSides.value = new Set(selectedSides.value)
}

function buildBorderValue(width: number, style: string, color: string): string {
  return `${width}px ${style} ${color}`
}

function applyChange(width?: number, style?: string, color?: string) {
  const w = width ?? currentWidth.value
  const s = style ?? currentStyle.value
  const c = color ?? currentColor.value
  const borderVal = buildBorderValue(w, s, c)

  if (linked.value || selectedSides.value.size === 0) {
    // linked or no selection: apply to all sides via shorthand
    emit('update', {
      border: borderVal,
      borderTop: '',
      borderRight: '',
      borderBottom: '',
      borderLeft: '',
    })
  } else {
    // specific sides selected
    const patch: Record<string, string> = {}
    for (const side of selectedSides.value) {
      patch[SIDE_BORDER_MAP[side]] = borderVal
    }
    // clear shorthand when per-side is used
    if (selectedSides.value.size === 4) {
      patch.border = borderVal
      patch.borderTop = ''
      patch.borderRight = ''
      patch.borderBottom = ''
      patch.borderLeft = ''
    } else {
      patch.border = ''
    }
    emit('update', patch)
  }
}

function onWidthChange(val: number | undefined) {
  applyChange(val ?? 0)
}

function onStyleChange(val: string) {
  applyChange(undefined, val)
}

function onColorChange(val: string | null) {
  applyChange(undefined, undefined, val ?? '#000000')
}

function toggleLinked() {
  linked.value = !linked.value
  if (linked.value) {
    selectedSides.value = new Set()
  }
}

// ---- 预览边框样式 ----

function getSideStyle(side: Side): Record<string, string> {
  const v = props.value ?? {}
  const borderStr = selectedSides.value.size > 0 ? v[SIDE_BORDER_MAP[side]] : undefined
  const parsed = parseBorder(borderStr || v.border)
  if (parsed.width === 0) return {}
  return {
    borderWidth: `${parsed.width}px`,
    borderStyle: parsed.style,
    borderColor: parsed.color,
  }
}

const borderStyleOptions = [
  { label: 'solid', value: 'solid' },
  { label: 'dashed', value: 'dashed' },
  { label: 'dotted', value: 'dotted' },
  { label: 'none', value: 'none' },
]
</script>

<template>
  <div :class="$style.editor">
    <!-- 视觉预览区域 -->
    <div :class="$style.preview">
      <div :class="$style.box">
        <!-- Top -->
        <div
          :class="[$style.side, $style.sideTop, selectedSides.has('top') && $style.sideActive]"
          :style="getSideStyle('top')"
          @click="toggleSide('top')"
        />
        <!-- Right -->
        <div
          :class="[$style.side, $style.sideRight, selectedSides.has('right') && $style.sideActive]"
          :style="getSideStyle('right')"
          @click="toggleSide('right')"
        />
        <!-- Bottom -->
        <div
          :class="[$style.side, $style.sideBottom, selectedSides.has('bottom') && $style.sideActive]"
          :style="getSideStyle('bottom')"
          @click="toggleSide('bottom')"
        />
        <!-- Left -->
        <div
          :class="[$style.side, $style.sideLeft, selectedSides.has('left') && $style.sideActive]"
          :style="getSideStyle('left')"
          @click="toggleSide('left')"
        />
        <!-- Center label -->
        <div :class="$style.center">
          <span :class="$style.centerLabel">{{ currentWidth }}px</span>
        </div>
      </div>

      <!-- Link toggle -->
      <ElTooltip :content="linked ? '解除链接' : '链接四边'" placement="top" :show-after="300">
        <button
          :class="[$style.linkBtn, linked && $style.linkBtnActive]"
          @click="toggleLinked"
        >
          <el-icon :size="14"><Link /></el-icon>
        </button>
      </ElTooltip>
    </div>

    <!-- 编辑控件 -->
    <div :class="$style.controls">
      <div :class="$style.controlRow">
        <label :class="$style.controlLabel">宽度</label>
        <ElInputNumber
          :model-value="currentWidth"
          :min="0"
          :max="20"
          size="small"
          controls-position="right"
          :class="$style.numberInput"
          @update:model-value="onWidthChange"
        />
      </div>
      <div :class="$style.controlRow">
        <label :class="$style.controlLabel">样式</label>
        <ElSelect
          :model-value="currentStyle"
          size="small"
          :class="$style.selectInput"
          @update:model-value="onStyleChange"
        >
          <ElOption
            v-for="opt in borderStyleOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </ElSelect>
      </div>
      <div :class="$style.controlRow">
        <label :class="$style.controlLabel">颜色</label>
        <ElColorPicker
          :model-value="currentColor"
          size="small"
          show-alpha
          @update:model-value="onColorChange"
        />
      </div>
    </div>
  </div>
</template>

<style module>
.editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.preview {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.box {
  position: relative;
  width: 72px;
  height: 56px;
  background: #fafafa;
}

.side {
  position: absolute;
  cursor: pointer;
  transition: background-color 0.15s;
}

.side:hover {
  background-color: rgba(64, 158, 255, 0.15);
}

.sideActive {
  background-color: rgba(64, 158, 255, 0.3) !important;
}

.sideTop {
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  border-top: 2px solid #dcdfe6;
}

.sideRight {
  top: 0;
  right: 0;
  bottom: 0;
  width: 6px;
  border-right: 2px solid #dcdfe6;
}

.sideBottom {
  bottom: 0;
  left: 0;
  right: 0;
  height: 6px;
  border-bottom: 2px solid #dcdfe6;
}

.sideLeft {
  top: 0;
  left: 0;
  bottom: 0;
  width: 6px;
  border-left: 2px solid #dcdfe6;
}

.center {
  position: absolute;
  inset: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.centerLabel {
  font-size: 10px;
  color: #909399;
}

.linkBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  color: #909399;
  transition: all 0.15s;
  flex-shrink: 0;
}

.linkBtn:hover {
  border-color: #409eff;
  color: #409eff;
}

.linkBtnActive {
  border-color: #409eff;
  color: #409eff;
  background: #ecf5ff;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.controlRow {
  display: flex;
  align-items: center;
  gap: 8px;
}

.controlLabel {
  width: 32px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-align: right;
}

.numberInput {
  flex: 1;
}

.selectInput {
  flex: 1;
}
</style>
