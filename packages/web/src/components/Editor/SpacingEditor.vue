<script setup lang="ts">
/**
 * SpacingEditor -- 外边距/内边距可视化编辑器
 *
 * 设计：
 * - 链接模式（默认）：单个输入，四边同步
 * - 解除链接：4 个独立输入（上右下左），可分别设置不同值
 * - 中央矩形实时预览各边数值
 */
import { ref, computed } from 'vue'
import { ElInputNumber, ElTooltip } from 'element-plus'
import { Link } from '@element-plus/icons-vue'

const props = defineProps<{
  /** 'margin' 或 'padding' */
  mode: 'margin' | 'padding'
  value?: Record<string, string>
}>()

const emit = defineEmits<{
  update: [patch: Record<string, string>]
}>()

// ---- 链接模式 ----

const linked = ref(true)

type Side = 'top' | 'right' | 'bottom' | 'left'

const SIDE_PROP_MAP: Record<Side, Record<string, string>> = {
  top: { margin: 'marginTop', padding: 'paddingTop' },
  right: { margin: 'marginRight', padding: 'paddingRight' },
  bottom: { margin: 'marginBottom', padding: 'paddingBottom' },
  left: { margin: 'marginLeft', padding: 'paddingLeft' },
}

// ---- 解析值 ----

function parsePx(val?: string): number {
  if (!val) return 0
  const m = val.match(/^(\d+(?:\.\d+)?)/)
  return m ? parseFloat(m[1]) : 0
}

function getSideVal(side: Side): number {
  const v = props.value ?? {}
  const prefix = props.mode
  // 优先读取单边属性，fallback 到简写
  return parsePx(v[SIDE_PROP_MAP[side][prefix]]) || parsePx(v[prefix])
}

const linkedValue = computed(() => {
  const v = props.value ?? {}
  return parsePx(v[props.mode])
})

const topVal = computed(() => getSideVal('top'))
const rightVal = computed(() => getSideVal('right'))
const bottomVal = computed(() => getSideVal('bottom'))
const leftVal = computed(() => getSideVal('left'))

// ---- 操作 ----

function applyLinked(val: number | undefined) {
  const v = `${val ?? 0}px`
  const prefix = props.mode
  emit('update', {
    [prefix]: v,
    [`${prefix}Top`]: '',
    [`${prefix}Right`]: '',
    [`${prefix}Bottom`]: '',
    [`${prefix}Left`]: '',
  })
}

function applySide(side: Side, val: number | undefined) {
  const v = `${val ?? 0}px`
  const prefix = props.mode
  const prop = SIDE_PROP_MAP[side][prefix]
  const patch: Record<string, string> = { [prop]: v, [prefix]: '' }
  emit('update', patch)
}

function toggleLinked() {
  linked.value = !linked.value
  if (linked.value) {
    // 切回链接模式：用当前 top 值统一四边
    applyLinked(topVal.value)
  }
}
</script>

<template>
  <div :class="$style.editor">
    <!-- 视觉预览区域 -->
    <div :class="$style.preview">
      <div :class="$style.box">
        <!-- Top -->
        <div :class="[$style.side, $style.sideTop]">
          <span :class="$style.sideValue">{{ topVal }}</span>
        </div>
        <!-- Right -->
        <div :class="[$style.side, $style.sideRight]">
          <span :class="[$style.sideValue, $style.sideValueVertical]">{{ rightVal }}</span>
        </div>
        <!-- Bottom -->
        <div :class="[$style.side, $style.sideBottom]">
          <span :class="$style.sideValue">{{ bottomVal }}</span>
        </div>
        <!-- Left -->
        <div :class="[$style.side, $style.sideLeft]">
          <span :class="[$style.sideValue, $style.sideValueVertical]">{{ leftVal }}</span>
        </div>
        <!-- Center -->
        <div :class="$style.center">
          <span :class="$style.centerLabel">{{ mode === 'margin' ? 'M' : 'P' }}</span>
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

    <!-- 链接模式：单个输入 -->
    <div v-if="linked" :class="$style.controls">
      <div :class="$style.controlRow">
        <label :class="$style.controlLabel">数值</label>
        <ElInputNumber
          :model-value="linkedValue"
          :min="0"
          :max="200"
          size="small"
          controls-position="right"
          :class="$style.numberInput"
          @update:model-value="applyLinked"
        />
      </div>
    </div>

    <!-- 解除链接：4 个独立输入 -->
    <div v-else :class="$style.controlsGrid">
      <div :class="$style.gridCell">
        <label :class="$style.gridLabel">上</label>
        <ElInputNumber
          :model-value="topVal"
          :min="0"
          :max="200"
          size="small"
          controls-position="right"
          :class="$style.gridInput"
          @update:model-value="(v: number | undefined) => applySide('top', v)"
        />
      </div>
      <div :class="$style.gridCell">
        <label :class="$style.gridLabel">右</label>
        <ElInputNumber
          :model-value="rightVal"
          :min="0"
          :max="200"
          size="small"
          controls-position="right"
          :class="$style.gridInput"
          @update:model-value="(v: number | undefined) => applySide('right', v)"
        />
      </div>
      <div :class="$style.gridCell">
        <label :class="$style.gridLabel">下</label>
        <ElInputNumber
          :model-value="bottomVal"
          :min="0"
          :max="200"
          size="small"
          controls-position="right"
          :class="$style.gridInput"
          @update:model-value="(v: number | undefined) => applySide('bottom', v)"
        />
      </div>
      <div :class="$style.gridCell">
        <label :class="$style.gridLabel">左</label>
        <ElInputNumber
          :model-value="leftVal"
          :min="0"
          :max="200"
          size="small"
          controls-position="right"
          :class="$style.gridInput"
          @update:model-value="(v: number | undefined) => applySide('left', v)"
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
  width: 100px;
  height: 72px;
  background: #fafafa;
}

.side {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sideTop {
  top: 0;
  left: 0;
  right: 0;
  height: 16px;
  border-bottom: 1px dashed #dcdfe6;
}

.sideRight {
  top: 16px;
  right: 0;
  bottom: 16px;
  width: 20px;
  border-left: 1px dashed #dcdfe6;
}

.sideBottom {
  bottom: 0;
  left: 0;
  right: 0;
  height: 16px;
  border-top: 1px dashed #dcdfe6;
}

.sideLeft {
  top: 16px;
  left: 0;
  bottom: 16px;
  width: 20px;
  border-right: 1px dashed #dcdfe6;
}

.sideValue {
  font-size: 9px;
  color: #909399;
  pointer-events: none;
}

.sideValueVertical {
  writing-mode: vertical-rl;
  text-orientation: mixed;
}

.center {
  position: absolute;
  top: 16px;
  left: 20px;
  right: 20px;
  bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
  border: 1px solid #e4e7ed;
}

.centerLabel {
  font-size: 11px;
  font-weight: 600;
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

/* 四边独立输入网格 */
.controlsGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.gridCell {
  display: flex;
  align-items: center;
  gap: 4px;
}

.gridLabel {
  width: 16px;
  flex-shrink: 0;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  text-align: right;
}

.gridInput {
  flex: 1;
  min-width: 0;
}
</style>
