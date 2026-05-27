import mongoose from 'mongoose'

export interface IFlowDefinition {
  _id: string
  name: string
  description?: string
  category?: string
  status: 'draft' | 'published' | 'archived'
  currentVersionId?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const flowDefinitionSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    category: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    currentVersionId: { type: String, default: null },
    createdBy: { type: String, required: true },
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

flowDefinitionSchema.index({ name: 1 })
flowDefinitionSchema.index({ status: 1 })
flowDefinitionSchema.index({ createdBy: 1 })

export const FlowDefinitionModel =
  mongoose.models.FlowDefinition ??
  mongoose.model<IFlowDefinition>('FlowDefinition', flowDefinitionSchema)
