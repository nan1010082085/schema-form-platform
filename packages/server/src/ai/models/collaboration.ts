/**
 * Collaboration Session Model
 *
 * Tracks multi-user collaboration on AI conversations.
 * Each session maps a conversationId to a set of active participants.
 */

import mongoose from 'mongoose'

// ────────────────────────────────────────────
// Interfaces
// ────────────────────────────────────────────

export interface ICollaborationSession {
  _id: string
  conversationId: string
  participants: string[]
  createdAt: Date
  updatedAt: Date
}

// ────────────────────────────────────────────
// Schema
// ────────────────────────────────────────────

const collaborationSessionSchema = new mongoose.Schema<ICollaborationSession>(
  {
    _id: { type: String, required: true },
    conversationId: { type: String, required: true, index: true },
    participants: { type: [String], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc: unknown, ret: Record<string, unknown>) {
        ret.id = ret._id
        delete ret._id
        delete ret.__v
      },
    },
  },
)

collaborationSessionSchema.index({ conversationId: 1 }, { unique: true })

// ────────────────────────────────────────────
// Model
// ────────────────────────────────────────────

export const CollaborationSessionModel =
  mongoose.models.CollaborationSession ??
  mongoose.model<ICollaborationSession>('CollaborationSession', collaborationSessionSchema)
