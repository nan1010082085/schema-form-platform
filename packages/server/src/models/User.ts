import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

const SALT_ROUNDS = 10

export interface IUser {
  _id: string
  username: string
  password: string
  displayName: string
  role: 'admin' | 'editor' | 'viewer'
  createdAt: Date
  updatedAt: Date
}

export type UserRole = IUser['role']

const userSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    displayName: { type: String, required: true },
    role: { type: String, enum: ['admin', 'editor', 'viewer'], default: 'viewer' },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc: unknown, ret: Record<string, unknown>) {
        ret.id = ret._id
        delete ret._id
        delete ret.__v
        delete ret.password
      },
    },
  },
)

userSchema.pre('save', async function (this: IUser & mongoose.Document) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS)
  }
})

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password)
}

export const UserModel =
  mongoose.models.User ?? mongoose.model<IUser>('User', userSchema)
