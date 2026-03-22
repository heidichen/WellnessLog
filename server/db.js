import knex from 'knex'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const db = knex(process.env.DATABASE_URL ? {
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  },
} : {
  client: 'better-sqlite3',
  connection: { filename: process.env.DB_PATH || join(__dirname, '../wellness.db') },
  useNullAsDefault: true,
})

export async function initDb() {
  // Members table
  if (!await db.schema.hasTable('members')) {
    await db.schema.createTable('members', t => {
      t.string('id').primary()
      t.string('name').notNullable()
      t.string('color').notNullable()
      t.string('dob')
      t.string('created_at').notNullable()
    })
  }

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

  // Migrations: add columns if missing (for existing databases)
  for (const col of ['sleep_quality', 'sleep_duration']) {
    if (!await db.schema.hasColumn('entries', col)) {
      await db.schema.table('entries', t => t.string(col))
    }
  }
}

export default db
