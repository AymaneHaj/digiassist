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

  // Vercel (with and without trailing slash)
  'https://front-digiassistant.vercel.app',
  'https://front-digiassistant.vercel.app/',
  'https://front-digiassistant.3gittkm4-happyshop120-1488s-projects.vercel.app',
  'https://front-digiassistant.3gittkm4-happyshop120-1488s-projects.vercel.app/',
  'https://front-digiassistant-3gitktom4-happyshop120-1488s-projects.vercel.app',
  'https://front-digiassistant-3gitktom4-happyshop120-1488s-projects.vercel.app/'
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
    
    // Normalize origin (remove trailing slash for comparison)
    const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
    const normalizedAllowed = allowedOrigins.map(o => o.endsWith('/') ? o.slice(0, -1) : o);
    
    if (normalizedAllowed.includes(normalizedOrigin)) {
      console.log(`✅ Origin allowed: ${origin}`);
      callback(null, true);
    } else {
      console.warn(`⚠️ Blocked origin: ${origin}`);
      console.warn(`   Normalized: ${normalizedOrigin}`);
      console.warn(`   Allowed origins:`, normalizedAllowed);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 200
};

// Handle OPTIONS requests explicitly
app.options('*', (req, res) => {
  console.log('🔧 Handling OPTIONS preflight request');
  console.log(`   Origin: ${req.headers.origin}`);
  cors(corsOptions)(req, res, () => {
    res.status(200).end();
  });
});

app.use(cors(corsOptions)); 

// --- End CORS Fix ---
app.use(express.json());

app.get('/', (req, res) => {
  res.send('DigiAssistant Backend (Node.js v2 - Mongoose) is running!');
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
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS policy violation' });
  }
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

async function startServer() {
  try {
    await connectDB();
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${port}`);
  });
}

startServer();