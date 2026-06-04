import mongoose from 'mongoose'

const AIFeedbackSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    messageId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      enum: [1, -1],
      required: true,
    },
    comment: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
)

// 复合索引：同一用户对同一条消息只能评价一次
AIFeedbackSchema.index({ messageId: 1, userId: 1 }, { unique: true })

export const AIFeedbackModel = mongoose.model('AIFeedback', AIFeedbackSchema)
