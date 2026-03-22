import knex from 'knex'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

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

  // Users table
  if (!await db.schema.hasTable('users')) {
    await db.schema.createTable('users', t => {
      t.string('id').primary()
      t.string('email').unique().nullable()
      t.string('password_hash').nullable()
      t.boolean('is_guest').notNullable().defaultTo(false)
      t.string('created_at').notNullable()
    })
  }

  // Members table
  if (!await db.schema.hasTable('members')) {
    await db.schema.createTable('members', t => {
      t.string('id').primary()
      t.string('created_by').nullable().references('id').inTable('users').onDelete('SET NULL')
      t.string('name').notNullable()
      t.string('color').notNullable()
      t.string('dob').nullable()
      t.string('created_at').notNullable()
    })
  }

  // member_access table
  if (!await db.schema.hasTable('member_access')) {
    await db.schema.createTable('member_access', t => {
      t.string('id').primary()
      t.string('member_id').notNullable().references('id').inTable('members').onDelete('CASCADE')
      t.string('user_id').nullable().references('id').inTable('users').onDelete('CASCADE')
      t.string('role').nullable() // admin | editor | viewer
      t.string('share_code').nullable().unique()
      t.string('share_code_access').nullable() // editor | viewer
      t.string('created_at').notNullable()
    })
  }

  // Entries table
  if (!await db.schema.hasTable('entries')) {
    await db.schema.createTable('entries', t => {
      t.string('id').primary()
      t.string('member_id').notNullable().references('id').inTable('members').onDelete('CASCADE')
      t.string('created_by').nullable().references('id').inTable('users').onDelete('SET NULL')
      t.string('type').notNullable()
      t.string('date').notNullable()
      t.string('time').nullable()
      t.string('title').notNullable()
      t.text('notes').nullable()
      t.string('severity').nullable()
      t.text('photo_data_url').nullable()
      t.string('sleep_quality').nullable()
      t.string('sleep_duration').nullable()
      t.string('created_at').notNullable()
    })
  }

  // Migrations for existing databases
  const memberMigrations = [
    { table: 'members', col: 'created_by', type: 'string' },
  ]
  for (const { table, col, type } of memberMigrations) {
    if (!await db.schema.hasColumn(table, col)) {
      await db.schema.table(table, t => t[type](col).nullable())
    }
  }

  const entryMigrations = [
    { col: 'sleep_quality', type: 'string' },
    { col: 'sleep_duration', type: 'string' },
    { col: 'created_by', type: 'string' },
  ]
  for (const { col, type } of entryMigrations) {
    if (!await db.schema.hasColumn('entries', col)) {
      await db.schema.table('entries', t => t[type](col).nullable())
    }
  }

  console.log('[db] initDb complete')
}

export default db
