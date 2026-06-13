import { registerWidget } from './registry'
import { FgForm, createFormWidget, formConfig } from './form'
import { FgCard, createCardWidget, cardConfig } from './card'
import { FgTabs, createTabsWidget, tabsConfig } from './tabs'
import { FgDialog, createDialogWidget, dialogConfig } from './dialog'
import { FgInput, createInputWidget, inputConfig } from './input'
import { FgSelect, createSelectWidget, selectConfig } from './select'
import { FgNumber, createNumberWidget, numberConfig } from './number'
import { FgRadio, createRadioWidget, radioConfig } from './radio'
import { FgCheckbox, createCheckboxWidget, checkboxConfig } from './checkbox'
import { FgDate, createDateWidget, dateConfig } from './date'
import { FgTextarea, createTextareaWidget, textareaConfig } from './textarea'
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
import { FgTimePicker, createTimePickerWidget, timePickerConfig } from './time-picker'
import { FgCascader, createCascaderWidget, cascaderConfig } from './cascader'
import { FgColorPicker, createColorPickerWidget, colorPickerConfig } from './color-picker'
import { FgTagInput, createTagInputWidget, tagInputConfig } from './tag-input'
import { FgAutocomplete, createAutocompleteWidget, autocompleteConfig } from './autocomplete'
import { FgFileList, createFileListWidget, fileListConfig } from './file-list'
import { FgDescriptions, createDescriptionsWidget, descriptionsConfig } from './descriptions'
import { FgTransfer, createTransferWidget, transferConfig } from './transfer'
import { FgSearchList, createSearchListWidget, searchListConfig } from './search-list'
import { FgSwitch, createSwitchWidget, switchConfig } from './switch'
import { FgSlider, createSliderWidget, sliderConfig } from './slider'
import { FgRate, createRateWidget, rateConfig } from './rate'
import { FgEditableTable, createEditableTableWidget, editableTableConfig } from './editable-table'
import { FgBarChart, createBarChartWidget, barChartConfig } from './bar-chart'
import { FgLineChart, createLineChartWidget, lineChartConfig } from './line-chart'
import { FgPieChart, createPieChartWidget, pieChartConfig } from './pie-chart'
import { FgScatterChart, createScatterChartWidget, scatterChartConfig } from './scatter-chart'
import { FgRadar, createRadarWidget, radarConfig } from './radar'
import { FgGauge, createGaugeWidget, gaugeConfig } from './gauge'
import { FgHeatmap, createHeatmapWidget, heatmapConfig } from './heatmap'
import { FgFunnel, createFunnelWidget, funnelConfig } from './funnel'
import { FgCandlestick, createCandlestickWidget, candlestickConfig } from './candlestick'
import { FgStatistic, createStatisticWidget, statisticConfig } from './statistic'
import { FgSingleCol, createSingleColWidget, singleColConfig } from './single-col'
import { FgDoubleCol, createDoubleColWidget, doubleColConfig } from './double-col'
import { FgTripleCol, createTripleColWidget, tripleColConfig } from './triple-col'
import { FgQuadCol, createQuadColWidget, quadColConfig } from './quad-col'

export function registerAllWidgets() {
  // Layout widgets (结构布局)
  registerWidget({
    name: cardConfig.name,
    displayName: cardConfig.displayName,
    type: 'card',
    group: 'layout',
    component: FgCard,
    create: createCardWidget,
    config: cardConfig,
  })

  registerWidget({
    name: tabsConfig.name,
    displayName: tabsConfig.displayName,
    type: 'tabs',
    group: 'layout',
    component: FgTabs,
    create: createTabsWidget,
    config: tabsConfig,
  })

  registerWidget({
    name: singleColConfig.name,
    displayName: singleColConfig.displayName,
    type: 'single-col',
    group: 'layout',
    component: FgSingleCol,
    create: createSingleColWidget,
    config: singleColConfig,
  })

  registerWidget({
    name: doubleColConfig.name,
    displayName: doubleColConfig.displayName,
    type: 'double-col',
    group: 'layout',
    component: FgDoubleCol,
    create: createDoubleColWidget,
    config: doubleColConfig,
  })

  registerWidget({
    name: tripleColConfig.name,
    displayName: tripleColConfig.displayName,
    type: 'triple-col',
    group: 'layout',
    component: FgTripleCol,
    create: createTripleColWidget,
    config: tripleColConfig,
  })

  registerWidget({
    name: quadColConfig.name,
    displayName: quadColConfig.displayName,
    type: 'quad-col',
    group: 'layout',
    component: FgQuadCol,
    create: createQuadColWidget,
    config: quadColConfig,
  })

  registerWidget({
    name: dividerConfig.name,
    displayName: dividerConfig.displayName,
    type: 'divider',
    group: 'layout',
    component: FgDivider,
    create: createDividerWidget,
    config: dividerConfig,
  })

  registerWidget({
    name: spacerConfig.name,
    displayName: spacerConfig.displayName,
    type: 'spacer',
    group: 'layout',
    component: FgSpacer,
    create: createSpacerWidget,
    config: spacerConfig,
  })

  // Container widgets (容器)
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
    name: dialogConfig.name,
    displayName: dialogConfig.displayName,
    type: 'dialog',
    group: 'container',
    component: FgDialog,
    create: createDialogWidget,
    config: dialogConfig,
  })

  // Form widgets (表单控件)
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
    name: switchConfig.name,
    displayName: switchConfig.displayName,
    type: 'switch',
    group: 'form',
    component: FgSwitch,
    create: createSwitchWidget,
    config: switchConfig,
  })

  registerWidget({
    name: sliderConfig.name,
    displayName: sliderConfig.displayName,
    type: 'slider',
    group: 'form',
    component: FgSlider,
    create: createSliderWidget,
    config: sliderConfig,
  })

  registerWidget({
    name: rateConfig.name,
    displayName: rateConfig.displayName,
    type: 'rate',
    group: 'form',
    component: FgRate,
    create: createRateWidget,
    config: rateConfig,
  })

  registerWidget({ name: richtextConfig.name, displayName: richtextConfig.displayName, type: 'richtext', group: 'form', component: FgRichtext, create: createRichtextWidget, config: richtextConfig })
  registerWidget({ name: uploadConfig.name, displayName: uploadConfig.displayName, type: 'upload', group: 'form', component: FgUpload, create: createUploadWidget, config: uploadConfig })
  registerWidget({ name: dateTimeSlotConfig.name, displayName: dateTimeSlotConfig.displayName, type: 'date-time-slot', group: 'form', component: FgDateTimeSlot, create: createDateTimeSlotWidget, config: dateTimeSlotConfig })

  registerWidget({
    name: timePickerConfig.name,
    displayName: timePickerConfig.displayName,
    type: 'time-picker',
    group: 'form',
    component: FgTimePicker,
    create: createTimePickerWidget,
    config: timePickerConfig,
  })

  registerWidget({ name: cascaderConfig.name, displayName: cascaderConfig.displayName, type: 'cascader', group: 'form', component: FgCascader, create: createCascaderWidget, config: cascaderConfig })

  registerWidget({ name: colorPickerConfig.name, displayName: colorPickerConfig.displayName, type: 'color-picker', group: 'form', component: FgColorPicker, create: createColorPickerWidget, config: colorPickerConfig })

  registerWidget({ name: tagInputConfig.name, displayName: tagInputConfig.displayName, type: 'tag-input', group: 'form', component: FgTagInput, create: createTagInputWidget, config: tagInputConfig })

  registerWidget({ name: autocompleteConfig.name, displayName: autocompleteConfig.displayName, type: 'autocomplete', group: 'form', component: FgAutocomplete, create: createAutocompleteWidget, config: autocompleteConfig })

  // Static widgets (静态展示)
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
    name: bannerConfig.name,
    displayName: bannerConfig.displayName,
    type: 'banner',
    group: 'static',
    component: FgBanner,
    create: createBannerWidget,
    config: bannerConfig,
  })

  registerWidget({
    name: statisticConfig.name,
    displayName: statisticConfig.displayName,
    type: 'statistic',
    group: 'static',
    component: FgStatistic,
    create: createStatisticWidget,
    config: statisticConfig,
  })

  // Action widgets (操作按钮)
  registerWidget({
    name: toolbarButtonsConfig.name,
    displayName: toolbarButtonsConfig.displayName,
    type: 'toolbar-buttons',
    group: 'action',
    component: FgToolbarButtons,
    create: createToolbarButtonsWidget,
    config: toolbarButtonsConfig,
  })

  registerWidget({
    name: buttonConfig.name,
    displayName: buttonConfig.displayName,
    type: 'button',
    group: 'action',
    component: FgButton,
    create: createButtonWidget,
    config: buttonConfig,
  })

  // Business widgets (业务组件)
  registerWidget({ name: treeLayoutConfig.name, displayName: treeLayoutConfig.displayName, type: 'tree-layout', group: 'business', component: FgTreeLayout, create: createTreeLayoutWidget, config: treeLayoutConfig })
  registerWidget({ name: fileListConfig.name, displayName: fileListConfig.displayName, type: 'file-list', group: 'business', component: FgFileList, create: createFileListWidget, config: fileListConfig })
  registerWidget({ name: transferConfig.name, displayName: transferConfig.displayName, type: 'transfer', group: 'business', component: FgTransfer, create: createTransferWidget, config: transferConfig })
  registerWidget({ name: descriptionsConfig.name, displayName: descriptionsConfig.displayName, type: 'descriptions', group: 'business', component: FgDescriptions, create: createDescriptionsWidget, config: descriptionsConfig })

  // Table widgets (表格)
  registerWidget({ name: tableConfig.name, displayName: tableConfig.displayName, type: 'table', group: 'table', component: FgTable, create: createTableWidget, config: tableConfig })
  registerWidget({ name: searchListConfig.name, displayName: searchListConfig.displayName, type: 'search-list', group: 'table', component: FgSearchList, create: createSearchListWidget, config: searchListConfig })
  registerWidget({ name: editableTableConfig.name, displayName: editableTableConfig.displayName, type: 'editable-table', group: 'table', component: FgEditableTable, create: createEditableTableWidget, config: editableTableConfig })

  // Chart widgets (图表)
  registerWidget({ name: barChartConfig.name, displayName: barChartConfig.displayName, type: 'bar-chart', group: 'chart', component: FgBarChart, create: createBarChartWidget, config: barChartConfig })
  registerWidget({ name: lineChartConfig.name, displayName: lineChartConfig.displayName, type: 'line-chart', group: 'chart', component: FgLineChart, create: createLineChartWidget, config: lineChartConfig })
  registerWidget({ name: pieChartConfig.name, displayName: pieChartConfig.displayName, type: 'pie-chart', group: 'chart', component: FgPieChart, create: createPieChartWidget, config: pieChartConfig })
  registerWidget({ name: scatterChartConfig.name, displayName: scatterChartConfig.displayName, type: 'scatter-chart', group: 'chart', component: FgScatterChart, create: createScatterChartWidget, config: scatterChartConfig })
  registerWidget({ name: radarConfig.name, displayName: radarConfig.displayName, type: 'radar', group: 'chart', component: FgRadar, create: createRadarWidget, config: radarConfig })
  registerWidget({ name: gaugeConfig.name, displayName: gaugeConfig.displayName, type: 'gauge', group: 'chart', component: FgGauge, create: createGaugeWidget, config: gaugeConfig })
  registerWidget({ name: heatmapConfig.name, displayName: heatmapConfig.displayName, type: 'heatmap', group: 'chart', component: FgHeatmap, create: createHeatmapWidget, config: heatmapConfig })
  registerWidget({ name: funnelConfig.name, displayName: funnelConfig.displayName, type: 'funnel', group: 'chart', component: FgFunnel, create: createFunnelWidget, config: funnelConfig })
  registerWidget({ name: candlestickConfig.name, displayName: candlestickConfig.displayName, type: 'candlestick', group: 'chart', component: FgCandlestick, create: createCandlestickWidget, config: candlestickConfig })
}
