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
    group: 'basic',
    component: FgTitle,
    create: createTitleWidget,
    config: titleConfig,
  })

  registerWidget({
    name: dividerConfig.name,
    displayName: dividerConfig.displayName,
    type: 'divider',
    group: 'basic',
    component: FgDivider,
    create: createDividerWidget,
    config: dividerConfig,
  })

  registerWidget({
    name: spacerConfig.name,
    displayName: spacerConfig.displayName,
    type: 'spacer',
    group: 'basic',
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
}
