import mongoose, { type Document, type Model } from 'mongoose'

export interface IFormSchema extends Document {
  _id: string
  name: string
  type: 'form' | 'search_list'
  status: 'draft' | 'published'
  publishId: string | null
  publishedAt: Date | null
  json: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

const formSchemaDef = new mongoose.Schema<IFormSchema>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['form', 'search_list'], default: 'form' },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    publishId: { type: String, default: null, unique: true, sparse: true },
    publishedAt: { type: Date, default: null },
    json: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id
        delete ret._id
        delete ret.__v
      },
    },
  },
)

export const FormSchemaModel: Model<IFormSchema> =
  mongoose.models.FormSchema ?? mongoose.model<IFormSchema>('FormSchema', formSchemaDef)
