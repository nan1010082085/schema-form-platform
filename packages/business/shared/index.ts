// Components
export { default as UserDropdown } from './components/UserDropdown.vue'
export { default as LayoutSwitcher } from './components/LayoutSwitcher.vue'

// Stores
export { useLayoutStore } from './stores/layout'

// Re-export auth types from platform-shared for convenience
export type { AuthUser, LoginPayload, LoginResponse, AuthLoadingState } from '@schema-form/platform-shared/utils/authTypes'
