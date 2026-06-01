import mongoose from 'mongoose'
import { v4 as uuidv4 } from 'uuid'

export interface IRole {
  _id: string
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

const roleSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    name: { type: String, required: true, unique: true },
    description: { type: String },
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

export const RoleModel =
  mongoose.models.Role ?? mongoose.model<IRole>('Role', roleSchema)
