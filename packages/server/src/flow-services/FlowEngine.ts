import { v4 as uuidv4 } from 'uuid'
import { parseBpmnGraph, BpmnElementType } from '@schema-form/flow-shared'
import type { FlowToken, FlowInstanceStatus } from '@schema-form/flow-shared'
import { FlowInstanceModel } from '../flow-models/FlowInstance.js'
import { FlowVersionModel } from '../flow-models/FlowVersion.js'
import { FlowDefinitionModel } from '../flow-models/FlowDefinition.js'
import { TaskInstanceModel } from '../flow-models/TaskInstance.js'
import { TimerJobModel } from '../flow-models/TimerJob.js'
import { parseTimerValue } from './TimerService.js'

export class FlowEngine {
  async startFlow(
    definitionId: string,
    variables: Record<string, unknown> = {},
    initiatedBy: string,
  ) {
    const definition = await FlowDefinitionModel.findById(definitionId)
    if (!definition) throw new Error('Flow definition not found')

    const version = definition.currentVersionId
      ? await FlowVersionModel.findById(definition.currentVersionId)
      : await FlowVersionModel.findOne({ definitionId }).sort({ version: -1 })

    if (!version) throw new Error('No flow version found')

    const model = parseBpmnGraph(version.graph)

    const instance = await FlowInstanceModel.create({
      _id: uuidv4(),
      definitionId,
      versionId: version._id,
      version: version.version,
      status: 'running' as FlowInstanceStatus,
      variables,
      tokens: [
        {
          tokenId: uuidv4(),
          nodeId: model.startNodeId,
          state: 'active' as const,
          createdAt: new Date(),
        },
      ],
      initiatedBy,
      startedAt: new Date(),
    })

    await this.advance(instance._id)

    return FlowInstanceModel.findById(instance._id)
  }

  async advance(instanceId: string) {
    const instance = await FlowInstanceModel.findById(instanceId)
    if (!instance || instance.status !== 'running') return

    const flowVersion = await FlowVersionModel.findById(instance.versionId)
    if (!flowVersion) throw new Error('Flow version not found')

    const model = parseBpmnGraph(flowVersion.graph)
    let changed = true
    const maxIterations = 100
    let iterations = 0

    while (changed && iterations < maxIterations) {
      changed = false
      iterations++

      const activeTokens = instance.tokens.filter((t: FlowToken) => t.state === 'active')

      for (const token of activeTokens) {
        const node = model.getNode(token.nodeId)
        if (!node) continue

        switch (node.bpmnType) {
          case BpmnElementType.StartEvent: {
            const outEdges = model.getOutgoing(token.nodeId)
            if (outEdges.length > 0) {
              token.nodeId = outEdges[0].targetNodeId
              changed = true
            }
            break
          }

          case BpmnElementType.EndEvent: {
            token.state = 'completed'
            changed = true
            break
          }

          case BpmnElementType.UserTask: {
            const outEdges = model.getOutgoing(token.nodeId)

            if (node.config.multiInstance) {
              const { type, collection } = node.config.multiInstance
              const items = (instance.variables[collection] as unknown[]) ?? []

              if (items.length === 0) {
                token.nodeId = outEdges[0].targetNodeId
                changed = true
                break
              }

              const existingTasks = await TaskInstanceModel.find({
                instanceId: instance._id,
                nodeId: token.nodeId,
                status: { $in: ['pending', 'claimed', 'completed'] },
              })

              if (existingTasks.length === 0) {
                token.state = 'waiting'
                if (type === 'parallel') {
                  for (let i = 0; i < items.length; i++) {
                    await TaskInstanceModel.create({
                      _id: uuidv4(),
                      instanceId: instance._id,
                      nodeId: token.nodeId,
                      nodeName: node.config.label,
                      status: 'pending',
                      candidateUsers: node.config.assignee ? [node.config.assignee] : [],
                      formSchemaId: node.config.formSchemaId,
                      formVersion: node.config.formVersion,
                      priority: 1,
                      multiInstanceIndex: i,
                      multiInstanceItem: items[i],
                    })
                  }
                } else {
                  await TaskInstanceModel.create({
                    _id: uuidv4(),
                    instanceId: instance._id,
                    nodeId: token.nodeId,
                    nodeName: node.config.label,
                    status: 'pending',
                    candidateUsers: node.config.assignee ? [node.config.assignee] : [],
                    formSchemaId: node.config.formSchemaId,
                    formVersion: node.config.formVersion,
                    priority: 1,
                    multiInstanceIndex: 0,
                    multiInstanceItem: items[0],
                  })
                }
                changed = true
              } else {
                const completedCount = existingTasks.filter(t => t.status === 'completed').length

                if (completedCount === items.length) {
                  token.state = 'active'
                  token.nodeId = outEdges[0].targetNodeId
                  changed = true
                } else if (type === 'sequential') {
                  const currentIdx = existingTasks.length - 1
                  const currentTask = existingTasks[currentIdx]
                  if (currentTask.status === 'completed' && currentIdx < items.length - 1) {
                    await TaskInstanceModel.create({
                      _id: uuidv4(),
                      instanceId: instance._id,
                      nodeId: token.nodeId,
                      nodeName: node.config.label,
                      status: 'pending',
                      candidateUsers: node.config.assignee ? [node.config.assignee] : [],
                      formSchemaId: node.config.formSchemaId,
                      formVersion: node.config.formVersion,
                      priority: 1,
                      multiInstanceIndex: currentIdx + 1,
                      multiInstanceItem: items[currentIdx + 1],
                    })
                    changed = true
                  }
                }
              }
              break
            }

            const existingTask = await TaskInstanceModel.findOne({
              instanceId: instance._id,
              nodeId: token.nodeId,
              status: { $in: ['pending', 'claimed'] },
            })
            if (!existingTask) {
              token.state = 'waiting'
              await TaskInstanceModel.create({
                _id: uuidv4(),
                instanceId: instance._id,
                nodeId: token.nodeId,
                nodeName: node.config.label,
                status: 'pending',
                candidateUsers: node.config.assignee ? [node.config.assignee] : [],
                formSchemaId: node.config.formSchemaId,
                formVersion: node.config.formVersion,
                priority: 1,
              })
              changed = true
            }
            break
          }

          case BpmnElementType.ServiceTask: {
            token.state = 'completed'
            const outEdges = model.getOutgoing(token.nodeId)
            if (outEdges.length > 0) {
              const newToken: FlowToken = {
                tokenId: uuidv4(),
                nodeId: outEdges[0].targetNodeId,
                state: 'active',
                createdAt: new Date(),
              }
              instance.tokens.push(newToken)
            }
            changed = true
            break
          }

          case BpmnElementType.ExclusiveGateway: {
            const outEdges = model.getOutgoing(token.nodeId)
            let targetEdge = outEdges.find((e) => e.isDefault)

            for (const edge of outEdges) {
              if (edge.conditionExpression && !edge.isDefault) {
                const { evaluateExpression } = await import('@schema-form/flow-shared')
                const result = evaluateExpression(edge.conditionExpression, instance.variables)
                if (result) {
                  targetEdge = edge
                  break
                }
              }
            }

            if (targetEdge) {
              token.nodeId = targetEdge.targetNodeId
              changed = true
            }
            break
          }

          case BpmnElementType.TimerEvent: {
            const existingJob = await TimerJobModel.findOne({
              instanceId: instance._id,
              nodeId: token.nodeId,
              status: 'pending',
            })

            if (!existingJob) {
              const timerType = node.config.timerType ?? 'duration'
              const timerValue = node.config.timerValue ?? 'PT1M'
              const fireAt = parseTimerValue(timerType, timerValue)

              await TimerJobModel.create({
                _id: uuidv4(),
                instanceId: instance._id,
                tokenId: token.tokenId,
                nodeId: token.nodeId,
                fireAt,
                status: 'pending',
                timerType,
                timerValue,
              })
              token.state = 'waiting'
              changed = true
            }
            break
          }

          case BpmnElementType.ScriptTask: {
            // TODO: Phase 5 — execute script, for now treat as pass-through
            token.state = 'completed'
            const outEdges = model.getOutgoing(token.nodeId)
            if (outEdges.length > 0) {
              const newToken: FlowToken = {
                tokenId: uuidv4(),
                nodeId: outEdges[0].targetNodeId,
                state: 'active',
                createdAt: new Date(),
              }
              instance.tokens.push(newToken)
            }
            changed = true
            break
          }

          case BpmnElementType.SendTask: {
            // TODO: Phase 5 — send message, for now treat as pass-through
            token.state = 'completed'
            const outEdges = model.getOutgoing(token.nodeId)
            if (outEdges.length > 0) {
              const newToken: FlowToken = {
                tokenId: uuidv4(),
                nodeId: outEdges[0].targetNodeId,
                state: 'active',
                createdAt: new Date(),
              }
              instance.tokens.push(newToken)
            }
            changed = true
            break
          }

          case BpmnElementType.ReceiveTask: {
            const existingTask = await TaskInstanceModel.findOne({
              instanceId: instance._id,
              nodeId: token.nodeId,
              status: { $in: ['pending', 'claimed'] },
            })
            if (!existingTask) {
              token.state = 'waiting'
              await TaskInstanceModel.create({
                _id: uuidv4(),
                instanceId: instance._id,
                nodeId: token.nodeId,
                nodeName: node.config.label,
                status: 'pending',
                candidateUsers: node.config.assignee ? [node.config.assignee] : [],
                formSchemaId: node.config.formSchemaId,
                formVersion: node.config.formVersion,
                priority: 1,
              })
              changed = true
            }
            break
          }

          case BpmnElementType.InclusiveGateway: {
            // TODO: Phase 5 — evaluate all matching conditions, for now same as ExclusiveGateway
            const outEdges = model.getOutgoing(token.nodeId)
            let targetEdge = outEdges.find((e) => e.isDefault)

            for (const edge of outEdges) {
              if (edge.conditionExpression && !edge.isDefault) {
                const { evaluateExpression } = await import('@schema-form/flow-shared')
                const result = evaluateExpression(edge.conditionExpression, instance.variables)
                if (result) {
                  targetEdge = edge
                  break
                }
              }
            }

            if (targetEdge) {
              token.nodeId = targetEdge.targetNodeId
              changed = true
            }
            break
          }

          case BpmnElementType.ParallelGateway: {
            const inEdges = model.getIncoming(token.nodeId)
            const outEdges = model.getOutgoing(token.nodeId)

            if (inEdges.length > 1) {
              const waitingTokens = instance.tokens.filter(
                (t: FlowToken) => t.nodeId === token.nodeId && t.state === 'active' && t.tokenId !== token.tokenId,
              )
              if (waitingTokens.length < inEdges.length - 1) {
                token.state = 'waiting'
                changed = true
                break
              }
              for (const wt of waitingTokens) {
                wt.state = 'completed'
              }
              token.state = 'completed'

              for (const edge of outEdges) {
                instance.tokens.push({
                  tokenId: uuidv4(),
                  nodeId: edge.targetNodeId,
                  state: 'active',
                  createdAt: new Date(),
                })
              }
              changed = true
            } else {
              token.state = 'completed'
              for (const edge of outEdges) {
                instance.tokens.push({
                  tokenId: uuidv4(),
                  nodeId: edge.targetNodeId,
                  state: 'active',
                  createdAt: new Date(),
                })
              }
              changed = true
            }
            break
          }

          case BpmnElementType.SubProcess: {
            const outEdges = model.getOutgoing(token.nodeId)
            if (!node.config.subProcessDefinitionId) {
              token.nodeId = outEdges[0]?.targetNodeId ?? token.nodeId
              changed = true
              break
            }

            const existingChild = await FlowInstanceModel.findOne({
              parentInstanceId: instance._id,
              parentTokenId: token.tokenId,
              status: { $in: ['running', 'suspended'] },
            })

            if (!existingChild) {
              const childInstance = await this.startFlow(
                node.config.subProcessDefinitionId,
                instance.variables,
                instance.initiatedBy,
              )

              if (childInstance) {
                childInstance.parentInstanceId = instance._id
                childInstance.parentTokenId = token.tokenId
                await childInstance.save()
              }

              token.state = 'waiting'
              changed = true
            } else if (existingChild.status === 'completed') {
              if (existingChild.variables) {
                Object.assign(instance.variables, existingChild.variables)
              }
              token.state = 'active'
              if (outEdges.length > 0) {
                token.nodeId = outEdges[0].targetNodeId
              }
              changed = true
            }
            break
          }

          default: {
            const outEdges = model.getOutgoing(token.nodeId)
            if (outEdges.length > 0) {
              token.nodeId = outEdges[0].targetNodeId
              changed = true
            }
            break
          }
        }
      }
    }

    const remainingActive = instance.tokens.filter(
      (t: FlowToken) => t.state === 'active' || t.state === 'waiting',
    )
    if (remainingActive.length === 0) {
      instance.status = 'completed'
      instance.completedAt = new Date()
    }

    await instance.save()

    if (instance.status === 'completed' && instance.parentInstanceId) {
      await this.advance(instance.parentInstanceId)
    }
  }

  async completeTask(taskId: string, formData?: Record<string, unknown>, outcome?: string) {
    const task = await TaskInstanceModel.findById(taskId)
    if (!task) throw new Error('Task not found')
    if (task.status !== 'pending' && task.status !== 'claimed') {
      throw new Error('Task is not in a completable state')
    }

    task.status = 'completed'
    if (formData) task.formData = formData
    if (outcome) task.outcome = outcome
    await task.save()

    const instance = await FlowInstanceModel.findById(task.instanceId)
    if (!instance) throw new Error('Instance not found')

    const token = instance.tokens.find(
      (t: FlowToken) => t.nodeId === task.nodeId && t.state === 'waiting',
    )
    if (!token) return

    if (task.multiInstanceIndex != null) {
      const allTasks = await TaskInstanceModel.find({
        instanceId: task.instanceId,
        nodeId: task.nodeId,
        status: { $in: ['pending', 'claimed', 'completed'] },
      })
      const completedCount = allTasks.filter(t => t.status === 'completed').length
      const flowVersion = await FlowVersionModel.findById(instance.versionId)
      if (!flowVersion) throw new Error('Flow version not found')
      const model = parseBpmnGraph(flowVersion.graph)
      const node = model.getNode(task.nodeId)
      const collection = node?.config.multiInstance?.collection
      const totalItems = collection ? ((instance.variables[collection] as unknown[]) ?? []).length : 0

      if (completedCount >= totalItems && totalItems > 0) {
        token.state = 'active'
      }
    } else {
      token.state = 'active'
    }

    await instance.save()
    await this.advance(instance._id)
  }

  async terminateInstance(instanceId: string) {
    const instance = await FlowInstanceModel.findById(instanceId)
    if (!instance) throw new Error('Instance not found')
    if (instance.status !== 'running' && instance.status !== 'suspended') {
      throw new Error('Instance is not in a terminable state')
    }

    const children = await FlowInstanceModel.find({
      parentInstanceId: instanceId,
      status: { $in: ['running', 'suspended'] },
    })
    for (const child of children) {
      await this.terminateInstance(child._id)
    }

    instance.status = 'terminated'
    instance.completedAt = new Date()
    await instance.save()

    await TaskInstanceModel.updateMany(
      { instanceId, status: { $in: ['pending', 'claimed'] } },
      { status: 'cancelled' },
    )

    await TimerJobModel.updateMany(
      { instanceId, status: 'pending' },
      { status: 'cancelled' },
    )
  }

  async suspendInstance(instanceId: string) {
    const instance = await FlowInstanceModel.findById(instanceId)
    if (!instance || instance.status !== 'running') {
      throw new Error('Instance not found or not running')
    }
    instance.status = 'suspended'
    await instance.save()
  }

  async resumeInstance(instanceId: string) {
    const instance = await FlowInstanceModel.findById(instanceId)
    if (!instance || instance.status !== 'suspended') {
      throw new Error('Instance not found or not suspended')
    }
    instance.status = 'running'
    await instance.save()
    await this.advance(instance._id)
  }

  async fireTimerJob(jobId: string): Promise<boolean> {
    const job = await TimerJobModel.findById(jobId)
    if (!job || job.status !== 'pending') return false

    job.status = 'fired'
    await job.save()

    const instance = await FlowInstanceModel.findById(job.instanceId)
    if (!instance || instance.status !== 'running') return false

    const token = instance.tokens.find(
      (t: FlowToken) => t.tokenId === job.tokenId && t.state === 'waiting',
    )
    if (!token) return false

    // Move token past the timer event to the next node
    const flowVersion = await FlowVersionModel.findById(instance.versionId)
    if (!flowVersion) return false

    const model = parseBpmnGraph(flowVersion.graph)
    const outEdges = model.getOutgoing(job.nodeId)
    if (outEdges.length > 0) {
      token.nodeId = outEdges[0].targetNodeId
    }
    token.state = 'active'
    await instance.save()

    await this.advance(instance._id)
    return true
  }

  async fireDueTimers(): Promise<{ checked: number; fired: number }> {
    const now = new Date()
    const pendingJobs = await TimerJobModel.find({
      status: 'pending',
      fireAt: { $lte: now },
    }).limit(100)

    let fired = 0
    for (const job of pendingJobs) {
      const success = await this.fireTimerJob(job._id)
      if (success) fired++
    }

    return { checked: pendingJobs.length, fired }
  }
}

export const flowEngine = new FlowEngine()
