import knex from 'knex'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Log all env var keys (no values) so we can see exactly what Railway injects
console.log('[db] All env var keys:', Object.keys(process.env).sort())

// Railway may expose the connection string under several names
const pgUrl = process.env.DATABASE_URL
  || process.env.DATABASE_PRIVATE_URL
  || process.env.POSTGRES_URL
  || process.env.POSTGRESQL_URL

const usingPostgres = !!pgUrl
console.log('[db] Resolved postgres URL present:', usingPostgres)
if (usingPostgres) {
  console.log('[db] Postgres URL prefix:', pgUrl.slice(0, 30))
}

const db = knex(usingPostgres ? {
  client: 'pg',
  connection: {
    connectionString: pgUrl,
    ssl: { rejectUnauthorized: false },
  },
} : {
  client: 'better-sqlite3',
  connection: { filename: process.env.DB_PATH || join(__dirname, '../wellness.db') },
  useNullAsDefault: true,
})

export async function initDb() {
  console.log('[db] Running initDb...')
  // Members table
  const hasMembersTable = await db.schema.hasTable('members')
  console.log('[db] members table exists:', hasMembersTable)
  if (!hasMembersTable) {
    await db.schema.createTable('members', t => {
      t.string('id').primary()
      t.string('name').notNullable()
      t.string('color').notNullable()
      t.string('dob')
      t.string('created_at').notNullable()
    })
  }

  console.log('[db] members table created')
  // Entries table
  if (!await db.schema.hasTable('entries')) {
    await db.schema.createTable('entries', t => {
      t.string('id').primary()
      t.string('member_id').notNullable().references('id').inTable('members').onDelete('CASCADE')
      t.string('type').notNullable()
      t.string('date').notNullable()
      t.string('time')
      t.string('title').notNullable()
      t.text('notes')
      t.string('severity')
      t.text('photo_data_url')
      t.string('created_at').notNullable()
      t.string('sleep_quality')
      t.string('sleep_duration')
    })
  }

  console.log('[db] entries table ready')
  // Migrations: add columns if missing (for existing databases)
  for (const col of ['sleep_quality', 'sleep_duration']) {
    if (!await db.schema.hasColumn('entries', col)) {
      await db.schema.table('entries', t => t.string(col))
    }
  }
  console.log('[db] initDb complete')
}

export default db
