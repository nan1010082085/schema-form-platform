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
import styles from './SpacingEditor.module.scss'
import AppIcon from '@schema-form/platform-shared/components/common/AppIcon.vue'

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
  <div :class="styles.editor">
    <!-- 视觉预览区域 -->
    <div :class="styles.preview">
      <div :class="styles.box">
        <!-- Top -->
        <div :class="[styles.side, styles.sideTop]">
          <span :class="styles.sideValue">{{ topVal }}</span>
        </div>
        <!-- Right -->
        <div :class="[styles.side, styles.sideRight]">
          <span :class="[styles.sideValue, styles.sideValueVertical]">{{ rightVal }}</span>
        </div>
        <!-- Bottom -->
        <div :class="[styles.side, styles.sideBottom]">
          <span :class="styles.sideValue">{{ bottomVal }}</span>
        </div>
        <!-- Left -->
        <div :class="[styles.side, styles.sideLeft]">
          <span :class="[styles.sideValue, styles.sideValueVertical]">{{ leftVal }}</span>
        </div>
        <!-- Center -->
        <div :class="styles.center">
          <span :class="styles.centerLabel">{{ mode === 'margin' ? 'M' : 'P' }}</span>
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

    <!-- 链接模式：单个输入 -->
    <div v-if="linked" :class="styles.controls">
      <div :class="styles.controlRow">
        <label :class="styles.controlLabel">数值</label>
        <el-input-number
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
        <label :class="styles.gridLabel">上</label>
        <el-input-number
          :model-value="topVal"
          :min="0"
          :max="200"
          size="small"
          controls-position="right"
          :class="styles.gridInput"
          @update:model-value="(v: number | undefined) => applySide('top', v)"
        />
      </div>
      <div :class="styles.gridCell">
        <label :class="styles.gridLabel">右</label>
        <el-input-number
          :model-value="rightVal"
          :min="0"
          :max="200"
          size="small"
          controls-position="right"
          :class="styles.gridInput"
          @update:model-value="(v: number | undefined) => applySide('right', v)"
        />
      </div>
      <div :class="styles.gridCell">
        <label :class="styles.gridLabel">下</label>
        <el-input-number
          :model-value="bottomVal"
          :min="0"
          :max="200"
          size="small"
          controls-position="right"
          :class="styles.gridInput"
          @update:model-value="(v: number | undefined) => applySide('bottom', v)"
        />
      </div>
      <div :class="styles.gridCell">
        <label :class="styles.gridLabel">左</label>
        <el-input-number
          :model-value="leftVal"
          :min="0"
          :max="200"
          size="small"
          controls-position="right"
          :class="styles.gridInput"
          @update:model-value="(v: number | undefined) => applySide('left', v)"
        />
      </div>
    </div>
  </div>
</template>
