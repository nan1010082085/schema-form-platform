import mongoose from 'mongoose'
import { tenantPlugin } from '../middleware/tenantPlugin.js'

export type WorkflowStatus = 'draft' | 'published' | 'archived'

export interface IDataUpdateRule {
  trigger: string
  targetField: string
  sourceField: string
  transform?: string
}

export interface IPublishConfig {
  entryUrl: string
  permissions: {
    launchers: string[]
    viewers: string[]
  }
}

export interface IWorkflow {
  _id: string
  tenantId: string
  name: string
  description: string
  status: WorkflowStatus
  formSchemaId: string
  flowDefinitionId: string
  dataUpdateRules: IDataUpdateRule[]
  publishConfig: IPublishConfig
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

const publishConfigSchema = new mongoose.Schema(
  {
    entryUrl: { type: String, default: '' },
    permissions: {
      launchers: { type: [String], default: [] },
      viewers: { type: [String], default: [] },
    },
  },
  { _id: false },
)

const workflowDef = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    tenantId: { type: String, default: '000000', index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    formSchemaId: { type: String, required: true, index: true },
    flowDefinitionId: { type: String, required: true, index: true },
    dataUpdateRules: { type: [dataUpdateRuleSchema], default: [] },
    publishConfig: { type: publishConfigSchema, default: () => ({}) },
    createdBy: { type: String, default: null, index: true },
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

// 复合索引：按租户 + 状态筛选（列表页核心查询）
workflowDef.index({ tenantId: 1, status: 1 })
// 复合索引：按表单 schema 关联查询
workflowDef.index({ tenantId: 1, formSchemaId: 1 })

workflowDef.plugin(tenantPlugin)

export const WorkflowModel =
  mongoose.models.Workflow ?? mongoose.model<IWorkflow>('Workflow', workflowDef)
