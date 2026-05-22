/**
 * schemaValidate unit tests
 *
 * Covers:
 * - Empty schema passes validation
 * - Invalid type detected
 * - Duplicate field names detected
 * - Empty container warning
 * - Deep nesting warning (> 5 levels)
 * - Missing field on non-layout component
 * - 'search-list' type is valid and in NO_FIELD_TYPES
 */
import { describe, it, expect } from 'vitest'
import { validateSchema } from '@/utils/schemaValidate'
import type { FormSchemaItem } from '@/components/FormGrid/types'

describe('validateSchema', () => {
  // ---------- empty schema ----------

  it('passes validation for empty schema', () => {
    const result = validateSchema([])
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  // ---------- valid schema ----------

  it('passes validation for a valid simple schema', () => {
    const schema: FormSchemaItem[] = [
      {
        type: 'grid-row',
        children: [
          {
            type: 'grid-col',
            span: 24,
            children: [{ type: 'input', field: 'name', label: 'Name' }],
          },
        ],
      },
    ]
    const result = validateSchema(schema)
    expect(result.valid).toBe(true)
  })

  // ---------- invalid type ----------

  it('detects invalid type', () => {
    const schema: FormSchemaItem[] = [
      { type: 'bogus-type' as never, field: 'test' },
    ]
    const result = validateSchema(schema)
    expect(result.valid).toBe(false)
    const typeErrors = result.errors.filter((e) => e.type === 'invalid-type')
    expect(typeErrors).toHaveLength(1)
    expect(typeErrors[0].message).toContain('bogus-type')
    expect(typeErrors[0].severity).toBe('error')
  })

  // ---------- duplicate field names ----------

  it('detects duplicate field names', () => {
    const schema: FormSchemaItem[] = [
      { type: 'input', field: 'email', label: 'Email' },
      { type: 'input', field: 'email', label: '确认邮箱' },
    ]
    const result = validateSchema(schema)
    expect(result.valid).toBe(false)
    const dupErrors = result.errors.filter((e) => e.type === 'duplicate-field')
    expect(dupErrors).toHaveLength(1)
    expect(dupErrors[0].message).toContain('email')
    expect(dupErrors[0].message).toContain('2 times')
  })

  it('detects duplicate field names across nested levels', () => {
    const schema: FormSchemaItem[] = [
      { type: 'input', field: 'shared', label: 'Top level' },
      {
        type: 'card',
        children: [{ type: 'input', field: 'shared', label: 'Nested' }],
      },
    ]
    const result = validateSchema(schema)
    const dupErrors = result.errors.filter((e) => e.type === 'duplicate-field')
    expect(dupErrors).toHaveLength(1)
  })

  it('does not report duplicates for unique fields', () => {
    const schema: FormSchemaItem[] = [
      { type: 'input', field: 'firstName', label: 'First Name' },
      { type: 'input', field: 'lastName', label: 'Last Name' },
      { type: 'number', field: 'age', label: 'Age' },
    ]
    const result = validateSchema(schema)
    const dupErrors = result.errors.filter((e) => e.type === 'duplicate-field')
    expect(dupErrors).toHaveLength(0)
  })

  // ---------- empty container ----------

  it('warns about empty container', () => {
    const schema: FormSchemaItem[] = [
      { type: 'card', label: 'Empty Card', children: [] },
    ]
    const result = validateSchema(schema)
    const emptyErrors = result.errors.filter((e) => e.type === 'empty-container')
    expect(emptyErrors).toHaveLength(1)
    expect(emptyErrors[0].severity).toBe('warning')
    expect(emptyErrors[0].message).toContain('card')
  })

  it('warns about container with no children at all', () => {
    const schema: FormSchemaItem[] = [
      { type: 'card', label: 'No Kids Card' },
    ]
    const result = validateSchema(schema)
    const emptyErrors = result.errors.filter((e) => e.type === 'empty-container')
    expect(emptyErrors).toHaveLength(1)
  })

  it('does not warn for container with children', () => {
    const schema: FormSchemaItem[] = [
      {
        type: 'card',
        label: 'Populated Card',
        children: [{ type: 'input', field: 'inner', label: 'Inner' }],
      },
    ]
    const result = validateSchema(schema)
    const emptyErrors = result.errors.filter((e) => e.type === 'empty-container')
    expect(emptyErrors).toHaveLength(0)
  })

  // ---------- deep nesting ----------

  it('warns about deep nesting exceeding 5 levels', () => {
    // Build a schema with 7 levels of nesting
    const deepItem: FormSchemaItem = { type: 'input', field: 'deep', label: 'Deep' }
    let schema: FormSchemaItem[] = [deepItem]

    for (let i = 0; i < 7; i++) {
      schema = [{ type: 'card', label: `Level ${i}`, children: schema }]
    }

    const result = validateSchema(schema)
    const nestingErrors = result.errors.filter((e) => e.type === 'deep-nesting')
    expect(nestingErrors.length).toBeGreaterThan(0)
    expect(nestingErrors[0].severity).toBe('warning')
  })

  it('does not warn for depth exactly at 5 levels', () => {
    // Build a schema with exactly 5 levels
    const leaf: FormSchemaItem = { type: 'input', field: 'ok', label: 'Ok' }
    let schema: FormSchemaItem[] = [leaf]

    for (let i = 0; i < 5; i++) {
      schema = [{ type: 'card', label: `Level ${i}`, children: schema }]
    }

    const result = validateSchema(schema)
    const nestingErrors = result.errors.filter((e) => e.type === 'deep-nesting')
    expect(nestingErrors).toHaveLength(0)
  })

  // ---------- missing field on non-layout component ----------

  it('detects missing field on non-layout component', () => {
    const schema: FormSchemaItem[] = [
      { type: 'input', label: 'Name (missing field)' },
    ]
    const result = validateSchema(schema)
    expect(result.valid).toBe(false)
    const missingErrors = result.errors.filter((e) => e.type === 'missing-field')
    expect(missingErrors).toHaveLength(1)
    expect(missingErrors[0].message).toContain('input')
  })

  it('does not require field on layout type (grid-row)', () => {
    const schema: FormSchemaItem[] = [
      {
        type: 'grid-row',
        children: [{ type: 'grid-col', span: 12, children: [] }],
      },
    ]
    const result = validateSchema(schema)
    const missingErrors = result.errors.filter((e) => e.type === 'missing-field')
    expect(missingErrors).toHaveLength(0)
  })

  it('does not require field on button-list', () => {
    const schema: FormSchemaItem[] = [
      { type: 'button-list', buttons: [{ text: 'Submit' }] },
    ]
    const result = validateSchema(schema)
    const missingErrors = result.errors.filter((e) => e.type === 'missing-field')
    expect(missingErrors).toHaveLength(0)
  })

  // ---------- 'search-list' type ----------

  it('accepts search-list as a valid type without requiring a field', () => {
    const schema: FormSchemaItem[] = [
      {
        type: 'search-list',
        listApi: { url: '/api/list' },
      },
    ]
    const result = validateSchema(schema)
    // No invalid-type error
    const typeErrors = result.errors.filter((e) => e.type === 'invalid-type')
    expect(typeErrors).toHaveLength(0)
    // No missing-field error (search-list is in NO_FIELD_TYPES)
    const missingErrors = result.errors.filter((e) => e.type === 'missing-field')
    expect(missingErrors).toHaveLength(0)
  })

  // ---------- steps and tabs ----------

  it('accepts steps as a valid type without requiring a field', () => {
    const schema: FormSchemaItem[] = [
      {
        type: 'steps',
        children: [{ type: 'input', field: 'step1', label: 'Step 1' }],
      },
    ]
    const result = validateSchema(schema)
    const typeErrors = result.errors.filter((e) => e.type === 'invalid-type')
    expect(typeErrors).toHaveLength(0)
    const missingErrors = result.errors.filter((e) => e.type === 'missing-field')
    expect(missingErrors).toHaveLength(0)
  })

  it('accepts tabs as a valid type without requiring a field', () => {
    const schema: FormSchemaItem[] = [
      {
        type: 'tabs',
        children: [{ type: 'input', field: 'tab1', label: 'Tab 1' }],
      },
    ]
    const result = validateSchema(schema)
    const typeErrors = result.errors.filter((e) => e.type === 'invalid-type')
    expect(typeErrors).toHaveLength(0)
    const missingErrors = result.errors.filter((e) => e.type === 'missing-field')
    expect(missingErrors).toHaveLength(0)
  })

  // ---------- nesting violation ----------

  it('detects basic component nested inside business component', () => {
    // upload is business, input is basic
    const schema: FormSchemaItem[] = [
      {
        type: 'upload',
        field: 'files',
        label: 'Files',
        children: [
          { type: 'input', field: 'desc', label: 'Description' },
        ],
      },
    ]
    const result = validateSchema(schema)
    const nestingErrors = result.errors.filter((e) => e.type === 'nesting-violation')
    expect(nestingErrors).toHaveLength(1)
    expect(nestingErrors[0].severity).toBe('error')
    expect(nestingErrors[0].message).toContain('upload')
    expect(nestingErrors[0].message).toContain('input')
  })

  it('detects business component nested inside basic component', () => {
    // button-list is basic, upload is business
    const schema: FormSchemaItem[] = [
      {
        type: 'button-list',
        buttons: [{ text: 'Submit' }],
        children: [
          { type: 'upload', field: 'file', label: 'File' },
        ],
      },
    ]
    const result = validateSchema(schema)
    const nestingErrors = result.errors.filter((e) => e.type === 'nesting-violation')
    expect(nestingErrors).toHaveLength(1)
    expect(nestingErrors[0].severity).toBe('error')
    expect(nestingErrors[0].message).toContain('button-list')
    expect(nestingErrors[0].message).toContain('upload')
  })

  it('allows basic components nested inside layout containers', () => {
    const schema: FormSchemaItem[] = [
      {
        type: 'card',
        children: [
          { type: 'input', field: 'name', label: 'Name' },
          { type: 'select', field: 'status', label: 'Status' },
        ],
      },
    ]
    const result = validateSchema(schema)
    const nestingErrors = result.errors.filter((e) => e.type === 'nesting-violation')
    expect(nestingErrors).toHaveLength(0)
  })

  it('allows business components nested inside layout containers', () => {
    const schema: FormSchemaItem[] = [
      {
        type: 'card',
        children: [
          { type: 'upload', field: 'file', label: 'File' },
          { type: 'file-list', field: 'files', label: 'Files' },
        ],
      },
    ]
    const result = validateSchema(schema)
    const nestingErrors = result.errors.filter((e) => e.type === 'nesting-violation')
    expect(nestingErrors).toHaveLength(0)
  })

  it('allows mixed basic and business inside layout containers', () => {
    const schema: FormSchemaItem[] = [
      {
        type: 'grid-row',
        children: [
          { type: 'input', field: 'name', label: 'Name' },
          { type: 'upload', field: 'file', label: 'File' },
        ],
      },
    ]
    const result = validateSchema(schema)
    const nestingErrors = result.errors.filter((e) => e.type === 'nesting-violation')
    expect(nestingErrors).toHaveLength(0)
  })

  it('detects nesting violations in deeply nested structures', () => {
    const schema: FormSchemaItem[] = [
      {
        type: 'card',
        children: [
          {
            type: 'upload',
            field: 'files',
            label: 'Files',
            children: [
              { type: 'input', field: 'desc', label: 'Desc' },
            ],
          },
        ],
      },
    ]
    const result = validateSchema(schema)
    const nestingErrors = result.errors.filter((e) => e.type === 'nesting-violation')
    expect(nestingErrors).toHaveLength(1)
  })

  it('allows same-category nesting (basic inside basic)', () => {
    const schema: FormSchemaItem[] = [
      {
        type: 'table',
        field: 'tbl',
        label: 'Table',
        children: [
          { type: 'input', field: 'cell', label: 'Cell' },
        ],
      },
    ]
    const result = validateSchema(schema)
    const nestingErrors = result.errors.filter((e) => e.type === 'nesting-violation')
    expect(nestingErrors).toHaveLength(0)
  })

  it('allows same-category nesting (business inside business)', () => {
    const schema: FormSchemaItem[] = [
      {
        type: 'detail-form',
        field: 'detail',
        label: 'Detail',
        children: [
          { type: 'upload', field: 'file', label: 'File' },
        ],
      },
    ]
    const result = validateSchema(schema)
    const nestingErrors = result.errors.filter((e) => e.type === 'nesting-violation')
    expect(nestingErrors).toHaveLength(0)
  })
})
