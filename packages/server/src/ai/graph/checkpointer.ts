/**
 * AI Agent Graph — Checkpointer for state persistence.
 *
 * Uses MongoDB-backed checkpointer for persistent state storage.
 * Thread state survives process restarts and serverless cold starts.
 *
 * Falls back to MemorySaver if MongoDB is not connected (e.g., during
 * unit tests or when the DB connection hasn't been established yet).
 */

import { MemorySaver } from '@langchain/langgraph'
import { MongoDBCheckpointer } from './checkpointMongo.js'
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint'

function createCheckpointer(): BaseCheckpointSaver {
  // Use MongoDB checkpointer when mongoose is connected
  // MemorySaver fallback for tests and pre-connection state
  try {
    return new MongoDBCheckpointer()
  } catch {
    return new MemorySaver() as unknown as BaseCheckpointSaver
  }
}

/** Singleton checkpointer — backed by MongoDB for persistent state. */
const checkpointer = createCheckpointer()

export { checkpointer }
