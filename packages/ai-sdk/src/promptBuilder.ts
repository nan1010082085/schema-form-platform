/**
 * Prompt 构建器
 *
 * 提供结构化的 prompt 构建能力。
 */

import type { ToolDefinition } from './types.js'

// ────────────────────────────────────────────
// Prompt 构建器
// ────────────────────────────────────────────

/** Prompt 区段 */
interface PromptSection {
  title: string
  content: string
  order: number
}

/**
 * Prompt 构建器
 *
 * @example
 * ```ts
 * const prompt = new PromptBuilder()
 *   .role('你是一个表单设计专家')
 *   .context('当前系统有 49 种 Widget 组件')
 *   .rules([
 *     '组件只能嵌套在布局/容器组件内',
 *     '每个 Widget 必须有 position',
 *   ])
 *   .tools([searchTool, createTool])
 *   .outputFormat('JSON')
 *   .build()
 * ```
 */
export class PromptBuilder {
  private sections: PromptSection[] = []
  private currentOrder = 0

  /** 设置角色描述 */
  role(description: string): this {
    this.sections.push({ title: '', content: description, order: this.currentOrder++ })
    return this
  }

  /** 添加上下文信息 */
  context(content: string): this {
    this.sections.push({ title: '上下文', content, order: this.currentOrder++ })
    return this
  }

  /** 添加规则列表 */
  rules(rules: string[]): this {
    const content = rules.map((r, i) => `${i + 1}. ${r}`).join('\n')
    this.sections.push({ title: '规则', content, order: this.currentOrder++ })
    return this
  }

  /** 添加工具说明 */
  tools(tools: ToolDefinition[]): this {
    if (tools.length === 0) return this

    const content = tools
      .map(t => `- **${t.name}**: ${t.description}`)
      .join('\n')
    this.sections.push({ title: '可用工具', content, order: this.currentOrder++ })
    return this
  }

  /** 添加输出格式说明 */
  outputFormat(format: string): this {
    this.sections.push({ title: '输出格式', content: format, order: this.currentOrder++ })
    return this
  }

  /** 添加示例 */
  examples(examples: Array<{ input: string; output: string }>): this {
    const content = examples
      .map((ex, i) => `### 示例 ${i + 1}\n\n**输入**: ${ex.input}\n\n**输出**:\n${ex.output}`)
      .join('\n\n')
    this.sections.push({ title: '示例', content, order: this.currentOrder++ })
    return this
  }

  /** 添加自定义区段 */
  section(title: string, content: string): this {
    this.sections.push({ title, content, order: this.currentOrder++ })
    return this
  }

  /** 构建最终 prompt */
  build(): string {
    const sorted = [...this.sections].sort((a, b) => a.order - b.order)

    return sorted
      .map(section => {
        if (!section.title) return section.content
        return `## ${section.title}\n\n${section.content}`
      })
      .join('\n\n')
  }
}

/**
 * 快捷创建 Prompt 构建器
 */
export function createPromptBuilder(): PromptBuilder {
  return new PromptBuilder()
}
