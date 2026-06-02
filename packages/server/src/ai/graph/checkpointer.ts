/**
 * AI Agent Graph — Checkpointer for state persistence.
 *
 * Provides a singleton checkpointer for LangGraph state persistence.
 * Currently uses MemorySaver (in-memory) for development.
 * For production, swap with a MongoDB-backed checkpointer
 * (e.g., `@langchain/langgraph-checkpoint-mongodb`).
 */

import { MemorySaver } from '@langchain/langgraph'

/** Singleton checkpointer — holds graph state across invocations within the same process. */
const checkpointer = new MemorySaver()

export { checkpointer }
