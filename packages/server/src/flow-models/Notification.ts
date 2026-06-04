import mongoose from 'mongoose'

export type NotificationType = 'task_created' | 'task_timeout' | 'task_completed' | 'task_delegated'

export interface INotification {
  _id: string
  userId: string
  type: NotificationType
  title: string
  content?: string
  relatedId?: string
  relatedType?: 'task' | 'instance'
  isRead: boolean
  createdAt: Date
  updatedAt: Date
}

const notificationSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['task_created', 'task_timeout', 'task_completed', 'task_delegated'],
      required: true,
    },
    title: { type: String, required: true },
    content: { type: String, default: null },
    relatedId: { type: String, default: null },
    relatedType: {
      type: String,
      enum: ['task', 'instance'],
      default: null,
    },
    isRead: { type: Boolean, default: false, index: true },
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

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 })
notificationSchema.index({ userId: 1, type: 1 })

export const NotificationModel =
  mongoose.models.Notification ??
  mongoose.model<INotification>('Notification', notificationSchema)
