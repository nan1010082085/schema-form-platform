/**
 * RAG Tools — LangGraph StructuredTool format.
 *
 * Provides true semantic search using vector embeddings instead of
 * Jaccard keyword matching. Uses DeepSeek embedding API for query
 * vectorization and cosine similarity for ranking.
 */

import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { semanticSearch, indexSchema, reindexAll } from '../services/ragService.js'

// ────────────────────────────────────────────
// Tool result type
// ────────────────────────────────────────────

interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
  summary?: string
}

// ────────────────────────────────────────────
// Semantic Search Tool
// ────────────────────────────────────────────

export const ragSearchTool = tool(
  async ({ query, limit, type }): Promise<ToolResult> => {
    try {
      const results = await semanticSearch(query, { limit, type, minScore: 5 })

      const mapped = results.map((r) => ({
        id: r.schemaId,
        editId: r.editId,
        name: r.name,
        type: r.type,
        score: r.score,
        widgetTypes: r.metadata.widgetTypes,
        fieldNames: r.metadata.fieldNames,
        labels: r.metadata.labels,
        description: r.metadata.description,
      }))

      const summary = mapped.length === 0
        ? `没有找到与"${query}"语义相关的 Schema`
        : `找到 ${mapped.length} 个语义相关 Schema：${mapped.slice(0, 3).map((s) => `${s.name}（相似度 ${s.score}%）`).join('、')}${mapped.length > 3 ? '等' : ''}`

      return {
        success: true,
        data: { total: mapped.length, schemas: mapped },
        summary,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Semantic search failed'
      return { success: false, error: message }
    }
  },
  {
    name: 'rag_search',
    description: '基于向量语义搜索 Schema。使用 DeepSeek Embedding API 生成语义向量，通过余弦相似度匹配，支持自然语言描述的模糊搜索。比关键词搜索更智能，能理解同义词、近义词和语义相关的内容。当用户用自然语言描述需求时优先使用此工具。',
    schema: z.object({
      query: z.string().describe('自然语言描述，如"一个包含用户信息和地址的表单"、"审批流程的申请页面"'),
      limit: z.number().optional().default(5).describe('返回数量上限，默认 5'),
      type: z.enum(['form', 'search_list']).optional().describe('按类型筛选'),
    }),
  },
)

// ────────────────────────────────────────────
// Index Management Tool
// ────────────────────────────────────────────

export const ragIndexTool = tool(
  async ({ schemaId, reindex }): Promise<ToolResult> => {
    try {
      if (reindex) {
        const stats = await reindexAll()
        return {
          success: true,
          data: stats,
          summary: `全量重建完成：共 ${stats.total} 个 Schema，新增 ${stats.created}，更新 ${stats.updated}，跳过 ${stats.skipped}，失败 ${stats.errors}`,
        }
      }

      if (!schemaId) {
        return { success: false, error: '必须提供 schemaId 或 reindex=true' }
      }

      const result = await indexSchema(schemaId)
      const actionLabel = result.action === 'created' ? '新增索引'
        : result.action === 'updated' ? '更新索引'
        : '索引已是最新'

      return {
        success: true,
        data: result,
        summary: `Schema ${schemaId}：${actionLabel}`,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Index operation failed'
      return { success: false, error: message }
    }
  },
  {
    name: 'rag_index',
    description: '管理 Schema 向量索引。可以为单个 Schema 生成/更新向量索引，或全量重建所有索引。在 Schema 内容变更后调用此工具确保搜索索引是最新的。',
    schema: z.object({
      schemaId: z.string().optional().describe('要索引的 Schema ID'),
      reindex: z.boolean().optional().default(false).describe('设为 true 则全量重建所有索引'),
    }),
  },
)

// ────────────────────────────────────────────
// Exported tool array
// ────────────────────────────────────────────

export const ragTools = [ragSearchTool, ragIndexTool]
