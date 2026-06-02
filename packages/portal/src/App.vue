<script setup lang="ts">
</script>

<template>
  <router-view />
</template>

<style>
@import './styles/variables.css';

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

/* ============================================================
   Element Plus 全局样式覆盖（与 editor 保持一致）
   ============================================================ */

/* ---- 通用组件宽度强制 100% ---- */
.el-input,
.el-select,
.el-date-editor,
.el-input-number,
.el-cascader {
  width: 100%;
}

.el-form-item {
  margin-bottom: 0;
}

/* ---- Input 输入框 ---- */
.el-input__wrapper {
  border-radius: var(--input-radius);
  box-shadow: none;
  border: none;
  outline: none;
}

.el-input__wrapper:hover,
.el-input__wrapper.is-focus,
.el-input__wrapper:focus {
  box-shadow: none;
  border: none;
  outline: none;
}

.el-input.is-disabled .el-input__wrapper {
  box-shadow: none;
  background-color: var(--input-bg-disabled);
}

.el-form-item.is-error .el-input__wrapper {
  box-shadow: none;
}

/* ---- Textarea 文本域 ---- */
.el-textarea__inner {
  border-radius: var(--input-radius);
  box-shadow: none;
  border: none;
  outline: none;
}

.el-textarea__inner:hover,
.el-textarea__inner:focus {
  box-shadow: none;
  border: none;
  outline: none;
}

.el-textarea.is-disabled .el-textarea__inner {
  box-shadow: none;
  background-color: var(--input-bg-disabled);
}

.el-form-item.is-error .el-textarea__inner {
  box-shadow: none;
}

/* ---- Select 选择器 ---- */
.el-select .el-input__wrapper {
  border-radius: var(--input-radius);
  box-shadow: none;
  border: none;
}

/* ---- Button 按钮 ---- */
.el-button {
  height: var(--button-height);
  padding: 8px 16px;
  border-radius: var(--input-radius);
  font-size: var(--font-size-14);
  font-weight: 500;
  line-height: 0;
  box-sizing: border-box;
  font-family: var(--font-family-base);
}

.el-button--primary:not(.is-disabled) {
  background: var(--color-primary);
  border: 1px solid var(--color-primary);
  color: var(--text-color-inverse);
}

.el-button--primary:not(.is-disabled):hover {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--text-color-inverse);
}

.el-button--primary:not(.is-disabled).is-plain,
.el-button--primary:not(.is-disabled).is-text,
.el-button--primary:not(.is-disabled).is-link {
  color: var(--color-primary);
  background: transparent;
  border-color: transparent;
}

.el-button--default {
  border-color: var(--border-color-base);
  color: var(--text-color-primary);
}

.el-button--default.is-link {
  color: var(--text-color-primary);
  background: transparent;
  border-color: transparent;
}

.el-button--danger:not(.is-disabled) {
  background: var(--bg-color-white);
  border: 1px solid var(--color-danger);
  color: var(--color-danger);
}

.el-button--danger:not(.is-disabled).is-link,
.el-button--danger:not(.is-disabled).is-text {
  color: var(--color-danger);
  background: transparent;
  border-color: transparent;
}

/* 禁用按钮：保持主色背景 */
.is-disabled.el-button--primary {
  background-color: var(--color-primary);
  color: var(--text-color-inverse);
}

/* ---- Dialog 弹窗（蓝底白字头部） ---- */
.el-dialog {
  --el-dialog-border-radius: 0;
  padding: 0 !important;
}

.el-dialog .el-dialog__header {
  background: var(--color-primary-dialog-header);
  padding: 0 var(--spacing-md) !important;
  border-radius: 0;
  height: var(--dialog-header-height);
  line-height: var(--dialog-header-height);
  margin-right: 0;
}

.el-dialog .el-dialog__header .el-dialog__title {
  font-size: var(--font-size-14);
  font-family: var(--font-family-base);
  color: var(--text-color-inverse);
}

.el-dialog .el-dialog__header .el-dialog__headerbtn {
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

.el-dialog .el-dialog__header .el-dialog__headerbtn .el-dialog__close {
  color: var(--text-color-inverse);
  font-size: 18px;
}

.el-dialog .el-dialog__header .el-dialog__headerbtn:hover .el-dialog__close {
  color: var(--text-color-inverse);
  opacity: 0.8;
}

.el-dialog .el-dialog__body {
  padding: var(--dialog-body-padding);
  background: var(--bg-color-white);
}

.el-dialog .el-dialog__footer {
  height: var(--dialog-footer-height);
  text-align: center;
  background: var(--color-primary-bg-light);
  padding: var(--spacing-10px) 0;
}

/* ---- FormItem 标签（居中对齐） ---- */
.el-form-item__label {
  font-size: var(--font-size-14);
  color: var(--text-color-secondary);
  font-weight: 500;
  text-align: center;
}

/* ---- Radio 单选 ---- */
.el-radio {
  font-size: var(--font-size-14);
  color: var(--text-color-primary);
}

.el-radio__input.is-checked .el-radio__inner {
  border-color: var(--color-primary);
  background-color: var(--color-primary);
}

.el-radio__input.is-checked + .el-radio__label {
  color: var(--color-primary);
}

/* ---- Checkbox 多选 ---- */
.el-checkbox {
  font-size: var(--font-size-14);
  color: var(--text-color-primary);
}

.el-checkbox__input.is-checked .el-checkbox__inner {
  border-color: var(--color-primary);
  background-color: var(--color-primary);
}

.el-checkbox__input.is-checked + .el-checkbox__label {
  color: var(--color-primary);
}

/* ---- Table 表格 ---- */
.el-table {
  font-size: var(--font-size-14);
  color: var(--text-color-primary);
}

.el-table th.el-table__cell,
.el-table td.el-table__cell {
  padding: 8px 0;
}

.el-table__header th {
  font-size: var(--font-size-14);
  color: var(--text-color-primary);
  font-weight: 500;
  background-color: var(--bg-color-gray);
}

.el-table__body td {
  font-size: var(--font-size-14);
  color: var(--text-color-primary);
}

/* ---- Tag 标签 ---- */
.el-tag {
  border-radius: 2px;
}

/* ---- Pagination 分页 ---- */
.el-pagination {
  font-size: var(--font-size-14);
}

/* ---- Select 下拉选中色 ---- */
.el-select-dropdown__item.is-selected {
  color: var(--color-primary) !important;
}

/* ---- 弹窗 z-index ---- */
.el-select-dropdown {
  z-index: 3000 !important;
}

.el-picker-panel {
  z-index: 3000 !important;
}

.el-overlay {
  z-index: 2000 !important;
}

.el-message {
  z-index: 9999 !important;
}

/* ---- Link / Text 按钮重置 ---- */
.el-button.is-link,
.el-button.is-text {
  height: auto;
  padding: 0;
  line-height: normal;
  border: none;
  background: transparent;
}
</style>
