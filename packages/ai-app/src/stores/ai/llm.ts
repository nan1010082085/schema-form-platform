/**
 * LLM Provider 状态管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getLLMProviders,
  switchLLMProvider,
  getLLMUsage,
  getLLMStrategies,
  switchLLMStrategy,
  type LLMProviderInfo,
  type LLMAggregatedUsage,
} from '@/api/aiApi'

export const useLlmStore = defineStore('ai-llm', () => {
  const providers = ref<LLMProviderInfo[]>([])
  const defaultProvider = ref<string>('deepseek')
  const defaultStrategy = ref<string | null>(null)
  const strategies = ref<string[]>([])
  const usage = ref<LLMAggregatedUsage | null>(null)
  const loading = ref(false)

  async function fetchProviders() {
    loading.value = true
    try {
      const data = await getLLMProviders()
      providers.value = data.providers
      defaultProvider.value = data.default
    } finally {
      loading.value = false
    }
  }

  async function fetchStrategies() {
    const data = await getLLMStrategies()
    strategies.value = data.strategies
    defaultStrategy.value = data.default
  }

  async function fetchUsage() {
    const data = await getLLMUsage()
    usage.value = data
  }

  async function switchProvider(provider: string) {
    await switchLLMProvider(provider)
    defaultProvider.value = provider
  }

  async function switchStrategy(strategy: string) {
    await switchLLMStrategy(strategy)
    defaultStrategy.value = strategy
  }

  return {
    providers,
    defaultProvider,
    defaultStrategy,
    strategies,
    usage,
    loading,
    fetchProviders,
    fetchStrategies,
    fetchUsage,
    switchProvider,
    switchStrategy,
  }
})
