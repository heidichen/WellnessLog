import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const db = new Database(join(__dirname, '../wellness.db'))

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    dob TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL,
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT,
    title TEXT NOT NULL,
    notes TEXT,
    severity TEXT,
    photo_data_url TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
  );
`)

// Migrations
for (const sql of [
  'ALTER TABLE entries ADD COLUMN sleep_quality TEXT',
  'ALTER TABLE entries ADD COLUMN sleep_duration TEXT',
]) {
  try { db.exec(sql) } catch { /* column already exists */ }
}

export default db
