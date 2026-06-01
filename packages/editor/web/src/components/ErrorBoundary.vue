<script lang="ts">
import { defineComponent, ref, onErrorCaptured, computed, h } from 'vue'
import { ElButton } from 'element-plus'
import styles from './ErrorBoundary.module.scss'

export default defineComponent({
  name: 'ErrorBoundary',
  props: {
    nodePath: { type: String, default: '' },
    nodeType: { type: String, default: '' },
    nodeField: { type: String, default: '' },
    onError: { type: Function as unknown as () => ((info: { type: string; field?: string; path?: string; error: Error }) => void) | undefined, default: undefined },
  },
  setup(props, { slots, expose }) {
    const hasError = ref(false)
    const error = ref<Error | null>(null)
    const retryCounter = ref(0)

    const nodeInfo = computed(() => {
      const parts: string[] = []
      if (props.nodeType) parts.push(`type: ${props.nodeType}`)
      if (props.nodeField) parts.push(`field: ${props.nodeField}`)
      if (props.nodePath) parts.push(`path: [${props.nodePath}]`)
      return parts.join(', ')
    })

    onErrorCaptured((err, _instance, _info) => {
      hasError.value = true
      error.value = err instanceof Error ? err : new Error(String(err))
      console.error(`[ErrorBoundary] ${nodeInfo.value}`, err)
      if (props.onError) {
        props.onError({ type: props.nodeType, field: props.nodeField, path: props.nodePath, error: error.value })
      }
      return false
    })

    function retry() {
      hasError.value = false
      error.value = null
      retryCounter.value++
    }

    expose({ hasError, error, retryCounter, retry })

    return () => {
      if (hasError.value) {
        return h('div', { class: styles['fg-error-boundary'] }, [
          h('div', { class: styles['fg-error-boundary__inner'] }, [
            h('div', { class: styles['fg-error-boundary__header'] }, [
              h('span', { class: styles['fg-error-boundary__icon'] }, '!'),
              h('span', { class: styles['fg-error-boundary__title'] }, '渲染错误'),
            ]),
            nodeInfo.value
              ? h('div', { class: styles['fg-error-boundary__info'] }, nodeInfo.value)
              : null,
            h('div', { class: styles['fg-error-boundary__message'] }, error.value?.message ?? '未知错误'),
            h(
              ElButton,
              { size: 'small', type: 'primary', onClick: retry },
              () => '重试',
            ),
          ]),
        ])
      }

      const children = slots.default?.()
      if (!children) return null

      return h('div', { key: retryCounter.value, style: { display: 'contents' } }, children)
    }
  },
})
</script>
