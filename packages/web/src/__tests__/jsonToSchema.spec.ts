/**
 * jsonToSchema unit tests
 *
 * Covers:
 * - inferFieldsFromJson with flat object, nested object, array of objects
 * - inferFieldsFromJson with string -> date, select, textarea inference
 * - inferFieldsFromJson with boolean -> radio, number -> number
 * - fieldNameToLabel conversions (snake_case, camelCase, PascalCase)
 * - fieldInferencesToSchema generates correct FormSchemaItem[]
 * - fieldInferencesToSchema handles nested objects as card containers
 * - generateFormDataMapping extracts field -> value mapping
 */
import { describe, it, expect } from 'vitest'
import {
  inferFieldsFromJson,
  fieldNameToLabel,
  fieldInferencesToSchema,
  generateFormDataMapping,
} from '@/utils/jsonToSchema'
import type { FormSchemaItem } from '@/components/FormGrid/types'

describe('jsonToSchema', () => {
  // ======== inferFieldsFromJson ========

  describe('inferFieldsFromJson', () => {
    it('infers fields from a flat object', () => {
      const json = {
        name: 'Alice',
        age: 30,
        active: true,
      }
      const result = inferFieldsFromJson(json)
      expect(result).toHaveLength(3)

      const nameField = result.find((f) => f.field === 'name')
      expect(nameField).toBeDefined()
      expect(nameField!.type).toBe('input')
      expect(nameField!.label).toBe('Name')
      expect(nameField!.sample).toBe('Alice')

      const ageField = result.find((f) => f.field === 'age')
      expect(ageField).toBeDefined()
      expect(ageField!.type).toBe('number')

      const activeField = result.find((f) => f.field === 'active')
      expect(activeField).toBeDefined()
      expect(activeField!.type).toBe('radio')
    })

    it('infers fields from a nested object (1 level)', () => {
      const json = {
        user: {
          name: 'Bob',
          email: 'bob@test.com',
        },
        status: 'active',
      }
      const result = inferFieldsFromJson(json)

      // Should have: user (card), user.name (nested), user.email (nested), status (select)
      expect(result.length).toBeGreaterThanOrEqual(4)

      const userField = result.find((f) => f.field === 'user')
      expect(userField).toBeDefined()
      expect(userField!.type).toBe('card')
      expect(userField!.isObject).toBe(true)

      const nestedName = result.find((f) => f.field === 'user.name')
      expect(nestedName).toBeDefined()
      expect(nestedName!.type).toBe('input')
    })

    it('infers fields from an array of objects', () => {
      const json = [
        { id: 1, title: 'Item 1' },
        { id: 2, title: 'Item 2' },
      ]
      const result = inferFieldsFromJson(json)
      const idField = result.find((f) => f.field === 'id')
      expect(idField).toBeDefined()
      expect(idField!.type).toBe('number')
    })

    it('handles empty array gracefully', () => {
      const result = inferFieldsFromJson([])
      expect(result).toHaveLength(0)
    })

    it('handles null gracefully', () => {
      const result = inferFieldsFromJson(null)
      expect(result).toHaveLength(0)
    })

    it('handles primitive value gracefully', () => {
      const result = inferFieldsFromJson(42)
      expect(result).toHaveLength(0)
    })

    // ------ string type inference ------

    it('infers date type for date-like field names', () => {
      const json = {
        created_at: '2024-01-15',
        birthDate: '1990-06-20',
      }
      const result = inferFieldsFromJson(json)
      const createdField = result.find((f) => f.field === 'created_at')
      expect(createdField!.type).toBe('date')
      const birthField = result.find((f) => f.field === 'birthDate')
      expect(birthField!.type).toBe('date')
    })

    it('infers select type for status-like field names', () => {
      const json = {
        status: 'active',
        type: 'admin',
        category: 'tech',
        level: 'senior',
        gender: 'male',
        role: 'manager',
      }
      const result = inferFieldsFromJson(json)
      for (const field of result) {
        expect(field.type).toBe('select')
      }
    })

    it('infers textarea type for long text', () => {
      const json = {
        description: 'A'.repeat(150),
      }
      const result = inferFieldsFromJson(json)
      const descField = result.find((f) => f.field === 'description')
      expect(descField!.type).toBe('textarea')
    })

    it('infers textarea type for field names containing desc/content/remark/note', () => {
      const json = {
        description: 'short',
        content: 'hello',
        remark: 'note',
        notes: 'memo',
      }
      const result = inferFieldsFromJson(json)
      for (const field of result) {
        expect(field.type).toBe('textarea')
      }
    })

    it('infers input for email/url/link field names', () => {
      const json = {
        email: 'test@test.com',
        url: 'https://example.com',
        link: '/path',
      }
      const result = inferFieldsFromJson(json)
      for (const field of result) {
        expect(field.type).toBe('input')
      }
    })

    it('infers table for array of objects', () => {
      const json = {
        items: [
          { name: 'a', qty: 1 },
          { name: 'b', qty: 2 },
        ],
      }
      const result = inferFieldsFromJson(json)
      const itemsField = result.find((f) => f.field === 'items')
      expect(itemsField).toBeDefined()
      expect(itemsField!.type).toBe('table')
      expect(itemsField!.isArray).toBe(true)
    })

    it('infers select for array of primitives', () => {
      const json = {
        tags: ['vue', 'typescript'],
      }
      const result = inferFieldsFromJson(json)
      const tagsField = result.find((f) => f.field === 'tags')
      expect(tagsField).toBeDefined()
      expect(tagsField!.type).toBe('select')
    })

    it('infers input for null/undefined values', () => {
      const json = {
        nickname: null,
        comment: undefined,
      }
      const result = inferFieldsFromJson(json)
      expect(result).toHaveLength(2)
      for (const field of result) {
        expect(field.type).toBe('input')
      }
    })
  })

  // ======== fieldNameToLabel ========

  describe('fieldNameToLabel', () => {
    it('converts snake_case to Title Case', () => {
      expect(fieldNameToLabel('user_name')).toBe('User Name')
      expect(fieldNameToLabel('created_at')).toBe('Created At')
      expect(fieldNameToLabel('dept_id')).toBe('Dept Id')
    })

    it('converts camelCase to Title Case', () => {
      expect(fieldNameToLabel('userName')).toBe('User Name')
      expect(fieldNameToLabel('firstName')).toBe('First Name')
      expect(fieldNameToLabel('deptId')).toBe('Dept Id')
    })

    it('converts UPPER_SNAKE_CASE to Title Case', () => {
      expect(fieldNameToLabel('CREATED_AT')).toBe('Created At')
      expect(fieldNameToLabel('MAX_SIZE')).toBe('Max Size')
    })

    it('converts PascalCase to Title Case', () => {
      expect(fieldNameToLabel('UserName')).toBe('User Name')
      expect(fieldNameToLabel('FirstName')).toBe('First Name')
    })

    it('handles mixed separators', () => {
      expect(fieldNameToLabel('user-details_v2')).toBe('User Details V2')
    })

    it('handles single word', () => {
      expect(fieldNameToLabel('name')).toBe('Name')
      expect(fieldNameToLabel('EMAIL')).toBe('Email')
    })
  })

  // ======== fieldInferencesToSchema ========

  describe('fieldInferencesToSchema', () => {
    it('generates correct FormSchemaItem[] from flat inferences', () => {
      const inferences = inferFieldsFromJson({
        name: 'Alice',
        age: 30,
        active: true,
      })
      const schema = fieldInferencesToSchema(inferences)

      expect(schema).toHaveLength(3)
      expect(schema[0]).toMatchObject({ type: 'input', field: 'name', label: 'Name' })
      expect(schema[1]).toMatchObject({ type: 'number', field: 'age', label: 'Age' })
      expect(schema[2]).toMatchObject({ type: 'radio', field: 'active', label: 'Active' })
    })

    it('handles nested objects as card containers', () => {
      const json = {
        name: 'Alice',
        profile: {
          phone: '12345',
          address: '123 Main St',
        },
      }
      const inferences = inferFieldsFromJson(json)
      const schema = fieldInferencesToSchema(inferences)

      // Should have: name (input), profile (card) with children
      const profileItem = schema.find((s) => s.field === 'profile') as FormSchemaItem
      expect(profileItem).toBeDefined()
      expect(profileItem.type).toBe('card')
      expect(profileItem.children).toBeDefined()
      expect(profileItem.children!).toHaveLength(2)
      // Children should be nested fields
      const childFields = profileItem.children!.map((c) => c.field)
      expect(childFields).toContain('profile.phone')
      expect(childFields).toContain('profile.address')
    })

    it('handles table items with special label', () => {
      const json = {
        rows: [
          { col1: 'a', col2: 'b' },
        ],
      }
      const inferences = inferFieldsFromJson(json)
      const schema = fieldInferencesToSchema(inferences)

      const tableItem = schema.find((s) => s.field === 'rows')
      expect(tableItem).toBeDefined()
      expect(tableItem!.type).toBe('table')
      expect(tableItem!.label).toContain('(Table)')
    })

    it('skips nested fields that are not cards (no duplicate processing)', () => {
      const json = {
        profile: {
          phone: '12345',
        },
      }
      const inferences = inferFieldsFromJson(json)
      const schema = fieldInferencesToSchema(inferences)

      // Should have profile (card) but not profile.phone as top-level
      const fields = schema.map((s) => s.field)
      expect(fields).toContain('profile')
      // profile.phone should be inside profile.children, not at top level
      expect(fields).not.toContain('profile.phone')
    })
  })

  // ======== generateFormDataMapping ========

  describe('generateFormDataMapping', () => {
    it('extracts field to value mapping from flat JSON', () => {
      const json = { name: 'Alice', age: 30, active: true }
      const mapping = generateFormDataMapping(json)

      expect(mapping.name).toBe('Alice')
      expect(mapping.age).toBe(30)
      expect(mapping.active).toBe(true)
    })

    it('extracts mapping from nested JSON (flat dot-path keys)', () => {
      const json = {
        name: 'Bob',
        profile: {
          phone: '12345',
          address: 'Main St',
        },
      }
      const mapping = generateFormDataMapping(json)

      expect(mapping.name).toBe('Bob')
      // Nested scalars should appear with dot-path keys
      expect(mapping['profile.phone']).toBe('12345')
      expect(mapping['profile.address']).toBe('Main St')
      // profile itself is an object, should not be in mapping
      expect(mapping.profile).toBeUndefined()
    })

    it('returns empty object for null input', () => {
      const mapping = generateFormDataMapping(null)
      expect(mapping).toEqual({})
    })

    it('returns empty object for primitive input', () => {
      const mapping = generateFormDataMapping(42)
      expect(mapping).toEqual({})
    })
  })
})
