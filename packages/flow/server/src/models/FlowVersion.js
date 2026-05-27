import mongoose from 'mongoose';
const flowVersionSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    definitionId: { type: String, required: true, index: true },
    version: { type: Number, required: true },
    graph: {
        nodes: { type: [mongoose.Schema.Types.Mixed], required: true },
        edges: { type: [mongoose.Schema.Types.Mixed], required: true },
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
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
flowVersionSchema.index({ definitionId: 1, version: -1 }, { unique: true });
export const FlowVersionModel = mongoose.models.FlowVersion ??
    mongoose.model('FlowVersion', flowVersionSchema);
