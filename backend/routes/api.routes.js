import express from 'express';
import { handleChat, getActiveConversation } from '../controllers/chat.controllers.js';
import { getResults } from '../controllers/results.controllers.js';
import { generatePDFReport, getStructuredResults } from '../controllers/pdf.controllers.js';
import authRoutes from './auth.routes.js';
import { authMiddleware } from '../middleware/auth.js';


const router = express.Router();

// Auth routes (public)
router.use('/auth', authRoutes);

// Protected routes
router.post('/v1/chat', authMiddleware, handleChat);
router.get('/v1/active-conversation', authMiddleware, getActiveConversation);   
router.get('/v1/results/:conversation_id', authMiddleware, getResults);
router.get('/v1/results/:conversation_id/structured', authMiddleware, getStructuredResults);
router.get('/v1/results/:conversation_id/pdf', authMiddleware, generatePDFReport);

export default router;