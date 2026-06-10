import mongoose from 'mongoose'
import { v4 as uuidv4 } from 'uuid'
import { tenantPlugin } from '../middleware/tenantPlugin.js'

export interface IMenu {
  _id: string
  tenantId: string
  parentId: string | null
  name: string
  path: string
  icon: string
  type: 'menu' | 'button'
  permission: string
  sort: number
  status: 'active' | 'inactive'
  component: string
  createdAt: Date
  updatedAt: Date
}

const menuSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    tenantId: { type: String, default: '000000', index: true },
    parentId: { type: String, default: null, index: true },
    name: { type: String, required: true },
    path: { type: String, default: '' },
    icon: { type: String, default: '' },
    type: { type: String, enum: ['menu', 'button'], default: 'menu' },
    permission: { type: String, default: '', index: true },
    sort: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    component: { type: String, default: '' },
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

// Compound indexes for tenant-scoped tree queries
menuSchema.index({ tenantId: 1, parentId: 1 })
menuSchema.index({ tenantId: 1, name: 1 })
menuSchema.index({ tenantId: 1, sort: 1 })
menuSchema.index({ tenantId: 1, permission: 1 })

menuSchema.plugin(tenantPlugin)

export const MenuModel =
  mongoose.models.Menu ?? mongoose.model<IMenu>('Menu', menuSchema)
