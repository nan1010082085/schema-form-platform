import mongoose from 'mongoose';
const flowDefinitionSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    category: { type: String, default: '' },
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'draft',
    },
    currentVersionId: { type: String, default: null },
    createdBy: { type: String, required: true },
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
flowDefinitionSchema.index({ name: 1 });
flowDefinitionSchema.index({ status: 1 });
flowDefinitionSchema.index({ createdBy: 1 });
export const FlowDefinitionModel = mongoose.models.FlowDefinition ??
    mongoose.model('FlowDefinition', flowDefinitionSchema);
