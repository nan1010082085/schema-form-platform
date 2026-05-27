import mongoose from 'mongoose'

export type TimerJobStatus = 'pending' | 'fired' | 'cancelled'

export interface ITimerJob {
  _id: string
  instanceId: string
  tokenId: string
  nodeId: string
  fireAt: Date
  status: TimerJobStatus
  timerType: string
  timerValue: string
  createdAt: Date
  updatedAt: Date
}

const timerJobSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    instanceId: { type: String, required: true, index: true },
    tokenId: { type: String, required: true },
    nodeId: { type: String, required: true },
    fireAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'fired', 'cancelled'],
      default: 'pending',
      index: true,
    },
    timerType: { type: String, required: true },
    timerValue: { type: String, required: true },
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

timerJobSchema.index({ status: 1, fireAt: 1 })

export const TimerJobModel =
  mongoose.models.TimerJob ??
  mongoose.model<ITimerJob>('TimerJob', timerJobSchema)
