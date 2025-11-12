import mongoose from 'mongoose';

const HistoryEntrySchema = new mongoose.Schema({
  criterion_id: { type: String, required: true },
  user_answer: { type: String, required: true },
  evaluation: {
    score: { type: Number, required: true },
    justification: { type: String }
  },
  ai_reaction: { type: String },
  ai_question: { type: String }
}, { _id: false });

const ConversationSchema = new mongoose.Schema({
  conversation_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  current_index: {
    type: Number,
    required: true,
    default: 0
  },
  history: [HistoryEntrySchema],
  status: {
    type: String,
    enum: ['in_progress', 'finished'],
    default: 'in_progress'
  },
  UserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

export const Conversation = mongoose.model('Conversation', ConversationSchema);