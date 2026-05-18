// FormGrid 组件库 barrel export
export { default as FormGrid } from './index.vue'
export { default as SchemaRender } from './SchemaRender.vue'
export { compMap } from './compMap'
export type {
  SchemaType,
  FormSchemaItem,
  FormGridContext,
  UserContext,
  RequestContext,
  GlobalContext,
  SchemaApiConfig,
  SchemaAction,
  ActionType,
  SchemaButtonConfig,
  FormFieldValue,
  FormData,
  DictItem,
  ComponentProps,
  SchemaRules,
  ActionPayload,
  ActionEmitFn,
  FormGridApi,
  FormGridProps,
  FormLifecycleConfig,
  LoadApiConfig,
  LinkageType,
  SchemaLinkage,
  LinkageState,
  ResponsiveSpan,
  TableColumnSchema,
  TableRowAction,
  EditableTableColumn,
  ListApiConfig,
  SearchFieldSchema,
  SearchListColumnSchema,
  SearchListRowAction,
  FormGridLocale,
  TranslateFn,
} from './types'
export {
  FORM_GRID_CONTEXT_KEY,
  FORM_GRID_FORM_KEY,
  FORM_GRID_API_KEY,
  ACTION_EMIT_KEY,
  FORM_GRID_LINKAGE_KEY,
  FORM_GRID_T_KEY,
  FULL_WIDTH_TYPES,
  isFullWidthType,
} from './types'

// ---- 布局组件 (layout/) ----
export { default as FgPage } from './components/layout/FgPage.vue'
export { default as FgToolbar } from './components/layout/FgToolbar.vue'
export { default as FgCard } from './components/layout/FgCard.vue'
export { default as FgTitle } from './components/layout/FgTitle.vue'
export { default as FgDivider } from './components/layout/FgDivider.vue'
export { default as FgSpacer } from './components/layout/FgSpacer.vue'
export { default as FgSteps } from './components/layout/FgSteps.vue'
export { default as FgTabs } from './components/layout/FgTabs.vue'

// ---- 基础表单组件 (base/) ----
export { default as FormInput } from './components/base/FormInput.vue'
export { default as FormNumber } from './components/base/FormNumber.vue'
export { default as FormSelect } from './components/base/FormSelect.vue'
export { default as FormRadio } from './components/base/FormRadio.vue'
export { default as FormCheckbox } from './components/base/FormCheckbox.vue'
export { default as FormDate } from './components/base/FormDate.vue'
export { default as FormDateRange } from './components/base/FormDateRange.vue'
export { default as FormTextarea } from './components/base/FormTextarea.vue'
export { default as FormRichText } from './components/base/FormRichText.vue'

// ---- 业务组件 (business/) ----
export { default as FgDialog } from './components/business/FgDialog.vue'
export { default as FgPagination } from './components/business/FgPagination.vue'
export { default as FgBanner } from './components/business/FgBanner.vue'
export { default as FgButtonList } from './components/business/FgButtonList.vue'
export { default as FgTransfer } from './components/business/FgTransfer.vue'
export { default as FgTable } from './components/business/FgTable.vue'
export { default as FgFileList } from './components/business/FgFileList.vue'
export { default as FgPersonSelect } from './components/business/FgPersonSelect.vue'
export { default as FgDetailForm } from './components/business/FgDetailForm.vue'
export { default as FgFormContainer } from './components/business/FgFormContainer.vue'
export { default as FgUpload } from './components/business/FgUpload.vue'
export { default as FgDeptSelect } from './components/business/FgDeptSelect.vue'
export { default as FgTreeLayout } from './components/business/FgTreeLayout.vue'
export { default as FgWorkflowForm } from './components/business/FgWorkflowForm.vue'
export { default as FgDateTimeSlot } from './components/business/FgDateTimeSlot.vue'
export { default as FgSchemaButtonList } from './components/business/FgSchemaButtonList.vue'
export { default as FgToolbarButtons } from './components/business/FgToolbarButtons.vue'
export { default as FgSearchList } from './components/business/FgSearchList.vue'
export { default as FgFilePreview } from './components/business/FgFilePreview.vue'
export { default as FgEditableTable } from './components/business/FgEditableTable.vue'
