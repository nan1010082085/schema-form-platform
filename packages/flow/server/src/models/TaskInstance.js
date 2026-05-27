import mongoose from 'mongoose';
const taskInstanceSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    instanceId: { type: String, required: true, index: true },
    nodeId: { type: String, required: true },
    nodeName: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'claimed', 'completed', 'cancelled', 'delegated'],
        default: 'pending',
    },
    assignee: { type: String, default: null },
    candidateUsers: { type: [String], default: [] },
    candidateRoles: { type: [String], default: [] },
    formData: { type: mongoose.Schema.Types.Mixed, default: null },
    formSchemaId: { type: String, default: null },
    formVersion: { type: String, default: null },
    outcome: { type: String, default: null },
    dueDate: { type: Date, default: null },
    priority: { type: Number, default: 1 },
}, {
    timestamps: true,
    toJSON: {
        transform(_doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
        },
    },
});
taskInstanceSchema.index({ assignee: 1, status: 1 });
taskInstanceSchema.index({ candidateUsers: 1, status: 1 });
export const TaskInstanceModel = mongoose.models.TaskInstance ??
    mongoose.model('TaskInstance', taskInstanceSchema);
