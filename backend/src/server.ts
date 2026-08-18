import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';

import { config } from './config';
import { initTelegramBot, setSocketIOInstance } from './services/telegramBot';

import authRoutes from './routes/authRoutes';
import contactRoutes from './routes/contactRoutes';
import orderRoutes from './routes/orderRoutes';
import applicationRoutes from './routes/applicationRoutes';
import coinRoutes from './routes/coinRoutes';
import adminRoutes from './routes/adminRoutes';

const app = express();
const server = http.createServer(app);

// Socket.io for Real-time chat & status updates
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

setSocketIOInstance(io);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiter for security
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Juda ko\'p so\'rov yuborildi, biroz kuting.' },
});

app.use('/api/', apiLimiter);

// Serve uploads statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    app: 'RAQAMLI MAHALLA API',
    time: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/coins', coinRoutes);
app.use('/api/admin', adminRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected to Socket.io: ${socket.id}`);

  socket.on('join_room', (room) => {
    socket.join(room);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Initialize Telegram Bot
initTelegramBot();

// Start Server
const PORT = config.port;
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 RAQAMLI MAHALLA Backend API running on port ${PORT}`);
  console.log(`📍 Healthcheck: http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
});
