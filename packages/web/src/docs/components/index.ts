import type { ComponentDoc } from './types'

import gridRow from './grid-row'
import gridCol from './grid-col'
import page from './page'
import toolbar from './toolbar'
import card from './card'
import title from './title'
import divider from './divider'
import spacer from './spacer'
import input from './input'
import number from './number'
import select from './select'
import radio from './radio'
import checkbox from './checkbox'
import date from './date'
import dateRange from './date-range'
import textarea from './textarea'
import richtext from './richtext'
import buttonList from './button-list'
import upload from './upload'
import table from './table'
import pagination from './pagination'
import fileList from './file-list'
import personSelect from './person-select'
import deptSelect from './dept-select'
import transfer from './transfer'
import detailForm from './detail-form'
import banner from './banner'
import treeLayout from './tree-layout'
import dateTimeSlot from './date-time-slot'
import dialog from './dialog'
import toolbarButtons from './toolbar-buttons'
import steps from './steps'
import tabs from './tabs'
import filePreview from './file-preview'
import searchList from './search-list'
import editableTable from './editable-table'
import formContainer from './form-container'
import workflowForm from './workflow-form'
import linkage from './linkage'

export type { ComponentDoc, PropDoc, EventDoc, SlotDoc, ExposeDoc, SchemaExample } from './types'

export const componentDocs: ComponentDoc[] = [
  gridRow,
  gridCol,
  page,
  toolbar,
  card,
  title,
  divider,
  spacer,
  steps,
  tabs,
  input,
  number,
  select,
  radio,
  checkbox,
  date,
  dateRange,
  textarea,
  richtext,
  buttonList,
  upload,
  table,
  pagination,
  fileList,
  filePreview,
  personSelect,
  deptSelect,
  transfer,
  detailForm,
  banner,
  treeLayout,
  dateTimeSlot,
  dialog,
  toolbarButtons,
  searchList,
  editableTable,
  formContainer,
  workflowForm,
  linkage,
]

export const categoryLabels: Record<string, string> = {
  layout: '布局组件',
  base: '基础表单组件',
  business: '业务组件'
}

export function getDocsByCategory(): Record<string, ComponentDoc[]> {
  const result: Record<string, ComponentDoc[]> = {}
  for (const doc of componentDocs) {
    if (!result[doc.category]) result[doc.category] = []
    result[doc.category].push(doc)
  }
  return result
}
