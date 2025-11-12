# DigiAssistant - Digital Maturity Diagnostic Platform

## 📋 Project Overview

DigiAssistant is an innovative prototype that transforms the traditional, static form-based digital maturity assessment into a dynamic, conversational, and adaptive experience. Guided by an intelligent assistant powered by AI, users answer contextual questions that change based on their inputs. The system calculates scores in real-time and, at the end of the interaction, delivers a clear, actionable report with a maturity profile, scores, and identified priorities.

### Key Features

- **Adaptive Question Flow**: Questions adapt based on user responses, creating a personalized diagnostic journey
- **Real-time Scoring**: Scores are calculated progressively as users answer questions
- **AI-Powered Conversations**: Natural language interactions using OpenAI GPT-4o
- **Comprehensive Results**: Detailed maturity profile with dimensional scores and gap analysis
- **PDF Export**: Downloadable reports for offline review
- **User Authentication**: Secure user accounts with JWT-based authentication

## 🏗️ Architecture

The project consists of three main components:

1. **Frontend** (React + Vite): Dynamic single-page application with conversational UI
2. **Backend** (Node.js + Express): RESTful API handling business logic, scoring, and data persistence
3. **AI Agent** (Python + FastAPI): AI service for question formulation and answer evaluation

```
DigiAssistant/
├── frontend/          # React frontend application
├── backend/           # Node.js backend API
└── ai-agent/          # Python AI agent service
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- Python (v3.9 or higher)
- MongoDB (local or cloud instance)
- OpenAI API key

### Installation

#### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

#### 2. AI Agent Setup

```bash
cd ai-agent
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your OpenAI API key
uvicorn main:app --reload --port 8000
```

#### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Environment Variables

See `.env.example` files in each directory for required environment variables.

## 📚 Documentation

- **[Diagnostic Method & Scoring Rules](./docs/DIAGNOSTIC_METHOD.md)**: Detailed explanation of the diagnostic methodology, scoring logic, and profiling rules
- **[System Structure](./docs/SYSTEM_STRUCTURE.md)**: Comprehensive documentation of the system architecture and diagnostic flow
- **[API Documentation](./docs/API.md)**: API endpoints and request/response formats

## 🎯 Core Functionality

### Adaptive Question Flow

The system presents one question at a time. Subsequent questions are determined by the user's previous answers, creating a non-linear, personalized path. The system implements an "Adaptive Skip" mechanism that can skip entire dimensions if a user scores very low on the first palier.

### Scoring Engine

- **Dimension Score**: Sum of points from 4 pillars (max 36 pts) converted to a percentage
- **Global Score**: Average of the 6 dimension scores
- **Maturity Profile**: Assigned based on global score:
  - **Débutant** (Beginner): 0-25%
  - **Émergent** (Emergent): 26-50%
  - **Challenger**: 51-75%
  - **Leader**: 76-100%

### Gap Analysis

The system identifies digital gaps where the achieved palier level is below the target palier corresponding to the global profile.

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, Redux Toolkit, React Router, Framer Motion, Tailwind CSS
- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT, Puppeteer
- **AI Agent**: Python, FastAPI, OpenAI GPT-4o
- **Database**: MongoDB

## 📁 Project Structure

```
backend/
├── config/          # Database configuration
├── controllers/     # Route controllers
├── data/            # Diagnostic grid JSON
├── middleware/      # Auth middleware
├── models/          # Mongoose models
├── routes/           # API routes
├── services/         # Business logic (scoring, PDF)
└── server.js        # Entry point

frontend/
├── src/
│   ├── components/  # React components
│   ├── pages/       # Page components
│   ├── services/    # API service layer
│   ├── store/       # Redux store
│   └── hooks/       # Custom hooks
└── public/          # Static assets

ai-agent/
├── data/            # Diagnostic grid JSON
├── models.py        # Pydantic models
├── services.py      # AI service functions
├── prompts.py       # AI prompts
└── main.py          # FastAPI app
```

## 🔐 Authentication

The system uses JWT-based authentication. Users must register/login before accessing the diagnostic. All diagnostic endpoints require authentication.

## 📊 Diagnostic Flow

1. User logs in/registers
2. Starts a new diagnostic conversation
3. AI asks contextual questions based on diagnostic criteria
4. User provides answers
5. AI evaluates answers and provides reactions
6. System adapts question flow based on responses
7. Upon completion, results are calculated
8. User views comprehensive report with scores and gaps
9. User can download PDF report

## 🧪 Testing

To test the system:

1. Start all three services (backend, ai-agent, frontend)
2. Register a new user account
3. Start a diagnostic conversation
4. Answer questions naturally
5. Review results and download PDF

## 📝 License

This project is a prototype for demonstration purposes.

## 🤝 Contributing

This is a prototype project. For questions or issues, please refer to the documentation or contact the development team.

## 📞 Support

For technical support or questions about the diagnostic methodology, please refer to the documentation in the `docs/` directory.

