import mongoose, { type Document, type Model } from 'mongoose'

export interface IFormSchema extends Document {
  _id: string
  name: string
  json: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

const formSchemaDef = new mongoose.Schema<IFormSchema>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
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
