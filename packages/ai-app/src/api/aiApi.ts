/**
 * AI API 客户端
 *
 * - SSE 流式对话（fetch + ReadableStream）
 * - 对话管理 CRUD
 * - 发布接口
 */

import type {
  ChatRequest,
  SSEEvent,
  PublishRequest,
  PublishResponse,
  Conversation,
} from '@/types'

// ---- 错误类型 ----

export class AiApiError extends Error {
  public readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'AiApiError'
    this.status = status
  }
}

// ---- 基础请求 ----

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) ?? '/api'

interface ApiResponse<T> {
  success: boolean
  data: T
  error?: { message: string }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, init)

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const msg = body?.error?.message ?? `${response.status} ${response.statusText}`
    throw new AiApiError(msg, response.status)
  }

  const body = (await response.json()) as ApiResponse<T>
  if (!body.success) {
    throw new AiApiError(body.error?.message ?? 'Request failed', response.status)
  }
  return body.data
}

// ---- SSE 对话流 ----

/**
 * 发送对话消息，返回可订阅的 SSE 事件流。
 *
 * 使用 fetch + ReadableStream 实现，支持流式文本和结构化事件。
 */
export function chat(request: ChatRequest): ReadableStream<SSEEvent> {
  const body = JSON.stringify(request)

  const stream = new ReadableStream<SSEEvent>({
    async start(controller) {
      const response = await fetch(`${BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })

      if (!response.ok) {
        controller.error(new AiApiError(`Chat request failed: ${response.status}`, response.status))
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        controller.error(new AiApiError('Response body is null', 0))
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith('data: ')) continue

            const data = trimmed.slice(6)
            if (data === '[DONE]') {
              controller.close()
              return
            }

            try {
              const event = JSON.parse(data) as SSEEvent
              controller.enqueue(event)
            } catch {
              // 跳过无法解析的行
            }
          }
        }

        // 流结束但未收到 [DONE] 标记
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })

  return stream
}

// ---- 对话管理 ----

export async function getConversations(): Promise<Conversation[]> {
  return request<Conversation[]>('/ai/conversations')
}

export async function getConversationDetail(id: string): Promise<Conversation & { messages: Array<{ role: string; content: string; thinking?: string; tip?: string; schema?: unknown[]; flow?: unknown; timestamp: string }> }> {
  return request(`/ai/conversations/${encodeURIComponent(id)}`)
}

export async function deleteConversation(id: string): Promise<void> {
  await request<void>(`/ai/conversations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

// ---- 发布 ----

export async function publish(payload: PublishRequest): Promise<PublishResponse> {
  return request<PublishResponse>('/ai/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
