import { v4 as uuidv4 } from 'uuid'
import mongoose from 'mongoose'
import { type NotificationType, type INotification } from '../flow-models/Notification.js'

interface TaskNotificationData {
  taskId: string
  taskName: string
  instanceId?: string
  assignee?: string
  delegatedBy?: string
}

export class NotificationService {
  private get model() {
    return mongoose.model<INotification>('Notification')
  }

  private getTitle(type: NotificationType, data: TaskNotificationData): string {
    switch (type) {
      case 'task_created':
        return `新任务: ${data.taskName}`
      case 'task_timeout':
        return `任务即将超时: ${data.taskName}`
      case 'task_completed':
        return `任务已完成: ${data.taskName}`
      case 'task_delegated':
        return `任务已委派: ${data.taskName}`
      default:
        return `任务通知: ${data.taskName}`
    }
  }

  private getContent(type: NotificationType, data: TaskNotificationData): string {
    switch (type) {
      case 'task_created':
        return `您有一个新的待办任务「${data.taskName}」，请及时处理。`
      case 'task_timeout':
        return `任务「${data.taskName}」即将到达截止时间，请尽快处理。`
      case 'task_completed':
        return `任务「${data.taskName}」已被完成。`
      case 'task_delegated':
        return `任务「${data.taskName}」已由 ${data.delegatedBy ?? '未知用户'} 委派给您。`
      default:
        return ''
    }
  }

  async sendNotification(userId: string, type: NotificationType, data: TaskNotificationData): Promise<INotification> {
    const doc = await this.model.create({
      _id: uuidv4(),
      userId,
      type,
      title: this.getTitle(type, data),
      content: this.getContent(type, data),
      relatedId: data.taskId,
      relatedType: 'task',
    })
    return doc.toObject() as INotification
  }

  async sendBatchNotifications(userIds: string[], type: NotificationType, data: TaskNotificationData): Promise<void> {
    const notifications = userIds.map((userId) => ({
      _id: uuidv4(),
      userId,
      type,
      title: this.getTitle(type, data),
      content: this.getContent(type, data),
      relatedId: data.taskId,
      relatedType: 'task' as const,
    }))

    await this.model.insertMany(notifications)
  }

  async getNotifications(
    userId: string,
    options: { page?: number; pageSize?: number; unreadOnly?: boolean } = {},
  ): Promise<{ items: INotification[]; total: number; unreadCount: number }> {
    const { page = 1, pageSize = 20, unreadOnly = false } = options
    const skip = (page - 1) * pageSize

    const filter: Record<string, unknown> = { userId }
    if (unreadOnly) {
      filter.isRead = false
    }

    const [items, total, unreadCount] = await Promise.all([
      this.model.find(filter).skip(skip).limit(pageSize).sort({ createdAt: -1 }).lean(),
      this.model.countDocuments(filter),
      this.model.countDocuments({ userId, isRead: false }),
    ])

    return { items: items as unknown as INotification[], total, unreadCount }
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.model.countDocuments({ userId, isRead: false })
  }

  async markAsRead(notificationId: string, userId: string): Promise<INotification | null> {
    return this.model.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true },
    ).lean()
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.model.updateMany(
      { userId, isRead: false },
      { isRead: true },
    )
    return result.modifiedCount
  }
}

export const notificationService = new NotificationService()
