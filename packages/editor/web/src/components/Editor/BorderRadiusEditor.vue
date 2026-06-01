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
import styles from './BorderRadiusEditor.module.scss'

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
  <div :class="styles.editor">
    <!-- 视觉预览区域 -->
    <div :class="styles.preview">
      <div :class="styles.boxWrapper">
        <div :class="styles.box" :style="previewStyle">
          <div :class="styles.center">
            <span :class="styles.centerLabel">{{ linked ? linkedValue : tlVal }}px</span>
          </div>
        </div>
      </div>

      <!-- Link toggle -->
      <ElTooltip :content="linked ? '解除链接' : '链接四角'" placement="top" :show-after="300">
        <button
          :class="[styles.linkBtn, linked && styles.linkBtnActive]"
          @click="toggleLinked"
        >
          <el-icon :size="14"><Link /></el-icon>
        </button>
      </ElTooltip>
    </div>

    <!-- 链接模式：单个输入 -->
    <div v-if="linked" :class="styles.controls">
      <div :class="styles.controlRow">
        <label :class="styles.controlLabel">圆角</label>
        <ElInputNumber
          :model-value="linkedValue"
          :min="0"
          :max="200"
          size="small"
          controls-position="right"
          :class="styles.numberInput"
          @update:model-value="applyLinked"
        />
      </div>
    </div>

    <!-- 解除链接：4 个独立输入 -->
    <div v-else :class="styles.controlsGrid">
      <div :class="styles.gridCell">
        <label :class="styles.gridLabel">左上</label>
        <ElInputNumber
          :model-value="tlVal"
          :min="0"
          :max="200"
          size="small"
          controls-position="right"
          :class="styles.gridInput"
          @update:model-value="(v: number | undefined) => applyCorner('topLeft', v)"
        />
      </div>
      <div :class="styles.gridCell">
        <label :class="styles.gridLabel">右上</label>
        <ElInputNumber
          :model-value="trVal"
          :min="0"
          :max="200"
          size="small"
          controls-position="right"
          :class="styles.gridInput"
          @update:model-value="(v: number | undefined) => applyCorner('topRight', v)"
        />
      </div>
      <div :class="styles.gridCell">
        <label :class="styles.gridLabel">右下</label>
        <ElInputNumber
          :model-value="brVal"
          :min="0"
          :max="200"
          size="small"
          controls-position="right"
          :class="styles.gridInput"
          @update:model-value="(v: number | undefined) => applyCorner('bottomRight', v)"
        />
      </div>
      <div :class="styles.gridCell">
        <label :class="styles.gridLabel">左下</label>
        <ElInputNumber
          :model-value="blVal"
          :min="0"
          :max="200"
          size="small"
          controls-position="right"
          :class="styles.gridInput"
          @update:model-value="(v: number | undefined) => applyCorner('bottomLeft', v)"
        />
      </div>
    </div>
  </div>
</template>
