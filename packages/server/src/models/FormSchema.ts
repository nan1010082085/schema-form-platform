import mongoose from 'mongoose'

export interface IVersionSnapshot {
  version: string
  json: Record<string, unknown>
  createdAt: Date
}

export interface IFormSchema {
  _id: string
  editId: string
  version: string
  name: string
  type: 'form' | 'search_list'
  status: 'draft'
  json: Record<string, unknown>
  thumbnail?: string
  versions: IVersionSnapshot[]
  createdAt: Date
  updatedAt: Date
}

const versionSnapshotSchema = new mongoose.Schema(
  {
    version: { type: String, required: true },
    json: { type: mongoose.Schema.Types.Mixed, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const formSchemaDef = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    editId: { type: String, required: true, unique: true, index: true },
    version: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['form', 'search_list'], default: 'form' },
    status: { type: String, enum: ['draft'], default: 'draft' },
    json: { type: mongoose.Schema.Types.Mixed, required: true },
    thumbnail: { type: String, default: '' },
    versions: { type: [versionSnapshotSchema], default: [] },
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

export const FormSchemaModel =
  mongoose.models.FormSchema ?? mongoose.model<IFormSchema>('FormSchema', formSchemaDef)
