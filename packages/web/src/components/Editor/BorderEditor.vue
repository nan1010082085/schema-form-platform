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

function onColorChange(val: string | null) {
  const w = currentWidth.value || 1
  applyChange(w, undefined, val ?? '#000000')
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
  <div :class="$style.editor">
    <!-- 视觉预览区域 -->
    <div :class="$style.preview">
      <div :class="$style.box">
        <!-- Top -->
        <div
          :class="[$style.side, $style.sideTop, activeSide === 'top' && $style.sideActive]"
          :style="getSideStyle('top')"
          @click="selectSide('top')"
        />
        <!-- Right -->
        <div
          :class="[$style.side, $style.sideRight, activeSide === 'right' && $style.sideActive]"
          :style="getSideStyle('right')"
          @click="selectSide('right')"
        />
        <!-- Bottom -->
        <div
          :class="[$style.side, $style.sideBottom, activeSide === 'bottom' && $style.sideActive]"
          :style="getSideStyle('bottom')"
          @click="selectSide('bottom')"
        />
        <!-- Left -->
        <div
          :class="[$style.side, $style.sideLeft, activeSide === 'left' && $style.sideActive]"
          :style="getSideStyle('left')"
          @click="selectSide('left')"
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

    <!-- 选中边提示（仅解除链接模式） -->
    <div v-if="!linked" :class="$style.sideHint">
      <template v-if="activeSide">
        当前编辑：{{ { top: '上边', right: '右边', bottom: '下边', left: '左边' }[activeSide] }}
      </template>
      <template v-else>点击边线选择要编辑的边</template>
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

.sideHint {
  font-size: 11px;
  color: #909399;
  text-align: center;
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
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

.linkBtnActive {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
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
