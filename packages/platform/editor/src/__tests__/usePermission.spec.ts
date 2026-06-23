import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePermission } from '@/composables/usePermission'
import { useAppStore } from '@/stores/app'

describe('usePermission', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('hasPermission returns true when user has the permission', () => {
    const appStore = useAppStore()
    appStore.userContext.permissions = ['flow:design', 'flow:approve']

    const { hasPermission } = usePermission()
    expect(hasPermission('flow:design')).toBe(true)
  })

  it('hasPermission returns false when user lacks the permission', () => {
    const appStore = useAppStore()
    appStore.userContext.permissions = ['flow:approve']

    const { hasPermission } = usePermission()
    expect(hasPermission('flow:design')).toBe(false)
  })

  it('hasPermission returns false when permissions is empty', () => {
    const { hasPermission } = usePermission()
    expect(hasPermission('flow:design')).toBe(false)
  })

  it('hasAnyPermission returns true when user has at least one permission', () => {
    const appStore = useAppStore()
    appStore.userContext.permissions = ['flow:approve']

    const { hasAnyPermission } = usePermission()
    expect(hasAnyPermission(['flow:design', 'flow:approve'])).toBe(true)
  })

  it('hasAnyPermission returns false when user has none of the permissions', () => {
    const appStore = useAppStore()
    appStore.userContext.permissions = ['other:perm']

    const { hasAnyPermission } = usePermission()
    expect(hasAnyPermission(['flow:design', 'flow:approve'])).toBe(false)
  })

  it('hasAnyPermission returns false for empty array', () => {
    const appStore = useAppStore()
    appStore.userContext.permissions = ['flow:design']

    const { hasAnyPermission } = usePermission()
    expect(hasAnyPermission([])).toBe(false)
  })

  it('hasAllPermission returns true when user has all permissions', () => {
    const appStore = useAppStore()
    appStore.userContext.permissions = ['flow:design', 'flow:approve', 'flow:publish']

    const { hasAllPermission } = usePermission()
    expect(hasAllPermission(['flow:design', 'flow:approve'])).toBe(true)
  })

  it('hasAllPermission returns false when user is missing some permissions', () => {
    const appStore = useAppStore()
    appStore.userContext.permissions = ['flow:design']

    const { hasAllPermission } = usePermission()
    expect(hasAllPermission(['flow:design', 'flow:approve'])).toBe(false)
  })

  it('hasAllPermission returns true for empty array', () => {
    const { hasAllPermission } = usePermission()
    expect(hasAllPermission([])).toBe(true)
  })

  it('permissions is reactive to store changes', () => {
    const appStore = useAppStore()
    const { permissions, hasPermission } = usePermission()

    expect(permissions.value).toEqual([])
    expect(hasPermission('flow:design')).toBe(false)

    appStore.userContext.permissions = ['flow:design']
    expect(permissions.value).toEqual(['flow:design'])
    expect(hasPermission('flow:design')).toBe(true)
  })
})
