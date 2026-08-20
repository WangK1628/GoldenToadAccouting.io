import type { User } from '@/models'
import { BaseRepository } from '@/repositories/base.repository'
import { createId } from '@/utils/id'
import { nowIso } from '@/utils/time'

export class UserRepository extends BaseRepository {
  async getById(id: string): Promise<User | undefined> {
    const db = await this.db()
    return db.users.get(id)
  }

  async getByEmail(email: string): Promise<User | undefined> {
    const db = await this.db()
    const normalized = email.trim().toLowerCase()
    return db.users.where('email').equals(normalized).first()
  }

  async create(input: {
    email: string
    displayName: string
    passwordHash: string
    salt: string
  }): Promise<User> {
    const db = await this.db()
    const timestamp = nowIso()
    const user: User = {
      id: createId('user'),
      email: input.email.trim().toLowerCase(),
      displayName: input.displayName.trim() || input.email.split('@')[0] || '用户',
      passwordHash: input.passwordHash,
      salt: input.salt,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    await db.users.add(user)
    return user
  }

  async updatePassword(userId: string, passwordHash: string, salt: string): Promise<void> {
    const db = await this.db()
    const existing = await db.users.get(userId)
    if (!existing) throw new Error('User not found')
    await db.users.put({
      ...existing,
      passwordHash,
      salt,
      updatedAt: nowIso(),
    })
  }
}

export const userRepository = new UserRepository()
