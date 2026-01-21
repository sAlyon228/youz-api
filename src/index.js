require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const pointsRoutes = require('./routes/points');
const shopsRoutes = require('./routes/shops');
const tasksRoutes = require('./routes/tasks');
const purchasesRoutes = require('./routes/purchases');
const photosRoutes = require('./routes/photos');
const courierRoutes = require('./routes/courier');
const statsRoutes = require('./routes/stats');

const { initDatabase } = require('./db');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100 // 100 запросов с одного IP
});
app.use('/api/', limiter);

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/points', pointsRoutes);
app.use('/api/v1/shops', shopsRoutes);
app.use('/api/v1/tasks', tasksRoutes);
app.use('/api/v1/purchases', purchasesRoutes);
app.use('/api/v1/photos', photosRoutes);
app.use('/api/v1/courier', courierRoutes);
app.use('/api/v1/stats', statsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ 
    name: 'ЮZ API',
    version: '1.0.0',
    status: 'running'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    error: { code: 'SERVER_ERROR', message: 'Внутренняя ошибка сервера' }
  });
});

// Init DB and start server
initDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ЮZ API сервер запущен на порту ${PORT}`);
  });
}).catch(err => {
  console.error('Ошибка инициализации БД:', err);
  process.exit(1);
});
