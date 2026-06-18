/**
 * ApprovalLog — 审批日志模型
 */
import mongoose, { Schema, type Document } from 'mongoose'

export interface IApprovalLog extends Document {
  id: string
  instanceId: string
  nodeId: string
  nodeName: string
  taskId: string
  action: 'claim' | 'approve' | 'reject' | 'reject-to-node' | 'delegate' | 'comment'
  operator: string
  comment?: string
  outcome?: string
  createdAt: Date
}

const ApprovalLogSchema = new Schema<IApprovalLog>(
  {
    id: { type: String, required: true, unique: true },
    instanceId: { type: String, required: true, index: true },
    nodeId: { type: String, required: true },
    nodeName: { type: String, required: true },
    taskId: { type: String, required: true },
    action: {
      type: String,
      enum: ['claim', 'approve', 'reject', 'reject-to-node', 'delegate', 'comment'],
      required: true,
    },
    operator: { type: String, required: true, index: true },
    comment: String,
    outcome: String,
  },
  {
    timestamps: true,
  },
)

export const ApprovalLogModel = mongoose.model<IApprovalLog>('ApprovalLog', ApprovalLogSchema)
