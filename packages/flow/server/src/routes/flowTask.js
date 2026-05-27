import Router from '@koa/router';
import { validate as uuidValidate } from 'uuid';
import { TaskInstanceModel } from '../models/TaskInstance.js';
import { authMiddleware } from '../../../../server/src/middleware/auth.js';
import { validate } from '../../../../server/src/middleware/validate.js';
import { completeTaskSchema, delegateTaskSchema } from '../schemas/instanceSchemas.js';
import { flowEngine } from '../services/FlowEngine.js';
import { taskService } from '../services/TaskService.js';
const requireAuth = authMiddleware({ required: true });
const router = new Router({ prefix: '/api/flow-tasks' });
// GET /api/flow-tasks/my
router.get('/my', requireAuth, async (ctx) => {
    const userId = ctx.state.user.id;
    const { page: pageStr = '1', pageSize: pageSizeStr = '20' } = ctx.query;
    const page = Math.max(1, parseInt(pageStr, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeStr, 10) || 20));
    const result = await taskService.getMyTasks(userId, page, pageSize);
    ctx.body = { success: true, data: result };
});
// GET /api/flow-tasks/:id
router.get('/:id', requireAuth, async (ctx) => {
    const { id } = ctx.params;
    if (!uuidValidate(id)) {
        ctx.status = 400;
        ctx.body = { success: false, error: { message: 'Invalid UUID format.' } };
        return;
    }
    const task = await TaskInstanceModel.findById(id);
    if (!task) {
        ctx.status = 404;
        ctx.body = { success: false, error: { message: 'Task not found.' } };
        return;
    }
    ctx.body = { success: true, data: task };
});
// POST /api/flow-tasks/:id/claim
router.post('/:id/claim', requireAuth, async (ctx) => {
    const { id } = ctx.params;
    if (!uuidValidate(id)) {
        ctx.status = 400;
        ctx.body = { success: false, error: { message: 'Invalid UUID format.' } };
        return;
    }
    const userId = ctx.state.user.id;
    const task = await taskService.claimTask(id, userId);
    ctx.body = { success: true, data: task };
});
// POST /api/flow-tasks/:id/complete
router.post('/:id/complete', requireAuth, validate(completeTaskSchema), async (ctx) => {
    const { id } = ctx.params;
    const { formData, outcome } = ctx.request.body;
    if (!uuidValidate(id)) {
        ctx.status = 400;
        ctx.body = { success: false, error: { message: 'Invalid UUID format.' } };
        return;
    }
    await flowEngine.completeTask(id, formData, outcome);
    const task = await TaskInstanceModel.findById(id);
    ctx.body = { success: true, data: task };
});
// POST /api/flow-tasks/:id/delegate
router.post('/:id/delegate', requireAuth, validate(delegateTaskSchema), async (ctx) => {
    const { id } = ctx.params;
    const { targetUserId } = ctx.request.body;
    if (!uuidValidate(id)) {
        ctx.status = 400;
        ctx.body = { success: false, error: { message: 'Invalid UUID format.' } };
        return;
    }
    const task = await taskService.delegateTask(id, targetUserId);
    ctx.body = { success: true, data: task };
});
export default router;
