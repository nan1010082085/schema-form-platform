import mongoose from 'mongoose'
import { tenantPlugin } from '../middleware/tenantPlugin.js'

export type WorkflowTemplateCategory = '人事' | '财务' | '行政' | 'IT' | '采购' | '其他'

export interface IWorkflowTemplate {
  _id: string
  tenantId: string
  name: string
  description: string
  category: WorkflowTemplateCategory
  formSchema: Record<string, unknown>
  flowDefinition: {
    nodes: Record<string, unknown>[]
    edges: Record<string, unknown>[]
  }
  dataUpdateRules: Array<{
    trigger: string
    targetField: string
    sourceField: string
    transform?: string
  }>
  thumbnail: string
  tags: string[]
  isBuiltin: boolean
  useCount: number
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const dataUpdateRuleSchema = new mongoose.Schema(
  {
    trigger: { type: String, required: true },
    targetField: { type: String, required: true },
    sourceField: { type: String, required: true },
    transform: { type: String },
  },
  { _id: false },
)

const workflowTemplateSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    tenantId: { type: String, default: '000000', index: true },
    name: { type: String, required: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 1000 },
    category: {
      type: String,
      enum: ['人事', '财务', '行政', 'IT', '采购', '其他'],
      default: '其他',
      index: true,
    },
    formSchema: { type: mongoose.Schema.Types.Mixed, required: true },
    flowDefinition: {
      nodes: { type: [mongoose.Schema.Types.Mixed], required: true },
      edges: { type: [mongoose.Schema.Types.Mixed], required: true },
    },
    dataUpdateRules: { type: [dataUpdateRuleSchema], default: [] },
    thumbnail: { type: String, default: '' },
    tags: { type: [String], default: [] },
    isBuiltin: { type: Boolean, default: false, index: true },
    useCount: { type: Number, default: 0 },
    createdBy: { type: String, default: '' },
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

workflowTemplateSchema.index({ category: 1, isBuiltin: 1 })
workflowTemplateSchema.index({ name: 'text', description: 'text' })

workflowTemplateSchema.plugin(tenantPlugin)

export const WorkflowTemplateModel =
  mongoose.models.WorkflowTemplate ??
  mongoose.model<IWorkflowTemplate>('WorkflowTemplate', workflowTemplateSchema)
