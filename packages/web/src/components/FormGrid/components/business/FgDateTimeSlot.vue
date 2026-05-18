<script setup lang="ts">
/**
 * FgDateTimeSlot — 日期+时段选择组件
 * 选择日期后，再选择上午/中午/下午/晚上等时段
 */
import { computed } from 'vue'

export interface DateTimeSlotValue {
  date: string
  slot: string
}

const props = defineProps<{
  modelValue?: DateTimeSlotValue
  disabled?: boolean
  placeholder?: string
  slots?: Array<{ label: string; value: string }>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: DateTimeSlotValue]
  'change': [value: DateTimeSlotValue]
}>()

const defaultSlots = [
  { label: '上午', value: 'morning' },
  { label: '中午', value: 'noon' },
  { label: '下午', value: 'afternoon' },
  { label: '晚上', value: 'evening' }
]

const slotOptions = computed(() => props.slots ?? defaultSlots)

const dateValue = computed({
  get: () => props.modelValue?.date ?? '',
  set: (val) => {
    const next: DateTimeSlotValue = {
      date: val,
      slot: props.modelValue?.slot ?? slotOptions.value[0].value
    }
    emit('update:modelValue', next)
    emit('change', next)
  }
})

const slotValue = computed({
  get: () => props.modelValue?.slot ?? slotOptions.value[0].value,
  set: (val) => {
    const next: DateTimeSlotValue = {
      date: props.modelValue?.date ?? '',
      slot: val
    }
    emit('update:modelValue', next)
    emit('change', next)
  }
})
</script>

<template>
  <div class="fg-date-time-slot">
    <el-date-picker
      v-model="dateValue"
      type="date"
      :placeholder="placeholder ?? '选择日期'"
      :disabled="disabled"
      format="YYYY-MM-DD"
      value-format="YYYY-MM-DD"
      style="flex: 1"
    />
    <el-select
      v-model="slotValue"
      :disabled="disabled"
      style="width: 100px"
    >
      <el-option
        v-for="item in slotOptions"
        :key="item.value"
        :label="item.label"
        :value="item.value"
      />
    </el-select>
  </div>
</template>

<style lang="scss" scoped>
.fg-date-time-slot {
  display: flex;
  gap: 8px;
  width: 100%;
}
</style>
