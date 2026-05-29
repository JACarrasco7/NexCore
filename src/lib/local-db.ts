import { SQLiteDBConnection, CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite'

let db: SQLiteDBConnection | null = null

export async function initDB() {
  if (db) return db
  const sqlite = new SQLiteConnection(CapacitorSQLite)
  db = await sqlite.createConnection('appfitness', false, 'no-encryption', 1)
  await db.open()
  await db.execute(`
    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      path TEXT NOT NULL,
      exercise TEXT,
      athlete TEXT,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS rir_logs (
      id TEXT PRIMARY KEY,
      video_id TEXT,
      set_number INTEGER,
      reps INTEGER,
      rir REAL,
      created_at TEXT,
      FOREIGN KEY (video_id) REFERENCES videos(id)
    );
    CREATE TABLE IF NOT EXISTS pose_metrics (
      id TEXT PRIMARY KEY,
      video_id TEXT,
      joint TEXT,
      angle REAL,
      rom REAL,
      created_at TEXT,
      FOREIGN KEY (video_id) REFERENCES videos(id)
    );
  `)
  return db
}

export async function saveVideo(meta: {
  id: string
  path: string
  exercise?: string
  athlete?: string
}) {
  const database = await initDB()
  await database.run(
    `
    INSERT OR REPLACE INTO videos (id, path, exercise, athlete, created_at)
    VALUES (?, ?, ?, ?, ?)
  `,
    [meta.id, meta.path, meta.exercise || null, meta.athlete || null, new Date().toISOString()],
    false,
    'no'
  )
}

export async function getVideos() {
  const database = await initDB()
  const res = await database.query('SELECT * FROM videos ORDER BY created_at DESC')
  return res.values
}

export async function saveRIRLog(log: {
  id: string
  video_id: string
  set_number: number
  reps: number
  rir: number
}) {
  const database = await initDB()
  await database.run(
    `
    INSERT OR REPLACE INTO rir_logs (id, video_id, set_number, reps, rir, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
    [log.id, log.video_id, log.set_number, log.reps, log.rir, new Date().toISOString()],
    false,
    'no'
  )
}

export async function getRIRLogs(videoId: string) {
  const database = await initDB()
  const res = await database.query(
    'SELECT * FROM rir_logs WHERE video_id = ? ORDER BY set_number',
    [videoId]
  )
  return res.values
}

export async function getAllRIRLogs() {
  const database = await initDB()
  const res = await database.query('SELECT * FROM rir_logs')
  return res.values
}

export async function savePoseMetric(metric: {
  id: string
  video_id: string
  joint: string
  angle: number
  rom: number
}) {
  const database = await initDB()
  await database.run(
    `
    INSERT OR REPLACE INTO pose_metrics (id, video_id, joint, angle, rom, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
    [metric.id, metric.video_id, metric.joint, metric.angle, metric.rom, new Date().toISOString()],
    false,
    'no'
  )
}

export async function getPoseMetrics(videoId: string) {
  const database = await initDB()
  const res = await database.query('SELECT * FROM pose_metrics WHERE video_id = ?', [videoId])
  return res.values
}

export async function getAllPoseMetrics() {
  const database = await initDB()
  const res = await database.query('SELECT * FROM pose_metrics')
  return res.values
}
