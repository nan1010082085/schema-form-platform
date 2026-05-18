import mongoose from 'mongoose'

export interface IFormSchema {
  _id: string
  name: string
  json: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

const formSchemaDef = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
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

export const FormSchemaModel =
  mongoose.models.FormSchema ?? mongoose.model<IFormSchema>('FormSchema', formSchemaDef)
