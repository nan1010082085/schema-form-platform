import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

const SALT_ROUNDS = 10

export interface IUser {
  _id: string
  username: string
  password: string
  displayName: string
  roles: string[]  // 角色ID数组
  createdAt: Date
  updatedAt: Date
}

const userSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    displayName: { type: String, required: true },
    roles: { type: [String], default: [] },  // 角色ID数组
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

// 给 roles 字段添加索引，支持反向查询
userSchema.index({ roles: 1 })

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
