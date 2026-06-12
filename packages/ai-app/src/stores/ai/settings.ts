/**
 * Chat Settings 状态管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ChatSettings } from '@/types'

const CHAT_SETTINGS_KEY = 'ai-chat-settings'

const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt: '',
  enableRag: false,
  enableTools: true,
  streamMode: true,
}

function loadChatSettings(): ChatSettings {
  try {
    const stored = localStorage.getItem(CHAT_SETTINGS_KEY)
    if (stored) {
      return { ...DEFAULT_CHAT_SETTINGS, ...JSON.parse(stored) }
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_CHAT_SETTINGS }
}

export const useSettingsStore = defineStore('ai-settings', () => {
  const settings = ref<ChatSettings>(loadChatSettings())

  function updateSettings(partial: Partial<ChatSettings>) {
    settings.value = { ...settings.value, ...partial }
    localStorage.setItem(CHAT_SETTINGS_KEY, JSON.stringify(settings.value))
  }

  function resetSettings() {
    settings.value = { ...DEFAULT_CHAT_SETTINGS }
    localStorage.removeItem(CHAT_SETTINGS_KEY)
  }

  return {
    settings,
    updateSettings,
    resetSettings,
  }
})
