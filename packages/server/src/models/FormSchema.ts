import mongoose from 'mongoose'

export interface IFormSchema {
  _id: string
  editId: string
  version: string
  name: string
  type: 'form' | 'search_list'
  status: 'draft'
  json: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

const formSchemaDef = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    editId: { type: String, required: true, index: true },
    version: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['form', 'search_list'], default: 'form' },
    status: { type: String, enum: ['draft'], default: 'draft' },
    json: { type: mongoose.Schema.Types.Mixed, required: true },
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

formSchemaDef.index({ editId: 1, version: 1 }, { unique: true })

export const FormSchemaModel =
  mongoose.models.FormSchema ?? mongoose.model<IFormSchema>('FormSchema', formSchemaDef)
