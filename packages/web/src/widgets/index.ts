import { registerWidget } from './registry'
import { FgForm, createFormWidget, formConfig } from './form'
import { FgCard, createCardWidget, cardConfig } from './card'
import { FgRowCol, createRowColWidget, rowColConfig } from './row-col'
import { FgTabs, createTabsWidget, tabsConfig } from './tabs'
import { FgDialog, createDialogWidget, dialogConfig } from './dialog'
import { FgInput, createInputWidget, inputConfig } from './input'
import { FgSelect, createSelectWidget, selectConfig } from './select'
import { FgNumber, createNumberWidget, numberConfig } from './number'
import { FgRadio, createRadioWidget, radioConfig } from './radio'
import { FgCheckbox, createCheckboxWidget, checkboxConfig } from './checkbox'
import { FgDate, createDateWidget, dateConfig } from './date'
import { FgTextarea, createTextareaWidget, textareaConfig } from './textarea'
import { FgButtonList, createButtonListWidget, buttonListConfig } from './button-list'
import { FgTitle, createTitleWidget, titleConfig } from './title'
import { FgDivider, createDividerWidget, dividerConfig } from './divider'
import { FgSpacer, createSpacerWidget, spacerConfig } from './spacer'
import { FgToolbarButtons, createToolbarButtonsWidget, toolbarButtonsConfig } from './toolbar-buttons'
import { FgButton, createButtonWidget, buttonConfig } from './button'
import { FgTable, createTableWidget, tableConfig } from './table'
import { FgRichtext, createRichtextWidget, richtextConfig } from './richtext'
import { FgUpload, createUploadWidget, uploadConfig } from './upload'
import { FgBanner, createBannerWidget, bannerConfig } from './banner'
import { FgTreeLayout, createTreeLayoutWidget, treeLayoutConfig } from './tree-layout'
import { FgDateTimeSlot, createDateTimeSlotWidget, dateTimeSlotConfig } from './date-time-slot'
import { FgFileList, createFileListWidget, fileListConfig } from './file-list'
import { FgTransfer, createTransferWidget, transferConfig } from './transfer'
import { FgDetailForm, createDetailFormWidget, detailFormConfig } from './detail-form'
import { FgSearchList, createSearchListWidget, searchListConfig } from './search-list'
import { FgEditableTable, createEditableTableWidget, editableTableConfig } from './editable-table'

export function registerAllWidgets() {
  // Container widgets
  registerWidget({
    name: formConfig.name,
    displayName: formConfig.displayName,
    type: 'form',
    group: 'container',
    component: FgForm,
    create: createFormWidget,
    config: formConfig,
  })

  registerWidget({
    name: cardConfig.name,
    displayName: cardConfig.displayName,
    type: 'card',
    group: 'container',
    component: FgCard,
    create: createCardWidget,
    config: cardConfig,
  })

  registerWidget({
    name: rowColConfig.name,
    displayName: rowColConfig.displayName,
    type: 'row-col',
    group: 'container',
    component: FgRowCol,
    create: createRowColWidget,
    config: rowColConfig,
  })

  registerWidget({
    name: tabsConfig.name,
    displayName: tabsConfig.displayName,
    type: 'tabs',
    group: 'container',
    component: FgTabs,
    create: createTabsWidget,
    config: tabsConfig,
  })

  registerWidget({
    name: dialogConfig.name,
    displayName: dialogConfig.displayName,
    type: 'dialog',
    group: 'container',
    component: FgDialog,
    create: createDialogWidget,
    config: dialogConfig,
  })

  // Basic widgets
  // Form widgets
  registerWidget({
    name: inputConfig.name,
    displayName: inputConfig.displayName,
    type: 'input',
    group: 'form',
    component: FgInput,
    create: createInputWidget,
    config: inputConfig,
  })

  registerWidget({
    name: selectConfig.name,
    displayName: selectConfig.displayName,
    type: 'select',
    group: 'form',
    component: FgSelect,
    create: createSelectWidget,
    config: selectConfig,
  })

  registerWidget({
    name: numberConfig.name,
    displayName: numberConfig.displayName,
    type: 'number',
    group: 'form',
    component: FgNumber,
    create: createNumberWidget,
    config: numberConfig,
  })

  registerWidget({
    name: radioConfig.name,
    displayName: radioConfig.displayName,
    type: 'radio',
    group: 'form',
    component: FgRadio,
    create: createRadioWidget,
    config: radioConfig,
  })

  registerWidget({
    name: checkboxConfig.name,
    displayName: checkboxConfig.displayName,
    type: 'checkbox',
    group: 'form',
    component: FgCheckbox,
    create: createCheckboxWidget,
    config: checkboxConfig,
  })

  registerWidget({
    name: dateConfig.name,
    displayName: dateConfig.displayName,
    type: 'date',
    group: 'form',
    component: FgDate,
    create: createDateWidget,
    config: dateConfig,
  })

  registerWidget({
    name: textareaConfig.name,
    displayName: textareaConfig.displayName,
    type: 'textarea',
    group: 'form',
    component: FgTextarea,
    create: createTextareaWidget,
    config: textareaConfig,
  })

  registerWidget({
    name: buttonListConfig.name,
    displayName: buttonListConfig.displayName,
    type: 'button-list',
    group: 'basic',
    component: FgButtonList,
    create: createButtonListWidget,
    config: buttonListConfig,
  })

  registerWidget({
    name: titleConfig.name,
    displayName: titleConfig.displayName,
    type: 'title',
    group: 'static',
    component: FgTitle,
    create: createTitleWidget,
    config: titleConfig,
  })

  registerWidget({
    name: dividerConfig.name,
    displayName: dividerConfig.displayName,
    type: 'divider',
    group: 'static',
    component: FgDivider,
    create: createDividerWidget,
    config: dividerConfig,
  })

  registerWidget({
    name: spacerConfig.name,
    displayName: spacerConfig.displayName,
    type: 'spacer',
    group: 'static',
    component: FgSpacer,
    create: createSpacerWidget,
    config: spacerConfig,
  })

  registerWidget({
    name: toolbarButtonsConfig.name,
    displayName: toolbarButtonsConfig.displayName,
    type: 'toolbar-buttons',
    group: 'basic',
    component: FgToolbarButtons,
    create: createToolbarButtonsWidget,
    config: toolbarButtonsConfig,
  })

  registerWidget({
    name: buttonConfig.name,
    displayName: buttonConfig.displayName,
    type: 'button',
    group: 'basic',
    component: FgButton,
    create: createButtonWidget,
    config: buttonConfig,
  })

  registerWidget({
    name: tableConfig.name,
    displayName: tableConfig.displayName,
    type: 'table',
    group: 'table',
    component: FgTable,
    create: createTableWidget,
    config: tableConfig,
  })

  // New widgets
  registerWidget({ name: richtextConfig.name, displayName: richtextConfig.displayName, type: 'richtext', group: 'form', component: FgRichtext, create: createRichtextWidget, config: richtextConfig })
  registerWidget({ name: uploadConfig.name, displayName: uploadConfig.displayName, type: 'upload', group: 'form', component: FgUpload, create: createUploadWidget, config: uploadConfig })
  registerWidget({ name: bannerConfig.name, displayName: bannerConfig.displayName, type: 'banner', group: 'static', component: FgBanner, create: createBannerWidget, config: bannerConfig })
  registerWidget({ name: treeLayoutConfig.name, displayName: treeLayoutConfig.displayName, type: 'tree-layout', group: 'basic', component: FgTreeLayout, create: createTreeLayoutWidget, config: treeLayoutConfig })
  registerWidget({ name: dateTimeSlotConfig.name, displayName: dateTimeSlotConfig.displayName, type: 'date-time-slot', group: 'form', component: FgDateTimeSlot, create: createDateTimeSlotWidget, config: dateTimeSlotConfig })
  registerWidget({ name: fileListConfig.name, displayName: fileListConfig.displayName, type: 'file-list', group: 'basic', component: FgFileList, create: createFileListWidget, config: fileListConfig })
  registerWidget({ name: transferConfig.name, displayName: transferConfig.displayName, type: 'transfer', group: 'basic', component: FgTransfer, create: createTransferWidget, config: transferConfig })
  registerWidget({ name: detailFormConfig.name, displayName: detailFormConfig.displayName, type: 'detail-form', group: 'basic', component: FgDetailForm, create: createDetailFormWidget, config: detailFormConfig })
  registerWidget({ name: searchListConfig.name, displayName: searchListConfig.displayName, type: 'search-list', group: 'table', component: FgSearchList, create: createSearchListWidget, config: searchListConfig })
  registerWidget({ name: editableTableConfig.name, displayName: editableTableConfig.displayName, type: 'editable-table', group: 'table', component: FgEditableTable, create: createEditableTableWidget, config: editableTableConfig })
}
