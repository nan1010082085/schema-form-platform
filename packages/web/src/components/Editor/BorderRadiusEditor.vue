<script setup lang="ts">
/**
 * BorderRadiusEditor -- 圆角样式可视化编辑器
 *
 * 设计：
 * - 中央矩形 + 4 个可点击角标（top-left/top-right/bottom-right/bottom-left）
 * - 点击角标切换选中状态（支持多选）
 * - 未选中任何角时，修改应用到全部 4 角（borderRadius 简写）
 * - 选中特定角时，仅修改对应角（borderTopLeftRadius/...）
 * - 链接模式：所有角联动
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

// ---- 角落状态 ----

type Corner = 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft'

const CORNER_RADIUS_MAP: Record<Corner, string> = {
  topLeft: 'borderTopLeftRadius',
  topRight: 'borderTopRightRadius',
  bottomRight: 'borderBottomRightRadius',
  bottomLeft: 'borderBottomLeftRadius',
}

const selectedCorners = ref<Set<Corner>>(new Set())
const linked = ref(true)

// ---- 从当前值解析 ----

function parseRadius(val?: string): number {
  if (!val) return 0
  return parseInt(val) || 0
}

function getCurrentRadius(): number {
  const v = props.value ?? {}
  if (selectedCorners.value.size > 0) {
    const first = [...selectedCorners.value][0]
    return parseRadius(v[CORNER_RADIUS_MAP[first]])
  }
  return parseRadius(v.borderRadius)
}

const currentRadius = computed(() => getCurrentRadius())

// ---- 操作 ----

function toggleCorner(corner: Corner) {
  if (selectedCorners.value.has(corner)) {
    selectedCorners.value.delete(corner)
  } else {
    selectedCorners.value.add(corner)
  }
  selectedCorners.value = new Set(selectedCorners.value)
}

function applyChange(val: number) {
  const radiusStr = `${val}px`

  if (linked.value || selectedCorners.value.size === 0) {
    emit('update', {
      borderRadius: radiusStr,
      borderTopLeftRadius: '',
      borderTopRightRadius: '',
      borderBottomRightRadius: '',
      borderBottomLeftRadius: '',
    })
  } else {
    const patch: Record<string, string> = {}
    for (const corner of selectedCorners.value) {
      patch[CORNER_RADIUS_MAP[corner]] = radiusStr
    }
    if (selectedCorners.value.size === 4) {
      patch.borderRadius = radiusStr
      patch.borderTopLeftRadius = ''
      patch.borderTopRightRadius = ''
      patch.borderBottomRightRadius = ''
      patch.borderBottomLeftRadius = ''
    } else {
      patch.borderRadius = ''
    }
    emit('update', patch)
  }
}

function onRadiusChange(val: number | undefined) {
  applyChange(val ?? 0)
}

function toggleLinked() {
  linked.value = !linked.value
  if (linked.value) {
    selectedCorners.value = new Set()
  }
}

// ---- 预览圆角 ----

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
          <!-- Top-left -->
          <div
            :class="[$style.corner, $style.cornerTL, selectedCorners.has('topLeft') && $style.cornerActive]"
            @click="toggleCorner('topLeft')"
          />
          <!-- Top-right -->
          <div
            :class="[$style.corner, $style.cornerTR, selectedCorners.has('topRight') && $style.cornerActive]"
            @click="toggleCorner('topRight')"
          />
          <!-- Bottom-right -->
          <div
            :class="[$style.corner, $style.cornerBR, selectedCorners.has('bottomRight') && $style.cornerActive]"
            @click="toggleCorner('bottomRight')"
          />
          <!-- Bottom-left -->
          <div
            :class="[$style.corner, $style.cornerBL, selectedCorners.has('bottomLeft') && $style.cornerActive]"
            @click="toggleCorner('bottomLeft')"
          />
          <!-- Center -->
          <div :class="$style.center">
            <span :class="$style.centerLabel">{{ currentRadius }}px</span>
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

    <!-- 编辑控件 -->
    <div :class="$style.controls">
      <div :class="$style.controlRow">
        <label :class="$style.controlLabel">圆角</label>
        <ElInputNumber
          :model-value="currentRadius"
          :min="0"
          :max="200"
          size="small"
          controls-position="right"
          :class="$style.numberInput"
          @update:model-value="onRadiusChange"
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

.corner {
  position: absolute;
  width: 12px;
  height: 12px;
  cursor: pointer;
  border-radius: 2px;
  transition: background-color 0.15s;
}

.corner::after {
  content: '';
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #dcdfe6;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transition: background-color 0.15s;
}

.corner:hover::after {
  background: #409eff;
}

.cornerActive::after {
  background: #409eff !important;
}

.cornerActive {
  background-color: rgba(64, 158, 255, 0.15);
}

.cornerTL {
  top: -2px;
  left: -2px;
}

.cornerTR {
  top: -2px;
  right: -2px;
}

.cornerBR {
  bottom: -2px;
  right: -2px;
}

.cornerBL {
  bottom: -2px;
  left: -2px;
}

.center {
  position: absolute;
  inset: 12px;
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
</style>
