const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

async function initDatabase() {
  const client = await pool.connect();
  
  try {
    // Создание таблиц
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        full_name TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'ENGINEER',
        point_id INTEGER,
        desk_id INTEGER,
        is_active BOOLEAN DEFAULT true,
        avatar_url TEXT,
        created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
        updated_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
      );

      CREATE TABLE IF NOT EXISTS points (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        open_time TEXT DEFAULT '09:00',
        close_time TEXT DEFAULT '21:00',
        work_days TEXT DEFAULT '["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY"]',
        is_active BOOLEAN DEFAULT true,
        created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
      );

      CREATE TABLE IF NOT EXISTS shops (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        phone TEXT,
        working_hours TEXT,
        is_active BOOLEAN DEFAULT true
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        order_number TEXT,
        assigned_to_user_id INTEGER,
        assigned_to_role TEXT,
        point_id INTEGER,
        created_by_user_id INTEGER NOT NULL,
        status TEXT DEFAULT 'PENDING',
        template_id INTEGER,
        due_date BIGINT,
        completed_at BIGINT,
        created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
      );

      CREATE TABLE IF NOT EXISTS task_templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        default_role TEXT,
        is_active BOOLEAN DEFAULT true
      );

      CREATE TABLE IF NOT EXISTS purchase_requests (
        id SERIAL PRIMARY KEY,
        point_id INTEGER NOT NULL,
        shop_id INTEGER NOT NULL,
        created_by_user_id INTEGER NOT NULL,
        assigned_courier_id INTEGER,
        items TEXT NOT NULL,
        notes TEXT,
        status TEXT DEFAULT 'PENDING',
        created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
        completed_at BIGINT
      );

      CREATE TABLE IF NOT EXISTS workplace_photos (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        point_id INTEGER NOT NULL,
        desk_id INTEGER,
        photo_type TEXT NOT NULL,
        photo_path TEXT NOT NULL,
        taken_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
        is_synced BOOLEAN DEFAULT true
      );

      CREATE TABLE IF NOT EXISTS courier_locations (
        id SERIAL PRIMARY KEY,
        courier_id INTEGER NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        accuracy REAL,
        timestamp BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
      );
    `);

    // Создаём СуперАдмина если нет
    const userCheck = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCheck.rows[0].count) === 0) {
      const passwordHash = bcrypt.hashSync('admin123', 10);
      await client.query(
        `INSERT INTO users (full_name, phone, password_hash, role, is_active) VALUES ($1, $2, $3, $4, $5)`,
        ['Администратор', '+79991234567', passwordHash, 'SUPER_ADMIN', true]
      );
      console.log('✅ Создан СуперАдмин: +79991234567 / admin123');
    }

    // Создаём тестовую точку если нет
    const pointCheck = await client.query('SELECT COUNT(*) FROM points');
    if (parseInt(pointCheck.rows[0].count) === 0) {
      await client.query(
        `INSERT INTO points (name, address, open_time, close_time) VALUES ($1, $2, $3, $4)`,
        ['Главный офис', 'ул. Примерная, д. 1', '09:00', '21:00']
      );
      console.log('✅ Создана тестовая точка');
    }

    // Создаём тестовый магазин если нет
    const shopCheck = await client.query('SELECT COUNT(*) FROM shops');
    if (parseInt(shopCheck.rows[0].count) === 0) {
      await client.query(
        `INSERT INTO shops (name, address, phone, working_hours) VALUES ($1, $2, $3, $4)`,
        ['Магазин №1', 'ул. Торговая, д. 5', '+79990001122', '09:00-21:00']
      );
      console.log('✅ Создан тестовый магазин');
    }

    console.log('✅ База данных PostgreSQL инициализирована');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDatabase };
