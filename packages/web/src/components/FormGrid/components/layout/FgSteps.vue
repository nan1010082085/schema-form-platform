<script setup lang="ts">
/**
 * FgSteps — 分步表单布局组件
 *
 * 将表单内容分为多个步骤，支持步骤级校验和受控模式。
 * 使用 v-show 保持各步骤内容挂载，避免切换时丢失数据。
 */
import { ref, computed, inject, watch } from 'vue'
import { ElMessage } from 'element-plus'
import SchemaRender from '../../SchemaRender.vue'
import type { FormData, FormSchemaItem } from '../../types'
import { FORM_GRID_API_KEY } from '../../types'

interface StepConfig {
  title: string
  description?: string
}

const props = withDefaults(defineProps<{
  /** 当前步骤索引（受控模式） */
  active?: number
  /** 步骤方向 */
  direction?: 'horizontal' | 'vertical'
  /** 切换步骤时是否校验当前步骤 */
  validateOnSwitch?: boolean
  /** 步骤配置列表 */
  steps: StepConfig[]
  /** 每个步骤对应一个 children 子树 */
  children?: FormSchemaItem[]
  /** 表单数据（由 SchemaRender 传入） */
  formData?: FormData
}>(), {
  active: 0,
  direction: 'horizontal',
  validateOnSwitch: false,
  formData: () => ({}),
  steps: () => [],
})

const emit = defineEmits<{
  'update:active': [step: number]
  'step-change': [step: number, prevStep: number]
}>()

const formGridApi = inject(FORM_GRID_API_KEY, undefined)

// 内部步骤索引，支持受控和非受控模式
const internalActive = ref(props.active)

// 受控模式：外部 active 变化时同步
watch(() => props.active, (val) => {
  internalActive.value = val
})

const currentStep = computed(() => internalActive.value)

/**
 * 从 children schema 中递归提取指定步骤子树的 field 列表
 * 用于步骤级校验
 */
function extractStepFields(stepIndex: number): string[] {
  const fields: string[] = []
  const stepSchema = props.children?.[stepIndex]
  if (!stepSchema) return fields

  function walk(items: FormSchemaItem[]) {
    for (const item of items) {
      if (item.field) fields.push(item.field)
      if (item.children) walk(item.children)
    }
  }

  if (stepSchema.children) walk(stepSchema.children)
  return fields
}

/**
 * 切换到指定步骤
 * 如果开启 validateOnSwitch，先校验当前步骤
 */
async function goToStep(targetStep: number) {
  if (targetStep === currentStep.value) return
  if (targetStep < 0 || targetStep >= props.steps.length) return

  // 校验当前步骤
  if (props.validateOnSwitch && formGridApi) {
    const stepFields = extractStepFields(currentStep.value)
    if (stepFields.length > 0) {
      try {
        await formGridApi.validateField(stepFields)
      } catch {
        ElMessage.warning('请先完成当前步骤的必填项')
        return
      }
    }
  }

  const prevStep = currentStep.value
  internalActive.value = targetStep
  emit('update:active', targetStep)
  emit('step-change', targetStep, prevStep)
}

function prevStep() {
  goToStep(currentStep.value - 1)
}

function nextStep() {
  goToStep(currentStep.value + 1)
}

defineExpose({
  goToStep,
  prevStep,
  nextStep,
  currentStep,
})
</script>

<template>
  <div class="fg-steps" :class="{ 'fg-steps--vertical': direction === 'vertical' }">
    <!-- 步骤头 -->
    <el-steps
      :active="currentStep"
      :direction="direction"
      finish-status="success"
      class="fg-steps__header"
    >
      <el-step
        v-for="(step, idx) in steps"
        :key="idx"
        :title="step.title"
        :description="step.description"
      />
    </el-steps>

    <!-- 步骤内容：使用 v-show 保持挂载 -->
    <div class="fg-steps__content">
      <div
        v-for="(child, idx) in children"
        :key="idx"
        v-show="idx === currentStep"
        class="fg-steps__panel"
      >
        <SchemaRender
          v-if="!child.hidden"
          :schema="child"
          :form-data="formData"
        />
      </div>
    </div>

    <!-- 步骤操作栏 -->
    <div class="fg-steps__actions">
      <el-button v-if="currentStep > 0" @click="prevStep">
        上一步
      </el-button>
      <el-button
        v-if="currentStep < steps.length - 1"
        type="primary"
        @click="nextStep"
      >
        下一步
      </el-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.fg-steps {
  --fg-steps-gap: 24px;
  --fg-steps-padding: 16px;
  --fg-steps-content-min-height: 200px;
  --fg-steps-border-color: #e4e7ed;

  display: flex;
  flex-direction: column;
  gap: var(--fg-steps-gap);
  padding: var(--fg-steps-padding);

  &--vertical {
    flex-direction: row;
    align-items: flex-start;

    .fg-steps__header {
      flex-shrink: 0;
      min-width: 160px;
    }

    .fg-steps__content {
      flex: 1;
      min-width: 0;
    }
  }

  &__header {
    margin-bottom: 8px;
  }

  &__content {
    min-height: var(--fg-steps-content-min-height);
  }

  &__panel {
    // v-show 隐藏时保持布局占位
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding-top: 16px;
    border-top: 1px solid var(--fg-steps-border-color);
  }
}
</style>

<!-- 非 scoped 块：穿透样式到 Element Plus 子组件和 grid 布局 -->
<style lang="scss">
.fg-steps {
  // el-steps 内部样式穿透
  .el-steps {
    margin-bottom: 8px;
  }

  // 步骤面板内的 grid 布局需要继承宽度
  .fg-steps__panel {
    > .fg-grid-row {
      width: 100%;
    }
  }
}
</style>
