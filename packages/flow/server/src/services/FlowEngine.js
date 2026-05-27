import { v4 as uuidv4 } from 'uuid';
import { parseBpmnGraph, BpmnElementType } from '@schema-form/flow-shared';
import { FlowInstanceModel } from '../models/FlowInstance.js';
import { FlowVersionModel } from '../models/FlowVersion.js';
import { FlowDefinitionModel } from '../models/FlowDefinition.js';
import { TaskInstanceModel } from '../models/TaskInstance.js';
export class FlowEngine {
    async startFlow(definitionId, variables = {}, initiatedBy) {
        const definition = await FlowDefinitionModel.findById(definitionId);
        if (!definition)
            throw new Error('Flow definition not found');
        const version = definition.currentVersionId
            ? await FlowVersionModel.findById(definition.currentVersionId)
            : await FlowVersionModel.findOne({ definitionId }).sort({ version: -1 });
        if (!version)
            throw new Error('No flow version found');
        const model = parseBpmnGraph(version.graph);
        const instance = await FlowInstanceModel.create({
            _id: uuidv4(),
            definitionId,
            versionId: version._id,
            version: version.version,
            status: 'running',
            variables,
            tokens: [
                {
                    tokenId: uuidv4(),
                    nodeId: model.startNodeId,
                    state: 'active',
                    createdAt: new Date(),
                },
            ],
            initiatedBy,
            startedAt: new Date(),
        });
        await this.advance(instance._id);
        return FlowInstanceModel.findById(instance._id);
    }
    async advance(instanceId) {
        const instance = await FlowInstanceModel.findById(instanceId);
        if (!instance || instance.status !== 'running')
            return;
        const flowVersion = await FlowVersionModel.findById(instance.versionId);
        if (!flowVersion)
            throw new Error('Flow version not found');
        const model = parseBpmnGraph(flowVersion.graph);
        let changed = true;
        const maxIterations = 100;
        let iterations = 0;
        while (changed && iterations < maxIterations) {
            changed = false;
            iterations++;
            const activeTokens = instance.tokens.filter((t) => t.state === 'active');
            for (const token of activeTokens) {
                const node = model.getNode(token.nodeId);
                if (!node)
                    continue;
                switch (node.bpmnType) {
                    case BpmnElementType.StartEvent: {
                        const outEdges = model.getOutgoing(token.nodeId);
                        if (outEdges.length > 0) {
                            token.nodeId = outEdges[0].targetNodeId;
                            changed = true;
                        }
                        break;
                    }
                    case BpmnElementType.EndEvent: {
                        token.state = 'completed';
                        changed = true;
                        break;
                    }
                    case BpmnElementType.UserTask: {
                        const existingTask = await TaskInstanceModel.findOne({
                            instanceId: instance._id,
                            nodeId: token.nodeId,
                            status: { $in: ['pending', 'claimed'] },
                        });
                        if (!existingTask) {
                            token.state = 'waiting';
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
                            });
                            changed = true;
                        }
                        break;
                    }
                    case BpmnElementType.ServiceTask: {
                        token.state = 'completed';
                        const outEdges = model.getOutgoing(token.nodeId);
                        if (outEdges.length > 0) {
                            const newToken = {
                                tokenId: uuidv4(),
                                nodeId: outEdges[0].targetNodeId,
                                state: 'active',
                                createdAt: new Date(),
                            };
                            instance.tokens.push(newToken);
                        }
                        changed = true;
                        break;
                    }
                    case BpmnElementType.ExclusiveGateway: {
                        const outEdges = model.getOutgoing(token.nodeId);
                        let targetEdge = outEdges.find((e) => e.isDefault);
                        for (const edge of outEdges) {
                            if (edge.conditionExpression && !edge.isDefault) {
                                const { evaluateExpression } = await import('@schema-form/flow-shared');
                                const result = evaluateExpression(edge.conditionExpression, instance.variables);
                                if (result) {
                                    targetEdge = edge;
                                    break;
                                }
                            }
                        }
                        if (targetEdge) {
                            token.nodeId = targetEdge.targetNodeId;
                            changed = true;
                        }
                        break;
                    }
                    case BpmnElementType.ParallelGateway: {
                        const inEdges = model.getIncoming(token.nodeId);
                        const outEdges = model.getOutgoing(token.nodeId);
                        if (inEdges.length > 1) {
                            const waitingTokens = instance.tokens.filter((t) => t.nodeId === token.nodeId && t.state === 'active' && t.tokenId !== token.tokenId);
                            if (waitingTokens.length < inEdges.length - 1) {
                                token.state = 'waiting';
                                changed = true;
                                break;
                            }
                            for (const wt of waitingTokens) {
                                wt.state = 'completed';
                            }
                            token.state = 'completed';
                            for (const edge of outEdges) {
                                instance.tokens.push({
                                    tokenId: uuidv4(),
                                    nodeId: edge.targetNodeId,
                                    state: 'active',
                                    createdAt: new Date(),
                                });
                            }
                            changed = true;
                        }
                        else {
                            token.state = 'completed';
                            for (const edge of outEdges) {
                                instance.tokens.push({
                                    tokenId: uuidv4(),
                                    nodeId: edge.targetNodeId,
                                    state: 'active',
                                    createdAt: new Date(),
                                });
                            }
                            changed = true;
                        }
                        break;
                    }
                    default: {
                        const outEdges = model.getOutgoing(token.nodeId);
                        if (outEdges.length > 0) {
                            token.nodeId = outEdges[0].targetNodeId;
                            changed = true;
                        }
                        break;
                    }
                }
            }
        }
        const remainingActive = instance.tokens.filter((t) => t.state === 'active' || t.state === 'waiting');
        if (remainingActive.length === 0) {
            instance.status = 'completed';
            instance.completedAt = new Date();
        }
        await instance.save();
    }
    async completeTask(taskId, formData, outcome) {
        const task = await TaskInstanceModel.findById(taskId);
        if (!task)
            throw new Error('Task not found');
        if (task.status !== 'pending' && task.status !== 'claimed') {
            throw new Error('Task is not in a completable state');
        }
        task.status = 'completed';
        if (formData)
            task.formData = formData;
        if (outcome)
            task.outcome = outcome;
        await task.save();
        const instance = await FlowInstanceModel.findById(task.instanceId);
        if (!instance)
            throw new Error('Instance not found');
        const token = instance.tokens.find((t) => t.nodeId === task.nodeId && t.state === 'waiting');
        if (token) {
            token.state = 'active';
            await instance.save();
            await this.advance(instance._id);
        }
    }
    async terminateInstance(instanceId) {
        const instance = await FlowInstanceModel.findById(instanceId);
        if (!instance)
            throw new Error('Instance not found');
        if (instance.status !== 'running' && instance.status !== 'suspended') {
            throw new Error('Instance is not in a terminable state');
        }
        instance.status = 'terminated';
        instance.completedAt = new Date();
        await instance.save();
        await TaskInstanceModel.updateMany({ instanceId, status: { $in: ['pending', 'claimed'] } }, { status: 'cancelled' });
    }
    async suspendInstance(instanceId) {
        const instance = await FlowInstanceModel.findById(instanceId);
        if (!instance || instance.status !== 'running') {
            throw new Error('Instance not found or not running');
        }
        instance.status = 'suspended';
        await instance.save();
    }
    async resumeInstance(instanceId) {
        const instance = await FlowInstanceModel.findById(instanceId);
        if (!instance || instance.status !== 'suspended') {
            throw new Error('Instance not found or not suspended');
        }
        instance.status = 'running';
        await instance.save();
        await this.advance(instance._id);
    }
}
export const flowEngine = new FlowEngine();
