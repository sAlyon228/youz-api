const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, '../data');
const dbPath = path.join(dataDir, 'db.json');

// Структура базы данных
let data = {
  users: [],
  points: [],
  shops: [],
  tasks: [],
  taskTemplates: [],
  purchaseRequests: [],
  workplacePhotos: [],
  courierLocations: [],
  _counters: { users: 0, points: 0, shops: 0, tasks: 0, taskTemplates: 0, purchaseRequests: 0, workplacePhotos: 0, courierLocations: 0 }
};

// Загрузка данных из файла
function loadData() {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, 'utf8');
      data = JSON.parse(raw);
    }
  } catch (err) {
    console.log('Создаём новую базу данных...');
  }
}

// Сохранение данных в файл
function saveData() {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Ошибка сохранения БД:', err);
  }
}

// Простая "ORM" обёртка для совместимости
const db = {
  prepare: (sql) => ({
    get: (...params) => dbQuery(sql, params, 'get'),
    all: (...params) => dbQuery(sql, params, 'all'),
    run: (...params) => dbRun(sql, params)
  }),
  exec: () => {}
};

function dbQuery(sql, params, mode) {
  const sqlLower = sql.toLowerCase();
  
  // SELECT COUNT(*)
  if (sqlLower.includes('select count(*)')) {
    const table = extractTable(sql);
    const where = extractWhere(sql, params);
    const items = filterItems(data[table] || [], where);
    return mode === 'get' ? { count: items.length } : [{ count: items.length }];
  }
  
  // SELECT COUNT(DISTINCT
  if (sqlLower.includes('select count(distinct')) {
    const match = sql.match(/count\(distinct\s+(\w+)\)/i);
    const field = match ? match[1] : 'id';
    const table = extractTable(sql);
    const where = extractWhere(sql, params);
    const items = filterItems(data[table] || [], where);
    const unique = new Set(items.map(i => i[camelCase(field)]));
    return mode === 'get' ? { count: unique.size } : [{ count: unique.size }];
  }
  
  // SELECT *
  if (sqlLower.includes('select *') || sqlLower.includes('select cl.*')) {
    const table = extractTable(sql);
    const where = extractWhere(sql, params);
    let items = filterItems(data[table] || [], where);
    
    // ORDER BY
    if (sqlLower.includes('order by')) {
      const desc = sqlLower.includes('desc');
      items = items.sort((a, b) => desc ? b.id - a.id : a.id - b.id);
    }
    
    // LIMIT
    const limitMatch = sql.match(/limit\s+(\d+)/i);
    if (limitMatch) {
      items = items.slice(0, parseInt(limitMatch[1]));
    }
    
    return mode === 'get' ? (items[0] || null) : items;
  }
  
  return mode === 'get' ? null : [];
}

function dbRun(sql, params) {
  const sqlLower = sql.toLowerCase();
  
  // INSERT
  if (sqlLower.startsWith('insert')) {
    const table = extractTable(sql);
    const columns = extractColumns(sql);
    const item = { id: ++data._counters[table] };
    
    columns.forEach((col, i) => {
      item[camelCase(col)] = params[i];
    });
    
    // Defaults
    if (!item.createdAt) item.createdAt = Date.now();
    if (!item.updatedAt) item.updatedAt = Date.now();
    if (item.isActive === undefined) item.isActive = 1;
    
    data[table].push(item);
    saveData();
    return { lastInsertRowid: item.id };
  }
  
  // UPDATE
  if (sqlLower.startsWith('update')) {
    const table = extractTable(sql);
    const id = params[params.length - 1];
    const idx = data[table].findIndex(i => i.id == id);
    
    if (idx !== -1) {
      const sets = sql.match(/set\s+(.+?)\s+where/i)?.[1]?.split(',') || [];
      let paramIdx = 0;
      sets.forEach(s => {
        const col = s.split('=')[0].trim();
        data[table][idx][camelCase(col)] = params[paramIdx++];
      });
      saveData();
    }
    return { changes: idx !== -1 ? 1 : 0 };
  }
  
  // DELETE
  if (sqlLower.startsWith('delete')) {
    const table = extractTable(sql);
    const id = params[0];
    const idx = data[table].findIndex(i => i.id == id);
    if (idx !== -1) {
      data[table].splice(idx, 1);
      saveData();
    }
    return { changes: idx !== -1 ? 1 : 0 };
  }
  
  return { changes: 0 };
}

function extractTable(sql) {
  const tables = {
    'users': 'users',
    'points': 'points', 
    'shops': 'shops',
    'tasks': 'tasks',
    'task_templates': 'taskTemplates',
    'purchase_requests': 'purchaseRequests',
    'workplace_photos': 'workplacePhotos',
    'courier_locations': 'courierLocations'
  };
  
  for (const [key, val] of Object.entries(tables)) {
    if (sql.toLowerCase().includes(key)) return val;
  }
  return 'users';
}

function extractColumns(sql) {
  const match = sql.match(/\(([^)]+)\)\s*values/i);
  return match ? match[1].split(',').map(c => c.trim()) : [];
}

function extractWhere(sql, params) {
  const where = {};
  const sqlLower = sql.toLowerCase();
  
  if (sqlLower.includes('where id = ?')) {
    where.id = params[0];
  }
  if (sqlLower.includes('where point_id = ?')) {
    where.pointId = params[0];
  }
  if (sqlLower.includes('where user_id = ?')) {
    where.userId = params[0];
  }
  if (sqlLower.includes('where courier_id = ?')) {
    where.courierId = params[0];
  }
  if (sqlLower.includes('where role = ?')) {
    where.role = params[0];
  }
  if (sqlLower.includes('where assigned_to_user_id = ?')) {
    where.assignedToUserId = params[0];
  }
  if (sqlLower.includes('where assigned_courier_id = ?')) {
    where.assignedCourierId = params[0];
  }
  if (sqlLower.includes('timestamp > ?')) {
    where._timestampGt = params[0];
  }
  if (sqlLower.includes('taken_at >= ?')) {
    where._takenAtGte = params[params.length - 1];
  }
  
  return where;
}

function filterItems(items, where) {
  return items.filter(item => {
    for (const [key, val] of Object.entries(where)) {
      if (key === '_timestampGt') {
        if (item.timestamp <= val) return false;
      } else if (key === '_takenAtGte') {
        if (item.takenAt < val) return false;
      } else if (item[key] != val) {
        return false;
      }
    }
    return true;
  });
}

function camelCase(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function initDatabase() {
  loadData();
  
  // Создаём СуперАдмина если нет пользователей
  if (data.users.length === 0) {
    const passwordHash = bcrypt.hashSync('admin123', 10);
    data.users.push({
      id: ++data._counters.users,
      fullName: 'Администратор',
      phone: '+79991234567',
      passwordHash,
      role: 'SUPER_ADMIN',
      pointId: null,
      deskId: null,
      isActive: 1,
      avatarUrl: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    console.log('✅ Создан СуперАдмин: +79991234567 / admin123');
  }
  
  // Создаём тестовую точку если нет
  if (data.points.length === 0) {
    data.points.push({
      id: ++data._counters.points,
      name: 'Главный офис',
      address: 'ул. Примерная, д. 1',
      latitude: null,
      longitude: null,
      openTime: '09:00',
      closeTime: '21:00',
      workDays: '["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY"]',
      isActive: 1,
      createdAt: Date.now()
    });
    console.log('✅ Создана тестовая точка');
  }
  
  // Создаём тестовый магазин если нет
  if (data.shops.length === 0) {
    data.shops.push({
      id: ++data._counters.shops,
      name: 'Магазин №1',
      address: 'ул. Торговая, д. 5',
      latitude: null,
      longitude: null,
      phone: '+79990001122',
      workingHours: '09:00-21:00',
      isActive: 1
    });
    console.log('✅ Создан тестовый магазин');
  }
  
  saveData();
  console.log('✅ База данных инициализирована');
}

// Экспорт данных для прямого доступа
module.exports = { db, data, initDatabase, saveData };
