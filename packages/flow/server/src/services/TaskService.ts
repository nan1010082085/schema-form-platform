import { TaskInstanceModel } from '../models/TaskInstance.js'

export class TaskService {
  async getMyTasks(userId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize
    const filter = {
      status: { $in: ['pending', 'claimed'] },
      $or: [
        { assignee: userId },
        { candidateUsers: userId },
      ],
    }

    const [items, total] = await Promise.all([
      TaskInstanceModel.find(filter).skip(skip).limit(pageSize).sort({ createdAt: -1 }),
      TaskInstanceModel.countDocuments(filter),
    ])

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  async getTasksForInstance(instanceId: string) {
    return TaskInstanceModel.find({ instanceId }).sort({ createdAt: 1 })
  }

  async claimTask(taskId: string, userId: string) {
    const task = await TaskInstanceModel.findById(taskId)
    if (!task) throw new Error('Task not found')
    if (task.status !== 'pending') throw new Error('Task is not pending')

    task.status = 'claimed'
    task.assignee = userId
    await task.save()
    return task
  }

  async delegateTask(taskId: string, targetUserId: string) {
    const task = await TaskInstanceModel.findById(taskId)
    if (!task) throw new Error('Task not found')
    if (task.status !== 'pending' && task.status !== 'claimed') {
      throw new Error('Task cannot be delegated')
    }

    task.status = 'delegated'
    task.assignee = targetUserId
    await task.save()
    return task
  }
}

export const taskService = new TaskService()
