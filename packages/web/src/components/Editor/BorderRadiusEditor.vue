<script setup lang="ts">
/**
 * BorderRadiusEditor -- 圆角样式可视化编辑器
 *
 * 设计：
 * - 链接模式（默认）：单个输入，四角同步
 * - 解除链接：4 个独立输入（左上/右上/右下/左下），可分别设置
 * - 中央矩形实时预览圆角效果
 */
import { ref, computed } from 'vue'
import { ElInputNumber, ElTooltip } from 'element-plus'
import { Link } from '@element-plus/icons-vue'

const props = defineProps<{
  value?: Record<string, string>
}>()

const emit = defineEmits<{
  update: [patch: Record<string, string>]
}>()

// ---- 链接模式 ----

const linked = ref(true)

type Corner = 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft'

const CORNER_RADIUS_MAP: Record<Corner, string> = {
  topLeft: 'borderTopLeftRadius',
  topRight: 'borderTopRightRadius',
  bottomRight: 'borderBottomRightRadius',
  bottomLeft: 'borderBottomLeftRadius',
}

// ---- 解析值 ----

function parseRadius(val?: string): number {
  if (!val) return 0
  return parseInt(val) || 0
}

function getCornerVal(corner: Corner): number {
  const v = props.value ?? {}
  return parseRadius(v[CORNER_RADIUS_MAP[corner]]) || parseRadius(v.borderRadius)
}

const linkedValue = computed(() => parseRadius(props.value?.borderRadius))

const tlVal = computed(() => getCornerVal('topLeft'))
const trVal = computed(() => getCornerVal('topRight'))
const brVal = computed(() => getCornerVal('bottomRight'))
const blVal = computed(() => getCornerVal('bottomLeft'))

// ---- 操作 ----

function applyLinked(val: number | undefined) {
  const v = `${val ?? 0}px`
  emit('update', {
    borderRadius: v,
    borderTopLeftRadius: '',
    borderTopRightRadius: '',
    borderBottomRightRadius: '',
    borderBottomLeftRadius: '',
  })
}

function applyCorner(corner: Corner, val: number | undefined) {
  const v = `${val ?? 0}px`
  emit('update', {
    [CORNER_RADIUS_MAP[corner]]: v,
    borderRadius: '',
  })
}

function toggleLinked() {
  linked.value = !linked.value
  if (linked.value) {
    applyLinked(tlVal.value)
  }
}

// ---- 预览 ----

const previewStyle = computed(() => {
  const v = props.value ?? {}
  return {
    borderTopLeftRadius: v.borderTopLeftRadius || v.borderRadius || '0',
    borderTopRightRadius: v.borderTopRightRadius || v.borderRadius || '0',
    borderBottomRightRadius: v.borderBottomRightRadius || v.borderRadius || '0',
    borderBottomLeftRadius: v.borderBottomLeftRadius || v.borderRadius || '0',
  }
})
</script>

<template>
  <div :class="$style.editor">
    <!-- 视觉预览区域 -->
    <div :class="$style.preview">
      <div :class="$style.boxWrapper">
        <div :class="$style.box" :style="previewStyle">
          <div :class="$style.center">
            <span :class="$style.centerLabel">{{ linked ? linkedValue : tlVal }}px</span>
          </div>
        </div>
      </div>

      <!-- Link toggle -->
      <ElTooltip :content="linked ? '解除链接' : '链接四角'" placement="top" :show-after="300">
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
        <label :class="$style.controlLabel">圆角</label>
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
        <label :class="$style.gridLabel">左上</label>
        <ElInputNumber
          :model-value="tlVal"
          :min="0"
          :max="200"
          size="small"
          controls-position="right"
          :class="$style.gridInput"
          @update:model-value="(v: number | undefined) => applyCorner('topLeft', v)"
        />
      </div>
      <div :class="$style.gridCell">
        <label :class="$style.gridLabel">右上</label>
        <ElInputNumber
          :model-value="trVal"
          :min="0"
          :max="200"
          size="small"
          controls-position="right"
          :class="$style.gridInput"
          @update:model-value="(v: number | undefined) => applyCorner('topRight', v)"
        />
      </div>
      <div :class="$style.gridCell">
        <label :class="$style.gridLabel">右下</label>
        <ElInputNumber
          :model-value="brVal"
          :min="0"
          :max="200"
          size="small"
          controls-position="right"
          :class="$style.gridInput"
          @update:model-value="(v: number | undefined) => applyCorner('bottomRight', v)"
        />
      </div>
      <div :class="$style.gridCell">
        <label :class="$style.gridLabel">左下</label>
        <ElInputNumber
          :model-value="blVal"
          :min="0"
          :max="200"
          size="small"
          controls-position="right"
          :class="$style.gridInput"
          @update:model-value="(v: number | undefined) => applyCorner('bottomLeft', v)"
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

.boxWrapper {
  position: relative;
  width: 72px;
  height: 56px;
}

.box {
  position: relative;
  width: 100%;
  height: 100%;
  border: 2px solid #dcdfe6;
  background: #fafafa;
}

.center {
  position: absolute;
  inset: 0;
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

/* 四角独立输入网格 */
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
  width: 24px;
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
