import type { Component } from 'vue'
import type { SchemaType } from './types'
// 布局组件
import FgPage from './components/layout/FgPage.vue'
import FgToolbar from './components/layout/FgToolbar.vue'
import FgCard from './components/layout/FgCard.vue'
import FgTitle from './components/layout/FgTitle.vue'
import FgDivider from './components/layout/FgDivider.vue'
import FgSpacer from './components/layout/FgSpacer.vue'
import FgSteps from './components/layout/FgSteps.vue'
import FgTabs from './components/layout/FgTabs.vue'
// 基础组件
import FormInput from './components/base/FormInput.vue'
import FormNumber from './components/base/FormNumber.vue'
import FormSelect from './components/base/FormSelect.vue'
import FormRadio from './components/base/FormRadio.vue'
import FormCheckbox from './components/base/FormCheckbox.vue'
import FormDate from './components/base/FormDate.vue'
import FormDateRange from './components/base/FormDateRange.vue'
import FormTextarea from './components/base/FormTextarea.vue'
import FormRichText from './components/base/FormRichText.vue'
// 业务组件
import FgSchemaButtonList from './components/business/FgSchemaButtonList.vue'
import FgDialog from './components/business/FgDialog.vue'
import FgUpload from './components/business/FgUpload.vue'
import FgTable from './components/business/FgTable.vue'
import FgPagination from './components/business/FgPagination.vue'
import FgFileList from './components/business/FgFileList.vue'
import FgFilePreview from './components/business/FgFilePreview.vue'
import FgPersonSelect from './components/business/FgPersonSelect.vue'
import FgDeptSelect from './components/business/FgDeptSelect.vue'
import FgTransfer from './components/business/FgTransfer.vue'
import FgDetailForm from './components/business/FgDetailForm.vue'
import FgBanner from './components/business/FgBanner.vue'
import FgTreeLayout from './components/business/FgTreeLayout.vue'
import FgDateTimeSlot from './components/business/FgDateTimeSlot.vue'
import FgToolbarButtons from './components/business/FgToolbarButtons.vue'
import FgSearchList from './components/business/FgSearchList.vue'
import FgEditableTable from './components/business/FgEditableTable.vue'

export const compMap: Record<SchemaType, Component> = {
  // 布局组件
  page: FgPage,
  toolbar: FgToolbar,
  card: FgCard,
  title: FgTitle,
  divider: FgDivider,
  spacer: FgSpacer,
  steps: FgSteps,
  tabs: FgTabs,
  // 基础组件
  input: FormInput,
  number: FormNumber,
  select: FormSelect,
  radio: FormRadio,
  checkbox: FormCheckbox,
  date: FormDate,
  'date-range': FormDateRange,
  textarea: FormTextarea,
  richtext: FormRichText,
  // 业务组件
  'button-list': FgSchemaButtonList,
  dialog: FgDialog,
  upload: FgUpload,
  table: FgTable,
  pagination: FgPagination,
  'file-list': FgFileList,
  'file-preview': FgFilePreview,
  'person-select': FgPersonSelect,
  'dept-select': FgDeptSelect,
  transfer: FgTransfer,
  'detail-form': FgDetailForm,
  banner: FgBanner,
  'tree-layout': FgTreeLayout,
  'date-time-slot': FgDateTimeSlot,
  'toolbar-buttons': FgToolbarButtons,
  'search-list': FgSearchList,
  'editable-table': FgEditableTable,
  // 栅格布局（SchemaRender 内置，不在 compMap 中使用）
  'grid-row': FgPage,  // placeholder — never rendered via compMap
  'grid-col': FgPage,  // placeholder — never rendered via compMap
}
