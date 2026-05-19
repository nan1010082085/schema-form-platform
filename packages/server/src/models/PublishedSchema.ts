import mongoose from 'mongoose'

export interface IPublishedSchema {
  _id: string
  sourceId: string
  name: string
  type: 'form' | 'search_list'
  json: Record<string, unknown>
  publishId: string
  publishedAt: Date
  createdAt: Date
  updatedAt: Date
}

const publishedSchemaDef = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    sourceId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['form', 'search_list'], default: 'form' },
    json: { type: mongoose.Schema.Types.Mixed, required: true },
    publishId: { type: String, required: true },
    publishedAt: { type: Date, required: true },
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

export const PublishedSchemaModel =
  mongoose.models.PublishedSchema ?? mongoose.model<IPublishedSchema>('PublishedSchema', publishedSchemaDef)
