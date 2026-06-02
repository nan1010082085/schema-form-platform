/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import { MemorySaver } from '@langchain/langgraph'
import { checkpointer } from '../graph/checkpointer.js'

describe('checkpointer', () => {
  it('exports a checkpointer instance', () => {
    expect(checkpointer).toBeDefined()
  })

  it('is a MemorySaver instance', () => {
    expect(checkpointer).toBeInstanceOf(MemorySaver)
  })

  it('has the MemorySaver interface (get/put methods)', () => {
    expect(typeof checkpointer.get).toBe('function')
    expect(typeof checkpointer.put).toBe('function')
  })
})
