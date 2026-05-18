<script setup lang="ts">
/**
 * FgDetailForm — 表单详情网格组件
 * 标签-值对网格布局，配置驱动 + 插槽注入
 *
 * @deprecated 该组件功能可被 grid-row + grid-col + el-form-item 完全替代。
 * 推荐使用 Schema 驱动的方式实现相同布局效果，例如：
 * {
 *   "type": "grid-row",
 *   "children": [
 *     { "type": "grid-col", "span": 12, "children": [
 *       { "type": "input", "field": "name", "label": "姓名" }
 *     ]}
 *   ]
 * }
 */
interface FieldConfig {
  name: string
  text: string
  required?: boolean
  hide?: boolean
  class?: string
}

defineProps<{
  fields: FieldConfig[]
  title?: string
}>()
</script>

<template>
  <div class="fg-detail-form">
    <div v-if="title" class="fg-detail-form__title">{{ title }}</div>
    <div class="fg-detail-form__grid">
      <div
        v-for="field in fields"
        :key="field.name"
        v-show="!field.hide"
        :class="['fg-detail-form__item', field.class]"
      >
        <div class="fg-detail-form__label">
          <span v-if="field.required" class="fg-detail-form__required">*</span>
          {{ field.text }}
        </div>
        <div class="fg-detail-form__value">
          <slot :name="field.name" />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.fg-detail-form {
  &__title {
    font-size: 18px;
    font-weight: 500;
    padding: 12px 0;
    border-bottom: 1px solid #d5dde3;
    margin-bottom: 12px;
  }

  &__grid {
    display: flex;
    flex-wrap: wrap;
  }

  &__item {
    display: flex;
    width: 50%;
    border-bottom: 1px solid #eee;
    min-height: 40px;

    &.full-row {
      width: 100%;
    }

    &.third-row {
      width: 33.333%;
    }
  }

  &__label {
    width: 120px;
    flex-shrink: 0;
    padding: 8px 12px;
    background: #fafafa;
    color: #666;
    font-size: 14px;
    font-weight: 500;
    text-align: right;
    border-right: 1px solid #eee;
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  &__required {
    color: #e50113;
    margin-right: 2px;
  }

  &__value {
    flex: 1;
    padding: 8px 12px;
    font-size: 14px;
    color: #333;
    display: flex;
    align-items: center;
  }
}
</style>
