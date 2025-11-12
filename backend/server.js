import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import apiRoutes from './routes/api.routes.js';
import cors from 'cors';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// --- CORS Configuration ---

const allowedOrigins = [
  // Localhost
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',

  // Vercel - Main domain and preview deployments
  'https://front-digiassistant.vercel.app',
  'https://front-digiassistant.3gittkm4-happyshop120-1488s-projects.vercel.app',
  // Vercel preview deployments (wildcard pattern)
  /^https:\/\/front-digiassistant.*\.vercel\.app$/,
];

console.log('🌐 CORS Configuration:');
console.log('   Allowed origins:', allowedOrigins);

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n📥 [${timestamp}] ${req.method} ${req.path}`);
  console.log(`   Origin: ${req.headers.origin || 'No origin'}`);
  console.log(`   User-Agent: ${req.headers['user-agent']?.substring(0, 50) || 'N/A'}`);
  next();
});

// CORS configuration with dynamic origin checking
const corsOptions = {
  origin: (origin, callback) => {
    console.log(`🔍 CORS Check - Origin received: "${origin}"`);

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('✅ Allowing request with no origin');
      return callback(null, true);
    }

    // Check against string origins
    const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
    const stringOrigins = allowedOrigins.filter(o => typeof o === 'string');
    const normalizedAllowed = stringOrigins.map(o => o.endsWith('/') ? o.slice(0, -1) : o);

    // Check if origin matches any string origin
    if (normalizedAllowed.includes(normalizedOrigin)) {
      console.log(`✅ Origin allowed: ${origin}`);
      return callback(null, true);
    }

    // Check against regex patterns (for Vercel preview deployments)
    const regexOrigins = allowedOrigins.filter(o => o instanceof RegExp);
    for (const regex of regexOrigins) {
      if (regex.test(origin)) {
        console.log(`✅ Origin allowed by regex: ${origin}`);
        return callback(null, true);
      }
    }

    console.warn(`⚠️ Blocked origin: ${origin}`);
    console.warn(`   Normalized: ${normalizedOrigin}`);
    console.warn(`   Allowed origins:`, normalizedAllowed);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS middleware
app.use(cors(corsOptions));

// --- End CORS Fix ---
app.use(express.json());

app.get('/', (req, res) => {
  res.send('DigiAssistant Backend (Node.js v2 - Mongoose) is running!');
});

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use('/api', apiRoutes);

// Error handling middleware (must be last)
app.use((err, req, res, next) => {
  console.error('\n❌ Error Handler Triggered:');
  console.error(`   Method: ${req.method}`);
  console.error(`   Path: ${req.path}`);
  console.error(`   Origin: ${req.headers.origin || 'No origin'}`);
  console.error(`   Error: ${err.message}`);
  if (err.stack) {
    console.error(`   Stack: ${err.stack.split('\n').slice(0, 5).join('\n')}`);
  }

  // Ensure CORS headers are set even on error responses
  const origin = req.headers.origin;
  if (origin) {
    // Check if origin is allowed (same logic as CORS middleware)
    const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
    const stringOrigins = allowedOrigins.filter(o => typeof o === 'string');
    const normalizedAllowed = stringOrigins.map(o => o.endsWith('/') ? o.slice(0, -1) : o);
    const regexOrigins = allowedOrigins.filter(o => o instanceof RegExp);

    const isAllowed = normalizedAllowed.includes(normalizedOrigin) ||
      regexOrigins.some(regex => regex.test(origin));

    if (isAllowed) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    }
  }

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS policy violation' });
  }
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

let server;

async function startServer() {
  try {
    await connectDB();
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    // Don't exit on DB connection failure - allow retries
  }

  server = app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${port}`);
  });

  // Graceful shutdown handling
  const gracefulShutdown = (signal) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    
    server.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('⚠️ Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    gracefulShutdown('uncaughtException');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
    // Don't exit on unhandled rejection, just log it
  });
}

startServer();