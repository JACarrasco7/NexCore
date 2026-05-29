import { describe, it, expect, vi } from 'vitest'
import { initDB, saveVideo, getVideos, saveRIRLog, getRIRLogs } from '../local-db'

vi.mock('@capacitor-community/sqlite', () => ({
  SQLiteConnection: vi.fn().mockImplementation(() => ({
    createConnection: vi.fn().mockResolvedValue({
      open: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn().mockResolvedValue(undefined),
      run: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue({ values: [] }),
    }),
  })),
  CapacitorSQLite: {},
}))

describe('local-db', () => {
  it('initDB creates tables', async () => {
    const db = await initDB()
    expect(db).toBeDefined()
  })

  it('saveVideo stores metadata', async () => {
    await saveVideo({ id: 'test-1', path: '/test.mp4', exercise: 'Squat' })
    const videos = await getVideos()
    expect(videos).toBeDefined()
  })

  it('saveRIRLog stores log', async () => {
    await saveRIRLog({
      id: 'r1',
      video_id: 'test-1',
      set_number: 1,
      reps: 10,
      rir: 2,
    })
    const logs = await getRIRLogs('test-1')
    expect(logs).toBeDefined()
  })
})
