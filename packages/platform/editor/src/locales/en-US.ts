/**
 * FormGrid English language pack
 * Key naming: component.action.description
 */
const enUS: Record<string, string> = {
  // ---- Table FgTable ----
  'table.emptyText': 'No data',
  'table.index': '#',
  'table.action': 'Actions',
  'table.action.add': 'Add',
  'table.action.copy': 'Copy',
  'table.action.delete': 'Delete',
  'table.confirm.title': 'Confirm',
  'table.confirm.confirm': 'OK',
  'table.confirm.cancel': 'Cancel',
  'table.validate.notEmpty': '{label} cannot be empty',
  'table.validate.invalidFormat': '{label} format is invalid',

  // ---- Pagination FgPagination ----
  'pagination.total': 'Total {total}',
  'pagination.jumper': 'Go to',
  'pagination.page': 'page',

  // ---- Steps FgSteps ----
  'steps.prev': 'Previous',
  'steps.next': 'Next',
  'steps.validate.warning': 'Please complete the required fields in this step first',

  // ---- Common validation ----
  'validation.required': 'Please fill in {label}',

  // ---- Common confirmations ----
  'confirm.delete': 'Delete {name}?',
  'confirm.action': 'Confirm this action?',

  // ---- Loading / Error ----
  'message.loadFailed': 'Failed to load data',
  'message.transformFailed': 'Data transformation failed',
}

export default enUS
