# DrishtiKosh 🌐

**An intelligent, multilingual AI-powered learning and accessibility platform for individuals with visual, auditory, and attention-related disabilities.**

DrishtiKosh ("Vision Repository" in Hindi) is an inclusive educational platform that combines advanced AI, speech technologies, and adaptive learning techniques to make education accessible to everyone, regardless of their abilities.

---

## 🎯 Who Is This For?

DrishtiKosh is designed specifically for individuals with:

### 👁️ **Visual Impairments (Blind & Low Vision)**
- Voice-first interface with natural-sounding multilingual TTS
- Image description and scene understanding
- Screen-reader optimized UI

### 🎧 **Hearing Impairments (Deaf & Hard of Hearing)**
- Visual captions and transcriptions
- Text-based interactions
- Sign language support (coming soon)

### 🧠 **ADHD & Cognitive Disabilities**
- Bite-sized learning modules with engaging slides
- Interactive quizzes with instant feedback
- Visual flowcharts for complex topics
- Video summaries and breakdowns
- Gamified learning with achievements and streaks

---

## ✨ Key Features

### 🎤 **Blind Mode - Voice-First Interaction**
- **Speech-to-Text**: OpenAI Whisper with 99%+ accuracy in 12 Indian languages
- **AI Assistant**: Powered by Google Gemini 2.0 Flash Exp for intelligent conversations
- **Text-to-Speech**: Google Cloud TTS with native Indian accents (<1s latency)
- **Image Understanding**: Upload images for detailed audio descriptions
- **Conversation History**: Persistent chat with context awareness
- **Automatic Language Detection**: Responds in the same language you speak

### 📚 **ADHD Learning Mode**
- **Interactive Slides**: AI-generated content broken into digestible chunks
- **Visual Flowcharts**: Hierarchical topic breakdowns for better comprehension
- **Video Analysis**: YouTube video summarization and Q&A
- **Quiz System**: Immediate feedback with explanations
- **Custom Instructions**: Tailor learning style to your needs
- **Session History**: Track your learning journey

### 🌍 **12 Indian Languages Supported**
With automatic detection and native script rendering:
- **Hindi** (हिंदी) - Mukta font
- **English** - Inter font
- **Bengali** (বাংলা) - Hind Siliguri
- **Tamil** (தமிழ்) - Mukta Malar
- **Telugu** (తెలుగు) - Mandali
- **Kannada** (ಕನ್ನಡ) - Nunc
- **Malayalam** (മലയാളം) - Manjari
- **Marathi** (मराठी) - Mukta
- **Gujarati** (ગુજરાતી) - Mukta Vaani
- **Punjabi** (ਪੰਜਾਬੀ) - Mukta Mahee
- **Assamese** (অসমীয়া) - Hind Siliguri
- **Odia** (ଓଡ଼ିଆ) - Baloo 2

### 🎨 **Personalization & Accessibility**
- **User Preferences**: Language, theme, font size, TTS voice & speed
- **High Contrast Mode**: For low vision users
- **Keyboard Navigation**: Full keyboard support
- **Customizable UI**: Adjust to your comfort level

### 🏆 **Gamification & Motivation**
- **Daily Streaks**: Track consecutive learning days
- **Achievements**: Unlock badges for milestones
- **Goals**: Set and monitor personal targets (daily time, quiz accuracy, session count)
- **Progress Tracking**: Visualize your learning growth

---

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL 14+ with SQLAlchemy ORM
- **Migrations**: Alembic
- **AI & ML**:
  - **STT**: OpenAI Whisper (small model)
  - **TTS**: Google Cloud Text-to-Speech
  - **LLM**: Google Vertex AI (Gemini 2.0 Flash Exp)
  - **Vision**: Google Vertex AI Vision API
- **Audio Processing**: PyTorch, SoundFile, Pydub

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Library**: Tailwind CSS + shadcn/ui
- **Routing**: React Router v6
- **State Management**: React Hooks + Context API
- **Fonts**: Premium Google Fonts for all Indian scripts

### Infrastructure
- **Authentication**: JWT-based session management
- **API Communication**: RESTful endpoints with TypeScript types
- **File Handling**: Multipart form data for images and audio

---

## 🚀 Getting Started

### Prerequisites
- **Python**: 3.11 or higher
- **Node.js**: 18 or higher
- **PostgreSQL**: 14 or higher
- **FFmpeg**: Required for audio processing
  - Mac: `brew install ffmpeg`
  - Linux: `sudo apt install ffmpeg`
  - Windows: Install via Chocolatey or download binary
- **Google Cloud Account**: For TTS and Vertex AI
  - Enable Cloud Text-to-Speech API
  - Enable Vertex AI API
  - Create a service account with appropriate permissions

### Installation

#### 1. Clone Repository
```bash
git clone https://github.com/Aditya232-rtx/DrishtiKosh.git
cd DrishtiKosh
```

#### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
# Note: OpenAI Whisper model (approx 500MB) will automatically download on first run.

# Configure environment
cp .env.example .env
```

**Edit `.env` with your credentials:**
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/drishtikosh_db

# Google Cloud
# Place your JSON key in backend/secrets/ and refer to it here
GOOGLE_APPLICATION_CREDENTIALS=secrets/your-service-account-key.json
PROJECT_ID=your-gcp-project-id
LOCATION=us-central1

# Security
SECRET_KEY=your-secure-random-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

#### 3. Database Setup
```bash
# Create database
createdb drishtikosh_db

# Run migrations
alembic upgrade head
```

#### 4. Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

#### 5. Start Backend Server
```bash
cd ../backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8001
```

**Application URLs:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001
- API Documentation: http://localhost:8001/docs

---

## 📖 Usage Guide

### For Visually Impaired Users

1. **Navigate to Blind Mode**
   - Use keyboard shortcuts or screen reader to access
   
2. **Voice Interaction**
   - Click microphone button or press hotkey
   - Speak your question in any supported language
   - AI responds with audio + text transcription

3. **Image Description**
   - Upload an image (camera/file)
   - Receive detailed audio description

### For ADHD Users

1. **Learning Mode**
   - Enter a topic you want to learn
   - Choose ADHD-optimized mode
   - Navigate through interactive slides

2. **Take Quizzes**
   - Test your knowledge after each module
   - Get instant feedback with explanations

3. **Visual Flowcharts**
   - Generate hierarchical topic breakdowns
   - Navigate complex subjects step-by-step

4. **Video Learning**
   - Paste YouTube URL
   - Get AI-generated summary and Q&A

### For All Users

- **Track Progress**: Monitor streaks, goals, and achievements
- **Customize Experience**: Adjust preferences for comfort
- **Multi-Language**: Seamlessly switch between 12 Indian languages

---

## 🏗️ Project Structure

```
DrishtiKosh/
├── backend/
│   ├── app/
│   │   ├── core/              # Database, config, JWT
│   │   ├── models/            # SQLAlchemy ORM models
│   │   │   ├── user.py
│   │   │   ├── blind_conversation.py
│   │   │   ├── learning_session.py
│   │   │   ├── quiz_progress.py
│   │   │   ├── preferences.py
│   │   │   ├── streak.py
│   │   │   ├── goal.py
│   │   │   ├── achievement.py
│   │   │   └── accessibility.py
│   │   ├── routes/            # API endpoints
│   │   │   ├── auth.py        # Login, signup, logout
│   │   │   ├── blind.py       # Voice interaction
│   │   │   ├── learn.py       # ADHD learning modules
│   │   │   ├── user.py        # Preferences, streaks, goals
│   │   │   └── chat.py        # Text chat
│   │   ├── services/          # Business logic
│   │   │   ├── audio.py       # STT & TTS
│   │   │   └── vertex.py      # AI interactions
│   │   └── main.py            # FastAPI app
│   ├── alembic/               # Database migrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   └── InteractiveAvatar.tsx
│   │   ├── pages/
│   │   │   ├── Landing.tsx    # Home page
│   │   │   ├── Login.tsx
│   │   │   ├── Signup.tsx
│   │   │   ├── Dashboard.tsx  # User dashboard
│   │   │   ├── BlindMode.tsx  # Voice interaction
│   │   │   ├── LearnMode.tsx  # ADHD learning
│   │   │   └── Flowchart.tsx  # Visual flowcharts
│   │   ├── hooks/             # Custom React hooks
│   │   │   ├── useAuth.ts
│   │   │   └── useChat.ts
│   │   └── lib/               # Utilities & API
│   │       ├── api.ts
│   │       └── auth.ts
│   └── package.json
└── README.md
```

---

## 🔑 API Endpoints

### Authentication
- `POST /auth/register` - Create new account
- `POST /auth/login` - User login (returns JWT token)
- `POST /auth/logout` - End session

### Blind Mode
- `POST /blind/interact` - Main voice interaction
  - **Accepts**: `audio` (file), `image` (file), `text` (string), `conversation_id`, `user_id`
  - **Returns**: `user_transcript`, `ai_response`, `audio_base64`
- `POST /blind/end_conversation` - End active conversation
- `GET /blind/history/{user_id}` - Retrieve conversation history

### Learning (ADHD Mode)
- `POST /learn/explain` - Generate topic explanation with slides & quiz
  - **Body**: `{ "topic": "...", "mode": "adhd", "instruction": "...", "user_id": "..." }`
- `POST /learn/video` - Analyze YouTube video
  - **Body**: `{ "url": "...", "mode": "adhd", "instruction": "...", "user_id": "..." }`
- `POST /learn/flowchart` - Generate hierarchical flowchart
  - **Body**: `{ "topic": "..." }`
- `GET /learn/history` - Get learning history
- `GET /learn/session/{session_id}` - Retrieve specific session

### User Management
- `GET /user/{user_id}/preferences` - Get user preferences
- `PUT /user/{user_id}/preferences` - Update preferences
- `GET /user/{user_id}/streak` - Get learning streak
- `POST /user/{user_id}/streak/increment` - Increment streak
- `GET /user/{user_id}/goals` - Get user goals
- `POST /user/{user_id}/goals` - Create new goal
- `GET /user/{user_id}/achievements` - Get earned achievements
- `GET /achievements` - List all available achievements

---

## 🎨 Accessibility Features

### Visual Accessibility
- **High Contrast Mode**: Optimized color combinations
- **Font Scaling**: Adjustable text sizes (14px - 24px)
- **Screen Reader Support**: ARIA labels and semantic HTML
- **Premium Fonts**: Script-specific Google Fonts for readability

### Auditory Accessibility
- **Visual Captions**: All audio content has text equivalents
- **Transcriptions**: Downloadable conversation transcripts
- **Adjustable Playback**: Control TTS speed (0.75x - 1.5x)

### Cognitive Accessibility (ADHD)
- **Chunked Content**: Information in digestible pieces
- **Visual Hierarchy**: Clear organization with flowcharts
- **Gamification**: Streaks and achievements for motivation
- **Distraction-Free**: Minimal UI with focus mode

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest tests/
```

### Frontend Tests
```bash
cd frontend
npm run test
```

### Manual Testing
Use the included test scripts:
- `backend/test_audio_pipeline.py` - Test STT/TTS
- `backend/test_multilingual_pipeline.py` - Test language support

---

## � Performance Metrics

- **STT Latency**: <3s for 60s audio
- **TTS Generation**: <1s for typical responses
- **AI Response Time**: 2-5s depending on complexity
- **End-to-End Latency**: <8s total for voice interaction
- **Supported Audio Formats**: WAV, WebM, MP3, M4A

---

## 🚧 Roadmap

- [ ] Sign language video support
- [ ] Braille display integration
- [ ] Real-time collaborative learning
- [ ] Offline mode support
- [ ] Mobile app (iOS & Android)
- [ ] Chrome extension for web accessibility
- [ ] Advanced analytics dashboard
- [ ] Multi-user class/group support
- [ ] Integration with educational platforms (Khan Academy, Coursera)

---

## 🤝 Contributing

We welcome contributions! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

**Areas we need help:**
- Testing with real users (blind, deaf, ADHD)
- Adding more Indian languages
- UI/UX improvements for accessibility
- Documentation and tutorials

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## � Authors & Acknowledgments

- **Aditya Jadhav** - Creator & Lead Developer

**Special Thanks:**
- OpenAI for Whisper speech recognition
- Google Cloud for TTS and AI capabilities
- The accessibility community for feedback and guidance
- Open-source contributors

---

## 📧 Contact & Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/Aditya232-rtx/DrishtiKosh/issues)
- **Email**: [Your contact email]
- **Documentation**: [Link to detailed docs]

---

## � Mission Statement

**"Making education accessible to everyone, regardless of their abilities."**

DrishtiKosh is more than a platform – it's a commitment to inclusive education. We believe that disabilities should never be barriers to learning, and that technology can be a powerful equalizer when designed with empathy and accessibility at its core.

---

**Made with ❤️ for a more inclusive India**
