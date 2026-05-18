<script setup lang="ts">
import { computed } from 'vue'
import type { FormData, ComponentProps } from '../../types'

const props = defineProps<{
  formData: FormData
  schema: { props?: ComponentProps }
}>()

const fieldStart = computed(() => (props.schema.props?.fieldStart as string) ?? 'startDate')
const fieldEnd = computed(() => (props.schema.props?.fieldEnd as string) ?? 'endDate')
const connector = computed(() => (props.schema.props?.connector as string) ?? '至')
const startPlaceholder = computed(() => (props.schema.props?.startPlaceholder as string) ?? '开始日期')
const endPlaceholder = computed(() => (props.schema.props?.endPlaceholder as string) ?? '结束日期')
const disabled = computed(() => (props.schema.props?.disabled as boolean) ?? false)
const readonly = computed(() => (props.schema.props?.readonly as boolean) ?? false)
const height = computed(() => (props.schema.props?.height as string) ?? undefined)
const maxHeight = computed(() => (props.schema.props?.maxHeight as string) ?? undefined)
const minHeight = computed(() => (props.schema.props?.minHeight as string) ?? undefined)

const startValue = computed({
  get: () => props.formData[fieldStart.value] as string | undefined,
  set: (val) => { props.formData[fieldStart.value] = val ?? null },
})

const endValue = computed({
  get: () => props.formData[fieldEnd.value] as string | undefined,
  set: (val) => { props.formData[fieldEnd.value] = val ?? null },
})

const containerStyle = computed(() => ({
  height: height.value,
  maxHeight: maxHeight.value,
  minHeight: minHeight.value,
}))
</script>

<template>
  <div class="fg-date-range" :style="containerStyle">
    <div class="fg-date-range__picker">
      <el-date-picker
        v-model="startValue"
        type="date"
        :placeholder="startPlaceholder"
        :disabled="disabled"
        :readonly="readonly"
        format="YYYY-MM-DD"
        value-format="YYYY-MM-DD"
        style="width: 100%"
      />
    </div>

    <span class="fg-date-range__connector">{{ connector }}</span>

    <div class="fg-date-range__picker">
      <el-date-picker
        v-model="endValue"
        type="date"
        :placeholder="endPlaceholder"
        :disabled="disabled"
        :readonly="readonly"
        format="YYYY-MM-DD"
        value-format="YYYY-MM-DD"
        style="width: 100%"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.fg-date-range {
  height: 100%;

  .fg-date-range__picker {
    height: 100%;
  }

  :deep(.el-date-editor) {
    height: 100%;

    .el-input__wrapper {
      height: 100%;
      box-sizing: border-box;
      box-shadow: none;
      border: none;
    }

    .el-input__inner {
      height: 100%;
    }
  }
}
</style>
