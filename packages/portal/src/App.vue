<script setup lang="ts">
</script>

<template>
  <div class="portal-root">
    <router-view />
  </div>
</template>

<style>
/* Portal 全局基础重置 — 仅影响 portal 自身文档 */
*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: var(--font-family-base);
  color: var(--text-color-primary);
  background: var(--bg-color-page);
  -webkit-font-smoothing: antialiased;
}

#app {
  height: 100%;
}

.portal-root {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>

<!--
  Element Plus 全局样式覆盖
  使用 <style> 而非 <style scoped>，因为 EP 组件的 DOM 由 EP 自身渲染，
  scoped 无法覆盖。通过 .portal-root 祖先选择器限制作用域，
  确保这些规则不会泄漏到 micro-app 子应用（iframe 内有独立 document）。
-->
<style>
/* ---- 通用组件宽度强制 100% ---- */
.portal-root .el-input,
.portal-root .el-select,
.portal-root .el-date-editor,
.portal-root .el-input-number,
.portal-root .el-cascader {
  width: 100%;
}

.portal-root .el-form-item {
  margin-bottom: 0;
}

/* ---- Input 输入框 ---- */
.portal-root .el-input__wrapper {
  border-radius: var(--input-radius);
  box-shadow: none;
  border: none;
  outline: none;
}

.portal-root .el-input__wrapper:hover,
.portal-root .el-input__wrapper.is-focus,
.portal-root .el-input__wrapper:focus {
  box-shadow: none;
  border: none;
  outline: none;
}

.portal-root .el-input.is-disabled .el-input__wrapper {
  box-shadow: none;
  background-color: var(--input-bg-disabled);
}

.portal-root .el-form-item.is-error .el-input__wrapper {
  box-shadow: none;
}

/* ---- Textarea 文本域 ---- */
.portal-root .el-textarea__inner {
  border-radius: var(--input-radius);
  box-shadow: none;
  border: none;
  outline: none;
}

.portal-root .el-textarea__inner:hover,
.portal-root .el-textarea__inner:focus {
  box-shadow: none;
  border: none;
  outline: none;
}

.portal-root .el-textarea.is-disabled .el-textarea__inner {
  box-shadow: none;
  background-color: var(--input-bg-disabled);
}

.portal-root .el-form-item.is-error .el-textarea__inner {
  box-shadow: none;
}

/* ---- Select 选择器 ---- */
.portal-root .el-select .el-input__wrapper {
  border-radius: var(--input-radius);
  box-shadow: none;
  border: none;
}

/* ---- Button 按钮 ---- */
.portal-root .el-button {
  height: var(--button-height);
  padding: 8px 16px;
  border-radius: var(--input-radius);
  font-size: var(--font-size-14);
  font-weight: 500;
  line-height: 0;
  box-sizing: border-box;
  font-family: var(--font-family-base);
}

.portal-root .el-button--primary:not(.is-disabled) {
  background: var(--color-primary);
  border: 1px solid var(--color-primary);
  color: var(--text-color-inverse);
}

.portal-root .el-button--primary:not(.is-disabled):hover {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--text-color-inverse);
}

.portal-root .el-button--primary:not(.is-disabled).is-plain,
.portal-root .el-button--primary:not(.is-disabled).is-text,
.portal-root .el-button--primary:not(.is-disabled).is-link {
  color: var(--color-primary);
  background: transparent;
  border-color: transparent;
}

.portal-root .el-button--default {
  border-color: var(--border-color-base);
  color: var(--text-color-primary);
}

.portal-root .el-button--default.is-link {
  color: var(--text-color-primary);
  background: transparent;
  border-color: transparent;
}

.portal-root .el-button--danger:not(.is-disabled) {
  background: var(--bg-color-white);
  border: 1px solid var(--color-danger);
  color: var(--color-danger);
}

.portal-root .el-button--danger:not(.is-disabled).is-link,
.portal-root .el-button--danger:not(.is-disabled).is-text {
  color: var(--color-danger);
  background: transparent;
  border-color: transparent;
}

/* 禁用按钮：保持主色背景 */
.portal-root .is-disabled.el-button--primary {
  background-color: var(--color-primary);
  color: var(--text-color-inverse);
}

/* ---- Dialog 弹窗（蓝底白字头部） ---- */
.portal-root .el-dialog {
  --el-dialog-border-radius: 0;
  padding: 0 !important;
}

.portal-root .el-dialog .el-dialog__header {
  background: var(--color-primary-dialog-header);
  padding: 0 var(--spacing-md) !important;
  border-radius: 0;
  height: var(--dialog-header-height);
  line-height: var(--dialog-header-height);
  margin-right: 0;
}

.portal-root .el-dialog .el-dialog__header .el-dialog__title {
  font-size: var(--font-size-14);
  font-family: var(--font-family-base);
  color: var(--text-color-inverse);
}

.portal-root .el-dialog .el-dialog__header .el-dialog__headerbtn {
  position: absolute;
  top: 0;
  right: 0;
  width: var(--dialog-header-height);
  height: var(--dialog-header-height);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
}

.portal-root .el-dialog .el-dialog__header .el-dialog__headerbtn .el-dialog__close {
  color: var(--text-color-inverse);
  font-size: 18px;
}

.portal-root .el-dialog .el-dialog__header .el-dialog__headerbtn:hover .el-dialog__close {
  color: var(--text-color-inverse);
  opacity: 0.8;
}

.portal-root .el-dialog .el-dialog__body {
  padding: var(--dialog-body-padding);
  background: var(--bg-color-white);
}

.portal-root .el-dialog .el-dialog__footer {
  height: var(--dialog-footer-height);
  text-align: center;
  background: var(--color-primary-bg-light);
  padding: var(--spacing-10px) 0;
}

/* ---- FormItem 标签（居中对齐） ---- */
.portal-root .el-form-item__label {
  font-size: var(--font-size-14);
  color: var(--text-color-secondary);
  font-weight: 500;
  text-align: center;
}

/* ---- Radio 单选 ---- */
.portal-root .el-radio {
  font-size: var(--font-size-14);
  color: var(--text-color-primary);
}

.portal-root .el-radio__input.is-checked .el-radio__inner {
  border-color: var(--color-primary);
  background-color: var(--color-primary);
}

.portal-root .el-radio__input.is-checked + .el-radio__label {
  color: var(--color-primary);
}

/* ---- Checkbox 多选 ---- */
.portal-root .el-checkbox {
  font-size: var(--font-size-14);
  color: var(--text-color-primary);
}

.portal-root .el-checkbox__input.is-checked .el-checkbox__inner {
  border-color: var(--color-primary);
  background-color: var(--color-primary);
}

.portal-root .el-checkbox__input.is-checked + .el-checkbox__label {
  color: var(--color-primary);
}

/* ---- Table 表格 ---- */
.portal-root .el-table {
  font-size: var(--font-size-14);
  color: var(--text-color-primary);
}

.portal-root .el-table th.el-table__cell,
.portal-root .el-table td.el-table__cell {
  padding: 8px 0;
}

.portal-root .el-table__header th {
  font-size: var(--font-size-14);
  color: var(--text-color-primary);
  font-weight: 500;
  background-color: var(--bg-color-gray);
}

.portal-root .el-table__body td {
  font-size: var(--font-size-14);
  color: var(--text-color-primary);
}

/* ---- Tag 标签 ---- */
.portal-root .el-tag {
  border-radius: 2px;
}

/* ---- Pagination 分页 ---- */
.portal-root .el-pagination {
  font-size: var(--font-size-14);
}

/* ---- Select 下拉选中色 ---- */
.portal-root .el-select-dropdown__item.is-selected {
  color: var(--color-primary) !important;
}

/* ---- 弹窗 z-index ---- */
.portal-root .el-select-dropdown {
  z-index: 3000 !important;
}

.portal-root .el-picker-panel {
  z-index: 3000 !important;
}

.portal-root .el-overlay {
  z-index: 2000 !important;
}

.portal-root .el-message {
  z-index: 9999 !important;
}

/* ---- Link / Text 按钮重置 ---- */
.portal-root .el-button.is-link,
.portal-root .el-button.is-text {
  height: auto;
  padding: 0;
  line-height: normal;
  border: none;
  background: transparent;
}
</style>
