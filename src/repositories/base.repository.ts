import { openDatabase } from '@/database'

export abstract class BaseRepository {
  protected async db() {
    return openDatabase()
  }
}
